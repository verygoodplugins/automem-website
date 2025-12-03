---
title: "Self-Hosting AutoMem: Docker, VPS, and Beyond"
description: "A practical guide to running AutoMem on your own infrastructure"
date: "2025-08-10"
tags:
  - tutorial
  - self-hosting
  - docker
---

Railway is great for quick deploys. But maybe you want:
- **Full control** over your data
- **No monthly fees** (beyond your existing infra)
- **Custom modifications** to the codebase
- **Air-gapped environments**

Cool. AutoMem is built for exactly this.

## Option 1: Docker Compose (Recommended)

The easiest self-hosted setup. You'll need Docker and about 5 minutes.

```yaml
# docker-compose.yml
version: '3.8'
services:
  automem:
    image: automem/server:latest
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - QDRANT_URL=http://qdrant:6333
      - FALKORDB_URL=redis://falkordb:6379
    depends_on:
      - qdrant
      - falkordb

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  falkordb:
    image: falkordb/falkordb:latest
    ports:
      - "6379:6379"
    volumes:
      - falkor_data:/data

volumes:
  qdrant_data:
  falkor_data:
```

```bash
# Start everything
docker-compose up -d

# Check it's running
curl http://localhost:3000/health
# => {"status": "ok"}
```

That's it. You've got AutoMem running locally.

## Option 2: VPS (DigitalOcean, Hetzner, etc.)

For a proper production setup on a $5-10/mo VPS:

### 1. Provision the Server
- Ubuntu 22.04 LTS
- 2GB RAM minimum (4GB recommended)
- 20GB storage

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Clone and Configure
```bash
git clone https://github.com/verygoodplugins/automem.git
cd automem
cp .env.example .env
# Edit .env with your OPENAI_API_KEY
```

### 4. Run with SSL
Use Caddy or Traefik for automatic HTTPS:

```yaml
# Add to docker-compose.yml
caddy:
  image: caddy:latest
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

```
# Caddyfile
automem.yourdomain.com {
    reverse_proxy automem:3000
}
```

## Option 3: Kubernetes

For larger deployments, we've got Helm charts:

```bash
helm repo add automem https://charts.automem.ai
helm install automem automem/automem \
  --set openai.apiKey=$OPENAI_API_KEY \
  --set ingress.enabled=true \
  --set ingress.host=automem.yourdomain.com
```

This sets up:
- AutoMem deployment with HPA
- Qdrant StatefulSet with persistent storage
- FalkorDB with Redis Cluster mode
- Ingress with TLS

## Hardware Requirements

| Setup | RAM | CPU | Storage | Monthly Cost |
|-------|-----|-----|---------|--------------|
| Minimal | 2GB | 1 vCPU | 20GB | ~$5 |
| Recommended | 4GB | 2 vCPU | 50GB | ~$20 |
| Production | 8GB+ | 4 vCPU | 100GB | ~$40+ |

The databases (Qdrant + FalkorDB) are the memory hogs. If you're storing millions of memories, scale those independently.

## Backup Strategy

Your memories are valuable. Back them up:

```bash
# Backup Qdrant
docker exec qdrant qdrant snapshot create

# Backup FalkorDB
docker exec falkordb redis-cli BGSAVE
docker cp falkordb:/data/dump.rdb ./backups/
```

Set up a cron job to run this daily.

## Migrating From Railway

If you started on Railway and want to self-host:

1. Export your data from Railway's dashboard
2. Import into your self-hosted instance:

```bash
curl -X POST http://localhost:3000/admin/import \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -d @memories-export.json
```

All your memories, relationships, and metadata transfer cleanly.

## Why Self-Host?

- **Privacy**: Your data never leaves your infrastructure
- **Cost**: After initial setup, it's just compute costs
- **Control**: Modify the source, add features, integrate with internal tools
- **Compliance**: Meet regulatory requirements that prohibit external services

The whole point of open source is that **you own it**. Railway is convenient, but it's not the only way.

## Need Help?

- [GitHub Discussions](https://github.com/verygoodplugins/automem/discussions) for questions
- [GitHub Issues](https://github.com/verygoodplugins/automem/issues) for bugs
- [Discord](https://discord.gg/automem) for real-time chat

Self-hosting isn't hard. If you can run Docker, you can run AutoMem.

– Jack

