---
title: "The AutoMem Docs Portal is Live"
description: "53 pages of production-grade documentation covering every corner of the memory system — from FalkorDB graph internals to platform-by-platform integration guides."
date: "2026-02-20"
tags:
  - announcement
  - docs
---

Real talk: for the last few months, AutoMem has been quietly running in production for a small group of builders who were willing to figure it out from source code, Discord, and vibes.

That era is over.

The **AutoMem docs portal** is live at [automem.ai/docs](/docs/), and it's not a FAQ page. It's 53 pages of production-grade technical documentation covering the full stack — from first deploy to benchmark internals.

## How We Got Here

When I built the first version of AutoMem, it came out of frustration. I was building AutoJack (my personal AI assistant) and kept hitting the same wall: every AI tool has amnesia. Claude forgets what I told it yesterday. Cursor doesn't know what I taught Claude. New tool? Starts from zero. Re-explain everything.

So I built a memory layer. Started it as personal infrastructure, open sourced it in October 2025, shipped the Railway one-click deploy. People started using it.

Then came the questions:

> "How do I add memory to ChatGPT?"  
> "Can this run fully offline?"  
> "What's the difference between FalkorDB and Qdrant in your stack?"  
> "Why did my memory get overwritten?"  
> "What are typed relationships actually for?"

Valid questions. All of them. I was answering them one by one in Discord like a dum dum instead of just... writing the docs.

So we wrote the docs.

## What's Inside

### Getting Started That Actually Gets You Started

The [Quick Start](/docs/getting-started/quick-start/) is 5 minutes to a running memory system. Railway one-click, environment variables, MCP config — done. The [Introduction](/docs/getting-started/introduction/) explains the architecture before you touch anything, so you're not flying blind.

### Core Concepts That Don't Waste Your Time

This is the section I wish existed when I was debugging my own system at 2am.

- **[Memory Model](/docs/core-concepts/memory-model/)** — how memories are stored, scored, enriched, and retrieved. The importance scoring system, entity extraction, what `draft: true` actually means.

- **[Hybrid Search](/docs/core-concepts/hybrid-search/)** — why we combine vector similarity + keyword matching + graph traversal instead of picking one. The 90.53% LoCoMo accuracy doesn't happen by accident.

- **[Relationship Types](/docs/core-concepts/relationship-types/)** — all 11 typed edges (`LEADS_TO`, `CONTRADICTS`, `EXEMPLIFIES`, etc.) with real examples of when to use each one. This is the part that makes AutoMem a knowledge graph instead of a fancy text file.

- **[Consolidation Engine](/docs/core-concepts/consolidation/)** — the neuroscience-inspired background process that decays stale memories, clusters related ones, and synthesizes patterns. This is why the system gets smarter instead of just bigger over time.

### 11 Platform Integration Guides

This one took work. Not copy-paste work — actual "run it on the platform, find the quirks, document the exact config" work.

| Platform | Status |
|---|---|
| [Claude Desktop](/docs/platforms/claude-desktop/) | ✅ MCP native |
| [Cursor](/docs/platforms/cursor/) | ✅ MCP native |
| [Claude Code](/docs/platforms/claude-code/) | ✅ MCP native |
| [ChatGPT](/docs/platforms/chatgpt/) | ✅ Remote MCP via SSE bridge |
| [Claude.ai](/docs/platforms/claude-web/) | ✅ Remote MCP via SSE bridge |
| [OpenAI Codex](/docs/platforms/codex/) | ✅ MCP native |
| [OpenClaw](/docs/platforms/openclaw/) | ✅ CLI installer |
| [Warp Terminal](/docs/platforms/warp/) | ✅ MCP native |
| [ElevenLabs](/docs/platforms/elevenlabs/) | ✅ Direct API |
| [GitHub Copilot](/docs/platforms/github-copilot/) | ✅ MCP via VS Code |
| [Alexa](/docs/platforms/alexa/) | ✅ Direct API |

Every guide covers the exact config, the gotchas, and how to verify it's working. No "it should work" — actual verification steps.

### Full API Reference

Every endpoint documented with parameters, response shapes, and error codes:

- [Memory Operations](/docs/reference/api/memory-operations/) — store, update, delete
- [Recall Operations](/docs/reference/api/recall-operations/) — the full query surface: semantic search, tag filters, time filters, entity expansion, multi-hop graph traversal
- [Relationships](/docs/reference/api/relationships/) — create and query typed edges between memories
- [Admin Operations](/docs/reference/api/admin/) — stats, cleanup, export
- [Health & Analytics](/docs/reference/api/health/) — everything you need to know if the system is healthy

### Operations That Don't Assume You're Perfect

The [Troubleshooting](/docs/operations/troubleshooting/) guide is honest — it documents the failure modes I've actually hit, not hypothetical ones. FalkorDB data loss, Qdrant drift, embedding queue backlogs. What goes wrong, why, and how to fix it.

[Backup Strategies](/docs/operations/backup/) and [Disaster Recovery](/docs/operations/backup/) because you're eventually going to lose a Railway volume if you don't configure persistence correctly. (Ask me how I know 😅)

[Performance Optimization](/docs/operations/performance/) if you're scaling beyond hobby use.

### Architecture Docs for the Curious

If you want to understand _why_ the system is built the way it is — why dual storage (FalkorDB + Qdrant), why the MCP bridge is a separate Node.js process, why background workers instead of synchronous enrichment — the [Architecture section](/docs/architecture/overview/) has you covered.

There's even a [Research & Motivation](/docs/research/) page tracing the neuroscience papers and ML research that informed the design. HippoRAG, MemoryBank, MELODI compression, Sharp Wave-Ripple consolidation patterns. This stuff isn't just academic — it's in the codebase.

### Best Practices Worth Reading

The [Memory Rules & Patterns](/docs/best-practices/memory-rules/) guide is basically a distillation of what I've learned running this thing for months. How to structure memories so recall actually works. What to store vs. what to skip. How to use importance scores without everything becoming "CRITICAL."

[Context Engineering](/docs/best-practices/context-engineering/) and [Progressive Disclosure](/docs/best-practices/progressive-disclosure/) round it out — the patterns for building agents that use memory intelligently instead of just dumping everything into every prompt.

## The Number That Matters

**90.53% on the LoCoMo benchmark** (ACL 2024). That's the standard academic benchmark for conversational AI memory systems.

CORE, the previous SOTA, sits at 88.24%. AutoMem beats it.

The hardest part of that benchmark is temporal reasoning — "what did we talk about 3 weeks ago?" — and multi-hop inference — "based on what I know about X, what should I do about Y?" Those are exactly the failure modes that make AI memory frustrating in real use.

We didn't optimize for the benchmark. We optimized for actual usefulness. The benchmark result is a side effect of getting the architecture right.

## What's Not There Yet

The docs don't have a contribution guide yet. Coming soon.

There's no changelog section — that's tracked in the GitHub repo for now.

The Alexa integration page is thin. It works but the docs could use more depth.

I'm being honest about the gaps because pretending they don't exist is how you end up with outdated docs that nobody trusts.

## Go Read It

Stop winging your AI memory config. The answers are actually written down now.

[automem.ai/docs](/docs/) — start with the [Overview](/docs/overview/) if you're new, or jump straight to your platform guide if you're migrating.

The [Quick Start](/docs/getting-started/quick-start/) is 5 minutes. Seriously, just do it.

– Jack
