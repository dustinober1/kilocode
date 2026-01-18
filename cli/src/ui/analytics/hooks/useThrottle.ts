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

// Type declaration for lodash.debounce (CommonJS module)
type DebounceFunction<T extends (...args: unknown[]) => unknown> = T & { cancel(): void }

// Import debounce from lodash.debounce
// Note: Using require to avoid TypeScript declaration issues with CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const debounceFn = require("lodash.debounce") as <T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number,
) => DebounceFunction<T>

export function useThrottle<T>(value: T, delay: number): T {
	const [throttledValue, setThrottledValue] = useState<T>(value)

	const debouncedSetValue = useMemo(
		() =>
			debounceFn((newValue: unknown) => {
				setThrottledValue(newValue as T)
			}, delay),
		[delay],
	)

	useEffect(() => {
		debouncedSetValue(value)
		return () => debouncedSetValue.cancel()
	}, [value, debouncedSetValue])

	return throttledValue
}
