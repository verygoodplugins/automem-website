---
title: Environment Variables
description: Complete reference for all AutoMem configuration environment variables.
sidebar:
  order: 4
---

This page is a quick-reference table of all AutoMem environment variables, grouped by category. For full documentation of each variable including validation rules, behavior details, and configuration examples, see [Configuration Reference](/docs/reference/configuration/).

---

## Configuration Loading

Variables are loaded from multiple sources in priority order:

1. **Process environment** — `export VAR=value` or variables injected by the platform (Railway, Docker)
2. **Project `.env`** — File in repository root
3. **User config** — `~/.config/automem/.env` (personal overrides, never committed)

Variables set earlier in this list take precedence over later sources.

:::tip
Use `~/.config/automem/.env` for personal API keys and secrets that should never be committed. Use project `.env` for shared development defaults like `FALKORDB_HOST=localhost`.
:::

---

## Server Variables

### Core Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FALKORDB_HOST` | Yes | `localhost` | FalkorDB graph database hostname |
| `FALKORDB_PORT` | Yes | `6379` | FalkorDB port |
| `FALKORDB_PASSWORD` | No | _unset_ | FalkorDB/Redis password (set in production) |
| `FALKORDB_GRAPH` | No | `memories` | Graph name for Cypher queries |
| `GRAPH_NAME` | No | `memories` | Alias for `FALKORDB_GRAPH` |
| `PORT` | No | `8001` | Flask API server port |

:::caution
`PORT=8001` is mandatory on Railway. Flask defaults to port 5000 if unset, causing `ECONNREFUSED` errors from other services.
:::

### Vector Search (Qdrant)

AutoMem operates in graph-only mode if these variables are not set. Qdrant enables semantic vector search but is optional.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `QDRANT_URL` | No | _unset_ | Qdrant API endpoint (HTTP or HTTPS) |
| `QDRANT_HOST` | No | _unset_ | Qdrant hostname (alternative to `QDRANT_URL`) |
| `QDRANT_PORT` | No | `6333` | Qdrant port (used with `QDRANT_HOST`) |
| `QDRANT_API_KEY` | No | _unset_ | Qdrant authentication key (required for Qdrant Cloud) |
| `QDRANT_COLLECTION` | No | `memories` | Collection name for memory vectors |
| `COLLECTION_NAME` | No | `memories` | Alias for `QDRANT_COLLECTION` |
| `VECTOR_SIZE` | No | `1024` | Embedding dimension — must match collection (768/1024/2048/3072) |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTOMEM_API_TOKEN` | Yes | _unset_ | Token for all standard API operations |
| `ADMIN_API_TOKEN` | Yes | _unset_ | Token for admin endpoints (`/admin/*`, `/enrichment/reprocess`) |

See [Authentication](/docs/reference/authentication/) for token generation and usage details.

### Embeddings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | No | `auto` | Provider selection: `auto` / `voyage` / `openai` / `local` / `ollama` / `placeholder` |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | OpenAI model name |
| `OPENAI_API_KEY` | No | _unset_ | OpenAI (or compatible provider) API key |
| `OPENAI_BASE_URL` | No | _unset_ | Custom base URL for OpenAI-compatible APIs (OpenRouter, LiteLLM, vLLM) |
| `VOYAGE_API_KEY` | No | _unset_ | Voyage AI API key |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama server endpoint |
| `OLLAMA_MODEL` | No | `nomic-embed-text` | Ollama embedding model |
| `EMBEDDING_BATCH_SIZE` | No | `20` | Items per batch API call (reduces costs 40–50%) |
| `EMBEDDING_BATCH_TIMEOUT_SECONDS` | No | `2.0` | Max wait before flushing a partial batch |

### Enrichment Pipeline

Background enrichment runs after each memory is stored — it generates similarity links, entity tags, and summaries.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENRICHMENT_MAX_ATTEMPTS` | No | `3` | Retry limit before marking a job failed |
| `ENRICHMENT_SIMILARITY_LIMIT` | No | `5` | Number of semantic neighbors to link |
| `ENRICHMENT_SIMILARITY_THRESHOLD` | No | `0.8` | Min cosine similarity for `SIMILAR_TO` edge |
| `ENRICHMENT_IDLE_SLEEP_SECONDS` | No | `2` | Worker sleep duration when queue is empty |
| `ENRICHMENT_FAILURE_BACKOFF_SECONDS` | No | `5` | Delay between retry attempts |
| `ENRICHMENT_ENABLE_SUMMARIES` | No | `true` | Auto-generate memory summaries |
| `ENRICHMENT_SPACY_MODEL` | No | `en_core_web_sm` | spaCy model for NER (if installed) |
| `JIT_ENRICHMENT_ENABLED` | No | `true` | Run enrichment inline on store (just-in-time) |

### Consolidation Engine

Background maintenance cycles that decay, cluster, and optionally forget low-value memories.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONSOLIDATION_TICK_SECONDS` | No | `60` | Scheduler check interval |
| `CONSOLIDATION_DECAY_INTERVAL_SECONDS` | No | `86400` | Decay cycle frequency (1 day) |
| `CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD` | No | `0.3` | Min importance to process in decay |
| `CONSOLIDATION_CREATIVE_INTERVAL_SECONDS` | No | `604800` | Creative association cycle frequency (1 week) |
| `CONSOLIDATION_CLUSTER_INTERVAL_SECONDS` | No | `2592000` | Cluster pattern cycle frequency (1 month) |
| `CONSOLIDATION_FORGET_INTERVAL_SECONDS` | No | `0` | Forget cycle frequency (disabled by default) |
| `CONSOLIDATION_ARCHIVE_THRESHOLD` | No | `0.0` | Relevance threshold for archiving (0.0 = disabled) |
| `CONSOLIDATION_DELETE_THRESHOLD` | No | `0.0` | Relevance threshold for deletion (0.0 = disabled) |
| `CONSOLIDATION_GRACE_PERIOD_DAYS` | No | `90` | Min age in days before a memory can be forgotten |
| `CONSOLIDATION_IMPORTANCE_PROTECTION_THRESHOLD` | No | `0.7` | Memories above this importance are never forgotten |
| `CONSOLIDATION_PROTECTED_TYPES` | No | `Decision,Insight` | Comma-separated types to never forget |
| `CONSOLIDATION_BASE_DECAY_RATE` | No | `0.01` | Base rate applied per decay cycle |
| `CONSOLIDATION_IMPORTANCE_FLOOR_FACTOR` | No | `0.3` | Minimum importance fraction after decay |
| `CONSOLIDATION_HISTORY_LIMIT` | No | `20` | Max consolidation run records retained in the graph |
| `CONSOLIDATION_CONTROL_NODE_ID` | No | `global` | ID of the consolidation control node in the graph |

### Search and Recall

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEARCH_WEIGHT_VECTOR` | No | `0.35` | Vector similarity weight |
| `SEARCH_WEIGHT_KEYWORD` | No | `0.35` | Keyword/TF-IDF matching weight |
| `SEARCH_WEIGHT_TAG` | No | `0.20` | Tag overlap weight |
| `SEARCH_WEIGHT_IMPORTANCE` | No | `0.10` | User-assigned importance weight |
| `SEARCH_WEIGHT_RECENCY` | No | `0.10` | Freshness boost weight |
| `SEARCH_WEIGHT_CONFIDENCE` | No | `0.05` | Memory confidence weight |
| `SEARCH_WEIGHT_EXACT` | No | `0.20` | Content token overlap weight |
| `SEARCH_WEIGHT_RELATION` | No | `0.25` | Graph relation proximity boost |
| `SEARCH_WEIGHT_RELEVANCE` | No | `0.0` | LLM-scored relevance (disabled by default) |
| `RECALL_MAX_LIMIT` | No | `100` | Maximum results returned by `/recall` |
| `RECALL_RELATION_LIMIT` | No | `5` | Max related memories per result |
| `RECALL_EXPANSION_LIMIT` | No | `25` | Max memories added via `expand_relations=true` |
| `RECALL_MIN_SCORE` | No | `0.0` | Minimum score threshold for returned results |
| `RECALL_ADAPTIVE_FLOOR` | No | `true` | Dynamically adjust score floor based on result set |

### Sync Worker

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SYNC_CHECK_INTERVAL_SECONDS` | No | `3600` | Frequency of drift checks between FalkorDB and Qdrant (1 hour) |
| `SYNC_AUTO_REPAIR` | No | `true` | Automatically queue missing embeddings when drift detected |

### Memory Types and Classification

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEMORY_TYPES` | No | `Decision,Pattern,Preference,Style,Habit,Insight,Context` | Comma-separated valid memory types (`Memory` is a legacy alias for `Context`) |
| `RELATIONSHIP_TYPES` | No | `RELATES_TO,LEADS_TO,...` | Comma-separated valid relationship types (14 total) |
| `ALLOWED_RELATIONS` | No | Same as `RELATIONSHIP_TYPES` | Alias for backward compatibility |
| `CLASSIFICATION_MODEL` | No | `gpt-4o-mini` | OpenAI model used for content classification fallback |
| `MEMORY_CONTENT_SOFT_LIMIT` | No | `500` | Character threshold above which a warning is issued and auto-summarize may trigger |
| `MEMORY_CONTENT_HARD_LIMIT` | No | `2000` | Character limit above which the request is rejected immediately |
| `MEMORY_AUTO_SUMMARIZE` | No | `true` | Automatically summarize content exceeding the soft limit |
| `MEMORY_SUMMARY_TARGET_LENGTH` | No | `300` | Target character length for auto-generated summaries |

### API Server

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `FLASK_ENV` | No | `production` | Flask environment mode |

---

## MCP Client Variables

These variables configure the `mcp-automem` client package, not the server.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTOMEM_API_URL` | Yes | `http://127.0.0.1:8001` | HTTP URL of the AutoMem server (canonical name) |
| `AUTOMEM_ENDPOINT` | No | _unset_ | Deprecated alias for `AUTOMEM_API_URL`; still accepted but logs a warning |
| `AUTOMEM_API_KEY` | No | _unset_ | API key for authenticated instances (preferred name) |
| `AUTOMEM_API_TOKEN` | No | _unset_ | Alternative name for the API key |
| `AUTOMEM_LOG_LEVEL` | No | _unset_ | Set to `debug` for verbose MCP client logging |
| `AUTOMEM_PROCESS_TAG` | No | _unset_ | Process title tag for safe process management |
| `MCP_PROCESS_TAG` | No | _unset_ | Alternative process tag variable |

The client checks endpoint variables in this priority order: `AUTOMEM_API_URL` → `AUTOMEM_ENDPOINT` (deprecated).
The client checks API key variables in this priority order: `AUTOMEM_API_KEY` → `AUTOMEM_API_TOKEN`.

---

## Testing Variables

Used only for the AutoMem test suite — do not set in production.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTOMEM_RUN_INTEGRATION_TESTS` | No | `0` | Enable integration test suite |
| `AUTOMEM_START_DOCKER` | No | `0` | Auto-start Docker Compose before tests |
| `AUTOMEM_STOP_DOCKER` | No | `0` | Auto-stop Docker after tests |
| `AUTOMEM_TEST_BASE_URL` | No | `http://localhost:8001` | Test target URL |
| `AUTOMEM_ALLOW_LIVE` | No | `0` | Allow tests against non-localhost URLs |
| `AUTOMEM_TEST_API_TOKEN` | No | _unset_ | API token for integration tests |
| `AUTOMEM_TEST_ADMIN_TOKEN` | No | _unset_ | Admin token for integration tests |

---

## Example Configurations

### Minimal local (graph-only, no vector search)

```bash
AUTOMEM_API_TOKEN=your-token-here
ADMIN_API_TOKEN=your-admin-token-here
FALKORDB_HOST=localhost
FALKORDB_PORT=6379
PORT=8001
```

### Local with OpenAI embeddings and Qdrant

```bash
AUTOMEM_API_TOKEN=your-token-here
ADMIN_API_TOKEN=your-admin-token-here
FALKORDB_HOST=localhost
PORT=8001
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
VECTOR_SIZE=1024
```

### Local with Ollama (fully offline)

```bash
AUTOMEM_API_TOKEN=your-token-here
ADMIN_API_TOKEN=your-admin-token-here
FALKORDB_HOST=localhost
PORT=8001
EMBEDDING_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text
QDRANT_URL=http://localhost:6333
VECTOR_SIZE=768
```

### Railway production

```bash
PORT=8001
FALKORDB_HOST=falkordb.railway.internal
FALKORDB_PORT=6379
FALKORDB_PASSWORD=<generated>
AUTOMEM_API_TOKEN=<generated>
ADMIN_API_TOKEN=<generated>
OPENAI_API_KEY=sk-...
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-key
VECTOR_SIZE=1024
```

### MCP client (in platform config file)

```json
{
  "env": {
    "AUTOMEM_API_URL": "https://your-service.railway.app",
    "AUTOMEM_API_KEY": "your-api-token"
  }
}
```

---

## Security Checklist

- Never commit `.env` files — add to `.gitignore`
- Use strong tokens — minimum 32 bytes: `openssl rand -hex 32`
- Use separate tokens for `AUTOMEM_API_TOKEN` and `ADMIN_API_TOKEN`
- Set `FALKORDB_PASSWORD` in all production environments
- Use HTTPS for all external service endpoints (Qdrant Cloud, OpenAI, Voyage)
- Use Railway private networking — never expose FalkorDB publicly
- Avoid query parameter auth (`?api_key=`) in production — tokens appear in server logs
