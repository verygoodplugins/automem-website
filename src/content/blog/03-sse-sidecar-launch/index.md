---
title: "SSE Sidecar: AutoMem Now Works With ChatGPT, Claude Web, and ElevenLabs"
description: "How we enabled real-time memory streaming for AI platforms that don't natively support MCP"
date: "2025-11-15"
tags:
  - release
  - sse
  - integrations
---

Big update: AutoMem now works with **way more platforms** than before.

The problem was simple — MCP (Model Context Protocol) is great, but not every AI tool supports it yet. ChatGPT doesn't. Claude's web interface doesn't. ElevenLabs Conversational AI definitely doesn't.

So we built a bridge.

## The SSE Sidecar

Server-Sent Events (SSE) is basically HTTP streaming. It's been around forever, works everywhere, and requires zero special client-side support.

The **SSE Sidecar** is a lightweight proxy that:
1. Accepts SSE connections from any client
2. Translates requests to AutoMem's memory API
3. Streams responses back in real-time

**Result:** Any AI platform that can make HTTP requests can now use AutoMem.

## What This Unlocks

### ChatGPT (with Developer Mode)
If you've got ChatGPT Plus and developer mode enabled, you can now pipe memories in and out. Your ChatGPT conversations can finally remember what you told Claude yesterday.

### Claude Web & Mobile
No more being limited to Claude Desktop. The iOS app, Android app, and web interface can all tap into your memory layer now.

### ElevenLabs Conversational AI
This was the big one for me. Voice agents with memory? Yes please. Your ElevenLabs agent can now recall your preferences, past conversations, and context — all with sub-100ms latency.

## The Technical Bits

The sidecar runs as a separate container alongside your main AutoMem instance. It's dead simple:

```bash
docker run -d \
  -e AUTOMEM_URL=http://automem:3000 \
  -p 3001:3001 \
  automem/sse-sidecar:latest
```

Then point your AI tool at `http://your-server:3001/events` and you're done.

**Latency:** We're seeing ~25ms for memory retrievals through SSE. That's fast enough that voice agents don't notice the delay.

## Deploy It

If you're already running AutoMem, adding the sidecar takes about 2 minutes:

1. Pull the sidecar image
2. Add it to your docker-compose
3. Expose port 3001
4. Update your client configs

Full docs: [SSE Sidecar Setup](https://github.com/verygoodplugins/automem/blob/main/docs/MCP_SSE.md)

## What's Next

The SSE sidecar opens up a lot of possibilities. We're looking at:
- WebSocket support for bidirectional streaming
- Automatic memory summarization during long conversations
- Multi-agent memory sharing

If you've got ideas, [open an issue](https://github.com/verygoodplugins/automem/issues). Or better yet, submit a PR.

The whole point of open source is that the best ideas come from users.

– Jack


