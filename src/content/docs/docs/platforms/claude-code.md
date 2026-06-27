---
title: Claude Code
description: MCP config and hooks for memory in Claude Code.
sidebar:
  order: 3
---

Claude Code integration provides persistent memory through a direct MCP connection plus instruction-based memory rules. The `claude-code` CLI installer sets up hook scripts that run at key events (session start, build, test, deployment) to capture context automatically. CLAUDE.md rules guide Claude's judgment for manual memory operations.

:::tip[Plugin is the recommended path again]
The v0.14 deprecation of the Claude Code **plugin** was **reversed** in June 2026 — the plugin is once again the recommended install path (enable-time config prompts, automatic marketplace updates, atomic uninstall). The `npx @verygoodplugins/mcp-automem claude-code` CLI installer is the supported **settings-level** alternative and the migration/cleanup path for older installs. Nothing is scheduled for removal. See the upstream [DEPRECATION.md](https://github.com/verygoodplugins/mcp-automem/blob/main/DEPRECATION.md).
:::

**Two installation paths:**
1. **Plugin installation** (recommended) — native Claude Code plugin via `/plugin marketplace add` + `/plugin install`
2. **CLI installation** (settings-level alternative) — `npx @verygoodplugins/mcp-automem claude-code`

---

## Installation

### Method 1: Plugin Installation (Recommended)

```bash
/plugin marketplace add verygoodplugins/mcp-automem
/plugin install automem@verygoodplugins-mcp-automem
```

This installs the plugin to `~/.claude/plugins/automem@marketplace-name/` with the following structure:

```
~/.claude/plugins/automem@marketplace-name/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── .mcp.json                # MCP server configuration
├── commands/
│   ├── memory-health.md
│   ├── memory-recall.md
│   └── memory-store.md
├── hooks/
│   └── hooks.json           # SessionStart hook config
├── scripts/
│   └── session-start.sh     # Session initialization script
└── skills/
    └── memory-management/
        ├── SKILL.md
        └── patterns.md
```

The plugin registers three slash commands and configures the MCP server automatically.

:::note
The plugin bundles the MCP server, hooks, and skill and **auto-updates** through the marketplace. Prefer to manage `~/.claude/settings.json` yourself? Use the CLI installer in Method 2. To move an existing settings-level install onto the plugin, see the [migration guide](https://github.com/verygoodplugins/mcp-automem/blob/main/DEPRECATION.md).
:::

### Method 2: CLI Installation (settings-level alternative)

**Step 1: Register the MCP server**

Edit `~/.claude.json` to add the AutoMem server:

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

**Step 2: Install hooks and merge settings**

Run the CLI installer to install hook scripts and merge permissions:

```bash
npx @verygoodplugins/mcp-automem claude-code
```

This installs the following hook scripts into `~/.claude/hooks/`:

- `automem-session-start.sh` — recalls context at session start
- `capture-build-result.sh` — captures build outcomes
- `capture-test-pattern.sh` — captures test results
- `capture-deployment.sh` — captures deployment events
- `session-memory.sh` — stores session summary on exit

Support scripts installed into `~/.claude/scripts/`:

- `python-command.sh`, `queue-cleanup.sh`, `process-session-memory.py`, `memory-filters.json`

It also merges the following into `permissions.allow` (assuming server named `"memory"`):

```json
{
  "permissions": {
    "allow": [
      "mcp__memory__store_memory",
      "mcp__memory__recall_memory",
      "mcp__memory__associate_memories",
      "mcp__memory__update_memory",
      "mcp__memory__delete_memory",
      "mcp__memory__check_database_health"
    ]
  }
}
```

Pre-authorizing tools prevents Claude Code from asking permission on every tool use.

**Step 3: Add memory rules to CLAUDE.md**

Append the memory rules template to `~/.claude/CLAUDE.md`:

```bash
# The CLI installer prints the rules — append them manually, or:
npx @verygoodplugins/mcp-automem claude-code
# Then follow the instructions to append to ~/.claude/CLAUDE.md
```

**Step 4: Restart Claude Code**

```bash
claude  # Restart to pick up new MCP server and permissions
```

---

## Tool Naming

The server name in `~/.claude.json` determines the tool prefix format: `mcp__<server_name>__<tool_name>`.

With server named `"memory"`:
- `mcp__memory__store_memory`
- `mcp__memory__recall_memory`
- `mcp__memory__associate_memories`
- `mcp__memory__update_memory`
- `mcp__memory__delete_memory`
- `mcp__memory__check_database_health`

Plugin installations may use a different server name (e.g., `plugin_automem_memory`). Use Claude Code's tool list as the source of truth for exact names, then update the `CLAUDE.md` rules to match.

---

## Memory Rules System

The `~/.claude/CLAUDE.md` file instructs Claude when and how to use memory tools. The rules define a two-phase recall strategy:

### Two-Phase Recall at Session Start

**Phase 1 — Tag-only preference recall:**
```
recall_memory(tags: ["preference"], limit: 10)
```
Preferences are stable knowledge that doesn't expire. Tag-only queries return clean results without semantic noise.

**Phase 2 — Semantic + time-limited recent work:**
```
recall_memory(queries: ["current task"], time_query: "last 30 days", limit: 10)
```
Recent work is dynamic and time-sensitive. Semantic search finds relevant context even with different terminology.

:::tip
Do not mix tag-based preference recall with semantic task recall — combining them dilutes results.
:::

### Storage Patterns by Type

| Type | Importance | Use Case | Example |
|------|-----------|---------|---------|
| `Preference` | 0.9 | User preferences, explicit choices | "User prefers early returns over nested conditionals" |
| `Decision` | 0.9 | Architectural decisions, library choices | "Chose Redis for caching due to performance needs" |
| `Insight` | 0.8 | Bug root causes, key learnings | "Auth failing on null input. Root: missing validation" |
| `Pattern` | 0.7 | Reusable approaches, best practices | "Using early returns for validation in all API routes" |
| `Style` | 0.7 | Code style, formatting preferences | "Using 2-space indents with Prettier, enforced via pre-commit" |
| `Context` | 0.5–0.7 | General information, feature notes | "Added JWT auth with refresh token rotation" |
| `Habit` | 0.6 | Regular workflows, behaviors | "Run tests before committing" |

### Content Size Governance

| Limit | Action | Purpose |
|-------|--------|---------|
| Target: 150–300 chars | None | Optimal for embedding quality |
| Soft limit: 500 chars | Auto-summarize (backend) | Prevent degradation |
| Hard limit: 2000 chars | Reject immediately | Database protection |

**Format guideline:** `"Brief title. Context and details. Impact/outcome."`

If more detail is needed: split into multiple atomic memories, use `metadata` for structured data, create associations between related memories.

### Relationship Types (14 types)

| Type | Use Case |
|------|---------|
| `LEADS_TO` | Bug → Solution, Problem → Fix |
| `REINFORCES` | Supporting evidence, validation |
| `CONTRADICTS` | Conflicting approaches, alternatives |
| `EVOLVED_INTO` | Knowledge progression, iterations |
| `INVALIDATED_BY` | Outdated info → current approach |
| `DERIVED_FROM` | Source relationships, origins |
| `RELATES_TO` | General connections |
| `PREFERS_OVER` | User/team preferences |
| `EXEMPLIFIES` | Pattern examples |
| `OCCURRED_BEFORE` | Temporal sequence |
| `PART_OF` | Hierarchical structure |
| `SIMILAR_TO` | Semantic similarity *(system-generated, enrichment)* |
| `PRECEDED_BY` | Prior in time *(system-generated, enrichment)* |
| `DISCOVERED` | Heuristic edge with `kind` property *(system-generated, consolidation)* |

> The last 3 types are **system-generated** — created automatically by enrichment and consolidation. Only the 11 authorable types above them can be used in `associate_memories`.

**Association triggers:**

| Memory Type | Trigger | Association |
|-------------|---------|-------------|
| User correction | Search for what's being corrected | `INVALIDATED_BY` |
| Bug fix | Link to original bug discovery | `DERIVED_FROM` |
| Decision | Link to alternatives considered | `PREFERS_OVER` |
| Evolution | When knowledge supersedes old | `EVOLVED_INTO` |

---

## Plugin Commands

When installed via plugin, these slash commands are available:

### `/memory-health`

Checks AutoMem service health and connectivity:
- Calls `check_database_health()`
- Reports FalkorDB and Qdrant connection status
- Validates `AUTOMEM_API_URL` configuration

```
✓ FalkorDB: Connected
✓ Qdrant: Connected
✓ AutoMem service: Healthy
```

### `/memory-recall`

Intelligent context-aware recall:
- Analyzes current working directory
- Examines recently opened files
- Executes parallel recall strategies
- Presents relevant memories with relationships

### `/memory-store`

Store a decision, insight, or pattern:
- Prompts for memory content
- Suggests tags based on context
- Applies appropriate importance score
- Creates associations with related memories

---

## Tagging Strategy

1. Always include project name
2. Add platform tag (`claude-code`)
3. Include current month (`YYYY-MM` format)
4. Add component/domain tag
5. Add memory type tag

**Example:** `["my-app", "claude-code", "auth", "decision", "2025-01"]`

---

## Migration from Hooks (Pre-v0.8.0)

If you have a pre-v0.8.0 hooks-based setup, these components were removed:

| Component | Path | Purpose |
|-----------|------|---------|
| Capture hooks | `templates/claude-code/hooks/capture-*.sh` | Automated memory capture |
| Queue processing | `templates/claude-code/scripts/process-queue.py` | Batch memory processing |
| Cleanup scripts | `templates/claude-code/scripts/queue-cleanup.sh` | Queue deduplication |
| Notifications | `templates/claude-code/scripts/smart-notify.sh` | Desktop notifications |
| Profile system | `templates/claude-code/profiles/` | Lean vs extras configs |

**Migration steps:**

```bash
# 1. Backup existing setup
cp ~/.claude/settings.json ~/.claude/settings.json.pre-v0.8.0.bak

# 2. Remove old hooks (optional)
rm -rf ~/.claude/hooks/

# 3. Update to current setup
npx @verygoodplugins/mcp-automem claude-code

# 4. Verify tools appear
claude --list-tools | grep memory
```

---

## Best Practices

**When to use memory:**
- Session start: Always recall context for project-related work
- Before decisions: Check for existing patterns and preferences
- After significant work: Store decisions, insights, patterns
- During debugging: Search for similar past issues
- User corrections: Always store style corrections

**When to skip memory:**
- Trivial questions about syntax
- Simple file operations
- Basic factual queries
- Already well-documented information

**Good memory content:**
- "Chose PostgreSQL over MongoDB. Need ACID for transactions. Impact: Data consistency guaranteed."
- "Login failing on special chars. Root: missing sanitization. Added validator. Files: auth/login.ts"
- "Early returns for validation. Reduces nesting, improves readability. Applied in all API routes."

**Poor memory content:**
- "Fixed typo" (too vague, no context)
- "Updated config" (what config? why?)
- "Changed authentication system from basic auth to JWT..." (too long, should be split)

---

## Troubleshooting

### Tool names not found

**Symptom:** `mcp__memory__*` tools not available.

- Check the server name in `~/.claude.json` — it determines the prefix
- Plugin installations use different server names (e.g., `plugin_automem_memory`)
- Use Claude Code's tool list as source of truth for exact names
- Update `CLAUDE.md` rules to match your actual tool names

### Service unreachable

**Symptom:** `/memory-health` fails, `recall_memory` returns errors.

```bash
# Check service is running
curl http://127.0.0.1:8001/health

# For cloud deployments
curl -H "Authorization: Bearer $KEY" https://your-automem.example.com/health
```

### Memories not storing

- Check AutoMem service logs for errors
- Verify `AUTOMEM_API_KEY` is set if using cloud deployment
- Check content size — hard limit is 2000 chars
- Ensure service has write permissions to database directories

### Recall returns empty results

- Ensure memories are tagged with project name
- Try broader queries with fewer filters
- Remove `time_query` for older memories
- Use `tag_mode: "any"` instead of `"all"`

### Windows: hooks fail to run Python

**Symptom:** session-start or capture hooks log errors like `python: command not found`, or hooks appear to succeed but skip the Python step silently.

Windows systems often ship with `python` pointing at the Microsoft Store app shim, with the real interpreter exposed only as `python3` or under `py -3`. The installer ships a `python-command.sh` wrapper that resolves to the correct interpreter for the current host:

```bash
# Installed by the CLI installer
~/.claude/scripts/python-command.sh
```

The bundled hook scripts invoke `python-command.sh` instead of calling `python` directly, so upgrading to the latest mcp-automem release and re-running `npx @verygoodplugins/mcp-automem claude-code` is typically enough to pick up the fix. If you've customized hooks in place, point them at the wrapper rather than hard-coding `python` or `python3`.
