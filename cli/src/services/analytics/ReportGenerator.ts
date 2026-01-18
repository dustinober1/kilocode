/**
 * ReportGenerator - JSON export service for session analytics
 *
 * Provides export functionality for analytics data, generating
 * structured JSON reports for individual sessions and full exports.
 * All exported data is already sanitized by PIISanitizer.
 */

import StorageService from "./StorageService"
import { eq } from "drizzle-orm"
import * as schema from "./schema"
import * as fs from "fs/promises"
import { DEFAULT_PRIVACY_CONFIG } from "./privacy/PrivacyConfig"

/**
 * Exportable session data structure
 */
export interface SessionExport {
	/** Unique session identifier */
	id: string
	/** When the session started */
	startTime: string
	/** When the session ended (null if active) */
	endTime: string | null
	/** Total tokens used in session */
	totalTokens: number
	/** Total cost in cents */
	totalCost: number
	/** Number of commands executed */
	commandCount: number
	/** Number of tools used */
	toolUsageCount: number
	/** How the session ended */
	exitReason: string | null
	/** All metric events for this session */
	events: MetricEventExport[]
}

/**
 * Exportable metric event structure
 */
export interface MetricEventExport {
	/** Event unique identifier */
	id: number
	/** Associated session ID */
	sessionId: string
	/** Event type (e.g., 'tool:executed', 'command:start') */
	eventType: string
	/** When the event occurred */
	timestamp: string
	/** Event metadata (parsed JSON) */
	metadata: Record<string, unknown>
}

/**
 * Full analytics export with privacy configuration
 */
export interface AnalyticsExport {
	/** Export format version */
	version: string
	/** When the export was generated */
	exportedAt: string
	/** Privacy configuration at export time */
	privacyConfig: {
		enabled: boolean
		hashPII: boolean
		filterPrompts: boolean
	}
	/** All sessions in the database */
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

	/**
	 * Generate a JSON export for a specific session
	 * @param sessionId - The session ID to export
	 * @returns SessionExport object with session data and events
	 * @throws Error if session doesn't exist
	 */
	async generateSessionReport(sessionId: string): Promise<SessionExport> {
		// Query session data
		const sessionResult = await this.db
			.select()
			.from(schema.sessions)
			.where(eq(schema.sessions.id, sessionId))
			.limit(1)

		if (sessionResult.length === 0) {
			throw new Error(`Session ${sessionId} not found`)
		}

		const sessionRow = sessionResult[0]!

		// Query metric events for this session
		const eventsResult = await this.db
			.select()
			.from(schema.metricEvents)
			.where(eq(schema.metricEvents.sessionId, sessionId))

		// Convert to export format
		const sessionExport: SessionExport = {
			id: sessionRow.id,
			startTime: sessionRow.startTime.toISOString(),
			endTime: sessionRow.endTime ? sessionRow.endTime.toISOString() : null,
			totalTokens: sessionRow.totalTokens,
			totalCost: sessionRow.totalCost,
			commandCount: sessionRow.commandCount,
			toolUsageCount: sessionRow.toolUsageCount,
			exitReason: sessionRow.exitReason,
			events: eventsResult.map(this.mapMetricEventToExport),
		}

		return sessionExport
	}

	/**
	 * Generate a full export of all analytics data
	 * @returns AnalyticsExport with all sessions and privacy config
	 */
	async generateFullExport(): Promise<AnalyticsExport> {
		// Query all sessions
		const sessionsResult = await this.db.select().from(schema.sessions)

		// Convert sessions to export format with their events
		const sessions: SessionExport[] = []

		for (const sessionRow of sessionsResult) {
			// Query events for each session
			const eventsResult = await this.db
				.select()
				.from(schema.metricEvents)
				.where(eq(schema.metricEvents.sessionId, sessionRow.id))

			const sessionExport: SessionExport = {
				id: sessionRow.id,
				startTime: sessionRow.startTime.toISOString(),
				endTime: sessionRow.endTime ? sessionRow.endTime.toISOString() : null,
				totalTokens: sessionRow.totalTokens,
				totalCost: sessionRow.totalCost,
				commandCount: sessionRow.commandCount,
				toolUsageCount: sessionRow.toolUsageCount,
				exitReason: sessionRow.exitReason,
				events: eventsResult.map(this.mapMetricEventToExport),
			}

			sessions.push(sessionExport)
		}

		// Create full export with metadata
		const fullExport: AnalyticsExport = {
			version: "1.0.0",
			exportedAt: new Date().toISOString(),
			privacyConfig: {
				enabled: DEFAULT_PRIVACY_CONFIG.enabled,
				hashPII: DEFAULT_PRIVACY_CONFIG.hashPII,
				filterPrompts: DEFAULT_PRIVACY_CONFIG.filterPrompts,
			},
			sessions,
		}

		return fullExport
	}

	/**
	 * Export analytics data to a JSON file
	 * @param filePath - Path to write the JSON file
	 * @param sessionId - Optional session ID for single session export
	 * @throws Error if file write fails
	 */
	async exportToJsonFile(filePath: string, sessionId?: string): Promise<void> {
		let exportData: SessionExport | AnalyticsExport

		if (sessionId) {
			exportData = await this.generateSessionReport(sessionId)
		} else {
			exportData = await this.generateFullExport()
		}

		try {
			const jsonString = JSON.stringify(exportData, null, 2)
			await fs.writeFile(filePath, jsonString, "utf-8")
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			throw new Error(`Failed to write export to ${filePath}: ${errorMessage}`)
		}
	}

	/**
	 * Map a database metric event row to export format
	 * @private
	 */
	private mapMetricEventToExport(row: typeof schema.metricEvents.$inferSelect): MetricEventExport {
		// Parse metadata JSON, defaulting to empty object if null/invalid
		let parsedMetadata: Record<string, unknown> = {}
		if (row.metadata) {
			try {
				parsedMetadata = JSON.parse(row.metadata) as Record<string, unknown>
			} catch {
				// If metadata is not valid JSON, keep as raw string value
				parsedMetadata = { raw: row.metadata }
			}
		}

		return {
			id: row.id,
			sessionId: row.sessionId,
			eventType: row.eventType,
			timestamp: row.timestamp.toISOString(),
			metadata: parsedMetadata,
		}
	}
}

export default ReportGenerator
