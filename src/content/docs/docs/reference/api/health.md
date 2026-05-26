---
title: Health & Analytics
description: Monitor AutoMem service health and analytics.
sidebar:
  order: 6
---

:::note[Source files]
- [automem/api/health.py](https://github.com/verygoodplugins/automem/blob/ed36b98e3e1569dde71aa430417b6549520f7068/automem/api/health.py) — `/health` endpoint
- [automem/api/recall.py](https://github.com/verygoodplugins/automem/blob/ed36b98e3e1569dde71aa430417b6549520f7068/automem/api/recall.py) — `/analyze` and `/startup-recall` endpoints
:::

AutoMem provides three monitoring and introspection endpoints that give visibility into service health, database connectivity, enrichment queue state, and memory graph statistics. These endpoints are essential for deployment monitoring, debugging, and understanding the characteristics of stored memories.

For administrative operations like reprocessing, see [Admin Operations](/docs/reference/api/admin/). For memory operations, see [Memory Operations](/docs/reference/api/memory-operations/).

---

## Overview

| Endpoint | Authentication | Purpose |
|----------|---------------|---------|
| `GET /health` | None | Service health check with database connectivity and queue status |
| `GET /analyze` | API Token | Comprehensive memory graph statistics and patterns |
| `GET /startup-recall` | None | Retrieve high-importance memories for initialization context |

---

## GET /health

The health endpoint provides real-time service status, database connectivity checks, and enrichment pipeline metrics. This endpoint does **not** require authentication and is designed for automated health monitoring systems.

**Authentication:** None required

**Response:** Always returns JSON. HTTP 200 if healthy, HTTP 503 if degraded.

### Health Check Flow

```mermaid
sequenceDiagram
    participant Client
    participant Flask as "Flask API<br/>/health"
    participant FalkorDB
    participant Qdrant
    participant EnrichmentQ as "Enrichment Queue"

    Client->>Flask: GET /health

    Flask->>FalkorDB: MATCH (m:Memory)<br/>RETURN count(m)
    alt FalkorDB connected
        FalkorDB-->>Flask: memory_count
        Note over Flask: status.falkordb = "connected"
    else Connection failed
        FalkorDB-->>Flask: Exception
        Note over Flask: status.falkordb = "disconnected"<br/>status.status = "degraded"
    end

    Flask->>Qdrant: get_collection(COLLECTION_NAME)
    alt Qdrant available
        Qdrant-->>Flask: points_count
        Note over Flask: status.qdrant = "connected"
    else Error
        Qdrant-->>Flask: Exception
        Note over Flask: status.qdrant = "disconnected"<br/>status.status = "degraded"
    end

    Flask->>EnrichmentQ: state.enrichment_queue.qsize()
    EnrichmentQ-->>Flask: queue metrics

    Flask-->>Client: HTTP 200/503 + JSON status
```

### Response Schema

```json
{
  "status": "healthy",
  "falkordb": "connected",
  "qdrant": "connected",
  "memory_count": 1247,
  "vector_count": 1247,
  "sync_status": "synced",
  "vector_dimensions": {
    "configured": 1024,
    "effective": 1024,
    "collection": 1024,
    "mismatch": false
  },
  "enrichment": {
    "status": "running",
    "queue_depth": 3,
    "pending": 2,
    "inflight": 1,
    "processed": 5823,
    "failed": 4
  },
  "graph": "automem",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Top-Level Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Overall health: `"healthy"` or `"degraded"` (degraded when Qdrant unavailable) |
| `falkordb` | string | FalkorDB status: `"connected"` or `"disconnected"` |
| `qdrant` | string | Qdrant status: `"connected"` or `"disconnected"` |
| `memory_count` | integer \| null | Total memories in FalkorDB (null if query fails) |
| `vector_count` | integer \| null | Total points in Qdrant collection (null if unavailable) |
| `sync_status` | string | Drift status between FalkorDB and Qdrant: `"synced"`, `"drift_detected"`, `"orphaned_vectors"`, or `"unknown"` |
| `vector_dimensions` | object | Embedding dimension info: `configured` (from `VECTOR_SIZE`), `effective` (provider-reported), `collection` (Qdrant collection size), `mismatch` (boolean) |
| `enrichment` | object | Enrichment queue metrics (see below) |
| `graph` | string | FalkorDB graph name (`FALKORDB_GRAPH` env variable) |
| `timestamp` | string | ISO 8601 timestamp of health check |

### Enrichment Object Fields

The `enrichment` object provides visibility into the background enrichment pipeline:

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Worker state: `"running"` or `"stopped"` |
| `queue_depth` | integer | Total jobs in queue (pending + inflight) |
| `pending` | integer | Jobs waiting to be processed |
| `inflight` | integer | Jobs currently being processed |
| `processed` | integer | Total jobs completed since service start |
| `failed` | integer | Total jobs that failed permanently |

### Example Request

```bash
curl https://your-automem-instance/health
```

### Graceful Degradation

AutoMem continues operating even when some components are unavailable:

| Component Failure | `status` field | HTTP code | Behavior |
|-------------------|---------------|-----------|---------|
| Qdrant unavailable | `"degraded"` | 503 | `qdrant` shows `"disconnected"`, vector search disabled |
| FalkorDB unavailable | `"degraded"` | 503 | All memory operations fail |
| Enrichment worker stopped | `"healthy"` | 200 | Service runs but enrichment pipeline stops |

:::tip[Drift detection]
Compare `memory_count` (FalkorDB) against `vector_count` (Qdrant) to detect database drift. A significant difference indicates that some memories are missing their vector embeddings and may need `/admin/reembed`. The `sync_status` field summarizes this automatically.
:::

---

## GET /analyze

The analyze endpoint provides comprehensive statistics about the memory graph, including type distributions, entity frequencies, temporal patterns, and relationship counts. Useful for understanding memory characteristics and identifying patterns in stored data.

**Authentication:** Required (`Authorization: Bearer <token>`, `X-API-Key: <token>`, or `?api_key=<token>`)

**Response:** HTTP 200 with JSON analytics, or HTTP 401 if unauthorized.

### Analytics Query Flow

```mermaid
graph TB
    Client[/"GET /analyze<br/>(with API token)"/]
    Auth["_authorize_request()<br/>Validate token"]
    Connect["_get_or_create_graph()<br/>FalkorDB connection"]

    subgraph "Cypher Queries"
        Q1["Query 1:<br/>Total count"]
        Q2["Query 2:<br/>Type distribution"]
        Q3["Query 3:<br/>Entity frequency"]
        Q4["Query 4:<br/>Confidence buckets"]
        Q5["Query 5:<br/>Activity by hour"]
        Q6["Query 6:<br/>Tag frequency"]
        Q7["Query 7:<br/>Relationship counts"]
    end

    Aggregate["Aggregate results<br/>into JSON response"]
    Response[/"HTTP 200 + JSON"/]

    Client-->Auth
    Auth-->|Authorized|Connect
    Auth-->|Unauthorized|Abort401["HTTP 401"]
    Connect-->|Connected|Q1
    Connect-->|Failed|Abort503["HTTP 503"]

    Q1-->Q2
    Q2-->Q3
    Q3-->Q4
    Q4-->Q5
    Q5-->Q6
    Q6-->Q7
    Q7-->Aggregate
    Aggregate-->Response
```

### Analytics Components

The `/analyze` endpoint executes 6 Cypher queries against FalkorDB:

| # | Component | Cypher | Returns |
|---|-----------|--------|---------|
| 1 | Memory Types | `MATCH (m:Memory) WHERE m.type IS NOT NULL RETURN m.type, COUNT(m) as count, AVG(m.confidence) as avg_confidence ORDER BY count DESC` | `{type: {count, average_confidence}}` map |
| 2 | High-Confidence Patterns | `MATCH (p:Pattern) WHERE p.confidence > 0.6 RETURN p.type, p.content, p.confidence, p.observations ORDER BY p.confidence DESC LIMIT 10` | Top 10 pattern objects |
| 3 | Preference Relationships | `MATCH (m1:Memory)-[r:PREFERS_OVER]->(m2:Memory) RETURN m1.content, m2.content, r.context, r.strength ORDER BY r.strength DESC LIMIT 10` | Top 10 preference pairs |
| 4 | Temporal Activity | `MATCH (m:Memory) WHERE m.timestamp IS NOT NULL RETURN m.timestamp, m.importance LIMIT 100` | Aggregated into `hour_HH: {count, avg_importance}` |
| 5 | Entity Frequency | `MATCH (m:Memory) WHERE m.metadata IS NOT NULL RETURN m.metadata LIMIT 200` | Extracts `entities`/`keywords`/`topics` from metadata JSON; top 50 by count |
| 6 | Confidence Distribution | `MATCH (m:Memory) WHERE m.confidence IS NOT NULL RETURN m.confidence LIMIT 500` | Buckets: `low` (< 0.4), `medium` (0.4–0.7), `high` (≥ 0.7) |

Each query is wrapped in a try-except block. If a query fails, the corresponding field is set to `null`, `{}`, or `[]` depending on expected type — partial failures do not prevent a response.

### Response Schema

```json
{
  "status": "success",
  "analytics": {
    "memory_types": {
      "Decision": {"count": 312, "average_confidence": 0.851},
      "Pattern": {"count": 289, "average_confidence": 0.803}
    },
    "patterns": [
      {"type": "workflow", "description": "User iterates on code before committing", "confidence": 0.9, "observations": 12}
    ],
    "preferences": [
      {"prefers": "TypeScript", "over": "JavaScript", "context": "new projects", "strength": 0.95}
    ],
    "temporal_insights": {
      "hour_09": {"count": 145, "avg_importance": 0.72},
      "hour_14": {"count": 134, "avg_importance": 0.65}
    },
    "entity_frequency": {"python": 87, "fastapi": 54},
    "confidence_distribution": {"low": 23, "medium": 187, "high": 1037}
  }
}
```

### Example Requests

```bash
# Basic analytics
curl "https://your-automem-instance/analyze" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# With custom API key header
curl "https://your-automem-instance/analyze" \
  -H "X-API-Key: YOUR_API_TOKEN"
```

### Use Cases

| Use Case | Relevant Fields |
|----------|-----------------|
| Identify memory class imbalance | `memories_by_type` |
| Find frequently discussed projects or tools | `top_entities` |
| Assess overall memory quality | `confidence_distribution` |
| Understand when memories are most created | `activity_by_hour` |
| Audit tagging consistency | `top_tags` |
| Verify enrichment pipeline results | `relationships["SIMILAR_TO"]`, `relationships["EXEMPLIFIES"]` |
| Detect temporal validity issues | `relationships["INVALIDATED_BY"]`, `relationships["EVOLVED_INTO"]` |

---

## GET /startup-recall

The startup recall endpoint returns a curated set of memories suitable for initializing AI agent context at session start. It prioritizes high-importance memories and falls back to recent memories to ensure the agent always has relevant context.

**Authentication:** None required

**Query Parameters:** None

**Response:** HTTP 200 with JSON memory list, or HTTP 503 if FalkorDB unavailable.

### Startup Recall Flow

```mermaid
sequenceDiagram
    participant Client
    participant Flask as "Flask API<br/>/startup-recall"
    participant FalkorDB

    Client->>Flask: GET /startup-recall

    Flask->>FalkorDB: MATCH (m:Memory)<br/>WHERE 'critical' IN m.tags<br/>OR 'lesson' IN m.tags<br/>OR 'ai-assistant' IN m.tags<br/>ORDER BY m.importance DESC LIMIT 10
    FalkorDB-->>Flask: critical_lessons (up to 10)

    Flask->>FalkorDB: MATCH (m:Memory)<br/>WHERE 'system' IN m.tags<br/>OR 'memory-recall' IN m.tags<br/>LIMIT 5
    FalkorDB-->>Flask: system_rules (up to 5)

    Flask-->>Client: HTTP 200 + JSON<br/>{status, critical_lessons, system_rules,<br/>lesson_count, has_critical, summary}
```

### Retrieval Strategy

The endpoint runs two sequential Cypher queries:

**Phase 1: Critical / Lesson Memories**

```cypher
MATCH (m:Memory)
WHERE 'critical' IN m.tags OR 'lesson' IN m.tags OR 'ai-assistant' IN m.tags
RETURN m.id, m.content, m.tags, m.importance, m.type, m.metadata
ORDER BY m.importance DESC
LIMIT 10
```

Returns memories tagged as critical lessons or AI-assistant instructions, ordered by importance.

**Phase 2: System Rules**

```cypher
MATCH (m:Memory)
WHERE 'system' IN m.tags OR 'memory-recall' IN m.tags
RETURN m.id, m.content, m.tags
LIMIT 5
```

Returns system-level rules and memory-recall directives.

### Response Schema

```json
{
  "status": "success",
  "critical_lessons": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "content": "User prefers TypeScript over JavaScript for new projects",
      "tags": ["preference", "language:typescript", "critical"],
      "importance": 0.9,
      "type": "Preference",
      "metadata": {}
    }
  ],
  "system_rules": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "content": "Always respond in English",
      "tags": ["system"]
    }
  ],
  "lesson_count": 1,
  "has_critical": true,
  "summary": "Recalled 1 lesson(s) and 1 system rule(s)"
}
```

### Example Request

```bash
curl https://your-automem-instance/startup-recall
```

### Integration with AI Agents

The startup recall endpoint is designed for session initialization. A typical MCP client uses it at startup to load context into the agent's working memory:

```python
# At session start, load context memories
response = requests.get(f"{AUTOMEM_URL}/startup-recall")
memories = response.json()["memories"]

# Inject into system prompt
context_block = "\n".join([f"- {m['content']}" for m in memories])
system_prompt = f"Known context:\n{context_block}\n\n{base_prompt}"
```

:::tip[Startup recall vs. recall_memory]
Use `/startup-recall` for passive context loading at session start. Use `/recall` (or the `recall_memory` MCP tool) for active retrieval when answering specific questions. Startup recall selects by importance, not relevance to any particular query.
:::

---

## Monitoring Integration

### Health Monitoring Service

```mermaid
graph LR
    subgraph "Health Monitoring Flow"
        Monitor["Health Monitor Service<br/>(Python script)"]
        Health["/health endpoint"]
        FalkorDB[("FalkorDB<br/>graph database")]
        Qdrant[("Qdrant<br/>vector database")]
        EnrichQ["Enrichment Queue"]
        Alert["Alert System<br/>(Slack/Discord/Webhook)"]
    end

    Monitor-->|"Poll every 5min"|Health
    Health-->|"Count query"|FalkorDB
    Health-->|"Get collection"|Qdrant
    Health-->|"Queue status"|EnrichQ
    Health-->|"Return metrics"|Monitor
    Monitor-->|"If memory_count vs vector_count drift > 5%"|Alert
    Monitor-->|"If degraded"|Alert
```

For production deployments, a health monitoring service polls `/health` on an interval and takes action on anomalies:

- Polls `/health` every 5 minutes (configurable)
- Compares `memory_count` (FalkorDB) vs `vector_count` (Qdrant) to detect drift
- Triggers alerts if drift exceeds 5%
- Optionally triggers auto-recovery via `recover_from_qdrant.py`

### Structured Logging

All three endpoints emit structured logs for observability. Enable detailed logging via the `AUTOMEM_LOG_LEVEL` environment variable:

```bash
AUTOMEM_LOG_LEVEL=DEBUG
```

Log entries include request context (endpoint, duration, result counts) suitable for ingestion into log aggregation platforms (Datadog, Grafana Loki, CloudWatch).

### Alert Thresholds

| Condition | Recommended Alert |
|-----------|------------------|
| `status: "degraded"` | Immediate page — FalkorDB or Qdrant unavailable |
| `qdrant` shows `"disconnected"` | Warning — vector search degraded |
| `memory_count` vs `vector_count` drift > 5% | Warning — run `/admin/reembed` |
| `enrichment.status: "stopped"` | Warning — enrichment stopped, restart service |
| `enrichment.failed` count growing | Investigation — check application logs |

See [Operations / Health](/docs/operations/health/) for complete monitoring and recovery procedures.
