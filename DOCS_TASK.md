# Starlight Docs — Content Conversion Task

## CRITICAL: This is a FORMAT CONVERSION, not a rewrite

DO NOT summarize, condense, shorten, or editorialize the DeepWiki source content. Your job is to **convert** it from scraped DeepWiki format into clean Starlight markdown. Think of yourself as a format converter, not a writer.

**Keep:** Every table, every property, every validation rule, every code example, every implementation detail, every threshold, every parameter.
**Remove:** Only DeepWiki-specific chrome (sidebar nav, "Relevant source files" headers, "Loading..." placeholders, ToC sections, FileRef tags).
**Add:** Mermaid diagrams from the pre-extracted `.mmd` files, proper Starlight frontmatter, internal links between pages, and :::note/:::tip admonitions where helpful.

If a DeepWiki page is 400 lines of useful technical content, the output page should be ~400 lines too.

## Context

The Starlight infrastructure is set up:

- `astro.config.mjs` — configured with full sidebar, theme, Starlight integration
- `src/styles/starlight-custom.css` — gold/dark theme matching the site
- `src/assets/logo-dark.svg` and `logo-light.svg` — simple logos
- `src/content/docs/docs/getting-started/introduction.md` — already written (sample)
- `src/content/docs/docs/getting-started/quick-start.md` — already written (sample)
- Directory structure created for all sections

## Your Job

Convert DeepWiki content into markdown files in `src/content/docs/docs/`. Note the double `docs/` — the first is the Starlight content collection root, the second is a subdirectory that gives all routes a `/docs/` URL prefix.

The sidebar in `astro.config.mjs` defines every page — each `slug` starts with `docs/` and maps to a file path under `src/content/docs/docs/`. For example, slug `docs/getting-started/introduction` → file `src/content/docs/docs/getting-started/introduction.md` → URL `/docs/getting-started/introduction/`.

## Raw Source Material

Scraped DeepWiki content is in `.deepwiki-raw/` as JSON files. Each is a JSON array of objects: `[{status: "fulfilled", value: {url: "...", content: "..."}}]`. The `content` field has the markdown text.

### automem wiki (server — Flask API, databases, workers)

- `batch1-core-concepts.txt` — 3.1 Memory Model, 3.2 Relationship Types, 3.3 Hybrid Search, 4.3.1 Enrichment Pipeline, 4.3.3 Consolidation Engine
- `batch2-api-reference.txt` — 5.1 Memory Operations, 5.2 Recall Operations, 5.3 Relationship Operations, 5.4 Consolidation Operations, 5.5 Admin Operations
- `batch3-health-auth-deploy-config.txt` — 5.6 Health/Analytics, 6.3 Authentication, 7.1 Railway Deploy, 7.2 Docker Deploy, 2.2 Configuration Reference
- `batch6-architecture-research.txt` — 4.1 Data Stores, 4.3.2 Embedding Generation, 4.4 MCP Bridge Architecture, 8.1 Health Monitoring, 11 Research & Motivation
- `batch7-automem-overview-getting-started.txt` — 1 Overview, 2 Getting Started, 2.1 Installation Options, 3 Core Concepts (index), 4 System Architecture (index)
- `batch8-automem-flask-bg-utils-api-client.txt` — 4.2 Flask API Service, 4.3 Background Processing, 4.5 Utility Modules, 5 API Reference (index), 6 Client Integration (index)
- `batch9-automem-mcp-directapi-alexa-deploy-envconfig.txt` — 6.1 MCP Integration, 6.2 Direct API Usage, 6.4 Alexa Integration, 7 Deployment (index), 7.3 Environment Configuration
- `batch10-automem-operations.txt` — 8 Operations (index), 8.2 Backup Strategies, 8.3 Disaster Recovery, 8.4 Performance Optimization, 8.5 Troubleshooting
- `batch11-automem-development.txt` — 9 Development Guide (index), 9.1 Project Structure, 9.2 Local Development Setup, 9.3 Testing

### mcp-automem wiki (MCP client — CLI, platform integrations, tool system)

- `batch4-mcp-platforms.txt` — 3.1 Claude Desktop, 3.2 Cursor IDE, 3.3 Claude Code, 3.4 OpenAI Codex, 3.5 OpenClaw
- `batch5-mcp-advanced.txt` — 3.6 Warp Terminal, 3.7 Remote MCP (ChatGPT/Claude.ai), 6.2 Tool Definitions, 8.1 Memory Rules/Patterns, 2.3 Configuration
- `batch12-mcp-overview-getting-started-platforms.txt` — 1 Overview, 2 Getting Started, 2.1 Installation, 2.2 Platform-Specific Setup, 3 Platform Integration Guides (index)
- `batch13-mcp-memory-operations.txt` — 4 Memory Operations (index), 4.1 Storing Memories, 4.2 Recalling Memories, 4.3 Associating Memories, 4.4 Memory Lifecycle Management
- `batch14-mcp-server-arch-tools.txt` — 5 Server Architecture, 5.1 MCP Server Implementation, 5.2 Sidecar Architecture, 6 Tool System (index), 6.1 Core MCP Tools
- `batch15-mcp-development.txt` — 7 Development (index), 7.1 Project Structure, 7.2 Testing Framework, 7.3 CI/CD Pipeline, 7.4 Release Process
- `batch16-mcp-best-practices.txt` — 8 Best Practices (index), 8.2 Context Engineering, 8.3 Progressive Disclosure

### How to read the batch files

```python
import json
with open('.deepwiki-raw/batch7-automem-overview-getting-started.txt') as f:
    data = json.load(f)
for item in data:
    url = item['value']['url']
    content = item['value']['content']
    # content is the DeepWiki markdown for that page
```

Remove DeepWiki chrome from the content: sidebar navigation, "Relevant source files" sections at the top of each page, "Loading..." placeholders, "Dismiss / Refresh this wiki" footers, "On this page" ToC.

## CRITICAL: Merge Strategy for Two Wikis

The source material comes from TWO separate DeepWiki wikis documenting TWO repos:

- **automem** wiki — documents the Flask API server, databases, background workers
- **mcp-automem** wiki — documents the MCP client package, CLI, platform integrations

Users should see ONE unified product called "AutoMem." They should never have to think about which repo does what. Here's how to merge:

### Rule 1: User's perspective, not repo boundaries

Write from the user's POV. "When you store a memory..." not "The mcp-automem package sends a POST to the automem service which..."

The architecture pages CAN explain the split (that's useful technical context). But getting-started, platform guides, and best-practices pages should feel like one product.

### Rule 2: For overlapping topics, weave don't concatenate

When both wikis cover the same topic (see merge map below), DON'T just paste both sections one after another. Instead:

1. Read both sources
2. Identify what's unique to each (server-side vs client-side perspective)
3. Write ONE narrative that covers both angles naturally
4. Example: "Configuration" — the server has env vars (FALKORDB_HOST, PORT), the client has env vars (AUTOMEM_ENDPOINT, AUTOMEM_API_KEY). Combine into one table with a "Component" column.

### Rule 3: Resolve conflicts in favor of the server wiki

The automem (server) wiki is more recent (Feb 17 vs Feb 11) and more detailed. If the two wikis contradict each other on a technical detail, go with the server wiki.

### Rule 4: Merge map — where both wikis overlap

| Unified Page            | automem wiki source               | mcp-automem wiki source                        | How to merge                                                                     |
| ----------------------- | --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Quick Start             | batch3 (installation)             | batch4/5 (installation, config)                | Server deploy steps + client install steps in one flow                           |
| Configuration           | batch3 (config reference)         | batch5 (configuration)                         | One table, grouped by component (Server vs Client)                               |
| Memory Operations API   | batch2 (memory-operations)        | batch4 (storing-memories)                      | API endpoint details from server, usage examples from client                     |
| Recall Operations API   | batch2 (recall-operations)        | batch4 (recalling-memories)                    | Same approach                                                                    |
| Relationships API       | batch2 (relationship-ops)         | batch4 (associating-memories)                  | Same approach                                                                    |
| MCP Bridge architecture | batch6 (mcp-bridge-architecture)  | batch5 (server-architecture, tool-definitions) | Server's view of the bridge + client's implementation details                    |
| Each platform guide     | automem wiki 6.x (brief mentions) | mcp-automem wiki 3.x (detailed guides)         | Primarily use mcp-automem's detailed guides, supplement with server-side context |
| Health & Monitoring     | batch3 (health-analytics)         | N/A (just health tool)                         | Primarily server wiki, mention the MCP health tool                               |
| Development             | batch6 (automem dev guide)        | batch5 (mcp-automem dev)                       | Two subsections: "Server Development" and "MCP Client Development"               |

## DeepWiki Content Transformation Rules

### Source References

- DON'T keep the `Sources: app.py line X-Y` format scattered throughout
- DO convert the most useful ones to inline GitHub links: `[app.py#L1-L113](https://github.com/verygoodplugins/automem/blob/main/app.py#L1-L113)`
- For key architecture/reference pages, add a source callout at the top:

  ```
  :::note[Source files]
  Key files: [`app.py`](https://github.com/verygoodplugins/automem/blob/main/app.py), [`consolidation.py`](https://github.com/verygoodplugins/automem/blob/main/consolidation.py)
  :::
  ```

- Drop source refs from getting-started, platform guides, and best-practices pages (users don't care)

### Mermaid Diagrams

228 Mermaid diagrams have been pre-extracted from both DeepWiki wikis into `.mmd` files:
- `.deepwiki-raw/diagrams/` — 127 diagrams from automem wiki
- `.deepwiki-raw/diagrams-mcp/` — 101 diagrams from mcp-automem wiki

Each directory has an `INDEX.txt` mapping filename → section heading. Read the `.mmd` file and paste its contents into a ```mermaid code block in the corresponding docs page.

For architecture and core-concept pages, include ALL relevant diagrams from the source — don't skip them. Match by heading name in INDEX.txt.

### Other DeepWiki Artifacts to Remove

- "Relevant source files" sections at the top of each page
- "Loading..." diagram placeholders
- "Dismiss / Refresh this wiki" footer content
- "On this page" ToC (Starlight generates its own)
- File path references like `FileRef file-url=...`

## Writing Style

- Direct, casual but technical. No corporate fluff.
- Use "you" directly.
- Include actual code examples, config snippets, and CLI commands.
- Use Mermaid diagrams liberally — 228 pre-extracted diagrams are available (see Mermaid section above).
- Starlight supports :::note, :::tip, :::caution, :::danger admonitions.

## IMPORTANT: Do NOT shorten pages

There are NO line limits. If the source material is 400 lines, the output should be ~400 lines. If a DeepWiki page has 15 properties in a table, your output should have 15 properties in a table. The only content that should be shorter than the source is content you're removing because it's DeepWiki chrome (nav, ToC, "Loading..." placeholders).

## Files to Create

### Overview (top-level)

#### `src/content/docs/docs/overview.md`

```yaml
---
title: Overview
description: "What AutoMem is, how it works at a high level, and why it exists."
---
```

Content: This is the landing page for the docs. Source: DeepWiki automem wiki "1-overview" page in `batch7-automem-overview-getting-started.txt` (first item). Also reference mcp-automem "1-overview" in `batch12-mcp-overview-getting-started-platforms.txt` for client-side perspective. Include diagrams from `.deepwiki-raw/diagrams/`: diagram-001 (High-Level Component Diagram), diagram-002 (Storage Layer Architecture), diagram-003 (Memory Lifecycle Sequence), diagram-004 (Worker Coordination). Cover: what AutoMem is, dual-storage architecture (FalkorDB + Qdrant), graceful degradation, the 3-tier stack (AI clients → MCP bridge → API → databases), background processing overview, and links to deeper pages.

### Getting Started (2 remaining)

#### `src/content/docs/docs/getting-started/docker.md`

```yaml
---
title: Docker & Local Dev
description: Run AutoMem locally with Docker Compose or bare Flask for development.
sidebar:
  order: 3
---
```

Content: docker-compose.yml (3 services: automem, falkordb, qdrant), env vars, bare Flask setup, data persistence. Source: batch3.

#### `src/content/docs/docs/getting-started/environment-variables.md`

```yaml
---
title: Environment Variables
description: Complete reference for all AutoMem configuration environment variables.
sidebar:
  order: 4
---
```

Content: Comprehensive env vars table grouped by category (Server, Auth, Database, Embeddings, MCP Client). Merge from both wikis. Source: batch3 (config reference) + batch5 (mcp config).

### Platform Guides (11 files)

Each should have: Prerequisites, Step-by-step setup, Config snippet, Testing, Troubleshooting.

MCP client package: `@verygoodplugins/mcp-automem`
MCP client env vars: `AUTOMEM_ENDPOINT`, `AUTOMEM_API_KEY`

#### `src/content/docs/docs/platforms/claude-desktop.md`

```yaml
---
title: Claude Desktop
description: Set up AutoMem persistent memory in Claude Desktop.
sidebar:
  order: 1
---
```

Content: JSON config in `claude_desktop_config.json`, .mcpb one-click install, Plugin Marketplace. Source: batch4.

#### `src/content/docs/docs/platforms/claude-web.md`

```yaml
---
title: "Claude.ai & Mobile"
description: Use AutoMem with Claude.ai web interface and Claude mobile apps via Remote MCP.
sidebar:
  order: 2
---
```

Content: Remote MCP via HTTP/SSE, mcp-remote sidecar proxy. Source: batch5 (remote-mcp).

#### `src/content/docs/docs/platforms/claude-code.md`

```yaml
---
title: Claude Code
description: Add persistent memory to Claude Code with hooks and MCP integration.
sidebar:
  order: 3
---
```

Content: ~/.claude.json config, Plugin install, hook system, CLI installer. Source: batch4.

#### `src/content/docs/docs/platforms/cursor.md`

```yaml
---
title: Cursor IDE
description: Integrate AutoMem memory into Cursor IDE for persistent context across sessions.
sidebar:
  order: 4
---
```

Content: ~/.cursor/mcp.json config, .cursor/rules/automem.mdc, CLI installer. Source: batch4.

#### `src/content/docs/docs/platforms/chatgpt.md`

```yaml
---
title: ChatGPT
description: Add persistent memory to ChatGPT using Remote MCP integration.
sidebar:
  order: 5
---
```

Content: ChatGPT Developer Mode, Remote MCP via HTTP/SSE. Source: batch5 (remote-mcp).

#### `src/content/docs/docs/platforms/codex.md`

```yaml
---
title: OpenAI Codex
description: Set up AutoMem memory for OpenAI Codex CLI agent.
sidebar:
  order: 6
---
```

Content: ~/.codex/config.toml TOML config, CLI installer. Source: batch4.

#### `src/content/docs/docs/platforms/warp.md`

```yaml
---
title: Warp Terminal
description: Use AutoMem with Warp Terminal's AI features.
sidebar:
  order: 7
---
```

Content: Warp MCP support, warp-rules.md. Source: batch5.

#### `src/content/docs/docs/platforms/github-copilot.md`

```yaml
---
title: GitHub Copilot
description: Add persistent memory to GitHub Copilot via repository MCP configuration.
sidebar:
  order: 8
---
```

Content: Repository-level MCP config, .github/copilot/mcp.json. Source: batch5 (remote-mcp section may cover this) or general knowledge.

#### `src/content/docs/docs/platforms/elevenlabs.md`

```yaml
---
title: ElevenLabs Agents
description: Give ElevenLabs AI agents persistent memory with AutoMem.
sidebar:
  order: 9
---
```

Content: ElevenLabs Conversational AI, Remote MCP. Source: batch5.

#### `src/content/docs/docs/platforms/alexa.md`

```yaml
---
title: Alexa
description: Integrate AutoMem with Amazon Alexa for voice-powered memory.
sidebar:
  order: 10
---
```

Content: Custom Alexa skill, direct API calls. Source: automem wiki section 6.4 (may need to reference the repo directly).

#### `src/content/docs/docs/platforms/openclaw.md`

```yaml
---
title: OpenClaw
description: Use AutoMem with OpenClaw via direct API integration.
sidebar:
  order: 11
---
```

Content: Bypasses MCP, SKILL.md with curl commands, CLI installer. Source: batch4.

### Core Concepts (4 files)

#### `src/content/docs/docs/core-concepts/memory-model.md`

```yaml
---
title: Memory Model
description: How AutoMem structures, classifies, and manages memories.
sidebar:
  order: 1
---
```

Content: Memory properties (id, content, tags, importance, type, metadata, timestamp, embedding), auto-classification (regex + LLM), memory types (Decision, Bug-Fix, Pattern, Preference, Style, Architecture, Context, Learning, Reference, Meta), lifecycle (Store → Enrich → Embed → Index → Recall → Decay). Source: batch1.

#### `src/content/docs/docs/core-concepts/relationship-types.md`

```yaml
---
title: Relationship Types
description: "AutoMem's 11 typed relationship edges for building knowledge graphs."
sidebar:
  order: 2
---
```

Content: All 11 types with descriptions, strength (0-1), when to use each, Mermaid diagram example. Source: batch1.

#### `src/content/docs/docs/core-concepts/hybrid-search.md`

```yaml
---
title: Hybrid Search
description: How AutoMem combines vector, keyword, graph, and temporal search.
sidebar:
  order: 3
---
```

Content: 4 search strategies, scoring, graceful degradation, advanced features (expand_entities, expand_relations, time_query). Source: batch1.

#### `src/content/docs/docs/core-concepts/consolidation.md`

```yaml
---
title: Consolidation & Decay
description: "AutoMem's neuroscience-inspired memory consolidation system."
sidebar:
  order: 4
---
```

Content: 4 cycles (Decay, Creative Association, Clustering, Forgetting), configurable intervals, control node. Source: batch1.

### Architecture (6 files)

Use Mermaid diagrams where appropriate.

#### `src/content/docs/docs/architecture/overview.md`

```yaml
---
title: System Overview
description: "AutoMem's three-tier architecture: AI platforms, MCP bridge, and memory service."
sidebar:
  order: 1
---
```

Content: Full 3-tier diagram, design decisions, component summary. Source: overview pages + batch6.

#### `src/content/docs/docs/architecture/mcp-bridge.md`

```yaml
---
title: MCP Bridge
description: How the MCP bridge translates AI platform requests into AutoMem API calls.
sidebar:
  order: 2
---
```

Content: Bridge pattern, 6 MCP tools, AutoMemClient, stdio transport, response normalization. Source: batch6 + mcp-automem overview.

#### `src/content/docs/docs/architecture/data-stores.md`

```yaml
---
title: Data Stores
description: "FalkorDB and Qdrant: AutoMem's dual-storage architecture."
sidebar:
  order: 3
---
```

Content: FalkorDB (canonical, graph, Cypher), Qdrant (optional, vectors, payloads), sync worker, graceful degradation. Source: batch6.

#### `src/content/docs/docs/architecture/enrichment.md`

```yaml
---
title: Enrichment Pipeline
description: How AutoMem automatically enhances memories with entities and relationships.
sidebar:
  order: 4
---
```

Content: Entity extraction (spaCy + regex), summary generation, temporal linking, pattern detection, retry logic. Source: batch1.

#### `src/content/docs/docs/architecture/embeddings.md`

```yaml
---
title: Embedding Generation
description: "AutoMem's pluggable embedding providers and batching system."
sidebar:
  order: 5
---
```

Content: 4 providers (Voyage, OpenAI, FastEmbed, Placeholder), auto-selection, batching (20 items, 2s timeout), 40-50% cost reduction. Source: batch6.

#### `src/content/docs/docs/architecture/background-processing.md`

```yaml
---
title: Background Processing
description: "AutoMem's four background workers for async memory processing."
sidebar:
  order: 6
---
```

Content: 4 workers (Enrichment, Embedding, Consolidation, Sync), queues, coordination. Source: automem overview.

### API Reference (7 files)

Include request/response examples for each endpoint.

Auth: `Authorization: Bearer <AUTOMEM_API_TOKEN>`. Admin endpoints also need `X-Admin-Token: <ADMIN_API_TOKEN>`.

#### `src/content/docs/docs/reference/api/memory-operations.md`

```yaml
---
title: Memory Operations
description: Store, update, and delete memories via the AutoMem API.
sidebar:
  order: 1
---
```

Content: POST /memory, PATCH /memory/:id, DELETE /memory/:id, GET /memory/:id. Source: batch2.

#### `src/content/docs/docs/reference/api/recall-operations.md`

```yaml
---
title: Recall Operations
description: Search and retrieve memories using hybrid search.
sidebar:
  order: 2
---
```

Content: GET /recall (query, tags, time_query, limit, expand_entities, expand_relations, etc.), GET /memory/by-tag. Source: batch2.

#### `src/content/docs/docs/reference/api/relationships.md`

```yaml
---
title: Relationship Operations
description: Create typed relationships between memories.
sidebar:
  order: 3
---
```

Content: POST /associate, 11 relationship types, strength. Source: batch2.

#### `src/content/docs/docs/reference/api/consolidation.md`

```yaml
---
title: Consolidation Operations
description: Trigger and monitor memory consolidation cycles.
sidebar:
  order: 4
---
```

Content: POST /consolidate, GET /consolidation/status. Source: batch2.

#### `src/content/docs/docs/reference/api/admin.md`

```yaml
---
title: Admin Operations
description: Administrative endpoints for re-embedding and system management.
sidebar:
  order: 5
---
```

Content: POST /admin/reembed, POST /enrichment/reprocess, GET /admin/stats. Source: batch2.

#### `src/content/docs/docs/reference/api/health.md`

```yaml
---
title: Health & Analytics
description: Monitor AutoMem service health and analytics.
sidebar:
  order: 6
---
```

Content: GET /health (public, no auth). Source: batch3.

#### `src/content/docs/docs/reference/api/direct-vs-mcp.md`

```yaml
---
title: Direct API vs MCP Tools
description: Compare HTTP API with MCP tool interfaces side by side.
sidebar:
  order: 7
---
```

Content: Side-by-side table of all 6 MCP tools vs their HTTP API equivalents.

### CLI Reference (4 files)

#### `src/content/docs/docs/cli/setup.md`

```yaml
---
title: Setup & Installation
description: CLI commands for setting up AutoMem.
sidebar:
  order: 1
---
```

#### `src/content/docs/docs/cli/platform-installers.md`

```yaml
---
title: Platform Installers
description: One-command platform installers for AutoMem.
sidebar:
  order: 2
---
```

#### `src/content/docs/docs/cli/queue.md`

```yaml
---
title: Queue Management
description: CLI tools for managing the memory processing queue.
sidebar:
  order: 3
---
```

#### `src/content/docs/docs/cli/config-tools.md`

```yaml
---
title: Configuration Tools
description: CLI utilities for managing AutoMem configuration.
sidebar:
  order: 4
---
```

### Configuration (2 files)

#### `src/content/docs/docs/reference/configuration.md`

```yaml
---
title: Configuration Reference
description: Complete configuration reference for AutoMem.
sidebar:
  order: 1
---
```

Content: All env vars in comprehensive table. Source: batch3 + batch5.

#### `src/content/docs/docs/reference/authentication.md`

```yaml
---
title: Authentication
description: "AutoMem's two-tier authentication system."
sidebar:
  order: 2
---
```

Content: Standard API token + admin token, header examples, endpoint matrix. Source: batch3.

### Deployment (2 files)

#### `src/content/docs/docs/deployment/railway.md`

```yaml
---
title: Railway Deployment
description: Deploy AutoMem to Railway with persistent storage.
sidebar:
  order: 1
---
```

Source: batch3.

#### `src/content/docs/docs/deployment/docker.md`

```yaml
---
title: Docker Deployment
description: Deploy AutoMem with Docker Compose.
sidebar:
  order: 2
---
```

Source: batch3.

### Operations (4 files)

#### `src/content/docs/docs/operations/health.md`

```yaml
---
title: Health Monitoring
description: Monitor AutoMem service health and detect drift.
sidebar:
  order: 1
---
```

Source: batch3 + batch6.

#### `src/content/docs/docs/operations/backup.md`

```yaml
---
title: Backup & Recovery
description: Backup strategies for AutoMem data stores.
sidebar:
  order: 2
---
```

#### `src/content/docs/docs/operations/performance.md`

```yaml
---
title: Performance Tuning
description: Optimize AutoMem performance.
sidebar:
  order: 3
---
```

#### `src/content/docs/docs/operations/troubleshooting.md`

```yaml
---
title: Troubleshooting
description: Solutions to common AutoMem issues.
sidebar:
  order: 4
---
```

### Best Practices (3 files)

#### `src/content/docs/docs/best-practices/memory-rules.md`

```yaml
---
title: Memory Rules & Patterns
description: Best practices for structuring memory rules in AI agent configs.
sidebar:
  order: 1
---
```

Source: batch5.

#### `src/content/docs/docs/best-practices/context-engineering.md`

```yaml
---
title: Context Engineering
description: Design prompts that leverage persistent memory effectively.
sidebar:
  order: 2
---
```

#### `src/content/docs/docs/best-practices/progressive-disclosure.md`

```yaml
---
title: Progressive Disclosure
description: Gradually introduce memory features as projects grow.
sidebar:
  order: 3
---
```

### Development (4 files)

#### `src/content/docs/docs/development/structure.md`

```yaml
---
title: Project Structure
description: Code organization for AutoMem repositories.
sidebar:
  order: 1
---
```

#### `src/content/docs/docs/development/local-setup.md`

```yaml
---
title: Local Setup
description: Set up a local development environment for AutoMem.
sidebar:
  order: 2
---
```

#### `src/content/docs/docs/development/testing.md`

```yaml
---
title: Testing
description: Run and write tests for AutoMem.
sidebar:
  order: 3
---
```

#### `src/content/docs/docs/development/releases.md`

```yaml
---
title: Release Process
description: How AutoMem versions and publishes packages.
sidebar:
  order: 4
---
```

### Research (1 file)

#### `src/content/docs/docs/research.md`

```yaml
---
title: Research & Motivation
description: The research behind AutoMem's architecture decisions.
---
```

Content: LoCoMo benchmark (90.53% vs CORE 88.24%), neuroscience-inspired consolidation, knowledge graphs vs flat RAG, typed relationships. Source: batch6.

## Cleanup After Content Generation

1. Remove old docs: `src/pages/docs.astro`, `src/pages/docs/quickstart.astro`, `src/pages/docs/features.astro`, `src/pages/docs/screenshots.astro`
2. Search for internal links to `/docs/quickstart`, `/docs/features`, `/docs/screenshots` and update them
3. Add `.deepwiki-raw/` to `.gitignore`
4. Run `npm run build` to verify everything compiles
5. Run `npm run dev` and check `/docs/` renders Starlight, `/` still renders landing page, `/blog/` still works

## Key Technical Notes

- Starlight is already installed and configured in `astro.config.mjs`
- The existing site uses Tailwind v3 with CSS variable theming (see `src/styles/global.css`)
- Starlight uses its own CSS, themed via `src/styles/starlight-custom.css`
- Content goes in `src/content/docs/docs/` as .md files
- Existing blog content collection in `src/content/config.ts` should NOT be modified (Starlight manages its own docs collection)
- Mermaid diagrams work in \`\`\`mermaid code blocks
- Starlight admonitions: :::note, :::tip, :::caution, :::danger
