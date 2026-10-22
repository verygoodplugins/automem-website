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

Download the AutoMem Claude Desktop Extension, then open **Settings → Extensions → Advanced settings → Install Extension** in Claude Desktop and select the file:

**[Download AutoMem for Claude Desktop (.mcpb)](https://github.com/verygoodplugins/mcp-automem/releases/latest/download/mcp-automem.mcpb)**

Claude Desktop prompts you to:
1. Enter your **AutoMem API URL** (it defaults to `http://127.0.0.1:8001` for a local AutoMem; replace it with your Railway URL for cloud)
2. Optionally enter your **API Key** (required for Railway/cloud deployments, skip for local)
3. Click **Enable**

The bundle includes a fixed version of the `@verygoodplugins/mcp-automem` server and its runtime dependencies. Claude Desktop supplies Node.js. Use Method 2 if you need to run multiple server instances or prefer manual JSON configuration.

The AutoMem backend runs separately, either locally or in the cloud. Installing or updating the extension does not deploy or upgrade that backend.

If migrating from Method 2, back up `claude_desktop_config.json` first. Remove only the old AutoMem entry under `mcpServers` for the same endpoint, preserving other servers and settings, then restart Claude Desktop. This prevents duplicate AutoMem tools.

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

## Updating AutoMem

**GitHub-downloaded extensions need manual updates.** Installing the `.mcpb` fixes the MCP server at that release's version. Restarting Claude Desktop or updating a global npm package does not replace it. Anthropic's directory-installed extensions update automatically by default; that does not apply to this GitHub download. See [Anthropic's extension guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop).

1. Open **Settings → Extensions → AutoMem** and compare the installed extension's version with the [latest GitHub Release](https://github.com/verygoodplugins/mcp-automem/releases/latest).
2. Download the latest release's [`mcp-automem.mcpb`](https://github.com/verygoodplugins/mcp-automem/releases/latest/download/mcp-automem.mcpb).
3. Open **Settings → Extensions → Advanced settings → Install Extension** and select the new file. Review the API URL/key in the extension's settings.
4. Restart Claude Desktop, check the installed version again, and run the [verification steps](#verification), including a recall to confirm authentication.

Existing memories stay in the backend configured by the API URL. Update the backend separately using its own deployment process.

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
| Desktop is semantic-first | Avoids guessing project tags on broad Desktop conversations |
| Conversation start | Pulls preferences first, then one semantic task-context recall when useful |
| When to store | Keeps durable preferences, decisions, patterns, and fixes while skipping noise |
| Storage format | Shows concise `store_memory` calls with type, tags, importance, confidence |
| Mid-conversation memory ops | Uses recall → store → verify → associate for important updates |
| Relation types | Lists the 11 authorable association types for `associate_memories` |

### Memory Storage Patterns

Recommended importance thresholds:

| Type | Importance | Example |
|------|-----------|---------|
| Preference / Decision | 0.9 | "Prefer early returns over nested conditionals" |
| Insight / Bug fix | 0.8 | "Auth failing on null input. Root: missing validation" |
| Pattern | 0.7 | "Using early returns for validation in all API routes" |
| Context | 0.5–0.7 | "Added JWT auth with refresh token rotation" |

**Correction storage (critical pattern):** When you correct Claude's output, the Personal Preferences template tells Claude to store the correction as a high-importance style signal so the same mistake is not repeated.

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
3. Regenerate API key if expired

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
