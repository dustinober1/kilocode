import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// All mocks must be hoisted and not reference external variables
vi.mock("@/i18n/TranslationContext", () => ({
    useAppTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                "analytics:exportCSV": "Export CSV",
                "analytics:exportJSON": "Export JSON",
            }
            return translations[key] || key
        },
    }),
}))

// Mock vscode postMessage
vi.mock("@/utils/vscode", () => ({
    vscode: {
        postMessage: vi.fn(),
    },
}))

// Import after mocks
import { ExportAnalytics } from "../ExportAnalytics"
import type { AnalyticsSummary } from "@roo-code/types"
import { vscode } from "@/utils/vscode"

describe("ExportAnalytics", () => {
    const mockSummary: AnalyticsSummary = {
        totalCost: 15.5,
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
            { mode: "code", cost: 10.0, tokensIn: 70000, tokensOut: 35000, sessionCount: 15 },
            { mode: "architect", cost: 5.5, tokensIn: 30000, tokensOut: 15000, sessionCount: 10 },
        ],
        byDay: [
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
        ],
        dateRange: { startDate: 0, endDate: Date.now(), preset: "30days" },
    }

    beforeEach(() => {
        vi.clearAllMocks()
        // Mock Blob constructor
        global.Blob = vi.fn((content, options) => ({
            content,
            options,
            size: 100,
            type: options?.type || "",
        })) as unknown as typeof Blob

        // Mock URL methods
        global.URL.createObjectURL = vi.fn(() => "blob:test-url")
        global.URL.revokeObjectURL = vi.fn()
    })

    it("should render export buttons", () => {
        render(<ExportAnalytics summary={mockSummary} />)

        expect(screen.getByText("Export CSV")).toBeInTheDocument()
        expect(screen.getByText("Export JSON")).toBeInTheDocument()
    })

    it("should call postMessage when CSV button is clicked", () => {
        render(<ExportAnalytics summary={mockSummary} />)

        const csvButton = screen.getByText("Export CSV")
        fireEvent.click(csvButton)

        // The postMessage should be called with openExternal type
        expect(vscode.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "openExternal",
            })
        )
    })

    it("should call postMessage when JSON button is clicked", () => {
        render(<ExportAnalytics summary={mockSummary} />)

        const jsonButton = screen.getByText("Export JSON")
        fireEvent.click(jsonButton)

        // The postMessage should be called with openExternal type
        expect(vscode.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "openExternal",
            })
        )
    })
})
