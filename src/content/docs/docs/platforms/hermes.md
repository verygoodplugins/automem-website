---
title: Hermes Agent
description: Add persistent memory to the Hermes terminal agent via AutoMem MCP tools, a native memory provider, or both.
sidebar:
  order: 12
---

[Hermes](https://github.com/NousResearch/hermes) is Nous Research's terminal agent. AutoMem plugs into it three ways:

- **MCP tools** — AutoMem registers as a standard MCP server (`mcp_servers.automem`), exposing explicit `mcp_automem_*` tools.
- **Native memory provider** — AutoMem becomes Hermes' `memory.provider`, injecting ambient recall into the model payload before each turn.
- **Both** — ambient recall from the provider, plus explicit MCP tools for writes and targeted recalls.

The default is **MCP-only**: it exposes one explicit tool path and avoids collisions with Hermes' built-in memory tools. Choose **provider** when you want AutoMem to act as Hermes' native memory with no manual tool calls.

---

## Integration modes

| Mode | Flag | What it does | Best for |
|---|---|---|---|
| **MCP** *(default)* | `--mode mcp` | Registers `mcp_servers.automem` in `config.yaml`; exposes explicit `mcp_automem_*` tools | One clear tool path; running alongside Hermes' built-in memory |
| **Provider** *(recommended for native memory)* | `--mode provider` | Sets `memory.provider: automem` and installs the provider plugin; recall is injected automatically | Hands-off, ambient memory that replaces Hermes' built-in provider |
| **Both** | `--mode both` | Provider ambient recall **and** the MCP tools, with duplicate provider tools disabled | Ambient recall plus explicit write/recall control |

Hermes memory providers are **exclusive plugins** — they activate through `memory.provider`, not `plugins.enabled`. If `hermes plugins list` shows AutoMem as `not enabled` or `exclusive plugin`, that is expected for provider mode; use `hermes memory status` as the source of truth.

---

## Installation

Run the installer for the mode you want:

```bash
# MCP tools only (default): mcp_automem_recall_memory, mcp_automem_store_memory, …
npx @verygoodplugins/mcp-automem hermes --mode mcp

# Native memory provider: ambient recall via memory.provider
npx @verygoodplugins/mcp-automem hermes --mode provider

# Both: native ambient recall plus MCP write/recall tools
npx @verygoodplugins/mcp-automem hermes --mode both
```

Hermes is also one of the agents offered by the [guided installer](/docs/getting-started/quick-start/) (`curl -fsSL get.automem.ai | sh`) — select **Hermes**, then pick a mode.

**CLI options:**

| Flag | Environment variable | Description | Default |
|---|---|---|---|
| `--mode <mode>` | `AUTOMEM_HERMES_MODE` | `mcp`, `provider`, or `both` | `mcp` |
| `--endpoint <url>` | `AUTOMEM_API_URL` | AutoMem HTTP API endpoint | `http://127.0.0.1:8001` |
| `--api-key <token>` | `AUTOMEM_API_KEY` | Bearer token for authenticated endpoints | — |
| `--rules <path>` | — | Rules file to update | `$HERMES_HOME/AGENTS.md` |
| `--dry-run` | `AUTOMEM_DRY_RUN=1` | Print the plan; write nothing | Off |
| `--yes` / `-y` | `AUTOMEM_YES=1` | Skip prompts (CI) | Off |
| `--quiet` | — | Suppress output | Off |

Re-running is safe: existing AutoMem credentials are preserved (so switching `--mode` won't reset your endpoint or key), and every changed file keeps a `.bak` copy.

---

## Configuration

Hermes config lives under `$HERMES_HOME` (default `~/.hermes`, override with the `HERMES_HOME` environment variable):

| File | Written when | Purpose |
|---|---|---|
| `~/.hermes/config.yaml` | All modes | `mcp_servers.automem` (MCP/both) and/or `memory.provider: automem` (provider/both) |
| `~/.hermes/AGENTS.md` | All modes | AutoMem rules block, fenced by `<!-- BEGIN/END AUTOMEM HERMES RULES -->` |
| `~/.hermes/plugins/automem/` | Provider, both | Provider plugin (`__init__.py`, `plugin.yaml`, `cli.py`, `automem_policy.py`) |
| `~/.hermes/.env` | Provider, both | `AUTOMEM_API_URL`, `AUTOMEM_API_KEY`, `AUTOMEM_HERMES_PROVIDER_TOOLS` (written `0600`) |

The MCP server entry written to `config.yaml` looks like this:

```yaml
mcp_servers:
  automem:
    command: npx
    args:
      - "-y"
      - "@verygoodplugins/mcp-automem"
    env:
      AUTOMEM_API_URL: http://127.0.0.1:8001
      # AUTOMEM_API_KEY: your-token   # added for authenticated endpoints
    tools:
      include:
        - recall_memory
        - store_memory
        - associate_memories
        - update_memory
        - check_database_health
      resources: false
      prompts: false
    sampling:
      enabled: false
```

:::note[`--mode both` keeps tools on one surface]
In `both` mode the installer writes `AUTOMEM_HERMES_PROVIDER_TOOLS=false`, so explicit tools stay on the MCP path and Hermes never exposes duplicate `automem_*` provider tools. Provider recall remains ambient.
:::

The installer rewrites `config.yaml` directly (comment-preserving, idempotent) rather than shelling out to `hermes mcp add`, so your API key is never echoed to the terminal.

---

## Verify

```bash
# MCP mode
hermes mcp test automem

# Provider or both mode
hermes memory status
hermes automem doctor
```

Restart Hermes, then ask it to check AutoMem health.

- In **MCP mode**, Hermes should expose `mcp_automem_check_database_health` and should **not** expose `delete_memory` by default.
- In **provider mode**, `hermes memory status` shows `Provider: automem` and `Status: available`. `hermes automem doctor` checks the configured AutoMem `/health` endpoint and runs a small recall-prefetch probe.

### Inspect what recall injects

In provider mode, recall is injected into the model payload **before each turn** and is not printed in the terminal. To see the exact block AutoMem sends, run `debug-recall` with any prompt:

```bash
hermes automem debug-recall "what do you remember about my setup?"
```

Add `--raw` for the unfenced text. Hermes' own debug logs intentionally report only section counts and recall status — never memory content — so `debug-recall` is the supported way to inspect the actual `<memory-context>` block.

---

## Available tools

In **MCP / both** modes, Hermes exposes five tools under the `mcp_automem_*` prefix:

| Tool | Purpose |
|---|---|
| `mcp_automem_recall_memory` | Hybrid search across the graph + vector store |
| `mcp_automem_store_memory` | Save a memory with type, tags, importance, metadata |
| `mcp_automem_associate_memories` | Create typed relationships between memories |
| `mcp_automem_update_memory` | Modify fields on an existing memory |
| `mcp_automem_check_database_health` | Verify FalkorDB + Qdrant connectivity |

`delete_memory` is intentionally **not** included in Hermes' default tool surface. For the full tool semantics, see [Memory Operations](/docs/reference/api/memory-operations/) and [Recall Operations](/docs/reference/api/recall-operations/).

In **provider** mode there are no explicit tools — recall is ambient. Provider explicit recall is capped at 10 results to keep accidental broad recalls from flooding a turn.

---

## Recall behavior

AutoMem uses one shared recall blueprint across every host: preferences first, one semantic task-context recall with a 90-day window, and debug/topic-shift recall only when triggered. Hermes runs it with two profiles:

| Profile | Used by | Preference / Context / Debug limits |
|---|---|---|
| Rules profile | MCP mode (instruction-driven) | 20 / 30 / 20 |
| Provider profile | Provider mode (ambient injection) | 5 / 10 / 10 |

The smaller provider limits keep injected context compact while preserving the same recall semantics. First-turn task-context recall scopes to the current project tag only when the prompt isn't a general/explicit memory ask — for broad questions Hermes drops the cwd tag and relies on semantic recall instead of hard-gating to the current repo.

---

## Tagging conventions

The installed rules use **bare tags** (no namespace prefixes):

- `automem`, `hermes` — system + platform
- a project slug (auto-detected from `package.json` or git)
- a language (`typescript`, `python`, …) and a category (`bugfix`, `decision`, `preference`, `pattern`)

**Store** corrections, settled decisions, and articulated patterns immediately. **Never store** secrets, credentials, tokens, PII, or session/progress summaries. When recalled memory conflicts with the current repository, prefer the repository.

---

## Troubleshooting

### `tools: Tool names must be unique`

Hermes is seeing two explicit AutoMem tool surfaces — usually a stale `mcp_servers.memory` entry combined with `mcp_servers.automem` or provider tools. Reset to a single surface:

```bash
npx @verygoodplugins/mcp-automem uninstall hermes
npx @verygoodplugins/mcp-automem hermes --mode mcp
```

For `both` mode, confirm `$HERMES_HOME/.env` contains `AUTOMEM_HERMES_PROVIDER_TOOLS=false`.

### Provider mode active but recall seems absent

Run Hermes with the AutoMem debug flag and check the logs for prefetch diagnostics (counts and endpoint status only — never content or secrets):

```bash
AUTOMEM_HERMES_DEBUG=true hermes
```

### Tools or provider not picked up

Restart Hermes (or run `/reload-mcp`) after install — config changes are read at startup.

---

## Uninstall

```bash
# Remove AutoMem from Hermes
npx @verygoodplugins/mcp-automem uninstall hermes

# Preview without changing files
npx @verygoodplugins/mcp-automem uninstall hermes --dry-run

# Strip the rules block from a custom rules file
npx @verygoodplugins/mcp-automem uninstall hermes --rules /path/to/AGENTS.md
```

The uninstaller removes `mcp_servers.automem`, any AutoMem-owned `mcp_servers.memory`, `memory.provider: automem`, `$HERMES_HOME/plugins/automem`, the AutoMem rules block, and AutoMem keys in `$HERMES_HOME/.env`.

---

## Next steps

- **Use memory well** — [Memory Operations](/docs/reference/api/memory-operations/) and [Best Practices](/docs/best-practices/memory-rules/).
- **Connect more agents** — the [guided installer](/docs/getting-started/quick-start/) wires Codex, Claude Code, Cursor, OpenClaw, and Hermes in one pass.
- **Configuration** — [Environment Variables](/docs/getting-started/environment-variables/) and [Configuration Reference](/docs/reference/configuration/).
