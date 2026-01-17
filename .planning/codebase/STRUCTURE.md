# Codebase Structure

**Analysis Date:** 2026-01-17

## Directory Layout

```
kilocode/
├── .changeset/               # Changesets for version management
├── .devcontainer/            # Dev container configuration
├── .github/                  # GitHub workflows and scripts
├── .husky/                   # Git hooks
├── .vscode/                  # VS Code workspace settings
├── apps/                     # Standalone applications
│   ├── kilocode-docs/        # Docusaurus documentation site
│   ├── playwright-e2e/       # E2E tests with Playwright
│   ├── storybook/            # Component storybook
│   ├── vscode-e2e/           # VS Code extension E2E tests
│   ├── vscode-nightly/       # Nightly build variant
│   ├── web-evals/            # Evaluation web interface
│   └── web-roo-code/         # Web application
├── benchmark/                # Performance benchmarks
├── cli/                      # Terminal CLI application
├── jetbrains/                # JetBrains IDE plugin
│   ├── host/                 # Node.js host for extension
│   └── plugin/               # Kotlin Gradle plugin
├── launch/                   # Launch configurations
├── packages/                 # Shared packages
│   ├── build/                # Build utilities
│   ├── cloud/                # Cloud service integration
│   ├── config-eslint/        # ESLint config
│   ├── config-typescript/    # TypeScript config
│   ├── core/                 # Platform-agnostic core
│   ├── core-schemas/         # Zod validation schemas
│   ├── evals/                # Evaluation framework
│   ├── ipc/                  # Inter-process communication
│   ├── telemetry/            # Telemetry service
│   └── types/                # Shared TypeScript types
├── releases/                 # Release artifacts
├── scripts/                  # Root-level scripts
├── src/                      # VS Code extension source
└── webview-ui/               # React webview UI
```

## Directory Purposes

**src/ (VS Code Extension):**

- Purpose: Main extension code for VS Code
- Contains: Extension entry, core logic, services, integrations
- Key files:
    - `extension.ts` - Extension entry point
    - `package.json` - Extension manifest with commands/settings
    - `core/` - Core business logic
    - `api/` - AI provider handlers
    - `services/` - Feature services (MCP, code index, ghost, etc.)
    - `shared/` - Shared utilities and types
    - `integrations/` - VS Code API integrations

**src/core/:**

- Purpose: Core extension logic
- Contains:
    - `webview/` - Webview provider and message handling
    - `task/` - Task lifecycle management
    - `tools/` - AI-executable tool implementations
    - `config/` - Configuration management
    - `prompts/` - System prompt generation
    - `kilocode/` - Kilo-specific features

**src/api/:**

- Purpose: AI model provider integrations
- Contains:
    - `index.ts` - Handler factory
    - `providers/` - Individual provider implementations
    - `transform/` - Response transformations

**src/services/:**

- Purpose: Feature-specific services
- Contains:
    - `mcp/` - Model Context Protocol support
    - `code-index/` - Codebase indexing and search
    - `ghost/` - Inline code suggestions
    - `browser/` - Puppeteer browser automation
    - `checkpoints/` - Git checkpoint management
    - `tree-sitter/` - Syntax parsing

**webview-ui/:**

- Purpose: React-based webview UI
- Contains:
    - `src/App.tsx` - Root component
    - `src/components/` - UI components
    - `src/hooks/` - Custom React hooks
    - `src/utils/` - Utility functions
    - `src/i18n/` - Translations

**cli/:**

- Purpose: Terminal-based CLI application
- Contains:
    - `src/index.ts` - CLI entry point
    - `src/cli.ts` - Main CLI logic
    - `src/commands/` - CLI command handlers
    - `src/ui/` - Ink React components
    - `src/services/` - CLI-specific services

**packages/:**

- Purpose: Shared packages across all platforms
- Contains:
    - `types/` - TypeScript types and interfaces
    - `core/` - Platform-agnostic utilities
    - `telemetry/` - Analytics and telemetry
    - `cloud/` - Cloud service integrations
    - `ipc/` - Inter-process communication

## Key File Locations

**Entry Points:**

- `src/extension.ts`: VS Code extension activation
- `cli/src/index.ts`: CLI entry point
- `webview-ui/src/index.tsx`: Webview React app
- `jetbrains/host/src/index.ts`: JetBrains host

**Configuration:**

- `package.json`: Root monorepo config
- `pnpm-workspace.yaml`: Workspace packages definition
- `turbo.json`: Turborepo task config
- `src/package.json`: Extension manifest
- `tsconfig.json` (various): TypeScript configs

**Core Logic:**

- `src/core/webview/ClineProvider.ts`: Main provider class
- `src/core/task/Task.ts`: AI conversation handler
- `src/core/config/ContextProxy.ts`: State management
- `src/api/index.ts`: API handler factory
- `src/shared/ExtensionMessage.ts`: Extension message types
- `src/shared/WebviewMessage.ts`: Webview message types

**Testing:**

- `src/__tests__/`: Extension unit tests
- `webview-ui/src/__tests__/`: UI component tests
- `apps/playwright-e2e/`: E2E tests
- `apps/vscode-e2e/`: VS Code E2E tests

## Naming Conventions

**Files:**

- Components: `PascalCase.tsx` (e.g., `ChatView.tsx`)
- Utilities: `camelCase.ts` (e.g., `getApiMetrics.ts`)
- Types: `PascalCase.ts` or `types.ts`
- Tests: `*.test.ts`, `*.spec.ts`, or in `__tests__/` directory
- Config: `*.config.ts`, `*.config.mjs`

**Directories:**

- Feature modules: `kebab-case` (e.g., `code-index/`, `commit-message/`)
- Component groups: `kebab-case` (e.g., `chat/`, `settings/`)
- Tests: `__tests__/` adjacent to source
- Mocks: `__mocks__/` adjacent to source

**Exports:**

- Classes: `PascalCase` (e.g., `ClineProvider`, `Task`)
- Functions: `camelCase` (e.g., `buildApiHandler`)
- Constants: `UPPER_SNAKE_CASE` or `camelCase`
- Types/Interfaces: `PascalCase` (e.g., `ExtensionMessage`)

## Where to Add New Code

**New AI Provider:**

1. Create handler in `src/api/providers/{provider-name}.ts`
2. Add to factory in `src/api/providers/index.ts`
3. Add types to `packages/types/src/provider.ts`
4. Add model info to `packages/types/src/model.ts`

**New Tool:**

1. Create tool class in `src/core/tools/{ToolName}Tool.ts`
2. Extend `BaseTool<"tool_name">` from `src/core/tools/BaseTool.ts`
3. Register in tool initialization logic
4. Add tool name to `ToolName` union in `packages/types/`

**New UI Component:**

1. Create component in `webview-ui/src/components/{feature}/{ComponentName}.tsx`
2. Add stories in `apps/storybook/stories/`
3. Export from feature index if needed

**New Service:**

1. Create service directory in `src/services/{service-name}/`
2. Add manager class and types
3. Initialize in `src/extension.ts` if needed
4. Add cleanup to `deactivate()` if stateful

**New CLI Command:**

1. Add command in `cli/src/commands/`
2. Register in `cli/src/cli.ts`
3. Add UI components in `cli/src/ui/` if needed

**New Shared Type:**

1. Add to appropriate file in `packages/types/src/`
2. Export from `packages/types/src/index.ts`
3. Rebuild types package if needed

## Special Directories

**.changeset/:**

- Purpose: Version changesets for releases
- Generated: Via `pnpm changeset` command
- Committed: Yes

**dist/ (various):**

- Purpose: Compiled/bundled output
- Generated: Via build commands
- Committed: No (gitignored)

**node_modules/:**

- Purpose: Installed dependencies
- Generated: Via `pnpm install`
- Committed: No (gitignored)

**.turbo/:**

- Purpose: Turborepo cache
- Generated: Via turbo commands
- Committed: No (gitignored)

**bin/:**

- Purpose: Built VSIX extension packages
- Generated: Via `pnpm vsix`
- Committed: No (gitignored)

**src/webview-ui/:**

- Purpose: Built webview assets copied from webview-ui
- Generated: Via webview-ui build
- Committed: No (gitignored, part of extension build)

---

_Structure analysis: 2026-01-17_
