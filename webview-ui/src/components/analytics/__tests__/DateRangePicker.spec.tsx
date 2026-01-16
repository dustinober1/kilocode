import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { DateRangePicker } from "../DateRangePicker"

// Mock the translation hook
vi.mock("@/i18n/TranslationContext", () => ({
    useAppTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                "analytics:dateRange.today": "Today",
                "analytics:dateRange.7days": "Last 7 Days",
                "analytics:dateRange.30days": "Last 30 Days",
                "analytics:dateRange.90days": "Last 90 Days",
                "analytics:dateRange.allTime": "All Time",
            }
            return translations[key] || key
        },
    }),
}))

describe("DateRangePicker", () => {
    const mockOnChange = vi.fn()

    beforeEach(() => {
        mockOnChange.mockClear()
    })

    it("should render with current value displayed", () => {
        render(<DateRangePicker value="30days" onChange={mockOnChange} />)

        expect(screen.getByText("Last 30 Days")).toBeInTheDocument()
    })

    it("should display 'Today' when value is today", () => {
        render(<DateRangePicker value="today" onChange={mockOnChange} />)

        expect(screen.getByText("Today")).toBeInTheDocument()
    })

    it("should display 'All Time' when value is allTime", () => {
        render(<DateRangePicker value="allTime" onChange={mockOnChange} />)

        expect(screen.getByText("All Time")).toBeInTheDocument()
    })
})
