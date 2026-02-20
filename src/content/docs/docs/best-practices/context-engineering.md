---
title: Context Engineering
description: Design prompts that leverage persistent memory effectively.
sidebar:
  order: 2
---

This page covers advanced usage patterns and customization techniques for developers who want to extend mcp-automem or deeply customize its behavior with a focus on context engineering — designing prompts and integration patterns that leverage persistent memory effectively.

For basic setup and configuration, see [Getting Started](/docs/getting-started/introduction/). For platform-specific integration guides, see the [Platform Integration Guides](/docs/platforms/claude-desktop/). For standard memory operations, see the [Memory Operations](/docs/reference/api/memory-operations/) reference.

---

## Memory Content Size Governance

The system implements two-tier content size limits to prevent embedding quality degradation.

**Implementation** in `src/index.ts:205-225` within the `store_memory` tool handler:

- **Target**: 150–300 characters (optimal for embeddings)
- **Soft limit**: 500 characters (passes with warning)
- **Hard limit**: 2000 characters (immediate rejection)

**Rationale**: Vector embeddings lose quality with overly long text. The 500-character soft limit signals to the backend that summarization may be beneficial, while the 2000-character hard limit prevents storage of entire code files or documentation.

:::caution
Exceeding the soft limit (500 chars) causes the server to issue a warning and may trigger backend summarization. Exceeding the hard limit (2000 chars) causes immediate rejection — the memory will not be stored at all.
:::

---

## Importance Level Guidelines and Memory Types

### Memory Type Classification

The system supports seven memory types with distinct semantic meanings:

| Type | Usage | Importance Range | Example |
|---|---|---|---|
| `Decision` | Strategic/technical decisions | 0.85–0.95 | "Chose PostgreSQL over MongoDB for ACID compliance" |
| `Pattern` | Recurring approaches | 0.70–0.85 | "Using early returns for validation reduces nesting" |
| `Insight` | Key learnings, resolutions | 0.75–0.85 | "Auth timeout caused by missing retry logic" |
| `Preference` | User/team preferences | 0.75–0.90 | "User prefers 2-space indents with single quotes" |
| `Style` | Code style, formatting | 0.60–0.80 | "Always wrap database calls with timeout logging" |
| `Habit` | Regular behaviors | 0.50–0.70 | "Deploy to staging before production" |
| `Context` | General information | 0.50–0.70 | "Added JWT authentication system" |

**Type vs Importance**: The `type` field enables semantic filtering (e.g., recall only `Decision` memories), while `importance` controls relevance ranking and decay. Corrections to AI outputs should always use `importance: 0.9` as they represent strong style signals.

### Importance Scoring Strategy

**Philosophy**: High importance scores (0.9+) are reserved for memories that should persist indefinitely and rank highly in recall. Medium scores (0.7–0.8) indicate useful patterns that should survive for months. Low scores (< 0.3) signal the memory system to let them naturally decay.

---

## Tagging Conventions and Namespaces

### Project-Specific vs Personal Tagging

**Rationale**: Project tags (`my-app`, `authentication`, etc.) enable precise filtering for technical work. The `personal` tag creates a separate namespace for cross-project memories like user preferences, ensuring they aren't drowned out by high-importance technical memories during recall.

**Tag matching modes**:
- `tag_mode: "any"` (default) — Matches memories with ANY of the provided tags (OR logic)
- `tag_mode: "all"` — Requires ALL tags to be present (AND logic)
- `tag_match: "prefix"` — Supports namespace hierarchies like `auth/*` matching `auth/jwt`, `auth/oauth`

---

## Relationship Types and Association Patterns

### 11 Relationship Types

The `associate_memories` tool supports 11 semantic relationship types defined in the AutoMem service:

| Type | Semantic Meaning | Strength Range | Use Case |
|---|---|---|---|
| `RELATES_TO` | General connection | 0.5–0.8 | Default association for related concepts |
| `LEADS_TO` | Causal progression | 0.7–0.9 | Bug → Solution, Problem → Fix |
| `OCCURRED_BEFORE` | Temporal sequence | 0.6–0.8 | Sequential work, chronology |
| `PREFERS_OVER` | Explicit preference | 0.8–0.95 | "Chose A instead of B" decisions |
| `EXEMPLIFIES` | Concrete example | 0.7–0.9 | Pattern → Implementation example |
| `CONTRADICTS` | Conflicting info | 0.7–0.9 | New approach vs old approach |
| `REINFORCES` | Supporting evidence | 0.7–0.9 | Validation, confirmation |
| `INVALIDATED_BY` | Superseded info | 0.8–0.95 | Correction → Old memory |
| `EVOLVED_INTO` | Knowledge progression | 0.8–0.95 | Decision update, iteration |
| `DERIVED_FROM` | Source relationship | 0.7–0.9 | Implementation → Original decision |
| `PART_OF` | Hierarchical structure | 0.6–0.8 | Component → System |

### Association Creation Patterns

**Pattern: User Corrections**

```json
// 1. Store correction with high importance
store_memory({
  content: "User prefers snake_case for Python variable names",
  type: "Preference",
  importance: 0.9,
  tags: ["my-project", "preference", "python", "2026-02"]
})

// 2. Find old preference
recall_memory({ query: "Python variable naming style", tags: ["preference"] })

// 3. Link to superseded memory
associate_memories({
  memory1_id: "<new_id>",
  memory2_id: "<old_id>",
  type: "INVALIDATED_BY",
  strength: 0.9
})
```

**Pattern: Bug Fixes**

```json
// Link fix to the bug report to build a problem-solution chain
associate_memories({
  memory1_id: "<fix_memory_id>",
  memory2_id: "<bug_memory_id>",
  type: "LEADS_TO",
  strength: 0.85
})
```

**Pattern: Architecture Decisions**

```json
// Link decision to alternatives considered
associate_memories({
  memory1_id: "<chosen_option_id>",
  memory2_id: "<rejected_option_id>",
  type: "PREFERS_OVER",
  strength: 0.9
})
```

---

## Advanced Recall Strategies

### Multi-hop Reasoning with Entity Expansion

Entity expansion enables multi-hop graph traversal for complex queries:

**API parameters** (exposed in `src/index.ts:350-355`):

- `expand_entities: true` — Enable multi-hop entity expansion
- `expand_relations: true` — Follow graph relationships from seed results
- `expand_min_importance: 0.5` — Filter expanded results by importance threshold
- `expand_min_strength: 0.3` — Only follow associations above strength threshold
- `expansion_limit: 25` — Max expanded memories to include
- `relation_limit: 5` — Max relationships to follow per seed result

```json
{
  "query": "authentication issues we've had",
  "expand_entities": true,
  "expand_relations": true,
  "expand_min_importance": 0.5,
  "expansion_limit": 20
}
```

### Context-Aware Coding Recall

Context hints boost relevant memories for coding tasks:

```json
{
  "query": "error handling patterns",
  "language": "python",
  "context_types": ["Pattern", "Insight"],
  "tags": ["my-service", "backend"]
}
```

**Backend behavior**: These parameters influence the scoring algorithm in the AutoMem service, boosting memories that match the language, file path patterns, or specified types/tags.

### Parallel Recall for Comprehensive Context

Execute multiple recall strategies simultaneously:

```json
// Phase 1: stable preferences
recall_memory({ tags: ["preference"], limit: 10 })

// Phase 2: project context (semantic + temporal)
recall_memory({
  queries: ["current task", "recent decisions"],
  tags: ["my-project"],
  time_query: "last 14 days",
  limit: 15
})
```

**Optimization**: The `recall_memory` tool in `src/index.ts:420-450` already implements parallel queries when both semantic search and tag filtering are requested, merging and deduplicating results server-side.

---

## Template System for Custom Integrations

### Variable Resolution

Templates support variable substitution for platform-specific customization:

| Variable | Resolution | Example Value |
|---|---|---|
| `{{PROJECT_NAME}}` | From package.json, git remote, or directory name | `my-api-service` |
| `{{PROJECT_DESC}}` | From package.json description | `REST API for user management` |
| `{{MCP_TOOL_PREFIX}}` | Platform-specific tool prefix | `mcp__memory__` |
| `{{MCP_SERVER_NAME}}` | Server name from config | `memory` |
| `{{CURRENT_MONTH}}` | Current YYYY-MM | `2026-02` |

**Implementation**: Template processing occurs in CLI command handlers (`src/cli/commands/cursor.ts`, etc.).

### Building a New Platform Integration

To add support for a new MCP-compatible platform:

1. **Create template directory**: `templates/[platform-name]/`
2. **Add configuration template**: Platform-specific MCP server config format
3. **Create rule/instruction file**: Memory-first instructions adapted to platform conventions
4. **Implement CLI command**: Add installer in `src/cli/commands/[platform].ts`
5. **Update documentation**: Add section to `INSTALLATION.md`

**Example structure**:

```
templates/myplatform/
├── README.md                    # Setup guide
├── config.template              # MCP server config
└── memory-rules.template        # Platform instructions
```

**Template best practices** based on existing templates:

1. **Include version comment** — `<!-- automem-template-version: 1.0.0 -->` enables migration detection
2. **Use platform-specific tool naming** — Show exact tool prefix format (e.g., `mcp__memory__` vs `mcp_memory_`)
3. **Provide concrete examples** — Don't just describe tools, show actual usage with project variables
4. **Explain importance scoring** — Critical: 0.9+, Important: 0.7–0.9, Standard: 0.5–0.7
5. **Document tagging conventions** — Project name, platform, month, component tags
6. **Include content size guidelines** — Target 150–300 chars, max 500 chars, hard limit 2000 chars
7. **Show relationship types** — Explain all 11 association types with examples
8. **Add troubleshooting hints** — What to do if recall fails, service unreachable, etc.

---

## Direct API Usage (Non-MCP Integration)

### OpenClaw Direct curl Approach

OpenClaw integration bypasses MCP entirely, using direct HTTP calls to the AutoMem API:

**Why this works**: OpenClaw's architecture makes native skill files simpler than MCP integration. The SKILL.md file teaches the bot to construct HTTP requests directly.

**Benefits of direct API approach**:
- No MCP protocol overhead
- No PATH or binary resolution issues
- Native to platform's execution model
- Simpler error handling

### AutoMemClient HTTP Implementation

The `AutoMemClient` class in `src/automem-client.ts` wraps all AutoMem HTTP API calls:

**Key features**:
- **Authentication**: Adds `Authorization: Bearer` header from `AUTOMEM_API_KEY`
- **Timeout**: 25-second request timeout to prevent hung connections
- **Retry logic**: Exponential backoff (500ms, 1s, 2s) for transient failures
- **Error handling**: Structured error responses with HTTP status codes

**HTTP Endpoint Reference**

| Method | Endpoint | Request Body | Response | Client Method |
|---|---|---|---|---|
| POST | `/memory` | `{content, tags, importance, embedding?, metadata?, timestamp?}` | `{memory_id, message}` | `storeMemory()` |
| GET | `/recall?query=...` | N/A (query params) | `{results[], count, dedup_removed?, ...}` | `recallMemory()` |
| POST | `/associate` | `{memory1_id, memory2_id, type, strength}` | `{success, message}` | `associateMemories()` |
| PATCH | `/memory/:id` | `{content?, tags?, importance?, metadata?, ...}` | `{memory_id, message}` | `updateMemory()` |
| DELETE | `/memory/:id` | N/A | `{memory_id, message}` | `deleteMemory()` |
| GET | `/memory/by-tag?tags=...` | N/A | `{memories[], count}` | `searchByTag()` |
| GET | `/health` | N/A | `{status, falkordb, qdrant, graph, timestamp}` | `checkHealth()` |

**Query parameter encoding**:
- Arrays (`tags`, `queries`) use repeated parameters: `?tags=project&tags=auth`
- Single values use standard encoding: `?query=decisions&limit=10`
- Boolean flags: `?expand_entities=true&expand_relations=false`
- Embedding vectors: comma-separated floats `?embedding=0.1,0.2,0.3,...`

---

## Configuration Resolution Priority

Environment variables are resolved in this order:

1. Constructor arguments (highest priority — programmatic usage)
2. Process environment variables (`process.env`)
3. `.env` file in current directory
4. `.env` file in home directory

**Environment variables**:
- `AUTOMEM_ENDPOINT` — AutoMem service URL
- `AUTOMEM_API_KEY` or `AUTOMEM_API_TOKEN` — Authentication token (both accepted)

**Platform-specific config locations**:
- **Cursor**: `~/.cursor/mcp.json` with `env` object
- **Claude Desktop**: `claude_desktop_config.json` with `env` object
- **Claude Code**: `~/.claude.json` with MCP server env
- **Codex**: `~/.codex/config.toml` with `[mcp_servers.memory.env]` section

---

## MCP Protocol Implementation Details

The MCP server implementation in `src/index.ts` uses the `@modelcontextprotocol/sdk` library:

**Tool registration** in `src/index.ts:145-180`:
- Each tool defines `inputSchema` (JSON Schema for parameters)
- Each tool defines `outputSchema` (JSON Schema for response)
- Tools include `annotations` for MCP hints:
  - `readOnlyHint`: Tool doesn't modify state
  - `destructiveHint`: Tool deletes/modifies data
  - `idempotentHint`: Repeated calls safe

**Tool Annotations**

| Field | Meaning | Example Usage |
|---|---|---|
| `readOnlyHint` | Tool doesn't modify state | `recall_memory`, `check_database_health` |
| `destructiveHint` | Tool removes data | `delete_memory` |
| `idempotentHint` | Multiple calls with same args produce same result | `update_memory`, `delete_memory` |
| `openWorldHint` | Results may reference external entities | Not used (memory IDs are self-contained) |

**Important implementation details**:
1. **Server mode detection** — Empty `process.argv[2]` triggers server mode
2. **Console redirection** — All `console.log` calls redirected to stderr to prevent stdout pollution
3. **Quiet dotenv** — Environment loading silenced to prevent debug output
4. **EPIPE handling** — Graceful exit on broken pipe (platform disconnects)
5. **Process tagging** — Optional `AUTOMEM_PROCESS_TAG` for safe process management

---

## Best Practices for Custom Integrations

### 1. Configuration Management

Use environment variables for credentials. Support multiple configuration sources (priority order):

1. Command-line arguments (highest priority)
2. Environment variables
3. Configuration files (`.env`, platform-specific)
4. Defaults (lowest priority)

### 2. Error Handling

Handle service unavailability gracefully:

```typescript
try {
  const results = await client.recallMemory({ query: "current task" });
  // use results
} catch (error) {
  console.error("Memory recall failed, continuing without context:", error);
  // proceed without memory context
}
```

Respect retry logic — `AutoMemClient` already retries 5xx errors. Don't add another retry layer on top.

### 3. Content Guidelines

Enforce size limits in your integration:
- Target: 150–300 characters
- Soft limit: 500 characters (warn user)
- Hard limit: 2000 characters (reject before calling API)

Recommend tagging conventions:
- Always include project/workspace identifier
- Add temporal tag (year-month): `2025-01`
- Use hierarchical tags with prefix matching: `auth/login`, `auth/tokens`
- Include type tags: `decision`, `pattern`, `bug-fix`, `preference`

### 4. Recall Optimization

**Start simple, expand as needed:**

```json
// Simple: start with just project tag
recall_memory({ tags: ["my-project"], limit: 10 })

// If insufficient, add semantic search
recall_memory({ query: "auth issues", tags: ["my-project"], limit: 10 })

// If still insufficient, add graph expansion
recall_memory({ query: "auth issues", expand_entities: true, expansion_limit: 20 })
```

### 5. Testing Custom Integrations

**Health check on startup:**

```typescript
const health = await client.checkHealth();
if (health.status !== "healthy") {
  console.warn("AutoMem service degraded:", health);
}
```

**Test memory round-trip:**

```typescript
const stored = await client.storeMemory({ content: "test memory", tags: ["test"], importance: 0.5 });
const recalled = await client.recallMemory({ query: "test memory", tags: ["test"] });
assert(recalled.results.some(r => r.id === stored.memory_id));
await client.deleteMemory(stored.memory_id);
```

---

## Migration from Existing Systems

### From Manual Memory Management

If your platform currently uses manual note-taking or file-based memory:

1. **Export existing content** as JSON objects matching `{content, tags, importance}` schema
2. **Batch import** via sequential `storeMemory()` calls with appropriate types and importance scores
3. **Create associations** for related memories to preserve knowledge graph structure

### From Other MCP Memory Servers

If migrating from a different MCP memory implementation:

**Common tool name mappings:**
- `remember` → `store_memory`
- `search` or `find` → `recall_memory`
- `forget` → `delete_memory`
- `link` or `relate` → `associate_memories`

---

## Troubleshooting

### Common Integration Issues

| Issue | Symptoms | Solution |
|---|---|---|
| **Server not starting** | Platform shows "MCP server failed to start" | Check `AUTOMEM_ENDPOINT` in server env config. Verify no CLI arguments passed (would trigger CLI mode instead of server mode). |
| **Tools not appearing** | Platform doesn't list memory tools | Verify server name in platform config. Check if platform requires tool allowlist. Restart platform after config changes. |
| **Authentication failures** | 401/403 errors | Set `AUTOMEM_API_KEY` in server environment variables, not client-side. Verify API key format matches backend requirements. |
| **Recall returns empty** | Queries return 0 results despite stored memories | Check tags match exactly. Verify time filters aren't too restrictive. Try query without tags first. Check backend health. |
| **Content too large errors** | Store operations rejected | Enforce 500-char soft limit, 2000-char hard limit before calling API. Split long content into multiple memories with associations. |
| **Timeout errors** | Operations fail after ~25 seconds | Reduce `limit` parameter in recall queries. Check backend performance. Consider using `searchByTag` instead of semantic search for simple tag queries. |

### Debugging Techniques

**Enable debug logging:**

```bash
DEBUG=automem:* npx @verygoodplugins/mcp-automem
```

**Test backend directly:**

```bash
curl -H "Authorization: Bearer $AUTOMEM_API_KEY" "$AUTOMEM_ENDPOINT/health"
```

**Verify template variable substitution:**

```bash
npx @verygoodplugins/mcp-automem cursor --dry-run --verbose
```
