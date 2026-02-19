---
title: Quick Start
description: Deploy AutoMem on Railway and connect your first AI platform in 5 minutes.
sidebar:
  order: 2
---

This guide gets you from zero to working memory in 5 minutes using Railway.

## 1. Deploy to Railway

Click this button to deploy AutoMem with all required services:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/automem)

Railway automatically provisions:
- **AutoMem API** — Flask service
- **FalkorDB** — Graph database
- **Qdrant** — Vector database

## 2. Set Environment Variables

In your Railway project, set these variables on the AutoMem service:

```bash
# Required — generate secure tokens
AUTOMEM_API_TOKEN=$(openssl rand -hex 32)
ADMIN_API_TOKEN=$(openssl rand -hex 32)

# Required on Railway — Flask won't bind correctly without this
PORT=8001
```

For embeddings, set one of these (optional — falls back to local FastEmbed):

```bash
# Option A: Voyage (recommended, highest quality)
VOYAGE_API_KEY=your-voyage-key

# Option B: OpenAI
OPENAI_API_KEY=your-openai-key

# Option C: Skip — uses local FastEmbed (~210MB model download on first request)
```

## 3. Verify the Deployment

Once deployed, hit the health endpoint:

```bash
curl https://your-app.railway.app/health
```

You should see database status, memory counts, and embedding provider info.

## 4. Install the MCP Client

On your local machine, run the interactive setup wizard:

```bash
npx @verygoodplugins/mcp-automem setup
```

It'll ask for:
- **AutoMem endpoint** — your Railway URL (e.g., `https://your-app.railway.app`)
- **API key** — the `AUTOMEM_API_TOKEN` you set above
- **Platform** — which AI platform to configure

Or jump straight to a specific platform:

```bash
npx @verygoodplugins/mcp-automem cursor    # Cursor IDE
npx @verygoodplugins/mcp-automem claude-code # Claude Code
npx @verygoodplugins/mcp-automem codex      # OpenAI Codex
```

## 5. Test It

Open your AI platform and try:

> "Store a memory that I prefer TypeScript over JavaScript for new projects."

Then in a new session:

> "What are my coding preferences?"

If it recalls your preference, you're good. Memory is working across sessions.

## What's Next

- [Platform Guides](/docs/platforms/claude-desktop/) — Detailed setup for each platform
- [Environment Variables](/docs/getting-started/environment-variables/) — Full config reference
- [Memory Rules & Patterns](/docs/best-practices/memory-rules/) — Get the most out of your memory system
