# Research Summary: Session Analytics Dashboard

**Date:** 2026-01-17
**Project:** CLI Session Analytics Dashboard
**Status:** Research Complete

## Executive Summary

The proposed Session Analytics Dashboard will be a local-first, privacy-focused productivity tool integrated directly into the Kilo Code CLI. It will empower users to answer "Is AI making me more productive?" by tracking session duration, token usage, costs, and unique tool usage metrics.

The architecture will introduce a non-blocking `MetricsCollectorService` that feeds a local SQLite database (`better-sqlite3` with `drizzle-orm`) via an asynchronous queue. A reactive `DashboardUI` built with Ink and Jotai will visualize this data in real-time, throttled to prevent performance degradation. This design balances the need for comprehensive insights with strict performance and privacy constraints.

## Core Decisions

### 1. Technology Stack (Locked)

- **Database:** `better-sqlite3` (v11.x) - Fast synchronous driver, ideal for local CLI.
- **ORM:** `drizzle-orm` (v0.45.x) - Lightweight (7.4kb), type-safe, "close to metal" SQL.
- **Visualization:** `@pppp606/ink-chart` (v0.2.4) - React 19/Ink 6 compatible fork for charts.
- **Components:** `ink-table` and `ink-progress-bar` for structured data.
- **State:** Jotai (existing) for reactive dashboard state.

### 2. Architecture Pattern (Locked)

- **Event-Driven Collection:** `MetricsCollectorService` listens to `ExtensionService` and `TelemetryService` events.
- **Asynchronous Persistence:** Events are queued in memory and flushed to SQLite in batches (WAL mode).
- **Reactive UI:** Dashboard components subscribe to derived Jotai atoms, not the database directly.
- **5-Layer Design:**
    1. **Storage:** SQLite + Schema (Foundation)
    2. **Collector:** Event Queue + Batcher
    3. **State:** Atoms + Effects
    4. **UI:** Ink Components
    5. **Reports:** Static Generators

### 3. Key Features (MVP)

- **Real-time Metrics:** Session duration, token count, cost estimate.
- **Tool Usage Breakdown:** Unique differentiator showing file reads, writes, and command executions.
- **Historical View:** List of past sessions with summary stats.
- **Privacy Controls:** Granular opt-out for specific metric categories.
- **JSON Export:** Developer-friendly data access.

## Risk Mitigation strategies

| Risk               | Impact | Mitigation Strategy                                                             |
| ------------------ | ------ | ------------------------------------------------------------------------------- |
| **Blocking UI**    | High   | Use SQLite WAL mode; async batch writes; never await DB in hot paths.           |
| **Render Storms**  | High   | Throttle dashboard state updates to 2-4Hz; debounce atom updates.               |
| **Memory Leaks**   | High   | Custom `useInterval` hook with auto-cleanup for all dashboard timers.           |
| **PII Capture**    | High   | Explicit allowlist for captured fields; hash file paths; never log raw prompts. |
| **Database Locks** | Medium | Single-writer connection pattern; WAL mode for concurrent reading.              |

## Phasing Strategy

We recommend a 5-phase approach to build from the foundation up:

1.  **Phase 1: Storage Foundation**

    - Setup `better-sqlite3` and `drizzle-orm`.
    - Define initial schema (sessions, events).
    - Implement migration system.
    - **Goal:** Working local database with no UI.

2.  **Phase 2: Data Collection Layer**

    - Implement `MetricsCollectorService`.
    - Hook into `ExtensionService` and `TelemetryService`.
    - Implement async queue and batch flushing.
    - **Goal:** Data flows from CLI events to SQLite.

3.  **Phase 3: State & Aggregation**

    - Create Jotai atoms for analytics (`currentSession`, `history`).
    - Implement efficient aggregation queries (SQL-side).
    - **Goal:** Reactive state ready for UI consumption.

4.  **Phase 4: Dashboard UI**

    - Build Ink components (`SessionMetricsPanel`, `ToolUsageList`).
    - Integrate `@pppp606/ink-chart` for trends.
    - Implement throttled rendering.
    - **Goal:** User-facing dashboard command (`kilo stats`).

5.  **Phase 5: Reports & Polish**
    - Implement JSON export.
    - Add privacy configuration controls.
    - **Goal:** Feature complete and shippable.

## Open Questions

1.  **Terminal Resolution:** How to handle charts on very small terminals? (Fallback to text-only?)
2.  **Retention Policy:** Should we auto-prune data after N days/months?
3.  **Cost Pricing:** Where to source up-to-date model pricing for cost estimates? (Hardcode vs Config)

## Ready for Roadmap

This summary provides all necessary inputs for the `gsd-roadmapper` to generate a detailed project roadmap.
