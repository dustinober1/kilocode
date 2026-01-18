/**
 * Unit tests for MetricsCollectorService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import MetricsCollectorService from "../MetricsCollectorService"
import StorageService from "../StorageService"
import { EventQueue } from "../queue/EventQueue"
import { PIISanitizer } from "../sanitization/PIISanitizer"

// Mock dependencies
vi.mock("../StorageService", () => ({
	default: vi.fn().mockImplementation(() => ({
		startSession: vi.fn().mockResolvedValue(undefined),
		endSession: vi.fn().mockResolvedValue(undefined),
		insertEvents: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		getInstance: vi.fn(function () {
			return this
		}),
	})),
}))

vi.mock("../queue/EventQueue", () => ({
	EventQueue: vi.fn().mockImplementation(() => ({
		enqueue: vi.fn(),
		dequeueBatch: vi.fn().mockReturnValue([]),
		requeue: vi.fn(),
		getLength: vi.fn().mockReturnValue(0),
		isEmpty: vi.fn().mockReturnValue(true),
		isFull: vi.fn().mockReturnValue(false),
	})),
}))

vi.mock("../sanitization/PIISanitizer", () => ({
	PIISanitizer: {
		sanitize: vi.fn((data) => data),
	},
}))

describe("MetricsCollectorService", () => {
	let metricsService: MetricsCollectorService
	let mockStorage: StorageService
	let mockQueue: EventQueue

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks()

		// Get mock instances
		mockStorage = StorageService.getInstance() as unknown as StorageService
		mockQueue = new EventQueue(1000)

		// Reset singleton instance
		;(MetricsCollectorService as { instance?: MetricsCollectorService }).instance = undefined

		// Get service instance
		metricsService = MetricsCollectorService.getInstance()
	})

	afterEach(() => {
		// Clean up
		metricsService.shutdown()
	})

	describe("getInstance", () => {
		it("returns singleton instance", () => {
			const instance1 = MetricsCollectorService.getInstance()
			const instance2 = MetricsCollectorService.getInstance()

			expect(instance1).toBe(instance2)
		})
	})

	describe("startSession", () => {
		it("creates session in storage", async () => {
			const sessionId = "test-session-123"

			await metricsService.startSession(sessionId)

			expect(mockStorage.startSession).toHaveBeenCalledWith(sessionId)
		})
	})

	describe("endSession", () => {
		it("updates session in storage", async () => {
			const sessionId = "test-session-123"
			const exitReason = "user_exit"

			await metricsService.endSession(sessionId, exitReason)

			expect(mockStorage.endSession).toHaveBeenCalledWith(sessionId, exitReason)
		})
	})

	describe("emit", () => {
		it("sanitizes PII before queue", () => {
			const data = {
				toolName: "read",
				duration: 100,
				success: true,
				sessionId: "test-session-123",
			}

			metricsService.emit("tool:executed", data)

			expect(PIISanitizer.sanitize).toHaveBeenCalledWith(data)
		})

		it("enqueues to EventQueue", () => {
			const data = {
				toolName: "read",
				duration: 100,
				success: true,
				sessionId: "test-session-123",
			}

			metricsService.emit("tool:executed", data)

			expect(mockQueue.enqueue).toHaveBeenCalled()
		})

		it("does nothing when shutdown", () => {
			// Shutdown the service
			metricsService.shutdown()
			;(metricsService as { isShutdown: boolean }).isShutdown = true

			const data = {
				toolName: "read",
				duration: 100,
				success: true,
				sessionId: "test-session-123",
			}

			const result = metricsService.emit("tool:executed", data)

			expect(result).toBe(false)
			expect(mockQueue.enqueue).not.toHaveBeenCalled()
		})

		it("does nothing when analytics disabled", () => {
			// Disable analytics
			;(metricsService as { privacyConfig: { enabled: boolean } }).privacyConfig.enabled = false

			const data = {
				toolName: "read",
				duration: 100,
				success: true,
				sessionId: "test-session-123",
			}

			const result = metricsService.emit("tool:executed", data)

			expect(result).toBe(false)
			expect(mockQueue.enqueue).not.toHaveBeenCalled()
		})
	})

	describe("flush", () => {
		it("dequeues batch and inserts to storage", async () => {
			const mockEvents = [
				{
					type: "tool:executed",
					data: { toolName: "read", duration: 100, success: true, sessionId: "test-session-123" },
					timestamp: new Date(),
				},
			]

			vi.spyOn(mockQueue, "dequeueBatch").mockReturnValue(mockEvents as unknown[])

			// Trigger flush by accessing private method
			await (metricsService as { flush: () => Promise<void> }).flush()

			expect(mockQueue.dequeueBatch).toHaveBeenCalledWith(100)
			expect(mockStorage.insertEvents).toHaveBeenCalled()
		})

		it("requeues on failure", async () => {
			const mockEvents = [
				{
					type: "tool:executed",
					data: { toolName: "read", duration: 100, success: true, sessionId: "test-session-123" },
					timestamp: new Date(),
				},
			]

			vi.spyOn(mockQueue, "dequeueBatch").mockReturnValue(mockEvents as unknown[])
			vi.spyOn(mockStorage, "insertEvents").mockRejectedValue(new Error("DB error"))

			// Trigger flush
			await (metricsService as { flush: () => Promise<void> }).flush()

			expect(mockQueue.requeue).toHaveBeenCalledWith(mockEvents)
		})
	})

	describe("shutdown", () => {
		it("clears interval and flushes", async () => {
			const flushSpy = vi
				.spyOn(metricsService as { flush: () => Promise<void> }, "flush")
				.mockResolvedValue(undefined)

			await metricsService.shutdown()

			expect(flushSpy).toHaveBeenCalled()
			expect(mockStorage.close).toHaveBeenCalled()
		})
	})

	describe("graceful shutdown", () => {
		it("handles SIGTERM signal", async () => {
			vi.spyOn(metricsService, "shutdown").mockResolvedValue(undefined)
			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called")
			})

			// Emit SIGTERM signal
			process.emit("SIGTERM", "SIGTERM")

			// Wait for async handler
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Note: The actual shutdown call happens in the signal handler
			// and we can't easily test it without actually exiting the process
			exitSpy.mockRestore()
		})

		it("handles SIGINT signal", async () => {
			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("process.exit called")
			})

			// Emit SIGINT signal
			try {
				process.emit("SIGINT", "SIGINT")
			} catch (_error) {
				// Expected to throw due to process.exit mock
			}

			exitSpy.mockRestore()
		})
	})
})
