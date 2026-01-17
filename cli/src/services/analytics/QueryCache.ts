/**
 * QueryCache - Simple cache with TTL for aggregation query results
 *
 * Provides fast in-memory caching for expensive SQL aggregation queries.
 * Cache entries expire after a fixed TTL (time-to-live) to ensure data freshness.
 */

interface CacheEntry<T = unknown> {
	data: T
	timestamp: number
}

class QueryCache {
	private cache = new Map<string, CacheEntry>()
	private readonly ttl = 5000 // 5 second TTL in milliseconds

	/**
	 * Get cached data by key
	 * Returns null if key doesn't exist or entry has expired
	 */
	get<T = unknown>(key: string): T | null {
		const entry = this.cache.get(key)

		if (!entry) {
			return null
		}

		// Check if cache entry has expired
		const now = Date.now()
		if (now - entry.timestamp > this.ttl) {
			this.cache.delete(key)
			return null
		}

		return entry.data as T
	}

	/**
	 * Store data in cache with current timestamp
	 * Overwrites existing entry if key already exists
	 */
	set<T = unknown>(key: string, data: T): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		})
	}

	/**
	 * Invalidate all cache entries matching a key prefix
	 * Used to clear session-specific cache entries when new data arrives
	 */
	invalidate(prefix: string): void {
		const keysToDelete: string[] = []

		// Find all keys that start with the prefix
		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				keysToDelete.push(key)
			}
		}

		// Delete all matching keys
		for (const key of keysToDelete) {
			this.cache.delete(key)
		}
	}

	/**
	 * Clear all cache entries
	 * Useful for testing or complete refresh scenarios
	 */
	clear(): void {
		this.cache.clear()
	}

	/**
	 * Get current cache size (number of entries)
	 * Useful for monitoring and debugging
	 */
	get size(): number {
		return this.cache.size
	}
}

// Export singleton instance for use across the application
export const aggregationCache = new QueryCache()

export default QueryCache
