import { useMemo, useState } from "react"
import type { AnalyticsSummary, DailyMetrics, ModeBreakdownItem, CacheEfficiency, DateRange, HistoryItem } from "@roo-code/types"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useTaskHistory } from "@/kilocode/hooks/useTaskHistory"

export type DateRangePreset = "today" | "7days" | "30days" | "90days" | "allTime"

export interface UseAnalyticsDataResult {
    summary: AnalyticsSummary
    dateRangePreset: DateRangePreset
    setDateRangePreset: (preset: DateRangePreset) => void
    isLoading: boolean
    hasData: boolean
}

// Date range helpers
function getStartOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

function getEndOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
}

function createDateRange(preset: DateRangePreset): DateRange {
    const now = new Date()
    const endDate = getEndOfDay(now).getTime()
    let startDate: number

    switch (preset) {
        case "today":
            startDate = getStartOfDay(now).getTime()
            break
        case "7days": {
            const sevenDaysAgo = new Date(now)
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            startDate = getStartOfDay(sevenDaysAgo).getTime()
            break
        }
        case "30days": {
            const thirtyDaysAgo = new Date(now)
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            startDate = getStartOfDay(thirtyDaysAgo).getTime()
            break
        }
        case "90days": {
            const ninetyDaysAgo = new Date(now)
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
            startDate = getStartOfDay(ninetyDaysAgo).getTime()
            break
        }
        case "allTime":
        default:
            startDate = 0
            break
    }

    return { startDate, endDate, preset }
}

function filterByDateRange(items: HistoryItem[], range: DateRange): HistoryItem[] {
    return items.filter((item) => item.ts >= range.startDate && item.ts <= range.endDate)
}

function calculateDailyMetrics(items: HistoryItem[]): DailyMetrics[] {
    const dailyMap = new Map<string, DailyMetrics>()

    for (const item of items) {
        const date = new Date(item.ts)
        const dateKey = date.toISOString().split("T")[0]

        const existing = dailyMap.get(dateKey)
        if (existing) {
            existing.cost += item.totalCost
            existing.tokensIn += item.tokensIn
            existing.tokensOut += item.tokensOut
            existing.sessionCount += 1
            existing.cacheWrites = (existing.cacheWrites ?? 0) + (item.cacheWrites ?? 0)
            existing.cacheReads = (existing.cacheReads ?? 0) + (item.cacheReads ?? 0)
        } else {
            dailyMap.set(dateKey, {
                date: dateKey,
                cost: item.totalCost,
                tokensIn: item.tokensIn,
                tokensOut: item.tokensOut,
                sessionCount: 1,
                cacheWrites: item.cacheWrites ?? 0,
                cacheReads: item.cacheReads ?? 0,
            })
        }
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function calculateModeBreakdown(items: HistoryItem[]): ModeBreakdownItem[] {
    const modeMap = new Map<string, ModeBreakdownItem>()

    for (const item of items) {
        const mode = item.mode ?? "unknown"
        const existing = modeMap.get(mode)

        if (existing) {
            existing.cost += item.totalCost
            existing.tokensIn += item.tokensIn
            existing.tokensOut += item.tokensOut
            existing.sessionCount += 1
        } else {
            modeMap.set(mode, {
                mode,
                cost: item.totalCost,
                tokensIn: item.tokensIn,
                tokensOut: item.tokensOut,
                sessionCount: 1,
            })
        }
    }

    return Array.from(modeMap.values()).sort((a, b) => b.cost - a.cost)
}

function calculateCacheEfficiency(items: HistoryItem[]): CacheEfficiency {
    let totalCacheWrites = 0
    let totalCacheReads = 0

    for (const item of items) {
        totalCacheWrites += item.cacheWrites ?? 0
        totalCacheReads += item.cacheReads ?? 0
    }

    const totalCacheOperations = totalCacheWrites + totalCacheReads
    const cacheHitRate = totalCacheOperations > 0 ? (totalCacheReads / totalCacheOperations) * 100 : 0

    return {
        totalCacheWrites,
        totalCacheReads,
        cacheHitRate: Math.round(cacheHitRate * 10) / 10,
    }
}

/**
 * Hook to aggregate analytics data from task history
 */
export function useAnalyticsData(): UseAnalyticsDataResult {
    const { taskHistoryVersion } = useExtensionState()
    const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("30days")

    // Fetch all task history (all workspaces for analytics)
    const { data, isLoading } = useTaskHistory(
        {
            workspace: "all", // Get all data for analytics
            sort: "newest",
            favoritesOnly: false,
            pageIndex: 0,
            // No search filter for analytics
        },
        taskHistoryVersion ?? 0
    )

    const items = data?.historyItems ?? []

    const summary = useMemo<AnalyticsSummary>(() => {
        const range = createDateRange(dateRangePreset)
        const filteredItems = filterByDateRange(items, range)

        // Calculate totals
        let totalCost = 0
        let totalTokensIn = 0
        let totalTokensOut = 0

        for (const item of filteredItems) {
            totalCost += item.totalCost
            totalTokensIn += item.tokensIn
            totalTokensOut += item.tokensOut
        }

        const totalSessions = filteredItems.length
        const averageCostPerSession = totalSessions > 0 ? totalCost / totalSessions : 0
        const averageTokensPerSession = totalSessions > 0 ? (totalTokensIn + totalTokensOut) / totalSessions : 0

        return {
            totalCost: Math.round(totalCost * 100) / 100,
            totalTokensIn,
            totalTokensOut,
            totalSessions,
            averageCostPerSession: Math.round(averageCostPerSession * 100) / 100,
            averageTokensPerSession: Math.round(averageTokensPerSession),
            cacheEfficiency: calculateCacheEfficiency(filteredItems),
            byMode: calculateModeBreakdown(filteredItems),
            byDay: calculateDailyMetrics(filteredItems),
            dateRange: range,
        }
    }, [items, dateRangePreset])

    const hasData = items.length > 0

    return {
        summary,
        dateRangePreset,
        setDateRangePreset,
        isLoading,
        hasData,
    }
}
