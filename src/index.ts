import { AnalyticsDatabase } from "./database"
import { AnalyticsEvent } from "./types"

async function main() {
	console.log("Initializing Analytics Database...")
	const analyticsDb = new AnalyticsDatabase("analytics.db")

	try {
		// Record a single event
		console.log("Recording a single event...")
		const event1: Omit<AnalyticsEvent, "id" | "timestamp"> = {
			eventType: "user_login",
			payload: { userId: "user_123", method: "email" },
		}
		const lastId1 = await analyticsDb.recordEvent(event1)
		console.log(`Event 1 recorded with ID: ${lastId1}`)

		// Record multiple events
		console.log("Recording multiple events...")
		const events: Omit<AnalyticsEvent, "id" | "timestamp">[] = [
			{ eventType: "page_view", payload: { userId: "user_123", page: "/dashboard" } },
			{ eventType: "button_click", payload: { userId: "user_456", buttonId: "buy_now" } },
			{ eventType: "page_view", payload: { userId: "user_456", page: "/products" } },
		]
		await analyticsDb.recordEvents(events)
		console.log(`${events.length} events recorded.`)

		// Query events
		console.log("Querying all events...")
		const allEvents = await analyticsDb.queryEvents<AnalyticsEvent>("SELECT * FROM analytics_events")
		console.log("All Events:", allEvents)

		console.log("Querying user_login events...")
		const loginEvents = await analyticsDb.queryEvents<AnalyticsEvent>(
			"SELECT * FROM analytics_events WHERE eventType = ?",
			["user_login"],
		)
		console.log("Login Events:", loginEvents)

		console.log("Querying events in the last 1 minute...")
		const oneMinuteAgo = Date.now() - 60 * 1000
		const recentEvents = await analyticsDb.queryEvents<AnalyticsEvent>(
			"SELECT * FROM analytics_events WHERE timestamp >= ?",
			[oneMinuteAgo],
		)
		console.log("Recent Events:", recentEvents)
	} catch (error) {
		console.error("An error occurred:", error)
	} finally {
		console.log("Closing Analytics Database...")
		await analyticsDb.close()
		console.log("Database closed.")
	}
}

main()
