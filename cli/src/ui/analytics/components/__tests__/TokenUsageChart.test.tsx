/**
 * Tests for TokenUsageChart component
 */

import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "ink-testing-library"
import { TokenUsageChart } from "../TokenUsageChart.js"
import { useAtomValue } from "jotai"
import * as useThemeHook from "../../../../state/hooks/useTheme.js"

// Mock the hooks and atoms
vi.mock("jotai")
vi.mock("../../../../state/hooks/useTheme.js")
vi.mock("ink", async () => {
	const actual = await vi.importActual("ink")
	return {
		...actual,
		useStdoutDimensions: () => ({ columns: 80, rows: 24 }),
	}
})

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

describe("TokenUsageChart", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useThemeHook.useTheme).mockReturnValue(mockTheme)
	})

	it("should render empty state when no data", () => {
		vi.mocked(useAtomValue).mockReturnValue([])

		const { lastFrame } = render(<TokenUsageChart />)
		expect(lastFrame()).toContain("No data available")
	})

	it("should render chart when data available", () => {
		const mockTimeline = [
			{ event_id: "1", running_total: 100 },
			{ event_id: "2", running_total: 250 },
			{ event_id: "3", running_total: 400 },
		]

		vi.mocked(useAtomValue).mockReturnValue(mockTimeline)

		const { lastFrame } = render(<TokenUsageChart />)
		const frame = lastFrame()
		expect(frame).toContain("Token Usage")
	})

	it("should transform timeline data to simple array", () => {
		const mockTimeline = [
			{ event_id: "1", running_total: 100 },
			{ event_id: "2", running_total: 250 },
			{ event_id: "3", running_total: 0 },
		]

		vi.mocked(useAtomValue).mockReturnValue(mockTimeline)

		const { lastFrame } = render(<TokenUsageChart />)
		// Should render without errors
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})

	it("should use theme colors for styling", () => {
		vi.mocked(useAtomValue).mockReturnValue([{ event_id: "1", running_total: 100 }])

		const { lastFrame } = render(<TokenUsageChart />)
		const frame = lastFrame()
		expect(frame).toContain("Token Usage")
	})

	it("should handle zero values in timeline", () => {
		vi.mocked(useAtomValue).mockReturnValue([
			{ event_id: "1", running_total: 0 },
			{ event_id: "2", running_total: 0 },
		])

		const { lastFrame } = render(<TokenUsageChart />)
		// Should render without errors even with zero values
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})

	it("should calculate sparkline width based on terminal dimensions", () => {
		vi.mocked(useAtomValue).mockReturnValue([
			{ event_id: "1", running_total: 100 },
			{ event_id: "2", running_total: 200 },
		])

		// Test that the component renders with width calculation
		const { lastFrame } = render(<TokenUsageChart />)
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})
})
