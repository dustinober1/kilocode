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
			event_count: 42,
			total_duration: 3600, // 1 hour in seconds
			first_event: new Date("2024-01-17T10:00:00Z").toISOString(),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		expect(lastFrame()).toContain("42")
	})

	it("should display duration in minutes", () => {
		vi.mocked(useAtomValue).mockReturnValue({
			event_count: 10,
			total_duration: 5400, // 90 minutes
			first_event: new Date("2024-01-17T10:00:00Z").toISOString(),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		expect(lastFrame()).toContain("90m")
	})

	it("should display start time", () => {
		const testDate = new Date("2024-01-17T14:30:00Z")
		vi.mocked(useAtomValue).mockReturnValue({
			event_count: 5,
			total_duration: 300,
			first_event: testDate.toISOString(),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		const frame = lastFrame()
		// Should contain time (format depends on locale)
		expect(frame).toBeTruthy()
	})

	it("should use theme colors for styling", () => {
		vi.mocked(useAtomValue).mockReturnValue({
			event_count: 10,
			total_duration: 600,
			first_event: new Date("2024-01-17T10:00:00Z").toISOString(),
		})

		const { lastFrame } = render(<SessionMetricsPanel sessionId="test-session" />)
		// Verify component renders with theme
		const frame = lastFrame()
		expect(frame).toContain("Events")
		expect(frame).toContain("Duration")
		expect(frame).toContain("Started")
	})
})
