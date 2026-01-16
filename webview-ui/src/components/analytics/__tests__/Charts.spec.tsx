import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CostOverTimeChart } from "../charts/CostOverTimeChart"
import { TokenUsageChart } from "../charts/TokenUsageChart"
import { ModeBreakdownChart } from "../charts/ModeBreakdownChart"
import { CacheEfficiencyChart } from "../charts/CacheEfficiencyChart"
import type { DailyMetrics, ModeBreakdownItem, CacheEfficiency } from "@roo-code/types"

// Mock recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    Bar: () => <div data-testid="bar" />,
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
}))

vi.mock("@/i18n/TranslationContext", () => ({
    useAppTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                "analytics:noData": "No data available",
                "analytics:cost": "Cost",
                "analytics:tokensIn": "Tokens In",
                "analytics:tokensOut": "Tokens Out",
                "analytics:cacheWrites": "Cache Writes",
                "analytics:cacheReads": "Cache Reads",
                "analytics:hitRate": "Hit Rate",
            }
            return translations[key] || key
        },
    }),
}))

describe("Chart Components", () => {
    const mockDailyData: DailyMetrics[] = [
        {
            date: "2026-01-13",
            cost: 5.0,
            tokensIn: 30000,
            tokensOut: 15000,
            sessionCount: 8,
            cacheWrites: 100,
            cacheReads: 300,
        },
        {
            date: "2026-01-14",
            cost: 6.0,
            tokensIn: 40000,
            tokensOut: 20000,
            sessionCount: 10,
            cacheWrites: 150,
            cacheReads: 450,
        },
    ]

    const mockModeData: ModeBreakdownItem[] = [
        { mode: "code", cost: 10.0, tokensIn: 70000, tokensOut: 35000, sessionCount: 15 },
        { mode: "architect", cost: 5.5, tokensIn: 30000, tokensOut: 15000, sessionCount: 10 },
    ]

    const mockCacheData: CacheEfficiency = {
        totalCacheWrites: 500,
        totalCacheReads: 1500,
        cacheHitRate: 75.0,
    }

    describe("CostOverTimeChart", () => {
        it("should render with data", () => {
            render(<CostOverTimeChart data={mockDailyData} />)
            expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
            expect(screen.getByTestId("line-chart")).toBeInTheDocument()
        })

        it("should show no data message for empty data", () => {
            render(<CostOverTimeChart data={[]} />)
            expect(screen.getByText("No data available")).toBeInTheDocument()
        })
    })

    describe("TokenUsageChart", () => {
        it("should render with data", () => {
            render(<TokenUsageChart data={mockDailyData} />)
            expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
        })

        it("should show no data message for empty data", () => {
            render(<TokenUsageChart data={[]} />)
            expect(screen.getByText("No data available")).toBeInTheDocument()
        })
    })

    describe("ModeBreakdownChart", () => {
        it("should render with data", () => {
            render(<ModeBreakdownChart data={mockModeData} />)
            expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
            expect(screen.getByTestId("pie-chart")).toBeInTheDocument()
        })

        it("should show no data message for empty data", () => {
            render(<ModeBreakdownChart data={[]} />)
            expect(screen.getByText("No data available")).toBeInTheDocument()
        })
    })

    describe("CacheEfficiencyChart", () => {
        it("should render with data", () => {
            render(<CacheEfficiencyChart data={mockCacheData} />)
            expect(screen.getByTestId("responsive-container")).toBeInTheDocument()
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument()
        })

        it("should display hit rate", () => {
            render(<CacheEfficiencyChart data={mockCacheData} />)
            expect(screen.getByText("Hit Rate:")).toBeInTheDocument()
            expect(screen.getByText("75%")).toBeInTheDocument()
        })

        it("should show no data message for zero cache values", () => {
            render(
                <CacheEfficiencyChart
                    data={{ totalCacheWrites: 0, totalCacheReads: 0, cacheHitRate: 0 }}
                />
            )
            expect(screen.getByText("No data available")).toBeInTheDocument()
        })
    })
})
