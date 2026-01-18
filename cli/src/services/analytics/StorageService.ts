import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { eq } from "drizzle-orm"
import * as schema from "./schema"
import path from "path"
import os from "os"
import fs from "fs"

class StorageService {
	private static instance: StorageService
	private db: ReturnType<typeof drizzle>
	private sqlite: Database.Database
	private eventQueue: Array<typeof schema.metricEvents.$inferInsert> = []
	private flushTimer: NodeJS.Timeout | null = null

	private constructor() {
		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")

		// Create database directory if it doesn't exist
		const dbDir = path.dirname(dbPath)
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true })
		}

		// Initialize SQLite connection
		this.sqlite = new Database(dbPath)

		// Configure WAL mode for performance and concurrency
		this.sqlite.pragma("journal_mode = WAL")
		this.sqlite.pragma("synchronous = NORMAL") // Performance boost
		this.sqlite.pragma("busy_timeout = 5000") // Wait 5s if locked
		this.sqlite.pragma("journal_size_limit = 10000000") // 10MB WAL limit

		// Initialize Drizzle ORM
		this.db = drizzle(this.sqlite, { schema })

		// Run migrations on first initialization
		this.runMigrations()

		// Setup periodic batch flushing (every 1 second)
		this.flushTimer = setInterval(() => this.flushEvents(), 1000)
	}

	public static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService()
		}
		return StorageService.instance
	}

	public getDatabase() {
		return this.db
	}

	/**
	 * Get the raw better-sqlite3 database instance for raw SQL queries
	 * Used by AggregationService for complex SQL with window functions
	 * @internal
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public getRawDatabase(): any {
		return this.sqlite
	}

	public async insertEvent(event: typeof schema.metricEvents.$inferInsert) {
		// Add to queue for batch insertion
		this.eventQueue.push(event)

		// Flush immediately if queue is large (>100 events)
		if (this.eventQueue.length >= 100) {
			await this.flushEvents()
		}
	}

	public async insertEvents(events: Array<typeof schema.metricEvents.$inferInsert>) {
		// Add all to queue
		this.eventQueue.push(...events)

		// Flush if queue is large
		if (this.eventQueue.length >= 100) {
			await this.flushEvents()
		}
	}

	public async flushEvents() {
		if (this.eventQueue.length === 0) return

		const eventsToFlush = [...this.eventQueue]
		this.eventQueue = []

		try {
			await this.db.insert(schema.metricEvents).values(eventsToFlush)
		} catch (error) {
			console.error("Failed to flush events:", error)
			// Re-queue on failure
			this.eventQueue.unshift(...eventsToFlush)
		}
	}

	public async startSession(sessionId: string) {
		await this.db.insert(schema.sessions).values({
			id: sessionId,
			startTime: new Date(),
		})
	}

	public async endSession(sessionId: string, exitReason: string) {
		await this.db
			.update(schema.sessions)
			.set({ endTime: new Date(), exitReason })
			.where(eq(schema.sessions.id, sessionId))
	}

	private async runMigrations() {
		try {
			await migrate(this.db, {
				migrationsFolder: "./cli/src/services/analytics/migrations",
			})
		} catch (error) {
			console.error("Migration failed:", error)
			// Continue anyway - might be first run
		}
	}

	public async close() {
		// Flush any remaining events before closing
		await this.flushEvents()

		// Clear timer
		if (this.flushTimer) {
			clearInterval(this.flushTimer)
			this.flushTimer = null
		}

		// Close database connection
		this.sqlite.close()
	}
}

export default StorageService
