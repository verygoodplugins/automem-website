# Documentation Update Instructions

You are updating the AutoMem documentation site (Astro Starlight) to reflect
changes in the source code.

## Your task

1. Read the changed source files in `.source-repo/`
2. Read the affected doc pages in `src/content/docs/docs/`
3. Update ONLY the sections that are actually affected by the code changes
4. Preserve all existing content that is still accurate
5. Maintain the same writing style, depth, and formatting

## Rules

- This is a SURGICAL UPDATE, not a rewrite. Change only what the code changes require.
- Keep every table, code example, and technical detail that's still correct.
- If a new API endpoint was added, add it. If a parameter changed, update it.
  If behavior changed, update the description. That's it.
- Do NOT summarize, shorten, or "improve" existing content.
- Do NOT change frontmatter unless the title/description genuinely needs updating.
- Use the same Starlight conventions: :::note, :::tip, :::caution admonitions,
  mermaid code blocks for diagrams, relative links between pages.
- After making changes, run `npm run build` to verify the site compiles.

## File mapping reference

See `scripts/file-doc-map.json` for the complete source-file-to-doc-page mapping.

## Commit message format

Use: `docs: update [page-names] to reflect [source-repo]@[short-sha]`
