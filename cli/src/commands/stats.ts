/**
 * /stats command - Show real-time session analytics dashboard
 *
 * Provides access to the analytics dashboard showing:
 * - Real-time session metrics
 * - Token usage visualization
 * - Historical session data
 *
 * Currently shows placeholder message.
 * Full dashboard integration requires main UI.tsx modification.
 */

import { generateMessage } from "../ui/utils/messages.js"
import type { Command, CommandContext } from "./core/types.js"

export const statsCommand: Command = {
	name: "stats",
	aliases: ["dashboard", "analytics"],
	description: "Show real-time session analytics dashboard",
	usage: "/stats",
	examples: ["/stats"],
	category: "system",
	priority: 5,
	handler: async (context: CommandContext) => {
		const { addMessage } = context

		// For now, show a placeholder message
		// Full integration will require UI.tsx conditional rendering
		addMessage({
			...generateMessage(),
			type: "system",
			content:
				"📊 Analytics dashboard\n\nThis will show real-time session metrics, token usage, and session history.\n\n(Full dashboard integration coming in next iteration - requires main UI integration)",
		})
	},
}
