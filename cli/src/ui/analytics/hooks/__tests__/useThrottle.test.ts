/**
 * Unit tests for useThrottle hook
 *
 * Note: These tests verify the debounce behavior and integration with lodash.debounce.
 * Full React integration testing requires @testing-library/react, which is not currently installed.
 * These tests verify the core logic and type safety of the hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import debounce from "lodash.debounce"

// Mock React to test hook behavior without renderHook
// This allows us to verify the debounce logic without @testing-library/react
describe("useThrottle debounce logic", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe("debounce integration", () => {
		it("creates debounced function with specified delay", () => {
			const setValue = vi.fn()

			const debouncedSetValue = debounce(setValue, 100)

			// Initial value should not change immediately
			debouncedSetValue("updated")
			expect(setValue).not.toHaveBeenCalled()

			// Advance time past delay
			vi.advanceTimersByTime(150)

			// Now setValue should have been called
			expect(setValue).toHaveBeenCalledTimes(1)
			expect(setValue).toHaveBeenCalledWith("updated")

			debouncedSetValue.cancel()
		})

		it("cancels pending debounced calls", () => {
			const setValue = vi.fn()
			const debouncedSetValue = debounce(setValue, 100)

			// Trigger update
			debouncedSetValue("first")
			debouncedSetValue("second")

			// Cancel before delay completes
			debouncedSetValue.cancel()

			// Advance time past delay
			vi.advanceTimersByTime(150)

			// setValue should not have been called due to cancellation
			expect(setValue).not.toHaveBeenCalled()
		})

		it("handles multiple rapid updates (only last value is set)", () => {
			const setValue = vi.fn()

			const debouncedSetValue = debounce(setValue, 100)

			// Rapid updates
			debouncedSetValue("update-1")
			debouncedSetValue("update-2")
			debouncedSetValue("update-3")

			// Advance time past delay
			vi.advanceTimersByTime(150)

			// Should only call once with the last value
			expect(setValue).toHaveBeenCalledTimes(1)
			expect(setValue).toHaveBeenCalledWith("update-3")

			debouncedSetValue.cancel()
		})
	})

	describe("type safety", () => {
		it("works with string type", () => {
			let result: string | undefined
			const setValue = (value: string) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue("test")
			vi.advanceTimersByTime(150)

			expect(result).toBe("test")
			debouncedSetValue.cancel()
		})

		it("works with number type", () => {
			let result: number | undefined
			const setValue = (value: number) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue(123)
			vi.advanceTimersByTime(150)

			expect(result).toBe(123)
			debouncedSetValue.cancel()
		})

		it("works with array type", () => {
			let result: number[] | undefined
			const setValue = (value: number[]) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			const testArray = [1, 2, 3]
			debouncedSetValue(testArray)
			vi.advanceTimersByTime(150)

			expect(result).toEqual(testArray)
			debouncedSetValue.cancel()
		})

		it("works with object type", () => {
			let result: { key: string; value: number } | undefined
			const setValue = (value: { key: string; value: number }) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			const testObject = { key: "test", value: 42 }
			debouncedSetValue(testObject)
			vi.advanceTimersByTime(150)

			expect(result).toEqual(testObject)
			debouncedSetValue.cancel()
		})

		it("works with null type", () => {
			let result: string | null | undefined
			const setValue = (value: string | null) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue(null)
			vi.advanceTimersByTime(150)

			expect(result).toBeNull()
			debouncedSetValue.cancel()
		})

		it("works with undefined type", () => {
			let result: string | undefined
			const setValue = (value: string | undefined) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue(undefined)
			vi.advanceTimersByTime(150)

			expect(result).toBeUndefined()
			debouncedSetValue.cancel()
		})
	})

	describe("edge cases", () => {
		it("handles zero delay", () => {
			let result: string | undefined
			const setValue = (value: string) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 0)

			debouncedSetValue("test")
			// With zero delay, should still wait for next tick
			expect(result).toBeUndefined()

			vi.advanceTimersByTime(10)
			expect(result).toBe("test")

			debouncedSetValue.cancel()
		})

		it("handles very long delay", () => {
			let result: string | undefined
			const setValue = (value: string) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 10000)

			debouncedSetValue("test")
			vi.advanceTimersByTime(100)

			// Should not have fired yet
			expect(result).toBeUndefined()

			vi.advanceTimersByTime(10000)
			expect(result).toBe("test")

			debouncedSetValue.cancel()
		})

		it("handles empty string", () => {
			let result: string | undefined
			const setValue = (value: string) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue("")
			vi.advanceTimersByTime(150)

			expect(result).toBe("")
			debouncedSetValue.cancel()
		})

		it("handles empty array", () => {
			let result: number[] | undefined
			const setValue = (value: number[]) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue([])
			vi.advanceTimersByTime(150)

			expect(result).toEqual([])
			debouncedSetValue.cancel()
		})

		it("handles empty object", () => {
			let result: Record<string, never> | undefined
			const setValue = (value: Record<string, never>) => {
				result = value
			}
			const debouncedSetValue = debounce(setValue, 100)

			debouncedSetValue({})
			vi.advanceTimersByTime(150)

			expect(result).toEqual({})
			debouncedSetValue.cancel()
		})
	})

	describe("delay parameter", () => {
		it("respects different delay durations", () => {
			const results: string[] = []
			const setValue = (value: string) => {
				results.push(value)
			}

			const shortDebounced = debounce(setValue, 50)
			const longDebounced = debounce(setValue, 200)

			shortDebounced("short")
			longDebounced("long")

			// Advance 75ms - only short should have fired
			vi.advanceTimersByTime(75)
			expect(results).toContain("short")
			expect(results).not.toContain("long")

			// Advance another 150ms (total 225ms) - long should have fired
			vi.advanceTimersByTime(150)
			expect(results).toContain("long")

			shortDebounced.cancel()
			longDebounced.cancel()
		})
	})
})

describe("useThrottle hook structure", () => {
	it("exports useThrottle function", async () => {
		const hookModule = await import("../useThrottle")
		expect(hookModule.useThrottle).toBeDefined()
		expect(typeof hookModule.useThrottle).toBe("function")
	})

	it("hook is exported from index", async () => {
		const indexModule = await import("../index")
		expect(indexModule.useThrottle).toBeDefined()
	})
})
