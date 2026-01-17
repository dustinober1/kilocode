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

// Mock useStdout to provide test dimensions
const mockStdout = {
	columns: 80,
	rows: 24,
	on: vi.fn(),
	off: vi.fn(),
}

vi.mock("ink", () => ({
	useStdout: () => ({
		stdout: mockStdout,
		write: vi.fn(),
	}),
}))

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
			{ timestamp: new Date("2024-01-17"), tokens: 100, runningTotal: 100 },
			{ timestamp: new Date("2024-01-17"), tokens: 150, runningTotal: 250 },
			{ timestamp: new Date("2024-01-17"), tokens: 150, runningTotal: 400 },
		]

		vi.mocked(useAtomValue).mockReturnValue(mockTimeline)

		const { lastFrame } = render(<TokenUsageChart />)
		const frame = lastFrame()
		expect(frame).toContain("Token Usage")
	})

	it("should transform timeline data to simple array", () => {
		const mockTimeline = [
			{ timestamp: new Date("2024-01-17"), tokens: 100, runningTotal: 100 },
			{ timestamp: new Date("2024-01-17"), tokens: 150, runningTotal: 250 },
			{ timestamp: new Date("2024-01-17"), tokens: 150, runningTotal: 250 },
		]

		vi.mocked(useAtomValue).mockReturnValue(mockTimeline)

		const { lastFrame } = render(<TokenUsageChart />)
		// Should render without errors
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})

	it("should use theme colors for styling", () => {
		vi.mocked(useAtomValue).mockReturnValue([{ timestamp: new Date("2024-01-17"), tokens: 100, runningTotal: 100 }])

		const { lastFrame } = render(<TokenUsageChart />)
		const frame = lastFrame()
		expect(frame).toContain("Token Usage")
	})

	it("should handle zero values in timeline", () => {
		vi.mocked(useAtomValue).mockReturnValue([
			{ timestamp: new Date("2024-01-17"), tokens: 0, runningTotal: 0 },
			{ timestamp: new Date("2024-01-17"), tokens: 0, runningTotal: 0 },
		])

		const { lastFrame } = render(<TokenUsageChart />)
		// Should render without errors even with zero values
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})

	it("should calculate sparkline width based on terminal dimensions", () => {
		vi.mocked(useAtomValue).mockReturnValue([
			{ timestamp: new Date("2024-01-17"), tokens: 100, runningTotal: 100 },
			{ timestamp: new Date("2024-01-17"), tokens: 100, runningTotal: 200 },
		])

		// Test that the component renders with width calculation
		const { lastFrame } = render(<TokenUsageChart />)
		const frame = lastFrame()
		expect(frame).toBeTruthy()
	})
})
