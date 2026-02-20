---
title: Overview
description: "What AutoMem is, how it works at a high level, and why it exists."
---

This document introduces AutoMem, a production-grade long-term memory system for AI assistants, and explains its high-level architecture, dual-storage approach, and graceful degradation design. For installation instructions, see [Getting Started](/docs/getting-started/introduction/). For detailed API documentation, see [API Reference](/docs/reference/api/memory-operations/). For operational guides, see [Operations](/docs/operations/health/).

## What is AutoMem?

AutoMem is a Flask-based HTTP API service that provides persistent, queryable memory storage for AI assistants. Unlike traditional RAG systems that retrieve similar documents, AutoMem builds knowledge graphs with typed relationships, enabling multi-hop reasoning, temporal awareness, and pattern learning. The system achieves **90.53% accuracy** on the LoCoMo benchmark (ACL 2024), outperforming CORE (88.24%).

**Key capabilities:**

- **Store** memories with metadata, importance scores, classification, and semantic embeddings
- **Recall** via hybrid search combining vector similarity, keyword matching, graph relationships, and temporal signals
- **Connect** memories through 11 typed relationship edges (e.g., `LEADS_TO`, `CONTRADICTS`, `EXEMPLIFIES`)
- **Learn** through automatic entity extraction, pattern detection, and neuroscience-inspired consolidation cycles
- **Degrade gracefully** when vector search is unavailable, continuing operations in graph-only mode

AI platforms connect to AutoMem through the **mcp-automem** MCP bridge package (`@verygoodplugins/mcp-automem`). This Node.js package translates MCP protocol calls from AI platforms into HTTP API requests to the AutoMem service — the AI doesn't store memories itself, it delegates to AutoMem. This separation allows multiple AI platforms to share one memory store, keeps the memory service platform-independent, and enables flexible deployment across machines.

---

## System Architecture Overview

AutoMem consists of three primary layers: the **MCP Bridge** for cloud AI platform integration, the **Flask API Application Layer** with background workers, and the **Dual-Storage Layer** combining graph and vector databases.

### High-Level Component Diagram

:::note
Dashed lines to Qdrant indicate optional vector search capabilities. The system operates in graph-only mode if Qdrant is unavailable.
:::

```mermaid
graph TB
    subgraph clients["External Clients"]
        AITools["AI Tools<br/>Claude Desktop, Cursor"]
        CloudAI["Cloud AI Platforms<br/>ChatGPT, Claude.ai"]
        DirectAPI["Direct API Clients<br/>HTTP/REST"]
    end

    subgraph core["AutoMem Core Services"]
        direction TB

        subgraph bridge["MCP Bridge Layer"]
            MCPBridge["mcp-sse-server<br/>Node.js :8080<br/>Protocol Translation"]
        end

        subgraph app_layer["Application Layer"]
            FlaskAPI["Flask API<br/>app.py<br/>Gunicorn :8001"]

            subgraph workers["Background Workers"]
                EnrichWorker["EnrichmentWorker<br/>Entity extraction<br/>Pattern detection"]
                EmbedWorker["EmbeddingWorker<br/>Batch generation"]
                ConsolWorker["ConsolidationScheduler<br/>Decay/Creative/Cluster/Forget"]
                SyncWorker["SyncWorker<br/>Drift repair"]
            end
        end

        subgraph storage["Storage Layer"]
            FalkorDB[("FalkorDB<br/>Graph Database :6379<br/>Canonical Memory Records")]
            Qdrant[("Qdrant<br/>Vector Database :6333<br/>Semantic Search<br/>Optional")]
        end
    end

    AITools -->|"MCP Protocol"| FlaskAPI
    CloudAI -->|"SSE/HTTP"| MCPBridge
    DirectAPI -->|"HTTP REST"| FlaskAPI

    MCPBridge -->|"Internal HTTP"| FlaskAPI

    FlaskAPI -->|"Graph Queries"| FalkorDB
    FlaskAPI -.->|"Vector Search"| Qdrant

    EnrichWorker --> FalkorDB
    EnrichWorker -.-> Qdrant
    EmbedWorker --> Qdrant
    ConsolWorker --> FalkorDB
    ConsolWorker -.-> Qdrant
    SyncWorker --> FalkorDB
    SyncWorker --> Qdrant

    style FalkorDB fill:#f9f9f9,stroke:#333
    style Qdrant fill:#f9f9f9,stroke:#333,stroke-dasharray: 5 5
```

### MCP Bridge Position

The mcp-automem package implements a **bridge pattern** between AI platforms and the AutoMem service. Standard MCP platforms (Claude Desktop, Cursor, Claude Code, Codex, Warp) connect via stdio transport. Cloud platforms (ChatGPT, Claude.ai, ElevenLabs) connect via HTTP/SSE sidecar. Direct API clients (OpenClaw, Alexa) bypass the bridge entirely.

```mermaid
graph TB
    subgraph AI_Platforms["AI Platform Layer"]
        CD["Claude Desktop"]
        CC["Claude Code"]
        CUR["Cursor IDE"]
        COD["OpenAI Codex"]
        WARP["Warp Terminal"]
        CGIT["GitHub Copilot"]
        CGP["ChatGPT<br/>(Developer Mode)"]
    end

    subgraph MCP_Package["mcp-automem Package"]
        direction TB
        INDEX["src/index.ts<br/>Entry point"]
        SERVER["Server<br/>@modelcontextprotocol/sdk"]
        STDIO["StdioServerTransport<br/>stdin/stdout"]
        CLIENT["AutoMemClient<br/>src/automem-client.ts"]
        CLI["CLI Commands<br/>setup, config, etc"]

        INDEX --> SERVER
        INDEX --> CLI
        SERVER --> STDIO
        SERVER --> CLIENT
    end

    subgraph AutoMem_Service["AutoMem Service"]
        API["HTTP API<br/>:8001"]
        FDB["FalkorDB<br/>Graph Database"]
        QDR["Qdrant<br/>Vector Database"]

        API --> FDB
        API --> QDR
    end

    CD -->|"MCP Protocol<br/>(stdio)"| SERVER
    CC -->|"MCP Protocol<br/>(stdio)"| SERVER
    CUR -->|"MCP Protocol<br/>(stdio)"| SERVER
    COD -->|"MCP Protocol<br/>(stdio)"| SERVER
    WARP -->|"MCP Protocol<br/>(stdio)"| SERVER
    CGIT -->|"MCP Protocol<br/>(stdio)"| SERVER
    CGP -->|"Remote MCP<br/>(HTTP/SSE)"| API

    CLIENT -->|"HTTP Requests<br/>(POST, GET)"| API
```

---

## Core Components

AutoMem's architecture separates concerns into distinct modules, each handling specific aspects of memory management.

| Component | File/Module | Purpose | Key Classes/Functions |
|-----------|-------------|---------|----------------------|
| **Flask API** | `app.py` | Request validation, orchestration, authentication | `Flask`, `require_api_token`, `ServiceState` |
| **Graph Store** | `automem/stores/graph_store.py` | FalkorDB operations, relationship management | `_build_graph_tag_predicate` |
| **Vector Store** | `automem/stores/vector_store.py` | Qdrant operations, semantic search | `_build_qdrant_tag_filter` |
| **Embedding Providers** | `automem/embedding/` | Pluggable embedding generation | `EmbeddingProvider`, `OpenAIEmbeddingProvider`, `VoyageEmbeddingProvider`, `FastEmbedProvider`, `PlaceholderEmbeddingProvider` |
| **Enrichment Pipeline** | `app.py:1051-1200` | Entity extraction, pattern detection, relationship building | `EnrichmentStats`, `extract_entities`, `generate_summary` |
| **Consolidation Engine** | `consolidation.py` | Memory decay, creative association, clustering, forgetting | `MemoryConsolidator`, `ConsolidationScheduler` |
| **Memory Classifier** | `app.py:685-851` | Regex + LLM-based memory type classification | `MemoryClassifier`, `classify` |
| **Health Monitor** | `scripts/health_monitor.py` | Drift detection, webhook alerts | `check_drift`, `repair_drift` |

The MCP bridge exposes six tools to AI platforms:

| Tool | Purpose | Handler |
|------|---------|---------|
| `store_memory` | Store new memory with metadata | Calls `AutoMemClient.storeMemory()` |
| `recall_memory` | Hybrid search (semantic + keyword + graph) | Calls `AutoMemClient.recallMemory()` |
| `associate_memories` | Create typed relationships | Calls `AutoMemClient.associateMemories()` |
| `update_memory` | Modify existing memory | Calls `AutoMemClient.updateMemory()` |
| `delete_memory` | Remove memory | Calls `AutoMemClient.deleteMemory()` |
| `check_database_health` | Check service status | Calls `AutoMemClient.checkHealth()` |

---

## Dual-Storage Architecture

AutoMem implements a dual-storage pattern where **FalkorDB** serves as the canonical record for all memory operations, while **Qdrant** provides optional semantic search capabilities. This architecture enables graceful degradation and built-in redundancy.

### Storage Layer Architecture

```mermaid
graph TB
    subgraph api["Flask API Layer"]
        StoreMemory["POST /memory<br/>app.py:~467-600"]
        RecallMemory["GET /recall<br/>app.py:~602-900"]
        UpdateMemory["PATCH /memory/:id<br/>app.py:~902-1000"]
    end

    subgraph canonical["Canonical Storage FalkorDB"]
        GraphDB[("FalkorDB<br/>FALKORDB_HOST:FALKORDB_PORT")]

        subgraph nodes["Node Types"]
            MemoryNode["Memory nodes<br/>Properties: id, content,<br/>tags, importance,<br/>timestamp, type,<br/>confidence"]
            PatternNode["Pattern nodes<br/>Shared patterns<br/>across memories"]
            EntityNode["Entity nodes<br/>People, tools,<br/>projects, concepts"]
        end

        subgraph edges["Relationship Types"]
            RelTypes["RELATES_TO<br/>LEADS_TO<br/>OCCURRED_BEFORE<br/>PREFERS_OVER<br/>EXEMPLIFIES<br/>CONTRADICTS<br/>REINFORCES<br/>INVALIDATED_BY<br/>EVOLVED_INTO<br/>DERIVED_FROM<br/>PART_OF"]
        end
    end

    subgraph optional["Optional Vector Search Qdrant"]
        VectorDB[("Qdrant<br/>QDRANT_URL")]
        Collection["Collection: COLLECTION_NAME<br/>Dimensions: VECTOR_SIZE<br/>Distance: Cosine"]
        Payload["Payload:<br/>Full memory properties<br/>for filtering"]
    end

    StoreMemory -->|"1. Always succeeds"| GraphDB
    StoreMemory -.->|"2. Best-effort"| VectorDB

    RecallMemory -->|"1. Keyword/Graph search"| GraphDB
    RecallMemory -.->|"2. Semantic search<br/>if available"| VectorDB

    UpdateMemory -->|"1. Update canonical"| GraphDB
    UpdateMemory -.->|"2. Update vector<br/>if content changed"| VectorDB

    GraphDB --- MemoryNode
    GraphDB --- PatternNode
    GraphDB --- EntityNode
    GraphDB --- RelTypes

    VectorDB --- Collection
    Collection --- Payload

    style GraphDB fill:#f9f9f9,stroke:#333
    style VectorDB fill:#f9f9f9,stroke:#333,stroke-dasharray: 5 5
```

**Key principles:**

- **FalkorDB writes always succeed**: If Qdrant is unavailable, the memory is still persisted in the graph
- **Qdrant operations are best-effort**: Failures are logged but don't block API responses
- **Full redundancy**: Qdrant payloads contain complete memory properties, enabling recovery from either store
- **Automatic sync repair**: `SyncWorker` monitors drift and queues missing embeddings for regeneration

---

## Request Flow and Memory Lifecycle

The following diagram illustrates how a memory flows through the system from storage to recall, showing the asynchronous enrichment and consolidation processes.

### Memory Lifecycle Sequence

```mermaid
sequenceDiagram
    participant Client as "AI Client"
    participant API as "Flask API<br/>app.py"
    participant Classifier as "MemoryClassifier<br/>app.py:685-851"
    participant Graph as "FalkorDB<br/>ServiceState.memory_graph"
    participant Vector as "Qdrant<br/>ServiceState.qdrant"
    participant EnrichQ as "Enrichment Queue<br/>ServiceState.enrichment_queue"
    participant EmbedQ as "Embedding Queue<br/>ServiceState.embedding_queue"
    participant Provider as "EmbeddingProvider<br/>automem/embedding/"

    Note over Client,Provider: 1. Memory Storage Flow

    Client->>API: POST /memory<br/>{content, tags, importance}

    API->>Classifier: classify(content, use_llm=True)
    Classifier-->>API: (type, confidence)

    API->>Graph: MERGE (m:Memory)<br/>SET properties
    Graph-->>API: memory_id

    alt Embedding provided
        API->>Vector: upsert(id, vector, payload)
    else No embedding
        API->>EmbedQ: enqueue(memory_id, content)
    end

    API->>EnrichQ: enqueue(memory_id)
    API-->>Client: {memory_id, status: "stored"}

    Note over Client,Provider: 2. Async Background Processing

    par Embedding Generation
        EmbedQ->>Provider: Batch embed (EMBEDDING_BATCH_SIZE=20)
        Provider-->>EmbedQ: [vectors]
        EmbedQ->>Vector: batch upsert
    and Enrichment Processing
        EnrichQ->>Graph: MATCH memory
        EnrichQ->>EnrichQ: extract_entities()<br/>generate_summary()
        EnrichQ->>Graph: CREATE entity nodes + edges
        EnrichQ->>Vector: search similar vectors
        EnrichQ->>Graph: CREATE SIMILAR_TO edges
        EnrichQ->>Graph: Detect patterns<br/>EXEMPLIFIES edges
    end

    Note over Client,Provider: 3. Memory Recall Flow

    Client->>API: GET /recall?query=...&tags=...

    API->>Provider: generate_embedding(query)
    Provider-->>API: query_vector

    par Hybrid Search
        API->>Vector: search(query_vector, filters)
        Vector-->>API: candidate_ids + scores
    and
        API->>Graph: Keyword search + filters
        Graph-->>API: candidate_ids
    end

    API->>API: Merge + rank results<br/>9-component scoring

    opt expand_relations=true
        API->>Graph: MATCH relationships
        Graph-->>API: expanded memories
    end

    API->>Graph: SET last_accessed = NOW()
    API-->>Client: {results: [...], scores: [...]}
```

---

## Graceful Degradation Design

AutoMem is designed to continue operating even when components fail. The most critical degradation path handles Qdrant unavailability, where the system falls back to graph-only operations.

### Degradation Behavior

| Scenario | System Behavior | Code Reference |
|----------|----------------|----------------|
| **Qdrant unavailable at startup** | Logs warning, initializes with `state.qdrant = None`, graph operations continue normally | [`app.py`](https://github.com/verygoodplugins/automem/blob/main/app.py) |
| **Qdrant fails during write** | Logs error, memory persists in FalkorDB, enrichment queued | [`app.py`](https://github.com/verygoodplugins/automem/blob/main/app.py) |
| **Qdrant fails during recall** | Falls back to keyword/graph search only, returns results without vector scoring | [`app.py`](https://github.com/verygoodplugins/automem/blob/main/app.py) |
| **Embedding provider unavailable** | Falls back to `PlaceholderEmbeddingProvider`, generates deterministic hash-based vectors | [`app.py`](https://github.com/verygoodplugins/automem/blob/main/app.py) |
| **Enrichment worker crashes** | Failed jobs remain in queue with retry tracking, manual reprocess available via `POST /enrichment/reprocess` | [`app.py#L1051-L1200`](https://github.com/verygoodplugins/automem/blob/main/app.py#L1051-L1200) |
| **Consolidation scheduler fails** | Logs error, scheduler continues on next tick, control node tracks last successful runs | [`consolidation.py`](https://github.com/verygoodplugins/automem/blob/main/consolidation.py) |

---

## Background Processing Architecture

AutoMem runs four independent worker threads that process memories asynchronously without blocking API requests. Each worker operates on its own queue and tracking sets to prevent duplicate processing.

### Worker Coordination Diagram

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

**Worker responsibilities:**

- **EnrichmentWorker**: Extracts entities (spaCy NER + regex), generates summaries, creates temporal/semantic links, detects patterns
- **EmbeddingWorker**: Batches requests (20 items, 2-second timeout) to reduce API costs by 40-50%, retries on failure (max 3 attempts)
- **ConsolidationScheduler**: Runs four cycles on configurable intervals (Decay, Creative, Cluster, Forget) using control node for persistence
- **SyncWorker**: Monitors drift between FalkorDB and Qdrant, auto-repairs when divergence exceeds 5%

---

## Embedding Provider Abstraction

AutoMem uses a pluggable provider pattern for embedding generation, supporting multiple backends with automatic failover. The system selects providers in priority order based on availability.

### Provider Selection Logic

```mermaid
graph TB
    Start["Embedding Request<br/>_generate_real_embedding()"]

    subgraph config["Configuration"]
        EnvProvider["EMBEDDING_PROVIDER<br/>auto/voyage/openai/local/placeholder"]
        EnvModel["EMBEDDING_MODEL<br/>VECTOR_SIZE"]
    end

    subgraph auto_select["Auto-Selection Priority"]
        CheckVoyage{"VOYAGE_API_KEY<br/>set?"}
        CheckOpenAI{"OPENAI_API_KEY<br/>set?"}
        CheckFastEmbed{"FastEmbed<br/>available?"}
        UsePlaceholder["PlaceholderEmbeddingProvider<br/>automem/embedding/placeholder.py"]

        Voyage["VoyageEmbeddingProvider<br/>automem/embedding/voyage.py<br/>voyage-4: 1024d<br/>voyage-4-large: 2048d"]
        OpenAI["OpenAIEmbeddingProvider<br/>automem/embedding/openai.py<br/>text-embedding-3-small: 768d<br/>text-embedding-3-large: 3072d"]
        FastEmbed["FastEmbedProvider<br/>automem/embedding/fastembed.py<br/>BAAI/bge-base-en-v1.5: 768d"]
    end

    subgraph explicit["Explicit Provider Modes"]
        ForceVoyage["EMBEDDING_PROVIDER=voyage"]
        ForceOpenAI["EMBEDDING_PROVIDER=openai"]
        ForceLocal["EMBEDDING_PROVIDER=local"]
        ForcePlaceholder["EMBEDDING_PROVIDER=placeholder"]
    end

    Start --> EnvProvider

    EnvProvider -->|"auto or unset"| CheckVoyage
    EnvProvider -->|"voyage"| ForceVoyage
    EnvProvider -->|"openai"| ForceOpenAI
    EnvProvider -->|"local"| ForceLocal
    EnvProvider -->|"placeholder"| ForcePlaceholder

    CheckVoyage -->|"Yes"| Voyage
    CheckVoyage -->|"No"| CheckOpenAI
    CheckOpenAI -->|"Yes"| OpenAI
    CheckOpenAI -->|"No"| CheckFastEmbed
    CheckFastEmbed -->|"Yes"| FastEmbed
    CheckFastEmbed -->|"No"| UsePlaceholder

    ForceVoyage --> Voyage
    ForceOpenAI --> OpenAI
    ForceLocal --> FastEmbed
    ForcePlaceholder --> UsePlaceholder

    Voyage --> Result["Return embedding"]
    OpenAI --> Result
    FastEmbed --> Result
    UsePlaceholder --> Result
```

**Provider characteristics:**

- **Voyage**: High-quality embeddings, supports 1024d and 2048d, requires API key
- **OpenAI**: High-quality embeddings, supports 768d and 3072d, configurable via `OPENAI_BASE_URL` for compatible providers
- **FastEmbed**: Local ONNX models, no API key required, ~210MB model download on first use
- **Placeholder**: Hash-based deterministic vectors, no semantic meaning, always available as fallback

---

## Supported Platforms

AutoMem supports AI platforms through three integration strategies:

### Standard MCP Integration (Recommended)

Platforms connect via MCP protocol using stdio transport:

- **[Claude Desktop](/docs/platforms/claude-desktop/)**: JSON config in `claude_desktop_config.json`
- **[Cursor IDE](/docs/platforms/cursor/)**: `.cursor/rules/automem.mdc` + `~/.cursor/mcp.json`
- **[Claude Code](/docs/platforms/claude-code/)**: `~/.claude.json` MCP config
- **[OpenAI Codex](/docs/platforms/codex/)**: `~/.codex/config.toml` MCP config
- **[Warp Terminal](/docs/platforms/warp/)**: `warp-rules.md` auto-detection
- **[GitHub Copilot](/docs/platforms/github-copilot/)**: Repository MCP configuration

### Remote MCP (Cloud Platforms)

Cloud platforms connect via HTTP/SSE sidecar:

- **[ChatGPT](/docs/platforms/chatgpt/)** (Developer Mode)
- **[Claude.ai & Mobile](/docs/platforms/claude-web/)** (web + iOS/Android)
- **[ElevenLabs Agents](/docs/platforms/elevenlabs/)**

### Direct API Integration

- **[OpenClaw](/docs/platforms/openclaw/)**: Bypasses MCP entirely, uses direct HTTP calls via `SKILL.md` and curl commands
- **[Alexa](/docs/platforms/alexa/)**: Custom Alexa skill with direct API calls

---

## Authentication and Authorization

AutoMem implements two-tier authentication: standard API tokens for normal operations and admin tokens for privileged endpoints.

| Endpoint Pattern | Required Token | Header/Query Param | Example |
|-----------------|----------------|-------------------|---------|
| `GET /health` | None (public) | - | `curl /health` |
| `POST /memory` | `AUTOMEM_API_TOKEN` | `Authorization: Bearer <token>` | Standard operations |
| `GET /recall` | `AUTOMEM_API_TOKEN` | `X-API-Key: <token>` | Alternative header |
| `PATCH /memory/:id` | `AUTOMEM_API_TOKEN` | `?api_key=<token>` | Query param (discouraged) |
| `POST /admin/reembed` | Both tokens | `Authorization: Bearer <token>` + `X-Admin-Token: <admin_token>` | Admin operations |
| `POST /enrichment/reprocess` | Both tokens | Same as above | Admin operations |

Token validation is handled by the `require_api_token` decorator in [`app.py`](https://github.com/verygoodplugins/automem/blob/main/app.py), which checks headers and query parameters in order of preference. Admin endpoints additionally validate the `X-Admin-Token` header.

For full details, see [Authentication](/docs/reference/authentication/).

---

## Key Configuration Points

AutoMem's behavior is controlled through environment variables loaded from process environment, `.env` in project root, or `~/.config/automem/.env`. For complete configuration reference, see [Configuration Reference](/docs/reference/configuration/).

**Critical environment variables:**

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `AUTOMEM_API_TOKEN` | Authentication for standard endpoints | _required_ | Generate securely |
| `ADMIN_API_TOKEN` | Authentication for admin endpoints | _required_ | Generate securely |
| `FALKORDB_HOST` | Graph database hostname | `localhost` | Use `*.railway.internal` on Railway |
| `FALKORDB_PORT` | Graph database port | `6379` | Standard Redis protocol port |
| `QDRANT_URL` | Vector database endpoint | _unset_ | Optional; enables semantic search |
| `VECTOR_SIZE` | Embedding dimension | `3072` | Must match Qdrant collection |
| `EMBEDDING_PROVIDER` | Provider selection mode | `auto` | `auto`, `voyage`, `openai`, `local`, `placeholder` |
| `PORT` | Flask API port | `8001` | **Must be set explicitly on Railway** |

The MCP bridge requires two additional environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTOMEM_ENDPOINT` | AutoMem service URL | `http://127.0.0.1:8001` |
| `AUTOMEM_API_KEY` | API key for authenticated instances | _optional_ |

:::caution
On Railway, if `PORT=8001` is not set, Flask defaults to `5000`, causing connection refused errors. The deployment must bind to `::` (IPv6 dual-stack) for internal networking to work.
:::

---

## Deployment Environments

AutoMem supports three deployment modes, each optimized for different use cases.

| Environment | Use Case | Services | Networking | Data Persistence |
|------------|----------|----------|------------|------------------|
| **Local Docker** | Development, testing, privacy | `docker-compose.yml`: API, FalkorDB, Qdrant | Localhost ports | Named volumes: `falkordb_data`, `qdrant_data` |
| **Railway Cloud** | Production, multi-device, team collaboration | Railway services with persistent volumes | IPv6 `*.railway.internal` DNS | 50GB volume per service, automated backups |
| **Bare API** | Development without Docker | Manual Flask process | External FalkorDB required | Depends on external services |

For detailed deployment guides, see [Railway Deployment](/docs/deployment/railway/) and [Docker Deployment](/docs/deployment/docker/).

---

## Next Steps

- **Installation**: [Getting Started](/docs/getting-started/introduction/) covers local development, Docker Compose, and Railway deployment
- **Core Concepts**: [Memory Model](/docs/core-concepts/memory-model/), [Relationship Types](/docs/core-concepts/relationship-types/), [Hybrid Search](/docs/core-concepts/hybrid-search/)
- **API Usage**: [Memory Operations](/docs/reference/api/memory-operations/), [Recall Operations](/docs/reference/api/recall-operations/), [Consolidation Operations](/docs/reference/api/consolidation/)
- **Platform Guides**: [Claude Desktop](/docs/platforms/claude-desktop/), [Cursor IDE](/docs/platforms/cursor/), [Claude Code](/docs/platforms/claude-code/), [ChatGPT](/docs/platforms/chatgpt/)
- **Operations**: [Health Monitoring](/docs/operations/health/), [Backup & Recovery](/docs/operations/backup/), [Performance Tuning](/docs/operations/performance/)
- **CLI Reference**: [Setup & Installation](/docs/cli/setup/), [Platform Installers](/docs/cli/platform-installers/)
- **Development**: [Project Structure](/docs/development/structure/), [Local Setup](/docs/development/local-setup/), [Testing](/docs/development/testing/)
- **Research**: [Research & Motivation](/docs/research/) — the benchmarks and theory behind AutoMem's design
