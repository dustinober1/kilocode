import React from "react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
    label: string
    value: string | number
    icon?: React.ReactNode
    className?: string
    description?: string
}

/**
 * Reusable stat card component for displaying metrics
 */
export function StatCard({ label, value, icon, className, description }: StatCardProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-1 p-3 rounded-md bg-vscode-editor-background border border-vscode-panel-border",
                className
            )}
        >
            <div className="flex items-center gap-2 text-vscode-descriptionForeground text-xs">
                {icon && <span className="opacity-70">{icon}</span>}
                <span>{label}</span>
            </div>
            <div className="text-vscode-foreground text-xl font-medium">{value}</div>
            {description && (
                <div className="text-vscode-descriptionForeground text-xs">{description}</div>
            )}
        </div>
    )
}
