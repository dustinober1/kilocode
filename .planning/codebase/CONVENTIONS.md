# Coding Conventions

**Analysis Date:** 2026-01-17

## Naming Patterns

**Files:**

- TypeScript source files: `camelCase.ts` (e.g., `anthropicApiKeyWarning.ts`, `webviewMessageHandler.ts`)
- Test files: `*.spec.ts` or `*.test.ts` co-located with source or in `__tests__/` directories
- React components: `PascalCase.tsx` (e.g., `ClineProvider.tsx`, `ChatRow.tsx`)
- Configuration files: `kebab-case` (e.g., `eslint.config.mjs`, `vitest.config.ts`)

**Functions:**

- Use `camelCase` for all functions: `handleProviderError`, `createMockContext`, `checkAnthropicApiKeyConflict`
- Prefix boolean-returning functions with `is`, `has`, `should`: `isRouterName`, `hasInstance`, `shouldUseReasoningBudget`
- Prefix async functions that fetch data with `get` or `fetch`: `getOpenAiModels`, `fetchBlobFromSignedUrl`

**Variables:**

- Use `camelCase` for variables and constants: `mockOptions`, `systemPrompt`, `testCwd`
- Use `SCREAMING_SNAKE_CASE` for true constants/enums: `ANTHROPIC_DEFAULT_MAX_TOKENS`, `DEFAULT_WRITE_DELAY_MS`
- Prefix mock variables with `mock`: `mockCreate`, `mockContext`, `mockProvider`

**Types:**

- Use `PascalCase` for all types, interfaces, and classes: `ApiHandlerOptions`, `ModelRecord`, `ClineProvider`
- Suffix type exports with descriptive names: `RouterName`, `ProviderSettings`, `CustomToolDefinition`

## Code Style

**Formatting:**

- Tool: Prettier (`^3.4.2`)
- Config: `.prettierrc.json`
- Key settings:
    - `tabWidth`: 4
    - `useTabs`: true
    - `printWidth`: 120
    - `semi`: false (no semicolons)
    - `bracketSameLine`: true

**Linting:**

- Tool: ESLint 9 with flat config (`eslint.config.mjs`)
- Shared config: `@roo-code/config-eslint` at `packages/config-eslint/base.js`
- Key rules:
    - TypeScript ESLint recommended rules enabled
    - Unused vars allowed if prefixed with `_`: `argsIgnorePattern: "^_"`
    - Prettier integration via `eslint-config-prettier`
    - All warnings (not errors) via `eslint-plugin-only-warn`
    - Turbo plugin for monorepo awareness

**Pre-commit Hooks:**

- Husky pre-commit: runs `lint-staged` (Prettier on staged files) then `pnpm lint`
- Direct commits to `main` branch are blocked

## Import Organization

**Order:**

1. External packages (npm dependencies): `import Anthropic from "@anthropic-ai/sdk"`
2. Workspace packages: `import { TelemetryService } from "@roo-code/telemetry"`
3. Relative imports (local files): `import { Task } from "../Task"`

**Path Aliases:**

- `@roo-code/types` - Shared type definitions (workspace package)
- `@roo-code/telemetry` - Telemetry service (workspace package)
- `@roo-code/cloud` - Cloud services (workspace package)
- `@roo-code/config-eslint` - Shared ESLint config (workspace package)
- Webview uses `@/`, `@src/`, `@roo/` aliases defined in `webview-ui/vitest.config.ts`

**Workspace Package Imports:**

```typescript
// Types from shared package
import { type ModelInfo, type ProviderSettings, ANTHROPIC_DEFAULT_MAX_TOKENS } from "@roo-code/types"

// Service from telemetry package
import { TelemetryService } from "@roo-code/telemetry"
```

## Error Handling

**Patterns:**

- Use centralized error handler: `src/api/providers/utils/error-handler.ts`
- Always preserve HTTP status codes for UI-aware error display
- Wrap errors with provider context: `handleProviderError(error, "OpenAI")`
- Log original error details before wrapping for debugging
- Preserve metadata fields: `status`, `errorDetails`, `code`, `$metadata`

**Error Handler Usage:**

```typescript
import { handleProviderError } from "../utils/error-handler"

try {
    await apiClient.createMessage(...)
} catch (error) {
    throw handleProviderError(error, "OpenAI")
}
```

**User-Facing Warnings:**

```typescript
// Pattern from src/utils/anthropicApiKeyWarning.ts
vscode.window.showWarningMessage(msg, "More Info", "Got it").then((choice) => {
	if (choice === "More Info") {
		vscode.env.openExternal(vscode.Uri.parse("https://github.com/..."))
	}
})
```

## Logging

**Framework:** Console-based logging with provider prefixes

**Patterns:**

```typescript
// Error logging with structured context
console.error(`[${providerName}] API error:`, {
	message: msg,
	name: error.name,
	stack: error.stack,
	status: anyErr.status,
})

// Non-Error exception logging
console.error(`[${providerName}] Non-Error exception:`, error)
```

## Comments

**When to Comment:**

- Use `// kilocode_change` markers for modifications to forked/external code
- Use `// kilocode_change start` and `// kilocode_change_end` for multi-line changes
- Include JSDoc for public API functions with `@param`, `@returns`, `@example`

**JSDoc Pattern:**

```typescript
/**
 * Handles API provider errors and transforms them into user-friendly messages
 * while preserving important metadata for retry logic and UI display.
 *
 * @param error - The error to handle
 * @param providerName - The name of the provider for context in error messages
 * @param options - Optional configuration for error handling
 * @returns A wrapped Error with preserved metadata (status, errorDetails, code)
 *
 * @example
 * try {
 *   await apiClient.createMessage(...)
 * } catch (error) {
 *   throw handleProviderError(error, "OpenAI")
 * }
 */
```

**TODO Comments:**

- Format: `// TODO: Description of what needs to be done`
- ESLint config acknowledges some rules are disabled with `// TODO: These should be fixed and the rules re-enabled.`

## Function Design

**Size:** Functions should be focused and single-purpose. Large switch statements are acceptable for message handling (e.g., webview message handlers).

**Parameters:**

- Use options objects for functions with many parameters
- Destructure options in function signature when appropriate
- Prefix unused parameters with `_`: `_provider`, `_apiConfiguration`

**Return Values:**

- Return early for guard clauses
- Use `undefined` for "not found" cases (not `null`)
- Async generators use `yield` for streaming responses

**Example:**

```typescript
export function handleProviderError(
	error: unknown,
	providerName: string,
	options?: {
		messagePrefix?: string
		messageTransformer?: (msg: string) => string
	},
): Error {
	const messagePrefix = options?.messagePrefix || "completion"
	// ... implementation
}
```

## Module Design

**Exports:**

- Prefer named exports over default exports
- Export types alongside implementations
- Use `export type` for type-only exports

**Barrel Files:**

- Package entry points defined in `package.json` `exports` field
- Example: `packages/core/package.json` has `"exports": "./src/index.ts"`

**Module Structure:**

```typescript
// Imports first
import { ... } from "@roo-code/types"

// Type exports
export type ApiHandlerOptions = Omit<ProviderSettings, "apiProvider"> & { ... }

// Constants
export const isRouterName = (value: string): value is RouterName => ...

// Functions
export function toRouterName(value?: string): RouterName { ... }
```

## TypeScript Configuration

**Compiler Options (from `src/tsconfig.json`):**

- `strict`: true
- `target`: ES2022
- `module`: esnext
- `moduleResolution`: Bundler
- `esModuleInterop`: true
- `noImplicitReturns`: true
- `noFallthroughCasesInSwitch`: true
- `types`: `["vitest/globals"]` for test globals

## Monorepo Patterns

**Package Manager:** pnpm 10.8.1 with workspaces
**Build Orchestration:** Turbo (`turbo.json`)

**Workspace Package References:**

```json
{
	"dependencies": {
		"@roo-code/types": "workspace:^",
		"@roo-code/telemetry": "workspace:^"
	}
}
```

**Scripts Pattern:**

- `lint`: ESLint via turbo
- `check-types`: TypeScript type checking via turbo
- `test`: Vitest via turbo
- `format`: Prettier via turbo
- `clean`: Remove build artifacts

---

_Convention analysis: 2026-01-17_
