import React from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { Tab, TabContent, TabHeader } from "../common/Tab"
import { Button } from "@/components/ui"
import { StatCard } from "./StatCard"
import { DateRangePicker } from "./DateRangePicker"
import { CostOverTimeChart } from "./charts/CostOverTimeChart"
import { TokenUsageChart } from "./charts/TokenUsageChart"
import { ModeBreakdownChart } from "./charts/ModeBreakdownChart"
import { useAnalyticsData } from "./hooks/useAnalyticsData"
import BottomControls from "../kilocode/BottomControls"

export interface AnalyticsViewProps {
    onDone: () => void
}

/**
 * Main analytics dashboard view
 */
export function AnalyticsView({ onDone }: AnalyticsViewProps) {
    const { t } = useAppTranslation()
    const { summary, dateRangePreset, setDateRangePreset, hasData } = useAnalyticsData()

    // Format large numbers for display
    const formatNumber = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
        return value.toString()
    }

    return (
        <Tab>
            <TabHeader className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-vscode-foreground m-0">{t("analytics:title")}</h3>
                    <div className="flex gap-2 items-center">
                        <DateRangePicker value={dateRangePreset} onChange={setDateRangePreset} />
                        <Button onClick={onDone}>{t("analytics:done")}</Button>
                    </div>
                </div>
            </TabHeader>

            <TabContent className="px-3 py-2 overflow-y-auto">
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center h-64 text-vscode-descriptionForeground">
                        <span className="codicon codicon-graph text-4xl mb-4 opacity-50" />
                        <p className="text-center">{t("analytics:noDataMessage")}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label={t("analytics:totalCost")}
                                value={`$${summary.totalCost.toFixed(2)}`}
                                icon={<span className="codicon codicon-credit-card" />}
                            />
                            <StatCard
                                label={t("analytics:sessions")}
                                value={summary.totalSessions}
                                icon={<span className="codicon codicon-history" />}
                            />
                            <StatCard
                                label={t("analytics:tokensUsed")}
                                value={formatNumber(summary.totalTokensIn + summary.totalTokensOut)}
                                icon={<span className="codicon codicon-symbol-numeric" />}
                                description={`${formatNumber(summary.totalTokensIn)} in / ${formatNumber(summary.totalTokensOut)} out`}
                            />
                            <StatCard
                                label={t("analytics:cacheHitRate")}
                                value={`${summary.cacheEfficiency.cacheHitRate}%`}
                                icon={<span className="codicon codicon-zap" />}
                                description={`${formatNumber(summary.cacheEfficiency.totalCacheReads)} cache reads`}
                            />
                        </div>

                        {/* Cost Over Time Chart */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-vscode-foreground text-sm m-0">{t("analytics:costOverTime")}</h4>
                            <div className="bg-vscode-editor-background rounded-md border border-vscode-panel-border p-3">
                                <CostOverTimeChart data={summary.byDay} />
                            </div>
                        </div>

                        {/* Token Usage Chart */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-vscode-foreground text-sm m-0">{t("analytics:tokenUsage")}</h4>
                            <div className="bg-vscode-editor-background rounded-md border border-vscode-panel-border p-3">
                                <TokenUsageChart data={summary.byDay} />
                            </div>
                        </div>

                        {/* Mode Breakdown Chart */}
                        <div className="flex flex-col gap-2">
                            <h4 className="text-vscode-foreground text-sm m-0">{t("analytics:usageByMode")}</h4>
                            <div className="bg-vscode-editor-background rounded-md border border-vscode-panel-border p-3">
                                <ModeBreakdownChart data={summary.byMode} />
                            </div>
                        </div>

                        {/* Averages */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard
                                label={t("analytics:avgCostPerSession")}
                                value={`$${summary.averageCostPerSession.toFixed(2)}`}
                                icon={<span className="codicon codicon-pulse" />}
                            />
                            <StatCard
                                label={t("analytics:avgTokensPerSession")}
                                value={formatNumber(summary.averageTokensPerSession)}
                                icon={<span className="codicon codicon-dashboard" />}
                            />
                        </div>
                    </div>
                )}
            </TabContent>

            {/* Bottom Controls */}
            <div className="fixed bottom-0 right-0">
                <BottomControls />
            </div>
        </Tab>
    )
}
