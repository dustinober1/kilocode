/**
 * Analytics-related Jotai atoms for session metrics and aggregation state
 *
 * Provides reactive state management for analytics data including:
 * - Current session tracking
 * - Session metrics derivation
 * - Token usage timelines
 * - Historical sessions
 * - Tokens per minute aggregation
 */

import { atom } from "jotai"
import AggregationService from "../../services/analytics/AggregationService.js"

/**
 * Base atom to track the current session ID
 * This is a writable atom that can be set by the MetricsCollectorService
 */
export const currentSessionIdAtom = atom<string>("")

/**
 * Read-only derived atom for session metrics
 * Automatically fetches metrics when currentSessionIdAtom changes
 * Returns null if no session is active
 */
export const sessionMetricsAtom = atom(async (get) => {
	const sessionId = get(currentSessionIdAtom)
	if (!sessionId) {
		return null
	}
	const aggregation = AggregationService.getInstance()
	return await aggregation.getSessionMetrics(sessionId)
})

/**
 * Read-only derived atom for token usage timeline
 * Fetches token usage with running totals for current session
 * Returns empty array if no session is active
 */
export const tokenUsageTimelineAtom = atom(async (get) => {
	const sessionId = get(currentSessionIdAtom)
	if (!sessionId) {
		return []
	}
	const aggregation = AggregationService.getInstance()
	return await aggregation.getTokenUsageTimeline(sessionId)
})

/**
 * Read-only derived atom for historical sessions
 * Fetches list of recent sessions (max 20)
 * This atom does not depend on currentSessionIdAtom
 */
export const historicalSessionsAtom = atom(async () => {
	const aggregation = AggregationService.getInstance()
	return await aggregation.getHistoricalSessions(20)
})

/**
 * Read-only derived atom for tokens per minute
 * Fetches time-bucketed token usage for current session
 * Returns empty array if no session is active
 */
export const tokensPerMinuteAtom = atom(async (get) => {
	const sessionId = get(currentSessionIdAtom)
	if (!sessionId) {
		return []
	}
	const aggregation = AggregationService.getInstance()
	return await aggregation.getTokensPerMinute(sessionId)
})

// ============================================================================
// Analytics Action Atoms - Write-only atoms for triggering updates
// ============================================================================

/**
 * Write-only atom to trigger refresh of all derived atoms
 * Forces re-computation by updating currentSessionIdAtom with same value
 */
export const refreshAnalyticsAtom = atom(null, async (get, set) => {
	// Force re-computation by updating currentSessionIdAtom with same value
	const currentId = get(currentSessionIdAtom)
	set(currentSessionIdAtom, currentId)
})

/**
 * Module-scoped timeout for debounced refresh
 * Persists across atom calls
 */
let refreshTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Write-only debounced refresh atom with 100ms delay
 * Clears existing timeout before scheduling new one
 */
export const debouncedRefreshAtom = atom(null, async (get, set) => {
	if (refreshTimeout) {
		clearTimeout(refreshTimeout)
	}
	refreshTimeout = setTimeout(async () => {
		set(refreshAnalyticsAtom)
		refreshTimeout = null
	}, 100)
})
