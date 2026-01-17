/**
 * MetricsCollectorService - EventEmitter-based metrics collection service
 * Captures CLI activity events without blocking user experience
 * Uses EventQueue for async batching and periodic flush to StorageService
 */

import { EventEmitter } from "events"
import StorageService from "./StorageService"
import { EventQueue } from "./queue/EventQueue"
import { PIISanitizer } from "./sanitization/PIISanitizer"
import { DEFAULT_PRIVACY_CONFIG } from "./privacy/PrivacyConfig"
import type { PrivacyConfig } from "./privacy/PrivacyConfig"
import type { MetricEvent, MetricsEvents } from "./types"

/**
 * Singleton service for collecting and batching CLI metrics
 * Extends EventEmitter for decoupled event capture and processing
 */
class MetricsCollectorService extends EventEmitter {
	private static instance: MetricsCollectorService
	private storage: StorageService
	private queue: EventQueue
	private flushInterval: NodeJS.Timeout | null = null
	private currentSessionId: string | null = null
	private isShutdown = false
	private privacyConfig: PrivacyConfig

	private constructor() {
		super()
		this.storage = StorageService.getInstance()
		this.queue = new EventQueue(1000)
		this.privacyConfig = DEFAULT_PRIVACY_CONFIG

		// Setup periodic flush (every 1 second)
		this.flushInterval = setInterval(() => {
			this.flush().catch((error) => {
				console.error("Periodic flush failed:", error)
			})
		}, 1000)

		// Increase max listeners to prevent warnings
		this.setMaxListeners(50)

		// Attach error listener to prevent crashes
		this.on("error", (error) => {
			console.error("MetricsCollectorService error:", error)
		})

		// Setup graceful shutdown handlers
		this.setupShutdownHandlers()

		console.log("MetricsCollectorService initialized")
	}

	/**
	 * Get singleton instance
	 * @returns The single MetricsCollectorService instance
	 */
	public static getInstance(): MetricsCollectorService {
		if (!MetricsCollectorService.instance) {
			MetricsCollectorService.instance = new MetricsCollectorService()
		}
		return MetricsCollectorService.instance
	}

	/**
	 * Start a new session
	 * @param sessionId - Unique identifier for the session
	 */
	public async startSession(sessionId: string): Promise<void> {
		this.currentSessionId = sessionId
		await this.storage.startSession(sessionId)
	}

	/**
	 * End a session with exit reason
	 * @param sessionId - Unique identifier for the session
	 * @param exitReason - Reason for session end (e.g., 'error', 'user_exit', 'completion')
	 */
	public async endSession(sessionId: string, exitReason: string): Promise<void> {
		await this.storage.endSession(sessionId, exitReason)
		if (this.currentSessionId === sessionId) {
			this.currentSessionId = null
		}
	}

	/**
	 * Get the current session ID
	 * @returns The current session ID or empty string if no active session
	 */
	public getCurrentSessionId(): string {
		return this.currentSessionId || ""
	}

	/**
	 * Emit a typed event with automatic PII sanitization and queueing
	 * Non-blocking: returns immediately after queueing
	 * @param event - Event type from MetricsEvents
	 * @param data - Event data matching the event type
	 * @returns true if event was queued, false if analytics disabled or shutdown
	 */
	public emit<K extends keyof MetricsEvents>(event: K, data: MetricsEvents[K]): boolean {
		// Check if shutdown
		if (this.isShutdown) {
			return false
		}

		// Check if analytics enabled
		if (!this.privacyConfig.enabled) {
			return false
		}

		// Sanitize PII from data
		const sanitized = PIISanitizer.sanitize(data as Record<string, unknown>)

		// Create MetricEvent and queue for batch processing
		const metricEvent: MetricEvent = {
			type: event,
			data: sanitized,
			timestamp: new Date(),
		}

		this.queue.enqueue(metricEvent)

		// Call super.emit for any listeners
		return super.emit(event, data)
	}

	/**
	 * Flush queued events to storage
	 * Called periodically (every 1s) and on shutdown
	 * @private
	 */
	private async flush(): Promise<void> {
		const batch = this.queue.dequeueBatch(100)
		if (batch.length === 0) return

		try {
			// Transform events for storage
			const eventsToInsert = batch.map((event) => ({
				sessionId: this.currentSessionId || "",
				eventType: event.type,
				timestamp: event.timestamp,
				metadata: JSON.stringify(event.data),
			}))

			await this.storage.insertEvents(eventsToInsert)
		} catch (error) {
			console.error("Failed to flush metrics:", error)
			// Requeue on failure
			this.queue.requeue(batch)
		}
	}

	/**
	 * Gracefully shutdown the service
	 * Flushes remaining events, clears intervals, and removes listeners
	 */
	public async shutdown(): Promise<void> {
		this.isShutdown = true

		// Emit shutdown event for any listeners
		this.emit("shutdown")

		// Clear flush interval
		if (this.flushInterval) {
			clearInterval(this.flushInterval)
			this.flushInterval = null
		}

		// Final flush for remaining events
		await this.flush()

		// Close storage connection
		await this.storage.close()

		// Remove all listeners
		this.removeAllListeners()
	}

	/**
	 * Setup graceful shutdown handlers for process signals
	 * @private
	 */
	private setupShutdownHandlers(): void {
		const shutdown = async (signal: string) => {
			console.log(`Received ${signal}, shutting down MetricsCollectorService...`)
			try {
				await this.shutdown()
			} catch (error) {
				console.error("Error during shutdown:", error)
			}
			process.exit(0)
		}

		// Handle termination signals
		process.on("SIGTERM", () => shutdown("SIGTERM"))
		process.on("SIGINT", () => shutdown("SIGINT"))

		// Handle uncaught exceptions
		process.on("uncaughtException", async (error) => {
			console.error("Uncaught exception:", error)
			await this.shutdown()
			process.exit(1)
		})
	}
}

export default MetricsCollectorService
