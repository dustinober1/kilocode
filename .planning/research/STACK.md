# Research: Tech Stack - CLI Session Analytics Dashboard

**Project:** Kilo Code CLI Analytics
**Date:** 2026-01-17
**Status:** Prescriptive Recommendation

## Core Decisions

### Database: better-sqlite3

- **Choice:** `better-sqlite3` (~v11.x)
- **Reasoning:** Fastest synchronous SQLite driver for Node.js. Since CLI analytics are local and single-user, synchronous operations are preferred to avoid the "async-everywhere" overhead in TUI rendering loops.
- **Confidence:** HIGH

### ORM: Drizzle ORM

- **Choice:** `drizzle-orm` (~v0.45.x)
- **Reasoning:** Extremely lightweight (7.4kb) and tree-shakable, which is critical for CLI startup time. It provides full type safety for time-series queries (aggregations, window functions) while staying "close to the metal" of SQL.
- **Confidence:** HIGH

### Charts: @pppp606/ink-chart

- **Choice:** `@pppp606/ink-chart` (~v0.2.4)
- **Reasoning:** A modern, actively maintained fork (last updated Dec 2025) specifically compatible with React 19 and Ink 6. Provides `BarChart` and `Sparkline` components designed for terminal resolution.
- **Confidence:** MEDIUM (Validated as current, but TUI charting is always subject to terminal font/size variance).

## Library Selection

| Category                | Library              | Version   | Justification                                                |
| ----------------------- | -------------------- | --------- | ------------------------------------------------------------ |
| **Storage**             | `better-sqlite3`     | `^11.0.0` | Native performance, synchronous API fits CLI lifecycle.      |
| **ORM**                 | `drizzle-orm`        | `^0.45.0` | Zero-overhead, type-safe SQL, native better-sqlite3 driver.  |
| **Schema/Migration**    | `drizzle-kit`        | `^0.30.0` | Manages local SQLite schema evolution in `~/.kilocode/`.     |
| **Data Viz (Charts)**   | `@pppp606/ink-chart` | `^0.2.4`  | Only modern charting fork compatible with React 19.          |
| **Data Viz (Table)**    | `ink-table`          | `^3.1.0`  | Declarative Ink component for tabular metric display.        |
| **Data Viz (Progress)** | `ink-progress-bar`   | `^3.0.0`  | Visualizes quotas or task completion percentages.            |
| **Date/Time**           | `date-fns`           | `^4.1.0`  | Time-series grouping and formatting (e.g., "last 7 days").   |
| **Export**              | `@json2csv/node`     | `^7.0.0`  | Stream-based CSV generation for performance with large logs. |

## Compatibility Verification

- **Node 20.x:** ✅ YES (Project uses 20.19.2, all libraries support Node 20+).
- **Ink 6.x:** ✅ YES (Verified for `ink-table` and `@pppp606/ink-chart`).
- **React 19.x:** ✅ YES (Project uses 19.2.3; `@pppp606/ink-chart` specifically addresses React 19 compatibility).

## Implementation Notes

### Local Storage Path

Analytics database should be stored at:
`~/.kilocode/analytics.db`
(Use `os.homedir()` + `path.join()`).

### Installation

```bash
pnpm add better-sqlite3 drizzle-orm @pppp606/ink-chart ink-table ink-progress-bar date-fns @json2csv/node
pnpm add -D drizzle-kit @types/better-sqlite3
```

### Performance Optimization

- **WAL Mode:** Enable Write-Ahead Logging for better concurrent read/write performance during CLI sessions.
- **Prepared Statements:** Use Drizzle's prepared statements for frequent aggregation queries (e.g., "tokens per hour").
- **Streaming Export:** Always use `@json2csv/node` streams for exports to avoid blocking the main TUI thread or consuming excessive memory.

## Alternatives Considered

| Recommended        | Alternative    | Why Not                                                                                                   |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------- |
| **Drizzle**        | **Prisma**     | Prisma's Rust engine adds significant binary bloat and slower startup to a CLI tool.                      |
| **better-sqlite3** | **sqlite3**    | `sqlite3` is asynchronous and generally slower/harder to manage in a CLI lifecycle than `better-sqlite3`. |
| **ink-table**      | **cli-table3** | `cli-table3` returns strings, breaking the React/Ink declarative component flow.                          |

## Confidence Assessment

- **Storage Stack:** HIGH (Industry standard for Node CLI).
- **Visualization:** MEDIUM (Relies on community forks for React 19 compatibility).
- **Export:** HIGH (Standard stream-based approach).

## Sources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/get-started-sqlite#better-sqlite3)
- [NPM Registry: @pppp606/ink-chart](https://www.npmjs.com/package/@pppp606/ink-chart)
- [NPM Registry: better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- [React 19 Compatibility Discussions (GitHub/Ink)](https://github.com/vadimdemedes/ink/issues)
