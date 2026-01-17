/**
 * Integration tests for AnalyticsStateIntegration
 * Tests event-to-atom wiring between MetricsCollector and Jotai atoms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getDefaultStore } from "jotai"
import { EventEmitter } from "events"
import { aggregationCache } from "../QueryCache"
import { initializeAnalyticsStateIntegration } from "../AnalyticsStateIntegration"

// Mock MetricsCollectorService
class MockMetricsCollectorService extends EventEmitter {
	getCurrentSessionId = vi.fn(() => Promise.resolve(""))
}

// Mock the module
vi.mock("../MetricsCollectorService", () => ({
	default: {
		getInstance: vi.fn(() => mockMetricsCollector),
	},
}))

const mockMetricsCollector = new MockMetricsCollectorService()

describe("AnalyticsStateIntegration", () => {
	let store: ReturnType<typeof getDefaultStore>

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks()

		// Reset singleton instance
		// @ts-expect-error - accessing private property for testing
		mockMetricsCollector.getCurrentSessionId.mockResolvedValue("")

		// Create fresh store
		store = getDefaultStore()
	})

	afterEach(() => {
		// Clean up
		mockMetricsCollector.removeAllListeners()
	})

	describe("flush event handling", () => {
		it("invalidates cache when flush event occurs", async () => {
			const sessionId = "test-session-123"
			const invalidateSpy = vi.spyOn(aggregationCache, "invalidate")

			// Mock getCurrentSessionId to return session ID
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue(sessionId)

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Emit flush event
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify cache was invalidated
			expect(invalidateSpy).toHaveBeenCalledWith(sessionId)
		})

		it("triggers debounced refresh when flush event occurs", async () => {
			const sessionId = "test-session-123"

			// Mock getCurrentSessionId to return session ID
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue(sessionId)

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Track store.set calls
			const setSpy = vi.spyOn(store, "set")

			// Emit flush event
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify store.set was called (for debouncedRefreshAtom)
			expect(setSpy).toHaveBeenCalled()
		})

		it("skips cache invalidation when sessionId is empty", async () => {
			const invalidateSpy = vi.spyOn(aggregationCache, "invalidate")

			// Mock getCurrentSessionId to return empty string
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue("")

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Emit flush event
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify cache was NOT invalidated
			expect(invalidateSpy).not.toHaveBeenCalled()
		})

		it("skips refresh when sessionId is empty", async () => {
			// Mock getCurrentSessionId to return empty string
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue("")

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Track store.set calls
			const setSpy = vi.spyOn(store, "set")

			// Emit flush event
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify store.set was NOT called (refresh is skipped when no session)
			expect(setSpy).not.toHaveBeenCalled()
		})
	})

	describe("session:end event handling", () => {
		it("invalidates cache when session:end event occurs", async () => {
			const sessionId = "test-session-456"
			const invalidateSpy = vi.spyOn(aggregationCache, "invalidate")

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Emit session:end event
			mockMetricsCollector.emit("session:end", sessionId)

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify cache was invalidated with session ID from event
			expect(invalidateSpy).toHaveBeenCalledWith(sessionId)
		})

		it("triggers immediate refresh when session:end event occurs", async () => {
			const sessionId = "test-session-789"

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Track store.set calls
			const setSpy = vi.spyOn(store, "set")

			// Emit session:end event
			mockMetricsCollector.emit("session:end", sessionId)

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify store.set was called (for refreshAnalyticsAtom)
			expect(setSpy).toHaveBeenCalled()
		})
	})

	describe("debounce behavior", () => {
		it("triggers debounced refresh atom on flush", async () => {
			const sessionId = "test-session-debounce-1"

			// Mock getCurrentSessionId
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue(sessionId)

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Track store.set calls
			const setSpy = vi.spyOn(store, "set")

			// Emit flush event
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify store.set was called for debounced refresh
			expect(setSpy).toHaveBeenCalled()
		})

		it("sets debounced atom multiple times for multiple flushes", async () => {
			const sessionId = "test-session-debounce-2"

			// Mock getCurrentSessionId
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue(sessionId)

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Track store.set calls
			const setSpy = vi.spyOn(store, "set")

			// Emit multiple flush events
			mockMetricsCollector.emit("flush")
			mockMetricsCollector.emit("flush")
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify store.set was called multiple times (once per flush)
			// The debounce logic is inside the atom, we just verify integration
			expect(setSpy).toHaveBeenCalledTimes(3)
		})
	})

	describe("integration with MetricsCollector", () => {
		it("handles multiple flush events correctly", async () => {
			const sessionId = "test-session-multi-1"
			const invalidateSpy = vi.spyOn(aggregationCache, "invalidate")

			// Mock getCurrentSessionId
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue(sessionId)

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Emit multiple flush events
			mockMetricsCollector.emit("flush")
			mockMetricsCollector.emit("flush")
			mockMetricsCollector.emit("flush")

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify cache was invalidated for each flush
			expect(invalidateSpy).toHaveBeenCalledTimes(3)
		})

		it("handles both flush and session:end events", async () => {
			const sessionId = "test-session-both-1"
			const invalidateSpy = vi.spyOn(aggregationCache, "invalidate")

			// Mock getCurrentSessionId
			// @ts-expect-error - accessing private property for testing
			mockMetricsCollector.getCurrentSessionId.mockResolvedValue(sessionId)

			// Initialize integration
			initializeAnalyticsStateIntegration()

			// Emit flush event
			mockMetricsCollector.emit("flush")

			// Emit session:end event
			mockMetricsCollector.emit("session:end", sessionId)

			// Wait for async handlers
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Verify cache was invalidated for both events
			expect(invalidateSpy).toHaveBeenCalledTimes(2)
		})
	})
})
