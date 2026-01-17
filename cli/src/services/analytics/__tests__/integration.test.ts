/**
 * End-to-end integration tests for metrics collection pipeline
 * Tests complete flow from service emission to database storage
 */

import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import os from "os"
import MetricsCollectorService from "../MetricsCollectorService"
import StorageService from "../StorageService"
import * as schema from "../schema"
import { randomUUID } from "crypto"

const TEST_DB_PATH = path.join(os.tmpdir(), "test-integration-analytics.db")

describe("Integration Tests: Metrics Pipeline", () => {
	let metricsService: MetricsCollectorService
	let storageService: StorageService
	let sessionId: string

	beforeAll(() => {
		// Reset singletons for testing
		// @ts-expect-error - accessing private property for testing
		MetricsCollectorService.instance = null
		// @ts-expect-error - accessing private property for testing
		StorageService.instance = null
	})

	beforeEach(async () => {
		// Clean up test database
		try {
			if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
			if (fs.existsSync(TEST_DB_PATH + "-wal")) fs.unlinkSync(TEST_DB_PATH + "-wal")
			if (fs.existsSync(TEST_DB_PATH + "-shm")) fs.unlinkSync(TEST_DB_PATH + "-shm")
		} catch (_e) {
			// Ignore cleanup errors
		}

		// Create fresh instances
		storageService = StorageService.getInstance()
		metricsService = MetricsCollectorService.getInstance()
		sessionId = randomUUID()

		// Start session
		await metricsService.startSession(sessionId)
	})

	afterEach(async () => {
		// Clean up services
		try {
			await metricsService.shutdown()
			// @ts-expect-error - reset singleton for next test
			MetricsCollectorService.instance = null

			await storageService.close()
			// @ts-expect-error - reset singleton for next test
			StorageService.instance = null

			if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
			if (fs.existsSync(TEST_DB_PATH + "-wal")) fs.unlinkSync(TEST_DB_PATH + "-wal")
			if (fs.existsSync(TEST_DB_PATH + "-shm")) fs.unlinkSync(TEST_DB_PATH + "-shm")
		} catch (_e) {
			// Ignore cleanup errors
		}
	})

	describe("end-to-end: event flow", () => {
		it("message event flows from emitter to database", async () => {
			// Emit message event
			metricsService.emit("extension:message", {
				type: "askResponse",
				hasError: false,
				sessionId,
			})

			// Wait for periodic flush (1 second)
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents).limit(10)

			const messageEvents = events.filter((e) => e.eventType === "extension:message")
			expect(messageEvents.length).toBeGreaterThan(0)

			const eventData = JSON.parse(messageEvents[0]!.metadata)
			expect(eventData.type).toBe("askResponse")
			expect(eventData.hasError).toBe(false)
		})

		it("tool execution event flows to database", async () => {
			// Emit tool execution event
			metricsService.emit("tool:executed", {
				toolName: "readFile",
				duration: 45,
				success: true,
				sessionId,
			})

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			const toolEvents = events.filter((e) => e.eventType === "tool:executed")
			expect(toolEvents.length).toBeGreaterThan(0)

			const eventData = JSON.parse(toolEvents[0]!.metadata)
			expect(eventData.toolName).toBe("readFile")
			expect(eventData.success).toBe(true)
		})

		it("session start and end are recorded", async () => {
			// Session already started in beforeEach
			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// End session
			await metricsService.endSession(sessionId, "completion")

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify session in database
			const db = storageService.getDatabase()
			const sessions = await db.select().from(schema.sessions)

			const testSession = sessions.find((s) => s.id === sessionId)
			expect(testSession).toBeDefined()
			expect(testSession!.exitReason).toBe("completion")
		})

		it("session ID is consistent across events", async () => {
			// Emit multiple events
			metricsService.emit("tool:executed", {
				toolName: "readFile",
				duration: 10,
				success: true,
				sessionId,
			})

			metricsService.emit("tool:executed", {
				toolName: "writeFile",
				duration: 20,
				success: true,
				sessionId,
			})

			metricsService.emit("extension:message", {
				type: "state",
				hasError: false,
				sessionId,
			})

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify all events have same session ID
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			const sessionEvents = events.filter((e) => e.sessionId === sessionId)
			expect(sessionEvents.length).toBe(3)

			// All should have the same session ID
			sessionEvents.forEach((event) => {
				expect(event.sessionId).toBe(sessionId)
			})
		})
	})

	describe("end-to-end: graceful shutdown", () => {
		it("shutdown flushes all queued events", async () => {
			// Emit multiple events
			for (let i = 0; i < 10; i++) {
				metricsService.emit("tool:executed", {
					toolName: `tool-${i}`,
					duration: i * 10,
					success: true,
					sessionId,
				})
			}

			// Shutdown immediately (don't wait for periodic flush)
			await metricsService.shutdown()

			// Verify all events in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			const toolEvents = events.filter((e) => e.eventType === "tool:executed")
			expect(toolEvents.length).toBe(10)
		})

		it("shutdown handles empty queue gracefully", async () => {
			// Don't emit any events, just shutdown
			await expect(metricsService.shutdown()).resolves.toBeUndefined()
		})
	})

	describe("end-to-end: PII sanitization", () => {
		it("sanitizes usernames in paths", async () => {
			// Emit event with username in path
			metricsService.emit("tool:executed", {
				toolName: "readFile",
				duration: 10,
				success: true,
				sessionId,
				filePath: "/home/john_doe/workspace/project/file.ts",
			})

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify username is hashed in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			const toolEvents = events.filter((e) => e.eventType === "tool:executed")
			expect(toolEvents.length).toBeGreaterThan(0)

			const eventData = JSON.parse(toolEvents[0]!.metadata)
			expect(eventData.filePath).toBeDefined()
			// Username should be replaced with 16-char hex hash
			expect(eventData.filePath).not.toContain("john_doe")
			expect(eventData.filePath).toMatch(/\/home\/[a-f0-9]{16}\//)
		})

		it("sanitizes Windows usernames in paths", async () => {
			// Emit event with Windows username
			metricsService.emit("tool:executed", {
				toolName: "readFile",
				duration: 10,
				success: true,
				sessionId,
				filePath: "C:\\Users\\JaneDoe\\project\\file.ts",
			})

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify username is hashed
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			const toolEvents = events.filter((e) => e.eventType === "tool:executed")
			expect(toolEvents.length).toBeGreaterThan(0)

			const eventData = JSON.parse(toolEvents[0]!.metadata)
			expect(eventData.filePath).toBeDefined()
			expect(eventData.filePath).not.toContain("JaneDoe")
			expect(eventData.filePath).toMatch(/[A-Z]:\\Users\\[a-f0-9]{16}\\/)
		})

		it("redacts sensitive prompts", async () => {
			// Emit event with sensitive prompt
			metricsService.emit("extension:message", {
				type: "userPrompt",
				hasError: false,
				sessionId,
				prompt: "My password is secret123",
			})

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify prompt is redacted
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			const messageEvents = events.filter((e) => e.eventType === "extension:message")
			expect(messageEvents.length).toBeGreaterThan(0)

			const eventData = JSON.parse(messageEvents[0]!.metadata)
			expect(eventData.prompt).toBe("[REDACTED]")
		})
	})

	describe("end-to-end: batch processing", () => {
		it("events are batched correctly", async () => {
			// Emit 150 events (more than default batch size of 100)
			for (let i = 0; i < 150; i++) {
				metricsService.emit("tool:executed", {
					toolName: `tool-${i}`,
					duration: i,
					success: true,
					sessionId,
				})
			}

			// Wait for periodic flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify all events in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			expect(events.length).toBeGreaterThanOrEqual(150)
		})

		it("handles rapid event emission", async () => {
			// Emit 50 events rapidly
			const startTime = Date.now()
			for (let i = 0; i < 50; i++) {
				metricsService.emit("tool:executed", {
					toolName: `tool-${i}`,
					duration: i,
					success: true,
					sessionId,
				})
			}
			const emitDuration = Date.now() - startTime

			// Emission should be very fast (<50ms for 50 events)
			expect(emitDuration).toBeLessThan(50)

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify all events in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)

			expect(events.length).toBeGreaterThanOrEqual(50)
		})
	})

	describe("performance tests", () => {
		it("emit() adds <5ms latency", async () => {
			// Measure emit() time
			const iterations = 100
			const times: number[] = []

			for (let i = 0; i < iterations; i++) {
				const start = performance.now()
				metricsService.emit("tool:executed", {
					toolName: `tool-${i}`,
					duration: i,
					success: true,
					sessionId,
				})
				const end = performance.now()
				times.push(end - start)
			}

			// Calculate average
			const avg = times.reduce((sum, t) => sum + t, 0) / times.length

			// Average should be <5ms
			expect(avg).toBeLessThan(5)
		})

		it("flush() processes 100 events in <50ms", async () => {
			// Emit 100 events
			for (let i = 0; i < 100; i++) {
				metricsService.emit("tool:executed", {
					toolName: `tool-${i}`,
					duration: i,
					success: true,
					sessionId,
				})
			}

			// Measure flush time
			const start = performance.now()
			await (metricsService as { flush: () => Promise<void> }).flush()
			const duration = performance.now() - start

			// Flush should be <50ms
			expect(duration).toBeLessThan(50)

			// Verify all events in database
			const db = storageService.getDatabase()
			const events = await db.select().from(schema.metricEvents)
			expect(events.length).toBeGreaterThanOrEqual(100)
		})
	})

	describe("error handling", () => {
		it("handles emit during shutdown gracefully", async () => {
			// Shutdown first
			await metricsService.shutdown()

			// Try to emit after shutdown
			const result = metricsService.emit("tool:executed", {
				toolName: "readFile",
				duration: 10,
				success: true,
				sessionId,
			})

			// Should return false
			expect(result).toBe(false)
		})

		it("handles database errors without crashing", async () => {
			// Close storage to simulate error
			await storageService.close()

			// Emit event (should not crash)
			expect(() => {
				metricsService.emit("tool:executed", {
					toolName: "readFile",
					duration: 10,
					success: true,
					sessionId,
				})
			}).not.toThrow()
		})
	})

	describe("session management", () => {
		it("getCurrentSessionId returns active session ID", () => {
			const currentId = metricsService.getCurrentSessionId()
			expect(currentId).toBe(sessionId)
		})

		it("getCurrentSessionId returns empty string when no active session", async () => {
			// End session
			await metricsService.endSession(sessionId, "completion")

			// Should return empty string
			const currentId = metricsService.getCurrentSessionId()
			expect(currentId).toBe("")
		})

		it("handles multiple sessions correctly", async () => {
			const sessionId1 = randomUUID()
			const sessionId2 = randomUUID()

			// Start first session
			await metricsService.startSession(sessionId1)
			expect(metricsService.getCurrentSessionId()).toBe(sessionId1)

			// Emit event for first session
			metricsService.emit("tool:executed", {
				toolName: "readFile",
				duration: 10,
				success: true,
				sessionId: sessionId1,
			})

			// Start second session (replaces first)
			await metricsService.startSession(sessionId2)
			expect(metricsService.getCurrentSessionId()).toBe(sessionId2)

			// Emit event for second session
			metricsService.emit("tool:executed", {
				toolName: "writeFile",
				duration: 20,
				success: true,
				sessionId: sessionId2,
			})

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 1100))

			// Verify both sessions in database
			const db = storageService.getDatabase()
			const sessions = await db.select().from(schema.sessions)

			expect(sessions.length).toBeGreaterThanOrEqual(2)
		})
	})
})
