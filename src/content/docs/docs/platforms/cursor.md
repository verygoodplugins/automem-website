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
| `--name <project>` | Project name for memory tags | Auto-detected from `package.json`, git remote, or directory name |
| `--dir <path>` | Custom target directory | `.cursor/rules` |
| `--dry-run` | Preview changes without writing files | Off |
| `--yes` / `-y` | Skip interactive prompts | Off |
| `--quiet` | Suppress output | Off |

The installer:
1. Detects project name from `package.json`, git remote, or directory name
2. Checks version of any existing `.mdc` file and prompts for update if newer version available
3. Detects your MCP server name from `~/.cursor/mcp.json` (looks for `memory`, `automem`, or any server with AutoMem signatures) and uses `memory` when it finds none
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
        "AUTOMEM_API_URL": "http://127.0.0.1:8001",
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
        "AUTOMEM_API_URL": "http://127.0.0.1:8001"
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

The CLI installer detects the server name and generates the `.mdc` file with the matching prefix. When it builds the prefix, it replaces every character other than an ASCII letter, digit, or underscore with an underscore. If it finds no AutoMem server in `~/.cursor/mcp.json`, it falls back to the server name `memory`, so the rules use `mcp_memory_*` tool names by default.

---

## Rule File Structure

After running the installer, `.cursor/rules/automem.mdc` is created with `alwaysApply: true` so Cursor applies the rules to all conversations in the project.

### Two-Phase Recall and Three Storage Triggers

The rule file prescribes two recalls at the start of a session, followed by three mid-conversation storage triggers. It has no end-of-conversation summary step.

**Session start: two recalls, issued in parallel**

Preferences and task context are independent recalls, so the rule file has Cursor issue both in a single message. The defaults are `limit: 20` for preferences, `limit: 30` for task context, and a 90-day task window.

1. **Preferences**: `tags: ["preference"]`, `limit: 20`, `sort: "updated_desc"`
2. **Task context**: one semantic query built from the proper nouns, product names, people, tools, and specific topics in the user's message, gated on the project tag unless the name collides with a common topic word (see Tagging Conventions), with `time_query: "last 90 days"` and `limit: 30`. The optional `language` and `active_path` parameters boost results and do not gate them.

Skip the task-context recall for pure syntax questions, trivial edits, one-off calculations, direct factual queries about current files, and casual openings.

Debug recall is separate and runs only when Cursor is investigating a concrete symptom: the error message or symptom as the query, `limit: 20`, and no tag gate, because bugfix and solution tagging is incomplete and a hard gate hides fixes stored elsewhere in the corpus. The rule file also says not to re-recall mid-conversation unless the topic shifts, a new proper noun enters, or debugging starts.

When the task-context recall misses:
- **Too broad** — add a tag gate (a stable category or the unambiguous project slug) and tighten the query to the real nouns
- **Empty** — drop the time window first, then broaden the query
- **Sparse under a tag gate** — drop the gate and rely on the semantic query alone, since older memories can use `project/<slug>` prefixes
- **Need graph traversal** — use `expand_relations: true`, adding `expand_respect_tags: true` only when traversal must stay inside the tag gate

**During the conversation: three storage triggers**

The rule file stores only durable decisions, corrections, explicit preferences, bug-fix root causes, and articulated reusable patterns. Its mid-conversation triggers are these three, and only these three:

| Trigger | Store as | Importance | Then associate with |
|---------|----------|-----------|---------------------|
| User correction or override ("actually", "no, I prefer", "stop doing X") | `Preference`, tag `correction`, confidence 0.95 | 0.9 | The prior memory, via `INVALIDATED_BY` |
| Decision stabilizes after at least one round of discussion ("let's go with X", "ship it") | `Decision` | 0.85–0.9 | Alternatives that came up, via `PREFERS_OVER` |
| Pattern the user articulated, not one inferred ("I always do X", "every time") | `Pattern` | 0.8 | Concrete examples, via `EXEMPLIFIES` |

A bug-fix root cause is stored as an `Insight` (importance 0.75, confidence 0.85) tagged `bugfix` and `solution`, then associated with the bug report through `LEADS_TO`.

Every store follows the same four steps:
1. Recall related memories (`limit: 5`)
2. Store the memory
3. Recall a distinctive phrase from the content to verify it was saved, and retry the store once if it is missing, because `store_memory` can silently fail
4. Associate it with the related memory from step 1 when one exists

**No end-of-conversation summary**

The rule file's storage discipline says never to store session summaries, progress reports, confirmations, speculative context, or attentiveness notes, and never to store secrets, credentials, tokens, or PII. It has no wrap-up step at the end of the conversation.

---

## Available MCP Tools

All six AutoMem tools are available via the `mcp_memory_*` prefix (assuming server named `memory`):

**`store_memory`** — Save memories with structured metadata
- `content` (required): 150–300 char target, 500 max (auto-summarized), 2000 hard limit
- `type` (optional): Decision, Pattern, Insight, Preference, Style, Habit, Context
- `confidence` (optional): 0.0–1.0 (default 0.9 if type provided)
- `tags` (optional): Array for categorization
- `importance` (optional): 0.0–1.0 (default 0.5)
- `t_valid` / `t_invalid` (optional): ISO 8601 timestamps for when the memory becomes valid and when it expires (single-memory mode only)
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

Use bare tags only. The rule file says to use `automem`, not `project/automem`, and to avoid `lang/` prefixes, platform tags (so no `cursor` tag), and date-stamped tags (so no `YYYY-MM`). `entity:*:*` tags are injected by the server.

The rule file treats tags as a hard gate on recall: memories without a matching tag are excluded before scoring. It therefore gates on stable categories and the project name rather than guessed topic tags.

**Project-specific memories** (code, architecture, decisions):
1. **Category tag**: a stable category such as `preference`, `bugfix`, `solution`, or `correction`
2. **Project tag**: your project name (`{{PROJECT_NAME}}` in the rule template), detected from `package.json`, the git remote, or the directory name, or set with `--name`
3. **Language tag**: for example `typescript` or `python`

```json
["decision", "my-app", "typescript"]
```

**Cross-project memories** (preferences, style): the session-start preferences recall is gated on `preference` alone and is not scoped to a project, so the most recently updated `preference`-tagged memories (up to 20) surface in any project.

Notes on the rule file's recall behavior:
- When the project name collides with a common topic word (`api`, `app`, `test`, `video`), the rule file drops the project tag gate on recall and relies on the semantic query alone
- A language tag is not a gate: at recall time the rule file passes the language as the optional `language` parameter, which boosts results and does not gate them
- For facts with a shelf life, set `t_valid` and `t_invalid` instead of encoding a date in a tag

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
