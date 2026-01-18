/**
 * AnalyticsDashboard - Main container for session analytics visualization
 *
 * Orchestrates all analytics components:
 * - SessionMetricsPanel: Real-time session metrics
 * - TokenUsageChart: Token usage sparkline
 * - SessionHistoryList: Historical sessions table
 *
 * Shows empty state when no active session exists
 */

import React from "react"
import { Box, Text } from "ink"
import { useAtomValue } from "jotai"
import { useTheme } from "../../state/hooks/useTheme.js"
import { SessionMetricsPanel } from "./components/SessionMetricsPanel.js"
import { TokenUsageChart } from "./components/TokenUsageChart.js"
import { SessionHistoryList } from "./components/SessionHistoryList.js"
import { currentSessionIdAtom } from "../../state/atoms/analytics.js"

/**
 * AnalyticsDashboard is the main container for all analytics visualization
 * Displays empty state when no session is active, otherwise shows all components
 */
export const AnalyticsDashboard: React.FC = () => {
	const theme = useTheme()
	const sessionId = useAtomValue(currentSessionIdAtom)

	if (!sessionId) {
		return (
			<Box borderStyle="round" borderColor={theme.ui.border.default} paddingX={1} paddingY={1}>
				<Text color={theme.ui.text.dimmed}>No active session. Start a task to see analytics.</Text>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" gap={1}>
			{/* Header */}
			<Box borderStyle="double" borderColor={theme.ui.border.default} paddingX={1}>
				<Text bold color={theme.ui.text.highlight}>
					📊 Session Analytics
				</Text>
			</Box>

			{/* Real-time metrics panel */}
			<SessionMetricsPanel sessionId={sessionId} />

			{/* Token usage chart */}
			<TokenUsageChart />

			{/* Session history table */}
			<SessionHistoryList />
		</Box>
	)
}
