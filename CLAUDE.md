# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the canonical repository guide and is kept in sync with this file. When they disagree, `AGENTS.md` wins.

## Commands

```bash
npm run dev          # Astro dev server on http://localhost:5000 (host 0.0.0.0)
npm run build        # Production build via scripts/build-pages.mjs (NOT plain astro build)
npm run preview      # Preview production build
npm run check-links  # Linkinator broken-link check (run AFTER npm run build)
```

`npm run dev` runs without the Cloudflare adapter (workerd can't load Node DB drivers locally) and uses libsql + filesystem sessions; `npm run build` swaps the adapter in and uses D1.

## Stack

Astro 6.1 + React 19 islands · Tailwind CSS v4 (Vite plugin, not PostCSS) · Starlight for `/docs/*` · EmDash CMS · MDX · astro-mermaid · Cloudflare Pages + Pages Functions + D1 + KV.

## Architecture (big picture)

- **Two content systems**: long-form blog posts in `src/content/blog/NN-slug/index.md` (custom collection, schema in `src/content.config.ts`); product docs in `src/content/docs/docs/...` rendered by Starlight (sidebar configured in `astro.config.mjs`).
- **Three runtimes share one project**: Astro SSR pages, Cloudflare Pages Functions in `functions/` (plain `.js`, not TS, dispatched via `src/middleware.ts`), and EmDash CMS routes mounted at `/_emdash/*`.
- **Single base layout**: `src/layouts/Layout.astro` (hex line-number column, footer mascot). Starlight pages use a separate Starlight layout customized via `src/styles/starlight-custom.css`.
- **Build pipeline**: `scripts/build-pages.mjs` temporarily strips `pages_build_output_dir` from `wrangler.toml`, runs `astro build`, runs `scripts/bundle-worker.mjs` (esbuild), then restores `wrangler.toml`. Always invoke via `npm run build`.

## Environment & Cloudflare

- **Get env via `import('cloudflare:workers')`** — `locals.runtime.env` is deprecated in Astro v6. Don't reintroduce it.
- D1 bindings: `D1` (waitlist) and `EMDASH_DB` (CMS). KV binding: `SESSION` (emdash auth). Production and preview have separate database IDs in `wrangler.toml` — don't blindly edit those.
- Pages Functions live in `functions/` as plain `.js` and are surfaced through `src/middleware.ts` (`api/signup.js`, `confirm.js`, `unsubscribe.js`, `admin/*`).

## Theming

CSS variables in `src/styles/global.css` use RGB triplets so Tailwind utilities can apply alpha. Default (dark) theme is "Memory Lab — Luminous Gold Era": `--lab-accent` is `#F9D857` (gold), `--lab-secondary` is `#8B5CF6` (violet). Light mode is "Warm Archive", activated by adding `.light` to `<html>`. Tailwind v4 maps these via an `@theme` block to `bg-lab-*` / `text-lab-*` / `border-lab-*` utilities. Cards and buttons use a `4px 4px 0` hard shadow (`shadow-hard`); body has a 24px radial-dot blueprint grid.

If you see references to hot pink `#FF33CC` anywhere, that's a leftover from the pre-rebrand color and should not be reintroduced.

## Documentation update workflow

Docs cover three sibling repos checked out next to this one: `../automem` (Python core), `../mcp-servers/mcp-automem` (TS MCP client/CLI), `../automem-graph-viewer` (React/Vite visualizer). Source-to-doc mapping lives in `scripts/file-doc-map.json`. The `/update-docs` slash command (`.claude/commands/update-docs.md`) drives the workflow — surgical edits only, do not rewrite unaffected sections. Commit style for these is `docs: update [pages] to reflect [repo]@[short-sha]`.

## Conventions & gotchas

- TypeScript strict mode (`extends astro/tsconfigs/strict`); ESM (`"type": "module"`).
- Conventional commits (`feat(scope):`, `fix(scope):`, `docs:`, `chore:`, `refactor:`).
- Release Please manages versions — don't bump `package.json` by hand.
- Don't run `astro build` directly — use `npm run build`.
- Don't switch Tailwind to PostCSS — it uses `@tailwindcss/vite`.
- Don't commit `.env`, `.dev.vars`, `data/`, `uploads/`, `.wrangler/`.
- Blog post directories use a numbered prefix (`01-`, `02-`, …) with `index.md` inside.
