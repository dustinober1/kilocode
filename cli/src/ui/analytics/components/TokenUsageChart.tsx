/**
 * TokenUsageChart component - displays token usage sparkline
 *
 * Shows running total of tokens used over time with throttled updates
 * and terminal resize handling to prevent flickering
 */

import React, { useMemo, useState, useEffect } from "react"
import { Box, Text, useStdout } from "ink"
import { Sparkline } from "@pppp606/ink-chart"
import { useAtomValue } from "jotai"
import { useTheme } from "../../../state/hooks/useTheme.js"
import { tokenUsageTimelineAtom } from "../../../state/atoms/analytics.js"
import { useThrottle } from "../hooks/useThrottle.js"

/**
 * TokenUsageChart displays a sparkline visualization of token usage
 * Uses React.memo to prevent unnecessary re-renders
 * Throttles updates to prevent flickering from high-frequency atom updates
 * Handles terminal resize events via useStdout hook
 */
export const TokenUsageChart = React.memo(() => {
	const theme = useTheme()
	const tokenTimeline = useAtomValue(tokenUsageTimelineAtom)
	const { stdout } = useStdout()
	const [terminalWidth, setTerminalWidth] = useState(stdout.columns || 80)

	// Handle terminal resize
	useEffect(() => {
		const handleResize = () => setTerminalWidth(stdout.columns || 80)
		stdout.on("resize", handleResize)
		return () => {
			stdout.off("resize", handleResize)
		}
	}, [stdout])

	// Transform timeline data to simple array for sparkline
	const tokenValues = useMemo(() => tokenTimeline.map((point) => point.runningTotal || 0), [tokenTimeline])

	// Throttle updates to prevent flickering (150ms delay)
	const throttledValues = useThrottle(tokenValues, 150)

	// Calculate sparkline width based on terminal width (responsive)
	// Reserve space for borders and padding: typically 4-6 chars
	const sparklineWidth = useMemo(() => {
		const availableWidth = Math.max(terminalWidth - 10, 20) // Min 20 chars
		return availableWidth
	}, [terminalWidth])

	if (throttledValues.length === 0) {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold color={theme.ui.text.highlight}>
					Token Usage (Running Total)
				</Text>
				<Text color={theme.ui.text.dimmed}>No data available</Text>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold color={theme.ui.text.highlight}>
				Token Usage (Running Total)
			</Text>
			<Box borderStyle="round" borderColor={theme.ui.border.default} paddingX={1}>
				<Sparkline data={throttledValues} width={sparklineWidth} height={1} colorScheme="blue" mode="braille" />
			</Box>
		</Box>
	)
})

TokenUsageChart.displayName = "TokenUsageChart"
