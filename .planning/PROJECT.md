# Session Analytics Dashboard

## What This Is

A local analytics feature for the Kilo Code CLI that lets users track their productivity metrics — token usage, task outcomes, time spent, and tool usage — without sending data to external services. Users gain insights into how AI is helping them be more effective through real-time dashboards, summary commands, and exportable reports.

## Core Value

Users can measure and understand their productivity gains from AI assistance — the ONE thing that matters most is showing how AI is helping them work more effectively.

## Requirements

### Validated

- ✓ CLI application exists with Ink-based terminal UI — existing
- ✓ Task lifecycle management via Task class — existing
- ✓ Tool execution with structured results — existing
- ✓ Token counting via tiktoken — existing
- ✓ Local storage infrastructure (~/.kilocode/) — existing
- ✓ Jotai state management in CLI — existing

### Active

- [ ] Real-time session metrics dashboard in CLI
- [ ] Token usage tracking (input/output tokens, estimated costs)
- [ ] Task outcome tracking (completions, failures, success rate)
- [ ] Time tracking (session duration, time per task)
- [ ] Tool usage tracking (which tools, frequency, outcomes)
- [ ] Local SQLite database for metrics storage
- [ ] Historical analytics across sessions
- [ ] CLI summary commands for quick metrics checks
- [ ] Exportable reports (HTML/JSON)
- [ ] User-configurable privacy settings (what level of detail to capture)

### Out of Scope

- Cloud sync of analytics data — core value is local/private
- Sharing or comparing metrics with other users — privacy focus
- VS Code extension integration — CLI only for v1
- JetBrains plugin integration — CLI only for v1
- Predictive analytics or AI-powered insights — keep it simple for v1

## Context

**Existing Infrastructure:**

- CLI is built with Ink 6.6.0 (React for terminals) and Jotai for state
- Task class in `src/core/task/Task.ts` already tracks conversation state
- Token counting available via tiktoken package
- CLI already has logging infrastructure at `~/.kilocode/cli/logs/`
- Telemetry package exists at `packages/telemetry/` (PostHog-based, cloud)

**Key Integration Points:**

- `cli/src/index.ts` — CLI entry point
- `cli/src/services/` — CLI-specific services
- `cli/src/ui/` — Ink React components
- `cli/src/state/atoms/` — Jotai state atoms

**Relevant Patterns:**

- Services follow manager class pattern
- State uses Jotai atoms
- UI uses Ink React components
- Config uses Zod schemas for validation

## Constraints

- **Platform**: CLI only (Ink/React terminal UI)
- **Storage**: SQLite via better-sqlite3 or sql.js for local persistence
- **Privacy**: All data stays local by default, user controls what's captured
- **Performance**: Metrics collection must not noticeably slow down CLI operations
- **Compatibility**: Must work with existing Task/Tool architecture without invasive changes

## Key Decisions

| Decision                   | Rationale                                         | Outcome   |
| -------------------------- | ------------------------------------------------- | --------- |
| Local SQLite for storage   | Structured queries, single file, no server needed | — Pending |
| Real-time dashboard as MVP | Most immediate value, validates data collection   | — Pending |
| Privacy as user choice     | Different users have different comfort levels     | — Pending |
| CLI only for v1            | Focus scope, validate concept before expanding    | — Pending |

---

_Last updated: 2026-01-17 after initialization_
