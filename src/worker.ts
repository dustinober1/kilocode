import { parentPort } from "worker_threads"
import Database from "better-sqlite3"
import { AnalyticsEvent, WorkerMessage, WorkerResponse } from "./types"

let db: Database.Database | null = null

if (parentPort) {
	parentPort.on("message", (message: WorkerMessage) => {
		switch (message.type) {
			case "initialize":
				try {
					const dbPath = message.data.dbPath
					db = new Database(dbPath)
					db.pragma("journal_mode = WAL")
					db.pragma("synchronous = NORMAL")

					db.exec(`
            CREATE TABLE IF NOT EXISTS analytics_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              timestamp INTEGER NOT NULL,
              eventType TEXT NOT NULL,
              payload TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_timestamp ON analytics_events (timestamp);
            CREATE INDEX IF NOT EXISTS idx_eventType ON analytics_events (eventType);
          `)
					parentPort?.postMessage({ success: true } as WorkerResponse)
				} catch (error: any) {
					parentPort?.postMessage({ success: false, error: error.message } as WorkerResponse)
				}
				break

			case "insert":
				try {
					if (!db) throw new Error("Database not initialized.")
					const event: AnalyticsEvent = message.data
					const stmt = db.prepare(
						"INSERT INTO analytics_events (timestamp, eventType, payload) VALUES (?, ?, ?)",
					)
					const info = stmt.run(event.timestamp, event.eventType, event.payload)
					parentPort?.postMessage({ success: true, data: info.lastInsertRowid } as WorkerResponse)
				} catch (error: any) {
					parentPort?.postMessage({ success: false, error: error.message } as WorkerResponse)
				}
				break

			case "bulk_insert":
				try {
					if (!db) throw new Error("Database not initialized.")
					const events: AnalyticsEvent[] = message.data
					const insert = db.prepare(
						"INSERT INTO analytics_events (timestamp, eventType, payload) VALUES (?, ?, ?)",
					)

					db.transaction((eventsToInsert: AnalyticsEvent[]) => {
						for (const event of eventsToInsert) {
							insert.run(event.timestamp, event.eventType, event.payload)
						}
					})(events)

					parentPort?.postMessage({ success: true } as WorkerResponse)
				} catch (error: any) {
					parentPort?.postMessage({ success: false, error: error.message } as WorkerResponse)
				}
				break

			case "query":
				try {
					if (!db) throw new Error("Database not initialized.")
					const { sql, params } = message.data
					const stmt = db.prepare(sql)
					const result = stmt.all(params)
					parentPort?.postMessage({ success: true, data: result } as WorkerResponse)
				} catch (error: any) {
					parentPort?.postMessage({ success: false, error: error.message } as WorkerResponse)
				}
				break

			case "close":
				try {
					if (db) {
						db.close()
						db = null
					}
					parentPort?.postMessage({ success: true } as WorkerResponse)
				} catch (error: any) {
					parentPort?.postMessage({ success: false, error: error.message } as WorkerResponse)
				}
				break

			default:
				parentPort?.postMessage({ success: false, error: "Unknown message type." } as WorkerResponse)
				break
		}
	})
}
