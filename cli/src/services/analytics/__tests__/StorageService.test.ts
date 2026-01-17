import { describe, it, expect, afterEach, beforeAll } from "vitest"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import os from "os"
import StorageService from "../StorageService"
import * as schema from "../schema"

const TEST_DB_PATH = path.join(os.tmpdir(), "test-analytics.db")

describe("StorageService", () => {
	beforeAll(() => {
		// Reset the singleton for testing
		// @ts-expect-error - accessing private property for testing
		StorageService.instance = null
	})

	afterEach(() => {
		// Clean up test database
		try {
			const service = StorageService.getInstance()
			service.close()
			// @ts-expect-error - reset singleton for next test
			StorageService.instance = null

			if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
			if (fs.existsSync(TEST_DB_PATH + "-wal")) fs.unlinkSync(TEST_DB_PATH + "-wal")
			if (fs.existsSync(TEST_DB_PATH + "-shm")) fs.unlinkSync(TEST_DB_PATH + "-shm")
		} catch (_e) {
			// Ignore cleanup errors
		}
	})

	it("should create database file at correct path", () => {
		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")
		const service = StorageService.getInstance()

		expect(fs.existsSync(dbPath)).toBe(true)

		service.close()
	})

	it("should enable WAL mode", () => {
		const service = StorageService.getInstance()

		// Check WAL mode directly
		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")
		const sqlite = new Database(dbPath)
		const result = sqlite.pragma("journal_mode", { simple: true })
		sqlite.close()

		expect(result).toBe("wal")
		service.close()
	})

	it("should persist data across restarts", async () => {
		const sessionId = "test-session-1"

		// First instance: write data
		const service1 = StorageService.getInstance()
		await service1.startSession(sessionId)
		await service1.insertEvent({
			sessionId,
			eventType: "test",
			timestamp: new Date(),
			metadata: "{}",
		})
		// Wait for batch flush
		await new Promise((resolve) => setTimeout(resolve, 1100))
		service1.close()

		// Reset singleton to simulate restart
		// @ts-expect-error -- accessing private property for testing
		StorageService.instance = null

		// Second instance: read data
		const service2 = StorageService.getInstance()
		const db = service2.getDatabase()
		const sessions = await db.select().from(schema.sessions)

		expect(sessions.length).toBeGreaterThanOrEqual(1)
		const testSession = sessions.find((s) => s.id === sessionId)
		expect(testSession).toBeDefined()
		service2.close()
	})

	it("should create WAL file during operation", async () => {
		const service = StorageService.getInstance()

		// Perform some writes
		await service.startSession("test-session")
		await service.insertEvent({
			sessionId: "test-session",
			eventType: "test",
			timestamp: new Date(),
			metadata: "{}",
		})

		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")
		const walPath = dbPath + "-wal"

		// WAL file should exist
		expect(fs.existsSync(walPath)).toBe(true)

		service.close()
	})

	it("should batch insert 1000 events in <50ms", async () => {
		const service = StorageService.getInstance()
		const sessionId = "perf-test-session"

		const events = Array.from({ length: 1000 }, (_, i) => ({
			sessionId,
			eventType: "test",
			timestamp: new Date(),
			metadata: JSON.stringify({ index: i }),
		}))

		const start = Date.now()
		await service.insertEvents(events)
		const duration = Date.now() - start

		expect(duration).toBeLessThan(50)

		// Wait for batch flush
		await new Promise((resolve) => setTimeout(resolve, 1100))

		// Verify events were inserted
		const db = service.getDatabase()
		const result = await db.select().from(schema.metricEvents)

		expect(result.length).toBeGreaterThanOrEqual(1000)

		service.close()
	})
})
