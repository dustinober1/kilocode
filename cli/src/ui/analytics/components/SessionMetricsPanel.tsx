/**
 * SessionMetricsPanel component - displays real-time session metrics
 *
 * Shows event count and time range for the current session
 * with loading state and theme integration
 */

import React from "react"
import { Box, Text } from "ink"
import { useAtomValue } from "jotai"
import { useTheme } from "../../../state/hooks/useTheme.js"
import { sessionMetricsAtom } from "../../../state/atoms/analytics.js"

export interface SessionMetricsPanelProps {
	sessionId: string
}

/**
 * SessionMetricsPanel displays real-time metrics for the current session
 * Uses React.memo to prevent unnecessary re-renders
 */
export const SessionMetricsPanel = React.memo<SessionMetricsPanelProps>(({ sessionId: _sessionId }) => {
	const theme = useTheme()
	const metrics = useAtomValue(sessionMetricsAtom)

	if (!metrics) {
		return (
			<Box>
				<Text color={theme.ui.text.dimmed}>Loading metrics...</Text>
			</Box>
		)
	}

	const stats = [
		{ label: "Events", value: metrics.eventCount.toString() },
		{
			label: "Started",
			value: metrics.firstEvent ? new Date(metrics.firstEvent).toLocaleTimeString() : "N/A",
		},
	]

	return (
		<Box borderStyle="round" borderColor={theme.ui.border.default} paddingX={1} gap={2}>
			{stats.map((stat) => (
				<Box key={stat.label}>
					<Text color={theme.ui.text.dimmed}>{stat.label}:</Text>
					<Text color={theme.ui.text.highlight}> {stat.value}</Text>
				</Box>
			))}
		</Box>
	)
})

SessionMetricsPanel.displayName = "SessionMetricsPanel"
