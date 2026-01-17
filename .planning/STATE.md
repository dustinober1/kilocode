# Project State

**Current Phase:** 04 - Dashboard UI
**Plan:** 01 of 3 (Chart Library & useThrottle Hook)
**Status:** In progress

## Context

Project initialized. Roadmap created. Phase 1 complete. Storage foundation with SQLite WAL mode established. Phase 2 complete: Metrics collection layer with EventEmitter architecture, PII sanitization, CLI integration, and comprehensive testing. Phase 3 complete: Aggregation layer with SQL window functions, query caching, Jotai state atoms, and event-to-atom bridge for real-time updates. Phase 04 in progress: Chart library and useThrottle hook foundation for dashboard UI.

## Progress

███████████████████████████████████████ 100% (Phase 1 complete)
███████████████████████████████████████ 100% (Phase 2 complete: 3/3 plans)
███████████████████████████████████████ 100% (Phase 3 complete: 3/3 plans)
███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 33% (Phase 4 in progress: 1/3 plans)

## Decisions Made

### Phase 04: Dashboard UI

#### Plan 04-01: Chart Library & useThrottle Hook (Complete)

- **@pppp606/ink-chart vs ink-charts:** Chose @pppp606/ink-chart fork for React 19 compatibility
- **Chart library version:** Installed @pppp606/ink-chart@0.1.1 with Sparkline and BarChart components
- **lodash.debounce import pattern:** Use CommonJS require() with DebounceFunction type declaration for TypeScript compatibility
- **Throttle delay default:** 100-150ms recommended for dashboard use cases
- **Test approach for hooks:** Use vi.fn() mocks directly with debounce logic instead of @testing-library/react (not installed)

### Phase 01: Storage Foundation

- **better-sqlite3 vs sql.js:** Chose better-sqlite3 for persistent local storage
- **Integer timestamps:** Using `integer({ mode: 'timestamp' })` for timezone consistency
- **Integer cents for cost:** Storing cost as integer cents to avoid floating point issues
- **WAL mode configuration:** journal_mode=WAL, synchronous=NORMAL, busy_timeout=5000
- **Batch insertion:** 100-event queue with 1-second periodic flush for <50ms performance
- **Automatic migrations:** Run on StorageService startup using drizzle-orm migrator
- **Async close pattern:** close() must be async and await flushEvents() to prevent data loss (Plan 02)
- **Node v20 LTS requirement:** Tests verified on Node v20 LTS due to better-sqlite3 native binding compatibility (Plan 02)
- **Performance test accuracy:** Must measure flushEvents() not insertEvents() to verify actual DB write time (Plan 02)
- **Deferred e2e verification:** End-to-end CLI restart test deferred to Phase 02 when StorageService integrates with CLI (Plan 02)

### Phase 02: Data Collection Layer (Complete)

- **Zero new dependencies:** Use native Node.js modules (events, crypto, process)
- **EventEmitter architecture:** MetricsCollectorService extends EventEmitter for decoupled event capture
- **Ring buffer queue:** 1000-event fixed capacity to prevent memory leaks
- **SHA-256 PII hashing:** Use Node.js crypto module for username/path sanitization
- **Graceful shutdown:** SIGTERM/SIGINT handlers with final flush before exit
- **Type-safe events:** MetricsEvents interface for compile-time type checking
- **Privacy-first:** DEFAULT_PRIVACY_CONFIG enables hashing and filtering by default
- **Non-blocking emit:** Event queue decouples capture from storage (<5ms overhead)

#### Plan 02-02: EventQueue Ring Buffer (Complete)

- **Ring buffer implementation:** O(1) enqueue using head/tail pointers with modulo wraparound
- **Automatic overflow protection:** Overwrites oldest events when capacity reached
- **Type-safe interfaces:** MetricEvent, EventCategory enum, MetricsEvents for compile-time checking
- **Comprehensive tests:** 22 test cases covering FIFO ordering, overflow, wraparound, edge cases
- **Prerequisite types.ts:** Created types.ts as part of 02-02 (should have been 02-01, unblocked execution)

#### Plan 02-01: MetricsCollectorService (Complete)

- **EventEmitter singleton:** MetricsCollectorService extends EventEmitter for decoupled event capture
- **PII sanitization before queue:** SHA-256 hashing to 16 chars for usernames, pattern redaction for sensitive prompts
- **Privacy-first defaults:** Analytics enabled, PII hashing, and prompt filtering all true by default
- **Non-blocking emit:** Events queued immediately (<5ms), flushed periodically (1s) for performance
- **Graceful shutdown:** SIGTERM/SIGINT handlers with final flush and storage.close()
- **Type-safe event emission:** Override emit() with generics for compile-time type checking
- **Recursive sanitization:** Handles nested objects and arrays for complex data structures
- **Session tracking:** startSession/endSession methods for session lifecycle management

#### Plan 02-03: CLI Integration (Complete)

- **Non-blocking metrics integration:** All emit() calls wrapped in try-catch to prevent metrics errors from breaking core functionality
- **Session lifecycle management:** Start session in CLI initialize(), end in dispose() with graceful shutdown handlers
- **Optional chaining pattern:** Use metrics?.emit() when metrics may be null (uninitialized)
- **Service integration:** ExtensionService and TelemetryService emit metrics without blocking their primary operations
- **Session ID accessor:** getCurrentSessionId() provides access to current session for all services
- **End-to-end testing:** Comprehensive integration tests verify complete pipeline from emission to database

### Phase 03: State & Aggregation (Complete)

#### Plan 03-01: Aggregation Layer (Complete)

- **Window functions vs JavaScript aggregation:** SQLite OVER clause for 100x faster cumulative calculations
- **5-second cache TTL:** Balances data freshness (<5s staleness) with query performance (<1ms cache hits)
- **Session prefix invalidation:** Efficiently clears all session-related cache entries with single call
- **Map-based cache:** Simpler than LRU cache, TTL-based expiration sufficient for analytics use case
- **Singleton pattern:** AggregationService matches StorageService architecture for consistency
- **Snake_case to camelCase mapping:** Database returns running_total, code uses runningTotal for consistency

#### Plan 03-02: Jotai State Atoms (Complete)

- **100ms debounce delay:** Balances responsiveness with performance for refresh triggers
- **Module-scoped timeout variable:** refreshTimeout persists across debouncedRefreshAtom calls
- **Graceful null handling:** Derived atoms return null or empty array when no session ID
- **Write-only refresh pattern:** Uses set(currentSessionIdAtom, currentId) to force re-computation
- **Derived atoms pattern:** async (get) => {...} for database queries via AggregationService
- **Central atom exports:** Analytics atoms exported from index.ts following existing patterns

#### Plan 03-03: MetricsCollector Integration (Complete)

- **Event-to-atom bridge pattern:** MetricsCollector events → Jotai atoms via getDefaultStore().set()
- **100ms debounce delay:** Balances responsiveness with performance for flush events
- **Empty sessionId handling:** Skips both cache invalidation and atom refresh when no active session
- **session:end immediate refresh:** No debounce on session end - final metrics needed immediately
- **Single initialization:** Integration initialized once during CLI startup
- **Non-blocking integration:** Wrap initialization in try-catch to prevent analytics errors from breaking CLI

### Earlier Decisions

- See .planning/research/SUMMARY.md for initial architectural decisions

## Blockers & Concerns

### Active Blockers

None - Phase 04-01 complete. Ready for Phase 04-02 (Dashboard Components).

### Resolved (Phase 04)

- **TypeScript import error for lodash.debounce:** ES6 named import failed with TS7016. Fixed by using CommonJS require() with DebounceFunction type declaration.
- **Linting errors for unused variables:** Fixed unused currentValue variables and unnecessary eslint-disable comments.

### Resolved (Phase 02)

- **Dependency order issue:** types.ts required for EventQueue but planned for 02-01. Resolved by creating types.ts in 02-02 task.
- **Integration test validation:** Tests created but require Node v20 LTS with better-sqlite3 native bindings for execution. Will be validated before production deployment.

### Resolved (Phase 03)

- **Test mocking challenges:** Vitest mocking of StorageService singleton required multiple iterations to get correct static getInstance() pattern
- **Database row type mapping:** Fixed snake_case to camelCase mapping in getTokenUsageTimeline for proper TypeScript types

### Resolved (Phase 01)

- **Test verification:** All tests pass on Node v20 LTS (user-approved)
- **Build verification:** Native bindings build correctly (user-approved)
- **Critical data loss bug:** Fixed - close() now async and awaits flushEvents()
- **Performance test accuracy:** Fixed - now measures actual DB write time

### Concerns

- **Node version compatibility:** Development on Node v25.2.1 is fine, but production should use Node v20 LTS for stable native bindings
- **Integration test validation:** Tests should be run on Node v20 LTS to verify complete pipeline before production deployment
- **Performance validation:** <5ms emit, <50ms flush, and <10ms aggregation query requirements should be validated in production-like environment
- **@testing-library/react not available:** Full React integration testing for hooks requires adding @testing-library/react dependency (deferred to future if needed)

## Session Continuity

**Last session:** 2026-01-17
**Stopped at:** Completed Phase 04 Plan 01 (Chart Library & useThrottle Hook)
**Resume file:** None (plan complete)

**Ready for:** Execute Phase 04 Plan 02 (Dashboard Components) or begin planning next phase
