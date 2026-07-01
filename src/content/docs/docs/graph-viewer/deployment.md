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

**Recommended: deploy the published image.** Point your Railway service at the public GHCR image instead of building from source:

```
ghcr.io/verygoodplugins/automem-graph-viewer:stable
```

This avoids spending Railway compute rebuilding the frontend on every deploy. After the viewer's domain is created, set these variables on the `automem` API service (not the viewer service) so browser traffic can reach it:

```bash
GRAPH_VIEWER_URL=https://<viewer-domain>
VIEWER_ALLOWED_ORIGINS=https://<viewer-domain>
```

Browser-to-API traffic must use the API's public domain — Railway private domains aren't reachable from user browsers. The viewer itself typically needs no custom environment variables in production; it stores only browser-side config (server URL, token) and should never receive database credentials.

**Source-linked deploys.** The repository's `railway.toml` is kept for preview/source deployments and mirrors the Dockerfile used to publish the GHCR image:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

To deploy from source:

1. Push the repository to GitHub
2. Connect it to a Railway project
3. Railway builds the Dockerfile and deploys automatically on push

The `PORT` environment variable is set automatically by Railway. Configure the API server URL via the viewer's settings UI or `localStorage` after deployment.

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
