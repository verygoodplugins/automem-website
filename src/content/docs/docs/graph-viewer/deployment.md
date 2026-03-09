---
title: Graph Viewer Deployment
description: Deploy the AutoMem Graph Viewer via Docker, Railway, or as a standalone static site.
sidebar:
  order: 3
---

## Production Server

The graph viewer ships with `server.mjs` — a lightweight Node.js HTTP server that serves the Vite-built static files from `dist/`. It handles:

- Content-type detection for all common web assets
- Immutable cache headers (`max-age=31536000`) on `/assets/*` (Vite hashed filenames)
- `no-cache` for HTML and non-hashed files
- SPA fallback — unknown routes serve `index.html` for client-side routing
- HEAD request support
- Path traversal protection

The server listens on `0.0.0.0:3000` by default. Override with `HOST` and `PORT` environment variables.

---

## Docker

The included multi-stage `Dockerfile` builds and serves the viewer:

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./
COPY --from=builder /app/package*.json ./
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "server.mjs"]
```

Build and run:

```bash
docker build -t automem-graph-viewer .
docker run -p 3000:3000 automem-graph-viewer
```

To connect to a local AutoMem instance, use Docker networking:

```bash
docker run -p 3000:3000 \
  -e VITE_API_TARGET=http://host.docker.internal:8001 \
  automem-graph-viewer
```

:::caution
`VITE_API_TARGET` is a build-time variable (Vite inlines it). If you need to change the API target at runtime in production, use the `?server=` URL parameter or `localStorage.setItem('automem_server', url)` instead.
:::

---

## Railway

The viewer deploys to Railway using the included `railway.toml`:

```toml
[build]
builder = "RAILPACK"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

Railway auto-detects the Node.js project, runs the Dockerfile build, and exposes the service. The `PORT` environment variable is set automatically by Railway.

To deploy:

1. Push the repository to GitHub
2. Connect it to a Railway project
3. Railway builds and deploys automatically on push

No additional environment variables are required for Railway — the viewer defaults to relative API URLs. Configure the API server URL via the viewer's settings UI or `localStorage` after deployment.

---

## Static Hosting

Since the viewer is a static SPA after build, you can also host it on any static file server (Nginx, Cloudflare Pages, Vercel, etc.):

```bash
npm run build
# Upload dist/ to your hosting provider
```

Requirements for the hosting provider:
- Serve `index.html` for all unknown routes (SPA fallback)
- Set appropriate cache headers on `/assets/*`

The viewer will use relative URLs by default. Users configure the AutoMem API URL through the settings UI on first visit.
