import React from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts"
import type { CacheEfficiency } from "@roo-code/types"
import { useAppTranslation } from "@/i18n/TranslationContext"

export interface CacheEfficiencyChartProps {
    data: CacheEfficiency
}

/**
 * Bar chart showing cache writes vs reads and hit rate
 */
export function CacheEfficiencyChart({ data }: CacheEfficiencyChartProps) {
    const { t } = useAppTranslation()

    const chartData = [
        {
            name: t("analytics:cacheWrites"),
            value: data.totalCacheWrites,
            fill: "var(--vscode-charts-orange)",
        },
        {
            name: t("analytics:cacheReads"),
            value: data.totalCacheReads,
            fill: "var(--vscode-charts-green)",
        },
    ]

    // Format large numbers
    const formatNumber = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
        return value.toString()
    }

    if (data.totalCacheWrites === 0 && data.totalCacheReads === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-vscode-descriptionForeground text-sm">
                {t("analytics:noData")}
            </div>
        )
    }

    return (
        <div className="h-[200px] w-full">
            <div className="text-center text-vscode-descriptionForeground text-xs mb-2">
                {t("analytics:hitRate")}: <span className="text-vscode-foreground font-medium">{data.cacheHitRate}%</span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--vscode-panel-border)" />
                    <XAxis
                        type="number"
                        tick={{ fill: "var(--vscode-descriptionForeground)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--vscode-panel-border)" }}
                        tickLine={{ stroke: "var(--vscode-panel-border)" }}
                        tickFormatter={formatNumber}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: "var(--vscode-descriptionForeground)", fontSize: 10 }}
                        axisLine={{ stroke: "var(--vscode-panel-border)" }}
                        tickLine={{ stroke: "var(--vscode-panel-border)" }}
                        width={70}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--vscode-editor-background)",
                            border: "1px solid var(--vscode-panel-border)",
                            borderRadius: "4px",
                            color: "var(--vscode-foreground)",
                        }}
                        formatter={(value: number) => [formatNumber(value), ""]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
