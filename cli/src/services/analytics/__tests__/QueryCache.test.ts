/**
 * Unit tests for QueryCache
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import QueryCache, { aggregationCache } from "../QueryCache"

describe("QueryCache", () => {
	let cache: QueryCache

	beforeEach(() => {
		cache = new QueryCache()
		vi.clearAllMocks()
	})

	afterEach(() => {
		cache.clear()
	})

	describe("get", () => {
		it("returns null for missing key", () => {
			const result = cache.get("nonexistent-key")
			expect(result).toBeNull()
		})

		it("returns null for expired entry", () => {
			const data = { value: "test" }
			cache.set("test-key", data)

			// Mock time passing beyond TTL (5 seconds)
			vi.useFakeTimers()
			vi.advanceTimersByTime(6000) // 6 seconds > 5 second TTL

			const result = cache.get("test-key")

			expect(result).toBeNull()

			vi.useRealTimers()
		})

		it("returns cached data if not expired", () => {
			const data = { value: "test", count: 42 }
			cache.set("test-key", data)

			// Advance time but stay within TTL
			vi.useFakeTimers()
			vi.advanceTimersByTime(3000) // 3 seconds < 5 second TTL

			const result = cache.get("test-key")

			expect(result).toEqual(data)

			vi.useRealTimers()
		})

		it("returns cached data immediately after set", () => {
			const data = { items: [1, 2, 3] }
			cache.set("array-key", data)

			const result = cache.get("array-key")

			expect(result).toEqual(data)
			// Note: Cache returns same reference for performance (no deep copy)
			expect(result).toBe(data)
		})
	})

	describe("set", () => {
		it("stores data with timestamp", () => {
			const data = { value: "test" }
			cache.set("test-key", data)

			const result = cache.get("test-key")

			expect(result).toEqual(data)
		})

		it("overwrites existing key", () => {
			cache.set("test-key", { value: "first" })
			cache.set("test-key", { value: "second" })

			const result = cache.get("test-key")

			expect(result).toEqual({ value: "second" })
		})

		it("stores multiple independent cache entries", () => {
			cache.set("key1", { value: "data1" })
			cache.set("key2", { value: "data2" })
			cache.set("key3", { value: "data3" })

			expect(cache.get("key1")).toEqual({ value: "data1" })
			expect(cache.get("key2")).toEqual({ value: "data2" })
			expect(cache.get("key3")).toEqual({ value: "data3" })
			expect(cache.size).toBe(3)
		})

		it("handles different data types", () => {
			const stringData = "test string"
			const numberData = 42
			const arrayData = [1, 2, 3]
			const objectData = { nested: { value: "deep" } }

			cache.set("string-key", stringData)
			cache.set("number-key", numberData)
			cache.set("array-key", arrayData)
			cache.set("object-key", objectData)

			expect(cache.get<string>("string-key")).toBe(stringData)
			expect(cache.get<number>("number-key")).toBe(numberData)
			expect(cache.get<number[]>("array-key")).toEqual(arrayData)
			expect(cache.get<{ nested: { value: string } }>("object-key")).toEqual(objectData)
		})
	})

	describe("invalidate", () => {
		it("removes specific cache entry by exact key", () => {
			cache.set("session-123:metrics", { count: 10 })
			cache.set("session-456:metrics", { count: 20 })

			cache.invalidate("session-123")

			expect(cache.get("session-123:metrics")).toBeNull()
			expect(cache.get("session-456:metrics")).toEqual({ count: 20 })
		})

		it("removes all entries with matching prefix", () => {
			cache.set("session-123:metrics", { count: 10 })
			cache.set("session-123:tokens", { total: 100 })
			cache.set("session-123:timeline", { points: [] })
			cache.set("session-456:metrics", { count: 20 })

			cache.invalidate("session-123")

			expect(cache.get("session-123:metrics")).toBeNull()
			expect(cache.get("session-123:tokens")).toBeNull()
			expect(cache.get("session-123:timeline")).toBeNull()
			expect(cache.get("session-456:metrics")).toEqual({ count: 20 })
		})

		it("only removes keys with matching prefix", () => {
			cache.set("session-abc:metrics", { count: 10 })
			cache.set("session-xyz:metrics", { count: 20 }) // Different prefix
			cache.set("other-123:metrics", { count: 30 })

			cache.invalidate("session-abc")

			expect(cache.get("session-abc:metrics")).toBeNull()
			expect(cache.get("session-xyz:metrics")).toEqual({ count: 20 })
			expect(cache.get("other-123:metrics")).toEqual({ count: 30 })
		})

		it("handles empty cache gracefully", () => {
			expect(() => cache.invalidate("any-prefix")).not.toThrow()
			expect(cache.size).toBe(0)
		})

		it("handles non-matching prefix gracefully", () => {
			cache.set("key1", { value: "data1" })
			cache.set("key2", { value: "data2" })

			cache.invalidate("nonexistent")

			expect(cache.get("key1")).toEqual({ value: "data1" })
			expect(cache.get("key2")).toEqual({ value: "data2" })
			expect(cache.size).toBe(2)
		})
	})

	describe("clear", () => {
		it("removes all cache entries", () => {
			cache.set("key1", { value: "data1" })
			cache.set("key2", { value: "data2" })
			cache.set("key3", { value: "data3" })

			expect(cache.size).toBe(3)

			cache.clear()

			expect(cache.size).toBe(0)
			expect(cache.get("key1")).toBeNull()
			expect(cache.get("key2")).toBeNull()
			expect(cache.get("key3")).toBeNull()
		})

		it("handles empty cache gracefully", () => {
			expect(() => cache.clear()).not.toThrow()
			expect(cache.size).toBe(0)
		})
	})

	describe("size", () => {
		it("returns zero for empty cache", () => {
			expect(cache.size).toBe(0)
		})

		it("returns count of cache entries", () => {
			cache.set("key1", { value: "data1" })
			expect(cache.size).toBe(1)

			cache.set("key2", { value: "data2" })
			expect(cache.size).toBe(2)

			cache.set("key3", { value: "data3" })
			expect(cache.size).toBe(3)
		})

		it("decreases when entry expires", () => {
			cache.set("key1", { value: "data1" })
			cache.set("key2", { value: "data2" })
			expect(cache.size).toBe(2)

			// Advance time beyond TTL
			vi.useFakeTimers()
			vi.advanceTimersByTime(6000)

			// Access expired entry (should be removed)
			cache.get("key1")

			expect(cache.size).toBe(1)

			vi.useRealTimers()
		})

		it("decreases when entry is invalidated", () => {
			cache.set("session-123:metrics", { count: 10 })
			cache.set("session-123:tokens", { total: 100 })
			cache.set("session-456:metrics", { count: 20 })
			expect(cache.size).toBe(3)

			cache.invalidate("session-123")

			expect(cache.size).toBe(1)
		})
	})

	describe("TTL behavior", () => {
		it("uses 5 second TTL", () => {
			const data = { value: "test" }
			cache.set("test-key", data)

			// At 4 seconds, should still be cached
			vi.useFakeTimers()
			vi.advanceTimersByTime(4000)
			expect(cache.get("test-key")).toEqual(data)

			// At 6 seconds, should be expired
			vi.advanceTimersByTime(2000) // Total 6 seconds
			expect(cache.get("test-key")).toBeNull()

			vi.useRealTimers()
		})

		it("refreshes TTL on set", () => {
			const data = { value: "test" }
			cache.set("test-key", data)

			// Advance 4 seconds
			vi.useFakeTimers()
			vi.advanceTimersByTime(4000)
			expect(cache.get("test-key")).toEqual(data)

			// Overwrite entry - resets TTL
			cache.set("test-key", data)

			// Advance another 4 seconds (total 8 seconds from first set)
			vi.advanceTimersByTime(4000)
			// Should still be cached because TTL was reset
			expect(cache.get("test-key")).toEqual(data)

			vi.useRealTimers()
		})

		it("independent expiration for multiple entries", () => {
			// Set first entry
			cache.set("key1", { value: "data1" })

			// Advance 3 seconds
			vi.useFakeTimers()
			vi.advanceTimersByTime(3000)

			// Set second entry (now has 3 seconds less "age")
			cache.set("key2", { value: "data2" })

			// Advance another 3 seconds (total 6 seconds)
			vi.advanceTimersByTime(3000)

			// First entry should be expired (6 seconds old)
			expect(cache.get("key1")).toBeNull()

			// Second entry should still be cached (only 3 seconds old)
			expect(cache.get("key2")).toEqual({ value: "data2" })

			vi.useRealTimers()
		})
	})

	describe("singleton instance", () => {
		it("exports aggregationCache singleton", () => {
			expect(aggregationCache).toBeInstanceOf(QueryCache)
		})

		it("singleton maintains state across operations", () => {
			const data = { value: "test" }
			aggregationCache.set("singleton-key", data)

			const result = aggregationCache.get("singleton-key")

			expect(result).toEqual(data)

			// Clean up
			aggregationCache.clear()
		})
	})

	describe("edge cases", () => {
		it("handles empty string key", () => {
			const data = { value: "test" }
			cache.set("", data)

			expect(cache.get("")).toEqual(data)
		})

		it("handles null and undefined data", () => {
			cache.set("null-key", null)
			cache.set("undefined-key", undefined)

			expect(cache.get("null-key")).toBeNull()
			expect(cache.get("undefined-key")).toBeUndefined()
		})

		it("handles complex nested objects", () => {
			const data = {
				nested: {
					deep: {
						value: [1, 2, { x: "y" }],
					},
				},
			}

			cache.set("complex-key", data)

			expect(cache.get("complex-key")).toEqual(data)
		})

		it("handles special characters in keys", () => {
			const specialKeys = [
				"key:with:colons",
				"key/with/slashes",
				"key-with-dashes",
				"key_with_underscores",
				"key.with.dots",
				"key with spaces",
			]

			for (const key of specialKeys) {
				cache.set(key, { key })
			}

			for (const key of specialKeys) {
				expect(cache.get(key)).toEqual({ key })
			}
		})
	})
})
