# auth.md

AutoMem's public website at `https://automem.ai` is a marketing and documentation
site. It does not issue OAuth credentials, register agents, or expose a hosted
AutoMem API from this domain.

Agents should use the API base URL and credentials for the user's own AutoMem
deployment. Self-hosted AutoMem deployments use bearer-token authentication as
documented in the authentication reference.

## Agent Audience

This file is for coding agents, browser agents, and MCP-capable assistants that
need to understand how to authenticate with AutoMem deployments.

## Authentication Model

- Website origin: `https://automem.ai`
- Website role: documentation and discovery
- Hosted agent registration on this origin: not provided
- Production API on this origin: not provided
- Self-hosted API authentication: bearer token
- Relevant docs: https://automem.ai/docs/reference/authentication/

## Credential Use

For self-hosted AutoMem, configure clients with the deployment-specific API URL
and token. Do not send credentials to `https://automem.ai` unless a future
document explicitly states that this domain is acting as the API resource server.

## Related Resources

- Quick start: https://automem.ai/docs/getting-started/quick-start/
- API reference: https://automem.ai/docs/reference/api/direct-vs-mcp/
- MCP client setup: https://automem.ai/docs/cli/setup/
