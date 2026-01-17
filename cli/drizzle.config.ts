import type { Config } from "drizzle-kit"

export default {
	schema: "./src/services/analytics/schema.ts",
	out: "./src/services/analytics/migrations",
	driver: "better-sqlite",
	dbCredentials: {
		url: process.env.DATABASE_PATH || `${process.env.HOME}/.kilocode/analytics.db`,
	},
} satisfies Config
