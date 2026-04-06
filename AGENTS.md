# Repository Guidelines

## Project Overview

AutoMem.AI marketing and documentation website.

**Stack**: Astro 6.x + Tailwind CSS v4 + Cloudflare Pages + D1 database + Starlight (docs) + EmDash CMS

## Commands

```bash
npm run dev          # Astro dev server (localhost:5000, --host 0.0.0.0)
npm run build        # Production build via scripts/build-pages.mjs (NOT plain astro build)
npm run preview      # Preview production build
npm run check-links  # Broken link checker (requires build first)
```

## Architecture & Key Directories

```
src/pages/           — Routes (.astro). Includes /blog/, /docs/, /about, /mascot-lab, etc.
src/content/blog/    — Blog posts as markdown in numbered dirs (e.g., 01-introducing-automem/index.md)
src/content/docs/    — Starlight documentation (57+ pages)
src/components/      — Astro components (AutoJack mascot, MemoryHero, EmailSignup, SEO schemas/)
src/layouts/         — Layout.astro (single base layout with hex line numbers, footer mascot)
src/styles/          — global.css (Tailwind v4 @theme + CSS vars), starlight-custom.css
src/lib/             — Utility modules (blog helpers, emdash email plugin)
src/middleware.ts    — Cloudflare Workers env import, API route dispatch, emdash preview redirect
src/content.config.ts — Content collection definitions (blog + docs)
src/live.config.ts   — EmDash CMS configuration
functions/           — Cloudflare Pages Functions (api/signup.js, confirm.js, unsubscribe.js, admin/)
scripts/             — Build tooling (build-pages.mjs, bundle-worker.mjs, check-links.js, file-doc-map.json)
schema/              — D1 database schemas
public/              — Static assets (favicon, OG image)
```

## Build Pipeline

`npm run build` runs `scripts/build-pages.mjs`, which:

1. Temporarily strips `pages_build_output_dir` from wrangler.toml
2. Swaps in emdash live config (`src/live.config.emdash.ts` → `src/live.config.ts`)
3. Runs `astro build`
4. Runs `scripts/bundle-worker.mjs` (esbuild worker bundling)
5. Restores original config files

**Never run `astro build` directly** — always use `npm run build`.

## Cloudflare Integration

- **D1 databases**: `D1` binding (waitlist), `EMDASH_DB` binding (CMS)
- **KV namespace**: `SESSION` binding (Astro sessions for emdash auth)
- **Environment access**: Use `import('cloudflare:workers')` to get env — do NOT use `locals.runtime.env` (deprecated in Astro v6)
- **Pages Functions**: Plain JS files in `functions/` (not TypeScript, not in `src/`)
- **API routes**: Dispatched through `src/middleware.ts`, which dynamically imports from `functions/`
- **Environments**: `wrangler.toml` has production and preview configs with separate D1 databases

## Theming System

### CSS Variables (`src/styles/global.css`)

Colors use RGB triplet values for alpha compositing. Defined in `:root` (dark, default) and `.light`:

- `--lab-accent`: `249 216 87` (#F9D857, Luminous Gold)
- `--lab-secondary`: Violet #8B5CF6
- `--lab-bg`, `--lab-surface`, `--lab-border`, `--lab-text`, `--lab-muted`
- `--lab-success`: Memory Green #34D399
- `--lab-gold`, `--lab-gold-soft`, `--lab-gold-classic`, `--lab-gold-dark`

### Tailwind v4

- Uses `@tailwindcss/vite` plugin (NOT PostCSS)
- Theme defined via `@theme` block in `global.css` mapping CSS vars → `--color-lab-*`
- Utilities: `bg-lab-bg`, `text-lab-accent`, `border-lab-border`, etc.
- Font: JetBrains Mono for both `--font-sans` and `--font-mono`
- Hard shadow: `4px 4px 0px 0px` on cards and buttons

### Dark/Light Modes

- Dark mode is the default ("Memory Lab" theme)
- Light mode via `.light` class on `<html>` element ("Warm Archive" theme)

## Content Collections (`src/content.config.ts`)

- **docs**: `docsLoader()` from Starlight with `docsSchema()`
- **blog**: `glob` loader matching `**/*.{md,mdx}` in `src/content/blog/`
  - Schema: title (string), description (string), date (date), draft (boolean, optional), tags (string[], optional)
  - Directory convention: numbered prefix `NN-slug/index.md`

## Component Patterns

- **AutoJack mascot**: SVG floppy disk character with 6 expression states (confident, wink, happy, sleeping, bliss, focused)
- **Gold gradient**: `#FFE082 → #F9D857 → #DAA520`
- **Buttons**: `.btn-lab` (outline) and `.btn-lab-accent` (gold filled), both with hard shadow hover
- **Grid background**: 24px radial-gradient dot pattern
- **Body layout**: Flex with optional hex line numbers column (hidden on mobile)

## Coding Conventions

- TypeScript strict mode (`extends astro/tsconfigs/strict`)
- ESM (`"type": "module"` in package.json)
- Astro components use `.astro` extension
- React islands via `@astrojs/react` for interactive components (TanStack Query + Router available)
- Blog posts: numbered directory prefix (`01-`, `02-`, ...) with `index.md` inside
- Starlight docs: organized by section directories matching sidebar config in `astro.config.mjs`
- Cloudflare Pages Functions: plain `.js` files (not TypeScript)

## Commit Style

- Conventional commits: `feat(scope): desc`, `fix(scope): desc`, `docs:`, `chore:`, `refactor:`
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
