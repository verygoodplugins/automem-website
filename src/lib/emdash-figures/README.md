# emdash-plugin-figures

Adds **Mermaid diagram** and **inline SVG** block types to the EmDash Portable Text editor.
The first diagram/figure block type for EmDash — built because nothing in the ecosystem
covered it (the official `@emdash-cms/plugin-embeds` does YouTube/Vimeo/Twitter/Bluesky only).

## Blocks

| `_type`     | Editor label          | Fields                          | Renders as |
| ----------- | --------------------- | ------------------------------- | ---------- |
| `mermaid`   | Mermaid Diagram       | `code` (multiline), `caption`   | Client-rendered Mermaid SVG (flowchart, pie, sequence, xychart…) |
| `figureSvg` | Inline SVG / Figure   | `svg` (multiline), `alt`, `caption` | SSR `<img>` data-URI (secure static mode) |

## How it's wired (this repo)

In-repo native plugin — no npm package. `astro.config.mjs`:

```js
const figuresPlugin     = fileURLToPath(new URL('./src/lib/emdash-figures/plugin.ts', import.meta.url));
const figuresComponents = fileURLToPath(new URL('./src/lib/emdash-figures/block-components.ts', import.meta.url));

emdash({
  plugins: [
    { id: 'emdash-plugin-figures', version: '0.1.0',
      entrypoint: figuresPlugin, componentsEntry: figuresComponents },
  ],
});
```

- `plugin.ts` → `createPlugin()` → `definePlugin({ admin: { portableTextBlocks } })` declares the editor blocks.
- `block-components.ts` exports `blockComponents` (the `_type` → Astro-component map); EmDash auto-merges it into `<PortableText>`.
- `Mermaid.astro` dynamically imports `mermaid` (already a project dep) and renders client-side, theme-aware, scoped via `mermaid.render()`.
- `FigureSvg.astro` SSR-inlines sanitized SVG.

## Notes & limitations

- **Native plugin only.** PT blocks ship build-time components, so this can't be sandboxed or
  published as a one-click marketplace install — it's a code-install plugin like `plugin-embeds`.
- **SVG renders via an `<img>` data-URI (secure static mode).** Browsers disable scripts,
  event handlers, `<foreignObject>`, and external refs for image-loaded SVG, so there's no
  inlining sink to sanitize — no regex, no DOMPurify, no stored-XSS surface. Tradeoff: figures
  must be self-contained, valid-XML SVG (internal `<style>`, no external CSS/fonts/refs, no
  page-CSS theming) — the normal shape for hand-built figures.
- **Mermaid weight:** loaded via dynamic `import('mermaid')` only on pages that contain a diagram.

## Extracting to a standalone npm package later

Move this folder to `packages/plugins/emdash-plugin-figures/`, add `index.ts` (descriptor
factory), `src/astro/index.ts` (re-export `blockComponents`), and `package.json` exports
`"."` + `"./astro"`, then publish. The block defs and renderers transfer unchanged.
