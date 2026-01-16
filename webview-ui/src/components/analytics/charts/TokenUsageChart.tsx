import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"
import type { DailyMetrics } from "@roo-code/types"
import { useAppTranslation } from "@/i18n/TranslationContext"

export interface TokenUsageChartProps {
    data: DailyMetrics[]
}

/**
 * Bar chart showing token usage (in/out) over time
 */
export function TokenUsageChart({ data }: TokenUsageChartProps) {
    const { t } = useAppTranslation()

    // Format date for display (show month/day)
    const formattedData = data.map((item) => ({
        ...item,
        displayDate: new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    }))

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-vscode-descriptionForeground text-sm">
                {t("analytics:noData")}
            </div>
        )
    }

    // Format large numbers
    const formatTokens = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
        return value.toString()
    }

    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vscode-panel-border)" />
                    <XAxis
                        dataKey="displayDate"
                        tick={{ fill: "var(--vscode-descriptionForeground)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--vscode-panel-border)" }}
                        tickLine={{ stroke: "var(--vscode-panel-border)" }}
                    />
                    <YAxis
                        tick={{ fill: "var(--vscode-descriptionForeground)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--vscode-panel-border)" }}
                        tickLine={{ stroke: "var(--vscode-panel-border)" }}
                        tickFormatter={formatTokens}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--vscode-editor-background)",
                            border: "1px solid var(--vscode-panel-border)",
                            borderRadius: "4px",
                            color: "var(--vscode-foreground)",
                        }}
                        formatter={(value: number, name: string) => [
                            formatTokens(value),
                            name === "tokensIn" ? t("analytics:tokensIn") : t("analytics:tokensOut"),
                        ]}
                        labelFormatter={(label) => label}
                    />
                    <Legend
                        wrapperStyle={{ color: "var(--vscode-foreground)", fontSize: 11 }}
                        formatter={(value) =>
                            value === "tokensIn" ? t("analytics:tokensIn") : t("analytics:tokensOut")
                        }
                    />
                    <Bar dataKey="tokensIn" fill="var(--vscode-charts-green)" stackId="tokens" />
                    <Bar dataKey="tokensOut" fill="var(--vscode-charts-orange)" stackId="tokens" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
