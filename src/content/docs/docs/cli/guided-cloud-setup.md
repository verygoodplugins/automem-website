---
title: Guided Cloud Setup
description: Stand up a hosted AutoMem backend from the terminal — InstaPods or Railway — with provider-specific credential setup.
sidebar:
  order: 3
---

The [guided installer](/docs/getting-started/quick-start/) can help you provision a hosted AutoMem backend and then configure your selected agents. This page covers the **Hosted Cloud** path in depth: how each provider flow works, what the installer captures, and how to script the supported options.

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
   Railway (guided)              sign in with the railway CLI and create a fresh deployment
   Other — I already have a URL + key   already deployed somewhere; just paste your endpoint + token
```

![The AutoMem installer asking how to stand up hosted AutoMem, with InstaPods, Railway (guided), and an existing-URL option](/img/docs/installer-cloud-provider.png)

| Provider | How it deploys | Credential flow |
|---|---|---|
| **InstaPods** | Opens the setup page | Paste the endpoint and key you receive |
| **Railway (guided)** | Signs in with the `railway` CLI and creates a fresh AutoMem deployment | The installer reads the endpoint and key after the deployment is available |
| **Other** | Uses an AutoMem instance you already run | Paste its endpoint and key |

### InstaPods

1. The installer opens the [InstaPods AutoMem setup page](/docs/deployment/instapods/). Complete the provider setup there.
2. Return when you have the API URL and key.
3. Paste them at the prompt — the installer does not read InstaPods credentials automatically:

```text
?  AutoMem API URL  ›  https://your-automem.instapods.app
?  AutoMem API key (leave blank if this endpoint does not require one)  ›  ••••••••
```

The installer verifies the endpoint's `/health` before touching any agent config.

### Railway (guided)

1. The installer uses the `railway` CLI and its authenticated session to create a fresh AutoMem deployment.
2. It waits for the deployment's generated domain, reads the AutoMem API token, and verifies the endpoint before it configures agents.
3. If the guided flow cannot complete, provide the endpoint and key manually instead.

### Existing Railway deployments

Railway (guided) does not discover or reuse an existing Railway deployment in this release. If you already run AutoMem on Railway, choose **Other** and paste its endpoint and key; that connects the installer without provisioning another deployment.

---

## What the installer captures

Once it has an endpoint, the installer:

1. **Uses the endpoint + token** it read from guided Railway setup or that you pasted for InstaPods/Other.
2. **Writes them to a `.env`** in the current directory (`AUTOMEM_API_URL`, plus `AUTOMEM_API_KEY` if the endpoint needs one).
3. **Wires your agents** — review the plan, approve, and it registers the MCP server for each selected agent, backing up every file it changes with a `.bak`.

Nothing is written until you approve the plan, so a cloud run is as safe to preview as a local one.

---

## Customize and script it

Use these supported flags and environment variables to pre-answer the installer:

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
Without a TTY, the installer prints the plan and stops unless you explicitly pass `--yes` or set `AUTOMEM_YES=1`. Only `CI`, `CODEX`, and `CLAUDE_CODE` suppress the installer animation. `GITHUB_ACTIONS` is not a separate approval or animation trigger.

For CI, use `--target existing` with an endpoint and key rather than provisioning inside the pipeline.
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

If Qdrant is unavailable, health reports `"qdrant": "disconnected"` and the top-level `"status": "degraded"`. See [Quick Start → Verify it worked](/docs/getting-started/quick-start/) for the full field reference and a first end-to-end memory test.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Railway guided setup does not complete | The CLI flow could not finish in this environment | Choose **Other** and paste the endpoint + key for an existing AutoMem deployment |
| `401 Unauthorized` on `/health` | Wrong/missing token | Re-check the key the provider issued; provide it without a `Bearer` prefix |
| You already run AutoMem on Railway | Railway (guided) creates a fresh deployment in this release | Choose **Other** and paste the existing endpoint + key |

---

## Next steps

- **Connect more agents** — [Platform Installers](/docs/cli/platform-installers/) and the [Platform Guides](/docs/platforms/claude-desktop/).
- **Deep deployment docs** — [InstaPods](/docs/deployment/instapods/) and [Railway](/docs/deployment/railway/).
- **Production hardening** — [Backup & Recovery](/docs/operations/backup/) and [Health Monitoring](/docs/operations/health/).

---

## Release scope

The installer behavior on this page is validated against [mcp-automem 0.16.0](https://github.com/verygoodplugins/mcp-automem/tree/9a0bbf754dd31db524da25638b0e97907e32ff37). The health-response vocabulary is validated against [AutoMem 0.16.2](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/health.py).
