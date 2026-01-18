# Architecture Patterns: CLI Session Analytics Dashboard

**Domain:** CLI session analytics with metrics collection, storage, and visualization
**Researched:** 2026-01-17
**Confidence:** HIGH (based on existing codebase patterns + industry best practices)

## Executive Summary

The Kilo Code CLI already has a well-established architecture using Ink 6.6.0, Jotai state management, and a service-oriented design. The analytics dashboard should follow these existing patterns while adding three new layers: MetricsCollector (data capture), StorageService (SQLite persistence), and DashboardUI (visualization). This architecture emphasizes non-blocking metrics collection, local-first storage, and reactive UI updates through Jotai atoms.

## Existing Architecture Overview

Understanding the current architecture is essential for proper integration.

### Current Component Structure

```
cli/src/
├── index.ts              # CLI entry point (Commander.js)
├── cli.ts                # CLI orchestrator class
├── services/             # Service layer
│   ├── extension.ts      # ExtensionService (event-driven, EventEmitter)
│   ├── telemetry/        # TelemetryService (singleton, PostHog)
│   └── logs.ts           # Logging service
├── state/atoms/          # Jotai state management
│   ├── service.ts        # Service atoms
│   ├── effects.ts        # Side effect atoms
│   ├── extension.ts      # Extension state atoms
│   ├── ui.ts             # UI state atoms
│   └── index.ts          # Central exports
└── ui/                   # Ink React components
    ├── App.tsx           # Root component
    ├── UI.tsx            # Main UI container
    └── components/       # Reusable components
```

### Current Patterns to Follow

| Pattern            | Implementation                           | Example                       |
| ------------------ | ---------------------------------------- | ----------------------------- |
| Service Layer      | EventEmitter-based classes               | `ExtensionService`            |
| State Management   | Jotai atoms (primitive, derived, action) | `extensionServiceAtom`        |
| Effects            | Action atoms with side effects           | `initializeServiceEffectAtom` |
| Singleton Services | Static `getInstance()` pattern           | `TelemetryService`            |
| Message Flow       | Event-driven with buffering              | `messageHandlerEffectAtom`    |

## Recommended Analytics Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLI Application                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Existing     │    │ Analytics    │    │ Dashboard UI          │  │
│  │ Services     │───▶│ Collector    │───▶│ (Ink Components)     │  │
│  │              │    │ Service      │    │                       │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│         │                   │                       ▲               │
│         │                   ▼                       │               │
│         │            ┌──────────────┐               │               │
│         │            │ Storage      │               │               │
│         └───────────▶│ Service      │───────────────┘               │
│                      │ (SQLite)     │                               │
│                      └──────────────┘                               │
│                             │                                        │
│                             ▼                                        │
│                      ┌──────────────┐                               │
│                      │ Analytics    │                               │
│                      │ Atoms        │                               │
│                      │ (Jotai)      │                               │
│                      └──────────────┘                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component                   | Responsibility                                | Location                           | Communicates With                                  |
| --------------------------- | --------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| **MetricsCollectorService** | Capture metrics events, queue for storage     | `cli/src/services/analytics/`      | TelemetryService, ExtensionService, StorageService |
| **StorageService**          | SQLite operations, schema management, queries | `cli/src/services/analytics/`      | MetricsCollectorService, Analytics Atoms           |
| **Analytics Atoms**         | State management for dashboard data           | `cli/src/state/atoms/analytics.ts` | StorageService, Dashboard UI                       |
| **Dashboard Components**    | Visualize metrics in terminal                 | `cli/src/ui/analytics/`            | Analytics Atoms                                    |
| **ReportGenerator**         | Generate summary reports                      | `cli/src/services/analytics/`      | StorageService                                     |

## Detailed Component Design

### 1. MetricsCollectorService

**Purpose:** Non-blocking capture of metrics events from existing services.

**Design Pattern:** Observer pattern with async queue

```typescript
// cli/src/services/analytics/MetricsCollectorService.ts
export interface MetricEvent {
	id: string
	timestamp: number
	sessionId: string
	category: "session" | "task" | "tool" | "api" | "error"
	name: string
	value: number
	metadata?: Record<string, unknown>
}

export class MetricsCollectorService extends EventEmitter {
	private static instance: MetricsCollectorService | null = null
	private eventQueue: MetricEvent[] = []
	private flushInterval: NodeJS.Timeout | null = null
	private storageService: StorageService | null = null

	// Singleton pattern (matches TelemetryService)
	static getInstance(): MetricsCollectorService

	// Core methods
	initialize(storage: StorageService): Promise<void>

	// Non-blocking metric capture
	track(event: Omit<MetricEvent, "id" | "timestamp">): void

	// Convenience methods matching TelemetryService patterns
	trackSessionStart(sessionId: string): void
	trackSessionEnd(sessionId: string, duration: number): void
	trackTaskMetrics(taskId: string, metrics: TaskMetrics): void
	trackToolExecution(toolName: string, duration: number, success: boolean): void
	trackApiRequest(provider: string, model: string, latency: number, tokens: TokenUsage): void

	// Flush queue to storage
	private async flush(): Promise<void>

	shutdown(): Promise<void>
}
```

**Key Design Decisions:**

- **Non-blocking:** `track()` pushes to queue immediately, returns void
- **Batched writes:** Flush every 5 seconds or when queue reaches 100 events
- **Singleton:** Matches existing TelemetryService pattern
- **EventEmitter:** Allows dashboard to subscribe to real-time updates

### 2. StorageService

**Purpose:** SQLite database operations with type-safe schema.

**Design Pattern:** Repository pattern with async operations

```typescript
// cli/src/services/analytics/StorageService.ts
export class StorageService {
	private db: Database | null = null // better-sqlite3
	private dbPath: string

	constructor(options?: { dbPath?: string })

	// Lifecycle
	initialize(): Promise<void> // Creates DB, runs migrations
	close(): Promise<void>

	// Write operations (batched)
	insertEvents(events: MetricEvent[]): Promise<void>

	// Query operations (return aggregated data)
	getSessionSummary(sessionId: string): Promise<SessionSummary>
	getRecentSessions(limit: number): Promise<SessionSummary[]>
	getAggregatedMetrics(timeRange: TimeRange): Promise<AggregatedMetrics>
	getToolUsageStats(): Promise<ToolUsageStats>
	getModelUsageStats(): Promise<ModelUsageStats>

	// Maintenance
	vacuum(): Promise<void>
	getDbSize(): Promise<number>
}
```

**Schema Design:**

```sql
-- Core events table (append-only)
CREATE TABLE metric_events (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  metadata TEXT,  -- JSON

  -- Indexes for common queries
  INDEX idx_session (session_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_category_name (category, name)
);

-- Pre-aggregated session summaries (materialized for perf)
CREATE TABLE session_summaries (
  session_id TEXT PRIMARY KEY,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration_ms INTEGER,
  task_count INTEGER DEFAULT 0,
  tool_call_count INTEGER DEFAULT 0,
  api_request_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  metadata TEXT  -- JSON for extensibility
);
```

**Key Design Decisions:**

- **better-sqlite3:** Synchronous API is faster for local operations, but wrap in workers for non-blocking
- **WAL mode:** Enable Write-Ahead Logging for better concurrent read/write
- **Pre-aggregation:** Session summaries table avoids expensive queries
- **JSON metadata:** Extensibility without schema changes

### 3. Analytics Atoms

**Purpose:** Reactive state management for dashboard data.

**Design Pattern:** Jotai atoms with effect atoms for data loading

```typescript
// cli/src/state/atoms/analytics.ts
import { atom } from "jotai"

// ============================================================================
// Core Data Atoms
// ============================================================================

// Current session metrics (real-time updates)
export interface SessionMetrics {
	sessionId: string
	startTime: number
	taskCount: number
	toolCallCount: number
	apiRequestCount: number
	totalTokens: number
	errorCount: number
	lastActivity: number
}

export const currentSessionMetricsAtom = atom<SessionMetrics | null>(null)

// Historical session list
export const sessionHistoryAtom = atom<SessionSummary[]>([])

// Aggregated statistics
export const aggregatedStatsAtom = atom<AggregatedMetrics | null>(null)

// ============================================================================
// Derived Atoms (computed views)
// ============================================================================

export const tokensPerMinuteAtom = atom((get) => {
	const session = get(currentSessionMetricsAtom)
	if (!session) return 0
	const durationMinutes = (Date.now() - session.startTime) / 60000
	return durationMinutes > 0 ? session.totalTokens / durationMinutes : 0
})

export const errorRateAtom = atom((get) => {
	const session = get(currentSessionMetricsAtom)
	if (!session || session.apiRequestCount === 0) return 0
	return session.errorCount / session.apiRequestCount
})

// ============================================================================
// Action Atoms (side effects)
// ============================================================================

export const updateSessionMetricsAtom = atom(null, (get, set, update: Partial<SessionMetrics>) => {
	const current = get(currentSessionMetricsAtom)
	if (current) {
		set(currentSessionMetricsAtom, { ...current, ...update })
	}
})

export const loadSessionHistoryAtom = atom(null, async (get, set, limit: number = 10) => {
	const storage = getStorageService() // Singleton accessor
	const history = await storage.getRecentSessions(limit)
	set(sessionHistoryAtom, history)
})

// ============================================================================
// Effect Atoms (initialize on mount)
// ============================================================================

export const initializeAnalyticsEffectAtom = atom(null, async (get, set, store: { set: typeof set }) => {
	const collector = MetricsCollectorService.getInstance()

	// Subscribe to real-time metric updates
	collector.on("metric", (event: MetricEvent) => {
		// Update current session metrics based on event type
		if (event.category === "session") {
			store.set(updateSessionMetricsAtom, {
				/* derive from event */
			})
		}
	})

	// Load initial data
	await store.set(loadSessionHistoryAtom, 10)
})
```

**Key Design Decisions:**

- **Separate primitive and derived atoms:** Matches existing pattern in `extension.ts`
- **Action atoms for mutations:** Side effects contained in dedicated atoms
- **Effect atoms for initialization:** Clean lifecycle management
- **Real-time updates via EventEmitter:** Collector emits, atoms subscribe

### 4. Dashboard UI Components

**Purpose:** Terminal-based visualization using Ink.

**Component Structure:**

```
cli/src/ui/analytics/
├── AnalyticsDashboard.tsx    # Main dashboard container
├── SessionMetricsPanel.tsx   # Current session stats
├── TokenUsageChart.tsx       # ASCII bar chart for tokens
├── ToolUsageList.tsx         # Tool call breakdown
├── SessionHistoryList.tsx    # Recent sessions table
├── ErrorSummary.tsx          # Error rate indicator
└── index.ts                  # Exports
```

**Example Component:**

```tsx
// cli/src/ui/analytics/SessionMetricsPanel.tsx
import React from "react"
import { Box, Text } from "ink"
import { useAtomValue } from "jotai"
import { currentSessionMetricsAtom, tokensPerMinuteAtom, errorRateAtom } from "../../state/atoms/analytics"

export const SessionMetricsPanel: React.FC = () => {
	const metrics = useAtomValue(currentSessionMetricsAtom)
	const tokensPerMin = useAtomValue(tokensPerMinuteAtom)
	const errorRate = useAtomValue(errorRateAtom)

	if (!metrics) {
		return <Text dimColor>No active session</Text>
	}

	return (
		<Box flexDirection="column" borderStyle="round" padding={1}>
			<Text bold>Session Metrics</Text>
			<Box marginTop={1}>
				<Text>Tasks: {metrics.taskCount}</Text>
				<Text> | </Text>
				<Text>Tools: {metrics.toolCallCount}</Text>
				<Text> | </Text>
				<Text>API Calls: {metrics.apiRequestCount}</Text>
			</Box>
			<Box>
				<Text>Tokens: {metrics.totalTokens.toLocaleString()}</Text>
				<Text dimColor> ({tokensPerMin.toFixed(0)}/min)</Text>
			</Box>
			<Box>
				<Text color={errorRate > 0.1 ? "red" : "green"}>Error Rate: {(errorRate * 100).toFixed(1)}%</Text>
			</Box>
		</Box>
	)
}
```

**Key Design Decisions:**

- **Functional components with hooks:** Matches existing UI patterns
- **useAtomValue for read-only:** Fine-grained reactivity
- **Ink primitives (Box, Text):** Terminal-native rendering
- **Minimal re-renders:** Derived atoms prevent unnecessary updates

### 5. ReportGenerator

**Purpose:** Generate static reports from historical data.

```typescript
// cli/src/services/analytics/ReportGenerator.ts
export class ReportGenerator {
  constructor(private storage: StorageService);

  // Generate different report types
  generateSessionReport(sessionId: string): Promise<string>;
  generateDailyReport(date: Date): Promise<string>;
  generateWeeklyReport(weekStart: Date): Promise<string>;

  // Export formats
  exportToMarkdown(report: Report): string;
  exportToJSON(report: Report): string;
  exportToCSV(report: Report): string;
}
```

## Data Flow

### Metrics Collection Flow

```
1. User Action (command, tool use, etc.)
         │
         ▼
2. Existing Service (ExtensionService, TelemetryService)
         │ emit event
         ▼
3. MetricsCollectorService.track()
         │ push to queue (non-blocking)
         ▼
4. Queue accumulates
         │ flush interval (5s) or size threshold (100)
         ▼
5. StorageService.insertEvents()
         │ batch INSERT
         ▼
6. SQLite Database
         │
         ▼
7. Pre-aggregate to session_summaries
```

### Dashboard Update Flow

```
1. MetricsCollectorService emits 'metric' event
         │
         ▼
2. Effect atom subscriber receives event
         │
         ▼
3. Action atom updates primitive atom
         │
         ▼
4. Derived atoms recompute
         │
         ▼
5. React components re-render (via useAtomValue)
         │
         ▼
6. Ink updates terminal display
```

## Integration Points

### With ExtensionService

```typescript
// In cli/src/cli.ts, after ExtensionService initialization:

// Hook into existing message flow
this.service.on("message", (message) => {
	// Existing handling...

	// Also track in analytics
	MetricsCollectorService.getInstance().track({
		sessionId: this.sessionId,
		category: "message",
		name: message.type,
		value: 1,
		metadata: {
			/* relevant fields */
		},
	})
})
```

### With TelemetryService

```typescript
// MetricsCollectorService can wrap/extend TelemetryService tracking
// or listen to the same events independently

// Option 1: Decorator pattern
const originalTrack = telemetry.trackToolExecuted.bind(telemetry)
telemetry.trackToolExecuted = (name, duration, success, meta) => {
	originalTrack(name, duration, success, meta)
	metricsCollector.trackToolExecution(name, duration, success)
}

// Option 2: Event forwarding (preferred - less coupling)
// Have TelemetryService emit events that MetricsCollector listens to
```

### With Jotai Store

```typescript
// In cli/src/cli.ts, during initialization:

// Initialize analytics after store creation
await this.store.set(initializeAnalyticsEffectAtom, this.store)
```

## Suggested Build Order

Based on component dependencies:

### Phase 1: Storage Foundation

**Build First:** StorageService, SQLite schema, migrations

- No dependencies on other new components
- Enables testing of data persistence in isolation
- **Deliverable:** Working SQLite with events and summaries tables

### Phase 2: Metrics Collection

**Build Second:** MetricsCollectorService

- Depends on: StorageService
- Enables data capture without visualization
- **Deliverable:** Metrics flowing into database

### Phase 3: State Layer

**Build Third:** Analytics Atoms

- Depends on: StorageService (for queries), MetricsCollectorService (for events)
- Enables reactive data access without UI
- **Deliverable:** Atoms that track session metrics

### Phase 4: Dashboard UI

**Build Fourth:** Dashboard Components

- Depends on: Analytics Atoms
- Final user-facing feature
- **Deliverable:** Terminal dashboard showing real-time metrics

### Phase 5: Reports

**Build Fifth:** ReportGenerator

- Depends on: StorageService
- Optional/enhancement phase
- **Deliverable:** Export functionality

## Scalability Considerations

| Concern           | At 10 sessions | At 1K sessions     | At 10K sessions               |
| ----------------- | -------------- | ------------------ | ----------------------------- |
| Database size     | <1MB           | ~50MB              | ~500MB                        |
| Query performance | <10ms          | <100ms             | Consider pagination, archival |
| Memory usage      | Negligible     | Monitor queue size | Implement hard caps           |
| Startup time      | <50ms          | <200ms             | Lazy load history             |

## Technology Choices

| Component  | Technology       | Rationale                                        |
| ---------- | ---------------- | ------------------------------------------------ |
| Storage    | `better-sqlite3` | Synchronous API, excellent perf, native bindings |
| State      | Jotai (existing) | Already in use, fine-grained reactivity          |
| UI         | Ink (existing)   | Already in use, React paradigm                   |
| Migrations | Custom SQL files | Simple, no additional dependency                 |

## File Structure Summary

```
cli/src/
├── services/
│   └── analytics/
│       ├── index.ts                   # Exports
│       ├── MetricsCollectorService.ts
│       ├── StorageService.ts
│       ├── ReportGenerator.ts
│       ├── types.ts                   # Shared types
│       └── migrations/
│           ├── 001_initial.sql
│           └── index.ts               # Migration runner
├── state/atoms/
│   └── analytics.ts                   # All analytics atoms
└── ui/
    └── analytics/
        ├── index.ts
        ├── AnalyticsDashboard.tsx
        ├── SessionMetricsPanel.tsx
        ├── TokenUsageChart.tsx
        ├── ToolUsageList.tsx
        ├── SessionHistoryList.tsx
        └── ErrorSummary.tsx
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Blocking on Metrics

**What:** Blocking command execution while writing metrics
**Why bad:** Degrades user experience
**Instead:** Queue metrics, flush asynchronously

### Anti-Pattern 2: Polling for Dashboard Updates

**What:** setInterval to query database for changes
**Why bad:** Wasteful, laggy updates
**Instead:** Event-driven updates via MetricsCollector EventEmitter

### Anti-Pattern 3: Raw SQL in Components

**What:** Database queries inside React components
**Why bad:** Violates separation of concerns, hard to test
**Instead:** Queries in StorageService, exposed via atoms

### Anti-Pattern 4: Global Mutable State

**What:** Shared mutable objects outside Jotai
**Why bad:** Race conditions, hard to debug
**Instead:** All state through Jotai atoms

### Anti-Pattern 5: Unbounded Event Queue

**What:** No limit on metrics queue size
**Why bad:** Memory exhaustion under high load
**Instead:** Cap queue at 1000, drop oldest on overflow (with warning)

## Testing Strategy

| Layer                | Test Type | Approach                                |
| -------------------- | --------- | --------------------------------------- |
| StorageService       | Unit      | In-memory SQLite, verify CRUD           |
| MetricsCollector     | Unit      | Mock storage, verify queueing           |
| Analytics Atoms      | Unit      | Test atom updates with Jotai test utils |
| Dashboard Components | Component | ink-testing-library                     |
| Integration          | E2E       | Full flow from track() to UI update     |

## Sources

- Existing codebase analysis (HIGH confidence)
    - `/Users/dustinober/OpenSource/kilocode/cli/src/cli.ts`
    - `/Users/dustinober/OpenSource/kilocode/cli/src/services/extension.ts`
    - `/Users/dustinober/OpenSource/kilocode/cli/src/services/telemetry/TelemetryService.ts`
    - `/Users/dustinober/OpenSource/kilocode/cli/src/state/atoms/index.ts`
    - `/Users/dustinober/OpenSource/kilocode/cli/src/state/atoms/effects.ts`
- CLI analytics architecture patterns (MEDIUM confidence - WebSearch 2025)
- Jotai real-time metrics patterns (MEDIUM confidence - WebSearch)
- SQLite CLI storage patterns (MEDIUM confidence - WebSearch)
