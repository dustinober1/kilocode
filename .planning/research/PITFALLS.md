# Domain Pitfalls

**Domain:** CLI Session Analytics Dashboard
**Researched:** 2026-01-17
**Confidence:** HIGH (based on web research, official documentation patterns, and codebase analysis)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Synchronous Database Writes Blocking CLI Operations

**What goes wrong:** SQLite write operations execute synchronously on the main thread, causing noticeable delays during command execution. Users experience lag when typing commands or waiting for AI responses because metrics are being written to disk.

**Why it happens:** Developers treat local database writes as "instant" because there's no network latency. But SQLite fsync operations can take 10-50ms, which accumulates when tracking every event.

**Consequences:**

- CLI feels sluggish compared to before analytics was added
- Users disable analytics to restore performance
- Feature is perceived as broken/unpolished

**Prevention:**

1. Use SQLite WAL (Write-Ahead Logging) mode for non-blocking writes
2. Batch writes in memory, flush to database periodically (every 1-5 seconds)
3. Use async write patterns with proper queue management
4. Never await database operations in the hot path of command execution

**Detection:**

- Measure command response time before and after analytics integration
- Monitor "time to first keystroke response" in the input field
- Users report "it feels slower"

**Phase mapping:** Address in Phase 1 (Data Collection Layer) - must be baked into the architecture from the start.

---

### Pitfall 2: Timer/Interval Memory Leaks in Ink Dashboard

**What goes wrong:** Dashboard components using `setInterval` or `setTimeout` for real-time updates fail to clean up when unmounting, causing memory leaks. The CLI process grows in memory over time, eventually becoming unresponsive.

**Why it happens:** In Ink's React-for-terminal environment, component lifecycle works like React but developers often forget cleanup. Dashboard components that poll for updates every second can leak dozens of interval references.

**Consequences:**

- Memory usage grows linearly with session duration
- Long sessions (4+ hours) become sluggish or crash
- Difficult to reproduce because it requires extended usage

**Prevention:**

```typescript
// ALWAYS use useEffect cleanup for intervals
useEffect(() => {
	const intervalId = setInterval(() => {
		refreshMetrics()
	}, 1000)

	return () => {
		clearInterval(intervalId)
	}
}, [])
```

- Create a custom `useInterval` hook that handles cleanup automatically
- Use React Query or SWR-like patterns for data fetching with built-in cleanup
- Test with extended sessions in development

**Detection:**

- Memory profiling during development
- Watch for increasing memory in `process.memoryUsage()`
- Users report "CLI gets slow after running for a while"

**Phase mapping:** Address in Phase 3 (Dashboard UI) - critical for real-time dashboard components.

---

### Pitfall 3: Accidental PII Capture in Analytics Data

**What goes wrong:** Analytics inadvertently captures personally identifiable information (PII) like file paths containing usernames, command arguments with API keys, or prompt content containing sensitive data.

**Why it happens:** Developers focus on capturing useful metrics and forget that CLI arguments, file paths, and prompts often contain sensitive information. The existing codebase has `anonymizeWorkspace()` but this pattern must extend to all captured data.

**Consequences:**

- Privacy violations if data is ever exported or viewed
- User trust is lost when they discover what was captured
- Potential legal compliance issues (GDPR, CCPA)

**Prevention:**

1. Define an explicit allowlist of safe fields to capture
2. Never capture raw command arguments or prompt text
3. Hash or anonymize all file paths (existing pattern in TelemetryService)
4. Create privacy audit checklist for each new metric type
5. Default to capturing less rather than more

**Detection:**

- Code review with explicit privacy focus
- Audit exported data for any path containing `/Users/` or `/home/`
- Grep database dumps for common PII patterns

**Phase mapping:** Address in Phase 1 (Data Collection Layer) AND Phase 4 (Export/Reports) - must be consistent throughout.

---

### Pitfall 4: Dashboard Render Storms from Unthrottled State Updates

**What goes wrong:** Every analytics event triggers a state update, which triggers a React re-render in Ink. When AI is streaming responses (many events per second), the dashboard tries to re-render for each event, causing visual flicker and CPU spikes.

**Why it happens:** Jotai atoms update synchronously. The existing architecture uses Jotai extensively. Without explicit throttling, high-frequency events cascade through the render tree.

**Consequences:**

- Dashboard flickers uncontrollably during AI responses
- High CPU usage degrades AI response streaming
- Terminal output becomes unreadable

**Prevention:**

1. Throttle state updates to dashboard components (max 2-4 updates per second)
2. Use separate "real-time" vs "display" state - update display state on throttled interval
3. Debounce analytics atom updates
4. Consider using `useDeferredValue` or similar patterns for non-urgent updates

**Detection:**

- Visual inspection during AI streaming
- CPU profiling during high-activity periods
- Frame rate monitoring in terminal (if available)

**Phase mapping:** Address in Phase 3 (Dashboard UI) - architectural decision for how dashboard reads state.

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 5: SQLite Database Schema Migrations Without Forward Planning

**What goes wrong:** Initial database schema is designed for v1 requirements. When v2 needs new columns or tables, migrations become complex. SQLite's limited ALTER TABLE support makes this especially painful.

**Why it happens:** "We'll figure it out later" mentality. SQLite cannot add columns with NOT NULL constraints without default values, cannot drop columns (before SQLite 3.35), and has no built-in migration tooling.

**Consequences:**

- Complex migration code for simple schema changes
- Risk of data loss during migrations
- Users stuck on old schema when updates fail

**Prevention:**

1. Design schema with extension in mind (use JSON columns for flexible data)
2. Include schema version in database from day one
3. Plan migration strategy before first release (simple versioned migration files)
4. Consider using `better-sqlite3` migrations pattern or simple version table

**Detection:**

- No `schema_version` table in initial design
- Columns with NOT NULL and no defaults
- No migration documentation

**Phase mapping:** Address in Phase 1 (Data Collection Layer) - must be part of initial database design.

---

### Pitfall 6: Overloading the Token Counting Hot Path

**What goes wrong:** Token counting (tiktoken) is called on every message during analytics capture, adding computational overhead to the already CPU-intensive AI response streaming.

**Why it happens:** Token counts are valuable metrics. Developers add counting at the obvious place (message handler) without considering that this runs on every streaming chunk.

**Consequences:**

- Noticeably slower AI response display
- CPU contention between token counting and UI rendering
- Users perceive AI as slower (even though it's the analytics)

**Prevention:**

1. Count tokens AFTER response is complete, not during streaming
2. Cache token counts - same content always yields same count
3. Use rough estimates during streaming, accurate counts post-completion
4. Offload counting to idle time or background

**Detection:**

- Profile CPU during AI streaming
- Compare streaming performance with analytics on vs off
- Measure time spent in tiktoken functions

**Phase mapping:** Address in Phase 2 (Metrics Aggregation) - affects how we collect token metrics.

---

### Pitfall 7: Assuming Single-Session Database Access

**What goes wrong:** Database is designed assuming only one CLI process accesses it at a time. User runs multiple CLI instances (multiple terminal tabs), causing database corruption or lock contention.

**Why it happens:** Local SQLite databases feel "single user" but developers often run multiple terminals. The existing CLI doesn't prevent multiple instances.

**Consequences:**

- "Database is locked" errors
- Corrupted analytics data
- Lost metrics from concurrent sessions

**Prevention:**

1. Use SQLite WAL mode (enables concurrent reads with single writer)
2. Implement connection pooling or singleton database connection
3. Use file-based locking or named mutex for write operations
4. Design for concurrent access from the start

**Detection:**

- Test with multiple CLI instances running simultaneously
- Check for SQLite busy/lock errors in logs
- Users report missing analytics data

**Phase mapping:** Address in Phase 1 (Data Collection Layer) - database architecture decision.

---

### Pitfall 8: Missing Opt-Out Mechanisms at Multiple Levels

**What goes wrong:** Analytics has only a single on/off toggle. Users want granular control (track time but not prompts, track locally but never export, etc.) and the architecture can't support it without rewrite.

**Why it happens:** Privacy configuration is an afterthought. The existing `config.telemetry` is a simple boolean. Extending this requires schema changes and code changes throughout.

**Consequences:**

- Users with partial privacy needs disable analytics entirely
- Feature adoption is lower than it could be
- Adding granular controls requires touching many files

**Prevention:**

1. Design privacy configuration schema upfront with granular options
2. Make each metric category independently toggleable
3. Use environment variables for CI/automation override (pattern exists: `KILOCODE_*`)
4. Support both global config file and per-session flags

Example schema:

```json
{
	"analytics": {
		"enabled": true,
		"captureTokenUsage": true,
		"captureTimeDuration": true,
		"captureToolUsage": true,
		"captureTaskOutcomes": true,
		"capturePromptLength": false // privacy-sensitive
	}
}
```

**Detection:**

- Privacy configuration is a single boolean
- No way to selectively disable specific metrics
- No environment variable overrides

**Phase mapping:** Address in Phase 1 (Data Collection Layer) AND Phase 5 (Configuration) - spans multiple phases.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 9: Export Reports with Absolute File Paths

**What goes wrong:** Exported HTML/JSON reports contain absolute file paths that work on the user's machine but are meaningless (or privacy-violating) when shared.

**Prevention:**

- Use relative paths or anonymized identifiers in exports
- Include export options for privacy levels
- Preview what will be exported before export

**Phase mapping:** Address in Phase 4 (Export/Reports).

---

### Pitfall 10: Dashboard Layout Breaking on Narrow Terminals

**What goes wrong:** Dashboard is designed for standard terminal width (80+ columns). Users with narrow terminals or split panes see broken layouts.

**Prevention:**

- Design mobile-first (narrow first, expand for width)
- Use Ink's responsive layout utilities
- Test at 40, 60, 80, 120 column widths
- Provide compact mode toggle

**Phase mapping:** Address in Phase 3 (Dashboard UI).

---

### Pitfall 11: Stale Dashboard After Background Tab

**What goes wrong:** Dashboard shows outdated information after user switches to another terminal tab and back. The interval updates but the display doesn't refresh fully.

**Prevention:**

- Refresh all data on focus/visibility
- Use event-driven updates rather than just intervals
- Consider terminal focus events (limited availability)

**Phase mapping:** Address in Phase 3 (Dashboard UI).

---

### Pitfall 12: Cost Estimation Inaccuracy

**What goes wrong:** Token cost estimation uses hardcoded prices that become outdated as providers change pricing. Users make decisions based on inaccurate cost data.

**Prevention:**

- Clearly label costs as "estimated"
- Make pricing configurable
- Include "last updated" timestamp
- Consider not showing costs if accuracy can't be maintained

**Phase mapping:** Address in Phase 2 (Metrics Aggregation) - affects how costs are calculated.

---

## Phase-Specific Warnings

| Phase Topic           | Likely Pitfall                     | Mitigation                                 |
| --------------------- | ---------------------------------- | ------------------------------------------ |
| Data Collection Layer | Synchronous DB writes blocking CLI | Use WAL mode, batch writes, async patterns |
| Data Collection Layer | PII capture                        | Explicit allowlist, anonymize paths        |
| Data Collection Layer | Single-session assumption          | Design for concurrent access with WAL      |
| Metrics Aggregation   | Token counting overhead            | Count post-completion, cache results       |
| Metrics Aggregation   | Cost estimation staleness          | Make configurable, label as estimates      |
| Dashboard UI          | Timer memory leaks                 | Custom useInterval hook with cleanup       |
| Dashboard UI          | Render storms                      | Throttle state updates to 2-4/sec          |
| Dashboard UI          | Narrow terminal layouts            | Mobile-first design approach               |
| Export/Reports        | Absolute paths in exports          | Anonymize, offer privacy levels            |
| Configuration         | Missing granular opt-out           | Design schema upfront with categories      |

## Anti-Patterns to Avoid

### Anti-Pattern: "Capture Everything, Filter Later"

**What it looks like:** Logging all events to database, planning to add filtering/privacy later.

**Why it's bad:** Data once written is hard to retroactively anonymize. Privacy must be built-in, not bolted-on.

**Instead:** Define what to capture with privacy in mind from the start. Prefer capturing less.

### Anti-Pattern: "The Dashboard Knows Best"

**What it looks like:** Dashboard component fetches and transforms its own data directly from database.

**Why it's bad:** Tight coupling, hard to test, performance problems as dashboard does heavy computation.

**Instead:** Separate data layer computes aggregates, dashboard only renders pre-computed state.

### Anti-Pattern: "Just Add Another Column"

**What it looks like:** New metrics added by adding columns to existing tables without migration strategy.

**Why it's bad:** SQLite schema changes are limited. Existing data becomes incompatible.

**Instead:** Use versioned schema with migration system from day one.

## Sources

- WebSearch: CLI analytics telemetry mistakes common problems 2025
- WebSearch: SQLite WAL mode analytics database performance write contention
- WebSearch: CLI telemetry opt-out privacy best practices developer tools
- WebSearch: Ink terminal React memory leak rendering performance issues
- WebSearch: CLI metrics blocking main thread async tracking pitfalls
- Codebase: `/Users/dustinober/OpenSource/kilocode/cli/src/services/telemetry/TelemetryService.ts` (existing patterns)
- Codebase: `/Users/dustinober/OpenSource/kilocode/cli/src/cli.ts` (Ink/Jotai patterns)
- Codebase: `/Users/dustinober/OpenSource/kilocode/.planning/PROJECT.md` (project context)
