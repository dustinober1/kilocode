/**
 * SessionHistoryList component - displays historical sessions table
 *
 * Shows recent sessions with ID, title, creation date, and event count
 * using ink-table for tabular display with custom styling
 */

import React, { useMemo } from "react"
import { Box, Text } from "ink"
import Table from "ink-table"
import { useAtomValue } from "jotai"
import { useTheme } from "../../../state/hooks/useTheme.js"
import { historicalSessionsAtom } from "../../../state/atoms/analytics.js"

/**
 * SessionHistoryList displays a table of recent sessions
 * Uses React.memo to prevent unnecessary re-renders
 * Transforms session data for display with truncated IDs and formatted dates
 */
export const SessionHistoryList = React.memo(() => {
	const theme = useTheme()
	const sessions = useAtomValue(historicalSessionsAtom)

	const tableData = useMemo(
		() =>
			sessions.map((session) => ({
				id: session.session_id.slice(0, 8),
				title: session.title || "Untitled",
				created: new Date(session.created_at).toLocaleDateString(),
				events: session.event_count.toString(),
			})),
		[sessions],
	)

	if (tableData.length === 0) {
		return (
			<Box flexDirection="column" gap={1}>
				<Text bold color={theme.ui.text.highlight}>
					Recent Sessions
				</Text>
				<Text color={theme.ui.text.dimmed}>No sessions found</Text>
			</Box>
		)
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Text bold color={theme.ui.text.highlight}>
				Recent Sessions
			</Text>
			<Table
				data={tableData}
				columns={["id", "title", "created", "events"]}
				padding={1}
				header={(props) => (
					<Text bold color={theme.ui.text.highlight}>
						{props.children}
					</Text>
				)}
				cell={(props) => <Text color={theme.ui.text.primary}>{props.children}</Text>}
			/>
		</Box>
	)
})

SessionHistoryList.displayName = "SessionHistoryList"
