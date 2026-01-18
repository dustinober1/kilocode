<!-- kilocode_change - new file -->

# TODO: File-based prompts/hooks for Kilo Code CLI

Add file-based variants of existing prompt flags so `--auto`/CI users can avoid shell quoting and keep prompts in versioned files.

## Goals

- Add `--prompt-file <path>` to load the initial prompt from a file.
- Add `--append-system-prompt-file <path>` to load extra system instructions from a file.
- Add `--on-task-completed-file <path>` to load the follow-up prompt from a file.
- Keep behavior predictable with explicit precedence/conflict errors.
- Add Vitest coverage and update CLI docs + changeset.

## Proposed CLI semantics (recommended)

### `--prompt-file <path>`

- Reads UTF-8 text from `<path>` and uses it as the initial prompt.
- Conflicts:
    - Error if both positional `[prompt]` and `--prompt-file` are provided.
- Interaction with stdin:
    - Only use piped stdin as prompt when **all** are true:
        - no positional `[prompt]`
        - no `--prompt-file`
        - `--auto` is enabled
        - stdin is piped (`!process.stdin.isTTY`)
        - `--json-io` is **not** enabled (stdin reserved for JSON messages)

### `--append-system-prompt-file <path>`

- Reads UTF-8 text from `<path>` and passes it through as `appendSystemPrompt`.
- Conflicts:
    - Error if both `--append-system-prompt` and `--append-system-prompt-file` are provided.
- Empty file:
    - Allowed; treat as “no extra system prompt” (same as empty string today).

### `--on-task-completed-file <path>`

- Reads UTF-8 text from `<path>` and passes it through as `onTaskCompleted`.
- Conflicts:
    - Error if both `--on-task-completed` and `--on-task-completed-file` are provided.
- Validation:
    - Must require `--auto` (same as `--on-task-completed`).
    - Must be non-empty/whitespace-only.
    - Must respect existing max length (50,000 chars) by reusing `validateOnTaskCompletedPrompt`.

## UX examples (for docs + manual testing)

```bash
# Initial prompt from file (CI-friendly)
kilocode --auto --prompt-file .kilocode/prompts/fix-build.md --timeout 600

# Append system instructions from file
kilocode --append-system-prompt-file .kilocode/system/ci-rules.md

# Follow-up action from file
kilocode --auto "Implement feature X" --on-task-completed-file .kilocode/hooks/create-pr.md

# JSON-IO mode: stdin is for JSON messages; prompt must come from arg or file
kilocode --json-io --prompt-file .kilocode/prompts/task.md
```

## Implementation TODOs

### 1) Add prompt file utilities (testable)

- [ ] Create `cli/src/utils/promptFiles.ts`:
    - [ ] `readUtf8File(filePath: string): Promise<string>`
        - [ ] Trim a UTF-8 BOM if present.
        - [ ] Throw a clear error if file doesn’t exist / can’t be read.
    - [ ] `resolveExclusiveTextOrFile(params): Promise<string | undefined>`
        - [ ] Enforce “text XOR file” rule with good error messages (include both flag names).
    - [ ] `resolveInitialPrompt(params): Promise<string>`
        - [ ] Enforce “positional arg XOR --prompt-file”.
        - [ ] Implement stdin-as-prompt rules (auto-only, no json-io).
        - [ ] Return a final prompt string (may be empty if interactive run with no prompt).

### 2) Wire new Commander flags

- [ ] Update `cli/src/index.ts`:
    - [ ] Add flags:
        - [ ] `--prompt-file <path>`
        - [ ] `--append-system-prompt-file <path>`
        - [ ] `--on-task-completed-file <path>`
    - [ ] Use the resolver utilities to compute:
        - [ ] `finalPrompt` (from arg/file/stdin)
        - [ ] `appendSystemPrompt` (from flag/file)
        - [ ] `onTaskCompleted` (from flag/file)
    - [ ] Keep existing validations, but ensure:
        - [ ] stdin prompt reading does not run when `--json-io` is enabled
        - [ ] `--on-task-completed` validations apply equally to the file variant

### 3) Tests (Vitest)

- [ ] Add `cli/src/__tests__/prompt-files.test.ts`:
    - [ ] `readUtf8File` strips BOM.
    - [ ] `resolveExclusiveTextOrFile`:
        - [ ] returns text when only text provided
        - [ ] returns file content when only file provided
        - [ ] errors when both provided
    - [ ] `resolveInitialPrompt`:
        - [ ] errors when arg + file provided
        - [ ] reads from file when provided
        - [ ] reads from stdin only when `--auto` and not `--json-io`
        - [ ] does not read from stdin when `--json-io` (spy a `readStdin` callback)
    - [ ] `--on-task-completed-file` content validated via `validateOnTaskCompletedPrompt`

### 4) Docs + release metadata

- [ ] Update `cli/README.md`:
    - [ ] Add examples for `--prompt-file`, `--append-system-prompt-file`, `--on-task-completed-file`.
    - [ ] Mention `--json-io` stdin is reserved for JSON messages.
- [ ] Add a changeset:
    - [ ] `.changeset/<name>.md` with:
        - [ ] `"@kilocode/cli": patch`
        - [ ] One-line user-facing description (e.g., “Add file-based prompt flags for CI-friendly usage.”)

## Acceptance checklist

- [ ] All three flags are available in `kilocode --help`.
- [ ] Conflicts produce clear non-zero exits and actionable error messages.
- [ ] `--json-io` never consumes stdin as a prompt.
- [ ] Existing behavior (arg prompt + piped stdin prompt for `--auto`) remains unchanged when new flags aren’t used.
- [ ] Tests pass: `cd cli && pnpm test`.

## Suggested validation commands (when you implement)

```bash
cd cli
pnpm test src/__tests__/prompt-files.test.ts
pnpm test
pnpm lint
pnpm check-types
```
