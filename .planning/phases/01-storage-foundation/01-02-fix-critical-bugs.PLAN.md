---
phase: 01-storage-foundation
plan: 02
type: execute
wave: 2
depends_on: ["01-01"]
files_modified:
    - cli/src/services/analytics/StorageService.ts
    - cli/src/services/analytics/__tests__/StorageService.test.ts
autonomous: false
gap_closure: true

must_haves:
    truths:
        - "Data persists across CLI process restarts without loss"
        - "Performance test accurately measures DB write time, not queue time"
    artifacts:
        - path: "cli/src/services/analytics/StorageService.ts"
          provides: "Async close() method that awaits flushEvents()"
          contains: "async close()"
        - path: "cli/src/services/analytics/__tests__/StorageService.test.ts"
          provides: "Performance test that measures actual DB insertion time"
          contains: "await flushEvents()"
    key_links:
        - from: "StorageService.close()"
          to: "flushEvents()"
          via: "await"
          pattern: "async close\\(\\).*await.*flushEvents"
        - from: "performance test"
          to: "database"
          via: "flushEvents() before timing"
          pattern: "await.*flushEvents.*Date\\.now"
---

<objective>
Fix critical data loss bug in close() method and clarify performance test to accurately measure database write time.

Purpose: The phase goal "survives CLI restarts" is currently blocked by close() not awaiting flushEvents(), causing data loss on every shutdown. The performance test is misleading as it measures queue time, not DB write time.
Output: Async close() method that guarantees data persistence, and accurate performance test that measures actual DB insertion time.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/01-storage-foundation/01-01-SUMMARY.md
@.planning/phases/01-storage-foundation/01-storage-foundation-VERIFICATION.md
@.planning/phases/01-storage-foundation/01-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Fix critical data loss bug in close() method</name>
  <files>cli/src/services/analytics/StorageService.ts</files>
  <action>
    1. Change close() method signature from `public close()` to `public async close()`
    2. Add `await` before `this.flushEvents()` call at line 117
    3. Ensure database connection closes AFTER flush completes

    Current broken code (line 116-118):
    ```typescript
    public close() {
        // Flush any remaining events
        this.flushEvents()  // ← MISSING AWAIT
        this.sqlite.close()
    }
    ```

    Required fix:
    ```typescript
    public async close() {
        // Flush any remaining events before closing
        await this.flushEvents()  // ← AWAIT REQUIRED
        this.sqlite.close()
    }
    ```

    WHY: flushEvents() is async but was called without await, causing the database to close before queued events were written to disk. This is a BLOCKER for the phase goal "survives CLI restarts."

  </action>
  <verify>
    grep -n "async close" cli/src/services/analytics/StorageService.ts
    grep -n "await.*flushEvents" cli/src/services/analytics/StorageService.ts
  </verify>
  <done>close() method is async and awaits flushEvents(), guaranteeing all queued events are written to database before shutdown</done>
</task>

<task type="auto">
  <name>Fix misleading performance test to measure actual DB write time</name>
  <files>cli/src/services/analytics/__tests__/StorageService.test.ts</files>
  <action>
    1. Locate the performance test around lines 108-135
    2. Add `await service.flushEvents()` AFTER `await service.insertEvents(events)` but BEFORE measuring duration
    3. Update test name/expectation to clarify it measures "actual DB insertion time" not "queue time"

    Current test (misleading):
    ```typescript
    const start = Date.now()
    await service.insertEvents(events)  // Only queues events
    const duration = Date.now() - start
    expect(duration).toBeLessThan(50)  // Tests queue speed, not DB write
    ```

    Fixed test:
    ```typescript
    await service.insertEvents(events)
    const start = Date.now()
    await service.flushEvents()  // Actually writes to DB
    const duration = Date.now() - start
    expect(duration).toBeLessThan(50)  // Now measures actual DB write
    ```

    WHY: The current test passes but doesn't verify the success criterion. insertEvents() only queues events, so <50ms measures queue time, not database insertion. By moving timing after flushEvents(), the test accurately measures DB write performance.

  </action>
  <verify>
    grep -A 5 "insertEvents.*events" cli/src/services/analytics/__tests__/StorageService.test.ts | grep -n "flushEvents"
  </verify>
  <done>Performance test now measures actual database insertion time (flushEvents) not queue time, providing accurate verification of <50ms target</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Fixed close() async bug and performance test. Requires manual verification on Node v20 LTS (tests cannot run on Node v25.2.1 due to better-sqlite3 native binding issues).
  </what-built>
  <how-to-verify>
    1. **Ensure Node v20 LTS:** Run `node --version` - if not v20, switch using nvm: `nvm use 20`
    2. **Run tests:** `cd cli && pnpm test StorageService`
    3. **Expected result:** All 5 tests pass, including:
       - Database creation at ~/.kilocode/analytics.db
       - WAL mode enabled
       - Data persists across restart (now that close() awaits)
       - WAL file exists
       - 1000 events insert in <50ms (now accurately measuring DB write time)
    4. **Verify actual persistence:** After tests pass, check that test database contains data: `sqlite3 ~/.kilocode/analytics.db "SELECT COUNT(*) FROM metric_events;"`
  </how-to-verify>
  <resume-signal>Type "approved" if all tests pass on Node v20, or describe any failures</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    StorageService with async close() and accurate performance test. Requires build verification to ensure native bindings work correctly.
  </what-built>
  <how-to-verify>
    1. **Build CLI:** `cd cli && pnpm build`
    2. **Install dist dependencies:** `pnpm deps:install`
    3. **Verify native bindings:** `ls -la dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
    4. **Expected result:** Native binding file present at dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node
    5. **Verify no 'database locked' with concurrent instances:**
       - Terminal 1: `kilo stats` (or any CLI command that uses analytics)
       - Terminal 2: `kilo stats` (while first is still running)
       - Expected: Both instances run without "database is locked" errors
  </how-to-verify>
  <resume-signal>Type "approved" if native bindings are present and concurrent instances work, or describe issues</resume-signal>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Fixed close() method that now properly awaits flushEvents(). Requires end-to-end verification of actual CLI restart persistence.
  </what-built>
  <how-to-verify>
    1. **Start CLI with analytics:** `kilo stats` (or any command that triggers StorageService)
    2. **Generate some activity:** Interact with CLI to create session/events
    3. **Exit CLI normally:** Ctrl+C or quit command
    4. **Restart CLI:** `kilo stats` again
    5. **Verify persistence:** Check that previous session data exists:
       - Via CLI UI if available, or
       - Directly: `sqlite3 ~/.kilocode/analytics.db "SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1;"`
    6. **Expected result:** Session and event data from previous CLI run is readable in new session
  </how-to-verify>
  <resume-signal>Type "approved" if data persists across restart, or describe what was lost</resume-signal>
</task>

</tasks>

<verification>
After all tasks complete, verify:
- [ ] close() method is async with `await this.flushEvents()`
- [ ] Performance test measures actual DB write time (flushEvents, not queue)
- [ ] All 5 StorageService tests pass on Node v20 LTS
- [ ] Native bindings present in dist/ after build
- [ ] No "database locked" errors with concurrent CLI instances
- [ ] Data actually persists after CLI restart (not just in memory)
</verification>

<success_criteria>

- **Critical gap closed:** close() method is async and awaits flushEvents(), eliminating data loss on shutdown
- **Warning gap closed:** Performance test now measures actual database insertion time, providing accurate verification
- **All automated tests pass:** 5/5 StorageService tests pass on Node v20 LTS
- **Build verified:** Native bindings compile and work in dist/
- **Concurrency verified:** Multiple CLI instances can access database without locking errors
- **End-to-end verified:** Real CLI restart scenario shows data persistence working
  </success_criteria>

<output>
After completion, create `.planning/phases/01-storage-foundation/01-02-fix-critical-bugs-SUMMARY.md`
</output>
