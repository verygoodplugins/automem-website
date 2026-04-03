---
title: Quick Start
description: Deploy AutoMem on Railway and connect your first AI platform in 5 minutes.
sidebar:
  order: 2
---

This guide takes you from zero to a working AutoMem installation connected to Claude Desktop. If you want the fastest path, start with [Managed Cloud](/docs/getting-started/managed-cloud/) and let automem.ai provision the infrastructure for you. The rest of this guide covers the self-hosted path: deploy the backend server first, then configure the MCP client.

## Phase 1: Deploy the AutoMem Server

The AutoMem server is a Python/Flask service that stores and retrieves memories. It must be running before you can install the MCP client.

### Choose a Deployment Method

```mermaid
graph TB
    Start["Choose Installation Method"]

    Start --> Q1{"Multi-device access<br/>or team sharing?"}
    Q1 -->|Yes| Railway["Railway Cloud Deploy<br/>One-click or manual"]
    Q1 -->|No| Q2{"Full local stack<br/>with dependencies?"}

    Q2 -->|Yes| Docker["Docker Compose<br/>All services bundled"]
    Q2 -->|No| Q3{"External FalkorDB<br/>already available?"}

    Q3 -->|Yes| Bare["Bare Metal Python<br/>Direct app.py execution"]
    Q3 -->|No| Docker

    Railway --> RNote["Always-on availability<br/>HTTPS public endpoint<br/>~$0.50/month after trial<br/>Persistent volumes"]
    Docker --> DNote["Complete isolation<br/>One-command startup<br/>Development-ready<br/>No cloud costs"]
    Bare --> BNote["Fastest iteration<br/>Minimal resource usage<br/>Direct debugging<br/>Requires external DB"]
```

**Feature comparison:**

| Feature | Railway | Docker Compose | Bare Metal |
|---|---|---|---|
| Setup time | 60 seconds (one-click) | 5 minutes | 2 minutes |
| External access | HTTPS domain | Local only | Local only |
| Data persistence | Automatic volumes | Manual volumes | External DB dependent |
| Cost | $0.50–5/month | Free | Free |
| Use case | Production, collaboration | Full-stack development | API development |
| Services included | `app.py`, FalkorDB, optional MCP SSE | `app.py`, FalkorDB, Qdrant | `app.py` only |

---

### Option A: Railway One-Click Deploy (Recommended)

Railway is the fastest path to a production-ready AutoMem instance with automatic persistence, HTTPS, and cross-device access.

**Steps:**

1. Click the deploy button:

   [![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/automem-ai-memory-service?referralCode=VuFE6g)

2. Sign in with GitHub.

3. Review the auto-generated environment variables. The template automatically configures:

   | Variable | Source | Purpose |
   |---|---|---|
   | `PORT` | Hardcoded: `8001` | Flask explicit port binding |
   | `FALKORDB_HOST` | `${{FalkorDB.RAILWAY_PRIVATE_DOMAIN}}` | Internal DNS resolution |
   | `FALKORDB_PORT` | Hardcoded: `6379` | Redis protocol port |
   | `FALKORDB_PASSWORD` | `${{FalkorDB.FALKOR_PASSWORD}}` | Authentication credential |
   | `AUTOMEM_API_TOKEN` | Auto-generated secret | API authentication |
   | `ADMIN_API_TOKEN` | Auto-generated secret | Admin operations |

4. (Optional) Add `OPENAI_API_KEY` for real semantic embeddings. Without this, the system uses deterministic placeholder vectors — memory storage works but recall quality is lower.

5. Click **Deploy** and wait ~60 seconds.

6. Retrieve your public URL: navigate to `memory-service` → Settings → Networking → Generate Domain. Save the URL (format: `https://automem-production-abc123.up.railway.app`).

**What Railway automatically provisions:**

```mermaid
graph TB
    subgraph Internet["Public Internet"]
        Client["AI Client<br/>(Claude, Cursor, API)"]
    end

    subgraph Railway["Railway Project<br/>(your-project.railway.app)"]
        subgraph MemSvc["memory-service<br/>(Flask Container)"]
            Flask["app.py<br/>Port: 8001<br/>Bind: :: (IPv6)"]
            Workers["Background Workers<br/>- EnrichmentWorker<br/>- EmbeddingWorker<br/>- ConsolidationScheduler"]
        end

        subgraph FalkorSvc["FalkorDB<br/>(Docker Image)"]
            Falkor["falkordb/falkordb:latest<br/>Port: 6379"]
            Vol["Persistent Volume<br/>/var/lib/falkordb/data"]
        end

        subgraph MCPSvc["automem-mcp-sse<br/>(Optional Node.js)"]
            SSE["mcp-sse-server/server.js<br/>Port: 8080"]
        end

        DNS["RAILWAY_PRIVATE_DOMAIN<br/>memory-service.railway.internal"]
        PubDomain["Generated Public Domain<br/>automem-prod-xyz.up.railway.app"]
    end

    subgraph External["External Services"]
        QCloud["Qdrant Cloud<br/>(Optional)"]
        OpenAI["OpenAI API<br/>Embeddings"]
    end

    Client -->|HTTPS| PubDomain
    PubDomain --> Flask
    SSE -->|HTTP :8001| DNS
    DNS --> Flask

    Flask -->|Redis Protocol :6379| Falkor
    Falkor --> Vol
    Flask -.->|Vector Search| QCloud
    Flask -->|Embeddings| OpenAI
    Workers -->|Graph Updates| Falkor
```

:::caution
The `PORT=8001` variable is mandatory for `memory-service`. Without it, Flask defaults to port 5000, other services cannot connect, and you will see `ECONNREFUSED` errors with IPv6 addresses.
:::

---

### Option B: Docker Compose (Local)

For local development with full stack control and no cloud costs.

**Prerequisites:** Docker 20.10+ and Docker Compose 2.0+

**Steps:**

```bash
# Clone the repository
git clone https://github.com/verygoodplugins/automem.git
cd automem

# Start all services
make dev
# This executes: docker compose up --build
```

Or without Make:

```bash
docker compose up --build
```

Services start on:

| Service | Port | Purpose | Volume |
|---|---|---|---|
| `flask-api` (Flask API) | `8001` | REST API | None (code mounted) |
| `falkordb` | `6379` | Graph database | `falkordb_data` |
| `qdrant` | `6333` | Vector database | `qdrant_data` |

**Default service URLs:**
- API: `http://localhost:8001`
- FalkorDB: `localhost:6379` (Redis protocol)
- Qdrant: `http://localhost:6333`

**Configuration files:**

| File | Purpose | Key configuration |
|---|---|---|
| `docker-compose.yml` | Service orchestration | Network `automem`, volumes, port mappings |
| `Dockerfile` | API container build | Python 3.11, requirements.txt, `CMD ["python", "app.py"]` |
| `.env` (optional) | Environment overrides | `FALKORDB_HOST`, `QDRANT_URL`, `OPENAI_API_KEY` |

**Environment variable resolution order:**

1. Process environment (highest priority)
2. `.env` file in project root
3. Docker Compose defaults in `docker-compose.yml`

---

### Option C: Bare Metal Python (Advanced)

For development without Docker or integration with existing infrastructure.

**Prerequisites:** Python 3.10+, an external FalkorDB instance on port 6379

**Steps:**

```bash
# Set up virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
export FALKORDB_HOST=localhost
export FALKORDB_PORT=6379
# export OPENAI_API_KEY=sk-...  # Optional but recommended

# Run API server
python app.py
```

**Expected startup output:**

```
[INFO] Loading configuration...
[INFO] Connecting to FalkorDB at localhost:6379
[INFO] FalkorDB connected successfully
[INFO] Starting enrichment worker thread
[INFO] Starting embedding worker thread
[INFO] Starting consolidation scheduler
 * Running on http://[::]:8001
```

:::note
Without `OPENAI_API_KEY`, the system uses `PlaceholderEmbeddingProvider` which generates deterministic hash-based vectors with no semantic meaning. Memory storage and graph operations still work, but recall quality will be degraded.
:::

---

## Phase 2: Verify the Server

Before installing the MCP client, verify the AutoMem service is running correctly.

### Health Check

```bash
# Railway
curl https://your-project.up.railway.app/health \
  -H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"

# Docker Compose or local
curl http://localhost:8001/health
```

**Expected healthy response:**

```json
{
  "status": "healthy",
  "falkordb": "connected",
  "qdrant": "connected",
  "memory_count": 0,
  "enrichment": {
    "status": "running",
    "queue_depth": 0
  },
  "graph": "memories"
}
```

**Health response fields:**

| Field | Type | Description |
|---|---|---|
| `status` | string | Overall health: `"healthy"` or `"unhealthy"` |
| `falkordb` | string | FalkorDB connection: `"connected"` or error message |
| `qdrant` | string | Qdrant connection: `"connected"`, `"unavailable"`, or `"not configured"` |
| `memory_count` | integer | Total memories in graph |
| `enrichment.status` | string | Worker thread state: `"running"` or `"stopped"` |
| `enrichment.queue_depth` | integer | Pending enrichment jobs |
| `graph` | string | FalkorDB graph name (default: `memories`) |

```mermaid
sequenceDiagram
    participant Client
    participant Flask as "app.py<br/>/health endpoint"
    participant FalkorDB
    participant Qdrant

    Client->>Flask: GET /health

    Flask->>FalkorDB: Redis PING command
    FalkorDB-->>Flask: PONG

    alt Qdrant configured
        Flask->>Qdrant: GET /collections
        Qdrant-->>Flask: 200 OK
    else Qdrant not configured
        Flask->>Flask: Skip Qdrant check
    end

    Flask-->>Client: 200 OK JSON response

    Note over Client,Flask: Response includes:<br/>- status: "healthy"<br/>- falkordb: "connected"<br/>- qdrant: "connected" or "unavailable"<br/>- memory_count: integer<br/>- enrichment: worker status
```

**Troubleshooting health check failures:**

| Error | Cause | Fix |
|---|---|---|
| `503 Service Unavailable` | FalkorDB connection failed | Check `FALKORDB_HOST` and `FALKORDB_PORT` configuration |
| `"qdrant": "unavailable"` | Qdrant unavailable (non-critical) | Verify `QDRANT_URL`, or ignore — system degrades gracefully |
| Connection refused | API not listening on expected port | Ensure `PORT=8001` is set |
| `401 Unauthorized` | Wrong API token | Verify `AUTOMEM_API_TOKEN` matches request header |

:::note
A `"qdrant": "unavailable"` response is **expected behavior** if Qdrant is not configured. AutoMem gracefully degrades to graph-only mode — all other functionality continues. To enable Qdrant, set the `QDRANT_URL` environment variable and restart the service.
:::

---

## Phase 3: Install the MCP Client

With the server running and verified, install the MCP client and connect it to your server.

### Run the Setup Wizard

```bash
npx @verygoodplugins/mcp-automem setup
```

The setup wizard performs four operations:

```mermaid
sequenceDiagram
    participant User
    participant CLI as setup command<br/>(src/cli/setup.js)
    participant ENV as .env file
    participant API as AutoMem Service

    User->>CLI: npx mcp-automem setup
    CLI->>User: Prompt: AutoMem Endpoint?
    User->>CLI: http://localhost:8001
    CLI->>User: Prompt: API Key? (optional)
    User->>CLI: [blank or token]

    CLI->>ENV: Create/update .env<br/>AUTOMEM_ENDPOINT=...<br/>AUTOMEM_API_KEY=...
    ENV-->>CLI: File written

    CLI->>API: GET /health
    alt Service Available
        API-->>CLI: 200 OK<br/>{status: healthy}
        CLI->>User: Connection successful!
    else Service Unavailable
        API-->>CLI: Error
        CLI->>User: Connection failed<br/>Check endpoint and service
    end

    CLI->>User: Print config snippets<br/>(Claude Desktop, Cursor, etc.)
```

**Key configuration variables:**

| Variable | Required | Description |
|---|---|---|
| `AUTOMEM_ENDPOINT` | Yes | URL to AutoMem service (e.g., `http://localhost:8001` or Railway URL) |
| `AUTOMEM_API_KEY` | For Railway | API key for authenticated instances. Omit for local development. |

**Default values if not set:**
- `AUTOMEM_ENDPOINT`: `http://localhost:8001`
- `AUTOMEM_API_KEY`: omitted from requests if not set

:::tip
The setup wizard creates `.env` in the **current directory** where you run the command. The MCP server loads this file automatically via `dotenv` when it starts.

For Railway deployments, `AUTOMEM_API_KEY` is required. For local Docker Compose, it is not needed.
:::

---

## Phase 4: Connect Claude Desktop

The setup wizard prints configuration snippets for each platform. Here is how to apply the Claude Desktop configuration.

### Locate the Config File

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

### Add the MCP Server Configuration

Edit `claude_desktop_config.json` and add the `mcp-automem` entry to the `mcpServers` object:

**For local Docker Compose (no API key needed):**

```json
{
  "mcpServers": {
    "mcp-automem": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_ENDPOINT": "http://localhost:8001"
      }
    }
  }
}
```

**For Railway (API key required):**

```json
{
  "mcpServers": {
    "mcp-automem": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_ENDPOINT": "https://your-project.up.railway.app",
        "AUTOMEM_API_KEY": "your-api-token-here"
      }
    }
  }
}
```

:::caution
Provide the API key as-is (no `Bearer` prefix). The `AutoMemClient` automatically adds `"Bearer "` to the `Authorization` header before sending requests.
:::

### Restart Claude Desktop

Quit Claude Desktop completely (not just close the window) and reopen it. The memory tools should now appear.

:::note
**Verify JSON syntax.** The `claude_desktop_config.json` file must have no trailing commas. A single syntax error will prevent Claude Desktop from loading any MCP servers.
:::

---

## Phase 5: Verify the Full Stack

With Claude Desktop open and the MCP server loaded, test the end-to-end flow.

### Check Health

Ask Claude: *"Check the AutoMem database health"*

This triggers the `check_database_health` tool, which sends `GET /health` to your AutoMem service. The response shows connectivity status for both FalkorDB and Qdrant.

### Store Your First Memory

Ask Claude: *"Remember that I prefer TypeScript over JavaScript for new projects"*

The `store_memory` tool validates content length (max 2000 characters hard limit, 500 soft limit), then sends a `POST /memory` request. You should receive a `201 Created` response with a `memory_id`.

Internally, after storage:

1. `MemoryClassifier` classifies the content type
2. `EmbeddingProvider` generates a vector
3. FalkorDB stores the canonical record
4. Qdrant stores the vector for semantic search (if available)
5. Background enrichment queues entity extraction and relationship mapping

```mermaid
sequenceDiagram
    participant UI as "Claude Desktop UI"
    participant MCP as "MCP Client"
    participant TOOL as "store_memory handler<br/>src/index.ts"
    participant CLIENT as "AutoMemClient<br/>src/automem-client.ts"
    participant API as "AutoMem API"

    UI->>MCP: User instructs Claude
    MCP->>MCP: Custom instructions trigger
    MCP->>TOOL: Call tool with params
    TOOL->>TOOL: Validate content size<br/>< 2000 chars
    TOOL->>CLIENT: storeMemory()
    CLIENT->>API: POST /memory
    API-->>CLIENT: {memory_id}
    CLIENT-->>TOOL: Response
    TOOL-->>MCP: Success + warnings
    MCP-->>UI: Display result
```

### Recall the Memory

Ask Claude: *"What are my language preferences?"*

The `recall_memory` tool runs hybrid search with parallel queries — both `/recall` (semantic + keyword search) and `/memory/by-tag` endpoints simultaneously — then merges the results. You should see the preference you just stored returned in context.

---

## Authentication

AutoMem accepts tokens via three methods, in order of preference:

1. **Bearer token** (recommended):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/health
   ```

2. **Custom header**:
   ```bash
   curl -H "X-API-Token: YOUR_TOKEN" http://localhost:8001/health
   ```

3. **Query parameter** (discouraged in production — tokens appear in logs):
   ```bash
   curl "http://localhost:8001/health?token=YOUR_TOKEN"
   ```

**Admin operations** require an additional header:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Admin-Token: YOUR_ADMIN_TOKEN" \
     http://localhost:8001/admin/...
```

---

## Troubleshooting

### Connection Failed During Setup

**Symptom:** Setup wizard reports "Connection failed" when testing endpoint.

**Causes and solutions:**

1. **AutoMem service not running** — verify with `docker ps | grep automem` (local) or check Railway logs (cloud)
2. **Incorrect endpoint URL:**
   - Local: must be `http://localhost:8001` (not `127.0.0.1` in some setups)
   - Railway: must include `https://` scheme
   - No trailing slashes — omit them
3. **Port 8001 not accessible** — check firewall rules; verify Railway service public networking is enabled

### MCP Server Not Appearing in Claude Desktop

**Symptom:** After configuration, memory tools don't appear in Claude Desktop.

**Solutions:**
- Restart Claude Desktop completely (quit, not just close the window)
- Verify JSON syntax in `claude_desktop_config.json` — no trailing commas
- Check file location matches your OS (see platform config paths above)

### Authentication Errors

**Symptom:** "Unauthorized" or "403 Forbidden" errors when using memory tools.

**Causes:**
1. **Missing API key for Railway deployment** — Railway deployments require `AUTOMEM_API_KEY`; local development does not
2. **Incorrect API key format** — provide the key as-is without a "Bearer" prefix; `AutoMemClient` adds it automatically

### Memory Not Stored

**Symptom:** `store_memory` succeeds but memory is not recalled later.

**Debug steps:**
1. Check database health — both FalkorDB and Qdrant should show as connected
2. Check content length — memories over 2000 characters are rejected; memories over 500 characters may be summarized by the backend before embedding

### Quick Reference

| Issue | Quick Fix | Details |
|---|---|---|
| `401 Unauthorized` | Verify `AUTOMEM_API_TOKEN` matches request header | [Authentication](#authentication) |
| `503 Service Unavailable` | Check `FALKORDB_HOST` and `FALKORDB_PORT` | Health check section above |
| `ECONNREFUSED` | Ensure `PORT=8001` environment variable is set | Railway deployment |
| Qdrant errors (non-blocking) | System continues in graph-only mode | Expected behavior without Qdrant |
| Docker services won't start | Run `make clean` then `make dev` | Docker Compose section above |
| `The engine "node" is incompatible` | Upgrade Node.js to version 20+ | [Prerequisites in Introduction](/docs/getting-started/introduction/) |

---

## Next Steps

With AutoMem running and verified:

- **Other AI platforms** — See the Platform Integrations section for Cursor, Claude Code, OpenAI Codex, Warp Terminal, and Remote MCP for cloud platforms
- **Configuration reference** — See Configuration Reference for all environment variables and embedding provider selection
- **Memory operations** — See Memory Operations for storing with proper tagging and importance scoring, recalling with graph expansion, and creating relationships between memories
- **Production deployment** — See Railway Deployment and Docker Deployment for advanced configuration, monitoring, and backup strategies
- **API reference** — See the API Reference section for complete endpoint documentation and direct API usage
