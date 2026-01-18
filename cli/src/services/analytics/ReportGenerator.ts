import StorageService from "./StorageService"
import { eq } from "drizzle-orm"
import * as schema from "./schema"
import * as fs from "fs/promises"
import { DEFAULT_PRIVACY_CONFIG } from "./privacy/PrivacyConfig"

export interface SessionExport {
	id: string
	startTime: string
	endTime: string | null
	totalTokens: number
	totalCost: number
	commandCount: number
	toolUsageCount: number
	exitReason: string | null
	events: MetricEventExport[]
}

export interface MetricEventExport {
	id: number
	sessionId: string
	eventType: string
	timestamp: string
	metadata: Record<string, unknown>
}

export interface AnalyticsExport {
	version: string
	exportedAt: string
	privacyConfig: {
		enabled: boolean
		hashPII: boolean
		filterPrompts: boolean
	}
	sessions: SessionExport[]
}

class ReportGenerator {
	private static instance: ReportGenerator
	private db: ReturnType<typeof StorageService.prototype.getDatabase>

	private constructor() {
		this.db = StorageService.getInstance().getDatabase()
	}

	public static getInstance(): ReportGenerator {
		if (!ReportGenerator.instance) {
			ReportGenerator.instance = new ReportGenerator()
		}
		return ReportGenerator.instance
	}

	async generateSessionReport(sessionId: string): Promise<SessionExport> {
		const sessionResult = await this.db
			.select()
			.from(schema.sessions)
			.where(eq(schema.sessions.id, sessionId))
			.limit(1)

		if (sessionResult.length === 0) {
			throw new Error(`Session ${sessionId} not found`)
		}

		const sessionRow = sessionResult[0]!
		const eventsResult = await this.db
			.select()
			.from(schema.metricEvents)
			.where(eq(schema.metricEvents.sessionId, sessionId))

		return this.buildSessionExport(sessionRow, eventsResult)
	}

	async generateFullExport(): Promise<AnalyticsExport> {
		const sessionsResult = await this.db.select().from(schema.sessions)
		const sessions: SessionExport[] = []

		for (const sessionRow of sessionsResult) {
			const eventsResult = await this.db
				.select()
				.from(schema.metricEvents)
				.where(eq(schema.metricEvents.sessionId, sessionRow.id))

			sessions.push(this.buildSessionExport(sessionRow, eventsResult))
		}

		return {
			version: "1.0.0",
			exportedAt: new Date().toISOString(),
			privacyConfig: {
				enabled: DEFAULT_PRIVACY_CONFIG.enabled,
				hashPII: DEFAULT_PRIVACY_CONFIG.hashPII,
				filterPrompts: DEFAULT_PRIVACY_CONFIG.filterPrompts,
			},
			sessions,
		}
	}

	async exportToJsonFile(filePath: string, sessionId?: string): Promise<void> {
		const exportData = sessionId ? await this.generateSessionReport(sessionId) : await this.generateFullExport()

		try {
			await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), "utf-8")
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			throw new Error(`Failed to write export to ${filePath}: ${message}`)
		}
	}

	private buildSessionExport(
		sessionRow: typeof schema.sessions.$inferSelect,
		eventsResult: (typeof schema.metricEvents.$inferSelect)[],
	): SessionExport {
		return {
			id: sessionRow.id,
			startTime: sessionRow.startTime.toISOString(),
			endTime: sessionRow.endTime?.toISOString() ?? null,
			totalTokens: sessionRow.totalTokens,
			totalCost: sessionRow.totalCost,
			commandCount: sessionRow.commandCount,
			toolUsageCount: sessionRow.toolUsageCount,
			exitReason: sessionRow.exitReason,
			events: eventsResult.map(this.mapMetricEventToExport),
		}
	}

	private mapMetricEventToExport(row: typeof schema.metricEvents.$inferSelect): MetricEventExport {
		let metadata: Record<string, unknown> = {}
		if (row.metadata) {
			try {
				metadata = JSON.parse(row.metadata) as Record<string, unknown>
			} catch {
				metadata = { raw: row.metadata }
			}
		}

		return {
			id: row.id,
			sessionId: row.sessionId,
			eventType: row.eventType,
			timestamp: row.timestamp.toISOString(),
			metadata,
		}
	}
}

export default ReportGenerator
