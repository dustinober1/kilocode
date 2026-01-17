# Testing Patterns

**Analysis Date:** 2026-01-17

## Test Framework

**Runner:**

- Vitest `^3.2.3`
- Config files per package: `vitest.config.ts`
- Key configs:
    - `src/vitest.config.ts` - Main extension source
    - `webview-ui/vitest.config.ts` - React webview
    - `packages/core/vitest.config.ts` - Core package
    - `cli/vitest.config.ts` - CLI tool

**Assertion Library:**

- Vitest built-in assertions (`expect`)
- Globals enabled: `globals: true` in all configs

**Run Commands:**

```bash
pnpm test                                    # Run all tests via turbo
pnpm --filter @roo-code/core test           # Run specific package tests
npx vitest run src/api/providers/__tests__/openai.spec.ts  # Run single test file
```

## Test File Organization

**Location:**

- Co-located `__tests__/` directories alongside source code
- Pattern: `src/[module]/__tests__/[feature].spec.ts`

**Naming:**

- `.spec.ts` - Primary convention for unit and integration tests
- `.test.ts` - Alternative naming (both are supported)
- Files match: `**/*.spec.ts`, `**/*.test.ts`, `**/*.spec.tsx`

**Structure:**

```
src/
├── api/
│   └── providers/
│       ├── __tests__/
│       │   ├── anthropic.spec.ts
│       │   ├── openai.spec.ts
│       │   └── bedrock.spec.ts
│       └── openai.ts
├── core/
│   └── task/
│       ├── __tests__/
│       │   ├── Task.dispose.test.ts
│       │   └── Task.throttle.test.ts
│       └── Task.ts
└── __tests__/
    ├── commands.spec.ts
    └── common-mocks.ts
```

## Test Structure

**Suite Organization:**

```typescript
// npx vitest run path/to/file.spec.ts  <-- Include run command as comment

import { MyClass } from "../my-class"
import { ApiHandlerOptions } from "../../../shared/api"

// Mock external dependencies at top level
vitest.mock("@anthropic-ai/sdk", () => { ... })

describe("MyClass", () => {
    let instance: MyClass
    let mockOptions: ApiHandlerOptions

    beforeEach(() => {
        mockOptions = {
            apiKey: "test-api-key",
            apiModelId: "test-model",
        }
        instance = new MyClass(mockOptions)
        vitest.clearAllMocks()
    })

    describe("methodName", () => {
        it("should handle expected case", async () => {
            // Arrange
            const input = "test"

            // Act
            const result = await instance.method(input)

            // Assert
            expect(result).toBe("expected")
        })

        it("should handle edge case", async () => { ... })
    })

    describe("error handling", () => {
        it("should throw on invalid input", async () => {
            await expect(async () => {
                for await (const _chunk of stream) { }
            }).rejects.toThrow("Expected error")
        })
    })
})
```

**Patterns:**

- Setup pattern: `beforeEach` for instance creation and mock clearing
- Teardown pattern: `afterEach` for cleanup when needed
- Assertion pattern: `expect(actual).toBe(expected)` or `expect(actual).toEqual(expected)`

## Mocking

**Framework:** Vitest built-in mocking (`vi.mock`, `vi.fn`)

**Module Mocking Pattern:**

```typescript
// Mock at module level before imports
vitest.mock("@anthropic-ai/sdk", () => {
    const mockAnthropicConstructor = vitest.fn().mockImplementation(() => ({
        messages: {
            create: mockCreate.mockImplementation(async (options) => {
                if (!options.stream) {
                    return { id: "test-completion", content: [...] }
                }
                return {
                    async *[Symbol.asyncIterator]() {
                        yield { type: "message_start", message: {...} }
                        yield { type: "content_block_delta", delta: {...} }
                    },
                }
            }),
        },
    }))
    return { Anthropic: mockAnthropicConstructor }
})
```

**Factory Function Mocking:**

```typescript
vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn(() => ({
		getModel: () => ({ info: {}, id: "test-model" }),
	})),
}))
```

**What to Mock:**

- External SDK clients (Anthropic, OpenAI, etc.)
- VSCode API (`vscode` module)
- Network requests (axios, fetch)
- File system operations (`fs/promises`)
- TelemetryService
- MCP SDK clients

**What NOT to Mock:**

- The code under test
- Pure utility functions (unless complex)
- Simple data transformations

## VSCode Mocking

**Global Mock File:** `src/__mocks__/vscode.js`

**Pattern:**

```javascript
// Mock VSCode API for Vitest tests
const mockEventEmitter = () => ({
    event: () => () => {},
    fire: () => {},
    dispose: () => {},
})

export const workspace = {
    workspaceFolders: [],
    getWorkspaceFolder: () => null,
    getConfiguration: () => ({
        get: (key, defaultValue) => defaultValue,
    }),
    // ... more mock methods
}

export const window = {
    activeTextEditor: null,
    showErrorMessage: () => Promise.resolve(),
    createOutputChannel: () => ({ appendLine: () => {}, ... }),
    // ... more mock methods
}

export default { workspace, window, commands, languages, ... }
```

**Vitest Config Alias:**

```typescript
// src/vitest.config.ts
resolve: {
    alias: {
        vscode: path.resolve(__dirname, "./__mocks__/vscode.js"),
    },
},
```

## Fixtures and Factories

**Test Data:**

```typescript
// Inline fixtures for simple cases
const mockOptions: ApiHandlerOptions = {
	openAiApiKey: "test-api-key",
	openAiModelId: "gpt-4",
	openAiBaseUrl: "https://api.openai.com/v1",
}

// Factory functions for complex objects
export function createMockContext() {
	const globalState: Record<string, string | undefined> = {
		mode: "architect",
		currentApiConfigName: "current-config",
	}
	return {
		extensionPath: "/test/path",
		globalState: {
			get: vi.fn().mockImplementation((key: string) => globalState[key]),
			update: vi.fn().mockImplementation((key: string, value: string) => (globalState[key] = value)),
		},
		// ... more properties
	} as unknown as vscode.ExtensionContext
}
```

**Shared Mocks File:** `src/__tests__/common-mocks.ts`

**Location:**

- Inline in test files for simple fixtures
- `__tests__/common-mocks.ts` for shared setup
- `__fixtures__/` directories for external test data files

**Fixture Files:**

```
src/api/providers/fetchers/__tests__/fixtures/
├── lmstudio-model-details.json
├── ollama-model-details.json
├── openrouter-model-endpoints.json
└── openrouter-models.json
```

## Coverage

**Requirements:** Not enforced (no coverage thresholds configured)

**View Coverage:**

```bash
# CLI package has coverage configured
pnpm --filter @kilocode/cli test -- --coverage
```

**Coverage Config (CLI):**

```typescript
coverage: {
    provider: "v8",
    reporter: ["text", "json", "html"],
    exclude: ["node_modules/**", "dist/**", "integration-tests/**", "**/*.test.ts", "**/*.config.*"],
},
```

## Test Types

**Unit Tests:**

- Scope: Single function or class method
- Location: `__tests__/` adjacent to source
- Pattern: Mock all external dependencies
- Example: `src/api/providers/__tests__/openai.spec.ts`

**Integration Tests:**

- Scope: Multiple components working together
- Location: `integration-tests/` directory (CLI) or `__tests__/` with broader scope
- Pattern: Minimal mocking, test real interactions
- Example: `cli/integration-tests/**/*.test.ts`

**E2E Tests:**

- Framework: Playwright
- Location: `apps/playwright-e2e/`, `apps/vscode-e2e/`
- Run command: `pnpm playwright`
- Separate from unit tests, run via turbo task

## Common Patterns

**Async Testing:**

```typescript
it("should handle streaming responses", async () => {
	const stream = handler.createMessage(systemPrompt, messages)
	const chunks: any[] = []
	for await (const chunk of stream) {
		chunks.push(chunk)
	}

	expect(chunks.length).toBeGreaterThan(0)
	const textChunks = chunks.filter((chunk) => chunk.type === "text")
	expect(textChunks).toHaveLength(1)
})
```

**Error Testing:**

```typescript
it("should handle API errors", async () => {
	mockCreate.mockRejectedValueOnce(new Error("API Error"))

	const stream = handler.createMessage("system prompt", testMessages)

	await expect(async () => {
		for await (const _chunk of stream) {
			// Should not reach here
		}
	}).rejects.toThrow("API Error")
})
```

**Mock Verification:**

```typescript
it("should call API with correct parameters", async () => {
	const stream = handler.createMessage(systemPrompt, messages)
	for await (const _chunk of stream) {
	}

	expect(mockCreate).toHaveBeenCalledWith(
		expect.objectContaining({
			model: "gpt-4",
			stream: true,
			stream_options: { include_usage: true },
		}),
		{},
	)
})
```

**Testing Tool Calls:**

```typescript
it("should handle tool calls in streaming mode", async () => {
	mockCreate.mockImplementation(async () => ({
		[Symbol.asyncIterator]: async function* () {
			yield {
				choices: [
					{
						delta: {
							tool_calls: [{ index: 0, id: "call_1", function: { name: "test", arguments: "{}" } }],
						},
					},
				],
			}
		},
	}))

	const chunks: any[] = []
	for await (const chunk of handler.createMessage("system", [])) {
		chunks.push(chunk)
	}

	const toolCallChunks = chunks.filter((c) => c.type === "tool_call_partial")
	expect(toolCallChunks).toHaveLength(1)
})
```

## Test Setup Files

**Global Setup:** `src/vitest.setup.ts`

```typescript
import nock from "nock"
import "./utils/path" // Enable String.prototype.toPosix()

// Disable network requests by default
nock.disableNetConnect()

export function allowNetConnect(host?: string | RegExp) {
	if (host) {
		nock.enableNetConnect(host)
	} else {
		nock.enableNetConnect()
	}
}

// Global mocks
global.structuredClone = global.structuredClone || ((obj) => JSON.parse(JSON.stringify(obj)))
```

**Webview Setup:** `webview-ui/vitest.setup.ts`

- jsdom environment
- Path aliases for `@/`, `@src/`, `@roo/`
- Mocked vscode module

## Environment-Specific Configuration

**Main Extension (`src/vitest.config.ts`):**

```typescript
test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts", "./services/continuedev/core/test/vitest.setup.ts"],
    globalSetup: "./services/continuedev/core/test/vitest.global-setup.ts",
    watch: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
},
resolve: {
    alias: {
        vscode: path.resolve(__dirname, "./__mocks__/vscode.js"),
    },
},
```

**Webview (`webview-ui/vitest.config.ts`):**

```typescript
test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    retry: process.env.CI ? 2 : 0,  // Retry in CI
},
```

**CLI (`cli/vitest.config.ts`):**

```typescript
test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "integration-tests/**/*.test.ts"],
    testTimeout: 30000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },  // Sequential execution
    environment: "node",
},
```

**Packages (`packages/core/vitest.config.ts`):**

```typescript
test: {
    globals: true,
    environment: "node",
    watch: false,
},
```

---

_Testing analysis: 2026-01-17_
