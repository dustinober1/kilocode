# Feature Landscape: CLI Session Analytics Dashboard

**Domain:** Local CLI analytics for AI coding assistant productivity tracking
**Researched:** 2026-01-17
**Confidence:** MEDIUM (WebSearch verified against existing tools like Langfuse, Helicone)

## Executive Summary

CLI session analytics dashboards for AI coding assistants share common patterns with LLM observability platforms (Langfuse, Helicone, PostHog) but must adapt for the unique context of local-first, privacy-focused, terminal-based experiences. The core value proposition—showing users how AI is helping them be more productive—requires a curated set of metrics that balance comprehensiveness with cognitive load.

Key insight: Users want to answer "Is AI making me more productive?" not "What are all possible metrics I could track?" The feature set should be opinionated about what matters.

---

## Table Stakes

Features users expect from any analytics dashboard. Missing these makes the product feel incomplete.

| Feature                        | Why Expected                                         | Complexity | Dependencies                     | Notes                                       |
| ------------------------------ | ---------------------------------------------------- | ---------- | -------------------------------- | ------------------------------------------- |
| **Session duration tracking**  | Basic productivity metric users understand           | Low        | Timer start/end hooks            | Track wall-clock time per session           |
| **Token usage display**        | LLM users universally care about token consumption   | Low        | tiktoken (existing)              | Input/output tokens separately              |
| **Estimated cost calculation** | Direct financial relevance, users want ROI awareness | Medium     | Model pricing data, token counts | Must handle multiple providers/models       |
| **Task completion count**      | Basic measure of work accomplished                   | Low        | Task lifecycle hooks             | Completed vs abandoned                      |
| **Success/failure rate**       | Users want to know if AI is reliable                 | Low        | Task outcome tracking            | Simple percentage display                   |
| **Current session summary**    | Real-time awareness of ongoing work                  | Low        | In-memory state                  | Show at-a-glance metrics                    |
| **Historical session list**    | Users expect to review past sessions                 | Medium     | SQLite storage                   | Already partially exists in `/session list` |
| **Data export (JSON)**         | Developers expect programmatic access                | Low        | Serialization                    | Standard export format                      |
| **Privacy controls**           | Local-first promise requires user control            | Medium     | Config schema                    | On/off toggles for collection categories    |
| **Persistent storage**         | Analytics must survive CLI restart                   | Medium     | SQLite setup                     | Single file, portable                       |

### Table Stakes Rationale

These features appear in every LLM analytics tool surveyed (Langfuse, Helicone, PostHog LLM analytics). Users who have seen any analytics dashboard will expect these. The Kilo Code CLI already tracks sessions and has token counting via tiktoken—the infrastructure exists.

---

## Differentiators

Features that would make this stand out from basic analytics. Not expected, but valued when present.

| Feature                             | Value Proposition                                         | Complexity | Dependencies                          | Notes                                         |
| ----------------------------------- | --------------------------------------------------------- | ---------- | ------------------------------------- | --------------------------------------------- |
| **Tool usage breakdown**            | Unique to AI coding assistants—which tools are most used? | Medium     | Tool execution hooks                  | Show file reads, writes, bash commands, etc.  |
| **Time-to-first-response tracking** | Perceived speed metric matters for UX                     | Low        | Response timing                       | Latency awareness                             |
| **Token efficiency score**          | Novel metric: output value per token spent                | High       | Task categorization, outcome tracking | "Bang for buck" metric                        |
| **Productivity trend charts**       | Visual progress over time in terminal                     | High       | ASCII/Unicode charts, historical data | Week-over-week comparisons                    |
| **Model comparison within session** | If user switches models, show which performed better      | Medium     | Model tracking per request            | Provider-agnostic insights                    |
| **Task categorization**             | Auto-classify tasks (bug fix, feature, refactor, etc.)    | High       | LLM classification or heuristics      | Helps users understand work patterns          |
| **Interactive real-time dashboard** | Live-updating terminal UI during session                  | High       | Ink components, state management      | `kilo stats --live` style command             |
| **Cost projection/budget alerts**   | Warn when approaching spending thresholds                 | Medium     | Historical usage, config thresholds   | Proactive cost management                     |
| **Export to HTML report**           | Shareable, pretty-printed summary                         | Medium     | HTML templating                       | For sharing with teams/managers               |
| **Per-project analytics**           | Separate metrics by workspace/repo                        | Medium     | Workspace detection                   | Answer "how much AI help did project X get?"  |
| **Streak/consistency tracking**     | Gamification of regular AI usage                          | Low        | Date tracking                         | "You've used AI coding help 5 days in a row"  |
| **Context window utilization**      | Show how much of context budget is used                   | Medium     | Token counting, model limits          | Help users understand conversation efficiency |

### Differentiator Rationale

Tool usage breakdown is uniquely valuable for AI coding assistants—no general LLM tool tracks this because they don't know about file operations, bash commands, etc. This is Kilo Code's opportunity to provide insights competitors cannot.

Productivity trend visualization is what transforms raw numbers into actionable insights. The terminal constraints make this challenging but not impossible (ASCII charts, sparklines).

---

## Anti-Features

Features to explicitly NOT build for v1. Common mistakes or scope creep traps.

| Anti-Feature                                | Why Avoid                                                             | What to Do Instead                              |
| ------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| **Cloud sync/backup**                       | Violates local-first privacy promise; adds complexity                 | Document SQLite file location for manual backup |
| **Comparison with other users**             | Privacy concern; requires cloud; competitive pressure feels bad       | Focus on personal improvement over time         |
| **AI-powered insights/recommendations**     | Scope creep; requires more AI calls; circular cost                    | Simple heuristics and thresholds instead        |
| **Detailed prompt/response logging**        | Privacy sensitive; storage heavy; not needed for productivity metrics | Track metadata only (tokens, duration, outcome) |
| **Real-time cost alerts via notifications** | OS integration complexity; annoying                                   | Show warnings in dashboard UI only              |
| **Integration with external BI tools**      | Scope creep; JSON export is sufficient                                | JSON/CSV export covers power user needs         |
| **Multi-user/team dashboards**              | Enterprise feature; violates local-first                              | Single-user only for v1                         |
| **Automatic report generation/emails**      | Requires background process; complexity                               | Manual export commands                          |
| **Predictive analytics**                    | Requires significant historical data; ML complexity                   | Show trends, let users draw conclusions         |
| **Code quality correlation**                | Would need git integration, test results; scope creep                 | Track AI metrics only, not code outcomes        |
| **Session recording/replay**                | Storage intensive; privacy sensitive                                  | Metadata and summaries only                     |
| **Natural language querying**               | Overkill for local CLI; adds AI calls                                 | Structured commands and filters                 |

### Anti-Feature Rationale

The project scope explicitly excludes cloud sync, VS Code/JetBrains integration, and predictive analytics. These anti-features reinforce that scope. The core value is "measure how AI is helping" not "build a full observability platform."

Detailed prompt/response logging is tempting but violates the privacy-first principle. Users don't want their conversations stored; they want aggregate metrics about productivity.

---

## Feature Dependencies

```
Session Duration Tracking (foundation)
    |
    +-> Task Completion Count
    |       |
    |       +-> Success/Failure Rate
    |       |
    |       +-> Task Categorization (differentiator)
    |
    +-> Token Usage Display
    |       |
    |       +-> Estimated Cost Calculation
    |       |       |
    |       |       +-> Cost Projection/Budgets (differentiator)
    |       |       |
    |       |       +-> Model Comparison (differentiator)
    |       |
    |       +-> Token Efficiency Score (differentiator)
    |       |
    |       +-> Context Window Utilization (differentiator)
    |
    +-> Persistent Storage (SQLite)
            |
            +-> Historical Session List
            |       |
            |       +-> Productivity Trend Charts (differentiator)
            |       |
            |       +-> Per-Project Analytics (differentiator)
            |
            +-> Data Export (JSON)
                    |
                    +-> Export to HTML (differentiator)

Tool Usage Breakdown (independent, but requires tool hooks)
    |
    +-> Tool effectiveness metrics

Privacy Controls (cross-cutting, affects all collection)
```

### Dependency Insights

1. **Storage is foundational** - SQLite must be in place before historical features
2. **Token counting enables cost features** - tiktoken is already available
3. **Task lifecycle hooks enable outcome tracking** - Task class exists
4. **Tool hooks enable unique differentiators** - This is where Kilo Code can shine

---

## MVP Recommendation

For MVP, prioritize table stakes that validate the core value proposition:

### Phase 1: Core Metrics (Minimal Viable Analytics)

1. **Session duration tracking** - Foundation metric
2. **Token usage display** (input/output) - Users care about this
3. **Estimated cost calculation** - Direct value demonstration
4. **Task completion count** - Basic productivity measure
5. **Persistent storage** (SQLite) - Required for any history
6. **Current session summary command** - `kilo stats` or `/stats`

### Phase 2: History and Export

7. **Historical session list with metrics** - Extend existing `/session list`
8. **Success/failure rate** - Requires outcome tracking
9. **Data export (JSON)** - Developer expectation
10. **Privacy controls** - User trust

### Phase 3: Differentiators

11. **Tool usage breakdown** - Unique value
12. **Per-project analytics** - Practical organization
13. **Productivity trend visualization** - Insights over time

**Defer to post-MVP:**

- HTML export (nice-to-have)
- Cost projections/budgets (requires usage history first)
- Interactive live dashboard (high complexity)
- Task categorization (AI complexity)
- Token efficiency scoring (needs task outcome correlation)

---

## Competitive Landscape

| Tool         | Focus                   | Local/Cloud              | CLI Support   | Relevant Features                         |
| ------------ | ----------------------- | ------------------------ | ------------- | ----------------------------------------- |
| **Langfuse** | LLM observability       | Cloud (self-host option) | No native CLI | Token tracking, cost, latency, breakdowns |
| **Helicone** | LLM monitoring          | Cloud (OSS)              | No native CLI | Costs, user analytics, session tracking   |
| **PostHog**  | Product analytics + LLM | Cloud (self-host)        | No native CLI | LLM metrics + product analytics           |
| **toktop**   | Terminal token monitor  | Local                    | CLI native    | Real-time token/cost in terminal          |

### Competitive Insight

No existing tool combines:

- Local-first privacy
- CLI-native experience
- AI coding assistant-specific metrics (tool usage)
- Productivity focus (not just observability)

This is the gap Kilo Code can fill.

---

## Sources

**HIGH Confidence:**

- Existing Kilo Code CLI codebase (`cli/src/commands/session.ts`, `cli/README.md`)
- PROJECT.md requirements document

**MEDIUM Confidence (WebSearch verified):**

- Langfuse documentation and features (langfuse.com)
- Helicone features and analytics (helicone.ai)
- CLI analytics dashboard best practices (multiple sources: uxpin.com, toptal.com)
- Developer productivity metrics 2025 (linearb.io, getdx.com)
- AI coding assistant usage analytics (thenewstack.io, jellyfish.co, getdx.com)
- Privacy-first analytics patterns (simpleanalytics.com, matomo.org)
- LLM token monitoring tools (toktop, Langfuse, Arize Phoenix)

**LOW Confidence:**

- Terminal visualization patterns (limited specific sources found)
- ASCII chart libraries for analytics (training data, not verified)
