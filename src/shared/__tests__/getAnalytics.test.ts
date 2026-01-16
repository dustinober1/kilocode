import { describe, it, expect } from "vitest"
import type { HistoryItem } from "@roo-code/types"
import {
	createDateRange,
	filterByDateRange,
	calculateDailyMetrics,
	calculateModeBreakdown,
	calculateCacheEfficiency,
	aggregateTaskHistory,
} from "../getAnalytics"

// Helper to create a mock history item
function createMockHistoryItem(overrides: Partial<HistoryItem> = {}): HistoryItem {
	return {
		id: `task-${Date.now()}-${Math.random()}`,
		number: 1,
		ts: Date.now(),
		task: "Test task",
		tokensIn: 1000,
		tokensOut: 500,
		totalCost: 0.05,
		cacheWrites: 100,
		cacheReads: 50,
		mode: "code",
		status: "completed",
		...overrides,
	}
}

describe("getAnalytics", () => {
	describe("createDateRange", () => {
		it("should create a date range for today", () => {
			const range = createDateRange("today")
			const now = new Date()
			const startOfToday = new Date(now)
			startOfToday.setHours(0, 0, 0, 0)

			expect(range.preset).toBe("today")
			expect(range.startDate).toBe(startOfToday.getTime())
			expect(range.endDate).toBeGreaterThanOrEqual(now.getTime())
		})

		it("should create a date range for 7 days", () => {
			const range = createDateRange("7days")
			const now = new Date()
			const sevenDaysAgo = new Date(now)
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
			sevenDaysAgo.setHours(0, 0, 0, 0)

			expect(range.preset).toBe("7days")
			expect(range.startDate).toBe(sevenDaysAgo.getTime())
		})

		it("should create a date range for all time", () => {
			const range = createDateRange("allTime")
			expect(range.preset).toBe("allTime")
			expect(range.startDate).toBe(0)
		})
	})

	describe("filterByDateRange", () => {
		it("should return empty array for empty input", () => {
			const range = createDateRange("allTime")
			const result = filterByDateRange([], range)
			expect(result).toEqual([])
		})

		it("should filter items within date range", () => {
			const now = Date.now()
			const yesterday = now - 24 * 60 * 60 * 1000
			const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000

			const items: HistoryItem[] = [
				createMockHistoryItem({ id: "1", ts: now }),
				createMockHistoryItem({ id: "2", ts: yesterday }),
				createMockHistoryItem({ id: "3", ts: twoDaysAgo }),
			]

			const range = createDateRange("today")
			const result = filterByDateRange(items, range)

			expect(result.length).toBe(1)
			expect(result[0].id).toBe("1")
		})

		it("should include all items for allTime range", () => {
			const items: HistoryItem[] = [
				createMockHistoryItem({ id: "1" }),
				createMockHistoryItem({ id: "2" }),
				createMockHistoryItem({ id: "3" }),
			]

			const range = createDateRange("allTime")
			const result = filterByDateRange(items, range)

			expect(result.length).toBe(3)
		})
	})

	describe("calculateDailyMetrics", () => {
		it("should return empty array for empty input", () => {
			const result = calculateDailyMetrics([])
			expect(result).toEqual([])
		})

		it("should aggregate metrics by day", () => {
			const today = new Date()
			today.setHours(12, 0, 0, 0)
			const todayTs = today.getTime()

			const items: HistoryItem[] = [
				createMockHistoryItem({ ts: todayTs, totalCost: 0.1, tokensIn: 1000, tokensOut: 500 }),
				createMockHistoryItem({ ts: todayTs + 1000, totalCost: 0.2, tokensIn: 2000, tokensOut: 1000 }),
			]

			const result = calculateDailyMetrics(items)

			expect(result.length).toBe(1)
			expect(result[0].cost).toBeCloseTo(0.3, 2)
			expect(result[0].tokensIn).toBe(3000)
			expect(result[0].tokensOut).toBe(1500)
			expect(result[0].sessionCount).toBe(2)
		})

		it("should sort by date ascending", () => {
			const today = new Date()
			const yesterday = new Date(today)
			yesterday.setDate(yesterday.getDate() - 1)

			const items: HistoryItem[] = [
				createMockHistoryItem({ ts: today.getTime() }),
				createMockHistoryItem({ ts: yesterday.getTime() }),
			]

			const result = calculateDailyMetrics(items)

			expect(result.length).toBe(2)
			expect(result[0].date).toBe(yesterday.toISOString().split("T")[0])
			expect(result[1].date).toBe(today.toISOString().split("T")[0])
		})
	})

	describe("calculateModeBreakdown", () => {
		it("should return empty array for empty input", () => {
			const result = calculateModeBreakdown([])
			expect(result).toEqual([])
		})

		it("should aggregate by mode", () => {
			const items: HistoryItem[] = [
				createMockHistoryItem({ mode: "code", totalCost: 0.1 }),
				createMockHistoryItem({ mode: "code", totalCost: 0.2 }),
				createMockHistoryItem({ mode: "architect", totalCost: 0.15 }),
			]

			const result = calculateModeBreakdown(items)

			expect(result.length).toBe(2)
			// Sorted by cost descending
			expect(result[0].mode).toBe("code")
			expect(result[0].cost).toBeCloseTo(0.3, 2)
			expect(result[0].sessionCount).toBe(2)
			expect(result[1].mode).toBe("architect")
			expect(result[1].cost).toBeCloseTo(0.15, 2)
		})

		it("should handle undefined mode as 'unknown'", () => {
			const items: HistoryItem[] = [createMockHistoryItem({ mode: undefined, totalCost: 0.1 })]

			const result = calculateModeBreakdown(items)

			expect(result.length).toBe(1)
			expect(result[0].mode).toBe("unknown")
		})
	})

	describe("calculateCacheEfficiency", () => {
		it("should return zero for empty input", () => {
			const result = calculateCacheEfficiency([])

			expect(result.totalCacheWrites).toBe(0)
			expect(result.totalCacheReads).toBe(0)
			expect(result.cacheHitRate).toBe(0)
		})

		it("should calculate cache hit rate correctly", () => {
			const items: HistoryItem[] = [
				createMockHistoryItem({ cacheWrites: 100, cacheReads: 200 }),
				createMockHistoryItem({ cacheWrites: 100, cacheReads: 200 }),
			]

			const result = calculateCacheEfficiency(items)

			expect(result.totalCacheWrites).toBe(200)
			expect(result.totalCacheReads).toBe(400)
			// Hit rate = 400 / (200 + 400) * 100 = 66.67%
			expect(result.cacheHitRate).toBeCloseTo(66.7, 0)
		})

		it("should handle missing cache values", () => {
			const items: HistoryItem[] = [createMockHistoryItem({ cacheWrites: undefined, cacheReads: undefined })]

			const result = calculateCacheEfficiency(items)

			expect(result.totalCacheWrites).toBe(0)
			expect(result.totalCacheReads).toBe(0)
			expect(result.cacheHitRate).toBe(0)
		})
	})

	describe("aggregateTaskHistory", () => {
		it("should return zeroed summary for empty input", () => {
			const range = createDateRange("allTime")
			const result = aggregateTaskHistory([], range)

			expect(result.totalCost).toBe(0)
			expect(result.totalTokensIn).toBe(0)
			expect(result.totalTokensOut).toBe(0)
			expect(result.totalSessions).toBe(0)
			expect(result.averageCostPerSession).toBe(0)
			expect(result.byMode).toEqual([])
			expect(result.byDay).toEqual([])
		})

		it("should aggregate all metrics correctly", () => {
			const items: HistoryItem[] = [
				createMockHistoryItem({
					mode: "code",
					totalCost: 0.1,
					tokensIn: 1000,
					tokensOut: 500,
					cacheWrites: 50,
					cacheReads: 100,
				}),
				createMockHistoryItem({
					mode: "architect",
					totalCost: 0.2,
					tokensIn: 2000,
					tokensOut: 1000,
					cacheWrites: 50,
					cacheReads: 100,
				}),
			]

			const range = createDateRange("allTime")
			const result = aggregateTaskHistory(items, range)

			expect(result.totalCost).toBeCloseTo(0.3, 2)
			expect(result.totalTokensIn).toBe(3000)
			expect(result.totalTokensOut).toBe(1500)
			expect(result.totalSessions).toBe(2)
			expect(result.averageCostPerSession).toBeCloseTo(0.15, 2)
			expect(result.byMode.length).toBe(2)
			expect(result.cacheEfficiency.totalCacheWrites).toBe(100)
			expect(result.cacheEfficiency.totalCacheReads).toBe(200)
		})

		it("should filter by date range", () => {
			const now = Date.now()
			const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000

			const items: HistoryItem[] = [
				createMockHistoryItem({ ts: now, totalCost: 0.1 }),
				createMockHistoryItem({ ts: tenDaysAgo, totalCost: 0.5 }),
			]

			const range = createDateRange("7days")
			const result = aggregateTaskHistory(items, range)

			expect(result.totalSessions).toBe(1)
			expect(result.totalCost).toBeCloseTo(0.1, 2)
		})
	})
})
