import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import ReportGenerator from "../ReportGenerator"

// Create a mock `then` function that the tests can override
// Default implementation returns currentMockResult
let currentMockResult: unknown = []

const thenMock = vi.fn((resolve: (value: unknown) => unknown) => {
	return Promise.resolve(resolve(currentMockResult))
})

// Create a query result promise that uses thenMock and has chain methods
function createQueryResult() {
	// Create a Promise that will be resolved by calling thenMock
	let promise = new Promise<unknown>((resolve) => {
		// Call thenMock with our resolve function
		thenMock((value: unknown) => {
			resolve(value)
			return value
		})
	}) as Promise<unknown> & { where: ReturnType<typeof vi.fn>; limit: ReturnType<typeof vi.fn>; then: typeof thenMock }

	// Attach chain methods synchronously (before the Promise resolves)
	promise.where = vi.fn(() => promise)
	promise.limit = vi.fn(() => promise)
	promise.then = thenMock

	return promise
}

const mockDb = {
	then: thenMock, // For direct mockDb.then.mockImplementation() calls
	select: vi.fn(() => ({ from: vi.fn(() => createQueryResult()) })),
	from: vi.fn(() => createQueryResult()),
	where: vi.fn(() => createQueryResult()),
	limit: vi.fn(() => createQueryResult()),
}

const mockGetDatabase = vi.fn(() => mockDb)

vi.mock("../StorageService", () => ({
	default: {
		getInstance: vi.fn(() => ({
			getDatabase: mockGetDatabase,
		})),
	},
}))

vi.mock("fs/promises", () => ({
	writeFile: vi.fn(),
}))

const { writeFile } = await import("fs/promises")

function setupMockChain(result: unknown) {
	currentMockResult = result
}

describe("ReportGenerator", () => {
	let reportGenerator: ReportGenerator

	beforeEach(() => {
		vi.clearAllMocks()
		;(ReportGenerator as { instance?: ReportGenerator }).instance = undefined
		setupMockChain([])
		reportGenerator = ReportGenerator.getInstance()
	})

	afterEach(() => {
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

			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount === 1 ? mockSession : mockEvents))
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

			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount === 1 ? mockSession : mockEvents))
			})

			const result = await reportGenerator.generateSessionReport(sessionId)

			expect(result.events).toBeDefined()
			expect(result.events).toHaveLength(1)
			expect(result.events[0].eventType).toBe("token:used")
		})

		it("throws error for non-existent session", async () => {
			mockDb.then.mockImplementation((resolve) => Promise.resolve(resolve([])))

			await expect(reportGenerator.generateSessionReport("non-existent")).rejects.toThrow(
				"Session non-existent not found",
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

			const mockEvents: unknown[] = []
			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount === 1 ? mockSession : mockEvents))
			})

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
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount === 1 ? mockSession : mockEvents))
			})

			const result = await reportGenerator.generateSessionReport(sessionId)
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

			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount === 1 ? mockSessions : []))
			})

			const result = await reportGenerator.generateFullExport()

			expect(result.privacyConfig).toEqual({
				enabled: true,
				hashPII: true,
				filterPrompts: true,
			})
		})

		it("handles empty database", async () => {
			mockDb.then.mockImplementation((resolve) => Promise.resolve(resolve([])))

			const result = await reportGenerator.generateFullExport()

			expect(result.sessions).toEqual([])
			expect(result.version).toBe("1.0.0")
			expect(result.exportedAt).toBeDefined()
		})

		it("includes export metadata", async () => {
			mockDb.then.mockImplementation((resolve) => Promise.resolve(resolve([])))

			const result = await reportGenerator.generateFullExport()

			expect(result.version).toBe("1.0.0")
			expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
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

			// First call returns all sessions, then two calls for events (one per session)
			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				if (callCount === 1) return Promise.resolve(resolve(mockSessions))
				if (callCount === 2)
					return Promise.resolve(
						resolve([
							{ id: 1, sessionId: "session-1", eventType: "test", timestamp: new Date(), metadata: "{}" },
						]),
					)
				return Promise.resolve(resolve([]))
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

			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount <= 1 ? mockSession : []))
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

			mockDb.then.mockImplementation((resolve) => {
				return Promise.resolve(resolve([]))
			})

			await reportGenerator.exportToJsonFile(filePath)

			expect(writeFile).toHaveBeenCalledTimes(1)
			expect(writeFile).toHaveBeenCalledWith(filePath, expect.any(String), "utf-8")

			const writtenData = JSON.parse(vi.mocked(writeFile).mock.calls[0][1])
			expect(writtenData).toMatchObject({
				version: "1.0.0",
				privacyConfig: {
					enabled: true,
					hashPII: true,
					filterPrompts: true,
				},
				sessions: [],
			})
			expect(writtenData.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
		})

		it("throws error when writeFile fails", async () => {
			const filePath = "/invalid/path/export.json"

			mockDb.then.mockImplementation((resolve) => Promise.resolve(resolve([])))
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

			let callCount = 0
			mockDb.then.mockImplementation((resolve) => {
				callCount++
				return Promise.resolve(resolve(callCount === 1 ? mockSession : mockEvents))
			})

			const result = await reportGenerator.generateSessionReport(sessionId)

			expect(result.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
			expect(result.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
			expect(result.events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
		})
	})
})
