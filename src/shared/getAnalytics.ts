import type {
	HistoryItem,
	AnalyticsSummary,
	DailyMetrics,
	ModeBreakdownItem,
	CacheEfficiency,
	DateRange,
} from "@roo-code/types"

/**
 * Get the start of a day in local time
 */
function getStartOfDay(date: Date): Date {
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	return d
}

/**
 * Get the end of a day in local time
 */
function getEndOfDay(date: Date): Date {
	const d = new Date(date)
	d.setHours(23, 59, 59, 999)
	return d
}

/**
 * Create a DateRange for common presets
 */
export function createDateRange(preset: DateRange["preset"]): DateRange {
	const now = new Date()
	const endDate = getEndOfDay(now).getTime()
	let startDate: number

	switch (preset) {
		case "today":
			startDate = getStartOfDay(now).getTime()
			break
		case "7days":
			const sevenDaysAgo = new Date(now)
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
			startDate = getStartOfDay(sevenDaysAgo).getTime()
			break
		case "30days":
			const thirtyDaysAgo = new Date(now)
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
			startDate = getStartOfDay(thirtyDaysAgo).getTime()
			break
		case "90days":
			const ninetyDaysAgo = new Date(now)
			ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
			startDate = getStartOfDay(ninetyDaysAgo).getTime()
			break
		case "allTime":
		default:
			startDate = 0 // Beginning of time
			break
	}

	return { startDate, endDate, preset }
}

/**
 * Filter history items by date range
 */
export function filterByDateRange(items: HistoryItem[], range: DateRange): HistoryItem[] {
	return items.filter((item) => item.ts >= range.startDate && item.ts <= range.endDate)
}

/**
 * Calculate daily metrics from history items
 */
export function calculateDailyMetrics(items: HistoryItem[]): DailyMetrics[] {
	const dailyMap = new Map<string, DailyMetrics>()

	for (const item of items) {
		const date = new Date(item.ts)
		const dateKey = date.toISOString().split("T")[0] // YYYY-MM-DD

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

	// Sort by date ascending
	return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculate mode breakdown from history items
 */
export function calculateModeBreakdown(items: HistoryItem[]): ModeBreakdownItem[] {
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

	// Sort by cost descending
	return Array.from(modeMap.values()).sort((a, b) => b.cost - a.cost)
}

/**
 * Calculate cache efficiency from history items
 */
export function calculateCacheEfficiency(items: HistoryItem[]): CacheEfficiency {
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
		cacheHitRate: Math.round(cacheHitRate * 10) / 10, // Round to 1 decimal
	}
}

/**
 * Aggregate task history into a full analytics summary
 */
export function aggregateTaskHistory(items: HistoryItem[], range: DateRange): AnalyticsSummary {
	// Filter by date range first
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
		totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
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
}
