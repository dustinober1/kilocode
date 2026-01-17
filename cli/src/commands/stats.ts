/**
 * /stats command - Show real-time session analytics dashboard
 *
 * Renders the AnalyticsDashboard component showing:
 * - Real-time session metrics (event count, command count, token usage, uptime)
 * - Token usage visualization (running total over session events)
 * - Historical session data (recent sessions with metadata)
 *
 * This command toggles the showDashboardAtom to switch between main UI and dashboard view.
 * When dashboard is active, it replaces the standard message interface with analytics.
 *
 * Usage:
 *   /stats         - Toggle dashboard view on
 *   /dashboard     - Alias for /stats
 *   /analytics     - Alias for /stats
 *
 * Keyboard shortcuts (alternative to command):
 *   Ctrl+S         - Toggle dashboard on/off
 *   Escape         - Exit dashboard view (when active)
 *
 * Technical details:
 * - Uses Jotai's useSetAtom to write to showDashboardAtom
 * - Requires uiStore from CommandContext for proper atom integration
 * - Dashboard component (AnalyticsDashboard) reads showDashboardAtom to conditionally render
 * - No addMessage() call needed - dashboard replaces main UI entirely
 */

import { useSetAtom } from "jotai"
import type { Command, CommandContext } from "./core/types.js"
import { showDashboardAtom } from "../state/atoms/analytics.js"

export const statsCommand: Command = {
	name: "stats",
	aliases: ["dashboard", "analytics"],
	description: "Show real-time session analytics dashboard",
	usage: "/stats",
	examples: ["/stats", "/dashboard", "/analytics"],
	category: "system",
	priority: 5,
	handler: async (context: CommandContext) => {
		const { uiStore } = context

		// Access the Jotai store from UI context
		// useSetAtom returns a setter function for the atom
		const setShowDashboard = useSetAtom(showDashboardAtom, { store: uiStore })

		// Toggle dashboard view on
		// The AnalyticsDashboard component watches showDashboardAtom and renders when true
		// UI.tsx should have conditional rendering: showDashboard ? <AnalyticsDashboard /> : <MainUI />
		setShowDashboard(true)

		// Note: Dashboard will render automatically via UI.tsx conditional rendering
		// No need to call addMessage() - dashboard replaces main UI view
		// The change to showDashboardAtom triggers a re-render in components using useAtomValue
	},
}
