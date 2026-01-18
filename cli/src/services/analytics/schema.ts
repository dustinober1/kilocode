import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	startTime: integer("start_time", { mode: "timestamp" }).notNull(),
	endTime: integer("end_time", { mode: "timestamp" }),
	totalTokens: integer("total_tokens").notNull().default(0),
	totalCost: integer("total_cost").notNull().default(0), // Store as integer cents
	commandCount: integer("command_count").notNull().default(0),
	toolUsageCount: integer("tool_usage_count").notNull().default(0),
	exitReason: text("exit_reason"), // 'error', 'user_exit', 'completion'
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
})

export const metricEvents = sqliteTable("metric_events", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	sessionId: text("session_id")
		.notNull()
		.references(() => sessions.id, { onDelete: "cascade" }),
	eventType: text("event_type").notNull(), // 'tool_use', 'command', 'token_usage'
	timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
	metadata: text("metadata"), // JSON string for flexible event data
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
})
