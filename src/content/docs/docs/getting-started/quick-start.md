---
title: Quick Start
description: Install AutoMem and wire it into your AI agents with one guided command.
sidebar:
  order: 2
---

One command sets up AutoMem and connects it to your agents:

```bash
curl -fsSL get.automem.ai | sh
```

That launches the **guided installer**. It detects your machine, helps you stand up a memory backend (hosted or local), verifies it, and wires the connection into the AI agents you already use — showing you every change and backing up every file before it writes. No decision tree, no hand-edited config, no copy-pasting tokens between four terminals.

:::tip[Prefer npm?]
If you already have Node 20.19+ installed, the launcher just runs an npm package — you can call it directly:

```bash
npx @verygoodplugins/mcp-automem install
```

Both commands run the exact same guided installer.
:::

## What the installer does

```mermaid
graph LR
    A["1 · Detect<br/>OS, Node, Docker,<br/>Git, agent roots"] --> B["2 · Choose<br/>Hosted, Local,<br/>or Existing"]
    B --> C["3 · Provision<br/>Deploy + health-check<br/>your AutoMem server"]
    C --> D["4 · Wire agents<br/>Review the plan,<br/>then connect Codex,<br/>Claude Code, Cursor…"]
```

It is safe to run, and safe to re-run:

- **Nothing is written until you approve a plan.** The installer prints a full review — endpoint, API key status, and every file it will touch — and waits for a yes.
- **Every changed file keeps a `.bak` copy**, so you can always roll back.
- **Re-running is idempotent.** Local server tokens are reused (not rotated), so a second run never invalidates agents you already connected.

### Prerequisites

| Tool | When it's needed |
|---|---|
| **Node.js** 20.19+, 22.13+, or 24+ and **npm** | Always (the installer and the MCP bridge run on it) |
| **Docker** + **Git** | Only if you choose the **Local Docker** path |

The launcher checks for Node and npm first and stops with a clear message if either is missing — it never dumps a stack trace at you.

---

## Walk-through: the installer, prompt by prompt

Here is exactly what you'll see, and what each choice means.

![The AutoMem guided installer asking "Where should AutoMem run?" with Hosted Cloud, Local Docker, and Existing Endpoint options](/img/docs/installer-target-select.png)

### Splash → "Where should AutoMem run?"

After a brief AutoMem splash, the first question picks your backend:

```text
?  Where should AutoMem run?
❯  Hosted Cloud      InstaPods or Railway — guided deploy
   Local Docker      Clone AutoMem and start Docker Compose on this machine
   Existing Endpoint Use an AutoMem URL you already have
```

| Option | Choose it when | What happens |
|---|---|---|
| **Hosted Cloud** *(default)* | You want always-on memory across devices and machines | The installer guides a cloud deploy and captures the endpoint + token for you |
| **Local Docker** | You want everything on your own machine, no cloud, no cost | Clones AutoMem into `~/.automem/server`, generates local tokens, runs `docker compose up`, and waits for `/health` |
| **Existing Endpoint** | You already run AutoMem somewhere | Paste the URL (and key); the installer verifies it before touching any agent config |

### Hosted Cloud → pick a provider

Choosing **Hosted Cloud** asks how to stand it up:

```text
?  How should we stand up your hosted AutoMem?
❯  InstaPods                      open the setup page — it deploys AutoMem and emails your URL + key
   Railway (guided)              sign in with the railway CLI, deploy from the terminal, then auto-capture keys
   Other — I already have a URL + key   already deployed somewhere; just paste your endpoint + token
```

- **InstaPods** — opens the [InstaPods setup page](https://instapods.com/apps/automem/?ref=jack) (it deploys AutoMem and emails your API URL + key, Grow plan ~$15/mo flat), then you paste them back.
- **Railway (guided)** — signs in via the `railway` CLI and deploys the AutoMem template straight from the terminal (usage-based, ~$1–5/mo), auto-capturing the endpoint + token. Falls back to a browser deploy if the CLI can't finish.
- **Other** — you already have an endpoint; paste the URL + token and skip provisioning.

:::tip[Going deeper on hosted setup?]
The [Guided Cloud Setup](/docs/cli/guided-cloud-setup/) guide covers each provider flow in detail — InstaPods email-back, the Railway CLI/browser deploy, reusing an existing deployment, and scripting it in CI.
:::

For **Existing Endpoint** (or **Other**), you'll be prompted for the URL and a masked API key:

```text
?  AutoMem API URL  ›  https://your-automem.example
?  AutoMem API key (leave blank if this endpoint does not require one)  ›  ••••••••
```

### "Install AutoMem into which agents?"

Next, choose which agents get wired up. **Agents already detected on your machine are pre-checked** — press space to toggle, enter to confirm:

![The AutoMem installer's agent picker — Codex, Claude Code, and Cursor detected and checked, with OpenClaw and Hermes available to add](/img/docs/installer-agent-select.png)

```text
?  Install AutoMem into which agents?  (space to toggle, enter to confirm)
❯ ◉ Codex        detected on this machine
  ◉ Claude Code  detected on this machine
  ◉ Cursor       detected on this machine
  ◯ OpenClaw     not detected, still installable
  ◯ Hermes       not detected, still installable
```

Detection looks for `~/.codex`, `~/.claude`, `~/.cursor`, `~/.openclaw`, and `~/.hermes`. Anything not detected is still installable — just check it.

If you select **Claude Code**, it asks how to integrate:

```text
?  How should AutoMem integrate with Claude Code?
❯  Plugin (recommended)     bundles the MCP server + hooks, prompts for your endpoint, auto-updates
   Settings-level install   writes ~/.claude hooks + permissions directly; no auto-update
```

- **Plugin** *(recommended)* — adds the AutoMem marketplace and installs the plugin, which bundles the MCP server, hooks, and skill and **auto-updates**. If the `claude` binary is on your PATH the installer runs `claude plugin install` for you; otherwise it prints the two `/plugin` commands to run inside Claude Code.
- **Settings-level** — writes `~/.claude` hooks and permissions directly. Scriptable, but you update it yourself.

Selecting **Hermes** asks for a mode: **Native memory provider** (recommended — replaces Hermes' built-in provider), **MCP tools only** (portable tools, no replacement), or **Both**.

### Review the plan, then approve

Before changing anything, the installer prints the full plan and waits for a yes:

![The installer's review plan: mode, endpoint, redacted API key, and a numbered list of stages — verify, write, and per-agent installs — ending with "Dry run only. No files were changed."](/img/docs/installer-review-plan.png)

The plan lists the **mode** and **endpoint**, whether an **API key** is set (always shown redacted), and every **stage** it will run — verify the endpoint, write `.env`, and configure each agent — with the exact file paths it will touch. Every changed file keeps a `.bak` copy. (The screenshot above is a `--dry-run`, which prints the plan and stops without writing anything.)

Approve, and a live checklist ticks through each step — verify endpoint, write `.env`, configure each agent — finishing with a success card and your endpoint. If an individual agent needs a manual step (for example the OpenClaw CLI isn't installed), that one is flagged with a copy-paste fix and the rest still complete.

:::note[What gets written]
The installer writes `AUTOMEM_API_URL` (and `AUTOMEM_API_KEY`, if your endpoint needs one) to a `.env` in the **current directory**, then delegates to each agent's installer to register the MCP server. Agent config files are backed up first.
:::

---

## Customize the install

The installer is fully scriptable. Every prompt has a flag and an environment variable, so you can pre-answer some questions, automate the whole thing in CI, or preview a run without touching disk. Set environment variables before the pipe, or pass flags when calling the npm package directly.

```bash
# Hosted cloud, fully interactive (default)
curl -fsSL get.automem.ai | sh

# Local Docker, no questions asked
curl -fsSL get.automem.ai | AUTOMEM_INSTALL_TARGET=local AUTOMEM_YES=1 sh

# Point at an endpoint you already run, only wire Codex + Cursor
curl -fsSL get.automem.ai | \
  AUTOMEM_INSTALL_TARGET=existing \
  AUTOMEM_API_URL=https://memory.example \
  AUTOMEM_API_KEY=sk-... \
  AUTOMEM_CLIENTS=codex,cursor \
  AUTOMEM_YES=1 sh

# Preview the plan without changing anything
curl -fsSL get.automem.ai | AUTOMEM_DRY_RUN=1 sh
```

The equivalent flags work on the npm package: `npx @verygoodplugins/mcp-automem install --target existing --endpoint https://memory.example --clients codex,cursor --yes`.

| Flag | Environment variable | Purpose |
|---|---|---|
| `--target` | `AUTOMEM_INSTALL_TARGET` | `local`, `cloud`, or `existing` |
| `--cloud-provider` | `AUTOMEM_CLOUD_PROVIDER` | `instapods`, `railway`, or `other` |
| `--clients` | `AUTOMEM_CLIENTS` | Comma-separated agents: `codex,claude-code,cursor,openclaw,hermes` |
| `--endpoint` | `AUTOMEM_API_URL` | AutoMem HTTP API endpoint |
| `--api-key` | `AUTOMEM_API_KEY` | Bearer token for authenticated deployments |
| `--local-dir` | `AUTOMEM_LOCAL_DIR` | Local backend checkout path (default `~/.automem/server`) |
| `--claude-code-mode` | `AUTOMEM_CLAUDE_CODE_MODE` | `plugin` (default) or `settings` |
| `--hermes-mode` | `AUTOMEM_HERMES_MODE` | `mcp` (default), `provider`, or `both` |
| `--yes` / `-y` | `AUTOMEM_YES=1` | Apply the reviewed plan without prompting |
| `--dry-run` | `AUTOMEM_DRY_RUN=1` | Print the plan, write nothing |
| `--no-agent-install` | `AUTOMEM_NO_AGENT_INSTALL=1` | Set up the endpoint only; skip agents |

:::note[Headless and CI]
In CI or agent runtimes (`CI`, `CODEX`, `CLAUDE_CODE`, or `GITHUB_ACTIONS` set), the installer assumes `--yes` automatically. Without a TTY and without `--yes`, it prints the plan and stops, so an unattended pipe can never make unreviewed changes.
:::

---

## Verify it worked

Once the installer finishes, confirm the backend is healthy:

```bash
# Local Docker
curl http://localhost:8001/health

# Hosted / existing endpoint
curl https://your-automem-url/health \
  -H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"
```

A healthy response looks like this:

```json
{
  "status": "healthy",
  "falkordb": "connected",
  "qdrant": "connected",
  "memory_count": 0,
  "enrichment": { "status": "running", "queue_depth": 0 },
  "graph": "memories"
}
```

| Field | Description |
|---|---|
| `status` | Overall health: `"healthy"` or `"degraded"` |
| `falkordb` | Graph store connection: `"connected"` or `"disconnected"` |
| `qdrant` | Vector store connection: `"connected"` or `"unavailable"` |
| `memory_count` | Total memories in the graph |
| `enrichment.status` | Background worker state: `"running"` or `"stopped"` |
| `graph` | FalkorDB graph name (default `memories`) |

:::note
`"qdrant": "unavailable"` is **expected** if you haven't configured Qdrant. AutoMem degrades gracefully to graph-only mode — everything else keeps working. Set `QDRANT_URL` and restart to enable vector search.
:::

### Try it end to end

Restart the agent you connected (quit and reopen — don't just close the window), then:

1. Ask it to **check AutoMem health** — this calls the `check_database_health` tool.
2. Ask it to **remember something**: *"Remember that I prefer TypeScript over JavaScript for new projects."*
3. In a fresh chat, ask **"What are my language preferences?"** — the memory should come back, retrieved via hybrid search.

---

## Manual & advanced setup

Prefer to run the backend yourself, or wire an agent by hand? Everything the installer automates, you can also do manually.

### Deploy the AutoMem server yourself

| Method | Setup time | Best for |
|---|---|---|
| [InstaPods Hosted](/docs/deployment/instapods/) | ~30 seconds | Fastest hosted AutoMem, flat $15/mo, generated MCP config |
| [Railway](/docs/deployment/railway/) | ~60 seconds | Production, multi-device, HTTPS, usage-based billing |
| [Docker Compose](/docs/getting-started/docker/) | ~5 minutes | Full local stack, no cloud cost |
| Bare-metal Python | ~2 minutes | An existing FalkorDB and direct debugging |

**Docker Compose** is the quickest manual local stack:

```bash
git clone https://github.com/verygoodplugins/automem.git
cd automem
make dev   # docker compose up --build
```

Services start on `:8001` (Flask API), `:6379` (FalkorDB), and `:6333` (Qdrant). See [Docker & Local Dev](/docs/getting-started/docker/) for volumes, environment overrides, and the bare-metal Python path.

:::caution[Railway: set `PORT=8001`]
On Railway, `memory-service` **must** set `PORT=8001`. Without it Flask defaults to port 5000, other services can't connect, and you'll see `ECONNREFUSED` errors. The [Railway template](/docs/deployment/railway/) sets this for you.
:::

### Connect an agent by hand

The setup wizard prints config snippets for every platform, or use the lighter endpoint-only wizard if you just need to write a `.env`:

```bash
npx @verygoodplugins/mcp-automem setup
```

For a manual MCP entry — for example Claude Desktop's `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-automem": {
      "command": "npx",
      "args": ["-y", "@verygoodplugins/mcp-automem"],
      "env": {
        "AUTOMEM_API_URL": "http://localhost:8001"
      }
    }
  }
}
```

Add `"AUTOMEM_API_KEY": "your-token"` for authenticated (hosted) endpoints. Per-platform paths and snippets live in the [Platform Guides](/docs/platforms/claude-desktop/).

:::caution
Provide the API key as-is — no `Bearer` prefix. The client adds `Bearer ` to the `Authorization` header for you. And verify your JSON has no trailing commas: one syntax error stops a client from loading any MCP server.
:::

---

## Authentication

AutoMem accepts a token three ways, in order of preference:

```bash
# 1. Bearer token (recommended)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/health

# 2. Custom header
curl -H "X-API-Token: YOUR_TOKEN" http://localhost:8001/health

# 3. Query parameter (discouraged — tokens land in logs)
curl "http://localhost:8001/health?api_key=YOUR_TOKEN"
```

Admin operations need an extra header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Admin-Token: YOUR_ADMIN_TOKEN" \
     http://localhost:8001/admin/...
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `node is required` from the launcher | Node/npm not installed | Install Node 20.19+ (`nvm install 20`), then re-run |
| Installer says the package has no `install` | Old npm cache | The guided installer ships in `@verygoodplugins/mcp-automem` 0.15.0+; clear the npx cache or pin `@latest` |
| Local server won't start | Port in use (`:8001`, `:6379`, `:6333`) | Stop the conflicting container (`docker ps`) or free the port, then re-run |
| `503 Service Unavailable` | FalkorDB unreachable | Check `FALKORDB_HOST` / `FALKORDB_PORT` |
| `"qdrant": "unavailable"` | Qdrant not configured | Expected — set `QDRANT_URL` to enable vector search |
| `401 Unauthorized` | Wrong/missing token | Verify `AUTOMEM_API_KEY`; provide it without a `Bearer` prefix |
| `ECONNREFUSED` on Railway | `PORT` not set | Set `PORT=8001` on `memory-service` |
| Tools don't appear in your agent | Client not reloaded | Fully quit and reopen the agent (don't just close the window) |
| One agent flagged "needs a manual step" | That agent's CLI was missing | Run the printed fix command; the rest of the install still succeeded |

---

## Next steps

- **Connect more platforms** — [Platform Guides](/docs/platforms/claude-desktop/) for Claude Desktop, Claude Code, Cursor, Codex, and remote MCP.
- **Configuration reference** — [Environment Variables](/docs/getting-started/environment-variables/) and [Configuration](/docs/reference/configuration/) for every setting and embedding provider.
- **Use memory well** — [Memory Operations](/docs/reference/api/memory-operations/) for tagging, importance, recall, and relationships.
- **Production hardening** — [Railway](/docs/deployment/railway/) and [Docker](/docs/getting-started/docker/) for monitoring, backups, and scaling.
