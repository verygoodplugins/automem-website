---
title: "AutoMem Now Runs Natively in OpenClaw"
description: "No bridges, no middleware. AutoMem memory recall works directly inside OpenClaw agents via a single skill file."
date: "2026-02-07"
tags:
  - release
  - integrations
  - openclaw
---

We just shipped native AutoMem support for [OpenClaw](https://openclaw.ai). No MCP bridge. No middleware. Just a skill file that gives any OpenClaw agent access to 7,800+ memories with sub-50ms recall.

Here's a two-minute demo of it working:

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 2rem 0;">
  <iframe src="https://www.youtube.com/embed/aoHCaFOMe-U" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## What Changed

Previously, connecting AutoMem to OpenClaw meant running our MCP bridge package and routing through mcporter — a dependency chain that worked but added complexity. Every extra layer is another thing to debug when something goes wrong.

With MCP Bridge v0.12.0, we replaced all of that with direct HTTP API calls. The integration is now a single `SKILL.md` file that OpenClaw loads natively.

## How It Works

OpenClaw uses skill files to extend agent capabilities. AutoMem's skill teaches the bot to call the HTTP API directly via `curl` — store, recall, associate, update, delete, health. No protocol translation, no sidecar process.

The architecture is dead simple:

```
Bot → bash curl → AutoMem HTTP API (FalkorDB + Qdrant)
```

The agent gets the full recall engine — semantic search, tag filtering, time-based queries, multi-hop graph traversal, importance scoring. Same capabilities that power the Claude Code and Cursor integrations.

This complements OpenClaw's built-in file-based daily memory (`memory/YYYY-MM-DD.md`) with persistent semantic search across all sessions and all platforms.

## Setup

One command:

```bash
npx @verygoodplugins/mcp-automem openclaw --workspace ~/your-workspace
```

Restart the OpenClaw gateway and you're done.

The CLI installs the skill file to `~/.openclaw/skills/automem/SKILL.md`, configures the endpoint in `openclaw.json`, and creates the `memory/` directory in your workspace. It's idempotent — run it again to update.

If you're running AutoMem on Railway instead of locally, pass the endpoint:

```bash
npx @verygoodplugins/mcp-automem openclaw \
  --workspace ~/your-workspace \
  --endpoint https://your-server.railway.app
```

No Docker sidecar. No MCP bridge process running alongside your agent.

## What You See in the Demo

The video shows Clawly (OpenClaw's agent) running a health check against a live AutoMem instance:

- **7,851 memories** indexed across the graph and vector stores
- **FalkorDB + Qdrant** both connected and in sync
- **Enrichment queue empty** — all memories processed
- **Sub-50ms recall latency** holding steady

Then it does a live recall — pulling context from months of stored conversations, decisions, and patterns. Same recall quality you get from Claude Code or Cursor, just running through OpenClaw's agent framework instead.

## Why This Matters

OpenClaw is an open-source agent gateway. It handles multi-channel orchestration — WhatsApp, Slack, web chat, whatever. Adding persistent memory to that means your agents don't start from scratch every session, regardless of which channel the user comes from.

A user talks to your agent on WhatsApp in the morning, then switches to web chat in the afternoon. Same memory. Same context. No "sorry, I don't have access to our previous conversation."

## What's Next

The OpenClaw skill template is the pattern we're using for all non-MCP integrations going forward. Direct HTTP, no middleware, one file. If your platform supports any kind of tool/skill/plugin system, you can connect to AutoMem the same way.

We're also working on deeper Claude Code hooks for automatic memory capture — but that's a separate post.

Try it: [github.com/verygoodplugins/mcp-automem](https://github.com/verygoodplugins/mcp-automem)

– Jack
