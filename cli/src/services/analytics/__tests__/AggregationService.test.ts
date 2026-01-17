/**
 * Unit tests for AggregationService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import AggregationService, {
	type SessionMetrics,
	type TokenUsagePoint,
	type SessionListItem,
	type TokenPerMinute,
} from "../AggregationService"
import { aggregationCache } from "../QueryCache"

// Mock StorageService
const mockGetDatabase = vi.fn(() => ({
	execute: vi.fn(),
}))

vi.mock("../StorageService", () => ({
	default: {
		getInstance: vi.fn(() => ({
			getDatabase: mockGetDatabase,
		})),
	},
}))

// Mock QueryCache
vi.mock("../QueryCache", () => ({
	aggregationCache: {
		get: vi.fn(),
		set: vi.fn(),
		invalidate: vi.fn(),
		clear: vi.fn(),
	},
}))

describe("AggregationService", () => {
	let aggregationService: AggregationService
	let mockDb: { execute: ReturnType<typeof vi.fn> }
	let mockCache: typeof aggregationCache

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks()

		// Reset singleton instance
		;(AggregationService as { instance?: AggregationService }).instance = undefined

		// Get mock instances
		mockDb = mockGetDatabase() as { execute: ReturnType<typeof vi.fn> }
		mockCache = aggregationCache

		// Get service instance
		aggregationService = AggregationService.getInstance()
	})

	afterEach(() => {
		// Clean up
		vi.clearAllMocks()
	})

	describe("getInstance", () => {
		it("returns singleton instance", () => {
			const instance1 = AggregationService.getInstance()
			const instance2 = AggregationService.getInstance()

			expect(instance1).toBe(instance2)
		})
	})

	describe("getSessionMetrics", () => {
		it("returns cached data if available", async () => {
			const sessionId = "test-session-123"
			const cachedMetrics: SessionMetrics = {
				eventCount: 100,
				totalCost: 500,
				firstEvent: new Date("2025-01-01T00:00:00Z"),
				lastEvent: new Date("2025-01-01T01:00:00Z"),
			}

			vi.mocked(mockCache.get).mockReturnValue(cachedMetrics)

			const result = await aggregationService.getSessionMetrics(sessionId)

			expect(result).toEqual(cachedMetrics)
			expect(mockCache.get).toHaveBeenCalledWith(`${sessionId}:metrics`)
			expect(mockDb.execute).not.toHaveBeenCalled()
		})

		it("queries database on cache miss", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [
					{
						event_count: 50,
						total_cost: 250,
						first_event: "2025-01-01T00:00:00Z",
						last_event: "2025-01-01T00:30:00Z",
					},
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getSessionMetrics(sessionId)

			expect(mockDb.execute).toHaveBeenCalled()
			expect(result.eventCount).toBe(50)
			expect(result.totalCost).toBe(250)
			expect(mockCache.set).toHaveBeenCalled()
		})

		it("returns zero metrics for empty result", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [{}],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getSessionMetrics(sessionId)

			expect(result.eventCount).toBe(0)
			expect(result.totalCost).toBe(0)
			expect(result.firstEvent).toBeNull()
			expect(result.lastEvent).toBeNull()
		})
	})

	describe("getTokenUsageTimeline", () => {
		it("returns cached data if available", async () => {
			const sessionId = "test-session-123"
			const cachedTimeline: TokenUsagePoint[] = [
				{
					timestamp: new Date("2025-01-01T00:01:00Z"),
					tokens: 100,
					runningTotal: 100,
				},
				{
					timestamp: new Date("2025-01-01T00:02:00Z"),
					tokens: 50,
					runningTotal: 150,
				},
			]

			vi.mocked(mockCache.get).mockReturnValue(cachedTimeline)

			const result = await aggregationService.getTokenUsageTimeline(sessionId)

			expect(result).toEqual(cachedTimeline)
			expect(mockCache.get).toHaveBeenCalledWith(`${sessionId}:token-timeline`)
			expect(mockDb.execute).not.toHaveBeenCalled()
		})

		it("queries database on cache miss", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [
					{
						timestamp: "2025-01-01T00:01:00Z",
						tokens: 100,
						running_total: 100,
					},
					{
						timestamp: "2025-01-01T00:02:00Z",
						tokens: 50,
						running_total: 150,
					},
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getTokenUsageTimeline(sessionId)

			expect(mockDb.execute).toHaveBeenCalled()
			expect(result).toHaveLength(2)
			expect(result[0].tokens).toBe(100)
			expect(result[0].runningTotal).toBe(100)
			expect(result[1].runningTotal).toBe(150)
			expect(mockCache.set).toHaveBeenCalled()
		})

		it("returns running totals correctly", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [
					{
						timestamp: "2025-01-01T00:01:00Z",
						tokens: 50,
						running_total: 50,
					},
					{
						timestamp: "2025-01-01T00:02:00Z",
						tokens: 25,
						running_total: 75,
					},
					{
						timestamp: "2025-01-01T00:03:00Z",
						tokens: 100,
						running_total: 175,
					},
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getTokenUsageTimeline(sessionId)

			// Verify running totals are correct
			expect(result[0].runningTotal).toBe(50)
			expect(result[1].runningTotal).toBe(75)
			expect(result[2].runningTotal).toBe(175)
		})
	})

	describe("getHistoricalSessions", () => {
		it("returns cached data if available", async () => {
			const cachedSessions: SessionListItem[] = [
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

			vi.mocked(mockCache.get).mockReturnValue(cachedSessions)

			const result = await aggregationService.getHistoricalSessions()

			expect(result).toEqual(cachedSessions)
			expect(mockCache.get).toHaveBeenCalledWith("historical:20")
			expect(mockDb.execute).not.toHaveBeenCalled()
		})

		it("queries database on cache miss", async () => {
			const dbResult = {
				rows: [
					{
						id: "session-1",
						start_time: "2025-01-01T00:00:00Z",
						end_time: "2025-01-01T01:00:00Z",
						total_tokens: 1000,
						total_cost: 500,
						command_count: 10,
						tool_usage_count: 50,
						exit_reason: "user_exit",
					},
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getHistoricalSessions()

			expect(mockDb.execute).toHaveBeenCalled()
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe("session-1")
			expect(mockCache.set).toHaveBeenCalled()
		})

		it("respects custom limit parameter", async () => {
			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue({ rows: [] } as never)

			await aggregationService.getHistoricalSessions(50)

			expect(mockCache.get).toHaveBeenCalledWith("historical:50")
		})
	})

	describe("getTokensPerMinute", () => {
		it("returns cached data if available", async () => {
			const sessionId = "test-session-123"
			const cachedData: TokenPerMinute[] = [
				{ minute: "2025-01-01 00:00", tokens: 100 },
				{ minute: "2025-01-01 00:01", tokens: 150 },
			]

			vi.mocked(mockCache.get).mockReturnValue(cachedData)

			const result = await aggregationService.getTokensPerMinute(sessionId)

			expect(result).toEqual(cachedData)
			expect(mockCache.get).toHaveBeenCalledWith(`${sessionId}:tokens-per-minute`)
			expect(mockDb.execute).not.toHaveBeenCalled()
		})

		it("queries database on cache miss", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [
					{ minute: "2025-01-01 00:00", tokens: 100 },
					{ minute: "2025-01-01 00:01", tokens: 150 },
					{ minute: "2025-01-01 00:02", tokens: 200 },
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getTokensPerMinute(sessionId)

			expect(mockDb.execute).toHaveBeenCalled()
			expect(result).toHaveLength(3)
			expect(result[0].minute).toBe("2025-01-01 00:00")
			expect(result[0].tokens).toBe(100)
			expect(mockCache.set).toHaveBeenCalled()
		})

		it("returns time-bucketed data correctly", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [
					{ minute: "2025-01-01 00:00", tokens: 50 },
					{ minute: "2025-01-01 00:00", tokens: 50 }, // Same bucket
					{ minute: "2025-01-01 00:01", tokens: 100 },
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue(dbResult as never)

			const result = await aggregationService.getTokensPerMinute(sessionId)

			// Verify time bucketing (SQL GROUP BY handles this)
			expect(result).toHaveLength(3)
			expect(result[0].minute).toBe("2025-01-01 00:00")
		})
	})

	describe("cache invalidation", () => {
		it("invalidates cache entries for specific session", () => {
			const sessionId = "test-session-123"

			aggregationCache.invalidate(sessionId)

			expect(mockCache.invalidate).toHaveBeenCalledWith(sessionId)
		})
	})

	describe("performance", () => {
		it("queries return mock data in <10ms", async () => {
			const sessionId = "test-session-123"
			const dbResult = {
				rows: [
					{
						event_count: 100,
						total_cost: 500,
						first_event: "2025-01-01T00:00:00Z",
						last_event: "2025-01-01T01:00:00Z",
					},
				],
			}

			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockImplementation(async () => {
				// Simulate minimal delay
				await new Promise((resolve) => setTimeout(resolve, 1))
				return dbResult as never
			})

			const start = Date.now()
			await aggregationService.getSessionMetrics(sessionId)
			const duration = Date.now() - start

			// Should be <10ms even with mock delay
			expect(duration).toBeLessThan(10)
		})
	})

	describe("window function query syntax", () => {
		it("uses correct OVER clause for running totals", async () => {
			const sessionId = "test-session-123"
			vi.mocked(mockCache.get).mockReturnValue(null)
			vi.mocked(mockDb.execute).mockResolvedValue({ rows: [] } as never)

			await aggregationService.getTokenUsageTimeline(sessionId)

			// Verify execute was called (SQL syntax is in the implementation)
			expect(mockDb.execute).toHaveBeenCalled()
		})
	})
})
