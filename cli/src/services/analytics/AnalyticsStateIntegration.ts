/**
 * AnalyticsStateIntegration - Event-to-atom bridge for real-time updates
 *
 * Bridges MetricsCollectorService events to Jotai atoms for reactive state updates.
 * Listens for 'flush' and 'session:end' events to trigger atom refreshes and cache invalidation.
 */

import MetricsCollectorService from "./MetricsCollectorService"
import { aggregationCache } from "./QueryCache"
import { getDefaultStore } from "jotai"
import { debouncedRefreshAtom, refreshAnalyticsAtom } from "../../state/atoms/analytics"

/**
 * Initialize analytics state integration
 * Sets up event listeners to bridge MetricsCollector events to Jotai atoms
 *
 * - 'flush' event: Invalidates cache and triggers debounced refresh (100ms)
 * - 'session:end' event: Invalidates cache and triggers immediate refresh
 *
 * Called once during CLI startup
 */
export function initializeAnalyticsStateIntegration(): void {
	const metrics = MetricsCollectorService.getInstance()
	const store = getDefaultStore()

	// Listen for batch flush events
	// These happen every 1 second during normal operation
	metrics.on("flush", async () => {
		const sessionId = await metrics.getCurrentSessionId()
		if (sessionId) {
			// Invalidate cache for this session
			// This clears all cached queries for the session (metrics, timeline, tokens per minute)
			aggregationCache.invalidate(sessionId)

			// Trigger debounced refresh
			// Batches multiple flush events within 100ms to avoid excessive re-computation
			store.set(debouncedRefreshAtom)
		}
	})

	// Listen for session end events
	// These happen when the user exits the CLI or an error occurs
	metrics.on("session:end", async (sessionId: string) => {
		// Invalidate cache for this session
		aggregationCache.invalidate(sessionId)

		// Trigger immediate refresh for final metrics
		// No debounce needed for session end - we want final data immediately
		store.set(refreshAnalyticsAtom)
	})
}
