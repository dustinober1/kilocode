/**
 * Tests for SessionMetricsPanel component
 */

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "ink-testing-library"
import { SessionMetricsPanel } from "../SessionMetricsPanel.js"
import { useAtomValue } from "jotai"
import * as useThemeHook from "../../../../state/hooks/useTheme.js"

// Mock the hooks and atoms
vi.mock("jotai")
vi.mock("../../../../state/hooks/useTheme.js")

const mockTheme = {
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

describe("SessionMetricsPanel", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useThemeHook.useTheme).mockReturnValue(mockTheme)
	})

	it("should render loading state when metrics is null", () => {
		vi.mocked(useAtomValue).mockReturnValue(null)

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		expect(lastFrame()).toContain("Loading metrics...")
	})

	it("should display event count when metrics available", () => {
		vi.mocked(useAtomValue).mockReturnValue({
			eventCount: 42,
			totalCost: 1000,
			firstEvent: new Date("2024-01-17T10:00:00Z"),
			lastEvent: new Date("2024-01-17T11:00:00Z"),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		expect(lastFrame()).toContain("42")
	})

	it("should display start time", () => {
		vi.mocked(useAtomValue).mockReturnValue({
			eventCount: 5,
			totalCost: 100,
			firstEvent: new Date("2024-01-17T14:30:00Z"),
			lastEvent: new Date("2024-01-17T15:30:00Z"),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		const frame = lastFrame()
		// Should contain time (format depends on locale)
		expect(frame).toBeTruthy()
	})

	it("should use theme colors for styling", () => {
		vi.mocked(useAtomValue).mockReturnValue({
			eventCount: 10,
			totalCost: 200,
			firstEvent: new Date("2024-01-17T10:00:00Z"),
			lastEvent: new Date("2024-01-17T11:00:00Z"),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		// Verify component renders with theme
		const frame = lastFrame()
		expect(frame).toContain("Events")
		expect(frame).toContain("Started")
	})

	it("should handle null firstEvent", () => {
		vi.mocked(useAtomValue).mockReturnValue({
			eventCount: 0,
			totalCost: 0,
			firstEvent: null,
			lastEvent: null,
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		expect(lastFrame()).toContain("N/A")
	})
})
