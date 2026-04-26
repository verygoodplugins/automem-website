# Security Policy

## Reporting a Vulnerability

Please report security issues privately via **GitHub Security Advisories**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Fill in a description and reproduction steps.

We aim to acknowledge reports within 5 business days. Please do not open a public issue for security problems.

## Scope

This policy covers the marketing and documentation site at https://automem.ai and the code in this repository — Astro pages, Cloudflare Pages Functions in `functions/`, and the EmDash CMS integration.

The following sibling projects are out of scope here; please report issues in their respective repositories:

- [verygoodplugins/automem](https://github.com/verygoodplugins/automem) — core memory service
- [verygoodplugins/mcp-automem](https://github.com/verygoodplugins/mcp-automem) — MCP client and CLI
- [verygoodplugins/automem-graph-viewer](https://github.com/verygoodplugins/automem-graph-viewer) — graph visualizer

## Supported Versions

Only the `main` branch is supported. Fixes ship as new commits to `main` and are deployed to production via Cloudflare Pages.

## Notes for Self-Hosters

If you fork this repository to deploy your own instance:

- **Create your own Cloudflare resources.** The D1 database IDs and KV namespace ID committed in `wrangler.toml` point at the AutoMem deployment. They are resource pointers, not credentials, but you'll need to create your own bindings (`wrangler d1 create`, `wrangler kv namespace create`) and replace the IDs.
- **Set the following secrets in Cloudflare Pages** (Settings → Environment variables → Encrypted, or `wrangler pages secret put`). Use long random values (32+ bytes):
  - `ADMIN_TOKEN` — bearer token for `/admin/*` endpoints
  - `CONFIRM_SECRET` — HMAC signing key for confirm/unsubscribe links (falls back to `ADMIN_TOKEN` if unset)
  - `RESEND_API_KEY` — required if you use email confirm/broadcast
  - `TURNSTILE_SECRET_KEY` — required for waitlist signup spam protection
- **Never commit `.dev.vars` or `.env*`.** They are gitignored; keep them that way.
- **Rotate `ADMIN_TOKEN` periodically** and any time someone with access leaves the project.

## Known Design Notes

- Admin endpoints (`functions/admin/*.js`) authenticate via `Authorization: Bearer <ADMIN_TOKEN>`. Token comparison is direct equality; this is acceptable for a low-rate admin endpoint behind Cloudflare's edge but is not constant-time.
- Confirm and unsubscribe links use HMAC-SHA256 tokens with a TTL (`functions/lib/tokens.js`).
- The dev server (`npm run dev`) does not load the Cloudflare adapter and uses filesystem sessions; production uses KV-backed sessions.
