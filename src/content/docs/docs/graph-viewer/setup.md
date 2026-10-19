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

The dev server starts at `http://localhost:5173` (Vite default) with hot module replacement. API requests are proxied to the target in `VITE_API_TARGET` (see below).

For local dev against the AutoMem Docker stack, point the proxy at your API:

```bash
VITE_API_TARGET=http://localhost:8001 npm run dev
```

For a production build:

```bash
npm run build
npm run start
```

The production server (`server.mjs`) serves the built static files on `http://localhost:3000`.

Optional: `npm run dev:all` starts both the Vite dev server and the iPhone hand-tracking bridge for local LiDAR gesture testing.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_TARGET` | `http://localhost:8001` | AutoMem API URL for the Vite dev proxy. **Dev only** — do not set on production Railway viewer services. |
| `VITE_BASE_PATH` | `/` | Base path prefix when hosting under a subpath. Keep `/` for standalone viewer deployments. Use `/viewer/` only if you serve the built assets yourself from the AutoMem API origin under that subpath; AutoMem's own `/viewer` route does not serve them. |

:::caution[Obsolete variables]
`VITE_ENABLE_HAND_CONTROLS` is no longer used — hand gesture controls are toggled from the toolbar at runtime. `VITE_BASE` is not a supported variable; use `VITE_BASE_PATH` instead.
:::

For iPhone LiDAR hand-tracking during local dev, optionally set `VITE_HAND_BRIDGE_URL` (see `.env.example`). The bridge autostarts with `npm run dev:all`.

---

## Connecting to AutoMem

The graph viewer needs an API token to authenticate with your AutoMem instance. Tokens can be provided in several ways (checked in priority order):

1. **URL query parameter** — `?token=your-token` (also accepts `?api_token=your-token` as an alias)
2. **URL hash** — `#token=your-token` (also accepts `#api_token=your-token`; stays client-side, never sent to server)
3. **localStorage** — The viewer stores the token in `automem_token` after first entry via the **TokenPrompt** UI

### Opening the Viewer from AutoMem

AutoMem's `/viewer` path is a compatibility redirect, not a copy of the viewer ([`viewer.py`](https://github.com/verygoodplugins/automem/blob/5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb/automem/api/viewer.py#L94-L106)). When `GRAPH_VIEWER_URL` is set to your deployed viewer, `GET /viewer/` returns a small page that sends the browser there. It keeps the query string and the `#token=` hash, and adds `?server=<automem-origin>` when the URL has no `server` parameter. Asset-style paths such as `/viewer/assets/app.js` get a `302` redirect to the same path on the viewer. If `GRAPH_VIEWER_URL` is not set, `/viewer` answers `503`. The route exists while `ENABLE_GRAPH_VIEWER` is enabled, which is the default, and it skips the API-token guard.

A link like `https://your-automem.example.com/viewer/#token=xxx` therefore lands on the standalone viewer, which reads the token from the hash and sends its API calls to the `server` origin.

### Embedded Mode

The viewer treats itself as embedded when its own page path starts with `/viewer` ([`client.ts`](https://github.com/verygoodplugins/automem-graph-viewer/blob/c6338d13b8a80e8c7b5f24e96a60ce983ed1482b/src/api/client.ts#L9-L11)). The check looks at the path only, so it applies wherever the built assets are served under `/viewer/` (built with `VITE_BASE_PATH=/viewer/`), for example from the AutoMem API origin. In embedded mode it uses relative API URLs, unless a `?server=` parameter overrides them, and reads the token from the URL hash: `/viewer/#token=xxx`. AutoMem does not serve those assets itself, so this is not the default hosted setup.

### Standalone Mode

When running the viewer separately from AutoMem, configure the API server:

- **Dev**: Set `VITE_API_TARGET` in `.env` to your AutoMem URL. Vite proxies API requests.
- **Production**: The viewer checks `localStorage` for `automem_server`. Set it via the settings panel connection section or manually: `localStorage.setItem('automem_server', 'https://your-automem.example.com')`.
- **URL override**: Append `?server=https://your-automem.example.com` to any page URL. AutoMem's `/viewer` bootstrap passes `server=<automem-origin>` automatically.

---

## API Endpoints Used

The viewer consumes these AutoMem API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /graph/snapshot` | Bounded graph overview (nodes + edges) |
| `GET /graph/neighbors/:id` | Neighbors of a specific node (expansion) |
| `GET /graph/stats` | Graph statistics (counts, types, relationship breakdown) |
| `GET /recall` | Whole-store semantic search for the search triage surface |
| `GET /health` | Service health check |

All requests (except `/health`) require the `X-API-Key: <token>` header.

Additional endpoints supported:

| Endpoint | Purpose |
|----------|---------|
| `PATCH /memory/:id` | Update memory fields |
| `DELETE /memory/:id` | Delete a memory |
