---
title: Consolidation Operations
description: Trigger and monitor memory consolidation cycles.
sidebar:
  order: 4
---

:::note[Source files]
- [automem/api/consolidation.py](https://github.com/verygoodplugins/automem/blob/28eb916eae430f80ebee57d44f63b712b9d45398/automem/api/consolidation.py) — Consolidation API endpoints
- [consolidation.py](https://github.com/verygoodplugins/automem/blob/28eb916eae430f80ebee57d44f63b712b9d45398/consolidation.py) — Consolidation engine implementation
:::

This page documents the HTTP API endpoints for triggering and monitoring memory consolidation tasks. Consolidation is AutoMem's background maintenance system that mimics biological memory processes — decay, creative association, clustering, and forgetting.

For information about the consolidation engine's internal architecture and algorithms, see [Consolidation Engine](/docs/core-concepts/consolidation/).

---

## Overview

AutoMem provides two REST endpoints for consolidation operations:

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/consolidate` | POST | Manually trigger consolidation tasks | API token |
| `/consolidate/status` | GET | Query scheduler state and last run times | API token |

The consolidation system runs automatically on scheduled intervals (configurable via environment variables), but these endpoints allow manual triggers for testing, debugging, or forcing immediate execution.

---

## System Architecture

```mermaid
graph TB
    subgraph "API Layer"
        PostConsolidate["/consolidate<br/>POST endpoint"]
        GetStatus["/consolidate/status<br/>GET endpoint"]
    end

    subgraph "Consolidation Module"
        Scheduler["ConsolidationScheduler<br/>(Background thread)"]
        Consolidator["MemoryConsolidator<br/>(Task executor)"]
    end

    subgraph "Data Stores"
        FalkorGraph[("FalkorDB Graph<br/>GRAPH_NAME")]
        QdrantVectors[("Qdrant Vectors<br/>COLLECTION_NAME")]
        ControlNode["ConsolidationControl node<br/>(Graph metadata)"]
        RunHistory["ConsolidationRun nodes<br/>(Execution logs)"]
    end

    PostConsolidate -->|"Trigger task"| Consolidator
    GetStatus -->|"Query state"| Scheduler
    GetStatus -->|"Read history"| ControlNode
    GetStatus -->|"Read history"| RunHistory

    Scheduler -->|"Periodic check"| Consolidator
    Consolidator -->|"Read memories"| FalkorGraph
    Consolidator -->|"Semantic search"| QdrantVectors
    Consolidator -->|"Update relevance"| FalkorGraph
    Consolidator -->|"Create edges"| FalkorGraph
    Consolidator -->|"Archive/delete"| FalkorGraph
    Consolidator -->|"Record runs"| ControlNode
    Consolidator -->|"Record runs"| RunHistory
```

---

## POST /consolidate

Manually trigger one or more consolidation tasks.

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mode` | string | No | `"full"` | Task type to execute: `decay`, `creative`, `cluster`, `forget`, `identity`, or `full` |
| `dry_run` | boolean | No | `true` | If `true`, simulate without making changes |

### Task Types

| Task | Default Interval | Description | Configuration Variable |
|------|-----------------|-------------|----------------------|
| `decay` | 86400s (24 hours) | Apply exponential relevance decay to memories | `CONSOLIDATION_DECAY_INTERVAL_SECONDS` |
| `creative` | 604800s (7 days) | Discover hidden associations (REM-like) | `CONSOLIDATION_CREATIVE_INTERVAL_SECONDS` |
| `cluster` | 2592000s (30 days) | Group semantically similar memories | `CONSOLIDATION_CLUSTER_INTERVAL_SECONDS` |
| `forget` | 0 (disabled) | Archive/delete low-relevance memories | `CONSOLIDATION_FORGET_INTERVAL_SECONDS` |
| `identity` | 604800s (7 days) when `IDENTITY_SYNTHESIS_ENABLED=true`, otherwise 0 (disabled) | Entity dedup + identity synthesis (requires an OpenAI client) | `CONSOLIDATION_IDENTITY_INTERVAL_SECONDS` |
| `full` | N/A | Execute `decay`, `creative`, `cluster` and `forget` in sequence, plus `identity` when `IDENTITY_SYNTHESIS_ENABLED=true` | N/A |

### Execution Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as "POST /consolidate"
    participant Consolidator as MemoryConsolidator
    participant FalkorDB
    participant Qdrant

    Client->>API: "POST /consolidate<br/>{mode: 'decay', dry_run: false}"
    API->>API: "Validate API token"

    API->>Consolidator: "consolidate(mode=mode, dry_run=dry_run)"

    alt dry_run=true
        Consolidator-->>API: "Simulated results (no writes)"
        API-->>Client: "200 {status: 'success', consolidation: {...}}"
    else dry_run=false
        Consolidator->>FalkorDB: "Read Memory nodes"
        Consolidator->>Qdrant: "Search vectors (if needed)"
        Consolidator->>FalkorDB: "Update nodes/edges"
        Consolidator-->>API: "Results + metrics"
        API->>FalkorDB: "persist_run() — Create ConsolidationRun node"
        API-->>Client: "200 {status: 'success', consolidation: {...}}"
    end
```

### Response Format

#### Success (200 OK)

The `consolidation` object is the return value of `MemoryConsolidator.consolidate()`. It echoes `mode` and `dry_run`, carries `started_at` / `completed_at` timestamps and a `success` flag, and nests per-task statistics under `steps` keyed by task name — the stats are not spread at the top level:

```json
{
  "status": "success",
  "consolidation": {
    "mode": "decay",
    "dry_run": false,
    "started_at": "2025-01-15T08:00:00+00:00",
    "steps": {
      "decay": { "processed": 42, "avg_relevance_before": 0.61, "avg_relevance_after": 0.59, "distribution": {} }
    },
    "completed_at": "2025-01-15T08:00:01+00:00",
    "success": true
  }
}
```

For `mode="full"`, `steps` carries one entry per task that ran. Each task reports its own keys:

```json
{
  "status": "success",
  "consolidation": {
    "mode": "full",
    "dry_run": false,
    "started_at": "2025-01-15T08:00:00+00:00",
    "steps": {
      "decay": { "processed": 42, "avg_relevance_before": 0.61, "avg_relevance_after": 0.59, "distribution": {} },
      "creative": { "discovered": 8, "created": 8, "sample_associations": [] },
      "cluster": { "clusters_found": 3, "meta_memories_created": 3, "sample_clusters": [] },
      "forget": { "examined": 120, "archived": [], "deleted": [], "preserved": 118, "protected": [] },
      "identity": { "skipped": true, "reason": "Identity synthesis is disabled" }
    },
    "completed_at": "2025-01-15T08:00:10+00:00",
    "success": true
  }
}
```

On an internal failure the endpoint still returns `200` with `success: false` and an `error` string inside `consolidation`; only an exception raised outside `consolidate()` produces the `500` shape below.

#### Error (500 Internal Server Error)

```json
{
  "error": "Consolidation failed",
  "details": "Connection refused"
}
```

### Usage Examples

**Trigger full consolidation:**

```bash
curl -X POST https://your-automem-instance/consolidate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full", "dry_run": false}'
```

**Trigger single task (decay):**

```bash
curl -X POST https://your-automem-instance/consolidate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "decay", "dry_run": false}'
```

---

## GET /consolidate/status

**Authentication:** API token (same as every other endpoint — the global `before_request` guard exempts only `/health`, `/backup`, and `/viewer/*`)

Query the current state of the consolidation scheduler and retrieve execution history.

The number of history records returned is controlled server-side by `CONSOLIDATION_HISTORY_LIMIT` (default: 20); this endpoint accepts no query parameters.

### Response Format

```json
{
  "status": "success",
  "next_runs": {
    "decay": "2025-01-16T08:00:00Z",
    "creative": "2025-01-22T08:00:00Z",
    "cluster": "2025-02-15T08:00:00Z",
    "forget": null
  },
  "history": [
    {
      "task": "decay",
      "timestamp": "2025-01-15T08:00:00Z",
      "duration_seconds": 1.23,
      "updates": 42
    },
    {
      "task": "creative",
      "timestamp": "2025-01-15T08:00:00Z",
      "duration_seconds": 2.45,
      "associations": 8
    }
  ],
  "thread_alive": true,
  "tick_seconds": 60
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"success"` |
| `next_runs.<task>` | string (ISO 8601) \| null | Calculated next execution time (null if task is disabled) |
| `history[].task` | string | Task type that was executed |
| `history[].timestamp` | string (ISO 8601) | Execution start time |
| `history[].duration_seconds` | float | Time taken to complete |
| `history[].updates` | integer | Nodes updated (decay task) |
| `history[].associations` | integer | Edges created (creative task) |
| `history[].clusters` | integer | MetaMemory nodes created (cluster task) |
| `history[].forgotten` | integer | Memories archived/deleted (forget task) |
| `thread_alive` | boolean | Whether the background scheduler thread is active |
| `tick_seconds` | integer | Polling interval for the scheduler loop |

### Usage Examples

**Check last run times and history:**

```bash
curl "https://your-automem-instance/consolidate/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Control Node Storage

Consolidation state is persisted in FalkorDB using two node types:

### ConsolidationControl Node

Properties correspond to the `CONSOLIDATION_TASK_FIELDS` mapping in `automem/config.py`. A single `ConsolidationControl` node (with ID controlled by `CONSOLIDATION_CONTROL_NODE_ID`, defaulting to `"global"`) stores the last run timestamps for all four tasks.

### ConsolidationRun Nodes

Each execution creates a timestamped record stored as a `ConsolidationRun` node in FalkorDB. The `/consolidate/status` endpoint reads the most recent `ConsolidationRun` nodes ordered by timestamp descending, up to the number configured by `CONSOLIDATION_HISTORY_LIMIT` (default 20).

---

## Configuration

Consolidation behavior is controlled via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CONSOLIDATION_TICK_SECONDS` | 60 | Scheduler loop polling interval |
| `CONSOLIDATION_DECAY_INTERVAL_SECONDS` | 86400 | Minimum time between decay runs |
| `CONSOLIDATION_CREATIVE_INTERVAL_SECONDS` | 604800 | Minimum time between creative runs |
| `CONSOLIDATION_CLUSTER_INTERVAL_SECONDS` | 2592000 | Minimum time between cluster runs |
| `CONSOLIDATION_FORGET_INTERVAL_SECONDS` | 0 | Minimum time between forget runs (0 = disabled) |
| `IDENTITY_SYNTHESIS_ENABLED` | `false` | Enables the `identity` step inside `mode="full"` |
| `CONSOLIDATION_IDENTITY_INTERVAL_SECONDS` | 604800 when `IDENTITY_SYNTHESIS_ENABLED=true`, else 0 | Minimum time between identity runs (0 = disabled) |
| `CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD` | 0.3 | Restricts scheduled `decay` runs to memories whose `importance` is **at or above** this value; lower-importance memories are skipped. Applied only by the background scheduler — a manual `POST /consolidate` passes no threshold and decays everything |
| `CONSOLIDATION_PROTECTED_TYPES` | `"Decision,Insight"` | Memory types exempt from forget task |
| `CONSOLIDATION_GRACE_PERIOD_DAYS` | 90 | Days before a memory is eligible for forgetting |
| `CONSOLIDATION_DELETE_THRESHOLD` | 0.0 | Relevance score below which memories are deleted |
| `CONSOLIDATION_ARCHIVE_THRESHOLD` | 0.0 | Relevance score below which memories are archived |
| `CONSOLIDATION_HISTORY_LIMIT` | 20 | Default number of history records to return |
| `CONSOLIDATION_CONTROL_NODE_ID` | `"global"` | ID of the ConsolidationControl node |

**Example configuration:**

```bash
CONSOLIDATION_TICK_SECONDS=30
CONSOLIDATION_DECAY_INTERVAL_SECONDS=1800
CONSOLIDATION_CREATIVE_INTERVAL_SECONDS=3600
CONSOLIDATION_CLUSTER_INTERVAL_SECONDS=14400
CONSOLIDATION_FORGET_INTERVAL_SECONDS=43200
CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD=0.4
```

---

## Authentication

Both `POST /consolidate` and `GET /consolidate/status` require authentication using the `AUTOMEM_API_TOKEN`. Three authentication methods are supported:

1. **Bearer Token** (recommended): `Authorization: Bearer <token>`
2. **Custom Header**: `X-API-Key: <token>`
3. **Query Parameter** (discouraged in production): `?api_key=<token>`

Requests to authenticated endpoints without valid authentication receive a `401 Unauthorized` response.

---

## Error Handling

### Client Errors (4xx)

| Status | Condition | Response |
|--------|-----------|----------|
| 401 Unauthorized | Missing or invalid token | `{"error": "Unauthorized"}` |

### Service Unavailable (503)

| Status | Condition | Response |
|--------|-----------|----------|
| 503 Service Unavailable | FalkorDB is unreachable (both endpoints abort before doing any work) | `{"error": "FalkorDB is unavailable"}` |

### Server Errors (5xx)

| Status | Condition | Response |
|--------|-----------|----------|
| 500 Internal Server Error | Task execution exception (POST) | `{"error": "Consolidation failed", "details": "<exception message>"}` |
| 500 Internal Server Error | Status query failure (GET) | `{"error": "Failed to get status", "details": "<exception message>"}` |

All errors are logged with full stack traces to facilitate debugging.

---

## Integration with Background Scheduler

The `ConsolidationScheduler` runs in a background thread started at application initialization. It periodically checks whether each task's interval has elapsed and executes tasks automatically without manual triggers.

The `/consolidate` endpoint triggers immediate execution of consolidation tasks regardless of the scheduler's last run times.

:::tip[When to trigger manual consolidation]
Manually trigger consolidation after:
- Importing a large batch of memories (run `full` to build initial associations)
- Changing decay tuning such as `CONSOLIDATION_BASE_DECAY_RATE` (run `decay` to reapply). Note that a manual `decay` run does not apply `CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD` — that filter is only passed by the background scheduler
- Debugging consolidation behavior (individual task runs)
:::
