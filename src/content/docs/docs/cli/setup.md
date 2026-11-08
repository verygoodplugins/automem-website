---
title: Setup & Installation
description: CLI commands for setting up AutoMem.
sidebar:
  order: 1
---

This page covers installing the `@verygoodplugins/mcp-automem` package and running the guided installer to configure your connection to the AutoMem service. For information about deploying the AutoMem backend service itself, see [Prerequisites](#prerequisites). For detailed configuration options and environment variable resolution, see [Configuration Tools](/docs/cli/config-tools/).

:::tip[The guided installer does all of this for you]
`npx @verygoodplugins/mcp-automem install` (or `curl -fsSL get.automem.ai | sh`) runs an interactive installer that provisions a backend, verifies it, and wires the MCP server into each agent — reviewing every change first. `setup` is an alias of `install` as of 0.17.0. The [Quick Start](/docs/getting-started/quick-start/) takes you to your first recall. The [prompt walkthrough](#walk-through-the-installer-prompt-by-prompt) below explains each installer choice. The manual steps below are for building a setup by hand or scripting individual pieces. Print config snippets with `npx @verygoodplugins/mcp-automem config`.
:::

## Prerequisites

The mcp-automem package is a **bridge component** that translates Model Context Protocol (MCP) calls into AutoMem HTTP API requests. It does not store memories itself — it requires a separate AutoMem backend service that handles memory storage, retrieval, and graph operations.

### Node.js Runtime Requirements

The mcp-automem package requires **Node.js 20.19.0+, 22.13.0+, or 24+**. This version requirement is enforced in the package manifest (`engines: "^20.19.0 || ^22.13.0 || >=24"`) and necessary for:

- ECMAScript modules (ESM) support used throughout the codebase
- Native fetch API used by the HTTP client
- Modern async/await patterns in the MCP SDK

**Verify your Node.js version:**
```bash
node --version
# Should output: v20.19.x, v22.13.x, or v24.x.x or higher
```

**Install or upgrade Node.js:**

| Method | Command |
|---|---|
| **nvm** (recommended) | `nvm install 20` |
| **Official Installer** | Download from [nodejs.org](https://nodejs.org) |
| **Homebrew (macOS)** | `brew install node@20` |
| **Package Manager (Linux)** | `apt install nodejs` or equivalent |

### AutoMem Service Requirement

The MCP server **cannot function without a running AutoMem service**. You must choose one deployment option before installing:

**Why separate services?**

- **Deployment flexibility**: Run memory backend on different infrastructure than MCP client
- **Multi-client support**: Multiple MCP servers can share one AutoMem instance
- **Scaling independence**: Scale memory storage separately from MCP protocol handling
- **Technology separation**: Backend uses Python/Flask while client uses TypeScript

**Option 1: Local Development**

Best for: development, testing, single-machine use, privacy-focused setups.

Requirements: Docker and Docker Compose, plus Git for the guided local installer. Resource use depends on the embedding model. The [prebuilt image path](/docs/getting-started/docker/#prebuilt-image) needs Docker Compose and publishes only the API on localhost.

```bash
git clone https://github.com/verygoodplugins/automem
cd automem
make dev
```

This launches: Flask service on `:8001`, FalkorDB on `:6379`, Qdrant on `:6333`, FalkorDB graph browser on `:3000`.

Endpoint configuration: `AUTOMEM_API_URL=http://127.0.0.1:8001` (no API key required in development mode)

**Option 2: InstaPods Hosted**

Best for: fastest hosted setup, individual production use, generated MCP configuration.

1. Open the [AutoMem app on InstaPods](https://instapods.com/apps/automem/?ref=jack)
2. Deploy the AutoMem pod
3. Copy the generated MCP config
4. Note the HTTPS endpoint and API token

Endpoint configuration: `AUTOMEM_API_URL=https://your-instapods-url` (base URL, no `/health` path), `AUTOMEM_API_KEY=<generated-token>`

Typical cost: `$15/mo flat` for the AutoMem plan.

**Option 3: Railway Cloud**

Best for: production use, multi-device access, team collaboration, always-on availability.

1. Click Railway deploy button (see AutoMem service repository)
2. Connect GitHub account
3. Configure environment variables in Railway dashboard
4. Note the generated Railway URL: `https://your-project.up.railway.app`

Endpoint configuration: `AUTOMEM_API_URL=https://your-project.up.railway.app`, `AUTOMEM_API_KEY=<generated-token>`

Railway bills for metered memory, CPU, storage, and network usage. Embedding API charges are separate. See [Railway deployment](/docs/deployment/railway/).

**Option 4: Self-Hosted Production**

Best for: enterprise deployments, custom infrastructure, air-gapped environments.

| Platform | Setup Complexity |
|---|---|
| **Docker Compose** | Medium |
| **Kubernetes** | High |
| **VPS (DigitalOcean, Linode)** | Medium |
| **AWS/GCP/Azure** | High |

### Network Connectivity Requirements

| Deployment | Ports Used | Accessibility |
|---|---|---|
| **Local** | `8001` (AutoMem API); the Compose stack also publishes `6379`, `3000`, `6333`, and `6334` (FalkorDB and Qdrant) | Published on all host interfaces by default (Docker Compose port mapping); see [Restricting Network Exposure](/docs/getting-started/docker/#restricting-network-exposure) |
| **InstaPods** | `443` (HTTPS) | Internet |
| **Railway** | `443` (HTTPS) | Internet |
| **Self-hosted** | `8001` or custom | Depends on configuration |

### Platform-Specific Config Paths

Before installation, determine where these files will be located:

| File | Purpose | Typical Location | Required When |
|---|---|---|---|
| `.env` | AutoMem endpoint and API key | Current directory or home | Setup wizard |
| `claude_desktop_config.json` | Claude Desktop MCP config | OS-specific config directory | Claude Desktop |
| `~/.cursor/mcp.json` | Cursor MCP server config | User home directory | Cursor IDE |
| `~/.claude.json` | Claude Code MCP config | User home directory | Claude Code |
| `~/.codex/config.toml` | Codex MCP config | User home directory | OpenAI Codex |

**Claude Desktop**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Cursor IDE**:
- All platforms: `~/.cursor/mcp.json` (MCP server config)
- Project-specific: `.cursor/rules/automem.mdc` (memory rules)

**Claude Code**:
- All platforms: `~/.claude.json` (MCP server config)
- All platforms: `~/.claude/settings.json` (permissions)
- All platforms: `~/.claude/CLAUDE.md` (memory rules)

### Pre-Installation Checklist

**System Requirements**
- Node.js 20.19.0+, 22.13.0+, or 24+ installed (`node --version`)
- npm available (`npm --version`)
- Terminal access with write permissions

**AutoMem Service**
- AutoMem service deployed (local, InstaPods, Railway, or self-hosted)
- Service is running and accessible
- Health endpoint responds: `curl http://your-endpoint/health`
- Note your `AUTOMEM_API_URL` (the base URL of your AutoMem service)
- Note your `AUTOMEM_API_KEY` (if using authentication)

**Network Connectivity**
- MCP client can reach AutoMem service (test with curl)
- No firewall blocking the connection
- HTTPS certificate valid (if using Railway or self-hosted with SSL)

**File System Access**
- Write permission to create `.env` file
- Access to platform-specific config directories
- Ability to restart AI platform applications

## Installation Methods

The `mcp-automem` package can be installed three ways, depending on your use case.

### Installation Entry Points

```mermaid
graph TB
    subgraph "Package Entry Points"
        PKG[package.json]
        BIN["bin: { mcp-automem: dist/index.js }"]
        MAIN["main: dist/index.js"]
    end

    subgraph "Installation Methods"
        NPX["npx @verygoodplugins/mcp-automem"]
        GLOBAL["npm install -g"]
        LOCAL["git clone + npm install"]
    end

    subgraph "Execution Modes"
        CLI["CLI Mode<br/>(with args)"]
        SERVER["Server Mode<br/>(no args)"]
    end

    subgraph "Runtime"
        INDEX["src/index.ts"]
        SETUP["src/cli/setup.ts"]
        MCP["MCP Server<br/>(stdio transport)"]
    end

    PKG --> BIN
    PKG --> MAIN

    NPX --> BIN
    GLOBAL --> BIN
    LOCAL --> INDEX

    BIN --> INDEX

    INDEX --> CLI
    INDEX --> SERVER

    CLI --> SETUP
    SERVER --> MCP
```

**Dual mode detection:** The entry point at `src/index.ts` determines whether to run as an MCP server (no arguments) or execute a CLI command (with arguments). This allows the same package to function as both an MCP server process and a CLI tool.

### Method 1: NPX (Recommended)

The recommended installation method uses `npx` to run the package without installing it globally. This ensures you always use the latest version and avoids version conflicts.

```bash
npx @verygoodplugins/mcp-automem install
```

**How it works:**
- `npx` downloads the package temporarily to execute it
- No global installation required
- Automatically uses the latest published version
- Suitable for CI/CD pipelines and one-off commands

**When to use:** For platform configurations (Claude Desktop, Cursor, Claude Code) where the MCP server is launched on-demand via `npx` in the config file.

### Method 2: Global Installation

Install the package globally to use the `mcp-automem` command without `npx`.

```bash
npm install -g @verygoodplugins/mcp-automem
mcp-automem install
```

**When to use:** If you run CLI commands frequently or want faster execution without npx download delays.

### Method 3: Local Development

For contributors or those customizing the codebase, clone and build locally.

```bash
git clone https://github.com/verygoodplugins/mcp-automem
cd mcp-automem
npm install
npm run build
node dist/index.js install
```

The built server is available at `dist/index.js`.

**Build process:**
- `npm run prebuild` — Regenerates the memory-policy artifacts first, then syncs template versions (audited against `mcp-automem` 0.19.2 at [`e1c6295`](https://github.com/verygoodplugins/mcp-automem/blob/e1c62958950dd24ae7d1ac3c50dbf5519ee7ea09/scripts/sync-template-versions.mjs))
- `npm run build` — Compiles TypeScript from `src/` to `dist/`
- `npm run postbuild` — Builds the OpenClaw plugin package (`node scripts/build-openclaw-plugin-package.mjs`; the script sets the executable bit on `dist/index.js` via Node, not a shell `chmod`)
- `npm run dev` — Runs the TypeScript source directly via `tsx watch src/index.ts` for development

## Guided installer

`install` is the guided installer. It asks where AutoMem runs, verifies the endpoint, writes `.env`, and configures the agents you select. Pass `--dry-run` to preview and `--yes` to apply without prompts. Host commands such as `claude-code` and `cursor` remain scriptable writers for one platform.

`setup` is an alias of `install` as of 0.17.0. The older `setup` flags (`--env`, `--claude-code`, `--claude-dir`, `--claude-dry-run`) are no longer accepted; they error with a pointer to `install`, `config`, or the relevant host writer.

The installer writes `.env` in the current directory after it verifies the endpoint:

```
AUTOMEM_API_URL=http://localhost:8001
AUTOMEM_API_KEY=your-api-key-here
```

Dotenv loads that file when the MCP server starts. System environment variables override it (see [Configuration Tools](/docs/cli/config-tools/)).

:::caution[Security note]
The `.env` file contains your API key and should be added to `.gitignore` to avoid committing credentials to version control.
:::

## Config Output

Print the current configuration for other platforms (Claude Desktop JSON, Claude Code env export, Hermes YAML):

```bash
npx @verygoodplugins/mcp-automem config
```

Use `config` when you want the CLI to reprint your current configuration later. This command prints human-readable output for the supported surfaces, including Claude Desktop JSON, Claude Code env export lines with the `your-auto-mem-api-key` placeholder, and the Hermes `mcp_servers` YAML snippet. For Hermes provider mode, run `npx @verygoodplugins/mcp-automem hermes`.

If you need machine-readable output instead, add `--format=json` (or `--json`):

```bash
npx @verygoodplugins/mcp-automem config --format=json
```

That JSON mode emits the raw MCP configuration object. It is useful for scripting. The default text output is the human-readable snippets.

## Welcome Conversation

After a successful interactive install, the installer offers an optional welcome conversation. Choose an installed assistant or **Not now** to skip it. The welcome message helps the assistant learn your work style while demonstrating the actual memory tool calls and relationship operations live.

- **Cursor** — opens with the message prefilled for your review before you send it
- **Claude Code, Codex, Grok, OpenClaw** — starts an interactive conversation when the CLI is on your PATH
- **Any other host** — copies the prompt to your clipboard (or prints it) so you can paste it in yourself

To start the welcome conversation later, run:

```bash
npx @verygoodplugins/mcp-automem@latest welcome
```

Use `--print` to print the prompt to stdout without launching an assistant (useful for piping or pasting into any tool):

```bash
npx @verygoodplugins/mcp-automem@latest welcome --print
```

Pass `--client <name>` to target a specific agent (`codex`, `claude-code`, `cursor`, `openclaw`, `hermes`, `grok`):

```bash
npx @verygoodplugins/mcp-automem@latest welcome --client cursor
```

To skip the welcome offer during install, pass `--no-welcome` or set `AUTOMEM_NO_WELCOME=1`. Dry runs, non-interactive runs, and `--yes` never launch the welcome conversation.

## Post-Installation File Structure

After the guided installer writes `.env`, your directory contains:

```
your-project/
├── .env                          # Written by the guided installer
│   ├── AUTOMEM_API_URL=...
│   └── AUTOMEM_API_KEY=...
└── node_modules/                 # If npm install was run
    └── @verygoodplugins/
        └── mcp-automem/
            ├── dist/
            │   └── index.js      # MCP server entry point
            ├── templates/        # Platform-specific rules
            │   ├── claude-code/
            │   ├── antigravity/
            │   ├── codex/
            │   ├── copilot/
            │   ├── cursor/
            │   ├── grok/
            │   ├── hermes/
            │   └── openclaw/
            └── package.json
```

**Templates:** In the audited `mcp-automem` 0.19.2 release (`e1c62958950dd24ae7d1ac3c50dbf5519ee7ea09`), the published `templates/` package surface includes `antigravity`, `claude-code`, `codex`, `copilot`, `cursor`, `grok`, `hermes`, and `openclaw`. See [Platform Installers](/docs/cli/platform-installers/) for how each template is used.

## Verification

After installation, verify the setup works by checking the database health:

```bash
curl http://your-endpoint/health
```

**Expected health response:**
```json
{
  "status": "healthy",
  "falkordb": "connected",
  "qdrant": "connected",
  "memory_count": 0,
  "enrichment": {
    "status": "running",
    "queue_depth": 0
  }
}
```

For platform-specific verification (Claude Desktop, Cursor, etc.), see the respective integration guides in [Platform Installers](/docs/cli/platform-installers/).

## Common Installation Issues

| Issue | Cause | Solution |
|---|---|---|
| `AUTOMEM_API_URL not set` | No endpoint is configured in the environment or in a `.env` file in the current directory. The client falls back to `http://127.0.0.1:8001` and prints this warning only in an interactive terminal | Run the `install` wizard (`setup` is an alias), or set `AUTOMEM_API_URL`. Nothing to fix if your AutoMem runs at the default local address |
| `Connection refused` | AutoMem service not running | Start service: `cd automem && make dev` |
| `401 Unauthorized` | Invalid API key | Check `AUTOMEM_API_KEY` matches service token |
| `npx: command not found` | Node.js not installed | Install Node.js 20.19.0+, 22.13.0+, or 24+ |
| `Module not found` errors | Incomplete installation | Run `npm install` or use `npx` instead |

**Debug mode:** Set `AUTOMEM_LOG_LEVEL=debug` to enable verbose logging:

```bash
AUTOMEM_LOG_LEVEL=debug npx @verygoodplugins/mcp-automem
```

### Issue: Node.js Version Too Old

**Symptom**: Error during installation: `The engine "node" is incompatible with this module`

**Solution**: Upgrade Node.js to version 20.19+, 22.13+, or 24+ using nvm or official installer.

### Issue: AutoMem Service Not Running

**Symptom**: MCP server logs show `ECONNREFUSED` or `Service unreachable`

**Solution**:
1. Verify service is running: `curl http://your-endpoint/health`
2. Check Docker containers for local: `docker ps | grep automem`
3. Check Railway logs for cloud deployments

### Issue: Network Connectivity

**Symptom**: Timeouts when calling AutoMem API

**Solution**:
1. Verify endpoint URL is correct (no typos)
2. Check firewall rules if self-hosted
3. Ensure AutoMem service is bound to correct interface (not just localhost)
4. Test with curl from same machine as MCP client

### Issue: Port Conflicts

**Symptom**: Local AutoMem service fails to start on port 8001

The installer (0.19.2+) automatically detects Docker port collisions and retries with a different port — it will warn "Port X became unavailable while Docker was starting" and try up to 5 times before giving up. If it still can't start:

1. Check what's using the port: `lsof -i :8001` (macOS/Linux) or `netstat -ano | findstr :8001` (Windows)
2. Stop conflicting service or reconfigure AutoMem to use different port
3. Update `AUTOMEM_API_URL` accordingly

## Next Steps

After completing installation:

1. **Configure environment variables** — See [Configuration Tools](/docs/cli/config-tools/) for advanced options like custom endpoints and authentication
2. **Set up platform integration** — See [Platform Installers](/docs/cli/platform-installers/) for Claude Desktop, Cursor, Claude Code, etc.
3. **Store your first memory** — Use the `store_memory` MCP tool in your AI platform of choice

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
| **Hosted Cloud** *(default)* | You want one remote server for agents on multiple machines | InstaPods asks you to paste the URL and token. Guided Railway reads them after deployment. |
| **Local Docker** | You want to operate the server on your own machine | Clones AutoMem into `~/.automem/server`, generates local tokens, runs `docker compose up`, and waits for `/health` |
| **Existing Endpoint** | You already run AutoMem somewhere | Paste the URL (and key); the installer verifies it before touching any agent config |

### Hosted Cloud → pick a provider

Choosing **Hosted Cloud** asks how to stand it up:

```text
?  How should we stand up your hosted AutoMem?
❯  InstaPods                      open the setup page — it deploys AutoMem and emails your URL + key
   Railway (guided)              sign in with the railway CLI, deploy from the terminal, then auto-capture keys
   Other — I already have a URL + key   already deployed somewhere; just paste your endpoint + token
```

- **InstaPods** — opens the [InstaPods setup page](https://instapods.com/apps/automem/?ref=jack) so you can deploy the pod, then asks you to paste the API URL and key you receive.
- **Railway (guided)** — signs in via the `railway` CLI and deploys the AutoMem template straight from the terminal, then reads the endpoint and token. It falls back to a browser deploy if the CLI can't finish.
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
  ◯ Grok         not detected, still installable
```

Detection looks for `~/.codex`, `~/.claude`, `~/.cursor`, `~/.openclaw`, `~/.hermes` (override with `$HERMES_HOME`), and `~/.grok` (override with `$GROK_HOME`). Anything not detected is still installable — just check it.

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
| `--clients` | `AUTOMEM_CLIENTS` | Comma-separated agents: `codex,claude-code,cursor,openclaw,hermes,grok` |
| `--endpoint` | `AUTOMEM_API_URL` | AutoMem HTTP API endpoint |
| `--api-key` | `AUTOMEM_API_KEY` | Bearer token for authenticated deployments |
| `--local-dir` | `AUTOMEM_LOCAL_DIR` | Local backend checkout path (default `~/.automem/server`) |
| `--claude-code-mode` | `AUTOMEM_CLAUDE_CODE_MODE` | `plugin` (default) or `settings` |
| `--cursor-mode` | `AUTOMEM_CURSOR_MODE` | `plugin` (default) or `files` |
| `--hermes-mode` | `AUTOMEM_HERMES_MODE` | `mcp` (default), `provider`, or `both` |
| `--yes` / `-y` | `AUTOMEM_YES=1` | Apply the reviewed plan without prompting |
| `--dry-run` | `AUTOMEM_DRY_RUN=1` | Print the plan, write nothing |
| `--no-agent-install` | `AUTOMEM_NO_AGENT_INSTALL=1` | Set up the endpoint only; skip agents |
| `--no-welcome` | `AUTOMEM_NO_WELCOME=1` | Skip the optional welcome conversation after install |

:::note[Headless and CI]
`CI`, `CODEX`, and `CLAUDE_CODE` suppress animation only; they do not approve the plan. Without a TTY, the installer prints the plan and stops unless you explicitly pass `--yes` or set `AUTOMEM_YES=1`, so an unattended pipe can never make unreviewed changes.
:::

---

## Manual & advanced setup

Prefer to run the backend yourself, or wire an agent by hand? Everything the installer automates, you can also do manually.

### Deploy the AutoMem server yourself

- [InstaPods](/docs/deployment/instapods/) creates a hosted pod and generates MCP configuration.
- [Railway](/docs/deployment/railway/) runs the AutoMem template and provides a public HTTPS domain.
- [Docker Compose](/docs/getting-started/docker/#starting-the-stack) starts the API, FalkorDB, and Qdrant on your machine. The same guide covers bare Python for API development.

:::caution[Railway: pin `PORT=8001`]
AutoMem defaults to port `8001`. A platform-set non-`8001` `PORT` can conflict with callers still using `:8001`, so pin `PORT=8001` on `memory-service`. The [Railway template](/docs/deployment/railway/) sets this for you.
:::

### Connect an agent by hand

The guided installer can connect to a server you deployed manually. On npm 0.16.0, use `install`. `setup` becomes an alias of `install` in the release after 0.16.0:

```bash
npx @verygoodplugins/mcp-automem install --target existing
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
curl -H "X-API-Key: YOUR_TOKEN" http://localhost:8001/health

# 3. Query parameter (discouraged — tokens land in logs)
curl "http://localhost:8001/health?api_key=YOUR_TOKEN"
```

These examples show the header and query forms only. `/health` accepts any token or none, so a `200` from it does not mean the token is valid. To check a token, send it to an endpoint that requires one, such as `/recall?limit=1` (see [Verify it worked](#verify-it-worked)).

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
| Local server won't start | Port in use (`:8001`, `:6379`, `:6333`) | The installer retries automatically on port collisions during Docker startup (0.19.2+). If it fails after retries, stop the conflicting container (`docker ps`) or free the port, then re-run |
| `503 Service Unavailable` | FalkorDB unreachable | Check `FALKORDB_HOST` / `FALKORDB_PORT` |
| `"qdrant": "disconnected"` | Qdrant not configured | Expected — set `QDRANT_URL` to enable vector search |
| `401 Unauthorized` | Wrong/missing token | Verify `AUTOMEM_API_KEY`; provide it without a `Bearer` prefix |
| `ECONNREFUSED` on Railway | A platform set a non-`8001` `PORT` while callers use `:8001` | Pin `PORT=8001` on `memory-service` |
| Tools don't appear in your agent | Client not reloaded | Fully quit and reopen the agent (don't just close the window) |
| One agent flagged "needs a manual step" | That agent's CLI was missing | Run the printed fix command; the rest of the install still succeeded |

---

## Next steps

- **Connect more platforms** — [Platform Guides](/docs/platforms/claude-desktop/) for Claude Desktop, Claude Code, Cursor, Codex, and remote MCP.
- **Configuration reference** — [Environment Variables](/docs/getting-started/environment-variables/) and [Configuration](/docs/reference/configuration/) for every setting and embedding provider.
- **Use memory well** — [Memory Operations](/docs/reference/api/memory-operations/) for tagging, importance, recall, and relationships.
- **Production hardening** — [Railway](/docs/deployment/railway/) and [Docker](/docs/getting-started/docker/) for monitoring, backups, and scaling.


## Verify it worked

Once the installer finishes, confirm the backend is healthy:

```bash
# Local Docker
curl http://localhost:8001/health

# Hosted / existing endpoint
curl https://your-automem-url/health
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
| `qdrant` | Vector store connection: `"connected"` or `"disconnected"` |
| `memory_count` | Total memories in the graph |
| `enrichment.status` | Background worker state: `"running"` or `"stopped"` |
| `graph` | FalkorDB graph name (default `memories`) |

`/health` skips the API token check, so a healthy response does not prove that your key is accepted. For a hosted endpoint, confirm the key with a request to an endpoint that checks it. A `401 Unauthorized` response means the key was rejected:

```bash
curl -i "https://your-automem-url/recall?limit=1" \
  -H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"
```

:::note
`"qdrant": "disconnected"` is **expected** if you haven't configured Qdrant. AutoMem degrades gracefully to graph-only mode — everything else keeps working. Set `QDRANT_URL` and restart to enable vector search.
:::
