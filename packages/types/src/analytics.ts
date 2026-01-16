import { z } from "zod"

/**
 * Date Range for Analytics Filtering
 */
export const dateRangeSchema = z.object({
	startDate: z.number(), // Unix timestamp
	endDate: z.number(), // Unix timestamp
	preset: z.enum(["today", "7days", "30days", "90days", "allTime"]).optional(),
})

export type DateRange = z.infer<typeof dateRangeSchema>

/**
 * Daily Metrics for Time-Series Charts
 */
export const dailyMetricsSchema = z.object({
	date: z.string(), // ISO date string (YYYY-MM-DD)
	cost: z.number(),
	tokensIn: z.number(),
	tokensOut: z.number(),
	sessionCount: z.number(),
	cacheWrites: z.number().optional(),
	cacheReads: z.number().optional(),
})

export type DailyMetrics = z.infer<typeof dailyMetricsSchema>

/**
 * Mode Breakdown for Pie/Bar Charts
 */
export const modeBreakdownItemSchema = z.object({
	mode: z.string(),
	cost: z.number(),
	tokensIn: z.number(),
	tokensOut: z.number(),
	sessionCount: z.number(),
})

export type ModeBreakdownItem = z.infer<typeof modeBreakdownItemSchema>

/**
 * Cache Efficiency Metrics
 */
export const cacheEfficiencySchema = z.object({
	totalCacheWrites: z.number(),
	totalCacheReads: z.number(),
	cacheHitRate: z.number(), // 0-100 percentage
})

export type CacheEfficiency = z.infer<typeof cacheEfficiencySchema>

/**
 * Analytics Summary - Aggregate Statistics
 */
export const analyticsSummarySchema = z.object({
	// Totals
	totalCost: z.number(),
	totalTokensIn: z.number(),
	totalTokensOut: z.number(),
	totalSessions: z.number(),

	// Averages
	averageCostPerSession: z.number(),
	averageTokensPerSession: z.number(),

	// Cache efficiency
	cacheEfficiency: cacheEfficiencySchema,

	// Breakdowns
	byMode: z.array(modeBreakdownItemSchema),
	byDay: z.array(dailyMetricsSchema),

	// Date range applied
	dateRange: dateRangeSchema,
})

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>
