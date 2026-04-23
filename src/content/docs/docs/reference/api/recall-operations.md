---
title: Recall Operations
description: Search and retrieve memories using hybrid search.
sidebar:
  order: 2
---

:::note[Source files]
- [automem/api/recall.py](https://github.com/verygoodplugins/automem/blob/main/automem/api/recall.py) — Recall endpoint
- [automem/api/recall.py](https://github.com/verygoodplugins/automem/blob/main/automem/api/recall.py) — Graph expansion logic
- [automem/utils/scoring.py](https://github.com/verygoodplugins/automem/blob/main/automem/utils/scoring.py) — Scoring algorithm
- [automem/config.py](https://github.com/verygoodplugins/automem/blob/main/automem/config.py) — Score weight configuration
- [src/index.ts](https://github.com/verygoodplugins/mcp-automem/blob/main/src/index.ts) — MCP `recall_memory` tool
- [src/automem-client.ts](https://github.com/verygoodplugins/mcp-automem/blob/main/src/automem-client.ts) — HTTP client and response normalization
:::

The recall system provides a single unified endpoint that supports multiple search strategies. It combines nine scoring components into a hybrid ranking system and supports both basic retrieval and advanced graph expansion. Authentication is required via `Authorization: Bearer <token>` header or `X-API-Key` header.

## Endpoint Overview

```
GET /recall
```

---

## Request Parameters

### Basic Search Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | — | Natural language search query or wildcard `*` |
| `embedding` | array[float] | — | Pre-computed embedding vector for semantic search |
| `limit` | integer | 5 | Maximum results to return (capped at `RECALL_MAX_LIMIT=100`) |
| `sort` / `order_by` | string | `score` | Sort mode: `score`, `time_desc`, `time_asc`, `updated_desc`, `updated_asc` |

The `query` parameter triggers keyword extraction and full-text search. When `query="*"` or is omitted, the system returns trending memories ordered by importance.

### Tag Filtering Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tags` | array[string] | — | Tags to filter by (can specify multiple) |
| `exclude_tags` | array[string] | — | Tags to exclude (supports prefix matching) |
| `tag_mode` | string | `any` | Match mode: `any` or `all` |
| `tag_match` | string | `prefix` | Match type: `prefix` or `exact` |

Tag filtering uses pre-computed `tag_prefixes` stored in both FalkorDB and Qdrant for efficient prefix matching. The `exclude_tags` parameter removes any memory containing ANY of the specified tags.

**Prefix matching example:**
- Query: `tags=slack`
- Matches: `slack:channel:general`, `slack:user:U123`, `slack:reaction:thumbs-up`
- Uses precomputed `tag_prefixes` field for O(1) lookup

**Mode behavior:**
- `any` (default): Match if ANY filter tag present
- `all`: Match only if ALL filter tags present

### Temporal Filtering Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `time_query` | string | — | Natural language time expression (e.g., `"last week"`) |
| `start` | string | — | ISO 8601 start timestamp |
| `end` | string | — | ISO 8601 end timestamp |

Time queries are parsed by `_parse_time_expression()` from `automem/utils/time.py`, which supports expressions like `"last 7 days"`, `"yesterday"`, `"last month"`. Explicit timestamps override natural language queries.

### Context Hint Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `context` | string | — | Contextual hint for ranking (e.g., `"programming task"`) |
| `language` | string | — | Programming language context (e.g., `"python"`) |
| `active_path` | string | — | File path being edited (auto-detects language) |
| `context_tags` | array[string] | — | Tags to boost in scoring |
| `context_types` | array[string] | — | Memory types to prioritize |
| `priority_ids` | array[string] | — | Memory IDs to boost during scoring |

Context hints influence the 9-component scoring system but do not filter results. When `active_path` matches a coding language extension, the system prioritizes `Style` type memories for that language.

:::note[`priority_ids` semantics]
`priority_ids` adds a relevance boost to matching memories during scoring — it does **not** bypass filters or guarantee inclusion. If a listed ID fails the tag gate, time window, or other query constraints, it will still be excluded. To guarantee a specific memory is returned, fetch it directly via [`GET /memory/{id}`](/docs/reference/api/memory-operations/) instead of relying on `priority_ids`.
:::

### Graph Expansion Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `expand_relations` | boolean | false | Follow graph edges from seed results |
| `expand_entities` | boolean | false | Multi-hop reasoning via entity tags |
| `relation_limit` | integer | 5 | Max relations per seed (from `RECALL_RELATION_LIMIT`) |
| `expansion_limit` | integer | 25 | Total max expanded memories (from `RECALL_EXPANSION_LIMIT`) |
| `expand_min_importance` | float | 0.0 | Minimum importance threshold for expanded memories |
| `expand_min_strength` | float | 0.0 | Minimum relation strength to traverse |

Graph expansion operates in two phases: seed results from hybrid search, then expansion via graph traversal. Expansion filtering parameters only apply to expanded memories, never to seed results.

---

## Hybrid Search Architecture

```mermaid
graph LR
    Request["GET /recall<br/>?query=X&tags=Y"]

    subgraph "Search Strategies"
        Vector["_vector_search<br/>search/runtime_recall_helpers.py"]
        Keyword["_graph_keyword_search<br/>search/runtime_recall_helpers.py"]
        Trending["_graph_trending_results<br/>search/runtime_recall_helpers.py"]
    end

    subgraph "Scoring"
        Compute["_compute_metadata_score<br/>search/runtime_recall_helpers.py"]
        Combine["Weighted combination<br/>vector+keyword+tag+<br/>importance+recency"]
    end

    subgraph "Filtering"
        Time["Time window filter<br/>_parse_time_expression"]
        Tags["Tag filter<br/>_build_graph_tag_predicate"]
        ResultFilter["_result_passes_filters"]
    end

    Request --> Vector
    Request --> Keyword
    Request --> Trending

    Vector --> Combine
    Keyword --> Combine
    Trending --> Combine

    Combine --> Time
    Time --> Tags
    Tags --> ResultFilter

    ResultFilter --> Response["Ranked results<br/>with relations"]
```

**Search strategy:**
1. **Vector Search** (`state.qdrant != None`): Semantic similarity using OpenAI embeddings
2. **Keyword Search** (FalkorDB): Content and tag matching using Cypher `CONTAINS`
3. **Trending Results** (no query): High-importance memories ordered by recency
4. **Deduplication**: Track seen IDs across sources
5. **Filtering**: Apply temporal and tag constraints
6. **Scoring**: Combine weighted factors into final score
7. **Relations**: Fetch connected memories (limited by `RECALL_RELATION_LIMIT`)

---

## Hybrid Scoring System

### 9-Component Score Calculation

```mermaid
graph TB
    Query["Query Input"]

    subgraph VectorSearch["Vector Search (Qdrant)"]
        VectorComp["Vector Component<br/>Weight: SEARCH_WEIGHT_VECTOR<br/>Cosine similarity score"]
    end

    subgraph KeywordSearch["Keyword Search (FalkorDB)"]
        KeywordComp["Keyword Component<br/>Weight: SEARCH_WEIGHT_KEYWORD<br/>TF-IDF + phrase matching"]
        ExactComp["Exact Component<br/>Weight: SEARCH_WEIGHT_EXACT<br/>Direct content overlap"]
    end

    subgraph MetadataScoring["Metadata Scoring"]
        ImportanceComp["Importance Component<br/>Weight: SEARCH_WEIGHT_IMPORTANCE<br/>User-assigned priority"]
        ConfidenceComp["Confidence Component<br/>Weight: SEARCH_WEIGHT_CONFIDENCE<br/>Classification confidence"]
        RecencyComp["Recency Component<br/>Weight: SEARCH_WEIGHT_RECENCY<br/>Freshness boost"]
        TagComp["Tag Component<br/>Weight: SEARCH_WEIGHT_TAG<br/>Tag overlap score"]
    end

    subgraph ContextScoring["Context Scoring"]
        RelationComp["Relation Component<br/>Computed from graph edges"]
        TemporalComp["Temporal Component<br/>Time alignment score"]
    end

    FinalScore["Final Weighted Score<br/>Sum of all components"]

    Query --> VectorSearch
    Query --> KeywordSearch
    Query --> MetadataScoring
    Query --> ContextScoring

    VectorComp --> FinalScore
    KeywordComp --> FinalScore
    ExactComp --> FinalScore
    ImportanceComp --> FinalScore
    ConfidenceComp --> FinalScore
    RecencyComp --> FinalScore
    TagComp --> FinalScore
    RelationComp --> FinalScore
    TemporalComp --> FinalScore
```

The formula:

```
final_score = (vector_score × SEARCH_WEIGHT_VECTOR) +
              (keyword_score × SEARCH_WEIGHT_KEYWORD) +
              (exact_match_score × SEARCH_WEIGHT_EXACT) +
              (importance × SEARCH_WEIGHT_IMPORTANCE) +
              (confidence × SEARCH_WEIGHT_CONFIDENCE) +
              (recency_score × SEARCH_WEIGHT_RECENCY) +
              (tag_score × SEARCH_WEIGHT_TAG) +
              relation_score +
              temporal_score
```

**Default weight configuration (all configurable via environment variables):**

| Component | Environment Variable | Default Value |
|-----------|---------------------|---------------|
| Vector | `SEARCH_WEIGHT_VECTOR` | 0.35 |
| Keyword | `SEARCH_WEIGHT_KEYWORD` | 0.35 |
| Exact | `SEARCH_WEIGHT_EXACT` | 0.20 |
| Importance | `SEARCH_WEIGHT_IMPORTANCE` | 0.10 |
| Confidence | `SEARCH_WEIGHT_CONFIDENCE` | 0.05 |
| Recency | `SEARCH_WEIGHT_RECENCY` | 0.10 |
| Tag | `SEARCH_WEIGHT_TAG` | 0.20 |
| Relation | `SEARCH_WEIGHT_RELATION` | 0.25 |
| Relevance | `SEARCH_WEIGHT_RELEVANCE` | 0.0 |

### Scoring Component Details

**Vector Search Component:**

Executes via `_vector_search()` using Qdrant when available. When Qdrant is unavailable, the system gracefully degrades to graph-only mode using keyword and metadata scoring.

**Keyword Search Component:**

Implemented in `_graph_keyword_search()` using Cypher queries:
- Extracts keywords via `_extract_keywords()` from `automem/utils/text.py`
- Matches against `m.content` and `m.tags` fields in FalkorDB
- Scores based on keyword frequency and phrase containment
- Returns memories ordered by `score DESC, m.importance DESC, m.timestamp DESC`
- Content match: 2 points per keyword
- Tag match: 1 point per keyword
- Exact phrase bonus: +2 (content) or +1 (tag)

**Metadata Components:**

Computed by `_compute_metadata_score()` and `_parse_metadata_field()`:
- **Importance**: Direct multiplication by weight (0.0–1.0 range)
- **Confidence**: Classification confidence from memory type detection
- **Recency**: `max(0, 1 - (age_days / 180))` — 6-month exponential decay based on time since last access
- **Tag**: `matched_tokens / total_query_tokens` — overlap ratio between query tags and memory tags

---

## Graph Expansion

### Relationship Expansion Flow

```mermaid
graph TB
    SeedResults["Seed Results<br/>from Hybrid Search"]

    CheckExpand{"expand_relations<br/>enabled?"}

    FetchRelations["_fetch_relations()<br/>search/runtime_relations.py"]

    FilterStrength{"Relation strength >=<br/>expand_min_strength?"}

    FilterImportance{"Memory importance >=<br/>expand_min_importance?"}

    TraverseEdge["Traverse edge<br/>Load related memory"]

    CheckLimit{"Total expanded <br/>expansion_limit?"}

    AddToResults["Add to expanded results"]

    FinalResults["Merged Results<br/>Seed + Expanded"]

    SeedResults --> CheckExpand
    CheckExpand -->|No| FinalResults
    CheckExpand -->|Yes| FetchRelations

    FetchRelations --> FilterStrength
    FilterStrength -->|Fail| FinalResults
    FilterStrength -->|Pass| TraverseEdge

    TraverseEdge --> FilterImportance
    FilterImportance -->|Fail| FinalResults
    FilterImportance -->|Pass| CheckLimit

    CheckLimit -->|Exceeded| FinalResults
    CheckLimit -->|Within limit| AddToResults
    AddToResults --> FinalResults
```

The `_expand_related_memories()` function implements multi-hop graph traversal using Cypher `MATCH` patterns to follow typed relationship edges (e.g., `RELATES_TO`, `PREFERS_OVER`, `LEADS_TO`).

**Key configuration constants:**
- `RECALL_RELATION_LIMIT` (default: 5) — Max edges per seed memory
- `RECALL_EXPANSION_LIMIT` (default: 25) — Total expanded memories cap
- `RECALL_MIN_SCORE` — Minimum score threshold for results to be returned
- `RECALL_ADAPTIVE_FLOOR` — Adaptive floor that adjusts minimum score based on result quality

**Edge types traversed:** `RELATES_TO`, `LEADS_TO`, `DERIVED_FROM`, `EVOLVED_INTO`, `REINFORCES`, `EXEMPLIFIES`, and all other relationship types. See [Relationship Operations](/docs/reference/api/relationships/) for the full type reference.

### Entity Expansion Flow

When `expand_entities=true`, the system performs multi-hop reasoning via entity tags:

1. Extract entity tags from query (format: `entity:<type>:<slug>`)
2. Find memories with matching entity tags (first hop)
3. Extract entities from matched memories
4. Find memories containing those entities (second hop)

**Example:** Query `"What is Sarah's sister's job?"` → Find `"Sarah"` entity → Find Sarah's relationships → Find `"sister Rachel"` → Find Rachel's job.

### Auto Query Decomposition

When `auto_decompose: true`, the backend automatically extracts entities and topics from the query to generate supplementary searches:

- Query: `"React OAuth authentication patterns"`
- Decomposed into: `["React", "OAuth", "authentication", "patterns"]`
- Executes parallel searches for each term
- Merges and deduplicates results

### Multiple Query Deduplication

The `queries` parameter (array of strings) allows multiple search queries in a single request. The backend executes them in parallel and deduplicates results server-side.

**Deduplication logic:**
1. Each query returns up to `limit` results
2. Server merges results by `memory_id`
3. Keeps highest-scored version of each memory
4. Returns `dedup_removed` count in response metadata

### Parallel Query Optimization (MCP Layer)

The MCP `recall_memory` tool implements a performance optimization when tags are provided: it executes both the primary recall endpoint and a tag-only endpoint in parallel, then merges and deduplicates results.

**Implementation:**
1. Tag detection: If `Array.isArray(recallArgs.tags) && recallArgs.tags.length > 0`
2. Parallel execution: Uses `Promise.all()` to fetch both endpoints
3. Merge logic: Creates a `Map<memory_id, result>` to deduplicate
4. Sorting: Sorts by `final_score` descending, falls back to `importance`
5. Limit enforcement: Slices to `recallArgs.limit` after merge

**Rationale:** Tag-filtered semantic search might miss high-importance memories that only match by tag, so both strategies run concurrently for comprehensive recall.

---

## Query Execution Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as "Flask API"
    participant Graph as "FalkorDB"
    participant Vector as "Qdrant"
    participant Scorer as "Hybrid Scorer"

    Client->>API: "GET /recall?query=...&expand_relations=true"

    par Vector Search
        API->>Vector: "search(embedding, limit)"
        Vector-->>API: "vector_candidates"
    and Graph Search
        API->>Graph: "keyword search Cypher"
        Graph-->>API: "graph_candidates"
    end

    API->>Scorer: "merge + rank candidates"
    Scorer-->>API: "ranked_results"

    opt Expand Relations
        API->>Graph: "MATCH relationships"
        Graph-->>API: "expanded_memories"
        API->>API: "filter by importance/strength"
    end

    API->>Graph: "SET m.last_accessed"
    API-->>Client: "final results + metadata"
```

**Typical performance:**
- Sub-100ms for queries without expansion
- 100–300ms with graph expansion enabled
- Scales to 100k+ memories with proper indexing

---

## Response Format

### Standard Response Structure

```json
{
  "count": 3,
  "results": [
    {
      "memory": {
        "memory_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "content": "Chose PostgreSQL over MongoDB...",
        "tags": ["project-alpha", "database"],
        "importance": 0.9,
        "created_at": "2025-01-15T10:30:00Z"
      },
      "final_score": 0.847,
      "match_type": "semantic",
      "score_components": {
        "vector": 0.82,
        "keyword": 0.15,
        "importance": 0.9,
        "recency": 0.71
      },
      "relations": []
    }
  ],
  "dedup_removed": 0,
  "time_window": null,
  "tags": []
}
```

**Result fields:**
- `memory`: The stored memory object with `memory_id`, `content`, `tags`, `importance`, `created_at`
- `final_score`: Combined relevance score
- `match_type`: Type of match — `semantic`, `keyword`, `tag`, `relation`, or `entity`
- `score_components`: Breakdown of scoring factors
- `relations`: Connected memories (if expansion enabled)
- `expanded_from_entity`: Entity that triggered expansion (if applicable)
- `deduped_from`: IDs of duplicate results removed

### Expansion Response Fields

When `expand_relations=true`:

```json
{
  "expansion": {
    "expanded_count": 5,
    "seed_count": 3
  }
}
```

When `expand_entities=true`:

```json
{
  "entity_expansion": {
    "expanded_count": 4,
    "entities_found": ["Rachel", "Platform team"]
  }
}
```

---

## Usage Examples

### Basic Text Search

```bash
curl "https://your-automem-instance/recall?query=PostgreSQL+database+decisions&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Semantic Search with Pre-computed Vector

```bash
curl "https://your-automem-instance/recall?embedding=0.1,0.2,0.3,...&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Time-Filtered Search

```bash
# Natural language time filter
curl "https://your-automem-instance/recall?time_query=last+week&query=bug+fixes" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Explicit time range
curl "https://your-automem-instance/recall?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Tag-Based Filtering

```bash
# Any tag match (default)
curl "https://your-automem-instance/recall?tags=project-alpha&tags=database" \
  -H "Authorization: Bearer YOUR_TOKEN"

# All tags required
curl "https://your-automem-instance/recall?tags=project-alpha&tags=database&tag_mode=all" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Exclude certain tags
curl "https://your-automem-instance/recall?query=preferences&exclude_tags=conversation&exclude_tags=temp" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Context-Aware Coding Search

```bash
curl "https://your-automem-instance/recall?query=error+handling&active_path=src/auth.ts&context_types=Style&context_types=Pattern" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Auto-detects TypeScript context → boosts `Style` type memories → prioritizes language-specific patterns.

### Graph Expansion with Filtering

```bash
curl "https://your-automem-instance/recall?query=authentication&expand_relations=true&expand_min_strength=0.3&expand_min_importance=0.5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Performs hybrid search for seed results → follows graph edges with strength ≥ 0.3 → filters expanded memories with importance ≥ 0.5.

### Multi-Hop Entity Search

```bash
curl "https://your-automem-instance/recall?query=Sarah%27s+sister%27s+job&expand_entities=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Sorting Modes

### Score-Based Sorting (Default)

When `sort=score` (or unspecified with query), results are ordered by the final weighted hybrid score combining all 9 components optimized for relevance.

### Time-Based Sorting

Time-based sorting modes are designed for "what happened since X" queries:
- `time_desc` / `updated_desc`: Newest first (ordered by `coalesce(m.updated_at, m.timestamp)`)
- `time_asc` / `updated_asc`: Oldest first

When a time window is specified without a query, the system defaults to `time_desc` to show recent activity.

---

## MCP Tool: `recall_memory`

The `recall_memory` MCP tool wraps `GET /recall` with additional client-side optimizations. It is annotated `readOnlyHint: true` and `idempotentHint: true`.

**Full input schema:**

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `query` | string | No | — | Semantic search query |
| `queries` | array[string] | No | — | Multiple queries for broader recall |
| `limit` | integer | No | 1–50, default 5 | Max results to return |
| `tags` | array[string] | No | — | Filter by tags |
| `tag_mode` | string | No | `"any"` or `"all"` | Tag matching mode |
| `tag_match` | string | No | `"exact"` or `"prefix"` | Tag matching strategy |
| `time_query` | string | No | — | Natural language time filter |
| `start` | string | No | ISO timestamp | Time range start |
| `end` | string | No | ISO timestamp | Time range end |
| `expand_entities` | boolean | No | — | Enable multi-hop entity expansion |
| `expand_relations` | boolean | No | — | Follow graph relationships |
| `expansion_limit` | integer | No | 1–500, default 25 | Max expanded results |
| `relation_limit` | integer | No | 1–200, default 5 | Relations per seed memory |
| `expand_min_importance` | number | No | 0–1 | Filter expanded results by importance |
| `expand_min_strength` | number | No | 0–1 | Min relation strength to traverse |
| `context` | string | No | — | Context label for boosting |
| `language` | string | No | — | Programming language hint |
| `active_path` | string | No | — | Current file path for language detection |
| `context_tags` | array[string] | No | — | Priority tags to boost |
| `context_types` | array[string] | No | — | Priority memory types to boost |
| `priority_ids` | array[string] | No | — | Memory IDs to boost during scoring (does not bypass filters) |
| `auto_decompose` | boolean | No | — | Auto-extract entities from query for parallel searches |

**Output schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `count` | integer | Yes | Number of memories returned |
| `results` | array | Yes | Array of memory objects with scores |
| `dedup_removed` | integer | No | Duplicates removed in multi-query |
| `expansion` | object | No | Graph expansion statistics |
| `entity_expansion` | object | No | Entity expansion statistics |
| `time_window` | object | No | Applied time filter bounds |
| `tags` | string[] | No | Applied tag filters |

### MCP Response Formatting

Each memory is formatted as a numbered list item for the AI platform:

```
1. [content] [tags] (importance: X) score=X.XXX [match_type] relations=X [via entity: Y] (deduped x2)
   ID: mem-abc123
   Created: 2025-01-15T10:30:00Z
```

A summary line includes statistics:

```
(3 duplicates removed; 5 via entity expansion (Rachel, Platform team); 2 via relation expansion)
```

The MCP response also includes `structuredContent` with the full `RecallResult` object for programmatic consumption.

### Common MCP Patterns

**Session start — load recent project context:**

```json
{
  "queries": ["recent decisions", "user preferences"],
  "tags": ["preference"],
  "time_query": "last 30 days",
  "limit": 10
}
```

**Preference recall (no time filter needed):**

```json
{
  "tags": ["preference"],
  "limit": 10
}
```

**Debug pattern search:**

```json
{
  "query": "authentication timeout error",
  "tags": ["bug-fix", "auth"],
  "limit": 5
}
```

**Multi-hop reasoning:**

```json
{
  "query": "What does Amanda's sister do?",
  "expand_entities": true,
  "expansion_limit": 10
}
```

**Filtered graph exploration:**

```json
{
  "query": "database architecture",
  "expand_relations": true,
  "expand_min_strength": 0.5,
  "expand_min_importance": 0.7,
  "relation_limit": 3
}
```

---

## Error Handling

### Service Degradation

| Condition | Behavior | HTTP Status |
|-----------|----------|------------|
| FalkorDB unavailable | Returns 503 error | 503 |
| Qdrant unavailable | Graph-only mode (keyword + metadata) | 200 |
| Embedding generation fails | Falls back to keyword search | 200 |
| No query and no tags | Returns trending memories | 200 |

The system implements graceful degradation where vector search failures don't block graph operations.

### Validation Errors

| Error | HTTP Status | Condition |
|-------|-------------|-----------|
| Invalid embedding dimensions | 400 | Vector size doesn't match `VECTOR_SIZE` |
| Invalid time query | 400 | Unparseable time expression |
| Limit exceeds maximum | 200 | Clamped to `RECALL_MAX_LIMIT` |
| Missing authentication | 401 | No valid token provided |

---

## Performance Optimization Techniques

1. **Tag Prefix Indexing**: Pre-computed `tag_prefixes` enable O(1) prefix matching
2. **Parallel Search**: Vector and graph searches execute concurrently
3. **LRU Caching**: Entity extraction results cached (80% speedup)
4. **Access Tracking**: `last_accessed` updates happen asynchronously
