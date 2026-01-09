# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Astro dev server (localhost:4321)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build

# Quality
npm run check-links  # Check for broken links (requires build first)
```

## Architecture

**Stack**: Astro 5.x + Tailwind CSS + Cloudflare Pages + D1 database

### Key Directories

- `src/pages/` - Routes (.astro files, includes `/blog/`, `/docs/`)
- `src/content/blog/` - Blog posts as markdown with numbered prefixes (e.g., `01-introducing-automem/index.md`)
- `src/components/` - Astro components including SEO schemas in `schemas/`
- `src/layouts/Layout.astro` - Single base layout with hex line numbers, footer mascot
- `src/styles/global.css` - CSS variables for theming (`--lab-*`), component classes
- `functions/` - Cloudflare Pages Functions for waitlist API

### Theming System

Colors use CSS variables with RGB values for alpha support. Defined in `global.css`:
- Dark mode (default): `--lab-bg`, `--lab-accent` (hot pink #FF33CC), `--lab-secondary` (cyan)
- Light mode: `.light` class on html element

Tailwind uses these via `lab-*` color utilities (e.g., `bg-lab-bg`, `text-lab-accent`).

### Content Collections

Blog posts defined in `src/content/config.ts` with schema: title, description, date, draft (optional), tags (optional).

### Cloudflare Integration

- D1 database binding: `D1` for waitlist signups
- Functions in `functions/api/signup.js` handle email collection
- Environment vars configured in `wrangler.toml` and Cloudflare Pages dashboard
