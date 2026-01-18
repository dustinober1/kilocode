import { Worker } from "worker_threads"
import path from "path"
import { AnalyticsEvent, WorkerMessage, WorkerResponse } from "./types"

export class AnalyticsDatabase {
	private worker: Worker
	private dbPath: string
	private isInitialized: Promise<boolean>

	constructor(dbFileName: string = "analytics.db") {
		this.dbPath = path.join(process.cwd(), dbFileName) // Ensure absolute path for worker
		this.worker = new Worker(path.join(__dirname, "worker.js"))
		this.isInitialized = this.initializeWorker()
	}

	private initializeWorker(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this.worker.on("message", (response: WorkerResponse) => {
				if (response.success) {
					resolve(true)
				} else {
					reject(new Error(`Worker initialization failed: ${response.error}`))
				}
			})
			this.worker.on("error", reject)
			this.worker.on("exit", (code) => {
				if (code !== 0) {
					reject(new Error(`Worker stopped with exit code ${code}`))
				}
			})

			this.worker.postMessage({ type: "initialize", data: { dbPath: this.dbPath } } as WorkerMessage)
		})
	}

	private postMessageToWorker<T>(message: WorkerMessage): Promise<T> {
		return new Promise((resolve, reject) => {
			const messageHandler = (response: WorkerResponse) => {
				this.worker.off("message", messageHandler) // Remove handler after first response
				if (response.success) {
					resolve(response.data as T)
				} else {
					reject(new Error(response.error || "Worker operation failed."))
				}
			}
			this.worker.on("message", messageHandler)
			this.worker.postMessage(message)
		})
	}

	public async recordEvent(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<number> {
		await this.isInitialized
		const eventWithTimestamp: AnalyticsEvent = {
			...event,
			timestamp: Date.now(),
			payload: JSON.stringify(event.payload), // Ensure payload is stringified
		}
		return this.postMessageToWorker<number>({ type: "insert", data: eventWithTimestamp })
	}

	public async recordEvents(events: Omit<AnalyticsEvent, "id" | "timestamp">[]): Promise<void> {
		await this.isInitialized
		const eventsWithTimestamps: AnalyticsEvent[] = events.map((event) => ({
			...event,
			timestamp: Date.now(),
			payload: JSON.stringify(event.payload), // Ensure payload is stringified
		}))
		await this.postMessageToWorker<void>({ type: "bulk_insert", data: eventsWithTimestamps })
	}

	public async queryEvents<T>(sql: string, params: any[] = []): Promise<T[]> {
		await this.isInitialized
		return this.postMessageToWorker<T[]>({ type: "query", data: { sql, params } })
	}

	public async close(): Promise<void> {
		await this.isInitialized
		await this.postMessageToWorker<void>({ type: "close" })
		this.worker.terminate()
	}
}
