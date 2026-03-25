# Update Documentation from Source Changes

Read `scripts/file-doc-map.json` to understand which source files map to which doc pages.

Arguments: $ARGUMENTS

## Modes

### Mode 1: Update docs (default)
Usage: `/update-docs automem` or `/update-docs mcp-automem` or `/update-docs automem-graph-viewer`

1. Generate a deterministic report first:

   ```bash
   npm run docs:report -- automem
   npm run docs:report -- mcp-automem
   ```

   The report:
   - Resolves the configured source repo path
   - Uses the default release range from `scripts/file-doc-map.json` unless
     `--from-ref` / `--to-ref` is provided
   - Outputs changed files, affected doc pages, ignored unmatched files, and
     doc-relevant unmatched files
   - Writes a reusable JSON report to `.docs-reports/`

2. If the report shows `docRelevantUnmappedFiles`, update
   `scripts/file-doc-map.json` before trusting the affected-pages list.

3. For each affected doc page:
   - Read the current doc file in `src/content/docs/docs/`
   - Read the relevant source files that changed
   - Make SURGICAL updates — only change what the code changes require
   - Preserve all existing content that is still accurate
   - Do NOT summarize, shorten, or rewrite unaffected sections

4. After updating, run:

   ```bash
   npm test
   npm run build
   npm run check-links
   ```

5. Summarize what you changed and why.

### Mode 2: Rebuild map
Usage: `/update-docs rebuild-map`

1. Run the deterministic report for each source repo and inspect the
   `docRelevantUnmappedFiles` output.

2. For each unmatched file that is actually public-doc relevant, add an entry
   to `scripts/file-doc-map.json`.

3. For files that are intentionally not public-doc relevant, add or adjust the
   ignored-unmatched patterns under `_meta.local_harness`.

4. Update `_meta.last_updated` to today's date.

### Mode 3: Full audit
Usage: `/update-docs full-audit`

Systematically update ALL doc pages against the current source code. Use this
after major refactors or to catch drift.

1. Start with the deterministic reports:

   ```bash
   npm run docs:report -- automem
   npm run docs:report -- mcp-automem
   npm run docs:report -- automem-graph-viewer
   ```

2. Read `scripts/file-doc-map.json` to understand the file-to-doc mapping.

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

4. After updating all pages, run:

   ```bash
   npm test
   npm run build
   npm run check-links
   ```

5. Provide a summary of all changes: which pages were updated, which were
   already accurate, and any pages that need manual attention.
