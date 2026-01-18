/**
 * /export command - Export analytics data to JSON file
 *
 * Provides a way for users to export their analytics data to a portable JSON format.
 * This enables data backup, analysis in external tools, or migration to other systems.
 *
 * Usage:
 *   /export                              - Export to default location
 *   /export --output ~/backup.json       - Export to custom path
 *   /export -o ~/analytics.json          - Export with short option
 *   /download                            - Alias for /export
 *   /backup                              - Alias for /export
 *
 * Features:
 * - Default output: ~/kilocode-analytics-export.json
 * - Custom path via --output option
 * - Success message with file path and size
 * - Session count in success message
 * - Graceful error handling with user-friendly messages
 *
 * Technical details:
 * - Uses ReportGenerator.getInstance() for export methods
 * - Calls generateFullExport() to get complete analytics data
 * - Calls exportToJsonFile() to write to filesystem
 * - Shows success/error via context.addMessage()
 * - Does NOT throw - handles errors gracefully
 */

import * as os from "os"
import * as path from "path"
import type { Command, CommandContext } from "./core/types.js"
import ReportGenerator from "../services/analytics/ReportGenerator.js"

export const exportCommand: Command = {
	name: "export",
	aliases: ["download", "backup"],
	description: "Export analytics data to JSON file",
	usage: "/export [--output <path>]",
	examples: ["/export", "/export --output ~/backup.json", "/download", "/backup"],
	category: "system",
	priority: 5,
	options: [
		{
			name: "output",
			alias: "o",
			description: "Output file path for export",
			type: "string",
			default: path.join(os.homedir(), "kilocode-analytics-export.json"),
		},
	],
	handler: async (context: CommandContext) => {
		try {
			// Get output path from options or use default
			const outputPath =
				(context.options.output as string) ?? path.join(os.homedir(), "kilocode-analytics-export.json")

			// Get ReportGenerator instance and generate export
			const reportGenerator = ReportGenerator.getInstance()
			const exportData = await reportGenerator.generateFullExport()

			// Write to file system (exportToJsonFile handles the data generation internally)
			await reportGenerator.exportToJsonFile(outputPath)

			// Calculate file size in human-readable format
			const fileStats = await import("fs/promises").then((fs) => fs.stat(outputPath))
			const fileSize = fileStats.size
			let fileSizeHuman: string

			if (fileSize < 1024) {
				fileSizeHuman = `${fileSize} B`
			} else if (fileSize < 1024 * 1024) {
				fileSizeHuman = `${(fileSize / 1024).toFixed(1)} KB`
			} else {
				fileSizeHuman = `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
			}

			// Get session count
			const sessionCount = exportData.sessions.length

			// Show success message
			context.addMessage({
				id: Date.now().toString(),
				type: "system",
				ts: Date.now(),
				content: `✅ Export complete: ${outputPath}\n📊 ${sessionCount} session${sessionCount !== 1 ? "s" : ""} exported • ${fileSizeHuman}`,
			})
		} catch (error) {
			// Handle errors gracefully with user-friendly message
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			context.addMessage({
				id: Date.now().toString(),
				type: "error",
				ts: Date.now(),
				content: `❌ Export failed: ${errorMessage}`,
			})
		}
	},
}
