---
title: "Remote MCP: The SSE Sidecar Grows Up"
description: "Streamable HTTP replaces SSE as the primary transport. Same features, better reliability, zero breaking changes."
date: "2026-01-15"
tags:
  - release
  - mcp
  - technical
  - integrations
---

Remember when we launched the SSE sidecar? It worked. But we can do better.

The Model Context Protocol spec has evolved, and so has AutoMem. **Streamable HTTP is now the primary transport** — and it fixes basically every annoyance we had with pure SSE.

## What Was Wrong With SSE

Nothing was *broken*, but SSE has some rough edges:

**Long-lived connections** — SSE keeps connections open indefinitely. Great for real-time, annoying for infrastructure. Proxies time out. Load balancers get confused. Kubernetes health checks fail in weird ways.

**Dual endpoints** — You needed both `/mcp/sse` for the event stream AND `/mcp/messages` for sending data back. Two endpoints, two failure points.

**Heartbeat complexity** — To keep connections alive through proxies, we had to send keepalive pings every 30 seconds. More traffic, more state to manage.

It worked. But it felt like fighting the protocol instead of using it.

## Enter Streamable HTTP

The MCP spec (version 2025-03-26) introduced Streamable HTTP as the recommended transport. Here's what changed:

**Single endpoint** — Everything goes through `POST /mcp`. Requests and responses. Simple.

**Session resumability** — Drop your connection? No problem. Send a `Last-Event-ID` header and pick up where you left off. No lost context.

**Better proxy support** — HTTP POST requests work everywhere. No special SSE handling needed. Your Cloudflare, nginx, or whatever proxy you're running Just Works.

**Cleaner sessions** — The server sends an `Mcp-Session-Id` header on first connection. Use it for subsequent requests. Clean, stateless, obvious.

## The Technical Comparison

| Feature | SSE (old) | Streamable HTTP (new) |
|---------|-----------|----------------------|
| Endpoints | `/mcp/sse` + `/mcp/messages` | `/mcp` |
| Connection | Long-lived | Per-request |
| Resume | Not supported | `Last-Event-ID` header |
| Keepalives | Required | Not needed |
| Proxy support | Problematic | Works everywhere |

## Migration: Do Nothing

Here's the best part — **you don't have to do anything**.

Both protocols work simultaneously. Existing clients using SSE at `/mcp/sse` keep working. New clients can use Streamable HTTP at `/mcp`. We maintain backwards compatibility because breaking deployments is annoying.

If you want to update your client config:

```json
{
  "mcpServers": {
    "automem": {
      "url": "https://your-server.railway.app/mcp"
    }
  }
}
```

That's it. No endpoint migration. No credential changes. Just update the URL if you want the new transport.

## Protocol Versions

For the nerds tracking this:

- **2024-11-05** — Original SSE-based transport
- **2025-03-26** — Streamable HTTP becomes primary

AutoMem now speaks both. The server auto-detects which protocol you're using based on the request format.

## What's Actually Different in Practice

Honestly? Not much from your perspective. Memory operations work the same. Latency is about the same. The API is identical.

The improvements are all infrastructure-side:
- Fewer connection drops through proxies
- Easier debugging (normal HTTP logs)
- Simpler Kubernetes deployments
- Better observability with standard tools

## Deploy the Latest

If you're on Railway or Docker, just pull the latest:

```bash
# Railway: just push main
git push railway main

# Docker
docker pull automem/automem:latest
docker-compose up -d
```

The new transport is enabled by default. SSE still works at `/mcp/sse` for any clients that need it.

## What's Next

With the transport layer simplified, we're focusing on features:
- Better visualization tools (more on this soon)
- Improved memory consolidation
- Graph analytics endpoints

The protocol is stable. Time to build cool stuff on top of it.

– Jack
