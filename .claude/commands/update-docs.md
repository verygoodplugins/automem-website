# Update Documentation from Source Changes

Read `scripts/file-doc-map.json` to understand which source files map to which doc pages.

Arguments: $ARGUMENTS

## Modes

### Mode 1: Update docs (default)
Usage: `/update-docs automem` or `/update-docs mcp-automem` or `/update-docs automem-graph-viewer`

1. The source repos are at sibling directories relative to this project root:
   - `../automem`
   - `../mcp-servers/mcp-automem`
   - `../automem-graph-viewer`

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

2. Read the file trees of all source repos:
   - `../automem` (Python files in `automem/`, root configs, scripts)
   - `../mcp-servers/mcp-automem` (TypeScript files in `src/`, root configs)
   - `../automem-graph-viewer` (TypeScript/React files in `src/`, root configs)

3. For each source file that exists but has no matching pattern in the map,
   determine which doc page(s) it most likely relates to based on the file
   name, module, and content.

4. Propose additions to `file-doc-map.json`. Flag any entries in the map
   that reference files that no longer exist (stale entries).

5. Update `_meta.last_updated` to today's date.

### Mode 3: Full audit
Usage: `/update-docs full-audit`

Systematically update ALL doc pages against the current source code. Use this
after major refactors or to catch drift.

1. Read `scripts/file-doc-map.json` to understand the file-to-doc mapping.

2. Get the file trees of all three source repos:
   - `../automem`
   - `../mcp-servers/mcp-automem`
   - `../automem-graph-viewer`

3. For EACH doc page in `src/content/docs/docs/` (all 57 pages), do the following:
   a. Read the current doc file
   b. Look up which source files map to this page via `file-doc-map.json`
   c. Read those source files from the sibling repos
   d. Compare what the docs say vs what the code actually does
   e. Update sections that are stale:
      - Fix file references that point to old/renamed/deleted files
      - Update code examples to match current API signatures
      - Add documentation for new features/endpoints/parameters
      - Remove references to deleted functionality
      - Update architecture descriptions to reflect current module structure
   f. Preserve everything that is still accurate — do NOT rewrite for style

4. Key things to watch for:
   - The `automem` server was refactored from a monolithic `app.py` into the
     `automem/` package with submodules: `api/`, `stores/`, `embedding/`,
     `enrichment/`, `consolidation/`, `search/`, `sync/`, `utils/`, etc.
   - Source file references in `:::note[Source files]` blocks need updating
   - Mermaid diagrams showing the old structure need updating
   - The graph viewer was extracted to a separate repository

5. After updating all pages, run `npm run build` to verify the site compiles.

6. Provide a summary of all changes: which pages were updated, which were
   already accurate, and any pages that need manual attention.
