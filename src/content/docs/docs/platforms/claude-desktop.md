---
title: Claude Desktop
description: Set up AutoMem memory in Claude Desktop via MCP.
sidebar:
  order: 1
---

Claude Desktop uses the **Standard MCP** integration approach, connecting to AutoMem via a spawned stdio process. This exposes six memory tools (`store_memory`, `recall_memory`, `associate_memories`, `update_memory`, `delete_memory`, `check_database_health`) directly inside Claude Desktop conversations.

## System Architecture

Claude Desktop spawns the AutoMem MCP server as a child process and communicates over stdin/stdout using JSON-RPC.

```mermaid
graph TB
    subgraph "Claude Desktop Application"
        UI["Claude Desktop UI"]
        MCP_CLIENT["MCP Client (built-in)"]
    end

    subgraph "MCP Server Process"
        STDIO["StdioServerTransport"]
        TOOLS["Tool Registry — 6 MCP Tools"]
        CLIENT["AutoMemClient"]
    end

    subgraph "AutoMem Service"
        API["HTTP API :8001"]
        FALKOR[("FalkorDB Graph")]
        QDRANT[("Qdrant Vectors")]
    end

    UI --> MCP_CLIENT
    MCP_CLIENT -->|"JSON-RPC via stdio"| STDIO
    STDIO --> TOOLS
    TOOLS --> CLIENT
    CLIENT -->|"HTTP — AUTOMEM_API_URL"| API
    API --> FALKOR
    API --> QDRANT
```

**Tool naming:** When the MCP server is registered as `"memory"`, Claude Desktop prefixes tools with `mcp__memory__`:
- `mcp__memory__store_memory`
- `mcp__memory__recall_memory`
- `mcp__memory__associate_memories`
- `mcp__memory__update_memory`
- `mcp__memory__delete_memory`
- `mcp__memory__check_database_health`

---

## Installation

### Method 1: One-Click `.mcpb` Install

Download the AutoMem Claude Desktop Extension and double-click it to install — no manual JSON editing required:

**[Download AutoMem for Claude Desktop (.mcpb)](https://github.com/verygoodplugins/mcp-automem/releases/latest/download/mcp-automem.mcpb)**

After opening the file, Claude Desktop prompts you to:
1. Enter your **AutoMem API URL** (it defaults to `http://127.0.0.1:8001` for a local AutoMem; replace it with your Railway URL for cloud)
2. Optionally enter your **API Key** (required for Railway/cloud deployments, skip for local)
3. Click **Enable**

This installs the same `@verygoodplugins/mcp-automem` server as Method 2 below. Use Method 2 if you need to run multiple server instances or prefer manual JSON configuration.

### Method 2: Manual JSON Configuration

Edit (or create) the Claude Desktop config file for your platform:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Cloud deployment (Railway or other hosted AutoMem):**

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_API_URL": "https://your-automem-service.up.railway.app",
        "AUTOMEM_API_KEY": "your-api-token-here"
      }
    }
  }
}
```

**Local development (AutoMem running on localhost):**

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

**Using a local build instead of the npm package:**

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/mcp-automem/dist/index.js"],
      "env": {
        "AUTOMEM_API_URL": "http://127.0.0.1:8001"
      }
    }
  }
}
```

After editing the config, **restart Claude Desktop** for changes to take effect.

---

## Multiple Server Instances

You can run multiple AutoMem servers with different endpoints — for example, to separate personal and work memory:

```json
{
  "mcpServers": {
    "memory-personal": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": { "AUTOMEM_API_URL": "http://127.0.0.1:8001" }
    },
    "memory-work": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_API_URL": "https://work-automem.example.com",
        "AUTOMEM_API_KEY": "work-token"
      }
    }
  }
}
```

Tools from each server are prefixed with their server name:
- `mcp__memory-personal__recall_memory`
- `mcp__memory-work__recall_memory`

---

## Personal Preferences for Automatic Memory Usage

Claude Desktop's **Personal Preferences** field enables automatic, context-aware memory usage without manual prompting on every conversation.

As of April 2026, Claude Desktop labels this setting **Personal Preferences** under the Profile settings. Older docs may call the same area "Custom Instructions."

### Adding Personal Preferences

```mermaid
graph LR
    subgraph "Claude Desktop UI"
        SETTINGS["Settings"]
        MENU["Profile"]
        EDITOR["Personal Preferences"]
        SAVE["Save Button"]
    end

    subgraph "Instruction Triggers"
        START["Preference Recall"]
        CONTEXT["Task Context Recall"]
        STORE["Store / Update / Associate"]
    end

    SETTINGS --> MENU
    MENU --> EDITOR
    EDITOR --> SAVE

    SAVE -.->|"Applied to all chats"| START
    SAVE -.->|"Applied to all chats"| CONTEXT
    SAVE -.->|"Applied to all chats"| STORE
```

Navigate to: **Settings → Profile → Personal Preferences**.

Paste the starter template from the mcp-automem repo:

- [`templates/CLAUDE_DESKTOP_INSTRUCTIONS.md`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/CLAUDE_DESKTOP_INSTRUCTIONS.md)

The template assumes your MCP server key is `memory`, so examples use tool names such as `mcp__memory__recall_memory`. If your `claude_desktop_config.json` uses a different server key, update the tool prefix after pasting.

Key sections:

| Section | Purpose |
|---------|---------|
| Memory - Desktop is semantic-first | Avoids guessing project tags on broad Desktop conversations |
| Conversation start - semantic-first recall | Pulls preferences first, then one semantic task-context recall when useful |
| Storage Discipline | Keeps durable preferences, decisions, patterns, and fixes while skipping noise, and shows a concise `store_memory` call with type, tags, importance, confidence |
| Three mid-conversation triggers (and only three) | Stores on a user correction, a settled decision, or an articulated pattern |
| The atomic ritual - every store runs all four steps | Uses recall → store → verify → associate for every store |
| Mandatory association pairings | Maps each trigger to a store type and an association, and lists the 11 authorable relation types for `associate_memories` |

### Memory Storage Patterns

Importance values the template uses:

| Type | Importance | Example |
|------|-----------|---------|
| Preference / Decision | 0.9 | "Prefer early returns over nested conditionals" |
| Insight / Bug fix | 0.75 | "Auth failing on null input. Root: missing validation" |
| Pattern | 0.8 | "Using early returns for validation in all API routes" |

**Correction storage (critical pattern):** When you correct Claude's output, the Personal Preferences template tells Claude to store the correction as a high-importance `Preference` tagged `correction` so the same mistake is not repeated.

---

## Environment Variables

| Variable | Required | Purpose | Example |
|----------|---------|---------|---------|
| `AUTOMEM_API_URL` | No | AutoMem service URL. Defaults to the local URL; set it for cloud deployments | `http://127.0.0.1:8001` |
| `AUTOMEM_API_KEY` | No* | API authentication token | `your-token-here` |

\*Required for Railway/cloud deployments. Optional for local development.

**Configuration resolution order:**
1. `env` block in `claude_desktop_config.json` (highest priority)
2. `.env` file in current working directory
3. Default values

---

## Verification

After installation, open Claude Desktop and verify the connection:

```
User: Check the health of the AutoMem service
```

Expected response includes:
- Overall health status (`healthy`, `degraded`, or `error`)
- FalkorDB connection status
- Qdrant connection status
- Other statistics when the service reports them, such as memory and vector counts, sync status, and enrichment status

AutoMem's `/health` endpoint skips the API token check, so a healthy response does not prove that `AUTOMEM_API_KEY` is accepted. Ask Claude to recall something to confirm the key works.

---

## Troubleshooting

### Tools not appearing in Claude Desktop

1. Verify `claude_desktop_config.json` is valid JSON (no trailing commas)
2. Check that `AUTOMEM_API_URL` is reachable from your machine
3. Restart Claude Desktop completely (quit from menu, not just close window)
4. Check Claude Desktop logs for MCP server startup errors

### Service unreachable

```bash
# Test your endpoint directly
curl http://127.0.0.1:8001/health

# For cloud deployments
curl https://your-automem.up.railway.app/health
```

`/health` skips the API token check, so these commands only show whether the service is reachable. They succeed even if `AUTOMEM_API_KEY` is wrong.

### Authentication failures (401/403)

1. Verify `AUTOMEM_API_KEY` matches the token set in your AutoMem service
2. Test authentication against an endpoint that requires the token, because `/health` does not check it: `curl -i -H "Authorization: Bearer $KEY" "$ENDPOINT/recall?limit=1"`. A `401 Unauthorized` response means the service rejected the key.
3. AutoMem checks the key against the token configured on the service and has no token expiry, so a key that worked earlier fails only if the service token changed. Update `AUTOMEM_API_KEY` to the current value and restart Claude Desktop

### Memory not persisting between sessions

- Ensure you have Personal Preferences set that tell Claude when to recall, store, update, and associate memories
- Check that `store_memory` calls are completing successfully (no error messages)
- Verify the AutoMem service has write access to its database directories

---

## Related Platforms

Claude Desktop's configuration is similar to other MCP-enabled platforms but uses a different config file location:

- **Cursor IDE** — uses `~/.cursor/mcp.json` + `.cursor/rules/automem.mdc`
- **Claude Code** — uses `~/.claude.json` + `~/.claude/settings.json`
- **OpenAI Codex** — uses `~/.codex/config.toml` (TOML format)
- **Google Antigravity** — uses `~/.gemini/antigravity/mcp_config.json`, which Antigravity's own MCP docs describe opening from the built-in MCP Store's raw config view

All platforms share the same AutoMem MCP server package but with platform-specific configuration and optional rule files.
