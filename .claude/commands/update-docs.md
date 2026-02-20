# Update Documentation from Source Changes

Read `scripts/file-doc-map.json` to understand which source files map to which doc pages.

Arguments: $ARGUMENTS

## Modes

### Mode 1: Update docs (default)
Usage: `/update-docs automem` or `/update-docs mcp-automem`

1. The source repo is at `../automem` or `../mcp-servers/mcp-automem`
   (sibling directories relative to this project root).

2. In the source repo, run `git log --oneline -10 main` to see recent commits.
   Then run `git diff HEAD~3..HEAD --name-only` to get files changed in the
   last 3 commits (adjust range if needed based on the log).

3. Cross-reference the changed files against the mapping in
   `scripts/file-doc-map.json` to identify which doc pages are affected.

4. For each affected doc page:
   - Read the current doc file in `src/content/docs/docs/`
   - Read the relevant source files that changed
   - Make SURGICAL updates — only change what the code changes require
   - Preserve all existing content that is still accurate
   - Do NOT summarize, shorten, or rewrite unaffected sections

5. After updating, run `npm run build` to verify the site compiles.

6. Summarize what you changed and why.

### Mode 2: Rebuild map
Usage: `/update-docs rebuild-map`

1. Read `scripts/file-doc-map.json` and the current doc page slugs
   from `src/content/docs/docs/`.

2. Read the file trees of both source repos:
   - `../automem` (Python files in `automem/`, root configs, scripts)
   - `../mcp-servers/mcp-automem` (TypeScript files in `src/`, root configs)

3. For each source file that exists but has no matching pattern in the map,
   determine which doc page(s) it most likely relates to based on the file
   name, module, and content.

4. Propose additions to `file-doc-map.json`. Flag any entries in the map
   that reference files that no longer exist (stale entries).

5. Update `_meta.last_updated` to today's date.
