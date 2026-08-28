# Release-pinned reconciliation: #312, #313, and #314

**Audit date:** 2026-08-28
**Website baseline:** `verygoodplugins/automem-website` `origin/main` at
`f93b17b7a6afd945ed5d5e31d1ff5cd4f9fcff0b` (read with `git show`).
**Primary source:** AutoMem `0.16.2`,
`e147c352b100ebbf29e6555453fdde5152066138`.
**MCP exception:** the client-structure claims in #314 are checked only against
MCP release `9a0bbf754dd31db524da25638b0e97907e32ff37`.

All three legacy PRs are open drafts, and none of their changed hunks appears on
the website baseline.  Do not merge or transplant them: make a fresh, small
replacement from the release-pinned findings below.

## PR #312 — System Overview

Changed page: `src/content/docs/docs/architecture/overview.md`.

| Legacy claim / proposed correction | Classification at AutoMem 0.16.2 | Exact source evidence | Website already corrected? |
|---|---|---|---|
| The source-note API-blueprint list omitted `entity.py`, `backup.py`, and `stream.py`. | **Valid.** The list should name the registered blueprints, including all three. | [`runtime_bootstrap.py:5-15`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/runtime_bootstrap.py#L5-L15) imports admin, backup, consolidation, enrichment, entity, graph, health, memory, recall, stream, and viewer. | **No.** The website still omits the three files at `origin/main:src/content/docs/docs/architecture/overview.md:13`. |
| `_serialize_node` and `_summarize_relation_node` belong to `automem/utils/graph.py`, not `stores/graph_store.py`; the latter parameter is `data`, not `rel`. | **Valid.** | [`graph_store.py:4-37`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/stores/graph_store.py#L4-L37) contains only `_build_graph_tag_predicate`; [`utils/graph.py:8-23`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/utils/graph.py#L8-L23) defines the two serializers and `data` parameter. | **No.** The wrong module attribution and `rel` parameter remain at `.../architecture/overview.md:295-300`. |
| Enrichment has a bounded number of attempts and a flat configurable delay, rather than `5s, 10s, 15s` exponential backoff. | **Valid for the enrichment row.** Do not retain the broader heading “Each worker implements retry logic”: this audit only establishes the enrichment-worker contract. | [`runtime_worker.py:134-161`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/enrichment/runtime_worker.py#L134-L161) retries only while `attempt + 1 < enrichment_max_attempts`, sleeps the unchanged `enrichment_failure_backoff_seconds`, then re-enqueues; [`config.py:107-111`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L107-L111) supplies defaults 3 and 5. | **No.** The exponential claim is still at `.../architecture/overview.md:416-420`. |
| `ENRICHMENT_*`, `CONSOLIDATION_*`, and `SEARCH_WEIGHT_*` have the exact counts 7, 18, and 11. | **Do not carry forward.** The old count correction may describe this snapshot, but prefix counts are an unstable documentation surface and must not become release documentation. Replace the count-bearing cells with representative variables only. | The release exposes the enrichment names at [`config.py:107-117`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L107-L117), consolidation settings across [`config.py:30-100`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L30-L100), and base/temporal weights at [`config.py:472-482`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L472-L482) and [`config.py:575-580`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L575-L580). | **No.** Stale numerical claims remain at `.../architecture/overview.md:382-384`; remove numbers rather than replacing them. |
| Project `.env` is loaded before the user file; externally supplied environment values win because `load_dotenv` does not override already-set names. | **Valid.** The resulting priority is environment, project `.env`, user `.env`, defaults. | [`config.py:7-11`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L7-L11) invokes project `load_dotenv()` before the user path; all subsequent settings use `os.getenv`, e.g. [`config.py:13-27`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L13-L27). | **No.** The reverse user/project order is still at `.../architecture/overview.md:389-394`. |

**Smallest safe fresh slice:** only the source-note blueprint list (line 13), the
two graph-helper bullets (lines 295-300), the single Enrichment resilience row
(lines 414-423), and the configuration table/load-order block (lines 374-394).
For the configuration categories, delete all prefix counts; do not substitute
new counts.  Keep every other legacy #312 hunk out.

## PR #313 — Backup & Recovery

Changed page: `src/content/docs/docs/operations/backup.md`.

| Legacy claim / proposed correction | Classification at AutoMem 0.16.2 | Exact source evidence | Website already corrected? |
|---|---|---|---|
| `--cleanup --keep N` retains N files per store, ordered by modification time; it is not an age-in-days or filename-timestamp policy. | **Valid.** | [`backup.py:331-347`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/backup.py#L331-L347) sorts each store’s `*.json.gz` by `p.stat().st_mtime` and unlinks `backup_files[keep:]`; [`backup_automem.py:240-243`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/backup_automem.py#L240-L243) defines `--keep` as “Number of recent backups.” | **No.** Both false age statements remain at `.../operations/backup.md:127-128` and `:154`. |
| `FALKORDB_PORT` and `FALKORDB_PASSWORD` are not universally required; `AUTOMEM_BACKUP_DIR` is a documented script input. | **Valid.** Password is conditional on the deployment; the script gives the other two defaults. | [`backup_automem.py:56-64`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/backup_automem.py#L56-L64) reads backup directory, port default `6379`, and a nullable password; [`backup_automem.py:85-90`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/backup_automem.py#L85-L90) uses a username only when a password is supplied. | **No.** The required flags and missing backup-directory row remain at `.../operations/backup.md:255-263`. |
| The FalkorDB artifact is a Cypher node/relationship dump object, not an export of the complete Redis keyspace or its indexes. | **Valid.** | [`backup.py:120-145`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/backup.py#L120-L145) selects relationships into `source_id`, `type`, `target_id`, and `properties`; [`backup.py:157-172`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/backup.py#L157-L172) serializes precisely `timestamp`, `graph_name`, `nodes`, `relationships`, and `stats`. | **No.** The Redis-keyspace/indexes claim remains at `.../operations/backup.md:101-108`. |
| A Qdrant artifact is an object containing a `points` array, and `jq 'length'` counts object keys rather than points. | **Valid.** | [`backup.py:212-247`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/backup.py#L212-L247) builds individual point objects and writes `{timestamp, collection_name, points, stats}`; `stats.points_count` is populated at [`backup.py:232-242`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/backup.py#L232-L242). | **No.** The bare-array prose and unusable `jq 'length'` example remain at `.../operations/backup.md:412` and `:676-677`. |

**Smallest safe fresh slice:** the backup-format prose (lines 101-119), both
retention statements (127-128 and 154), the four affected environment rows
(255-263), the Qdrant-artifact sentence (412), and the integrity command
(676-677).  This is a self-contained Backup & Recovery patch; leave diagrams
and the unrelated legacy follow-up unmodified.

## PR #314 — Project Structure

Changed page: `src/content/docs/docs/development/structure.md`.  Backend/Compose
claims use AutoMem 0.16.2; client tree, templates, config, and TypeScript claims
use the specified MCP release only.

| Legacy claim / proposed correction | Classification at the pinned release(s) | Exact source evidence | Website already corrected? |
|---|---|---|---|
| `memory-service` is not the Compose service name; `flask-api` publishes the Flask API on port 8001. | **Valid.** | [`docker-compose.yml:37-40`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/docker-compose.yml#L37-L40). | **No.** `memory-service` remains at `.../development/structure.md:216-220`. |
| `eslint.config.mjs`, rather than `eslint.config.js`, is the root ESLint config. | **Valid.** | The release tree has the exact entry [`eslint.config.mjs`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/eslint.config.mjs). This is a file-name/tree fact, so it has no meaningful source line range. | **No.** The `.js` spelling remains at `.../development/structure.md:443-448`. |
| MCP `templates/` does not contain `warp/` or `claude-code/profiles/`; it contains the corrected antigravity, Copilot, Hermes, Cursor, Codex, and OpenClaw entries. | **Partially valid; do not transplant as a complete directory tree.** #314 correctly removes the nonexistent Warp and retired profiles and correctly adds the named directories, but its “real contents” claim becomes incomplete at the selected release: `templates/grok/` and root template files also exist. | MCP release tree entries: [`templates/`](https://github.com/verygoodplugins/mcp-automem/tree/9a0bbf754dd31db524da25638b0e97907e32ff37/templates), [`templates/grok/`](https://github.com/verygoodplugins/mcp-automem/tree/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/grok), and [`templates/codex/`](https://github.com/verygoodplugins/mcp-automem/tree/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/codex). Directory manifests have no source line ranges. | **No.** All stale entries remain at `.../development/structure.md:375-405`. |
| `src/cli/` includes `install`, `copilot`, `hermes`, `migrate`, `uninstall`, and `cloud/` in addition to the old six modules. | **Partially valid; incomplete as a diagram refresh.** Each added item exists, but the same release also has user-facing Grok support (`grok.ts`) and shared `clients.ts`; a structural diagram should not claim exhaustive coverage while omitting Grok. | [`install.ts:6-13`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/install.ts#L6-L13) imports the new platform handlers; [`copilot.ts:1-10`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/copilot.ts#L1-L10), [`hermes.ts:1-18`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/hermes.ts#L1-L18), [`grok.ts:1-18`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/grok.ts#L1-L18), [`migrate.ts:1-15`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/migrate.ts#L1-L15), and [`uninstall.ts:1-15`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/uninstall.ts#L1-L15) establish the modules. | **No.** The old limited CLI diagram remains at `.../development/structure.md:302-313`. |
| TypeScript is `module: "NodeNext"` and `target: "ES2022"`. | **Valid.** | [`tsconfig.json:2-18`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/tsconfig.json#L2-L18). | **No.** `ES2020` remains at `.../development/structure.md:415-421`. |

**Smallest safe fresh slice:** change the Compose service line (216-220), the
two TypeScript bullets (415-421), and ESLint filename row (443-448).  Treat the
CLI/template material as one separately reviewed, narrowly labelled *selected
layout* refresh: include Grok if platform directories/CLI handlers are shown,
or replace the detailed trees with a short non-exhaustive sentence.  Do not use
#314’s old tree verbatim because it remains incomplete at MCP `9a0bbf7`.

## Outcome

- #312 and #313 each support a small fresh page patch, except that #312’s
  variable-count proposal must be omitted entirely.
- #314 has three independently valid single-line/config changes, but its two
  structural tree claims need a fresh release-aware rewrite before publication.
- No page is already corrected on `origin/main`; all legacy PRs remain unsuitable
  for direct merge because their source pins and incomplete scope are stale.
