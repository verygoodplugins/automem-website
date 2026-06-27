---
title: InstaPods Deployment
description: Deploy AutoMem on InstaPods with a hosted pod and generated MCP config.
sidebar:
  order: 1
---

InstaPods is the fastest hosted deployment path for AutoMem. Use it when you want a public HTTPS AutoMem endpoint, SSH access, custom domains, and generated MCP configuration without wiring the infrastructure yourself.

<a href="https://instapods.com/apps/automem/?ref=jack" target="_blank" rel="noopener noreferrer" class="btn-lab-accent shadow-hard not-content" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; color: #1a1a1a;">
  Deploy AutoMem on InstaPods
</a>

:::tip[Prefer the guided installer?]
`curl -fsSL get.automem.ai | sh` can drive this InstaPods flow and wire your agents in one pass — see [Guided Cloud Setup](/docs/cli/guided-cloud-setup/).
:::

## When to Use InstaPods

Choose InstaPods when you want:

- Hosted AutoMem up in about 30 seconds
- A flat $15/mo AutoMem plan
- HTTPS included by default
- SSH access to the pod
- Custom domains
- Generated MCP config after deployment

If you need full infrastructure control, use [Railway](/docs/deployment/railway/) or [Docker](/docs/deployment/docker/) instead.

## Deployment Flow

1. Open the [AutoMem app on InstaPods](https://instapods.com/apps/automem/?ref=jack).
2. Choose the Grow plan for the flat $15/mo AutoMem setup.
3. Deploy the pod and wait for the AutoMem service to come online.
4. Copy the generated MCP configuration after deploy.
5. Paste the config into your MCP-compatible client, such as Claude Desktop, Claude Code, Cursor, Codex, or GitHub Copilot.

## What InstaPods Provides

| Capability | InstaPods |
|---|---|
| Setup time | About 30 seconds |
| Pricing | $15/mo flat AutoMem plan |
| HTTPS | Included |
| SSH | Included |
| Custom domains | Supported |
| MCP config | Generated after deploy |

## Client Configuration

After deployment, InstaPods gives you the pieces the MCP client needs:

- `AUTOMEM_API_URL` - the public HTTPS URL for your AutoMem service
- `AUTOMEM_API_KEY` - the token used by MCP clients to authenticate
- MCP client config - generated for copy/paste into supported tools

For manual configuration, run the setup wizard and use the InstaPods endpoint and token when prompted:

```bash
npx @verygoodplugins/mcp-automem setup
```

For platform-specific config locations, see [Setup & Installation](/docs/cli/setup/) and the individual [Platform Guides](/docs/platforms/claude-desktop/).

## Verification

Check the health endpoint from your local machine:

```bash
curl https://your-instapods-automem-url/health \
  -H "Authorization: Bearer YOUR_AUTOMEM_API_TOKEN"
```

A healthy deployment returns `status: "healthy"` and confirms FalkorDB connectivity.

## Next Steps

- Connect Claude Desktop or another local MCP client - see [Platform Guides](/docs/platforms/claude-desktop/)
- Review token configuration - see [Authentication](/docs/reference/authentication/)
- Configure backup and recovery expectations - see [Backup & Recovery](/docs/operations/backup/)
