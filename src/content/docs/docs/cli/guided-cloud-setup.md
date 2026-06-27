---
title: Guided Cloud Setup
description: Stand up a hosted AutoMem backend from the terminal — InstaPods or Railway — with automatic endpoint and token capture.
sidebar:
  order: 3
---

The [guided installer](/docs/getting-started/quick-start/) can provision a hosted AutoMem backend for you and capture its endpoint and API key automatically — no dashboards, no copy-pasting tokens between terminals. This page covers that **Hosted Cloud** path in depth: how each provider flow works, what the installer captures, and how to script it.

Reach it by running the installer and choosing **Hosted Cloud** at the first prompt:

```bash
curl -fsSL get.automem.ai | sh
# or, if Node 20.19+ is already installed:
npx @verygoodplugins/mcp-automem install
```

```text
?  Where should AutoMem run?
❯  Hosted Cloud      InstaPods or Railway — guided deploy
   Local Docker      Clone AutoMem and start Docker Compose on this machine
   Existing Endpoint Use an AutoMem URL you already have
```

Choose **Hosted Cloud** for always-on memory that follows you across devices and machines. For an on-machine stack instead, see [Quick Start → Local Docker](/docs/getting-started/quick-start/) and [Docker & Local Dev](/docs/getting-started/docker/).

---

## Pick a provider

After choosing Hosted Cloud, the installer asks how to stand it up:

```text
?  How should we stand up your hosted AutoMem?
❯  InstaPods                      open the setup page — it deploys AutoMem and emails your URL + key
   Railway (guided)              sign in with the railway CLI, deploy from the terminal, then auto-capture keys
   Other — I already have a URL + key   already deployed somewhere; just paste your endpoint + token
```

![The AutoMem installer asking how to stand up hosted AutoMem, with InstaPods, Railway (guided), and an existing-URL option](/img/docs/installer-cloud-provider.png)

| Provider | How it deploys | Billing | Best for |
|---|---|---|---|
| **InstaPods** | Opens the setup page; it deploys AutoMem and emails your endpoint + key | $15/mo flat ([details](/docs/deployment/instapods/)) | Fastest hosted path, HTTPS + custom domains, zero infra |
| **Railway (guided)** | Signs in with the `railway` CLI and deploys the template from the terminal | Usage-based ([details](/docs/deployment/railway/)) | Terminal-native deploys, fine-grained control |
| **Other** | You paste an endpoint + token you already have | — | An AutoMem instance you already run |

### InstaPods

1. The installer opens the [InstaPods AutoMem setup page](/docs/deployment/instapods/). Choose the **Grow** plan ($15/mo flat) and complete checkout.
2. InstaPods deploys AutoMem and **emails your API URL + key**.
3. Paste them back at the prompt:

```text
?  AutoMem API URL  ›  https://your-automem.instapods.app
?  AutoMem API key (leave blank if this endpoint does not require one)  ›  ••••••••
```

The installer verifies the endpoint's `/health` before touching any agent config.

### Railway (guided)

1. The installer signs you in through the `railway` CLI (it installs/uses the CLI and opens a browser to authenticate).
2. It deploys the AutoMem template straight from the terminal, then **auto-captures the endpoint and token** once the service is healthy.
3. If the CLI can't finish in your environment, it **falls back to a browser deploy** and then asks you to paste the URL + key, exactly like the InstaPods flow.

:::caution[Railway requires `PORT=8001`]
The AutoMem service must run on port 8001. The [Railway template](/docs/deployment/railway/) sets `PORT=8001` for you — without it Flask defaults to 5000 and other services can't connect (`ECONNREFUSED`).
:::

### Reuse vs. fresh deploy

If your provider account already has AutoMem deployments, the installer lists them and lets you **reuse an existing one** (it fetches that deployment's credentials) instead of paying for a new deploy. An empty account goes straight to a fresh deploy. Any **billable** deploy is gated behind an explicit confirmation that names the plan.

---

## What the installer captures

Once the backend is healthy, the installer:

1. **Captures the endpoint + token** from the provider (or from what you pasted).
2. **Writes them to a `.env`** in the current directory (`AUTOMEM_API_URL`, plus `AUTOMEM_API_KEY` if the endpoint needs one).
3. **Wires your agents** — review the plan, approve, and it registers the MCP server for each selected agent, backing up every file it changes with a `.bak`.

Nothing is written until you approve the plan, so a cloud run is as safe to preview as a local one.

---

## Customize and script it

Every prompt has a flag and an environment variable, so you can pre-answer the cloud questions or run the whole thing unattended.

```bash
# Deploy to a hosted provider, fully interactive
curl -fsSL get.automem.ai | AUTOMEM_INSTALL_TARGET=cloud sh

# Pick the provider up front
curl -fsSL get.automem.ai | \
  AUTOMEM_INSTALL_TARGET=cloud \
  AUTOMEM_CLOUD_PROVIDER=instapods sh

# I already deployed — capture an endpoint without provisioning
curl -fsSL get.automem.ai | \
  AUTOMEM_INSTALL_TARGET=existing \
  AUTOMEM_API_URL=https://memory.example \
  AUTOMEM_API_KEY=sk-... \
  AUTOMEM_YES=1 sh

# Preview the whole plan, write nothing
curl -fsSL get.automem.ai | AUTOMEM_DRY_RUN=1 sh
```

The same flags work on the npm package, e.g. `npx @verygoodplugins/mcp-automem install --target cloud --cloud-provider railway`.

| Flag | Environment variable | Purpose |
|---|---|---|
| `--target` | `AUTOMEM_INSTALL_TARGET` | `cloud`, `local`, or `existing` |
| `--cloud-provider` | `AUTOMEM_CLOUD_PROVIDER` | `instapods`, `railway`, or `other` |
| `--endpoint` | `AUTOMEM_API_URL` | AutoMem HTTP API endpoint (for `existing`/`other`) |
| `--api-key` | `AUTOMEM_API_KEY` | Bearer token for authenticated endpoints |
| `--clients` | `AUTOMEM_CLIENTS` | Agents to wire after deploy: `codex,claude-code,cursor,openclaw,hermes` |
| `--no-agent-install` | `AUTOMEM_NO_AGENT_INSTALL=1` | Provision the endpoint only; skip agents |
| `--yes` / `-y` | `AUTOMEM_YES=1` | Apply the reviewed plan without prompting |
| `--dry-run` | `AUTOMEM_DRY_RUN=1` | Print the plan, write nothing |

:::note[Headless and CI]
When `CI`, `CODEX`, `CLAUDE_CODE`, or `GITHUB_ACTIONS` is set, the installer assumes `--yes`. Without a TTY and without `--yes`, it prints the plan and stops — an unattended pipe can never make unreviewed changes, and a cloud deploy is never triggered without confirmation. For CI, pre-deploy with `--target existing` and pass an endpoint + key rather than provisioning inside the pipeline.
:::

---

## Verify

Confirm the hosted backend is healthy:

```bash
curl https://your-automem-url/health \
  -H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"
```

```json
{
  "status": "healthy",
  "falkordb": "connected",
  "qdrant": "connected",
  "memory_count": 0,
  "enrichment": { "status": "running", "queue_depth": 0 }
}
```

`"qdrant": "unavailable"` is expected if you haven't configured Qdrant — AutoMem degrades to graph-only mode. See [Quick Start → Verify it worked](/docs/getting-started/quick-start/) for the full field reference and a first end-to-end memory test.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Railway CLI sign-in stalls | No browser / restricted shell | The installer falls back to a browser deploy; finish there and paste the URL + key |
| `ECONNREFUSED` after a Railway deploy | `PORT` not set | Set `PORT=8001` on `memory-service` ([Railway guide](/docs/deployment/railway/)) |
| `401 Unauthorized` on `/health` | Wrong/missing token | Re-check the key the provider issued; provide it without a `Bearer` prefix |
| Installer can't find your new deploy | Credentials not ready yet | Re-run the installer and choose **reuse an existing deployment**, or use **Other** and paste the URL + key |
| Charged for a second deploy | Picked "deploy fresh" with one already live | Re-run and choose the existing deployment to reuse its credentials |

---

## Next steps

- **Connect more agents** — [Platform Installers](/docs/cli/platform-installers/) and the [Platform Guides](/docs/platforms/claude-desktop/).
- **Deep deployment docs** — [InstaPods](/docs/deployment/instapods/) and [Railway](/docs/deployment/railway/).
- **Production hardening** — [Backup & Recovery](/docs/operations/backup/) and [Health Monitoring](/docs/operations/health/).
