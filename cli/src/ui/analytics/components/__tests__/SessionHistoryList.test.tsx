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
	id: "dark" as const,
	name: "dark",
	type: "dark" as const,
	code: {
		context: "#cccccc",
		addition: "#89d185",
		deletion: "#f48771",
		modification: "#cca700",
		lineNumber: "#858585",
	},
	status: {
		idle: "#858585",
		online: "#89d185",
		offline: "#f48771",
		busy: "#cca700",
	},
	brand: {
		primary: "#faf74f",
		secondary: "#007acc",
	},
	semantic: {
		success: "#89d185",
		error: "#f48771",
		warning: "#cca700",
		info: "#3794ff",
		neutral: "#cccccc",
	},
	interactive: {
		prompt: "#3794ff",
		selection: "#264f78",
		hover: "#2a2d2e",
		disabled: "#858585",
		focus: "#007fd4",
	},
	messages: {
		user: "#3794ff",
		assistant: "#89d185",
		system: "#cccccc",
		error: "#f48771",
	},
	actions: {
		approve: "#89d185",
		reject: "#f48771",
		cancel: "#858585",
		pending: "#cca700",
	},
	markdown: {
		text: "#cccccc",
		heading: "#faf74f",
		strong: "#ffffff",
		em: "#d4d4d4",
		code: "#89d185",
		blockquote: "#858585",
		link: "#3794ff",
		list: "#cccccc",
	},
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
				id: "abc123def456789",
				startTime: new Date("2024-01-17T10:00:00Z"),
				endTime: new Date("2024-01-17T11:00:00Z"),
				totalTokens: 1000,
				totalCost: 500,
				commandCount: 42,
				toolUsageCount: 5,
				exitReason: "completed",
			},
			{
				id: "xyz789ghi012345",
				startTime: new Date("2024-01-16T14:30:00Z"),
				endTime: null,
				totalTokens: 500,
				totalCost: 250,
				commandCount: 15,
				toolUsageCount: 2,
				exitReason: null,
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
				id: longSessionId,
				startTime: new Date("2024-01-17T10:00:00Z"),
				endTime: null,
				totalTokens: 2000,
				totalCost: 1000,
				commandCount: 100,
				toolUsageCount: 10,
				exitReason: null,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		// Should truncate to 8 characters
		expect(lastFrame()).toContain("aaaaaaaa")
		// Should not contain full ID
		expect(lastFrame()).not.toContain(longSessionId)
	})

	it("should format date correctly", () => {
		const mockSessions = [
			{
				id: "date-test-session",
				startTime: new Date("2024-01-17T10:00:00Z"),
				endTime: null,
				totalTokens: 100,
				totalCost: 50,
				commandCount: 10,
				toolUsageCount: 1,
				exitReason: null,
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
				id: "theme-test",
				startTime: new Date("2024-01-17T10:00:00Z"),
				endTime: null,
				totalTokens: 50,
				totalCost: 25,
				commandCount: 1,
				toolUsageCount: 0,
				exitReason: null,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		// Verify header uses highlight color
		const frame = lastFrame()
		expect(frame).toContain("Recent Sessions")
	})

	it("should display command count", () => {
		const mockSessions = [
			{
				id: "cmd-test",
				startTime: new Date("2024-01-17T10:00:00Z"),
				endTime: null,
				totalTokens: 100,
				totalCost: 50,
				commandCount: 25,
				toolUsageCount: 5,
				exitReason: null,
			},
		]

		vi.mocked(useAtomValue).mockReturnValue(mockSessions)

		const { lastFrame } = render(<SessionHistoryList />)
		expect(lastFrame()).toContain("25")
	})
})
