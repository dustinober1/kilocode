# Technology Stack

**Analysis Date:** 2026-01-17

## Languages

**Primary:**

- TypeScript 5.8.3 / 5.9.3 - All application code, extension, CLI, web apps, packages

**Secondary:**

- Kotlin/Java - JetBrains plugin (`jetbrains/plugin/`)
- JavaScript (ESM) - Build scripts, configuration files

## Runtime

**Environment:**

- Node.js 20.19.2 (enforced in `package.json` engines)

**Package Manager:**

- pnpm 10.8.1 (enforced via `packageManager` field)
- Lockfile: `pnpm-lock.yaml` (present)

## Monorepo Structure

**Workspace Configuration:**

- `pnpm-workspace.yaml` defines workspace packages
- Turborepo (`turbo.json`) orchestrates builds, tests, and tasks

**Workspace Packages:**

- `src/` - Main VS Code extension (kilo-code)
- `webview-ui/` - React webview for VS Code sidebar
- `cli/` - Terminal UI (@kilocode/cli)
- `packages/*` - Shared packages (@roo-code/_, @kilocode/_)
- `apps/*` - Web apps and E2E test suites
- `jetbrains/host/` - Node.js host for JetBrains plugin
- `jetbrains/plugin/` - Kotlin/Gradle JetBrains plugin

## Frameworks

**VS Code Extension:**

- VS Code Extension API ^1.84.0 - Extension host
- esbuild ^0.25.0 - Bundling

**Webview UI:**

- React 18.3.1 - UI framework
- Vite 6.3.6 - Build tool
- Tailwind CSS 4.0.0 - Styling
- Radix UI - Component primitives
- Jotai 2.15.2 - State management
- TanStack React Query 5.68.0 - Data fetching

**CLI:**

- Ink 6.6.0 - React-based terminal UI
- React 19.2.3 - UI framework
- Commander 14.0.2 - CLI argument parsing
- Jotai 2.16.1 - State management

**Web Apps:**

- Next.js ~15.2.8 - Web framework (`apps/web-roo-code/`)
- Docusaurus 3.x - Documentation site (`apps/kilocode-docs/`)

**JetBrains Plugin:**

- Gradle - Build system
- Kotlin - Plugin language
- IntelliJ Platform SDK - IDE integration

**Testing:**

- Vitest ^3.2.3 - Unit testing (all packages)
- Playwright - E2E testing (`apps/playwright-e2e/`)
- @vscode/test-electron ^2.5.2 - VS Code E2E testing
- Testing Library (React, Jest-DOM) - Component testing
- Storybook 8.6.15 - Component development (`apps/storybook/`)

**Build/Dev:**

- Turborepo ^2.6.0 - Monorepo task runner
- esbuild ^0.25.0 - TypeScript bundling
- tsup ^8.4.0 - Library bundling
- Vite 6.3.6 - Webview bundling
- tsx ^4.19.3 - TypeScript execution

## Key Dependencies

**AI/LLM SDKs:**

- `@anthropic-ai/sdk` ^0.51.0 / ^0.71.2 - Anthropic Claude API
- `@anthropic-ai/bedrock-sdk` ^0.22.0 / ^0.26.0 - AWS Bedrock Claude
- `@anthropic-ai/vertex-sdk` ^0.11.3 / ^0.14.0 - Google Vertex Claude
- `openai` ^5.12.2 / ^6.16.0 - OpenAI API (and compatible providers)
- `@google/genai` ^1.29.1 / ^1.35.0 - Google Gemini API
- `@mistralai/mistralai` ^1.9.18 / ^1.11.0 - Mistral AI
- `@cerebras/cerebras_cloud_sdk` ^1.35.0 - Cerebras
- `@lmstudio/sdk` ^1.1.1 / ^1.5.0 - LM Studio local models
- `ollama` ^0.5.17 / ^0.6.3 - Ollama local models
- `@sap-ai-sdk/foundation-models` ^2.2.0 - SAP AI Core

**MCP (Model Context Protocol):**

- `@modelcontextprotocol/sdk` ^1.24.0 / ^1.25.2 - MCP server integration

**Vector/Embedding:**

- `@lancedb/lancedb` ^0.21.2 - Vector database
- `@qdrant/js-client-rest` ^1.14.0 / ^1.16.2 - Qdrant vector DB

**Tokenization:**

- `tiktoken` ^1.0.21 / ^1.0.22 - OpenAI tokenizer
- `js-tiktoken` ^1.0.8 - JavaScript tokenizer

**Code Analysis:**

- `web-tree-sitter` ^0.25.6 / ^0.26.3 - Syntax parsing
- `tree-sitter-wasms` ^0.1.12 / ^0.1.13 - Language grammars
- `shiki` ^3.2.1 / ^3.21.0 - Syntax highlighting

**Web Scraping/Browser:**

- `puppeteer-core` ^23.4.0 / ^24.34.0 - Browser automation
- `cheerio` ^1.0.0 / ^1.1.2 - HTML parsing
- `jsdom` ^26.0.0 / ^27.4.0 - DOM emulation
- `turndown` ^7.2.0 / ^7.2.2 - HTML to Markdown

**Git:**

- `simple-git` ^3.27.0 / ^3.30.0 - Git operations

**Realtime Communication:**

- `socket.io-client` ^4.8.1 / ^4.8.3 - WebSocket client

**Validation:**

- `zod` ^3.25.61 / ^4.3.5 - Schema validation

**Utilities:**

- `axios` ^1.12.0 / ^1.13.2 - HTTP client
- `fast-deep-equal` ^3.1.3 - Object comparison
- `lru-cache` ^11.1.0 - Caching
- `p-limit`, `p-map`, `p-retry` - Async control flow
- `uuid` ^11.1.0 / ^13.0.0 - UUID generation

## Configuration

**TypeScript:**

- Base config: `@roo-code/config-typescript` (workspace package)
- `tsconfig.json` in each package extends base config

**ESLint:**

- Base config: `@roo-code/config-eslint` (workspace package)
- ESLint 9.27.0 with flat config

**Prettier:**

- Prettier 3.4.2 - Code formatting
- Configured via `lint-staged` in root `package.json`

**Environment:**

- `.env.sample` defines required environment variables
- `@dotenvx/dotenvx` for development env loading
- Key variables: `POSTHOG_API_KEY`, `CLERK_BASE_URL`, `ROO_CODE_API_URL`

**Build:**

- `esbuild.mjs` - Extension bundling script
- `turbo.json` - Task orchestration
- `pnpm-workspace.yaml` - Workspace definition

## Platform Requirements

**Development:**

- Node.js 20.19.2+
- pnpm 10.8.1+
- Git
- VS Code (for extension development)
- JDK 21 (for JetBrains plugin development)

**VS Code Extension:**

- VS Code ^1.84.0
- Works on Windows, macOS, Linux

**JetBrains Plugin:**

- IntelliJ-based IDEs 2024.1+
- Node.js runtime (bundled)

**CLI:**

- Node.js 20.19.2+
- Terminal with 256-color support

**Production:**

- VS Code Marketplace (extension)
- Open VSX Registry (extension)
- JetBrains Marketplace (plugin)
- npm registry (@kilocode/cli)

## CI/CD

**GitHub Actions Workflows:**

- `code-qa.yml` - Linting, type checking, testing
- `marketplace-publish.yml` - VS Code & JetBrains publishing
- `cli-publish.yml` - CLI npm publishing
- `changeset-release.yml` - Version management
- `evals.yml` - AI evaluation runs

**Build Caching:**

- Turborepo remote caching (TURBO_TOKEN, TURBO_TEAM)
- GitHub Actions cache for dependencies

**Changesets:**

- `@changesets/cli` for version management
- `@changesets/changelog-github` for changelog generation

---

_Stack analysis: 2026-01-17_
