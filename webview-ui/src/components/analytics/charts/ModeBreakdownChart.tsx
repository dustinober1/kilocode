import React from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { ModeBreakdownItem } from "@roo-code/types"
import { useAppTranslation } from "@/i18n/TranslationContext"

export interface ModeBreakdownChartProps {
    data: ModeBreakdownItem[]
}

// Chart colors that work in both light and dark themes
const COLORS = [
    "var(--vscode-charts-blue)",
    "var(--vscode-charts-green)",
    "var(--vscode-charts-yellow)",
    "var(--vscode-charts-orange)",
    "var(--vscode-charts-purple)",
    "var(--vscode-charts-red)",
]

/**
 * Pie chart showing usage breakdown by mode
 */
export function ModeBreakdownChart({ data }: ModeBreakdownChartProps) {
    const { t } = useAppTranslation()

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-vscode-descriptionForeground text-sm">
                {t("analytics:noData")}
            </div>
        )
    }

    // Prepare data with colors
    const chartData = data.map((item, index) => ({
        ...item,
        displayName: item.mode.charAt(0).toUpperCase() + item.mode.slice(1),
        fill: COLORS[index % COLORS.length],
    }))

    return (
        <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="cost"
                        nameKey="displayName"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--vscode-editor-background)",
                            border: "1px solid var(--vscode-panel-border)",
                            borderRadius: "4px",
                            color: "var(--vscode-foreground)",
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, t("analytics:cost")]}
                    />
                    <Legend
                        wrapperStyle={{ color: "var(--vscode-foreground)", fontSize: 11 }}
                        layout="horizontal"
                        verticalAlign="bottom"
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
