# Architecture

**Analysis Date:** 2026-01-17

## Pattern Overview

**Overall:** Multi-Platform AI Coding Assistant - Monorepo with VSCode Extension Core

**Key Characteristics:**

- pnpm + Turborepo monorepo with multiple deployment targets (VSCode, CLI, JetBrains)
- Event-driven architecture with message passing between extension host and webview
- Provider/handler pattern for AI model integrations
- Tool-based execution model for AI agent capabilities
- Shared packages for cross-platform code reuse

## Layers

**Extension Host (VSCode API Layer):**

- Purpose: VS Code extension activation, commands, webview management
- Location: `src/`
- Contains: Extension entry point, VS Code integrations, core logic
- Depends on: `packages/*`, VS Code API
- Used by: VSCode, JetBrains (via wrapper), CLI (headless mode)

**Webview UI Layer:**

- Purpose: React-based user interface rendered in webview panel
- Location: `webview-ui/`
- Contains: React components, state management (Jotai), CSS
- Depends on: `@roo-code/types`, Radix UI, TailwindCSS
- Used by: Extension host via webview message protocol

**Shared Packages:**

- Purpose: Platform-agnostic code shared across all deployment targets
- Location: `packages/`
- Contains: Types, telemetry, cloud services, IPC, core utilities
- Depends on: Minimal external dependencies
- Used by: `src/`, `webview-ui/`, `cli/`, `jetbrains/`

**CLI Application:**

- Purpose: Terminal-based AI coding assistant using Ink (React for CLI)
- Location: `cli/`
- Contains: Terminal UI, command handlers, headless extension wrapper
- Depends on: `packages/*`, Ink, React
- Used by: End users via `kilocode` or `kilo` CLI commands

**JetBrains Plugin:**

- Purpose: JetBrains IDE integration via embedded Node.js host
- Location: `jetbrains/`
- Contains: Kotlin plugin (`plugin/`), Node.js host (`host/`)
- Depends on: `packages/*`, extension core
- Used by: IntelliJ IDEA, WebStorm, etc.

## Data Flow

**User Message to AI Response:**

1. User enters message in webview UI (`webview-ui/src/components/chat/`)
2. `vscode.postMessage()` sends `WebviewMessage` to extension host
3. `ClineProvider.handleMessage()` in `src/core/webview/ClineProvider.ts` receives message
4. `webviewMessageHandler` in `src/core/webview/webviewMessageHandler.ts` routes to handler
5. `Task` class in `src/core/task/Task.ts` orchestrates AI conversation
6. `ApiHandler` in `src/api/` sends request to configured provider
7. Response streams back, tools execute via `src/core/tools/`
8. State updates sent to webview via `ExtensionMessage`

**Tool Execution Flow:**

1. AI model returns tool use in response stream
2. `Task` parses tool use, validates with `src/core/tools/validateToolUse.ts`
3. Appropriate tool class (e.g., `WriteToFileTool`, `ExecuteCommandTool`) instantiated
4. Tool executes, may require user approval via ask/response pattern
5. Tool result formatted and added to conversation history
6. Conversation continues with tool result context

**State Management:**

- Extension host: `ContextProxy` in `src/core/config/ContextProxy.ts` wraps VSCode global/workspace state
- Webview: Jotai atoms for local React state, synced with extension via messages
- Persistence: Task history stored in `globalStorage`, provider settings in `ProviderSettingsManager`

## Key Abstractions

**ClineProvider:**

- Purpose: Main webview provider, manages extension state and task lifecycle
- Examples: `src/core/webview/ClineProvider.ts`
- Pattern: Singleton-like per view type (sidebar, tab panel)

**Task:**

- Purpose: Represents a single AI conversation/task session
- Examples: `src/core/task/Task.ts`
- Pattern: Event emitter, manages API handler and tool execution

**ApiHandler:**

- Purpose: Abstract interface for AI provider communication
- Examples: `src/api/providers/anthropic.ts`, `src/api/providers/openai.ts`
- Pattern: Strategy pattern - each provider implements common interface

**BaseTool:**

- Purpose: Abstract base for all AI-executable tools
- Examples: `src/core/tools/BaseTool.ts`
- Pattern: Template method pattern with common validation and execution flow

**ExtensionMessage / WebviewMessage:**

- Purpose: Type-safe message protocol between extension and webview
- Examples: `src/shared/ExtensionMessage.ts`, `src/shared/WebviewMessage.ts`
- Pattern: Discriminated union types for message routing

## Entry Points

**VSCode Extension:**

- Location: `src/extension.ts`
- Triggers: Extension activation on VS Code startup
- Responsibilities: Initialize services, register providers/commands, setup MCP

**CLI Entry:**

- Location: `cli/src/index.ts`
- Triggers: `kilocode` or `kilo` command execution
- Responsibilities: Parse args, initialize Ink app, manage headless extension

**Webview Entry:**

- Location: `webview-ui/src/index.tsx`
- Triggers: Webview panel creation by extension
- Responsibilities: React app bootstrap, establish message channel

**JetBrains Host:**

- Location: `jetbrains/host/src/index.ts`
- Triggers: JetBrains plugin activation
- Responsibilities: Bridge between Kotlin plugin and Node.js extension core

## Error Handling

**Strategy:** Multi-level error handling with user-facing feedback

**Patterns:**

- API errors: Caught in handlers, formatted as user messages with retry options
- Tool errors: Wrapped in structured responses, fed back to AI for correction
- Extension errors: Logged to output channel, graceful degradation
- User approval: Ask/response pattern for potentially dangerous operations

## Cross-Cutting Concerns

**Logging:**

- Output channel (`vscode.OutputChannel`) for extension logs
- `outputChannelLogger` utility for structured logging
- CLI has dedicated log file at `~/.kilocode/cli/logs/cli.txt`

**Validation:**

- Zod schemas in `packages/core-schemas/` for config validation
- `ProfileValidator` in `src/shared/ProfileValidator.ts` for provider settings
- Tool parameter validation in each tool class

**Authentication:**

- OAuth flows for cloud services in `src/integrations/claude-code/oauth.ts`
- Kilocode token management across profiles
- Device auth handler for CLI in `src/core/kilocode/webview/deviceAuthHandler.ts`

**Telemetry:**

- `TelemetryService` in `packages/telemetry/`
- PostHog client for analytics
- Configurable per user preferences

**Internationalization:**

- i18next for translations
- Language files in `src/i18n/` and `webview-ui/src/i18n/`
- VS Code NLS for extension manifest (`package.nls.*.json`)

---

_Architecture analysis: 2026-01-17_
