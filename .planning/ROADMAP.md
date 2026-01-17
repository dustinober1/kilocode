# Project Roadmap: Session Analytics Dashboard

**Project:** Session Analytics Dashboard
**Status:** In Progress (Phases 1-4 Complete, Phase 5 Planned)
**Date:** 2026-01-17

## Overview

A local-first, privacy-focused analytics dashboard for the Kilo Code CLI. This feature enables users to track productivity metrics (tokens, time, tool usage) locally using SQLite, visualized via a terminal-based dashboard.

**Core Value:** Users can measure and understand their productivity gains from AI assistance.
**Key Constraints:** Non-blocking performance, strict privacy (local-only), CLI-native experience.

## Phases

### Phase 1: Storage Foundation ✓

**Goal:** Establish a performant, schema-safe local database layer that survives CLI restarts.

**Plans:** 2 plans (Wave 1: 1 plan, Wave 2: 1 plan)

**Plan List:**

- [x] 01-01-PLAN.md — Implement singleton StorageService with WAL mode, schema, migrations, and tests
- [x] 01-02-fix-critical-bugs.PLAN.md — Fix close() data loss bug and clarify performance test (gap closure)

**Success Criteria:**

- Database file creates at `~/.kilocode/analytics.db`
- Can write 1000 events in <50ms (batched)
- Data persists after CLI exit
- No "database locked" errors with multiple instances
- Native bindings compiled correctly in CLI build

**Key Files:**

- `cli/src/services/analytics/StorageService.ts`
- `cli/src/services/analytics/schema.ts`
- `cli/src/services/analytics/migrations/`

**Risks:**

- Blocking main thread (Mitigation: WAL mode, async batching)
- Native binding issues with `better-sqlite3` (Mitigation: Verify build process)

---

### Phase 2: Data Collection Layer ✓

**Goal:** Capture metrics from CLI activity without impacting user experience (latency).

**Plans:** 3 plans (Wave 1: 1 plan, Wave 2: 1 plan, Wave 3: 1 plan)

**Plan List:**

- [x] 02-02-PLAN.md — Implement EventQueue ring buffer to prevent memory leaks
- [x] 02-01-PLAN.md — Build MetricsCollectorService with EventEmitter, types, PII sanitization, and privacy config
- [x] 02-03-PLAN.md — Integrate with ExtensionService/TelemetryService and wire up session tracking

**Success Criteria:**

- Metrics flow from CLI actions to DB automatically
- Zero perceptible latency added to CLI commands
- PII (like usernames in paths) is hashed/scrubbed
- Queue flushes correctly on CLI shutdown

**Key Files:**

- `cli/src/services/analytics/MetricsCollectorService.ts`
- `cli/src/services/analytics/types.ts`
- `cli/src/services/analytics/sanitization/PIISanitizer.ts`
- `cli/src/services/analytics/queue/EventQueue.ts`
- `cli/src/services/analytics/privacy/PrivacyConfig.ts`
- `cli/src/cli.ts` (integration points)

**Risks:**

- Memory leaks from unbounded queue (Mitigation: Ring buffer with 1000-event cap)
- Incomplete flush on exit (Mitigation: Graceful shutdown handlers)

---

### Phase 3: State & Aggregation ✓

**Goal:** Transform raw DB events into reactive state for the UI.

**Plans:** 3 plans (Wave 1: 1 plan, Wave 2: 1 plan, Wave 3: 1 plan)

**Plan List:**

- [x] 03-01-PLAN.md — Build AggregationService with SQL window functions and QueryCache
- [x] 03-02-PLAN.md — Create Jotai atoms for reactive analytics state
- [x] 03-03-PLAN.md — Wire MetricsCollector events to trigger atom updates

**Success Criteria:**

- Atoms update in real-time as events occur
- Aggregation queries take <10ms
- Derived state calculates correctly
- "Current session" state is accurate

**Key Files:**

- `cli/src/services/analytics/AggregationService.ts`
- `cli/src/services/analytics/QueryCache.ts`
- `cli/src/state/atoms/analytics.ts`
- `cli/src/services/analytics/AnalyticsStateIntegration.ts`

**Risks:**

- Render thrashing from too many updates (Mitigation: 100ms debounce on atom updates)
- Slow aggregation queries (Mitigation: SQLite window functions + 5-second cache)

---

### Phase 4: Dashboard UI

**Goal:** Visualize metrics in the terminal in a beautiful, responsive way.

**Plans:** 5 plans (Wave 1: 1 plan, Wave 2: 1 plan, Wave 3: 1 plan, Wave 4: 1 plan, Wave 5: 1 plan)

**Plan List:**

- [x] 04-01-PLAN.md — Install @pppp606/ink-chart and implement useThrottle hook
- [x] 04-02-PLAN.md — Build SessionMetricsPanel, TokenUsageChart, and SessionHistoryList components
- [x] 04-03-PLAN.md — Create AnalyticsDashboard container and /stats command
- [x] 04-04-PLAN.md — Integrate AnalyticsDashboard into UI.tsx with state management (gap closure)
- [x] 04-05-PLAN.md — Enhance /stats command to render dashboard and add keyboard shortcuts (gap closure)

**Success Criteria:**

- `kilo stats` shows live dashboard
- UI updates visibly without flickering
- Resizes correctly on window change
- Charts render accessibly

**Key Files:**

- `cli/src/ui/analytics/AnalyticsDashboard.tsx`
- `cli/src/ui/analytics/components/`
- `cli/src/commands/stats.ts`
- `cli/src/state/atoms/analytics.ts` (showDashboardAtom)
- `cli/src/ui/UI.tsx` (conditional rendering)

**Risks:**

- Render storms (Mitigation: `useThrottle` custom hook)
- Layout breaking on small screens (Mitigation: Responsive layout testing on 80-column terminals)

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
