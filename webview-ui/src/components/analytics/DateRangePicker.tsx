import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui"
import type { DateRangePreset } from "./hooks/useAnalyticsData"
import { useAppTranslation } from "@/i18n/TranslationContext"

export interface DateRangePickerProps {
    value: DateRangePreset
    onChange: (value: DateRangePreset) => void
}

const PRESET_OPTIONS: { value: DateRangePreset; labelKey: string }[] = [
    { value: "today", labelKey: "analytics:dateRange.today" },
    { value: "7days", labelKey: "analytics:dateRange.7days" },
    { value: "30days", labelKey: "analytics:dateRange.30days" },
    { value: "90days", labelKey: "analytics:dateRange.90days" },
    { value: "allTime", labelKey: "analytics:dateRange.allTime" },
]

/**
 * Date range picker for filtering analytics data
 */
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const { t } = useAppTranslation()

    return (
        <Select value={value} onValueChange={(v) => onChange(v as DateRangePreset)}>
            <SelectTrigger className="w-[140px]">
                <SelectValue>
                    {t(`analytics:dateRange.${value}`)}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
