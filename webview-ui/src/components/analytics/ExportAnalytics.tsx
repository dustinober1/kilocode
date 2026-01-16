import React, { useCallback } from "react"
import { Button } from "@/components/ui"
import { useAppTranslation } from "@/i18n/TranslationContext"
import type { AnalyticsSummary } from "@roo-code/types"
import { vscode } from "@/utils/vscode"

export interface ExportAnalyticsProps {
    summary: AnalyticsSummary
}

/**
 * Export analytics data to CSV or JSON
 */
export function ExportAnalytics({ summary }: ExportAnalyticsProps) {
    const { t } = useAppTranslation()

    const exportToCSV = useCallback(() => {
        const rows: string[] = []

        // Header
        rows.push("Metric,Value")

        // Summary stats
        rows.push(`Total Cost,$${summary.totalCost.toFixed(2)}`)
        rows.push(`Total Sessions,${summary.totalSessions}`)
        rows.push(`Total Tokens In,${summary.totalTokensIn}`)
        rows.push(`Total Tokens Out,${summary.totalTokensOut}`)
        rows.push(`Average Cost Per Session,$${summary.averageCostPerSession.toFixed(2)}`)
        rows.push(`Average Tokens Per Session,${summary.averageTokensPerSession}`)
        rows.push(`Cache Hit Rate,${summary.cacheEfficiency.cacheHitRate}%`)
        rows.push(`Total Cache Writes,${summary.cacheEfficiency.totalCacheWrites}`)
        rows.push(`Total Cache Reads,${summary.cacheEfficiency.totalCacheReads}`)

        rows.push("")
        rows.push("Daily Metrics")
        rows.push("Date,Cost,Tokens In,Tokens Out,Sessions")
        for (const day of summary.byDay) {
            rows.push(`${day.date},$${day.cost.toFixed(2)},${day.tokensIn},${day.tokensOut},${day.sessionCount}`)
        }

        rows.push("")
        rows.push("Mode Breakdown")
        rows.push("Mode,Cost,Tokens In,Tokens Out,Sessions")
        for (const mode of summary.byMode) {
            rows.push(`${mode.mode},$${mode.cost.toFixed(2)},${mode.tokensIn},${mode.tokensOut},${mode.sessionCount}`)
        }

        const csv = rows.join("\n")
        downloadFile(csv, "analytics-export.csv", "text/csv")
    }, [summary])

    const exportToJSON = useCallback(() => {
        const data = {
            exportedAt: new Date().toISOString(),
            dateRange: {
                start: new Date(summary.dateRange.startDate).toISOString(),
                end: new Date(summary.dateRange.endDate).toISOString(),
                preset: summary.dateRange.preset,
            },
            summary: {
                totalCost: summary.totalCost,
                totalSessions: summary.totalSessions,
                totalTokensIn: summary.totalTokensIn,
                totalTokensOut: summary.totalTokensOut,
                averageCostPerSession: summary.averageCostPerSession,
                averageTokensPerSession: summary.averageTokensPerSession,
            },
            cacheEfficiency: summary.cacheEfficiency,
            dailyMetrics: summary.byDay,
            modeBreakdown: summary.byMode,
        }

        const json = JSON.stringify(data, null, 2)
        downloadFile(json, "analytics-export.json", "application/json")
    }, [summary])

    return (
        <div className="flex gap-2">
            <Button variant="secondary" onClick={exportToCSV} className="text-xs">
                <span className="codicon codicon-file mr-1" />
                {t("analytics:exportCSV")}
            </Button>
            <Button variant="secondary" onClick={exportToJSON} className="text-xs">
                <span className="codicon codicon-json mr-1" />
                {t("analytics:exportJSON")}
            </Button>
        </div>
    )
}

/**
 * Download a file using a data URL
 */
function downloadFile(content: string, filename: string, mimeType: string) {
    // Use VSCode message to trigger download in extension context
    vscode.postMessage({
        type: "openExternal",
        url: `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`,
    })

    // Also try the browser download approach for webview
    try {
        const blob = new Blob([content], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch {
        // Fallback handled by VSCode message
    }
}
