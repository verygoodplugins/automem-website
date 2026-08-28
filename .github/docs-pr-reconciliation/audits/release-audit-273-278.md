# Release audit: legacy documentation PRs #273–#278

Audited against the current website target `7052f7b6483116e066ec1d320241042e2e83e389`, AutoMem `e147c352b100ebbf29e6555453fdde5152066138` (0.16.2), and MCP AutoMem `9a0bbf754dd31db524da25638b0e97907e32ff37` (0.16.0).

**Classification:** **valid** means the proposed correction is still true at the specified release and is not present on the target; **invalid** means the proposed wording, source location, or behavior is wrong at that release; **already fixed** would mean target already contains the correction. No audited claim is already fixed on the target.

## #273 — Background Processing

Target: `src/content/docs/docs/architecture/background-processing.md`.

| Claim / proposed correction | Classification | Evidence | Smallest fresh replacement |
|---|---|---|---|
| `/health` does not expose embedding or consolidation sections; add `enrichment.status`. | **valid** | Target still invents all-background stats at `background-processing.md:232-243`. Release constructs only the enrichment object at `automem/api/health.py:87-110`; its status is at `:100-106`. | Reapply this table rewrite, pinning links to `e147c352`. |
| `enrichment.pending` means enqueued work not yet claimed, not every memory awaiting graph enrichment. | **valid** | Target says “not yet enriched” at `background-processing.md:237`. The release adds IDs to pending at `automem/enrichment/runtime_worker.py:37-44`, then moves each ID pending → inflight at `:104-106`. | Reapply the proposed one-line definition. |
| Only `/enrichment/reprocess` is admin-gated; `/enrichment/status` has no pending-ID samples. | **valid** | Target labels every endpoint admin-only at `background-processing.md:245-254`. Release calls `require_admin_token()` only in reprocess at `automem/api/enrichment.py:36-38`; status returns the seven fields at `:16-34`. | Reapply the Monitoring Endpoints rewrite; retain the normal API-token caveat. |
| The relationship-count cache anchor is `consolidation.py:201`, not `:152`. | **valid** | Target’s stale anchor is at `background-processing.md:306-309`. Release declares the `@lru_cache(maxsize=10000)` at `consolidation.py:201`. | Replace only the anchor, using the 0.16.2 commit URL. |

**Disposition:** a clean, four-claim reimplementation is appropriate. Do not merge the stale PR branch because its source pins predate the requested release.

## #274 — Health Monitoring

Target: `src/content/docs/docs/operations/health.md`.

| Claim / proposed correction | Classification | Evidence | Smallest fresh replacement |
|---|---|---|---|
| `HEALTH_MONITOR_AUTO_RECOVER` is not an environment variable; `--auto-recover` is the switch. | **valid** | Target advertises the variable at `operations/health.md:503-510`, `:599-611`, `:629-635`, and `:716-725`. Release only constructs the monitor from `args.auto_recover` at `scripts/health_monitor.py:374-405`. | Replace those four locations with the CLI-flag wording. |
| `HEALTH_MONITOR_CHECK_INTERVAL` is not read; `--interval` defaults to 300. | **valid** | Target exposes it at `operations/health.md:503-510` and `:629-635`. The release parser defines `--interval` at `scripts/health_monitor.py:373-375` and passes it to `run_forever` at `:423`. | Replace the variable with the flag in the Railway example and reference table. |
| The webhook payload has `level`, `title`, `message`, `details`, `timestamp`, and `system`; drift is nested in `details`. | **valid** | Target’s incompatible payload is at `operations/health.md:553-566`. Release constructs the actual payload at `scripts/health_monitor.py:184-206`. | Reapply the real-payload example; state that levels are `info`, `warning`, or `critical`. |
| `/startup-recall` has fixed 10/5 result sets, no fallback, and no `.memories` response field. | **valid** | Target claims a fallback and uses `.memories` at `operations/health.md:327-355`. Release hard-limits critical lessons to 10 at `automem/api/recall.py:2690-2713`, rules to 5 at `:2714-2727`, and returns `critical_lessons` / `system_rules` at `:2729-2737`. | Reapply the endpoint rewrite and change the jq expression to `.critical_lessons`. |
| `/analyze` is described as six wholly independent queries, each covered by a shared failure path, with `patterns` as memory type and `preferences` as memory type. | **invalid** | Target’s seven-query model is wrong at `operations/health.md:253-325`. The proposed PR correction is also overbroad: `memory_types`, Pattern nodes, preference edges, entity frequency, and confidence are in the outer failure path (`automem/api/recall.py:2747-2807`, `:2837-2891`), but the temporal query has its own `try/except` that silently leaves `temporal_insights` empty (`:2809-2835`). `patterns` comes from `MATCH (p:Pattern)` and `preferences` from `PREFERS_OVER` edges, not memories of the named type. | Rebuild this subsection: list the six output keys, describe Pattern nodes and `PREFERS_OVER` edges accurately, say temporal-query failure is suppressed while the other listed operations share the outer 500 path, and retain `/graph/stats` for edge counts. Do not copy the PR’s “all 6” sentence. |

**Disposition:** reimplement the first four corrections and a revised analytics correction. Also remove the duplicate `level is one of …` paragraph present in the old PR patch.

## #275 — Admin Operations

Target: `src/content/docs/docs/reference/api/admin.md`.

| Claim / proposed correction | Classification | Evidence | Smallest fresh replacement |
|---|---|---|---|
| Admin HTTP errors use `{status, code, message}`, not an `error` key; 503 is reachable. | **valid** | Target’s three stale bodies are at `reference/api/admin.md:62-68`. Release’s global HTTP-exception handler emits the envelope at `app.py:471-480`; admin reembed can abort 503 at `automem/api/admin.py:65-82`. | Replace the error table and include the 503 row. |
| The reembed batch-failure example is a plain `logger.error`, not `logger.exception(... extra=...)`. | **valid** | Target’s fabricated structured-log claim is in `reference/api/admin.md` immediately after the error table at `:341-358`. Release logs the actual call at `automem/api/admin.py:194-197`. | Replace only that example sentence/code block. |
| Reembed failure semantics are whole-batch for provider, vector-count, and Qdrant errors; empty content is silently excluded. | **valid** | Target says Qdrant failures are skipped at `reference/api/admin.md:322-324` and has the old error matrix at `:341-358`. The shared batch `try` encloses generation and upsert at `automem/api/admin.py:161-197`; the `if content` filter is at `:121-140`. | Reapply the proposed matrix, preserving the distinction that later batches continue. |
| `failed_ids_truncated` and the no-work short-circuit response are undocumented. | **valid** | Target schema lacks both at `reference/api/admin.md:275-297`. Release returns the short response at `automem/api/admin.py:142-150` and conditionally adds truncation at `:199-211`. | Add the one field and the small no-work example. |
| `/admin/sync` limits `batch_size` to 100 and has `dry_run` / `already_synced` response shapes. | **valid** | Target only documents the default at `reference/api/admin.md:401-425`. Release clamps at `automem/api/admin.py:237-242` and returns the two shapes at `:254-276`. | Add the max and the two concise response descriptions. |

**Disposition:** all five corrections remain valid. Recreate against 0.16.2, including the updated `automem/api/admin.py` source-note pin.

## #276 — Quick Start

Target: `src/content/docs/docs/getting-started/quick-start.md`.

| Claim / proposed correction | Classification | Evidence | Smallest fresh replacement |
|---|---|---|---|
| Noninteractive install does not imply `--yes`; it previews unless `--yes` or `--dry-run` is supplied. | **valid** | Target asserts implicit approval at `getting-started/quick-start.md:187-189`. Release returns the preview predicate at `mcp-automem/src/cli/install.ts:1042-1048` and prints the explicit `--yes` instruction at `:2073-2082`. | Reapply the note using the 0.16.0 source pin. |
| `qdrant` status is `connected` / `disconnected`, never `unavailable`. | **valid** | Target repeats `unavailable` at `getting-started/quick-start.md:219-230` and `:330-336`. Release emits the two values at `automem/api/health.py:87-107`. | Replace all three occurrences with `disconnected`. |
| Unset `PORT` falls back to 8001, not Flask’s 5000. | **valid** | Target’s inaccurate Railway explanation is at `getting-started/quick-start.md:261-267` and `:332-336`. Release reads `PORT` with `8001` default at `automem/runtime_wiring.py:81-83`. | Reword the Railway note as a non-8001 override mismatch; keep the recommendation to pin 8001. |
| The custom API header is `X-API-Key`, not `X-API-Token`. | **valid** | Target’s broken command is at `getting-started/quick-start.md:306-313`. Release authentication accepts the key header through `automem/api/auth_helpers.py:14-24`. | Change only the header name. |

**Disposition:** all four corrections remain valid; recreate with the requested release SHA values.

## #277 — Direct API vs MCP Tools

Target: `src/content/docs/docs/reference/api/direct-vs-mcp.md`.

| Claim / proposed correction | Classification | Evidence | Smallest fresh replacement |
|---|---|---|---|
| Lifecycle ranges, `installStdioErrorGuards`, and `src/index.ts` server setup end near line 1763. | **invalid** | Target’s obsolete ranges are at `reference/api/direct-vs-mcp.md:105-130`. At 0.16.0, `src/index.ts` is only 496 lines; command detection is `:30-46`, guard installation `:102-112`, MCP factory creation `:435-439`, and main `:441-496`. | Replace the lifecycle table from the release entrypoint, without referring to the old 1763-line layout. |
| Tool array and ListTools/CallTool handlers live in `src/index.ts` at the proposed new line ranges. | **invalid** | Target still cites index handlers at `reference/api/direct-vs-mcp.md:479-487`. 0.16.0 extracted the surface: `src/index.ts:23` imports `createAutoMemMcpServer`; `src/mcp-surface.ts:85-1007` owns schemas; `:1034-1039` registers ListTools and CallTool handlers. | Do not cherry-pick the old line-number update. Repin this section to `src/mcp-surface.ts`, with `src/index.ts` only for transport/lifecycle context. |
| `store_memory` has single, supersede, and batch modes; the additional fields are published in the schema; output `memory_id` is mode-dependent. | **valid** | Target omits the modes and falsely calls fields unpublished at `reference/api/direct-vs-mcp.md:200-235`. Release schema is `mcp-automem/src/mcp-surface.ts:85-268`; handler response paths are `:1043-1161`. | Reapply the semantic table rewrite, but cite `mcp-surface.ts`, not `index.ts`. |
| `recall_memory` has ID-fetch and exhaustive tag-enumeration modes, plus the documented optional schema fields. | **valid** | Target omits the mode selectors and says fields are unpublished at `reference/api/direct-vs-mcp.md:248-287`. Release definition is `mcp-surface.ts:271-514` (including `memory_id`, `exhaustive`, `offset`, `sort`, and `format`). | Reapply the semantic rewrite with the new source path; retain the release’s mode-specific limit wording. |
| `associate_memories` supports pair and batch modes, and relation properties are published. | **valid** | Target requires top-level pair fields only at `reference/api/direct-vs-mcp.md:298-323`. Release exposes the pair/batch schema at `mcp-surface.ts:668-757`; only each batch item has a JSON-schema required list at `:729-754`. | Reapply the mode table, but describe top-level fields as pair-mode requirements rather than a top-level `required` array. |
| `store_memory` and `delete_memory` make only `message` universally required; outputs differ by mode. | **valid** | Target marks `memory_id` required in its store/delete tables at `reference/api/direct-vs-mcp.md:220-230` and `:382-399`. Release schemas require only `message` for store (`mcp-surface.ts:226-268`) and delete (`:934-956`). | Reapply these mode-specific output rows using `mcp-surface.ts`. In the same fresh patch, correct the target’s stale delete `idempotentHint: Yes` at `direct-vs-mcp.md:172-193`: release declares it false at `mcp-surface.ts:911-916`. |

**Disposition:** preserve the schema-content corrections, but replace every `src/index.ts` line-reference correction with a 0.16.0 `src/mcp-surface.ts` rebase. This is a fresh replacement PR, not a cherry-pick.

## #278 — Research & Motivation

Target: `src/content/docs/docs/research.md`.

| Claim / proposed correction | Classification | Evidence | Smallest fresh replacement |
|---|---|---|---|
| FalkorDB/Qdrant initialization links must move from past-EOF `app.py` ranges. | **valid** | Target still links `app.py:1422-1471` at `research.md:167-172`. Release initialization functions are `automem/stores/runtime_clients.py:7-48` and `:49-107`. | Reapply both permalink replacements, pinned to `e147c352`. |
| Entity tags use plural categories (`tools`, `projects`, `people`, `concepts`) and are assembled as `entity:{category}:{slug}`. | **valid** | Target uses singular tags at `research.md:202-211`. Release category keys are at `automem/utils/entity_extraction.py:151-159`; tag assembly is at `automem/enrichment/runtime_orchestration.py:80-95`. | Reapply the plural table and prefix-query rewrite. |
| `/recall` moved from `app.py` to `automem/api/recall.py`. | **valid** | Target’s obsolete reference is at `research.md:213-216`. Release defines `handle_recall` at `automem/api/recall.py:1703` and registers `/recall` at `:2652-2654`. | Reapply both anchors using the release SHA. |
| The four summary-table links need paths for client setup, consolidation scheduler, summary generation, and time parsing. | **valid** | Target’s past-EOF/dead links are at `research.md:263-270`. Release locations are `automem/stores/runtime_clients.py:7-107`, `consolidation.py:1118-1129`, `automem/utils/entity_extraction.py:127-148`, and `automem/utils/time.py:89-100`. | Reapply the four link substitutions, all pinned to 0.16.2. |
| The PR’s five changes alone clear all research-page source drift. | **invalid** | Even after these changes, the target retains further stale research links, for example `research.md:176` and `:191-194`. The old PR itself listed these as deferred. | Keep the replacement tightly scoped to the five validated changes; schedule the remaining anchors as a separate follow-up rather than claiming a complete page audit. |

**Disposition:** reimplement the four valid correction groups with 0.16.2 pins. Keep the original five-fix cap explicit.

## Recommended reconciliation order

1. Fresh, small replacements for #273, #275, #276, and #278.
2. A revised #274 replacement that fixes the analytics nuance as well as the four valid groups.
3. A fully rebased #277 replacement against `src/mcp-surface.ts` at MCP AutoMem 0.16.0.

None of the six legacy branches should be merged directly: all target files remain unchanged from the old base, while each legacy PR embeds older source commit references; #277 additionally targets a pre-refactor MCP file layout.
