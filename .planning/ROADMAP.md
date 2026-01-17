# Project Roadmap: Session Analytics Dashboard

**Project:** Session Analytics Dashboard
**Status:** Planning
**Date:** 2026-01-17

## Overview

A local-first, privacy-focused analytics dashboard for the Kilo Code CLI. This feature enables users to track productivity metrics (tokens, time, tool usage) locally using SQLite, visualized via a terminal-based dashboard.

**Core Value:** Users can measure and understand their productivity gains from AI assistance.
**Key Constraints:** Non-blocking performance, strict privacy (local-only), CLI-native experience.

## Phases

### Phase 1: Storage Foundation

**Goal:** Establish a performant, schema-safe local database layer that survives CLI restarts.

**Plans:** 2 plans (Wave 1: 1 plan, Wave 2: 1 plan)

**Plan List:**

- [x] 01-01-PLAN.md — Implement singleton StorageService with WAL mode, schema, migrations, and tests
- [ ] 01-02-fix-critical-bugs.PLAN.md — Fix close() data loss bug and clarify performance test (gap closure)

- **Success Criteria:**

    - Database file creates at `~/.kilocode/analytics.db`
    - Can write 1000 events in <50ms (batched)
    - Data persists after CLI exit
    - No "database locked" errors with multiple instances
    - Native bindings compiled correctly in CLI build

- **Key Files:**

    - `cli/src/services/analytics/StorageService.ts`
    - `cli/src/services/analytics/schema.ts`
    - `cli/src/services/analytics/migrations/`

- **Risks:**
    - Blocking main thread (Mitigation: WAL mode, async batching)
    - Native binding issues with `better-sqlite3` (Mitigation: Verify build process)

---

### Phase 2: Data Collection Layer

**Goal:** Capture metrics from CLI activity without impacting user experience (latency).

- **Tasks:**

    - [ ] Implement `MetricsCollectorService` (EventEmitter)
    - [ ] Create async event queue with batch flushing logic
    - [ ] Integrate with `ExtensionService` (capture messages/tasks)
    - [ ] Integrate with `TelemetryService` (tool usage)
    - [ ] Implement PII sanitization (hash paths, filter prompts)
    - [ ] Add privacy configuration structure

- **Success Criteria:**

    - Metrics flow from CLI actions to DB automatically
    - Zero perceptible latency added to CLI commands
    - PII (like usernames in paths) is hashed/scrubbed
    - Queue flushes correctly on CLI shutdown

- **Key Files:**

    - `cli/src/services/analytics/MetricsCollectorService.ts`
    - `cli/src/services/analytics/types.ts`
    - `cli/src/cli.ts` (integration points)

- **Risks:**
    - Memory leaks from unbounded queue (Mitigation: Ring buffer/hard caps)
    - Incomplete flush on exit

---

### Phase 3: State & Aggregation

**Goal:** Transform raw DB events into reactive state for the UI.

- **Tasks:**

    - [ ] Implement efficient SQL aggregation queries in `StorageService`
    - [ ] Create Jotai atoms for `currentSessionMetrics`
    - [ ] Create atoms for `historicalSessions`
    - [ ] Implement derived atoms for rates (tokens/min, error rate)
    - [ ] Wire up `MetricsCollector` events to update atoms

- **Success Criteria:**

    - Atoms update in real-time as events occur
    - Aggregation queries take <10ms
    - Derived state calculates correctly
    - "Current session" state is accurate

- **Key Files:**

    - `cli/src/state/atoms/analytics.ts`
    - `cli/src/services/analytics/StorageService.ts` (queries)

- **Risks:**
    - Render thrashing from too many updates (Mitigation: Debounce/throttle atoms)

---

### Phase 4: Dashboard UI

**Goal:** Visualize metrics in the terminal in a beautiful, responsive way.

- **Tasks:**

    - [ ] Install `@pppp606/ink-chart`, `ink-table`
    - [ ] Build `SessionMetricsPanel` (real-time stats)
    - [ ] Build `TokenUsageChart` (ASCII bars)
    - [ ] Build `SessionHistoryList` (table view)
    - [ ] Implement `kilo stats` command
    - [ ] Implement throttled rendering hook

- **Success Criteria:**

    - `kilo stats` shows live dashboard
    - UI updates visibly without flickering
    - Resizes correctly on window change
    - Charts render accessibly

- **Key Files:**

    - `cli/src/ui/analytics/AnalyticsDashboard.tsx`
    - `cli/src/ui/analytics/components/`
    - `cli/src/commands/stats.ts`

- **Risks:**
    - Render storms (Mitigation: `useThrottle` custom hook)
    - Layout breaking on small screens

---

### Phase 5: Reports & Polish

**Goal:** Make data portable and ensure user control.

- **Tasks:**

    - [ ] Implement `ReportGenerator` service
    - [ ] Add JSON export command
    - [ ] Expose privacy configuration in user settings
    - [ ] Add `kilo stats --history` view
    - [ ] Final performance & privacy audit

- **Success Criteria:**

    - User can export data to JSON
    - User can opt-out of specific metrics
    - Full end-to-end verification

- **Key Files:**

    - `cli/src/services/analytics/ReportGenerator.ts`
    - `cli/src/commands/export.ts`

- **Risks:**
    - Privacy leaks in exports

## Milestones

- **Milestone 1 (Phases 1-2):** "Invisible Recorder" - Data is being captured safely and efficiently.
- **Milestone 2 (Phases 3-4):** "Visible Insights" - Users can see their real-time stats.
- **Milestone 3 (Phase 5):** "Full Release" - Exportable, configurable, polished.
