---
title: Introduction
description: AutoMem is a persistent memory system for AI assistants. Deploy once, remember everywhere.
sidebar:
  order: 1
---

AutoMem is a production-grade long-term memory system for AI assistants. It gives any AI platform persistent, queryable memory that survives across sessions — so your AI actually remembers what you've worked on, what you've decided, and what you prefer.

## Why AutoMem?

Most AI memory solutions store flat text and retrieve by similarity. AutoMem builds **knowledge graphs** with typed relationships, enabling multi-hop reasoning, temporal awareness, and pattern learning.

- **11 typed relationship edges** — not just "related to" but *how* things relate (`LEADS_TO`, `CONTRADICTS`, `EVOLVED_INTO`, etc.)
- **Hybrid search** — combines vector similarity, keyword matching, graph traversal, and temporal signals
- **90.53% accuracy** on the LoCoMo benchmark (ACL 2024), outperforming CORE (88.24%)
- **Graceful degradation** — keeps working even when vector search goes down
- **Works everywhere** — one memory store, every AI platform

## Supported Platforms

AutoMem works with every major AI platform via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io):

| Platform | Integration Type |
|----------|-----------------|
| Claude Desktop | Native MCP (stdio) |
| Claude.ai & Mobile | Remote MCP (HTTP/SSE) |
| Claude Code | MCP + Hooks |
| Cursor IDE | Native MCP |
| ChatGPT | Remote MCP |
| OpenAI Codex | Native MCP |
| Warp Terminal | Native MCP |
| GitHub Copilot | Repository MCP |
| ElevenLabs Agents | Remote MCP |
| Alexa | Direct API |
| OpenClaw | Direct API |

## How It Works

```
AI Platform (Claude, Cursor, ChatGPT...)
        ↓ MCP Protocol
MCP Bridge (@verygoodplugins/mcp-automem)
        ↓ HTTP API
AutoMem Service (Flask)
        ↓
┌───────────────┬────────────────┐
│   FalkorDB    │     Qdrant     │
│ (Graph Store) │ (Vector Store) │
│  canonical    │   optional     │
└───────────────┴────────────────┘
```

The **MCP bridge** translates protocol calls from AI platforms into HTTP requests. It doesn't store anything — it's a translation layer. The **AutoMem service** handles storage, search, enrichment, and consolidation.

FalkorDB is the canonical record. Qdrant adds semantic search but is optional — the system works without it.

## Key Capabilities

- **Store** memories with metadata, tags, importance scores, and automatic classification
- **Recall** via hybrid search combining vector similarity, keyword matching, graph relationships, and temporal signals
- **Connect** memories through 11 typed relationship edges
- **Enrich** automatically with entity extraction, pattern detection, and summary generation
- **Consolidate** using neuroscience-inspired cycles: decay, creative association, clustering, forgetting

## Next Steps

- [Quick Start](/docs/getting-started/quick-start/) — Deploy on Railway in 5 minutes
- [Docker & Local Dev](/docs/getting-started/docker/) — Run locally for development
- [Platform Guides](/docs/platforms/claude-desktop/) — Set up your preferred AI platform
