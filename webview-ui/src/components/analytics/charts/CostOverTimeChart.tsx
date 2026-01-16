import React from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import type { DailyMetrics } from "@roo-code/types"
import { useAppTranslation } from "@/i18n/TranslationContext"

export interface CostOverTimeChartProps {
    data: DailyMetrics[]
}

/**
 * Line chart showing cost over time
 */
export function CostOverTimeChart({ data }: CostOverTimeChartProps) {
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

    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--vscode-editor-background)",
                            border: "1px solid var(--vscode-panel-border)",
                            borderRadius: "4px",
                            color: "var(--vscode-foreground)",
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, t("analytics:cost")]}
                        labelFormatter={(label) => label}
                    />
                    <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="var(--vscode-charts-blue)"
                        strokeWidth={2}
                        dot={{ fill: "var(--vscode-charts-blue)", strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
