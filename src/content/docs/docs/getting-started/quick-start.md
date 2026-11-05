---
title: Your first memory
description: Set up AutoMem, connect an agent, and bring your first memory back in a fresh chat.
sidebar:
  order: 1
---

<div class="first-memory-guide">

<header class="first-memory-route">
  <p class="first-memory-label">QUICK START <span aria-hidden="true">/</span> 4 CHECKPOINTS</p>
  <p class="first-memory-lead">Save one detail today. Bring it back in a fresh chat.</p>
  <p>AutoMem is the memory service. An agent plugin or MCP client connects your agent to that service. Start with one agent and one small test memory.</p>
  <ol aria-label="Setup checkpoints">
    <li><a href="#choose-a-server"><span aria-hidden="true">01</span> Server</a></li>
    <li><a href="#choose-embeddings"><span aria-hidden="true">02</span> Embeddings</a></li>
    <li><a href="#connect-an-agent"><span aria-hidden="true">03</span> Agent</a></li>
    <li><a href="#verify-it-worked"><span aria-hidden="true">04</span> First recall</a></li>
  </ol>
  <a class="first-memory-shortcut" href="#existing-endpoint">Already have a URL and key? Connect it directly <span aria-hidden="true">↗</span></a>
</header>

<section class="first-memory-step" data-step="01">

## Choose a server

This is where your memory records live. Use **Local Docker** if the service should run on this machine, **Hosted Cloud** if agents need an endpoint you can reach from other machines, or **Existing Endpoint** if a server is already running.

| In the installer | What to have ready |
|---|---|
| **Local Docker** | A running Docker engine, Docker Compose, and Git. The installer starts the stack in `~/.automem/server` and generates local tokens. |
| **Hosted Cloud** | [InstaPods](https://instapods.com/apps/automem/?ref=jack) supplies a URL and key to paste into the installer. **Railway (guided)** creates a fresh deployment and reads its URL and key. See [Guided Cloud Setup](/docs/cli/guided-cloud-setup/). |
| **Existing Endpoint** | The base URL, plus the API key if required. Use this for an existing Railway service or any other working deployment. |

**Checkpoint** — You know where the service will run, or you already have its base URL.

**If you're stuck** — If Docker is unavailable, choose a hosted service. If guided cloud deployment stalls, use the provider's [manual deployment instructions](/docs/deployment/railway/) and reconnect using **Existing Endpoint** once the service responds.

</section>

<section class="first-memory-step" data-step="02">

## Choose embeddings

Embeddings let AutoMem find related memories even when your query uses different words. The **server location** and **embedding location** are separate choices. A Docker server can use a hosted embedding API, and a hosted AutoMem server can run FastEmbed on its own machine.

- **On your infrastructure.** FastEmbed runs inside the AutoMem process and uses that machine's compute and model storage. Ollama runs as a separate service that AutoMem can reach. Neither charges an embedding API fee when you run it yourself.
- **Via a hosted API.** Voyage or OpenAI runs the embedding model and receives the memory and query text used for embeddings. API charges depend on the provider and usage.

In `EMBEDDING_PROVIDER=auto`, initialization tries **Voyage → OpenAI → configured Ollama → FastEmbed → placeholder**. With no earlier provider selected, a fresh default 1024-dimension setup uses FastEmbed's `BAAI/bge-large-en-v1.5` if it loads. The placeholder fallback uses hashes and cannot supply semantic similarity.

**Checkpoint** — Confirm the provider in the server startup logs before your first write. To pin a provider or model, use the [embedding settings](/docs/architecture/embeddings/) and [server environment variables](/docs/getting-started/environment-variables/). For a manual local setup, set them in the [Compose environment](/docs/getting-started/docker/#environment-variables) before starting the stack. If FastEmbed is downloading its model, let startup finish and check the logs again.

**If you already have data** — Keep the working provider for this test. Changing a provider or model usually requires re-embedding existing memories, even at the same dimension. [See dimension and migration details](/docs/architecture/embeddings/#dimension-validation).

</section>

<section class="first-memory-step" data-step="03">

## Connect an agent

Open a terminal with **Node.js 20.19+, 22.13+, or 24+** and npm. Launch the installer, choose the server option you picked above, then select one agent to connect. Review the install plan and approve it.

```bash title="Terminal · Guided installer"
curl -fsSL get.automem.ai | sh
```

<details>
<summary>Use npm or preview the plan</summary>

```bash title="Terminal · npm"
npx @verygoodplugins/mcp-automem install
```

Add `--dry-run` to preview the plan. Agent configuration files are backed up before the installer changes them. Use the [CLI setup guide](/docs/cli/setup/) for scripting and manual MCP config.

</details>

### Existing endpoint

Skip server provisioning by selecting **Existing Endpoint**, or launch directly into that path. Enter the base URL and the raw key when prompted. The same server can serve several agents.

```bash title="Terminal · Connect a running service"
npx @verygoodplugins/mcp-automem install --target existing
```

**Checkpoint** — The installer verifies the endpoint and reports the selected agent as configured. Fully quit and reopen that agent so it loads the MCP tools.

**If you're stuck** — Run any manual command the installer prints for your agent. If its tools still don't appear after a restart, check its [platform instructions](/docs/platforms/codex/) in the sidebar. Claude Code and Cursor plugins still need the separate AutoMem service.

</section>

<section class="first-memory-step" data-step="04">

## Verify it worked

Check service reachability. Use localhost for the default Docker setup. For a hosted or existing server, substitute its base URL.

```bash title="Terminal · Local reachability"
curl http://localhost:8001/health
```

```bash title="Terminal · Remote reachability"
curl https://your-automem-url/health
```

```json title="Expected · Healthy graph and vector stores"
{
  "status": "healthy",
  "falkordb": "connected",
  "qdrant": "connected"
}
```

The JSON above shows three fields from a healthy response. `/health` skips the API token check, so a healthy response does not prove that your key is accepted. Verify the key with an authenticated read. Substitute your URL and key first.

```bash title="Terminal · Verify the key"
curl -i "https://your-automem-url/recall?limit=1" \
  -H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"
```

**If you're stuck** — A `401 Unauthorized` means the service rejected the key. Check that it matches this endpoint, and give the installer the raw key without `Bearer`. If FalkorDB is disconnected, check the graph service. If Qdrant is disconnected, graph storage can still work, with semantic search unavailable. Check `QDRANT_URL` if you expect vector search.

### Try it end to end

Paste the first prompt into your connected agent. Look for a successful `store_memory` call, then open a **fresh chat** and paste the second prompt.

```text title="Chat 1 · Store"
Use AutoMem to remember that my demo workspace is called Lantern.
```

```text title="Chat 2 · Recall"
Use AutoMem to look up the name of my demo workspace.
```

<div class="first-memory-result">
  <span class="first-memory-result-icon" aria-hidden="true">✓</span>
  <div>
    <p class="first-memory-label">CHECKPOINT / FIRST MEMORY</p>
    <p>You're set when <code>recall_memory</code> returns <strong>Lantern</strong> from AutoMem in the new chat.</p>
  </div>
</div>

**If recall is empty** — Check that both chats use the same endpoint and that the first tool call returned a memory ID. Embeddings run in the background. Retry the query after a moment, or ask AutoMem to retrieve the memory by its ID.

</section>

</div>

## Manual & advanced setup

- **Run the service yourself.** [Docker & Local Dev](/docs/getting-started/docker/), [Railway](/docs/deployment/railway/), and [InstaPods](/docs/deployment/instapods/) cover manual deployment.
- **Print MCP configuration.** Run `npx @verygoodplugins/mcp-automem config` and see [Configuration Tools](/docs/cli/config-tools/) for options. See the [Claude Desktop guide](/docs/platforms/claude-desktop/) for a manual client example.
- **Detect agent roots.** The installer checks `~/.codex`, `~/.claude`, `~/.cursor`, `~/.openclaw`, `~/.hermes` (override with `$HERMES_HOME`), and `~/.grok` (override with `$GROK_HOME`).

:::note[Headless and CI]
`CI`, `CODEX`, and `CLAUDE_CODE` suppress animation only. Without a TTY, the installer prints the plan and stops unless you explicitly pass `--yes` or set `AUTOMEM_YES=1`.
:::

:::caution[Railway port]
AutoMem defaults to port `8001`. A platform-set non-`8001` `PORT` can conflict with callers still using `:8001`, so pin `PORT=8001` on `memory-service`. The [Railway template](/docs/deployment/railway/) sets this for you.
:::

<details>
<summary>Read the remaining health fields</summary>

| Field | Description |
|---|---|
| `status` | Overall health: `"healthy"` or `"degraded"` |
| `falkordb` | Graph store connection: `"connected"` or `"disconnected"` |
| `qdrant` | Vector store connection: `"connected"` or `"disconnected"` |
| `memory_count` | Total memories in the graph |
| `enrichment.status` | Background worker state: `"running"` or `"stopped"` |
| `graph` | FalkorDB graph name (default `memories`) |

See the [Health API](/docs/reference/api/health/) for the complete response.

</details>

## Authentication

AutoMem accepts Bearer authentication, the `X-API-Key` header, or the `api_key` query parameter. Prefer a header because query parameters can appear in logs.

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/health
curl -H "X-API-Key: YOUR_TOKEN" http://localhost:8001/health
```

These examples show the header and query forms only. `/health` accepts any token or none, so a `200` from it does not mean the token is valid. To check a token, send it to an endpoint that requires one, such as `/recall?limit=1` (see [Verify it worked](#verify-it-worked)).

For admin operations, see the [authentication reference](/docs/reference/authentication/).

---

## Next steps

- [What AutoMem stores](/docs/getting-started/introduction/) explains the service, MCP client, and the path from write to recall.
- [Memory Operations](/docs/reference/api/memory-operations/) covers tags, importance, and relationships.
- [Troubleshooting](/docs/operations/troubleshooting/) covers service, credentials, and recall issues.
