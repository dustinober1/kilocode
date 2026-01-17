# External Integrations

**Analysis Date:** 2026-01-17

## AI/LLM Providers

Kilo Code supports 40+ AI providers through a unified handler system. All handlers extend `BaseProvider` and implement the `ApiHandler` interface.

**Provider Handler Architecture:**

- Location: `src/api/providers/`
- Factory: `src/api/index.ts` - `buildApiHandler()`

### Direct API Providers

**Anthropic (Claude):**

- Handler: `src/api/providers/anthropic.ts`
- SDK: `@anthropic-ai/sdk`
- Auth: `ANTHROPIC_API_KEY` (user-provided via extension settings)
- Models: Claude 3.5, 3, 2 series

**OpenAI:**

- Handler: `src/api/providers/openai.ts`, `src/api/providers/openai-native.ts`
- SDK: `openai`
- Auth: `OPENAI_API_KEY` (user-provided)
- Models: GPT-4o, GPT-4, o1, o3-mini series

**Google Gemini:**

- Handler: `src/api/providers/gemini.ts`, `src/api/providers/gemini-cli.ts`
- SDK: `@google/genai`
- Auth: `GOOGLE_API_KEY` (user-provided)
- Models: Gemini 2.0, 1.5 series

**Mistral:**

- Handler: `src/api/providers/mistral.ts`
- SDK: `@mistralai/mistralai`
- Auth: `MISTRAL_API_KEY` (user-provided)
- Models: Mistral Large, Medium, Small

**xAI (Grok):**

- Handler: `src/api/providers/xai.ts`
- SDK: OpenAI-compatible
- Auth: `XAI_API_KEY` (user-provided)

**DeepSeek:**

- Handler: `src/api/providers/deepseek.ts`
- SDK: OpenAI-compatible
- Auth: `DEEPSEEK_API_KEY` (user-provided)

### Cloud Platform Providers

**AWS Bedrock:**

- Handler: `src/api/providers/bedrock.ts`
- SDK: `@anthropic-ai/bedrock-sdk`, `@aws-sdk/client-bedrock-runtime`
- Auth: AWS credentials (access key, secret, region, or profile)
- Features: VPC endpoints, custom ARNs, inference profiles

**Google Vertex AI:**

- Handler: `src/api/providers/vertex.ts`, `src/api/providers/anthropic-vertex.ts`
- SDK: `@anthropic-ai/vertex-sdk`, `@google/genai`
- Auth: Google Cloud service account or ADC

**SAP AI Core:**

- Handler: `src/api/providers/sap-ai-core.ts`
- SDK: `@sap-ai-sdk/foundation-models`, `@sap-ai-sdk/orchestration`
- Auth: SAP BTP credentials

### Aggregator/Router Providers

**OpenRouter:**

- Handler: `src/api/providers/openrouter.ts`
- SDK: OpenAI-compatible
- Auth: `OPENROUTER_API_KEY`
- Features: Multi-model routing

**KiloCode OpenRouter (Internal):**

- Handler: `src/api/providers/kilocode-openrouter.ts`
- Purpose: Kilo Code cloud service integration
- Auth: Kilo Code account authentication

**Roo Code Cloud:**

- Handler: `src/api/providers/roo.ts`
- Purpose: Managed cloud AI service
- Auth: Roo Code account

**LiteLLM:**

- Handler: `src/api/providers/lite-llm.ts`
- SDK: OpenAI-compatible
- Auth: User-configured proxy

**Requesty:**

- Handler: `src/api/providers/requesty.ts`
- SDK: OpenAI-compatible

### Local/Self-Hosted Providers

**Ollama:**

- Handler: `src/api/providers/native-ollama.ts`
- SDK: `ollama`
- Auth: None (local)
- Default URL: `http://localhost:11434`

**LM Studio:**

- Handler: `src/api/providers/lm-studio.ts`
- SDK: `@lmstudio/sdk`
- Auth: None (local)
- Features: Native SDK with OpenAI fallback

**VS Code Language Models:**

- Handler: `src/api/providers/vscode-lm.ts`
- SDK: VS Code Language Model API
- Auth: VS Code extensions (e.g., GitHub Copilot)

### Other Providers

**Groq:**

- Handler: `src/api/providers/groq.ts`
- SDK: OpenAI-compatible
- Auth: `GROQ_API_KEY`

**Fireworks:**

- Handler: `src/api/providers/fireworks.ts`
- SDK: OpenAI-compatible

**Cerebras:**

- Handler: `src/api/providers/cerebras.ts`
- SDK: `@cerebras/cerebras_cloud_sdk`

**HuggingFace:**

- Handler: `src/api/providers/huggingface.ts`
- SDK: OpenAI-compatible inference endpoints

**Glama:**

- Handler: `src/api/providers/glama.ts`

**Chutes:**

- Handler: `src/api/providers/chutes.ts`

**SambaNova:**

- Handler: `src/api/providers/sambanova.ts`

**DeepInfra:**

- Handler: `src/api/providers/deepinfra.ts`

**Featherless:**

- Handler: `src/api/providers/featherless.ts`

**MiniMax:**

- Handler: `src/api/providers/minimax.ts`

**Baseten:**

- Handler: `src/api/providers/baseten.ts`

**Vercel AI Gateway:**

- Handler: `src/api/providers/vercel-ai-gateway.ts`

**OVHcloud:**

- Handler: `src/api/providers/ovhcloud.ts`

**Moonshot:**

- Handler: `src/api/providers/moonshot.ts`

**Doubao:**

- Handler: `src/api/providers/doubao.ts`

**Qwen Code:**

- Handler: `src/api/providers/qwen-code.ts`

**NanoGPT:**

- Handler: `src/api/providers/nano-gpt.ts`

**IO Intelligence:**

- Handler: `src/api/providers/io-intelligence.ts`

**Inception Labs:**

- Handler: `src/api/providers/inception.ts`

**ZAi:**

- Handler: `src/api/providers/zai.ts`

**Claude Code (CLI):**

- Handler: `src/api/providers/claude-code.ts`

## MCP (Model Context Protocol)

**Purpose:** External tool and data source integration

**Implementation:**

- Hub: `src/services/mcp/McpHub.ts`
- SDK: `@modelcontextprotocol/sdk`
- Notification Service: `src/services/mcp/kilocode/NotificationService.ts`

**Features:**

- Connect to MCP servers
- Expose tools to AI models
- Resource access

## Vector Databases

**LanceDB (Primary):**

- SDK: `@lancedb/lancedb`
- Purpose: Local code embeddings, semantic search
- Storage: Local filesystem

**Qdrant (Alternative):**

- SDK: `@qdrant/js-client-rest`
- Purpose: Remote vector storage option

## Telemetry & Analytics

**PostHog:**

- Extension: `packages/telemetry/src/PostHogTelemetryClient.ts`
- Webview: `webview-ui/src/utils/TelemetryClient.ts`
- CLI: `cli/src/services/telemetry/TelemetryClient.ts`
- SDK: `posthog-node`, `posthog-js`
- Auth: `POSTHOG_API_KEY` (bundled in release)
- Events: Usage analytics, feature tracking

## Kilo Code Cloud Services

**Authentication:**

- Provider: Clerk
- Auth URL: Configured via `CLERK_BASE_URL`
- SDK: `jwt-decode`, `pkce-challenge`

**API Backend:**

- URL: Configured via `ROO_CODE_API_URL`
- Transport: REST API + Socket.IO

**Realtime Communication:**

- SDK: `socket.io-client`
- Implementation: `packages/cloud/src/bridge/SocketTransport.ts`
- Channels: `ExtensionChannel.ts`, `TaskChannel.ts`
- Purpose: Cloud task synchronization, real-time updates

**Provider Proxy:**

- URL: Configured via `ROO_CODE_PROVIDER_URL`
- Purpose: Managed AI provider access

## Data Storage

**Databases (Evals System):**

- PostgreSQL via `postgres` package
- ORM: Drizzle ORM
- Config: `packages/evals/drizzle.config.ts`
- Docker: `packages/evals/docker-compose.yml`

**Caching (Evals System):**

- Redis via `redis` package
- Purpose: Task queue, session management
- Docker: `packages/evals/docker-compose.yml`

**Local Storage (Extension):**

- VS Code ExtensionContext storage
- Custom storage path option (`kilo-code.customStoragePath`)
- Task history, conversation data

**File Storage:**

- Local filesystem only
- No cloud file storage integration

## Browser Automation

**Puppeteer:**

- SDK: `puppeteer-core`, `puppeteer-chromium-resolver`
- Purpose: Web scraping, browser tool
- Usage: `@url` mentions, web content extraction

## Git Integration

**simple-git:**

- SDK: `simple-git`
- Purpose: Repository operations, diff generation, commit message generation

## IPC (Inter-Process Communication)

**node-ipc:**

- SDK: `node-ipc`, `catrielmuller-node-ipc`
- Purpose: Extension ↔ CLI communication
- Location: `packages/ipc/`

## Publishing & Distribution

**VS Code Marketplace:**

- SDK: `@vscode/vsce`
- Auth: `VSCE_PAT` (GitHub secret)

**Open VSX Registry:**

- SDK: `ovsx`
- Auth: `OVSX_PAT` (GitHub secret)

**JetBrains Marketplace:**

- Auth: `JETBRAINS_MARKETPLACE_TOKEN` (GitHub secret)
- Plugin ID: 28350

**npm Registry:**

- Package: `@kilocode/cli`
- Auth: npm token

## Webhooks & Callbacks

**Incoming:**

- Socket.IO events from Kilo Code cloud
- MCP server tool calls

**Outgoing:**

- AI provider streaming callbacks
- Telemetry events to PostHog

## Environment Configuration

**Required Environment Variables:**

```
# Telemetry
POSTHOG_API_KEY=

# Kilo Code Cloud (Development)
CLERK_BASE_URL=
ROO_CODE_API_URL=
ROO_CODE_PROVIDER_URL=
```

**User-Configured (Extension Settings):**

- API keys for each provider (stored in VS Code secrets)
- Base URLs for self-hosted providers
- AWS credentials for Bedrock
- Google Cloud credentials for Vertex

**CI/CD Secrets:**

- `VSCE_TOKEN` - VS Code Marketplace
- `OVSX_TOKEN` - Open VSX
- `JETBRAINS_MARKETPLACE_TOKEN` - JetBrains
- `TURBO_TOKEN`, `TURBO_TEAM` - Turborepo caching
- `POSTHOG_API_KEY` - Bundled telemetry key

---

_Integration audit: 2026-01-17_
