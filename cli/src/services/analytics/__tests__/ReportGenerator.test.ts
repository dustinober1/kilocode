/**
 * Unit tests for ReportGenerator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import ReportGenerator from "../ReportGenerator"

// Mock StorageService
const mockDb = {
	select: vi.fn(() => mockDb),
	from: vi.fn(() => mockDb),
	where: vi.fn(() => mockDb),
	limit: vi.fn(() => mockDb),
	then: vi.fn((resolve) => resolve(mockResult)),
}

const mockGetDatabase = vi.fn(() => mockDb)

vi.mock("../StorageService", () => ({
	default: {
		getInstance: vi.fn(() => ({
			getDatabase: mockGetDatabase,
		})),
	},
}))

// Mock fs/promises
vi.mock("fs/promises", () => ({
	writeFile: vi.fn(),
}))

const { writeFile } = await import("fs/promises")

describe("ReportGenerator", () => {
	let reportGenerator: ReportGenerator
	let mockResult: unknown

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks()

		// Reset singleton instance
		;(ReportGenerator as { instance?: ReportGenerator }).instance = undefined

		// Setup mock database chain
		mockResult = []
		mockDb.select.mockReturnThis()
		mockDb.from.mockReturnThis()
		mockDb.where.mockReturnThis()
		mockDb.limit.mockReturnThis()
		mockDb.then.mockImplementation((resolve) => resolve(mockResult))

		// Get service instance
		reportGenerator = ReportGenerator.getInstance()
	})

	afterEach(() => {
		// Clean up
		vi.clearAllMocks()
	})

	describe("getInstance", () => {
		it("returns singleton instance", () => {
			const instance1 = ReportGenerator.getInstance()
			const instance2 = ReportGenerator.getInstance()

			expect(instance1).toBe(instance2)
		})
	})

	describe("generateSessionReport", () => {
		it("returns correct structure for valid session", async () => {
			const sessionId = "test-session-123"

			const mockSession = [
				{
					id: sessionId,
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: new Date("2025-01-01T01:00:00Z"),
					totalTokens: 1000,
					totalCost: 500,
					commandCount: 10,
					toolUsageCount: 50,
					exitReason: "user_exit",
				},
			]

			const mockEvents = [
				{
					id: 1,
					sessionId: sessionId,
					eventType: "tool:executed",
					timestamp: new Date("2025-01-01T00:01:00Z"),
					metadata: JSON.stringify({ toolName: "Read", duration: 100 }),
				},
				{
					id: 2,
					sessionId: sessionId,
					eventType: "command:start",
					timestamp: new Date("2025-01-01T00:02:00Z"),
					metadata: JSON.stringify({ command: "test" }),
				},
			]

			// First call returns session, second returns events
			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount === 1) {
					return resolve(mockSession)
				} else {
					return resolve(mockEvents)
				}
			})

			const result = await reportGenerator.generateSessionReport(sessionId)

			expect(result).toEqual({
				id: sessionId,
				startTime: "2025-01-01T00:00:00.000Z",
				endTime: "2025-01-01T01:00:00.000Z",
				totalTokens: 1000,
				totalCost: 500,
				commandCount: 10,
				toolUsageCount: 50,
				exitReason: "user_exit",
				events: [
					{
						id: 1,
						sessionId: sessionId,
						eventType: "tool:executed",
						timestamp: "2025-01-01T00:01:00.000Z",
						metadata: { toolName: "Read", duration: 100 },
					},
					{
						id: 2,
						sessionId: sessionId,
						eventType: "command:start",
						timestamp: "2025-01-01T00:02:00.000Z",
						metadata: { command: "test" },
					},
				],
			})
		})

		it("includes events array in session export", async () => {
			const sessionId = "test-session-events"

			const mockSession = [
				{
					id: sessionId,
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: null,
					totalTokens: 0,
					totalCost: 0,
					commandCount: 0,
					toolUsageCount: 0,
					exitReason: null,
				},
			]

			const mockEvents = [
				{
					id: 1,
					sessionId: sessionId,
					eventType: "token:used",
					timestamp: new Date("2025-01-01T00:01:00Z"),
					metadata: JSON.stringify({ promptTokens: 100, completionTokens: 50 }),
				},
			]

			// We need to mock sequential calls properly
			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount === 1) {
					return resolve(mockSession)
				} else {
					return resolve(mockEvents)
				}
			})

			const result = await reportGenerator.generateSessionReport(sessionId)

			expect(result.events).toBeDefined()
			expect(result.events).toHaveLength(1)
			expect(result.events[0].eventType).toBe("token:used")
		})

		it("throws error for non-existent session", async () => {
			const sessionId = "non-existent-session"

			// Empty result for non-existent session
			mockResult = []

			await expect(reportGenerator.generateSessionReport(sessionId)).rejects.toThrow(
				`Session ${sessionId} not found`,
			)
		})

		it("handles null endTime for active sessions", async () => {
			const sessionId = "active-session"

			const mockSession = [
				{
					id: sessionId,
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: null,
					totalTokens: 500,
					totalCost: 250,
					commandCount: 5,
					toolUsageCount: 25,
					exitReason: null,
				},
			]

			mockResult = mockSession
			const result = await reportGenerator.generateSessionReport(sessionId)

			expect(result.endTime).toBeNull()
			expect(result.exitReason).toBeNull()
		})

		it("handles invalid metadata JSON gracefully", async () => {
			const sessionId = "session-invalid-metadata"

			const mockSession = [
				{
					id: sessionId,
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: new Date("2025-01-01T01:00:00Z"),
					totalTokens: 100,
					totalCost: 50,
					commandCount: 1,
					toolUsageCount: 1,
					exitReason: "completion",
				},
			]

			const mockEvents = [
				{
					id: 1,
					sessionId: sessionId,
					eventType: "error:occurred",
					timestamp: new Date("2025-01-01T00:01:00Z"),
					metadata: "invalid-json-{",
				},
			]

			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount === 1) {
					return resolve(mockSession)
				} else {
					return resolve(mockEvents)
				}
			})

			const result = await reportGenerator.generateSessionReport(sessionId)

			// Should wrap invalid JSON in { raw: ... }
			expect(result.events[0].metadata).toEqual({ raw: "invalid-json-{" })
		})
	})

	describe("generateFullExport", () => {
		it("includes privacy config in export", async () => {
			const mockSessions = [
				{
					id: "session-1",
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: new Date("2025-01-01T01:00:00Z"),
					totalTokens: 1000,
					totalCost: 500,
					commandCount: 10,
					toolUsageCount: 50,
					exitReason: "user_exit",
				},
			]

			const mockEvents = []

			mockResult = mockSessions
			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount === 1) {
					return resolve(mockSessions)
				} else {
					return resolve(mockEvents)
				}
			})

			const result = await reportGenerator.generateFullExport()

			expect(result.privacyConfig).toBeDefined()
			expect(result.privacyConfig.enabled).toBe(true)
			expect(result.privacyConfig.hashPII).toBe(true)
			expect(result.privacyConfig.filterPrompts).toBe(true)
		})

		it("handles empty database", async () => {
			mockResult = []
			mockDb.then.mockResolvedValue([])

			const result = await reportGenerator.generateFullExport()

			expect(result.sessions).toEqual([])
			expect(result.version).toBe("1.0.0")
			expect(result.exportedAt).toBeDefined()
		})

		it("includes export metadata", async () => {
			const mockSessions = []
			mockResult = mockSessions

			const result = await reportGenerator.generateFullExport()

			expect(result.version).toBe("1.0.0")
			expect(result.exportedAt).toBeDefined()
			// Verify ISO date format
			expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt)
		})

		it("includes multiple sessions with events", async () => {
			const mockSessions = [
				{
					id: "session-1",
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: new Date("2025-01-01T01:00:00Z"),
					totalTokens: 1000,
					totalCost: 500,
					commandCount: 10,
					toolUsageCount: 50,
					exitReason: "user_exit",
				},
				{
					id: "session-2",
					startTime: new Date("2025-01-02T00:00:00Z"),
					endTime: null,
					totalTokens: 500,
					totalCost: 250,
					commandCount: 5,
					toolUsageCount: 25,
					exitReason: null,
				},
			]

			const mockEvents = []

			mockResult = mockSessions
			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount === 1) {
					return resolve(mockSessions)
				} else {
					return resolve(mockEvents)
				}
			})

			const result = await reportGenerator.generateFullExport()

			expect(result.sessions).toHaveLength(2)
			expect(result.sessions[0].id).toBe("session-1")
			expect(result.sessions[1].id).toBe("session-2")
		})
	})

	describe("exportToJsonFile", () => {
		it("writes properly formatted JSON with session", async () => {
			const sessionId = "test-session-123"
			const filePath = "/tmp/export.json"

			const mockSession = [
				{
					id: sessionId,
					startTime: new Date("2025-01-01T00:00:00Z"),
					endTime: new Date("2025-01-01T01:00:00Z"),
					totalTokens: 1000,
					totalCost: 500,
					commandCount: 10,
					toolUsageCount: 50,
					exitReason: "user_exit",
				},
			]

			const mockEvents = []

			mockResult = mockSession
			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount <= 1) {
					return resolve(mockSession)
				} else {
					return resolve(mockEvents)
				}
			})

			await reportGenerator.exportToJsonFile(filePath, sessionId)

			expect(writeFile).toHaveBeenCalledWith(
				filePath,
				JSON.stringify(
					{
						id: sessionId,
						startTime: "2025-01-01T00:00:00.000Z",
						endTime: "2025-01-01T01:00:00.000Z",
						totalTokens: 1000,
						totalCost: 500,
						commandCount: 10,
						toolUsageCount: 50,
						exitReason: "user_exit",
						events: [],
					},
					null,
					2,
				),
				"utf-8",
			)
		})

		it("writes full export without session ID", async () => {
			const filePath = "/tmp/full-export.json"

			mockResult = []
			mockDb.then.mockResolvedValue([])

			await reportGenerator.exportToJsonFile(filePath)

			expect(writeFile).toHaveBeenCalledWith(
				filePath,
				JSON.stringify(
					{
						version: "1.0.0",
						exportedAt: expect.any(String),
						privacyConfig: {
							enabled: true,
							hashPII: true,
							filterPrompts: true,
						},
						sessions: [],
					},
					null,
					2,
				),
				"utf-8",
			)
		})

		it("throws error when writeFile fails", async () => {
			const filePath = "/invalid/path/export.json"

			mockResult = []
			mockDb.then.mockResolvedValue([])

			vi.mocked(writeFile).mockRejectedValue(new Error("Permission denied"))

			await expect(reportGenerator.exportToJsonFile(filePath)).rejects.toThrow(
				"Failed to write export to /invalid/path/export.json",
			)
		})
	})

	describe("data type conversions", () => {
		it("converts Dates to ISO strings", async () => {
			const sessionId = "session-dates"

			const mockSession = [
				{
					id: sessionId,
					startTime: new Date("2025-01-01T00:00:00.123Z"),
					endTime: new Date("2025-01-01T01:00:00.456Z"),
					totalTokens: 100,
					totalCost: 50,
					commandCount: 1,
					toolUsageCount: 1,
					exitReason: "completion",
				},
			]

			const mockEvents = [
				{
					id: 1,
					sessionId: sessionId,
					eventType: "test:event",
					timestamp: new Date("2025-01-01T00:30:00.789Z"),
					metadata: "{}",
				},
			]

			mockResult = mockSession
			let callCount = 0
			mockDb.then.mockImplementation(async (resolve) => {
				callCount++
				if (callCount === 1) {
					return resolve(mockSession)
				} else {
					return resolve(mockEvents)
				}
			})

			const result = await reportGenerator.generateSessionReport(sessionId)

			// Verify ISO string format
			expect(result.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
			expect(result.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
			expect(result.events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
		})
	})
})
