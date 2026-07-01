---
title: Graph Viewer Setup
description: Install, configure, and connect the AutoMem Graph Viewer to your API instance.
sidebar:
  order: 2
---

## Requirements

- Node.js 20+
- npm 10+
- A running AutoMem API instance with a valid API token

---

## Quick Start

```bash
git clone https://github.com/verygoodplugins/automem-graph-viewer.git
cd automem-graph-viewer
npm ci
npm run dev
```

The dev server starts at `http://localhost:5173` (Vite default) with hot module replacement.

For a production build:

```bash
npm run build
npm run start
```

The production server (`server.mjs`) serves the built static files on `http://localhost:3000`.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_TARGET` | `http://localhost:8001` | AutoMem API URL for the Vite dev proxy. In production, the viewer uses relative URLs or `localStorage` config. |
| `VITE_BASE_PATH` | `/` | Base path prefix when hosting under a subpath (e.g. `/viewer/`) |
| `VITE_ENABLE_HAND_CONTROLS` | `false` | Enable experimental webcam hand tracking controls |

---

## Connecting to AutoMem

The graph viewer needs an API token to authenticate with your AutoMem instance. Tokens can be provided in several ways (checked in priority order):

1. **URL query parameter** — `?token=your-token` (also accepts `?api_token=your-token` as an alias)
2. **URL hash** — `#token=your-token` (also accepts `#api_token=your-token`; stays client-side, never sent to server)
3. **localStorage** — The viewer stores the token in `automem_token` after first entry via the **TokenPrompt** UI

### Embedded Mode

When the viewer is served from AutoMem's `/viewer` path (same origin), it detects embedded mode automatically and uses relative API URLs. The token can be passed via the URL hash: `/viewer/#token=xxx`.

### Standalone Mode

When running the viewer separately from AutoMem, configure the API server:

- **Dev**: Set `VITE_API_TARGET` in `.env` to your AutoMem URL. Vite proxies API requests.
- **Production**: The viewer checks `localStorage` for `automem_server`. Set it via the UI settings or manually: `localStorage.setItem('automem_server', 'https://your-automem.example.com')`.
- **URL override**: Append `?server=https://your-automem.example.com` to any page URL.

---

## API Endpoints Used

The viewer consumes these AutoMem API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /graph/snapshot` | Full graph data (nodes + edges) |
| `GET /graph/neighbors/:id` | Neighbors of a specific node |
| `GET /graph/stats` | Graph statistics (counts, types) |
| `GET /recall` | Whole-store semantic search, used by the search box to surface off-graph results |
| `GET /health` | Service health check |

All requests (except `/health`) require the `X-API-Key: <token>` header.

Additional endpoints supported:

| Endpoint | Purpose |
|----------|---------|
| `PATCH /memory/:id` | Update memory fields |
| `DELETE /memory/:id` | Delete a memory |
