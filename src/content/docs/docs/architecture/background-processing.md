---
title: Background Processing
description: "AutoMem's four background workers for async memory processing."
sidebar:
  order: 6
---

:::note[Source files]
Key GitHub sources:
- [app.py](https://github.com/verygoodplugins/automem/blob/main/app.py) — Enrichment worker, embedding worker, sync worker, queue management (lines 1728-2234, 2566-2610)
- [consolidation.py](https://github.com/verygoodplugins/automem/blob/main/consolidation.py) — Consolidation scheduler and tasks (lines 111-684, 773-874)
- [.env.example](https://github.com/verygoodplugins/automem/blob/main/.env.example) — Background processing configuration variables
:::

AutoMem implements four background processing systems that operate independently of the main Flask API request/response cycle. These systems handle computationally expensive operations without blocking client requests.

For detailed implementation of each system, see:

- [Enrichment Pipeline](/docs/architecture/enrichment/) — Entity extraction and relationship building
- [Embedding Generation](/docs/architecture/embeddings/) — Batched vector creation

---

## Four Independent Systems

AutoMem implements four background processing systems, each with distinct triggers, execution models, and responsibilities:

| System | Trigger | Execution Model | Primary Purpose |
|---|---|---|---|
| **Enrichment Pipeline** | Event-driven | Queue + worker thread | Enhance memories with entities, tags, relationships |
| **Embedding Worker** | Event-driven | Queue + batch accumulator | Generate and store vector embeddings |
| **Consolidation Engine** | Time-based | Scheduled intervals | Apply decay, discover associations, cluster, forget |
| **Sync Worker** | Time-based | Interval polling | Detect and repair FalkorDB/Qdrant drift |

---

## Worker Coordination Diagram

```mermaid
graph TB
    subgraph write_ops["Write Operations"]
        PostMem["POST /memory<br/>app.py:~467"]
        PatchMem["PATCH /memory/:id<br/>app.py:~902"]
    end

    subgraph queues["Queue Management"]
        EnrichQueue["enrichment_queue<br/>ServiceState"]
        EmbedQueue["embedding_queue<br/>ServiceState"]

        EnrichPending["enrichment_pending<br/>Set[str]"]
        EnrichInflight["enrichment_inflight<br/>Set[str]"]
        EmbedPending["embedding_pending<br/>Set[str]"]
        EmbedInflight["embedding_inflight<br/>Set[str]"]
    end

    subgraph workers["Worker Threads"]
        direction TB

        EnrichWorker["EnrichmentWorker<br/>_run_enrichment_worker()<br/>app.py:~1200-1400"]
        EmbedWorker["EmbeddingWorker<br/>_run_embedding_worker()<br/>app.py:~1400-1600"]
        ConsolWorker["ConsolidationScheduler<br/>consolidation.py"]
        SyncWorker["SyncWorker<br/>_run_sync_worker()<br/>app.py:~1600-1800"]
    end

    subgraph config["Configuration"]
        EnrichConfig["ENRICHMENT_IDLE_SLEEP_SECONDS=2<br/>ENRICHMENT_MAX_ATTEMPTS=3<br/>ENRICHMENT_SIMILARITY_LIMIT=5"]
        EmbedConfig["EMBEDDING_BATCH_SIZE=20<br/>EMBEDDING_BATCH_TIMEOUT_SECONDS=2.0"]
        ConsolConfig["CONSOLIDATION_TICK_SECONDS<br/>DECAY/CREATIVE/CLUSTER/FORGET<br/>_INTERVAL_SECONDS"]
        SyncConfig["SYNC_CHECK_INTERVAL_SECONDS<br/>SYNC_AUTO_REPAIR=true"]
    end

    PostMem --> EnrichQueue
    PostMem --> EmbedQueue
    PatchMem --> EnrichQueue
    PatchMem -.->|"if content changed"| EmbedQueue

    EnrichQueue --> EnrichPending
    EmbedQueue --> EmbedPending

    EnrichWorker --> EnrichInflight
    EnrichWorker --> EnrichPending
    EmbedWorker --> EmbedInflight
    EmbedWorker --> EmbedPending

    EnrichConfig -.-> EnrichWorker
    EmbedConfig -.-> EmbedWorker
    ConsolConfig -.-> ConsolWorker
    SyncConfig -.-> SyncWorker
```

---

## Queue Management

```mermaid
graph TB
    subgraph "HTTP Request Thread"
        PostMemory["POST /memory<br/>Route handler"]
        PatchMemory["PATCH /memory/:id<br/>Route handler"]
    end

    subgraph "ServiceState Queues"
        EnrichQ["enrichment_queue: Queue<br/>Thread-safe FIFO"]
        EmbedQ["embedding_queue: Queue<br/>Thread-safe FIFO"]

        EnrichPending["enrichment_pending: Set<br/>Dedup tracking"]
        EnrichInflight["enrichment_inflight: Set<br/>Processing tracking"]

        EmbedPending["embedding_pending: Set<br/>Dedup tracking"]
        EmbedInflight["embedding_inflight: Set<br/>Processing tracking"]
    end

    subgraph "Background Worker Threads"
        EnrichWorker["enrichment_worker()<br/>Entity extraction thread"]
        EmbedWorker["embedding_worker()<br/>Batch embedding thread"]
    end

    PostMemory -->|"queue.put(memory_id)"| EnrichQ
    PostMemory -->|"queue.put(memory_id)"| EmbedQ
    PatchMemory -->|"queue.put(memory_id)"| EnrichQ
    PatchMemory -.->|"if content changed"| EmbedQ

    EnrichQ --> EnrichPending
    EmbedQ --> EmbedPending

    EnrichPending -.->|"if not in pending/inflight"| EnrichWorker
    EmbedPending -.->|"if not in pending/inflight"| EmbedWorker

    EnrichWorker -->|"Processing"| EnrichInflight
    EmbedWorker -->|"Processing"| EmbedInflight

    EnrichInflight -.->|"Complete"| EnrichPending
    EmbedInflight -.->|"Complete"| EmbedPending
```

**Key Insights:**
- `POST /memory` writes immediately to FalkorDB, then enqueues background jobs
- Enrichment and embedding workers run continuously in separate threads
- Consolidation scheduler runs periodic checks via Flask-APScheduler
- All systems can operate independently; failures are isolated

---

## Threading Model

All background workers run in daemon threads started during Flask application initialization:

| Component | Started At | Daemon | Lifecycle |
|---|---|---|---|
| `enrichment_worker` | [app.py:2566-2568](https://github.com/verygoodplugins/automem/blob/main/app.py#L2566-L2568) | Yes | Runs until app shutdown |
| `embedding_worker` | [app.py:2570-2572](https://github.com/verygoodplugins/automem/blob/main/app.py#L2570-L2572) | Yes | Runs until app shutdown |
| Consolidation scheduler | [app.py:2586-2610](https://github.com/verygoodplugins/automem/blob/main/app.py#L2586-L2610) | Via APScheduler | Managed by scheduler |

**Thread Safety:**
- `enrichment_queue` and `embedding_queue` use Python's thread-safe `Queue` class
- Each worker polls its queue in an infinite loop with timeout-based blocking
- FalkorDB and Qdrant clients are thread-safe for read/write operations

---

## Lifecycle and Startup

### Application Startup Sequence

1. Database clients initialized: [app.py:2495-2565](https://github.com/verygoodplugins/automem/blob/main/app.py#L2495-L2565)
2. Consolidator created: [app.py:2574-2584](https://github.com/verygoodplugins/automem/blob/main/app.py#L2574-L2584)
3. Enrichment worker started: [app.py:2566-2568](https://github.com/verygoodplugins/automem/blob/main/app.py#L2566-L2568)
4. Embedding worker started: [app.py:2570-2572](https://github.com/verygoodplugins/automem/blob/main/app.py#L2570-L2572)
5. Scheduler initialized and started: [app.py:2586-2610](https://github.com/verygoodplugins/automem/blob/main/app.py#L2586-L2610)

### Graceful Shutdown

All background threads are daemon threads, meaning they terminate automatically when the main Flask process exits. No explicit cleanup is required.

**Implications:**
- In-flight enrichment/embedding jobs may be lost on shutdown
- Consolidation tasks may be interrupted mid-run
- Queue contents are not persisted between restarts
- Restarting the service will reprocess queued items from scratch (new memories will be re-enqueued on next access or re-enrichment trigger)

---

## Configuration Reference

### Enrichment Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ENRICHMENT_MAX_ATTEMPTS` | 3 | Max retries per memory |
| `ENRICHMENT_SIMILARITY_LIMIT` | 5 | Max similar neighbors to link |
| `ENRICHMENT_SIMILARITY_THRESHOLD` | 0.8 | Min cosine similarity for `SIMILAR_TO` edge |
| `ENRICHMENT_IDLE_SLEEP_SECONDS` | 2.0 | Queue poll timeout |
| `ENRICHMENT_FAILURE_BACKOFF_SECONDS` | 5.0 | Base backoff on failure |
| `ENRICHMENT_ENABLE_SUMMARIES` | true | Generate content summaries |
| `ENRICHMENT_SPACY_MODEL` | `en_core_web_sm` | spaCy model for NER |

### Embedding Configuration

| Variable | Default | Purpose |
|---|---|---|
| `EMBEDDING_BATCH_SIZE` | 20 | Items per batch |
| `EMBEDDING_BATCH_TIMEOUT_SECONDS` | 2.0 | Max wait before processing partial batch |

### Consolidation Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CONSOLIDATION_TICK_SECONDS` | 60 | Scheduler check interval |
| `CONSOLIDATION_DECAY_INTERVAL_SECONDS` | 3600 | Decay task frequency (1 hour) |
| `CONSOLIDATION_CREATIVE_INTERVAL_SECONDS` | 3600 | Creative task frequency (1 hour) |
| `CONSOLIDATION_CLUSTER_INTERVAL_SECONDS` | 21600 | Cluster task frequency (6 hours) |
| `CONSOLIDATION_FORGET_INTERVAL_SECONDS` | 86400 | Forget task frequency (1 day) |
| `CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD` | 0.3 | Min importance for decay (optional filter) |
| `CONSOLIDATION_HISTORY_LIMIT` | 20 | Max consolidation run history |

---

## Monitoring and Health

### Health Endpoint Statistics

The `/health` endpoint exposes real-time statistics for all background systems:

| Metric | Source | Interpretation |
|---|---|---|
| `enrichment.queue_depth` | [app.py:2255](https://github.com/verygoodplugins/automem/blob/main/app.py#L2255) | Items waiting in queue |
| `enrichment.pending` | [app.py:2252](https://github.com/verygoodplugins/automem/blob/main/app.py#L2252) | Memories not yet enriched in graph |
| `enrichment.inflight` | [app.py:2253](https://github.com/verygoodplugins/automem/blob/main/app.py#L2253) | Currently processing |
| `enrichment.processed` | `EnrichmentStats.successes` | Total completed |
| `enrichment.failed` | `EnrichmentStats.failures` | Total failed |
| `embedding.queue_depth` | [app.py:2267](https://github.com/verygoodplugins/automem/blob/main/app.py#L2267) | Embeddings queued for generation |
| `consolidation.last_runs` | `ConsolidationScheduler` | Last execution timestamps |
| `consolidation.next_runs` | `ConsolidationScheduler.get_next_runs()` | Time until next run |

### Admin Endpoints

Advanced monitoring available via admin token:

| Endpoint | Method | Purpose |
|---|---|---|
| `/enrichment/status` | GET | Detailed enrichment stats + sample pending IDs |
| `/enrichment/reprocess` | POST | Re-enqueue specific memory IDs |
| `/consolidate` | POST | Manually trigger consolidation tasks |
| `/consolidate/status` | GET | Consolidation history and next run times |

---

## Error Handling and Retry Logic

### Enrichment Retries

Failed enrichment jobs are automatically retried with exponential backoff:

- Max attempts: `ENRICHMENT_MAX_ATTEMPTS` (default: 3)
- Base backoff: `ENRICHMENT_FAILURE_BACKOFF_SECONDS` (default: 5.0)
- Backoff formula: `base_backoff * (5 ** attempt)`
- Failed jobs logged and removed from queue after max attempts

### Embedding Retries

Embedding failures are currently not retried at the batch level. If a batch fails:

1. Error is logged
2. Memories remain without embeddings in Qdrant
3. Graph metadata `embedding_status` remains in queue state
4. Re-embedding can be triggered via `/admin/reembed`

### Consolidation Failures

Consolidation tasks catch exceptions and continue:

- Failed tasks are logged with error details
- Next scheduled run proceeds normally
- Individual task failures don't affect other tasks
- History includes error details for debugging

---

## Performance Characteristics

### Resource Usage

| System | CPU Usage | Memory Usage | I/O Pattern |
|---|---|---|---|
| Enrichment | Moderate (spaCy NER) | Low per job | Burst writes to graph |
| Embedding | Low (network-bound) | Low (batch accumulator) | Batched API calls |
| Consolidation | High (graph traversal) | Moderate (in-memory cache) | Large read + write operations |
| Sync Worker | Low (periodic scans) | Low | Periodic graph + vector queries |

### Optimization Features

**Embedding Batching (40-50% cost reduction):**
- Accumulates up to 20 memories before calling provider API
- Single API call generates embeddings for entire batch
- Timeout ensures responsiveness (max 2s delay)

**Relationship Count Caching (80% consolidation speedup):**
- LRU cache with 10,000 entry capacity
- Hourly cache invalidation via timestamp key
- Dramatically reduces graph queries during decay cycles ([consolidation.py:152-176](https://github.com/verygoodplugins/automem/blob/main/consolidation.py#L152-L176))

---

## Integration with API Endpoints

### POST /memory Integration

The `POST /memory` endpoint response includes indicators of queued background work:

```json
{
  "memory_id": "uuid",
  "message": "Memory stored successfully",
  "enrichment_queued": true,
  "embedding_queued": true
}
```

### GET /recall Integration

Recall queries benefit from completed background processing:

- Vector search uses embeddings generated by the embedding worker
- Relationship traversal uses edges created by the enrichment worker
- Relevance scores use `relevance_score` updated by the consolidation engine

:::tip
Memories searched immediately after storage may not yet have embeddings or semantic relationships. The best search quality is achieved after the background workers have completed their processing (typically within 1-2 seconds for enrichment, 2-5 seconds for embedding depending on batch accumulation).
:::

---

## Summary

AutoMem's background processing architecture achieves:

1. **Non-blocking API responses** — Write to graph first, enhance later
2. **Cost efficiency** — Batched embedding generation reduces API calls by 40-50%
3. **Automatic maintenance** — Scheduled consolidation keeps graph healthy over time
4. **Fault tolerance** — Independent systems with retry logic and error isolation
5. **Observability** — Rich metrics via `/health` and admin endpoints

For implementation details of each subsystem:

- [Enrichment Pipeline](/docs/architecture/enrichment/) — Entity extraction, relationship building, pattern detection
- [Embedding Generation](/docs/architecture/embeddings/) — Provider selection, batching, dimension validation
