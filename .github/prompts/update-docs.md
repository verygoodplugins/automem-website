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
- After making changes, run `npm test` and `npm run build`. If a test fails,
  fix your doc edit. If a test asserts a contract this release changed, update
  only that assertion and cite the source file and line in `fixes`. Never delete
  a test or loosen its source pins to make it pass.

## Source links follow releases

Docs describe published releases, and every run documents one: the Source SHA
is that release's commit. Pin each GitHub source link you add or touch to the
Source SHA. `scripts/docs-source-pins.json` lists the release commits the docs
tests accept; the workflow has already recorded this release there, so don't
edit that file.

## Source repositories

The documentation covers three repositories:
- **automem** (Python/Flask) — the core memory service
- **mcp-automem** (TypeScript) — the MCP client and CLI
- **automem-graph-viewer** (React/Vite) — the 3D graph visualization frontend

## File mapping reference

See `scripts/file-doc-map.json` for the complete source-file-to-doc-page mapping.
The map covers all three repos with exact paths and `/**` subtree patterns.

## Do NOT create a pull request

The workflow lands the branch and opens the PR after you finish. Do not run `gh`,
do not create a draft PR, and do not provide a "Create PR" link. Do not commit:
leave edits in the working tree on the current branch (the repo's rolling docs
branch) for the landing step.

## Structured audit result (REQUIRED)

When you finish, return the structured JSON result described in the workflow
schema. Populate these fields:

- **confidence**: `CLEAR` when every edit is verified against the named source SHA
  and you have no blocking questions. `HOLD` only for a serious discrepancy that
  requires a human decision before shipping docs. `NO_CHANGES` when the docs are
  already accurate and you made no edits.
- **title**: Conventional commit style, e.g.
  `docs: update [page-names] to reflect [source-repo]@[version]`
- **fixes**: One entry per doc change. Each entry has:
  - `claim` — what the doc now states (or should state)
  - `current` — what the doc said before (or "missing")
  - `fix` — what you changed, with source file/line or API reference
  - `source_sha` — the SHA you verified against
- **questions**: Only items a maintainer **must** decide before merging. Leave
  empty for routine audits.

### When to use CLEAR (default)

Use `CLEAR` when:
- Every edit is verified against the source at the named SHA
- You have no blocking questions
- Optional follow-ups, style nits, or unrelated drift you did not fix do NOT
  require HOLD — omit them or note them only in fix descriptions

### When to use HOLD (rare)

Use `HOLD` only when:
- The source contradicts itself and you cannot pick the correct behavior
- `file-doc-map.json` has no page for a changed source file that clearly needs docs
- A claim would change published docs but cannot be verified from the source

Do NOT use HOLD for:
- Optional improvements or "could be nicer" notes
- Unrelated drift you noticed but did not fix
- Low-confidence wording when the underlying fact is verifiable
- Missing tests, typos in source code, or out-of-scope repo issues

### When to use NO_CHANGES

Use `NO_CHANGES` when you verified the affected pages against the source and
made no edits because the docs are already accurate.

## Commit message format

The landing step commits with your title:
`docs: update [page-names] to reflect [source-repo]@[version]`
