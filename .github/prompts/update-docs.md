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

## Source repositories

The documentation covers three repositories:
- **automem** (Python/Flask) — the core memory service
- **mcp-automem** (TypeScript) — the MCP client and CLI
- **automem-graph-viewer** (React/Vite) — the 3D graph visualization frontend

## File mapping reference

See `scripts/file-doc-map.json` for the complete source-file-to-doc-page mapping.
The map covers all three repos with exact paths and `/**` subtree patterns.

## PR description and confidence marker (REQUIRED)

Write the PR description as a concise audit summary:

- A `## Fixes` table (Claim | Current state | Fix) for every change you made,
  citing the source SHA you verified against.
- An optional `## Open questions` or `## Follow-ups` section for anything you
  could NOT confirm from the source, anything that needs a human decision, or
  drift you noticed but did not fix.

End the description with EXACTLY ONE confidence marker on its own line. This
marker controls whether the PR auto-merges, so it is mandatory:

- `<!-- DOCS-AUDIT: CLEAR -->` — every edit is verified against the source at a
  named SHA and you have NO open questions, unverifiable claims, or follow-ups.
  The PR is marked ready for review and auto-merged once CI passes.
- `<!-- DOCS-AUDIT: HOLD -->` — you have one or more open questions, claims you
  could not confirm, or follow-up items. The PR stays a draft for a maintainer.

Decision rule: if you wrote anything under an "Open questions", "Follow-ups", or
"could not confirm" heading, you MUST use HOLD. When genuinely unsure, choose
HOLD — a held PR costs a maintainer one glance, but a wrongly auto-merged guess
ships incorrect documentation. A missing marker is treated as HOLD.

## Commit message format

Use: `docs: update [page-names] to reflect [source-repo]@[short-sha]`
