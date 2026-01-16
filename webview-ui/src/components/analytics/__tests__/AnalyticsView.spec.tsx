import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AnalyticsView } from "../AnalyticsView"
import type { AnalyticsSummary } from "@roo-code/types"

// Mock the ExtensionStateContext
vi.mock("@/context/ExtensionStateContext", () => ({
    useExtensionState: () => ({
        taskHistoryVersion: 1,
        renderContext: "sidebar",
    }),
}))

// Mock the hooks and components
vi.mock("../hooks/useAnalyticsData", () => ({
    useAnalyticsData: vi.fn(() => ({
        summary: {
            totalCost: 15.50,
            totalTokensIn: 100000,
            totalTokensOut: 50000,
            totalSessions: 25,
            averageCostPerSession: 0.62,
            averageTokensPerSession: 6000,
            cacheEfficiency: {
                totalCacheWrites: 5000,
                totalCacheReads: 15000,
                cacheHitRate: 75.0,
            },
            byMode: [
                { mode: "code", cost: 10.00, tokensIn: 70000, tokensOut: 35000, sessionCount: 15 },
                { mode: "architect", cost: 5.50, tokensIn: 30000, tokensOut: 15000, sessionCount: 10 },
            ],
            byDay: [
                { date: "2026-01-13", cost: 5.00, tokensIn: 30000, tokensOut: 15000, sessionCount: 8 },
                { date: "2026-01-14", cost: 6.00, tokensIn: 40000, tokensOut: 20000, sessionCount: 10 },
                { date: "2026-01-15", cost: 4.50, tokensIn: 30000, tokensOut: 15000, sessionCount: 7 },
            ],
            dateRange: { startDate: 0, endDate: Date.now(), preset: "30days" },
        } as AnalyticsSummary,
        dateRangePreset: "30days",
        setDateRangePreset: vi.fn(),
        isLoading: false,
        hasData: true,
    })),
}))

vi.mock("@/i18n/TranslationContext", () => ({
    useAppTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                "analytics:title": "Analytics",
                "analytics:done": "Done",
                "analytics:totalCost": "Total Cost",
                "analytics:sessions": "Sessions",
                "analytics:tokensUsed": "Tokens Used",
                "analytics:cacheHitRate": "Cache Hit Rate",
                "analytics:costOverTime": "Cost Over Time",
                "analytics:tokenUsage": "Token Usage",
                "analytics:usageByMode": "Usage by Mode",
                "analytics:avgCostPerSession": "Avg Cost / Session",
                "analytics:avgTokensPerSession": "Avg Tokens / Session",
                "analytics:noData": "No data available",
                "analytics:noDataMessage": "Start using Kilo to see your usage analytics here.",
                "analytics:dateRange.30days": "Last 30 Days",
            }
            return translations[key] || key
        },
    }),
}))

vi.mock("../charts/CostOverTimeChart", () => ({
    CostOverTimeChart: () => <div data-testid="cost-chart">Cost Chart</div>,
}))

vi.mock("../charts/TokenUsageChart", () => ({
    TokenUsageChart: () => <div data-testid="token-chart">Token Chart</div>,
}))

vi.mock("../charts/ModeBreakdownChart", () => ({
    ModeBreakdownChart: () => <div data-testid="mode-chart">Mode Chart</div>,
}))

vi.mock("../../kilocode/BottomControls", () => ({
    default: () => <div data-testid="bottom-controls">Bottom Controls</div>,
}))

// Mock the Tab components that use ExtensionStateContext
vi.mock("../../common/Tab", () => ({
    Tab: ({ children }: { children: React.ReactNode }) => <div data-testid="tab">{children}</div>,
    TabHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="tab-header" className={className}>{children}</div>
    ),
    TabContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="tab-content" className={className}>{children}</div>
    ),
}))

describe("AnalyticsView", () => {
    const mockOnDone = vi.fn()

    it("should render the analytics title", () => {
        render(<AnalyticsView onDone={mockOnDone} />)

        expect(screen.getByText("Analytics")).toBeInTheDocument()
    })

    it("should render the Done button", () => {
        render(<AnalyticsView onDone={mockOnDone} />)

        expect(screen.getByText("Done")).toBeInTheDocument()
    })

    it("should render stat cards with correct values", () => {
        render(<AnalyticsView onDone={mockOnDone} />)

        // Check stat cards are rendered
        expect(screen.getByText("Total Cost")).toBeInTheDocument()
        expect(screen.getByText("$15.50")).toBeInTheDocument()
        expect(screen.getByText("Sessions")).toBeInTheDocument()
        expect(screen.getByText("25")).toBeInTheDocument()
        expect(screen.getByText("Tokens Used")).toBeInTheDocument()
        expect(screen.getByText("Cache Hit Rate")).toBeInTheDocument()
        expect(screen.getAllByText("75%").length).toBeGreaterThan(0)
    })

    it("should render all chart sections", () => {
        render(<AnalyticsView onDone={mockOnDone} />)

        expect(screen.getByText("Cost Over Time")).toBeInTheDocument()
        expect(screen.getByText("Token Usage")).toBeInTheDocument()
        expect(screen.getByText("Usage by Mode")).toBeInTheDocument()
    })

    it("should render the mocked charts", () => {
        render(<AnalyticsView onDone={mockOnDone} />)

        expect(screen.getByTestId("cost-chart")).toBeInTheDocument()
        expect(screen.getByTestId("token-chart")).toBeInTheDocument()
        expect(screen.getByTestId("mode-chart")).toBeInTheDocument()
    })

    it("should render average stats", () => {
        render(<AnalyticsView onDone={mockOnDone} />)

        expect(screen.getByText("Avg Cost / Session")).toBeInTheDocument()
        expect(screen.getByText("$0.62")).toBeInTheDocument()
        expect(screen.getByText("Avg Tokens / Session")).toBeInTheDocument()
    })
})
