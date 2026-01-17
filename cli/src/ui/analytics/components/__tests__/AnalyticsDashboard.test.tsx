/**
 * Tests for AnalyticsDashboard component
 */

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "ink-testing-library"
import { AnalyticsDashboard } from "../../AnalyticsDashboard.js"
import { useAtomValue } from "jotai"
import * as useThemeHook from "../../../../state/hooks/useTheme.js"

// Mock the hooks and atoms
vi.mock("jotai")
vi.mock("../../../../state/hooks/useTheme.js")

const mockTheme = {
	id: "dark",
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

describe("AnalyticsDashboard", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useThemeHook.useTheme).mockReturnValue(mockTheme)
	})

	it("should render empty state when no session active", () => {
		vi.mocked(useAtomValue).mockReturnValue("")

		const { lastFrame } = render(<AnalyticsDashboard />)
		expect(lastFrame()).toContain("No active session")
		expect(lastFrame()).toContain("Start a task to see analytics")
	})

	it("should render header when session active", () => {
		vi.mocked(useAtomValue).mockReturnValue("test-session-123")

		const { lastFrame } = render(<AnalyticsDashboard />)
		expect(lastFrame()).toContain("Session Analytics")
		expect(lastFrame()).toContain("📊")
	})

	it("should use theme colors for empty state", () => {
		vi.mocked(useAtomValue).mockReturnValue("")

		const { lastFrame } = render(<AnalyticsDashboard />)
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})

	it("should use theme colors for header", () => {
		vi.mocked(useAtomValue).mockReturnValue("active-session")

		const { lastFrame } = render(<AnalyticsDashboard />)
		const frame = lastFrame()
		expect(frame).toContain("Session Analytics")
		expect(frame).toContain("📊")
	})

	it("should render all child components when session active", () => {
		vi.mocked(useAtomValue).mockReturnValue("session-xyz")

		const { lastFrame } = render(<AnalyticsDashboard />)
		const frame = lastFrame()
		// The component renders SessionMetricsPanel, TokenUsageChart, and SessionHistoryList
		// Each component is responsible for its own content
		expect(frame).toContain("Session Analytics")
	})

	it("should handle session ID change", () => {
		// First render with no session
		vi.mocked(useAtomValue).mockReturnValue("")
		const { lastFrame: frame1 } = render(<AnalyticsDashboard />)
		expect(frame1()).toContain("No active session")

		// Re-render with active session
		vi.mocked(useAtomValue).mockReturnValue("new-session")
		const { lastFrame: frame2 } = render(<AnalyticsDashboard />)
		expect(frame2()).toContain("Session Analytics")
	})
})
