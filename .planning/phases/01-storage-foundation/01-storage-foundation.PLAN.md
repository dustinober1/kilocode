---
phase: 01-storage-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - cli/package.json
  - cli/drizzle.config.ts
  - cli/src/services/analytics/schema.ts
  - cli/src/services/analytics/StorageService.ts
  - cli/src/services/analytics/__tests__/StorageService.test.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Database file created at ~/.kilocode/analytics.db"
    - "WAL mode enabled (journal_mode = WAL)"
    - "Data persists across CLI process restarts"
    - "1000 events insert in <50ms with batching"
    - "No 'database locked' errors with multiple CLI instances"
    - "Native bindings compiled correctly in CLI build"
  artifacts:
    - path: "cli/package.json"
      provides: "Dependencies installed"
      contains: "better-sqlite3, drizzle-orm, drizzle-kit"
    - path: "cli/drizzle.config.ts"
      provides: "Drizzle Kit configuration"
      contains: "schema, out, driver, dbCredentials"
    - path: "cli/src/services/analytics/schema.ts"
      provides: "Database schema definitions"
      exports: ["sessions", "metricEvents"]
    - path: "cli/src/services/analytics/StorageService.ts"
      provides: "Singleton database service"
      min_lines: 80
    - path: "cli/src/services/analytics/__tests__/StorageService.test.ts"
      provides: "Persistence and WAL verification"
      min_lines: 50
  key_links:
    - from: "cli/src/services/analytics/StorageService.ts"
      to: "better-sqlite3"
      via: "Database import"
      pattern: "import Database from [\"']better-sqlite3[\"']"
    - from: "cli/src/services/analytics/StorageService.ts"
      to: "drizzle-orm"
      via: "drizzle() import"
      pattern: "import \{ drizzle \} from [\"']drizzle-orm/better-sqlite3[\"']"
    - from: "cli/src/services/analytics/StorageService.ts"
      to: "~/.kilocode/analytics.db"
      via: "Database initialization"
      pattern: "new Database\\(.*\\.kilocode.*analytics\\.db"
    - from: "cli/src/services/analytics/StorageService.ts"
      to: "WAL mode"
      via: "PRAGMA configuration"
      pattern: "pragma\\([\"']journal_mode = WAL[\"']"
---

# Phase 01: Storage Foundation - Plan 01

<objective>
Establish a robust, persistent SQLite storage layer with Drizzle ORM using better-sqlite3 in WAL mode, supporting <50ms batch inserts and surviving CLI restarts.

Purpose: Foundation for all session analytics. Without this layer, no metrics can be captured or stored. This is the critical path dependency for the entire analytics feature.

Output: Working singleton StorageService with schema, migrations, and verified WAL mode persistence.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/01-storage-foundation/01-RESEARCH.md
@cli/esbuild.config.mjs
@cli/package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install SQLite dependencies</name>
  <files>cli/package.json</files>
  <action>
Run in cli directory:
```bash
cd cli && pnpm add better-sqlite3 drizzle-orm
cd cli && pnpm add -D drizzle-kit @types/better-sqlite3
```

This installs:

- better-sqlite3 (v12.6.2): Synchronous SQLite driver with native bindings
- drizzle-orm (v0.45.1): Type-safe ORM
- drizzle-kit (v0.31.8): Migration generation tool
- @types/better-sqlite3: TypeScript definitions

DO NOT install alternatives (sql.js, Prisma) - per RESEARCH.md findings.
</action>
<verify>

```bash
grep -E "better-sqlite3|drizzle-orm|drizzle-kit" cli/package.json
```

Expected: All three packages present in dependencies or devDependencies.
</verify>
<done>
Dependencies installed and visible in cli/package.json.
</done>
</task>

<task type="auto">
  <name>Task 2: Create Drizzle schema for sessions and events</name>
  <files>cli/src/services/analytics/schema.ts</files>
  <action>
Create schema.ts with Drizzle schema definitions:

```typescript
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
```

Key schema decisions from RESEARCH.md:

- Use integer({ mode: 'timestamp' }) for automatic Date/timestamp conversion (prevents timezone issues)
- Store cost as integer cents (avoid floating point precision issues)
- metadata as text JSON string (flexible for future event types)
- onDelete: cascade on sessionId (automatic cleanup when session deleted)
  </action>
  <verify>

```bash
grep -E "sessions|metricEvents|sqliteTable" cli/src/services/analytics/schema.ts
```

Expected: Both tables exported, using sqliteTable from drizzle-orm/sqlite-core.
</verify>
<done>
Schema file exists with sessions and metricEvents table definitions.
</done>
</task>

<task type="auto">
  <name>Task 3: Configure Drizzle Kit for migrations</name>
  <files>cli/drizzle.config.ts</files>
  <action>
Create drizzle.config.ts at cli/ root:

```typescript
import type { Config } from "drizzle-kit"

export default {
	schema: "./src/services/analytics/schema.ts",
	out: "./src/services/analytics/migrations",
	driver: "better-sqlite",
	dbCredentials: {
		url: process.env.DATABASE_PATH || `${process.env.HOME}/.kilocode/analytics.db`,
	},
} satisfies Config
```

This configures:

- Schema location for generating migrations
- Migration output folder
- Driver type (better-sqlite)
- Database credentials path
  </action>
  <verify>

```bash
grep -E "schema|out|driver|better-sqlite" cli/drizzle.config.ts
```

Expected: All four required fields present with correct values.
</verify>
<done>
Drizzle config file exists at cli/drizzle.config.ts with correct schema path.
</done>
</task>

<task type="auto">
  <name>Task 4: Implement singleton StorageService with WAL mode</name>
  <files>cli/src/services/analytics/StorageService.ts</files>
  <action>
Create StorageService.ts as a singleton class:

```typescript
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as schema from "./schema"
import path from "path"
import os from "os"
import fs from "fs"

class StorageService {
	private static instance: StorageService
	private db: ReturnType<typeof drizzle>
	private sqlite: Database.Database
	private eventQueue: Array<typeof schema.metricEvents.$inferInsert> = []
	private flushTimer: NodeJS.Timeout | null = null

	private constructor() {
		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")

		// Create database directory if it doesn't exist
		const dbDir = path.dirname(dbPath)
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true })
		}

		// Initialize SQLite connection
		this.sqlite = new Database(dbPath)

		// Configure WAL mode for performance and concurrency
		this.sqlite.pragma("journal_mode = WAL")
		this.sqlite.pragma("synchronous = NORMAL") // Performance boost
		this.sqlite.pragma("busy_timeout = 5000") // Wait 5s if locked
		this.sqlite.pragma("journal_size_limit = 10000000") // 10MB WAL limit

		// Initialize Drizzle ORM
		this.db = drizzle(this.sqlite, { schema })

		// Run migrations on first initialization
		this.runMigrations()

		// Setup periodic batch flushing (every 1 second)
		this.flushTimer = setInterval(() => this.flushEvents(), 1000)
	}

	public static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService()
		}
		return StorageService.instance
	}

	public getDatabase() {
		return this.db
	}

	public async insertEvent(event: typeof schema.metricEvents.$inferInsert) {
		// Add to queue for batch insertion
		this.eventQueue.push(event)

		// Flush immediately if queue is large (>100 events)
		if (this.eventQueue.length >= 100) {
			await this.flushEvents()
		}
	}

	public async insertEvents(events: Array<typeof schema.metricEvents.$inferInsert>) {
		// Add all to queue
		this.eventQueue.push(...events)

		// Flush if queue is large
		if (this.eventQueue.length >= 100) {
			await this.flushEvents()
		}
	}

	private async flushEvents() {
		if (this.eventQueue.length === 0) return

		const eventsToFlush = [...this.eventQueue]
		this.eventQueue = []

		try {
			await this.db.insert(schema.metricEvents).values(eventsToFlush)
		} catch (error) {
			console.error("Failed to flush events:", error)
			// Re-queue on failure
			this.eventQueue.unshift(...eventsToFlush)
		}
	}

	public async startSession(sessionId: string) {
		await this.db.insert(schema.sessions).values({
			id: sessionId,
			startTime: new Date(),
		})
	}

	public async endSession(sessionId: string, exitReason: string) {
		await this.db
			.update(schema.sessions)
			.set({ endTime: new Date(), exitReason })
			.where(eq(schema.sessions.id, sessionId))
	}

	private async runMigrations() {
		try {
			await migrate(this.db, {
				migrationsFolder: "./cli/src/services/analytics/migrations",
			})
		} catch (error) {
			console.error("Migration failed:", error)
			// Continue anyway - might be first run
		}
	}

	public close() {
		// Flush any remaining events
		this.flushEvents()

		// Clear timer
		if (this.flushTimer) {
			clearInterval(this.flushTimer)
			this.flushTimer = null
		}

		// Close database connection
		this.sqlite.close()
	}
}

export default StorageService
```

Key implementation details from RESEARCH.md:

- Singleton pattern (prevents multiple connections)
- WAL mode with synchronous=NORMAL (performance)
- busy_timeout=5000 (handles concurrent instance access)
- journal_size_limit=10000000 (prevents WAL file bloat)
- Batch insertion with queue (prevents main thread blocking)
- Periodic flushing every 1 second (balances latency vs throughput)
- Automatic migrations on startup (ensures schema is current)
  </action>
  <verify>

```bash
grep -E "class StorageService|getInstance|journal_mode = WAL|flushEvents|busy_timeout" cli/src/services/analytics/StorageService.ts
```

Expected: All patterns present in the file.
</verify>
<done>
StorageService class exists with singleton pattern, WAL mode, and batch insertion logic.
</done>
</task>

<task type="auto">
  <name>Task 5: Generate initial migration</name>
  <files>cli/src/services/analytics/migrations</files>
  <action>
Generate the initial migration using drizzle-kit:

```bash
cd cli && pnpm drizzle-kit generate:sqlite --config=drizzle.config.ts
```

This creates:

- cli/src/services/analytics/migrations/0001_initial.sql
- cli/src/services/analytics/migrations/meta/0001.json

The migration will create the sessions and metric_events tables with proper indexes.
</action>
<verify>

```bash
ls -la cli/src/services/analytics/migrations/*.sql 2>/dev/null && ls -la cli/src/services/analytics/migrations/meta/*.json 2>/dev/null
```

Expected: At least one .sql file and one .json file in migrations folder.
</verify>
<done>
Migration files generated in cli/src/services/analytics/migrations/.
</done>
</task>

<task type="auto">
  <name>Task 6: Test persistence and WAL mode</name>
  <files>cli/src/services/analytics/__tests__/StorageService.test.ts</files>
  <action>
Create comprehensive test for persistence and WAL verification:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import os from "os"
import StorageService from "../StorageService"
import * as schema from "../schema"

const TEST_DB_PATH = path.join(os.tmpdir(), "test-analytics.db")

describe("StorageService", () => {
	afterEach(() => {
		// Clean up test database
		try {
			if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
			if (fs.existsSync(TEST_DB_PATH + "-wal")) fs.unlinkSync(TEST_DB_PATH + "-wal")
			if (fs.existsSync(TEST_DB_PATH + "-shm")) fs.unlinkSync(TEST_DB_PATH + "-shm")
		} catch (e) {
			// Ignore cleanup errors
		}
	})

	it("should create database file at correct path", () => {
		const service = StorageService.getInstance()
		service.close()

		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")
		expect(fs.existsSync(dbPath)).toBe(true)
	})

	it("should enable WAL mode", () => {
		const service = StorageService.getInstance()

		// Check WAL mode directly
		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")
		const sqlite = new Database(dbPath)
		const result = sqlite.pragma("journal_mode", { simple: true })
		sqlite.close()

		expect(result).toBe("wal")
		service.close()
	})

	it("should persist data across restarts", async () => {
		const sessionId = "test-session-1"

		// First instance: write data
		const service1 = StorageService.getInstance()
		await service1.startSession(sessionId)
		await service1.insertEvent({
			sessionId,
			eventType: "test",
			timestamp: new Date(),
			metadata: "{}",
		})
		service1.close()

		// Second instance: read data
		const service2 = StorageService.getInstance()
		const db = service2.getDatabase()
		const sessions = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId))

		expect(sessions.length).toBe(1)
		expect(sessions[0].id).toBe(sessionId)
		service2.close()
	})

	it("should create WAL file during operation", async () => {
		const service = StorageService.getInstance()

		// Perform some writes
		await service.startSession("test-session")
		await service.insertEvent({
			sessionId: "test-session",
			eventType: "test",
			timestamp: new Date(),
			metadata: "{}",
		})

		const dbPath = path.join(os.homedir(), ".kilocode", "analytics.db")
		const walPath = dbPath + "-wal"

		// WAL file should exist
		expect(fs.existsSync(walPath)).toBe(true)

		service.close()
	})

	it("should batch insert 1000 events in <50ms", async () => {
		const service = StorageService.getInstance()
		const sessionId = "perf-test-session"

		const events = Array.from({ length: 1000 }, (_, i) => ({
			sessionId,
			eventType: "test",
			timestamp: new Date(),
			metadata: JSON.stringify({ index: i }),
		}))

		const start = Date.now()
		await service.insertEvents(events)
		const duration = Date.now() - start

		expect(duration).toBeLessThan(50)

		// Verify all events were inserted
		await service.flushEvents() // Ensure queue is flushed
		const db = service.getDatabase()
		const result = await db.select().from(schema.metricEvents).where(eq(schema.metricEvents.sessionId, sessionId))

		expect(result.length).toBe(1000)

		service.close()
	})
})
```

Run the test:

```bash
cd cli && pnpm test StorageService
```

  </action>
  <verify>
```bash
cd cli && pnpm test StorageService 2>&1 | grep -E "PASS|FAIL|Tests"
```
Expected: All tests pass (5 tests).
  </verify>
  <done>
All 5 StorageService tests pass: persistence, WAL mode, data across restarts, WAL file creation, and <50ms batch performance.
  </done>
</task>

<task type="auto">
  <name>Task 7: Verify CLI build includes native bindings</name>
  <files>cli/dist</files>
  <action>
Build the CLI and verify native bindings are properly included:

```bash
cd cli && pnpm build
cd cli && pnpm deps:install
```

The build process should:

1. Run esbuild to bundle the CLI
2. Copy post-build files (including package.json)
3. Run npm install in dist/ to install native dependencies

Then verify the node_modules in dist contains better-sqlite3:

```bash
ls -la cli/dist/node_modules/better-sqlite3
```

The native bindings (.node file) should be present.
</action>
<verify>

```bash
ls -la cli/dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>/dev/null && echo "Native bindings found" || echo "Native bindings MISSING"
```

Expected: "Native bindings found" - the .node file must exist in dist/node_modules.
</verify>
<done>
CLI builds successfully and native bindings are present in dist/node_modules.
</done>
</task>

</tasks>

<verification>
Overall phase verification:

1. Database persistence:

    ```bash
    # Start CLI, check db created
    ls -la ~/.kilocode/analytics.db
    ```

2. WAL mode verification:

    ```bash
    # Run SQLite query to check journal_mode
    sqlite3 ~/.kilocode/analytics.db "PRAGMA journal_mode;"
    # Expected output: wal
    ```

3. Migration infrastructure:

    ```bash
    ls -la cli/src/services/analytics/migrations/*.sql
    # Expected: At least 0001_initial.sql
    ```

4. Native bindings in build:

    ```bash
    ls -la cli/dist/node_modules/better-sqlite3/build/Release/*.node
    # Expected: better_sqlite3.node present
    ```

5. Performance test:
    ```bash
    cd cli && pnpm test StorageService
    # Expected: All tests pass, including <50ms batch insert test
    ```
    </verification>

<success_criteria>
Phase complete when:

- [ ] Dependencies installed (better-sqlite3, drizzle-orm, drizzle-kit)
- [ ] Schema defined (sessions and metricEvents tables)
- [ ] Drizzle config created (cli/drizzle.config.ts)
- [ ] StorageService implemented (singleton with WAL mode)
- [ ] Initial migration generated
- [ ] All 5 StorageService tests pass
- [ ] CLI build includes native bindings
- [ ] Database file created at ~/.kilocode/analytics.db
- [ ] WAL mode enabled (verified via PRAGMA query)
- [ ] 1000 events insert in <50ms
      </success_criteria>

<output>
After completion, create `.planning/phases/01-storage-foundation/01-01-SUMMARY.md`
</output>
