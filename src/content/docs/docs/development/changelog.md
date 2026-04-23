---
title: Changelog
description: Release history for AutoMem and MCP AutoMem.
---

All notable releases for **AutoMem** (the memory server) and **MCP AutoMem** (the MCP client) are documented here.

---

## April 2026

### 0.15.2 · Recall Quality & Tag Ops
**2026-04-23**

Keyword scoring for vector results with a softer adaptive floor — recall quality improves on short and keyword-heavy queries without drowning out semantic matches. Expansion candidates now bypass the tag filter so graph walks aren't cut off at the seed set. New paginated `GET /memory/by-tag` with `offset` + `has_more`, plus a bulk `DELETE /memory/by-tag` for clearing stale scopes. LoCoMo judge runs hardened against flaky rate limits so benchmark sweeps complete cleanly.

### MCP 0.14.0 · OpenClaw Plugin-First & Antigravity
**2026-04-23**

Plugin-first memory parity for OpenClaw with a shared policy module across plugin, MCP, and skill modes — all three installation paths now surface the same typed tools. Google Antigravity setup templates added as a first-class platform. The standalone Claude Code plugin is deprecated in favor of `npx @verygoodplugins/mcp-automem claude-code` (see [DEPRECATION.md](https://github.com/verygoodplugins/mcp-automem/blob/main/DEPRECATION.md)). Windows users get a `python-command.sh` wrapper so hooks resolve the correct interpreter. Hooks hardened with stdin parsing, truncation guards, and dedup checks.

---

## March 2026

### 0.15.1 · Deploy Freshness & Classifier Endpoints
**2026-03-25**

`OPENAI_BASE_URL` now honored by the classification client, letting Azure and self-hosted OpenAI-compatible endpoints back the memory type classifier. Embedding provider dimension is validated at init time against the Qdrant collection — config drift fails fast instead of corrupting vectors. Consolidation cluster/creative embeddings now fetch from Qdrant directly. Railway deploy-freshness check guards against stale container rollouts.

### 0.15.0 · Relationship Engine & Benchmarks
**2026-03-25**

Optimized relationship taxonomy for cleaner graph traversal. LoCoMo cat5 multi-hop judge for automated recall quality scoring. `priority_ids` now boosts relevance instead of hard-filtering. Embedding dimension validation catches provider mismatches at startup.

### MCP 0.13.0 · OpenClaw Overhaul & Cursor Rules
**2026-03-25**

Complete OpenClaw plugin rewrite — native MCP integration and new skill setup. Split global vs. project rules for Cursor. Hook stdin parsing with truncation guards and dedup checks.

### 0.14.0 · Docker & Hardened Deployments
**2026-03-08**

Official Docker build workflow. `QDRANT_HOST` + `QDRANT_PORT` for flexible Qdrant config. Stateless MCP bridge transport for resilient connections. Consolidation overhaul: reduced decay rate, importance floor, archived memory filtering. Voyage AI set as recommended embedding default.

### 0.13.0 · Adaptive Recall & Graph Viewer
**2026-03-02**

`min_score` threshold with adaptive floor filtering — low-relevance results get cut automatically. LoCoMo benchmark harness for rapid experiment iteration. Graph viewer externalized as standalone module.

---

## February 2026

### 0.12.0 · Recall Quality Lab & JIT Enrichment
**2026-02-20**

Just-in-time enrichment on recall for higher-quality results. Recall Quality Lab for data-driven recall optimization. LongMemEval benchmark harness (ICLR 2025) for measuring memory quality. `relevance_score` now synced to Qdrant payload for accurate vector search.

### 0.11.0 · Embedding Providers & Memory Lookup
**2026-02-16**

Voyage AI embedding provider for high-accuracy recall. OpenAI-compatible providers via `OPENAI_BASE_URL` (LM Studio, Ollama, xAI, etc.). `GET /memory/<id>` endpoint for direct memory lookup. Hardened time parser for numeric timestamps.

### 0.10.1 · Stability Fixes
**2026-02-07**

Temporal query bound to 7-day window with timeout to prevent runaway queries. Skip temperature param for o-series and gpt-5 models.

### 0.10.0 · Visualization & Observability
**2026-02-06**

Interactive graph visualization API. `automem-watch` real-time observability with SSE streaming and TUI. Ollama embedding provider for fully local deployments. Memory content size governance with auto-summarization. Streamable HTTP transport for MCP connections.

### MCP 0.12.0 · OpenClaw Integration
**2026-02-06**

Native OpenClaw integration replacing mcporter dependency chain. Direct HTTP API calls to AutoMem with new `SKILL.md` template. Simplified setup and troubleshooting documentation.

### MCP 0.11.0 · Claude Code Plugin
**2026-02-03**

Claude Code plugin with automatic memory capture hooks. Session start recall, session end summary. Cursor hooks integration for automatic capture. Integration tests and CLI smoke tests.

---

## January 2026

### MCP 0.10.0 · MCP Registry & SessionStart Hook
**2026-01-06**

Listed on the official MCP Registry. SessionStart hook for automatic memory recall at conversation start. Memory content size guidelines and warnings surfaced in the client.

---

## December 2025

### 0.9.3 · Expansion Filtering
**2025-12-10**

`expand_min_strength` and `expand_min_importance` parameters for fine-grained graph traversal control. Vector dimension autodetect for embedding providers. CI workflow for automated testing on PRs.

### MCP 0.8.1 · Spec Compliance
**2025-12-04**

All MCP tools now return `structuredContent` with `outputSchema`, aligning recall outputs (`results`, `dedup_removed`) to spec.

### MCP 0.8.0 · Advanced Recall Tools
**2025-12-02**

Exposed `expand_entities`/`relations`, `auto_decompose`, context-aware boosts, and full tool metadata in the MCP client. Simplified Claude Code integration.

### 0.9.1 · Entity Expansion + SOTA
**2025-12-02**

Added `expand_entities`/`entity_expansion` params for graph hops and hit 90.53% on LoCoMo-10 (multi-hop up to 50%).

---

## November 2025

### 0.9.0 · Retrieval Engine Upgrade
**2025-11-20**

Multi-hop bridge discovery, temporal alignment scoring, and weighted hybrid scoring (vector, keyword, relation, temporal, importance) boost recall precision.

### 0.8.0 · API Modularization & Security
**2025-11-08**

Refactored monolithic app into modular blueprints, hardened memory IDs to server-generated UUIDs, and fixed Railway secrets/volumes for reliable deploys.
