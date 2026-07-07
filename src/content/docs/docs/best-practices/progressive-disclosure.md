---
title: Custom Integrations
description: Build custom integrations for platforms not officially supported by mcp-automem using MCP server, template system, or direct API approaches.
sidebar:
  order: 3
---

This page covers building custom integrations for platforms not officially supported by mcp-automem. It explains the three integration approaches (MCP server, template system, direct API), provides code-level details for implementing each approach, and documents the extension points available for custom platform support.

For information about officially supported platforms, see [Platform Integrations](/docs/platforms/claude-desktop/). For details about the MCP bridge and stdio server, see [MCP Bridge](/docs/architecture/mcp-bridge/). For using the CLI installer commands, see [Platform Installers](/docs/cli/platform-installers/).

## Integration Approaches

The mcp-automem package provides three distinct integration strategies, each suited to different platform capabilities and requirements.

### Approach Comparison

| Aspect | MCP Server | Template System | Direct API |
|---|---|---|---|
| **Complexity** | Low - reuse existing server | Medium - write CLI installer | Low - just HTTP calls |
| **AI Integration** | Native tool calling | Instruction-based (rules) | Manual API calls in code |
| **Examples** | Claude Desktop, Cursor | Cursor installer, Codex installer | OpenClaw plugin/skill |
| **Best For** | MCP-native platforms | Platforms needing setup automation | Bots, scripts, non-MCP tools |
| **Maintenance** | Automatic via server updates | Template updates needed | Manual client management |

## MCP-Based Integration

### Server Configuration

The MCP server is implemented in [`src/index.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/index.ts) and exposes six tools via stdio transport. To integrate a new MCP-capable platform, point the platform at the mcp-automem binary without CLI arguments — this triggers server mode.

### Platform-Specific Considerations

- **Tool naming**: Platforms may prefix tools with the server name (e.g., `mcp__memory__recall_memory` in Claude Desktop)
- **Permissions**: Some platforms require explicit tool allowlists in configuration
- **Timeout**: Default HTTP timeout is 25 seconds to stay under Claude Desktop's 30-second MCP timeout
- **Error handling**: Tools return structured errors with `isError: true` flag for client-side handling

### Configuration Format

Most MCP platforms use a JSON configuration file. Key points:

- `command` can be `node`, `npx`, or a direct path to the `mcp-automem` binary
- `args` should invoke the package without CLI arguments (triggers server mode)
- `env` variables are read via `process.env` during startup
- The server name (e.g., `"memory"`) determines the tool prefix in some platforms

### Process Lifecycle

Important implementation details from [`src/index.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/index.ts):

1. **Server mode detection** — Empty `process.argv[2]` triggers server mode (lines 41-42)
2. **Console redirection** — All `console.log` calls redirected to stderr to prevent stdout pollution (lines 74-80)
3. **Quiet dotenv** — Environment loading silenced to prevent debug output (lines 60-72)
4. **EPIPE handling** — Graceful exit on broken pipe when a platform disconnects (`installStdioErrorGuards()`, defined lines 100-110, invoked at line 1714)
5. **Process tagging** — Optional `AUTOMEM_PROCESS_TAG` environment variable (also honors an undocumented `MCP_PROCESS_TAG` alias) for safe process management (lines 84-98)

## Template System for CLI Installers

The template system enables automated platform setup by generating configuration files and instruction documents tailored to specific platforms.

### Template Variables

Each template uses placeholder variables that are replaced during installation:

| Variable | Description | Detection Method | Example Value |
|---|---|---|---|
| `{{PROJECT_NAME}}` | Project identifier for tagging | `package.json` name, git remote, or directory name | `my-app` |
| `{{MCP_TOOL_PREFIX}}` | Platform-specific tool prefix | Hardcoded per platform | `mcp__memory__` |
| `{{MCP_SERVER_NAME}}` | MCP server name in config | User-provided or default `"memory"` | `memory` |

**Example template snippet** (before substitution):

```
Project: {{PROJECT_NAME}}
Use tool: {{MCP_TOOL_PREFIX}}recall_memory
Server: {{MCP_SERVER_NAME}}
```

**After substitution** (if `PROJECT_NAME=my-app`, `MCP_TOOL_PREFIX=mcp__memory__`):

```
Project: my-app
Use tool: mcp__memory__recall_memory
Server: memory
```

### Creating a Custom CLI Installer

To add a new platform installer (e.g., for a hypothetical "MyIDE"):

**1. Create template file:** `templates/myide/memory-rules.md`

**2. Implement CLI command:** `src/cli/myide.ts`

**3. Register command in main entry point** (`src/index.ts` — add an `if (command === "myide") {...}` block to the dispatch sequence after the existing `hermes`/`queue` checks, around line 392)

**4. Update help text** (`src/index.ts`, the `COMMANDS:` list, lines 185-198):

```
COMMANDS:
  ...
  myide              Set up AutoMem for MyIDE
  ...
```

See [`src/cli/cursor.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/cli/cursor.ts) and [`src/cli/codex.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/cli/codex.ts) as reference implementations.

### Template Best Practices

Based on existing templates in `templates/cursor/automem.mdc.template` and `templates/codex/memory-rules.md`:

1. **Include version comment** — `<!-- automem-template-version: 0.15.0 -->` enables migration detection
2. **Use platform-specific tool naming** — Show exact tool prefix format (e.g., `mcp__memory__` vs `mcp_memory_`)
3. **Provide concrete examples** — Don't just describe tools, show actual usage with project variables
4. **Explain importance scoring** — Critical: 0.9+, Important: 0.7-0.9, Standard: 0.5-0.7
5. **Document tagging conventions** — Project name, platform, month, component tags
6. **Include content size guidelines** — Target 150-300 chars, max 500 chars, hard limit 2000 chars
7. **Show relationship types** — Explain all 11 association types with examples
8. **Add troubleshooting hints** — What to do if recall fails, service unreachable, etc.

## Direct API Integration

For platforms that don't support MCP or prefer direct HTTP communication, `AutoMemClient` provides a typed wrapper around the AutoMem REST API.

### HTTP Endpoint Reference

The AutoMem API endpoints called by `AutoMemClient` ([`src/automem-client.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/automem-client.ts)):

| Method | Endpoint | Request Body | Response | Client Method |
|---|---|---|---|---|
| POST | `/memory` | `{content, tags, importance, embedding?, metadata?, timestamp?}` | `{memory_id, message}` | `storeMemory()` |
| GET | `/recall?query=...&tags=...&limit=...` | N/A (query params) | `{results[], count, dedup_removed?, ...}` | `recallMemory()` |
| POST | `/associate` | `{memory1_id, memory2_id, type, strength}` | `{success, message}` | `associateMemories()` |
| PATCH | `/memory/:id` | `{content?, tags?, importance?, metadata?, ...}` | `{memory_id, message}` | `updateMemory()` |
| DELETE | `/memory/:id` | N/A | `{memory_id, message}` | `deleteMemory()` |
| GET | `/memory/by-tag?tags=...&limit=...` | N/A | `{memories[], count}` | reached internally via `recallMemory({ tags, exhaustive: true })` — there is no separate public `searchByTag()` method |
| GET | `/health` | N/A | `{status, falkordb, qdrant, graph, timestamp}` | `checkHealth()` |

**Query parameter encoding:**

- Arrays (`tags`, `queries`) use repeated parameters: `?tags=project&tags=auth`
- Single values use standard encoding: `?query=decisions&limit=10`
- Boolean flags: `?expand_entities=true&expand_relations=false`
- Embedding vectors: comma-separated floats `?embedding=0.1,0.2,0.3,...`

### API Request Flow and Error Handling

Error handling details from [`src/automem-client.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/automem-client.ts#L157-L233) (`makeRequest()`, lines 157-233):

- **Retryable errors**: Network errors, 5xx server errors (3 attempts max)
- **Backoff**: Exponential — 500ms, 1s, 2s
- **Non-retryable**: 4xx client errors (auth, validation)
- **Auth hints**: 401/403 errors include message about checking `AUTOMEM_API_KEY`
- **Timeout**: 25 seconds per request

:::caution[Don't double-retry]
`AutoMemClient` already retries 5xx errors automatically. Do not add another retry layer on top in your integration code — this leads to compounding delays and may overwhelm the backend.
:::

## MCP Protocol Details

### Tool Annotations

MCP tool annotations provide hints to clients about tool behavior:

| Field | Meaning | Example Usage |
|---|---|---|
| `readOnlyHint` | Tool doesn't modify state | `recall_memory`, `check_database_health` |
| `destructiveHint` | Tool removes data | `delete_memory` |
| `idempotentHint` | Multiple calls with same args produce same result | `update_memory` only — `delete_memory` sets `idempotentHint: false` since its bulk-by-tag mode is not idempotent |
| `openWorldHint` | Results may reference external entities | Not used (memory IDs are self-contained) |

### Content Size Governance

The MCP server enforces content size limits before calling the backend:

- **Target**: 150-300 characters
- **Soft limit**: 500 characters — Warning issued, backend may summarize
- **Hard limit**: 2000 characters — Rejected immediately

**Rationale**: Prevents embedding quality degradation. Longer content produces less precise semantic embeddings, reducing recall accuracy.

## Best Practices for Custom Integrations

### 1. Configuration Management

Support multiple configuration sources in priority order:

1. Command-line arguments (highest priority)
2. Environment variables
3. Configuration files (`.env`, platform-specific)
4. Defaults (lowest priority)

Use environment variables for credentials (`AUTOMEM_API_URL`, `AUTOMEM_API_KEY`). Never hardcode API keys.

### 2. Error Handling

Handle service unavailability gracefully. A memory system failure should never crash the primary application. Log errors with context (operation name, memory ID, tags) so failures are diagnosable.

Respect `AutoMemClient`'s built-in retry logic — don't add redundant layers. For 401/403 errors, surface clear messages pointing to the `AUTOMEM_API_KEY` configuration.

### 3. Content Guidelines

Enforce size limits in your integration before calling the API:

```typescript
if (content.length > 2000) {
  throw new Error('Content exceeds 2000 character hard limit');
}
if (content.length > 500) {
  console.warn('Content exceeds 500 character soft limit — consider splitting');
}
```

**Recommended tagging conventions:**

- Always include project/workspace identifier
- Add temporal tag (year-month): `2025-01`
- Use hierarchical tags with prefix matching: `auth/login`, `auth/tokens`
- Include type tags: `decision`, `pattern`, `bug-fix`, `preference`

### 4. Recall Optimization

Start simple and expand as needed:

```typescript
// Simple: semantic search only
const results = await client.recallMemory({ query: 'authentication decisions' });

// Enhanced: semantic + tag filter
const results = await client.recallMemory({
  query: 'authentication decisions',
  tags: ['my-project', '2025-01'],
  limit: 10
});
```

**Parallel recall for comprehensive context:**

```typescript
const [recent, projectDecisions, patterns] = await Promise.all([
  client.recallMemory({ query: topic, time_query: 'last 7 days' }),
  client.recallMemory({ query: topic, tags: ['decision'] }),
  client.recallMemory({ query: topic, tags: ['pattern'] })
]);
```

### 5. Platform-Specific Optimizations

**For MCP platforms:**

- Use `readOnlyHint` annotations to help clients optimize caching
- Return both `content` (human-readable) and `structuredContent` (machine-parseable)
- Set appropriate `isError` flag for client-side error handling

**For direct API integrations:**

- Batch operations when possible (store multiple memories in sequence)
- Cache `recallMemory` results for repeated queries within a session
- Use `recallMemory({ tags, exhaustive: true })` for pure tag-based filtering (faster than semantic search) — there is no separate `searchByTag()` method

**For instruction-based platforms (Cursor, Codex):**

- Include concrete examples in rule templates, not just descriptions
- Show exact tool names with platform-specific prefixes
- Document when to recall vs when to skip (avoid over-fetching)

### 6. Testing Custom Integrations

Always health-check on startup:

```typescript
const client = new AutoMemClient({
  endpoint: process.env.AUTOMEM_API_URL!,
  apiKey: process.env.AUTOMEM_API_KEY,
});
const health = await client.checkHealth();
if (health.status !== 'healthy') {
  console.warn('AutoMem service degraded — memory features may be limited');
}
```

Test memory round-trip to validate end-to-end connectivity:

```typescript
const stored = await client.storeMemory({
  content: 'Integration test memory',
  tags: ['test', 'integration-check'],
  importance: 0.3
});
const recalled = await client.recallMemory({ query: 'integration test memory' });
// Verify the stored memory appears in results
```

## Migration from Existing Systems

### From Manual Memory Management

If your platform currently uses manual note-taking or file-based memory:

1. **Export existing memories** — Convert each note to a `storeMemory()` call with appropriate tags and importance scores
2. **Create associations for related memories** — Use `associateMemories()` to link memories that reference each other
3. **Set temporal metadata** — Include `timestamp` in the request body for historical memories to preserve chronological context

### From Other MCP Memory Servers

If migrating from a different MCP memory implementation:

**Tool name mapping**: Map old tool names to AutoMem equivalents. For example:

- `memory_store` → `store_memory`
- `memory_search` → `recall_memory`
- `memory_create_relation` → `associate_memories`

**Schema adaptation**: AutoMem expects `content`, `tags[]`, and `importance` (0.0-1.0). Map any confidence or priority fields to the importance scale.

## Troubleshooting

### Common Integration Issues

| Issue | Symptoms | Solution |
|---|---|---|
| **Server not starting** | Platform shows "MCP server failed to start" | Check `AUTOMEM_API_URL` in server env config. Verify no CLI arguments passed (would trigger CLI mode). |
| **Tools not appearing** | Platform doesn't list memory tools | Verify server name in platform config. Check if platform requires tool allowlist. Restart platform after config changes. |
| **Authentication failures** | 401/403 errors | Set `AUTOMEM_API_KEY` in server environment variables, not client-side. Verify API key format matches backend requirements. |
| **Recall returns empty** | Queries return 0 results despite stored memories | Check tags match exactly. Verify time filters aren't too restrictive. Try query without tags first. Check backend health. |
| **Content too large errors** | Store operations rejected | Enforce 500-char soft limit, 2000-char hard limit before calling API. Split long content into multiple memories with associations. |
| **Timeout errors** | Operations fail after ~25 seconds | Reduce `limit` parameter in recall queries. Check backend performance. Consider using `recallMemory({ tags, exhaustive: true })` instead of semantic search for simple tag queries. |

### Debugging Techniques

1. **Enable debug logging** — Check stderr output (the server writes all logs there to avoid stdio pollution)
2. **Test backend directly** — `curl http://localhost:8001/health` to verify service reachability
3. **Inspect MCP communication** — Use an MCP client simulator or enable verbose logging in your platform
4. **Verify template variable substitution** — Print the rendered template before writing it to disk

## Summary

Custom integrations with mcp-automem can be implemented through three primary approaches:

1. **MCP Server Integration** — Most common for AI platforms with MCP support. Configure the server in platform config, set environment variables, let the platform call tools via JSON-RPC.

2. **Template-Based CLI Installers** — Best for platforms needing automated setup. Create a template file with variable placeholders, implement a CLI command to substitute variables and write output files.

3. **Direct API Integration** — Ideal for non-MCP platforms or when full control is needed. Import `AutoMemClient`, call HTTP methods directly, handle retries and errors in application code.

**Key integration points in the codebase** (`src/index.ts` has grown to 1763 lines total; anchors below reflect current HEAD):

- Server entry / startup: [`src/index.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/index.ts#L41-L110) lines 41-110
- Tool definitions: [`src/index.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/index.ts#L466-L1418) lines 466-1418
- Tool handlers: [`src/index.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/index.ts#L1424-L1706) lines 1424-1706
- HTTP client: [`src/automem-client.ts`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/automem-client.ts) — `AutoMemClient` class starts at line 150 (892 lines total)
- Templates: [`templates/`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/templates/)
- CLI installers: [`src/cli/`](https://github.com/verygoodplugins/mcp-automem/blob/946f9e5ed1385b632efd2e5b250d064bcc4295e8/src/cli/)
