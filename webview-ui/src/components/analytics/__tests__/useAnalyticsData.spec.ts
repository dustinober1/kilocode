import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useAnalyticsData } from "../hooks/useAnalyticsData"
import type { HistoryItem } from "@roo-code/types"

// Mock the dependencies
vi.mock("@/context/ExtensionStateContext", () => ({
    useExtensionState: () => ({
        taskHistoryVersion: 1,
    }),
}))

const mockHistoryItems: Partial<HistoryItem>[] = [
    {
        id: "1",
        ts: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
        task: "Test task 1",
        tokensIn: 1000,
        tokensOut: 500,
        totalCost: 0.10,
        mode: "code",
        cacheWrites: 100,
        cacheReads: 300,
    },
    {
        id: "2",
        ts: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
        task: "Test task 2",
        tokensIn: 2000,
        tokensOut: 1000,
        totalCost: 0.20,
        mode: "architect",
        cacheWrites: 200,
        cacheReads: 600,
    },
    {
        id: "3",
        ts: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
        task: "Test task 3",
        tokensIn: 500,
        tokensOut: 250,
        totalCost: 0.05,
        mode: "code",
        cacheWrites: 50,
        cacheReads: 150,
    },
]

vi.mock("@/kilocode/hooks/useTaskHistory", () => ({
    useTaskHistory: vi.fn(() => ({
        data: {
            historyItems: mockHistoryItems as HistoryItem[],
            pageIndex: 0,
            pageCount: 1,
        },
        isLoading: false,
    })),
}))

describe("useAnalyticsData", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("should return analytics summary with data", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        expect(result.current.summary).toBeDefined()
        expect(result.current.summary.totalSessions).toBe(3)
        expect(result.current.isLoading).toBe(false)
    })

    it("should filter data by default 30 day range", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        // Default is 30days, so all 3 items should be included
        expect(result.current.dateRangePreset).toBe("30days")
        expect(result.current.summary.totalSessions).toBe(3)
    })

    it("should calculate totals correctly", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        // Total cost should be sum of all items
        expect(result.current.summary.totalCost).toBeCloseTo(0.35, 2)
        expect(result.current.summary.totalTokensIn).toBe(3500)
        expect(result.current.summary.totalTokensOut).toBe(1750)
    })

    it("should calculate cache efficiency", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        // Cache reads: 300 + 600 + 150 = 1050
        // Cache writes: 100 + 200 + 50 = 350
        // Total: 1400, Hit rate: 1050/1400 = 75%
        expect(result.current.summary.cacheEfficiency.totalCacheReads).toBe(1050)
        expect(result.current.summary.cacheEfficiency.totalCacheWrites).toBe(350)
        expect(result.current.summary.cacheEfficiency.cacheHitRate).toBe(75)
    })

    it("should calculate mode breakdown", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        const byMode = result.current.summary.byMode
        expect(byMode.length).toBeGreaterThan(0)

        const codeMode = byMode.find((m) => m.mode === "code")
        const architectMode = byMode.find((m) => m.mode === "architect")

        expect(codeMode).toBeDefined()
        expect(architectMode).toBeDefined()
        expect(codeMode?.sessionCount).toBe(2)
        expect(architectMode?.sessionCount).toBe(1)
    })

    it("should calculate daily metrics", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        const byDay = result.current.summary.byDay
        expect(byDay.length).toBeGreaterThan(0)

        // Each day should have at least one session
        for (const day of byDay) {
            expect(day.sessionCount).toBeGreaterThan(0)
            expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
    })

    it("should allow changing date range preset", async () => {
        const { result } = renderHook(() => useAnalyticsData())

        await waitFor(() => {
            expect(result.current.hasData).toBe(true)
        })

        // Initial preset
        expect(result.current.dateRangePreset).toBe("30days")

        // The setDateRangePreset function should exist and be callable
        expect(typeof result.current.setDateRangePreset).toBe("function")
    })
})
