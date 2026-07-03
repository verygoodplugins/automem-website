# Repository Guidelines

## Project Overview

AutoMem.AI marketing and documentation website.

**Stack**: Astro 6.x + Tailwind CSS v4 + Cloudflare Pages + D1 database + Starlight (docs) + EmDash CMS

## Commands

```bash
npm run dev          # Astro dev server (localhost:4321, --host 0.0.0.0)
npm run build        # Production build via scripts/build-pages.mjs (NOT plain astro build)
npm run preview      # Preview production build
npm run check-links  # Broken link checker (requires build first)
npm run cms:seed:validate # Validate seed/seed.json against data/emdash.db
npm run cms:seed:apply    # Apply/update EmDash schema, menus, widgets, settings
npm run cms:migrate-blog  # Import old src/content/blog markdown into EmDash
```

**Local preview & link-checking notes:**
- `npm run dev` runs on port 4321. **Never use port 5000 — it is reserved on this system.** If another process already holds 4321, Astro silently bumps to 4322+. For the Claude Code preview tool, use the `.claude/launch.json` `automem-web` config (`astro dev` on `0.0.0.0:4321`; binding `0.0.0.0` avoids the macOS `localhost`→IPv6 `::1` resolution that breaks readiness checks on a 127.0.0.1-only bind).
- `npm run check-links` boots `wrangler pages dev` against the built `_worker.js`. In restricted/sandboxed environments where wrangler can't serve, it returns 404 for *every* asset (favicon, JS bundles, all routes) — false negatives, not broken links. Verify links with an `npm run dev` crawl instead.
- Blog posts are CMS-first. Runtime routes (`/blog`, `/blog/[slug]`, `/rss.xml`, archives, search) must not use `getCollection('blog')` or read `src/content/blog`; markdown files are migration input only. Use `npm run cms:migrate-blog` after `npm run cms:seed:apply` when importing old markdown posts.

## Architecture & Key Directories

```
src/pages/           — Routes (.astro). Includes /blog/, /docs/, /about, /mascot-lab, etc.
src/content/blog/    — Migration input only for old markdown posts; not an Astro content collection
src/content/docs/    — Starlight documentation (57+ pages)
src/components/      — Astro components (AutoJack mascot, MemoryHero, EmailSignup, SEO schemas/)
src/layouts/         — Layout.astro (single base layout with hex line numbers, footer mascot)
src/styles/          — global.css (Tailwind v4 @theme + CSS vars), starlight-custom.css
src/lib/             — Utility modules (blog helpers, emdash email plugin)
src/middleware.ts    — Cloudflare Workers env import, API route dispatch, emdash preview redirect
src/content.config.ts — Content collection definitions (docs only)
src/live.config.ts   — EmDash CMS configuration
functions/           — Cloudflare Pages Functions (api/signup.js, confirm.js, unsubscribe.js, admin/)
scripts/             — Build tooling (build-pages.mjs, bundle-worker.mjs, check-links.js, file-doc-map.json)
schema/              — D1 database schemas
public/              — Static assets (favicon, OG image)
```

## Build Pipeline

`npm run build` runs `scripts/build-pages.mjs`, which:

1. Temporarily strips `pages_build_output_dir` from wrangler.toml
2. Runs `astro build`
3. Runs `scripts/bundle-worker.mjs` (esbuild worker bundling)
4. Restores wrangler.toml in a `finally` block

**Never run `astro build` directly** — always use `npm run build`.

## Cloudflare Integration

- **D1 databases**: `D1` binding (waitlist), `EMDASH_DB` binding (CMS)
- **KV namespace**: `SESSION` binding (Astro sessions for emdash auth)
- **Environment access**: Use `import('cloudflare:workers')` to get env — do NOT use `locals.runtime.env` (deprecated in Astro v6)
- **Pages Functions**: Plain JS files in `functions/` (not TypeScript, not in `src/`)
- **API routes**: Dispatched through `src/middleware.ts`, which dynamically imports from `functions/`
- **Environments**: `wrangler.toml` has production and preview configs. Preview currently has a separate `EMDASH_DB`, but shares the waitlist `D1` and `SESSION` KV IDs with production; create and bind separate preview resources before enabling write-capable PR previews.

## Theming System

### CSS Variables (`src/styles/global.css`)

Colors use RGB triplet values for alpha compositing. Defined in `:root` (dark, default) and `.light`:

- `--lab-accent`: `249 207 44` (#F9CF2C, refreshed gold; was #F9D857)
- `--lab-secondary`: Violet #AE66FF (was #8B5CF6)
- `--lab-bg` (#060A0E), `--lab-surface`, `--lab-panel` (#0F161E), `--lab-line` (#465260), `--lab-border`, `--lab-text`, `--lab-muted`
- `--lab-success`: Memory Green #34D399
- `--lab-gold`, `--lab-gold-soft`, `--lab-gold-classic`, `--lab-gold-dark`
- `.glass-panel`: frosted semi-transparent card surface (border-lab-line + backdrop blur)

### Tailwind v4

- Uses `@tailwindcss/vite` plugin (NOT PostCSS)
- Theme defined via `@theme` block in `global.css` mapping CSS vars → `--color-lab-*`
- Utilities: `bg-lab-bg`, `text-lab-accent`, `border-lab-border`, etc.
- Font: JetBrains Mono for both `--font-sans` and `--font-mono`
- Hard shadow: `4px 4px 0px 0px` on cards and buttons

### Dark/Light Modes

- Dark mode is the default ("Memory Lab" theme)
- Light mode via `.light` class on `<html>` element (cool white `#F6F8FC`)

## Content Collections (`src/content.config.ts`)

- **docs**: `docsLoader()` from Starlight with `docsSchema()`
- Blog content comes from EmDash CMS `posts`. Do not reintroduce a file-backed `blog` collection or markdown fallback logic.

## Component Patterns

- **AutoJack mascot**: SVG floppy disk character with 6 expression states (confident, wink, happy, sleeping, bliss, focused)
- **Gold gradient**: `#FFE082 → #F9D857 → #DAA520`
- **Buttons**: `.btn-lab` (outline) and `.btn-lab-accent` (gold filled), both with hard shadow hover
- **Grid background**: 24px radial-gradient dot pattern with violet + gold radial glows
- **Body layout**: `max-w-[1440px]` container in `Layout.astro` (the old hex line-number gutter column was removed in the install-first redesign; the `AutoJackPeek` mascot is still wired in as a fixed, scroll-triggered peek)

## Coding Conventions

- TypeScript strict mode (`extends astro/tsconfigs/strict`)
- ESM (`"type": "module"` in package.json)
- Astro components use `.astro` extension
- React islands via `@astrojs/react` for interactive components (TanStack Query + Router available)
- CMS posts/pages: seed schema with `npm run cms:seed:apply`; migrate old markdown with `npm run cms:migrate-blog`
- Starlight docs: organized by section directories matching sidebar config in `astro.config.mjs`
- Cloudflare Pages Functions: plain `.js` files (not TypeScript)

## Commit Style

- PR titles must use Conventional Commit format because squash merges use the PR title as the release commit title. Do not prefix titles with `[codex]`, `[claude]`, `[copilot]`, `[wip]`, or similar labels; put agent/status context in the PR body.
- Conventional commit types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `chore`, `perf`, `revert` with optional scope, such as `feat(scope): desc` or `docs: desc`.
- Public API or documented surface changes should use `feat(api): ...` unless they are strictly bug fixes with no new public surface. Release automation uses `ci(release): ...` or `chore(release): ...`.
- Doc updates: `docs: update [page-names] to reflect [source-repo]@[short-sha]`

## Documentation Update Workflow

The docs cover three sibling repositories:

- **automem** (Python/Flask) — core memory service
- **mcp-automem** (TypeScript) — MCP client and CLI
- **automem-graph-viewer** (React/Vite) — 3D graph visualization

Source-to-doc mapping: `scripts/file-doc-map.json`. Doc updates should be surgical — change only what code changes require. See `.claude/commands/update-docs.md` for the full workflow.

## Do Not

- Run `astro build` directly — use `npm run build`
- Use `locals.runtime.env` — use `import('cloudflare:workers')` instead
- Use PostCSS for Tailwind — it uses the Vite plugin (`@tailwindcss/vite`)
- Commit `.env`, `.dev.vars`, `data/`, `uploads/`, `.wrangler/`
- Manually bump versions — Release Please handles it
- Modify D1 database IDs in `wrangler.toml` without checking environment context
