---
name: install-automem
description: Install AutoMem locally, on Railway or InstaPods, or against an existing endpoint, then wire MCP clients.
license: MIT
tags: [automem, install, mcp, memory]
---

# Install AutoMem

Use this skill when a user wants AutoMem installed or connected to an agent,
editor, or MCP-compatible client.

## Safety Rules

- Show what it will do before running any command.
- Ask for approval before executing the installer, editing config files, or
  provisioning cloud resources.
- Do not print secrets, API keys, bearer tokens, database URLs, or `.env` file
  contents in chat.
- Treat `https://automem.ai` as the marketing and documentation origin. Live API
  calls must use the user's deployment-specific AutoMem URL and credentials.

## Primary Installer

```sh
curl -fsSL get.automem.ai | sh
```

## Setup Flow

1. Inspect the user's environment for Node.js, npm, Git, Docker, existing
   AutoMem config, and editor/agent config roots.
2. Ask which target to use if it is not already clear:
   - Local Docker with Qdrant and the local database.
   - Railway.
   - InstaPods.
   - Existing AutoMem endpoint.
3. Stage the installer command with the right environment variables, then show
   the resulting plan and files that may be written.
4. After approval, run the installer, verify `/health`, verify authenticated
   recall when credentials are available, and wire MCP into the selected clients.

## Useful Flags

- `AUTOMEM_INSTALL_TARGET=local`
- `AUTOMEM_INSTALL_TARGET=cloud`
- `AUTOMEM_INSTALL_TARGET=existing`
- `AUTOMEM_CLIENTS=codex,claude-code,cursor,openclaw,hermes`
- `AUTOMEM_API_URL=https://memory.example`
- `AUTOMEM_DRY_RUN=1`
- `AUTOMEM_NO_AGENT_INSTALL=1`

## References

- Installer page: https://automem.ai/install
- Quick start: https://automem.ai/docs/getting-started/quick-start/
- Docker setup: https://automem.ai/docs/getting-started/docker/
- CLI setup: https://automem.ai/docs/cli/setup/
- Authentication: https://automem.ai/docs/reference/authentication/
- Direct API vs MCP: https://automem.ai/docs/reference/api/direct-vs-mcp/
