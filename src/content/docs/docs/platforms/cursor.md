---
title: Cursor IDE
description: Add persistent memory to Cursor with AutoMem MCP.
sidebar:
  order: 2
---

Cursor IDE uses a **two-component** approach for AutoMem integration:

1. **MCP server config** (`~/.cursor/mcp.json`) — connects Cursor to AutoMem via the Model Context Protocol
2. **Rule file** (`.cursor/rules/automem.mdc`) — instructs Cursor's AI when and how to use memory tools

Unlike automated hook systems, Cursor uses a **declarative rule-based approach**: the AI reads instructions from the `.mdc` file and decides when to invoke memory tools. This follows the philosophy: "Trust Claude + good instructions > automated hooks that guess significance."

---

## Installation

### Method 1: One-Click Deeplink

Use Cursor's deeplink URL scheme to install the MCP server in one click:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=memory&config=eyJ...
```

The base64-encoded config contains your endpoint and API key. Find the current deeplink in the [AutoMem README](https://github.com/verygoodplugins/mcp-automem).

:::note
The deeplink only configures `~/.cursor/mcp.json`. You still need to run the CLI installer to add the `.mdc` rule file.
:::

### Method 2: CLI Installer (Recommended)

The CLI installer handles both the rule file and validates your MCP config:

```bash
# Install with auto-detected project name
npx @verygoodplugins/mcp-automem cursor

# Specify project name manually
npx @verygoodplugins/mcp-automem cursor --name my-project

# Preview changes without writing
npx @verygoodplugins/mcp-automem cursor --dry-run

# Skip interactive prompts (for CI)
npx @verygoodplugins/mcp-automem cursor --yes
```

**CLI options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--name <project>` | Project name for memory tags | Auto-detected from `package.json` or git |
| `--dir <path>` | Custom target directory | `.cursor/rules` |
| `--dry-run` | Preview changes without writing files | Off |
| `--yes` / `-y` | Skip interactive prompts | Off |
| `--quiet` | Suppress output | Off |

The installer:
1. Detects project name from `package.json`, git remote, or directory name
2. Checks version of any existing `.mdc` file and prompts for update if newer version available
3. Detects your MCP server name from `~/.cursor/mcp.json` (looks for `memory`, `automem`, or any server with AutoMem signatures)
4. Generates `.cursor/rules/automem.mdc` with your project name and correct tool prefix
5. Creates a `.bak` backup before overwriting any existing file

---

## MCP Server Configuration

Manually edit or create `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_ENDPOINT": "http://127.0.0.1:8001",
        "AUTOMEM_API_KEY": "your-token-here"
      }
    }
  }
}
```

For local development (no API key needed):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_ENDPOINT": "http://127.0.0.1:8001"
      }
    }
  }
}
```

### Tool Naming Convention

Cursor exposes MCP tools with underscore-delimited prefixes: `mcp_<server>_<tool>`. The server name is sanitized — hyphens become underscores.

| Server name in config | Tool prefix | Example tool |
|----------------------|-------------|-------------|
| `memory` | `mcp_memory_` | `mcp_memory_recall_memory` |
| `auto-mem` | `mcp_auto_mem_` | `mcp_auto_mem_recall_memory` |

The CLI installer automatically detects the server name and generates the `.mdc` file with the correct prefix.

---

## Rule File Structure

After running the installer, `.cursor/rules/automem.mdc` is created with `alwaysApply: true` so Cursor applies the rules to all conversations in the project.

### Three-Phase Memory Pattern

The rule file prescribes a three-phase memory workflow:

**Phase 1: Conversation Start**

Recall context for most questions. Skip only for:
- Pure syntax questions ("How does Array.map work?")
- Trivial edits (typos, formatting)
- Direct factual queries about current code

Always recall for:
- Project context and architecture questions
- Feature planning and design discussions
- Debugging (search for similar past errors)
- Performance optimization
- Refactoring (understand why current structure exists)

Adaptive recall logic:
- If files are open → recall memories tagged with those components
- If error messages present → search similar error patterns
- If multiple related files → recall architectural decisions

**Phase 2: During Conversation — Storage Triggers**

| Type | Importance | Use Case | Example |
|------|-----------|---------|---------|
| Decision | 0.9 | Architecture choices, library selections | "Chose Redis for caching due to sub-millisecond latency requirements" |
| Insight | 0.8 | Root cause discoveries, problem resolutions | "UserAuth failing on null input. Root: missing validation. Added checks" |
| Pattern | 0.7 | Reusable patterns, best practices | "Using early returns for validation. Reduces nesting, improves readability" |
| Preference | 0.6–0.8 | Configuration choices, style preferences | "Using Prettier with 2-space indents and single quotes" |
| Context | 0.5–0.7 | General information, new features | "Added JWT authentication with refresh tokens" |

**Phase 3: Conversation End — Summary**

Summarize when:
- Multiple files were modified
- Significant refactoring occurred
- New features were implemented
- Important decisions were made

---

## Available MCP Tools

All six AutoMem tools are available via the `mcp_memory_*` prefix (assuming server named `memory`):

**`store_memory`** — Save memories with structured metadata
- `content` (required): 150–300 char target, 500 max (auto-summarized), 2000 hard limit
- `type` (optional): Decision, Pattern, Insight, Preference, Style, Habit, Context
- `confidence` (optional): 0.0–1.0 (default 0.9 if type provided)
- `tags` (optional): Array for categorization
- `importance` (optional): 0.0–1.0 (default 0.5)
- `metadata` (optional): Custom structured data

**`recall_memory`** — Hybrid search
- Basic: `query`, `queries`, `tags`, `limit`
- Time filters: `time_query`, `start`, `end`
- Tag matching: `tag_mode` (any/all), `tag_match` (exact/prefix)
- Graph expansion: `expand_entities`, `expand_relations`, `auto_decompose`
- Expansion filters: `expand_min_importance`, `expand_min_strength` (v0.8.0+)
- Context hints: `language`, `active_path`, `context_types`, `priority_ids`

**`associate_memories`** — Create typed relationships between memories
- 11 authorable types: `RELATES_TO`, `LEADS_TO`, `EVOLVED_INTO`, `DERIVED_FROM`, `EXEMPLIFIES`, `CONTRADICTS`, `REINFORCES`, `INVALIDATED_BY`, `OCCURRED_BEFORE`, `PART_OF`, `PREFERS_OVER`
- Recall results may also surface system-generated `SIMILAR_TO`, `PRECEDED_BY`, and `DISCOVERED` relations, but those are not valid inputs to `associate_memories`
- `strength`: 0.0–1.0 association weight

**`update_memory`** — Modify existing memory fields

**`delete_memory`** — Remove memory by ID

**`check_database_health`** — Verify FalkorDB and Qdrant connections

---

## Tagging Conventions

**Project-specific memories** (code, architecture, decisions):
1. `{{PROJECT_NAME}}` — Detected from `package.json` or git
2. `cursor` — Platform tag
3. `YYYY-MM` — Current month
4. Component tag — Specific area (auth, api, frontend)

**Personal/cross-project memories** (preferences, style):
1. `personal` — Use instead of project tag for portability
2. `YYYY-MM` — Current month
3. Category tag (health, preferences, workflow)

Using `personal` instead of the project name ensures style preferences and personal notes are discoverable across all projects, not buried under project-specific memories.

---

## Content Size Governance

| Limit | Size | Behavior |
|-------|------|---------|
| Target | 150–300 chars | Optimal for embedding quality |
| Soft limit | 500 chars | Auto-summarized by backend (requires `OPENAI_API_KEY`) |
| Hard limit | 2000 chars | Rejected by MCP server |

**Format:** `"Brief title. Context and details. Impact/outcome."`

If more detail is needed:
- Split into multiple atomic memories
- Use `metadata` for structured data (files, error signatures)
- Create associations between related memories

---

## Global User Rules (Optional)

For memory-first behavior across **all** Cursor projects, add rules to **Cursor Settings > General > Rules for AI** instead of per-project `.mdc` files.

:::note
Keep global rules thin and cross-project. Use them for a short memory policy baseline only; put operational behavior, tagging conventions, and tool usage patterns in the project-level `.cursor/rules/automem.mdc` file installed by `npx @verygoodplugins/mcp-automem cursor`.
:::

---

## Error Handling

The rule file prescribes graceful degradation:
- **Recall fails or empty** — Continue without historical context. Do not announce failure.
- **Store fails** — Complete the task normally. Memory is an enhancement, not a requirement.
- **Service unavailable** — Focus on solving the immediate problem.

---

## Troubleshooting

### Tools not available in Cursor

1. Check that `~/.cursor/mcp.json` exists and is valid JSON
2. Restart Cursor after editing `mcp.json`
3. Verify the server name in `mcp.json` matches the prefix in `.cursor/rules/automem.mdc`
4. Run `npx @verygoodplugins/mcp-automem cursor` again to regenerate the rule file with the detected server name

### Rule file not updating

The installer creates a backup at `automem.mdc.bak` before overwriting. If you need to force update:

```bash
npx @verygoodplugins/mcp-automem cursor --yes
```

### Memory not recalling project context

Ensure memories are tagged with the project name. Check by running a recall query in Cursor:
```
Recall memories tagged with [your-project-name]
```

If empty, memories may have been stored without the project tag. Update the `.mdc` rule file to use the correct project name and re-run the installer.
