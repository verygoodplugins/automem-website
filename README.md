# AutoMem.AI Website

Marketing site, blog, and product documentation for [AutoMem](https://automem.ai) — an intelligent memory service for AI agents.

**Live**: https://automem.ai

## Tech Stack

- **Framework**: Astro 6.1 with React 19 islands
- **Styling**: Tailwind CSS v4 (Vite plugin, not PostCSS)
- **Docs**: Starlight at `/docs/*`
- **Content**: Custom blog collection (`src/content/blog/NN-slug/index.md`) + Starlight docs + EmDash CMS
- **Hosting**: Cloudflare Pages with Pages Functions, D1 databases, and KV

## Architecture

Three runtimes share this project:

- **Astro SSR pages** render the marketing site, blog, and Starlight docs.
- **Cloudflare Pages Functions** in `functions/` (plain `.js`) handle the waitlist signup, double-opt-in confirm, unsubscribe, and admin broadcast endpoints. They are dispatched through `src/middleware.ts`.
- **EmDash CMS** is mounted at `/_emdash/*` for editorial workflows, backed by its own D1 database and KV-stored sessions.

`npm run dev` swaps the Cloudflare adapter out and uses libsql + filesystem sessions locally (workerd cannot load Node DB drivers in dev). `npm run build` swaps the adapter back in and uses D1 + KV.

## Development

```bash
npm install

npm run dev          # Astro dev server on http://localhost:5000 (host 0.0.0.0)
npm run build        # Production build via scripts/build-pages.mjs
npm run preview      # Preview production build
npm run check-links  # Linkinator broken-link check (run AFTER npm run build)
```

> Always use `npm run build`, never `astro build` directly — the build pipeline does extra work (see below).

## Build Pipeline

`npm run build` runs `scripts/build-pages.mjs`, which:

1. Temporarily strips `pages_build_output_dir` from `wrangler.toml` (Astro's adapter rejects the build if it's present).
2. Runs `astro build`.
3. Runs `scripts/bundle-worker.mjs` (esbuild) to bundle the Pages worker.
4. Restores the original `wrangler.toml` in a `finally` block.

The `src/live.config.ts` and `src/live.config.emdash.ts` files are kept side-by-side so EmDash can read whichever one is appropriate per environment — they're not swapped during the build.

## Project Structure

```
automem-website/
├── src/
│   ├── components/         # Astro + React components (mascot, hero, EmailSignup, SEO schemas)
│   ├── content/
│   │   ├── blog/           # Blog posts: NN-slug/index.md
│   │   └── docs/           # Starlight documentation
│   ├── content.config.ts   # Content collection definitions (blog + docs)
│   ├── layouts/            # Layout.astro (single base layout)
│   ├── lib/                # Shared utilities (blog helpers, emdash email plugin)
│   ├── live.config.ts      # EmDash live preview config (dev)
│   ├── live.config.emdash.ts # EmDash live preview config (prod, swapped in at build)
│   ├── middleware.ts       # Workers env bootstrap, API/admin route dispatch
│   ├── pages/              # Routes (.astro / .mdx)
│   └── styles/             # global.css (Tailwind v4 @theme + CSS vars), starlight-custom.css
├── functions/              # Cloudflare Pages Functions (plain .js)
│   ├── api/signup.js       # Waitlist signup (Turnstile + D1 + optional double opt-in)
│   ├── confirm.js          # HMAC-token email confirmation
│   ├── unsubscribe.js      # HMAC-token unsubscribe
│   ├── admin/              # Bearer-token-protected admin endpoints
│   └── lib/                # tokens.js (HMAC), email.js, campaigns.js
├── scripts/
│   ├── build-pages.mjs     # Build orchestrator (use via npm run build)
│   ├── bundle-worker.mjs   # esbuild worker bundling
│   ├── check-links.js      # Linkinator wrapper
│   └── file-doc-map.json   # Source-to-doc mapping for /update-docs workflow
├── schema/                 # D1 schemas (waitlist, etc.)
├── public/                 # Static assets
├── patches/                # patch-package patches
├── astro.config.mjs
└── wrangler.toml           # Cloudflare bindings (D1, KV) for prod and preview
```

## Cloudflare Setup

The waitlist needs a D1 database; EmDash needs a second D1 database and a KV namespace.

```bash
# Create the waitlist D1
npx wrangler d1 create automem-waitlist
npx wrangler d1 execute automem-waitlist --file=./schema/d1-schema.sql

# Create the EmDash D1
npx wrangler d1 create automem-emdash

# Create the sessions KV
npx wrangler kv namespace create SESSION
```

Update `wrangler.toml` with your own database and namespace IDs. The IDs in this repo point at the `verygoodplugins/automem-website` deployment and are not credentials — they're resource pointers and won't grant access without the matching Cloudflare account.

See [WAITLIST_SETUP.md](./WAITLIST_SETUP.md) for the full waitlist setup, including double-opt-in and Resend wiring.

## Environment Variables

Public vars are declared in `wrangler.toml` (`PUBLIC_API_URL`, `PUBLIC_GITHUB_URL`, `PUBLIC_TURNSTILE_SITE_KEY`).

Secrets are **never** committed — set them in the Cloudflare Pages dashboard under Settings → Environment variables → Encrypted, or via `wrangler pages secret put`. The endpoints expect:

| Variable | Used by | Notes |
|---|---|---|
| `ADMIN_TOKEN` | `functions/admin/*` | Long random string; bearer auth for admin endpoints |
| `RESEND_API_KEY` | signup, confirm, broadcast, admin preview, EmDash email | Resend API key |
| `TURNSTILE_SECRET_KEY` | `functions/api/signup.js` | Cloudflare Turnstile server secret |
| `CONFIRM_SECRET` | confirm, unsubscribe | HMAC signing secret (falls back to `ADMIN_TOKEN`) |
| `FROM_EMAIL`, `FROM_NAME`, `BASE_URL` | email senders | Defaults exist; override per environment |
| `DOUBLE_OPT_IN`, `SEND_WELCOME_EMAIL` | signup | Feature flags |

For local dev, mirror these in `.dev.vars` (gitignored).

Preview isolation note: `wrangler.toml` currently uses a separate preview
`EMDASH_DB`, but preview still shares the waitlist `D1` database and `SESSION`
KV namespace with production. Before enabling write-capable PR previews for
signup/admin/session flows, create preview-specific waitlist D1 and session KV
resources and bind those under `[env.preview]`.

## Deployment

Deployed to Cloudflare Pages. The repo-owned production deploy path is
`.github/workflows/deploy.yml`, which builds with `npm run build` and uploads
`dist/client` via `wrangler pages deploy --project-name automem-website --branch
main`. If Cloudflare's connected Git integration is enabled in the dashboard,
keep one deploy path canonical and disable or document the other to avoid double
deploys.

To deploy manually:

```bash
npm run build
npx wrangler pages deploy dist/client --project-name=automem-website
```

## Related Repositories

This site documents three sibling projects:

- [verygoodplugins/automem](https://github.com/verygoodplugins/automem) — Python/Flask core memory service
- [verygoodplugins/mcp-automem](https://github.com/verygoodplugins/mcp-automem) — TypeScript MCP client and CLI
- [verygoodplugins/automem-graph-viewer](https://github.com/verygoodplugins/automem-graph-viewer) — React/Vite 3D graph visualizer

Documentation source-to-doc mapping lives in `scripts/file-doc-map.json`. See [`AGENTS.md`](./AGENTS.md) for the full doc update workflow.

## Conventions

- Conventional Commits (`feat(scope):`, `fix(scope):`, `docs:`, `chore:`, `refactor:`).
- TypeScript strict mode (`extends astro/tsconfigs/strict`); ESM throughout.
- Versioning is managed by Release Please — don't bump `package.json` by hand.
- Don't switch Tailwind to PostCSS; the project uses `@tailwindcss/vite`.
- Don't commit `.env`, `.dev.vars`, `data/`, `uploads/`, or `.wrangler/`.

See [`AGENTS.md`](./AGENTS.md) for the full contributor guide.

## Security

To report a security issue, please use GitHub Security Advisories on this repository (Security → Report a vulnerability). See [`SECURITY.md`](./SECURITY.md) for scope and disclosure policy.

## License

[MIT](./LICENSE)
