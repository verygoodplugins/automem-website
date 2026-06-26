# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is the canonical repository guide and is kept in sync with this file. When they disagree, `AGENTS.md` wins.

## Commands

```bash
npm run dev          # Astro dev server on http://localhost:4321 (host 0.0.0.0)
npm run build        # Production build via scripts/build-pages.mjs (NOT plain astro build)
npm run preview      # Preview production build
npm run check-links  # Linkinator broken-link check (run AFTER npm run build)
```

`npm run dev` runs without the Cloudflare adapter (workerd can't load Node DB drivers locally) and uses libsql + filesystem sessions; `npm run build` swaps the adapter in and uses D1.

**Local preview & link-checking notes:**
- `npm run dev` runs on port 4321. **Never use port 5000 — it is reserved on this system.** If another process already holds 4321, Astro silently bumps to 4322+. For the Claude Code preview tool, use the `.claude/launch.json` `automem-web` config (it runs `astro dev` on `0.0.0.0:4321` — binding `0.0.0.0` avoids the macOS `localhost`→IPv6 `::1` resolution that breaks readiness checks on a 127.0.0.1-only bind).
- `npm run check-links` boots `wrangler pages dev` against the built `_worker.js`. In restricted/sandboxed environments where wrangler can't serve, it returns 404 for *every* asset (favicon, JS bundles, all routes) — these are false negatives, not broken links. Verify links with an `npm run dev` crawl instead.
- The blog index (`src/pages/blog/index.astro`) merges EmDash CMS posts with file-based markdown posts, deduped by public slug. A new markdown post under `src/content/blog/NN-slug/` shows up automatically; no CMS entry needed.

## Stack

Astro 6.1 + React 19 islands · Tailwind CSS v4 (Vite plugin, not PostCSS) · Starlight for `/docs/*` · EmDash CMS · MDX · astro-mermaid · Cloudflare Pages + Pages Functions + D1 + KV.

## Architecture (big picture)

- **Two content systems**: long-form blog posts in `src/content/blog/NN-slug/index.md` (custom collection, schema in `src/content.config.ts`); product docs in `src/content/docs/docs/...` rendered by Starlight (sidebar configured in `astro.config.mjs`).
- **Three runtimes share one project**: Astro SSR pages, Cloudflare Pages Functions in `functions/` (plain `.js`, not TS, dispatched via `src/middleware.ts`), and EmDash CMS routes mounted at `/_emdash/*`.
- **Single base layout**: `src/layouts/Layout.astro` (install-first chrome, footer mascot). Starlight pages use a separate Starlight layout customized via `src/styles/starlight-custom.css`.
- **Build pipeline**: `scripts/build-pages.mjs` temporarily strips `pages_build_output_dir` from `wrangler.toml`, runs `astro build`, runs `scripts/bundle-worker.mjs` (esbuild), then restores `wrangler.toml`. Always invoke via `npm run build`.

## Environment & Cloudflare

- **Get env via `import('cloudflare:workers')`** — `locals.runtime.env` is deprecated in Astro v6. Don't reintroduce it.
- D1 bindings: `D1` (waitlist) and `EMDASH_DB` (CMS). KV binding: `SESSION` (emdash auth). Preview currently uses a separate `EMDASH_DB`, but reuses the production waitlist `D1` and `SESSION` KV IDs. Treat write-capable previews as non-isolated until separate preview waitlist D1/KV resources are created and bound in `wrangler.toml`.
- Pages Functions live in `functions/` as plain `.js` and are surfaced through `src/middleware.ts` (`api/signup.js`, `confirm.js`, `unsubscribe.js`, `admin/*`).

## Theming

CSS variables in `src/styles/global.css` use RGB triplets so Tailwind utilities can apply alpha. Default (dark) theme is "Memory Lab": `--lab-accent` is `#F9CF2C` (gold), `--lab-secondary` is `#AE66FF` (violet), `--lab-bg` is `#060A0E`. Surfaces layer through `--lab-surface` → `--lab-panel` (`#0F161E`) with `--lab-line` (`#465260`) hairlines; the `.glass-panel` utility is the frosted, semi-transparent card surface. Light mode (cool white `#F6F8FC`, not the old cream) is activated by adding `.light` to `<html>`. Tailwind v4 maps these via an `@theme` block to `bg-lab-*` / `text-lab-*` / `border-lab-*` utilities. Cards and buttons use a `4px 4px 0` hard shadow (`shadow-hard`); the body background layers violet + gold radial-gradient glows over a 24px radial-dot grid.

The base `Layout.astro` is an install-first chrome — the old hex line-number gutter column was removed in the redesign (the `AutoJackPeek` mascot is still wired in as a fixed, scroll-triggered peek); content sits in a `max-w-[1440px]` container.

If you see references to hot pink `#FF33CC` anywhere, that's a leftover from the pre-rebrand color and should not be reintroduced. The accent gold was refreshed from `#F9D857` to `#F9CF2C` and the violet from `#8B5CF6` to `#AE66FF`; new chrome should use the `--lab-*` tokens, though decorative mascot/SVG art (e.g. `AutoJack`, `MemoryHero`) may still embed the older gold and that's fine.

## Documentation update workflow

Docs cover three sibling repos checked out next to this one: `../automem` (Python core), `../mcp-servers/mcp-automem` (TS MCP client/CLI), `../automem-graph-viewer` (React/Vite visualizer). Source-to-doc mapping lives in `scripts/file-doc-map.json`. The `/update-docs` slash command (`.claude/commands/update-docs.md`) drives the workflow — surgical edits only, do not rewrite unaffected sections. Commit style for these is `docs: update [pages] to reflect [repo]@[short-sha]`.

## Conventions & gotchas

- TypeScript strict mode (`extends astro/tsconfigs/strict`); ESM (`"type": "module"`).
- PR titles must use Conventional Commit format because squash merges use the PR title as the release commit title. Do not prefix titles with `[claude]`, `[codex]`, `[copilot]`, `[wip]`, or similar labels; put agent/status context in the PR body.
- Conventional commit types are `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `chore`, `perf`, `revert` with optional scope. Public API or documented surface changes use `feat(api): ...` unless strictly a bug fix; release automation uses `ci(release): ...` or `chore(release): ...`.
- Release Please manages versions — don't bump `package.json` by hand.
- Don't run `astro build` directly — use `npm run build`.
- Don't switch Tailwind to PostCSS — it uses `@tailwindcss/vite`.
- Don't commit `.env`, `.dev.vars`, `data/`, `uploads/`, `.wrangler/`.
- Blog post directories use a numbered prefix (`01-`, `02-`, …) with `index.md` inside.
