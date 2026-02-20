---
title: System Overview
description: "AutoMem's three-tier architecture: AI platforms, MCP bridge, and memory service."
sidebar:
  order: 1
---

:::note[Source files]
Key GitHub sources:
- [app.py](https://github.com/verygoodplugins/automem/blob/main/app.py) — Flask application, all route handlers, background worker startup
- [automem/config.py](https://github.com/verygoodplugins/automem/blob/main/automem/config.py) — Centralized configuration and constants
- [automem/embedding/provider.py](https://github.com/verygoodplugins/automem/blob/main/automem/embedding/provider.py) — Embedding provider abstraction
- [automem/stores/graph_store.py](https://github.com/verygoodplugins/automem/blob/main/automem/stores/graph_store.py) — FalkorDB operations
- [automem/stores/vector_store.py](https://github.com/verygoodplugins/automem/blob/main/automem/stores/vector_store.py) — Qdrant operations
- [consolidation.py](https://github.com/verygoodplugins/automem/blob/main/consolidation.py) — Consolidation scheduler
:::

This document provides a comprehensive overview of AutoMem's internal architecture, design decisions, and component interactions. It covers the Flask application structure, service initialization, request processing flow, and the coordination between storage systems and background workers.

For detailed information about specific components:

- Storage layer implementation: see [Data Stores](/docs/architecture/data-stores/)
- Background worker systems: see [Background Processing](/docs/architecture/background-processing/)
- MCP protocol integration: see [MCP Bridge](/docs/architecture/mcp-bridge/)
- Enrichment pipeline: see [Enrichment Pipeline](/docs/architecture/enrichment/)
- Embedding generation: see [Embedding Generation](/docs/architecture/embeddings/)

---

## Core Architecture Principles

AutoMem implements three fundamental architectural patterns:

### 1. Dual-Storage Canonical Design

FalkorDB serves as the **canonical data store** with authoritative memory records, while Qdrant provides **optional semantic search capabilities**. All memory writes commit to FalkorDB first; Qdrant failures do not block operations.

This design ensures:

- **Graph operations always succeed** regardless of vector store availability
- Built-in redundancy for disaster recovery
- Graceful degradation to graph-only mode when Qdrant is unavailable

### 2. Asynchronous Enrichment Pipeline

Memory storage returns immediately to clients while enrichment processes asynchronously. This prevents blocking on:

- Entity extraction via spaCy NLP
- Embedding generation via external APIs
- Pattern detection across the memory graph
- Relationship creation between memories

### 3. Provider Pattern for External Services

The embedding system uses a provider abstraction that enables automatic fallback and explicit provider selection.

Implementations: `VoyageEmbeddingProvider`, `OpenAIEmbeddingProvider`, `FastEmbedProvider`, `OllamaEmbeddingProvider`, `PlaceholderEmbeddingProvider`.

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph "API Layer"
        POST["/memory POST endpoint"]
    end

    subgraph "Event-Driven Systems"
        EQ["enrichment_queue<br/>(Queue)"]
        EW["enrichment_worker()<br/>Thread"]

        EmQ["embedding_queue<br/>(Queue)"]
        EmW["embedding_worker()<br/>Thread"]
        Batch["Batch Accumulator<br/>20 items / 2s timeout"]
    end

    subgraph "Scheduled System"
        Sched["ConsolidationScheduler"]
        Consol["MemoryConsolidator"]

        Decay["decay task<br/>hourly"]
        Creative["creative task<br/>hourly"]
        Cluster["cluster task<br/>6 hours"]
        Forget["forget task<br/>daily"]
    end

    subgraph "Data Stores"
        Falkor[("FalkorDB<br/>Graph")]
        Qdrant[("Qdrant<br/>Vectors")]
    end

    subgraph "External Services"
        OpenAI["OpenAI API<br/>embeddings + classification"]
        Spacy["spaCy NLP<br/>entity extraction"]
    end

    POST -->|"enqueue(memory_id)"| EQ
    POST -->|"enqueue(memory_id)"| EmQ
    POST -->|"immediate write"| Falkor

    EQ --> EW
    EW -->|"extract entities"| Spacy
    EW -->|"create relationships"| Falkor
    EW -->|"similarity search"| Qdrant

    EmQ --> EmW
    EmW --> Batch
    Batch -->|"bulk generate"| OpenAI
    OpenAI -->|"store vectors"| Qdrant

    Sched -->|"check interval"| Decay
    Sched -->|"check interval"| Creative
    Sched -->|"check interval"| Cluster
    Sched -->|"check interval"| Forget

    Decay --> Consol
    Creative --> Consol
    Cluster --> Consol
    Forget --> Consol

    Consol -->|"update scores"| Falkor
    Consol -->|"create edges"| Falkor
    Consol -->|"delete points"| Qdrant
```

---

## Service Topology

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

---

## Flask Application Structure

### ServiceState Dataclass

The `ServiceState` dataclass ([app.py:1093-1122](https://github.com/verygoodplugins/automem/blob/main/app.py#L1093-L1122)) serves as the central state container for all service components.

This single `state` instance ([app.py:1124](https://github.com/verygoodplugins/automem/blob/main/app.py#L1124)) is shared across all Flask request handlers and background threads, requiring careful lock management for queue operations.

---

## Service Initialization Sequence

The Flask application initializes services in a specific order to ensure dependencies are available:

```mermaid
sequenceDiagram
    participant Flask as Flask App
    participant DB as Database Clients
    participant EW as Enrichment Worker
    participant EmW as Embedding Worker
    participant CS as Consolidation Scheduler

    Flask->>DB: Initialize FalkorDB client
    Flask->>DB: Initialize Qdrant client (optional)
    Flask->>Flask: Create consolidator instance

    Flask->>EW: Thread(target=enrichment_worker, daemon=True).start()
    activate EW
    EW->>EW: Enter infinite loop

    Flask->>EmW: Thread(target=embedding_worker, daemon=True).start()
    activate EmW
    EmW->>EmW: Enter infinite loop

    Flask->>CS: Initialize ConsolidationScheduler
    Flask->>CS: scheduler.add_job(...) for each task
    Flask->>CS: scheduler.start()
    activate CS
    CS->>CS: Begin periodic checks

    Flask->>Flask: Ready to accept requests

    Note over EW,EmW: Workers poll queues continuously
    Note over CS: Scheduler wakes on intervals
```

### Key Initialization Functions

| Function | Purpose | Location |
|---|---|---|
| `init_db_connections()` | Establishes FalkorDB and optional Qdrant connections | [app.py:1338-1441](https://github.com/verygoodplugins/automem/blob/main/app.py#L1338-L1441) |
| `init_openai()` | Initializes OpenAI client for memory classification | [app.py:1179-1200](https://github.com/verygoodplugins/automem/blob/main/app.py#L1179-L1200) |
| `init_embedding_provider()` | Selects and initializes embedding provider | [app.py:1202-1337](https://github.com/verygoodplugins/automem/blob/main/app.py#L1202-L1337) |
| `start_enrichment_worker()` | Launches entity extraction and linking pipeline | [app.py:1728-1966](https://github.com/verygoodplugins/automem/blob/main/app.py#L1728-L1966) |
| `start_embedding_worker()` | Launches batch embedding generation worker | [app.py:1968-2097](https://github.com/verygoodplugins/automem/blob/main/app.py#L1968-L2097) |
| `start_consolidation_worker()` | Launches scheduled consolidation cycles | [consolidation.py](https://github.com/verygoodplugins/automem/blob/main/consolidation.py) |
| `start_sync_worker()` | Launches drift detection and repair worker | [app.py:2099-2234](https://github.com/verygoodplugins/automem/blob/main/app.py#L2099-L2234) |

---

## Request Processing Flow

### Memory Storage Request

The `POST /memory` request flows through synchronous and asynchronous phases:

:::note[Critical Design Point]
The graph write to FalkorDB ([app.py:2450-2473](https://github.com/verygoodplugins/automem/blob/main/app.py#L2450-L2473)) always succeeds before queuing asynchronous tasks. Qdrant writes are best-effort ([app.py:2474-2481](https://github.com/verygoodplugins/automem/blob/main/app.py#L2474-L2481)) and logged but do not block the response.
:::

### Memory Recall Request

Recall implements hybrid search combining vector similarity, keyword matching, and graph traversal.

### 9-Component Hybrid Scoring

The `_compute_metadata_score()` function ([automem/utils/scoring.py](https://github.com/verygoodplugins/automem/blob/main/automem/utils/scoring.py)) combines signals with configurable weights:

| Component | Weight | Source | Config Variable |
|---|---|---|---|
| Vector similarity | 25% | Qdrant cosine distance | `SEARCH_WEIGHT_VECTOR` |
| Keyword match | 15% | TF-IDF from graph query | `SEARCH_WEIGHT_KEYWORD` |
| Relationship strength | 25% | Graph edge properties | (implicit) |
| Content overlap | 25% | Token intersection | (implicit) |
| Temporal alignment | 15% | Time expression matching | `SEARCH_WEIGHT_RECENCY` |
| Tag matching | 10% | Prefix/exact tag filters | `SEARCH_WEIGHT_TAG` |
| Importance score | 5% | User-assigned priority | `SEARCH_WEIGHT_IMPORTANCE` |
| Confidence score | 5% | Classification confidence | `SEARCH_WEIGHT_CONFIDENCE` |
| Recency boost | 10% | Freshness decay function | `SEARCH_WEIGHT_RECENCY` |

---

## Background Worker Architecture

AutoMem runs four independent background threads that process memories asynchronously without blocking API requests.

### Worker Coordination via ServiceState

All workers share the `ServiceState` instance and use thread-safe coordination:

| Worker | Queue | Lock | Tracking Sets | Stop Signal |
|---|---|---|---|---|
| Enrichment | `enrichment_queue` | `enrichment_lock` | `enrichment_inflight`, `enrichment_pending` | None (daemon) |
| Embedding | `embedding_queue` | `embedding_lock` | `embedding_inflight`, `embedding_pending` | None (daemon) |
| Consolidation | N/A (schedule-based) | N/A | N/A | `consolidation_stop_event` |
| Sync | N/A (interval-based) | N/A | N/A | `sync_stop_event` |

:::note[Critical Pattern]
The `_inflight` sets prevent duplicate processing when the same `memory_id` appears multiple times in a queue. Workers acquire the lock, check the set, add the ID, process, then remove the ID before releasing the lock.
:::

---

## Storage Layer Abstraction

AutoMem uses two abstraction modules to isolate database-specific logic:

### Graph Store Module

The `automem/stores/graph_store.py` module encapsulates FalkorDB operations:

Key functions:
- `_build_graph_tag_predicate(tag_mode, tag_match)` — Generates Cypher WHERE clauses for tag filtering
- `_serialize_node(node)` — Converts FalkorDB node to dictionary with property extraction
- `_summarize_relation_node(rel)` — Extracts relationship metadata (type, strength, context)

### Vector Store Module

The `automem/stores/vector_store.py` module handles Qdrant operations:

Key functions:
- `_build_qdrant_tag_filter(tags, mode, match)` — Constructs Qdrant filter objects for tag queries
- `_ensure_collection_exists()` — Creates collection with appropriate vector parameters if missing
- Graceful degradation: All Qdrant operations wrapped in try-except with logging but no request failures

---

## Authentication and Authorization Flow

AutoMem implements two-tier authorization with multiple token extraction methods.

### Token Extraction Methods

The `_extract_api_token()` function ([app.py:1127-1144](https://github.com/verygoodplugins/automem/blob/main/app.py#L1127-L1144)) tries three methods in order:

1. **Bearer token** (recommended): `Authorization: Bearer {token}`
2. **Custom header**: `X-API-Key: {token}`
3. **Query parameter** (discouraged): `?api_key={token}`

### Admin Endpoints

Admin operations require a separate token checked by `_require_admin_token()` ([app.py:1150-1162](https://github.com/verygoodplugins/automem/blob/main/app.py#L1150-L1162)):

| Endpoint | Purpose | Admin Token Required |
|---|---|---|
| `POST /admin/reembed` | Regenerate all embeddings | Yes |
| `POST /enrichment/reprocess` | Force re-enrichment | Yes |
| `GET /consolidate/status` | View scheduler state | No |
| `POST /consolidate` | Trigger consolidation | No |

**Configuration:**
- `AUTOMEM_API_TOKEN` — Standard API access ([automem/config.py:124](https://github.com/verygoodplugins/automem/blob/main/automem/config.py#L124))
- `ADMIN_API_TOKEN` — Admin operations ([automem/config.py:123](https://github.com/verygoodplugins/automem/blob/main/automem/config.py#L123))

---

## Embedding Provider Architecture

The embedding system uses a provider pattern that enables automatic fallback and explicit selection.

### Provider Interface

All providers implement the `EmbeddingProvider` abstract base class.

### Auto-Selection Priority

When `EMBEDDING_PROVIDER=auto` (default), the system tries providers in order:

1. **Voyage AI** — Best quality, requires API key ([automem/embedding/voyage.py](https://github.com/verygoodplugins/automem/blob/main/automem/embedding/voyage.py))
2. **OpenAI** — High quality, requires API key ([automem/embedding/openai.py](https://github.com/verygoodplugins/automem/blob/main/automem/embedding/openai.py))
3. **Ollama** — Local server, no API key ([automem/embedding/ollama.py](https://github.com/verygoodplugins/automem/blob/main/automem/embedding/ollama.py))
4. **FastEmbed** — Local ONNX, no API key ([automem/embedding/fastembed.py](https://github.com/verygoodplugins/automem/blob/main/automem/embedding/fastembed.py))
5. **Placeholder** — Hash-based, always available ([automem/embedding/placeholder.py](https://github.com/verygoodplugins/automem/blob/main/automem/embedding/placeholder.py))

### Dimension Validation

The `validate_vector_dimensions()` function ([automem/utils/validation.py](https://github.com/verygoodplugins/automem/blob/main/automem/utils/validation.py)) prevents dimension mismatches that would corrupt Qdrant data.

:::caution
If validation fails, the memory still writes to FalkorDB (canonical record preserved) but the embedding is not stored in Qdrant.
:::

---

## Configuration Management

Configuration is centralized in `automem/config.py` which loads environment variables and provides constants throughout the codebase.

### Core Configuration Categories

| Category | Key Variables | Purpose |
|---|---|---|
| **Database** | `FALKORDB_HOST`, `FALKORDB_PORT`, `GRAPH_NAME` | Graph database connection |
| **Vector Store** | `QDRANT_URL`, `QDRANT_API_KEY`, `COLLECTION_NAME`, `VECTOR_SIZE` | Optional semantic search |
| **Authentication** | `AUTOMEM_API_TOKEN`, `ADMIN_API_TOKEN` | API access control |
| **Embedding** | `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `VOYAGE_API_KEY`, `OPENAI_API_KEY` | Embedding generation |
| **Enrichment** | `ENRICHMENT_*` (12 variables) | Entity extraction, linking |
| **Consolidation** | `CONSOLIDATION_*` (15 variables) | Schedule, thresholds |
| **Search** | `SEARCH_WEIGHT_*` (8 variables) | Hybrid scoring weights |
| **Memory** | `MEMORY_TYPES`, `RELATIONSHIP_TYPES`, `TYPE_ALIASES` | Type system |

### Configuration Loading Priority

The `automem/config.py` module loads configuration in this order:

1. **Environment variables** — Highest priority
2. **~/.config/automem/.env** — User-level defaults
3. **Project .env** — Development defaults
4. **Hardcoded defaults** — Fallback values in config.py

### Memory Type System

The type system supports classification and normalization across defined memory types.

### Relationship Type System

The relationship type system defines 11 typed edges with validation.

---

## Error Handling and Graceful Degradation

AutoMem implements defense-in-depth error handling to maximize availability.

### Storage Layer Resilience

**Design principle:** FalkorDB writes commit before Qdrant operations. Vector store failures are logged but do not return errors to clients.

### Background Worker Resilience

Each worker implements retry logic with exponential backoff:

| Worker | Max Retries | Backoff | Failure Handling |
|---|---|---|---|
| Enrichment | 3 | 5s, 10s, 15s | Log error, update stats, discard job |
| Embedding | Built into provider | Provider-specific | Queue retries, mark failed after max attempts |
| Consolidation | Infinite (scheduled) | None | Log error, continue to next cycle |
| Sync | Infinite (interval) | None | Log error, retry on next interval |

### API Error Responses

The Flask application uses structured error responses.

HTTP status codes:
- `400` — Client error (invalid request)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (admin token required)
- `404` — Not found (memory doesn't exist)
- `500` — Server error (unexpected failure)
- `503` — Service unavailable (database down)

---

## Performance Optimizations

### Embedding Batch Processing

The embedding worker batches requests to reduce API costs and latency.

:::tip
Batching reduces embedding API calls by 95% (20 memories per call vs. 1 memory per call).
:::

### Query Result Deduplication

The `seen_ids` set prevents duplicate results when combining vector and keyword search.

### LRU Caching for Entity Extraction

The spaCy NLP model is loaded once and cached.

:::tip
This eliminates model loading time (5-10 seconds) on every enrichment job.
:::

---

## Summary

AutoMem's architecture implements three core principles:

1. **Dual-storage canonical design** — FalkorDB as authoritative record, Qdrant as optional enhancement
2. **Asynchronous enrichment** — Non-blocking entity extraction, embedding generation, and relationship creation
3. **Provider pattern abstractions** — Pluggable embedding providers with automatic fallback

The system coordinates four independent background workers (enrichment, embedding, consolidation, sync) through a shared `ServiceState` dataclass, using thread-safe queues and lock-protected tracking sets.

For detailed information about specific components, see:

- [Data Stores](/docs/architecture/data-stores/) — FalkorDB and Qdrant implementation details
- [Background Processing](/docs/architecture/background-processing/) — Worker thread implementations
- [MCP Bridge](/docs/architecture/mcp-bridge/) — Protocol translation for cloud AI platforms
- [Enrichment Pipeline](/docs/architecture/enrichment/) — Entity extraction and relationship building
- [Embedding Generation](/docs/architecture/embeddings/) — Provider system and batching
