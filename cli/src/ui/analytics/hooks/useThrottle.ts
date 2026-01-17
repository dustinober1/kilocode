/**
 * Custom throttle hook to prevent render storms in dashboard components
 *
 * Uses lodash.debounce to delay value updates and prevent flickering
 * from high-frequency analytics updates (every 1 second from MetricsCollector flush).
 *
 * Key features:
 * - Generic type parameter <T> to work with any data type
 * - Uses useMemo to stabilize debounce function across re-renders
 * - Cleanup function cancels pending debounced calls on unmount
 * - Default delay of 100-150ms for dashboard use cases
 */

import { useEffect, useMemo, useState } from "react"
import { debounce } from "lodash.debounce"

export function useThrottle<T>(value: T, delay: number): T {
	const [throttledValue, setThrottledValue] = useState<T>(value)

	const debouncedSetValue = useMemo(() => debounce((newValue: T) => setThrottledValue(newValue), delay), [delay])

	useEffect(() => {
		debouncedSetValue(value)
		return () => debouncedSetValue.cancel()
	}, [value, debouncedSetValue])

	return throttledValue
}
