import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatCard } from "../StatCard"

describe("StatCard", () => {
    it("should render with label and value", () => {
        render(<StatCard label="Total Cost" value="$10.50" />)

        expect(screen.getByText("Total Cost")).toBeInTheDocument()
        expect(screen.getByText("$10.50")).toBeInTheDocument()
    })

    it("should render with icon when provided", () => {
        render(
            <StatCard
                label="Sessions"
                value={42}
                icon={<span data-testid="test-icon" className="codicon codicon-history" />}
            />
        )

        expect(screen.getByTestId("test-icon")).toBeInTheDocument()
        expect(screen.getByText("Sessions")).toBeInTheDocument()
        expect(screen.getByText("42")).toBeInTheDocument()
    })

    it("should render description when provided", () => {
        render(
            <StatCard
                label="Tokens Used"
                value="1.5M"
                description="500K in / 1M out"
            />
        )

        expect(screen.getByText("Tokens Used")).toBeInTheDocument()
        expect(screen.getByText("1.5M")).toBeInTheDocument()
        expect(screen.getByText("500K in / 1M out")).toBeInTheDocument()
    })

    it("should apply custom className", () => {
        const { container } = render(
            <StatCard label="Test" value="123" className="custom-class" />
        )

        // The outer div should have the custom class
        expect(container.firstChild).toHaveClass("custom-class")
    })

    it("should render numeric values correctly", () => {
        render(<StatCard label="Count" value={1000} />)

        expect(screen.getByText("1000")).toBeInTheDocument()
    })
})
