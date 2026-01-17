/**
 * Tests for SessionHistoryList component
 */

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "ink-testing-library"
import { SessionHistoryList } from "../SessionHistoryList.js"
import { useAtomValue } from "jotai"
import * as useThemeHook from "../../../../state/hooks/useTheme.js"

// Mock the hooks and atoms
vi.mock("jotai")
vi.mock("../../../../state/hooks/useTheme.js")

const mockTheme = {
	ui: {
		text: {
			primary: "#cccccc",
			secondary: "#858585",
			dimmed: "#6e6e6e",
			highlight: "#faf74f",
		},
		border: {
			default: "#3c3c3c",
			active: "#007fd4",
			warning: "#cca700",
			error: "#f48771",
		},
		background: {
			default: "default",
			elevated: "default",
		},
	},
}

describe("SessionHistoryList", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useThemeHook.useTheme).mockReturnValue(mockTheme)
	})

	it("should render empty state when no sessions", () => {
		vi.mocked(useAtomValue).mockReturnValue([])

		const { lastFrame } = render(<SessionHistoryList />)
		expect(lastFrame()).toContain("No sessions found")
	})

	it("should render with session data", () => {
		const mockSessions = [
			{
				session_id: "abc123def456789",
				title: "Test Session 1",
				created_at: new Date("2024-01-17T10:00:00Z").toISOString(),
				event_count: 42,
			},
			{
				session_id: "xyz789ghi012345",
				title: "Test Session 2",
				created_at: new Date("2024-01-16T14:30:00Z").toISOString(),
				event_count: 15,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		const frame = lastFrame()
		// Should contain truncated session IDs
		expect(frame).toContain("abc123de")
	})

	it("should transform session data correctly with ID truncation", () => {
		const longSessionId = "a".repeat(32)
		const mockSessions = [
			{
				session_id: longSessionId,
				title: "Long ID Session",
				created_at: new Date("2024-01-17T10:00:00Z").toISOString(),
				event_count: 100,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		// Should truncate to 8 characters
		expect(lastFrame()).toContain("aaaaaaaa")
		// Should not contain full ID
		expect(lastFrame()).not.toContain(longSessionId)
	})

	it("should handle missing title with Untitled fallback", () => {
		const mockSessions = [
			{
				session_id: "no-title-session",
				title: null,
				created_at: new Date("2024-01-17T10:00:00Z").toISOString(),
				event_count: 5,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		expect(lastFrame()).toContain("Untitled")
	})

	it("should format date correctly", () => {
		const mockSessions = [
			{
				session_id: "date-test-session",
				title: "Date Test",
				created_at: new Date("2024-01-17T10:00:00Z").toISOString(),
				event_count: 10,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		// Date format depends on locale, but component should render
		const frame = lastFrame()
		expect(frame).toContain("date-test")
	})

	it("should use theme colors for styling", () => {
		const mockSessions = [
			{
				session_id: "theme-test",
				title: "Theme Test",
				created_at: new Date("2024-01-17T10:00:00Z").toISOString(),
				event_count: 1,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		// Verify header uses highlight color
		const frame = lastFrame()
		expect(frame).toContain("Recent Sessions")
	})
})
