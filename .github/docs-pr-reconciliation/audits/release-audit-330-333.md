# Release audit: legacy docs PRs #330–#333

## Scope and method

- **Website baseline:** `origin/main` at `f93b17b` (read-only inspection).
- **Authoritative server source:** AutoMem `0.16.2`, commit
  `e147c352b100ebbf29e6555453fdde5152066138` — never current source `main`.
- **Cross-client exception:** #330's MCP-only watchdog row was checked at the
  PR's paired released `mcp-automem@9a0bbf754dd31db524da25638b0e97907e32ff37`.
- All four PRs remain open and their original page text is still present on
  `origin/main`; there are **no already-fixed candidates** in this cohort.

Status meanings: **Validated** means the active page contradicts the release
source and the proposed correction is supported; **Invalidated** means the
legacy replacement itself needs a narrow correction before reuse; **Already
fixed** means `origin/main` already contains the correction.

## #330 — Environment Variables

Active page: `src/content/docs/docs/getting-started/environment-variables.md`.

| Candidate claim | Status | Release evidence | Current page | Smallest fresh page-scoped replacement |
|---|---|---|---|---|
| `PORT=8001` is mandatory on Railway and Flask falls back to `5000`. | **Validated** as a discrepancy. `run_default_server()` reads `PORT` with an `8001` fallback: `automem/runtime_wiring.py:81-83`. The release code does not establish a Railway-specific mandate. | Current false claim at `environment-variables.md:41-43`. | Replace only the caution with: “AutoMem defaults `PORT` to `8001` when unset. If you configure `PORT`, ensure callers use that same port.” Do not retain “mandatory on Railway” or “Flask defaults to 5000.” |
| `SEARCH_WEIGHT_RELEVANCE` is an LLM score. | **Validated** as a discrepancy. It reads consolidation's `relevance_score`, documented in code as access patterns plus age; default weight is `0.0`: `automem/utils/scoring.py:212-215,250-261`; `automem/config.py:472-482`. | `environment-variables.md:134-144`. | Replace that one row with: “Weight on consolidation-decay `relevance_score` (access patterns + age); `0.0` disables it.” The PR's extra “Experimental” label is **invalidated**: the release source does not designate it experimental. |
| `LOG_LEVEL=INFO` and `FLASK_ENV=production` are AutoMem API-server variables. | **Validated** as a discrepancy. A release-tree `git grep` over Python source finds neither identifier; the actual server startup is `automem/runtime_wiring.py:81-92`. | `environment-variables.md:179-184`. | Delete only the `### API Server` heading and its two-row table, as #330 does. |
| Test defaults are `AUTOMEM_STOP_DOCKER=0` and both test tokens are unset. | **Validated** as a discrepancy. Stop defaults to `"1"`; API and admin tokens default to `test-token` / `test-admin-token`: `tests/test_integration.py:53-67,104-110,131-138`. | `environment-variables.md:212-220`. | Update the three defaults. Qualify the stop description: “Auto-stop Docker Compose **started by the test fixture**; set `0`, `false`, or `no` to leave it running,” because teardown is conditional on `started_here`: `tests/test_integration.py:76-92`. |
| The MCP table omits `AUTOMEM_PARENT_WATCHDOG_MS`. | **Validated** for the paired MCP release (not an AutoMem-server setting). It is read on startup; invalid/zero/negative values fall back to 30 seconds, and positive values floor at 100 ms: `mcp-automem@9a0bbf75:src/index.ts:478-485`; `src/lifecycle.ts:17-18,29-40`. | MCP table ends at `environment-variables.md:192-201`. | Add the #330 row unchanged. |

**Disposition:** take #330's narrow content changes with the three wording
qualifications above. No overlap is already fixed on `origin/main`.

## #331 — Troubleshooting

Active page: `src/content/docs/docs/operations/troubleshooting.md`.

| Candidate claim | Status | Release evidence | Current page | Smallest fresh page-scoped replacement |
|---|---|---|---|---|
| Set `HEALTH_MONITOR_AUTO_RECOVER=true` to turn on recovery. | **Validated** as a discrepancy. `auto_recover` is a constructor argument defaulting to `False`, and the CLI flag supplies it: `scripts/health_monitor.py:40-64,373-405`. A release-tree search finds no `HEALTH_MONITOR_AUTO_RECOVER`. | `troubleshooting.md:364-371`. | Use #331's command: `python scripts/health_monitor.py --auto-recover`, and say recovery is off by default. |
| Dimension auto-detection lives in `api/memory.py` and is selected with `EMBEDDING_PROVIDER=auto`. | **Validated** as a discrepancy. Existing-collection dimension detection and strict mode are in `automem/utils/validation.py:36-43,61-85`; `VECTOR_SIZE_AUTODETECT` defaults to enabled at `:65-72`. | `troubleshooting.md:491-496`. | Use #331's replacement, but pin its source link to `e147c352b100ebbf29e6555453fdde5152066138` rather than `969755d`. |
| Qdrant keyword-index setup is in `stores/vector_store.py`. | **Validated** as a discrepancy. `vector_store.py` only builds tag filters: `automem/stores/vector_store.py:10-30`. Startup creates payload indexes in `automem/stores/runtime_clients.py:149-180`, gated by `QDRANT_ENSURE_PAYLOAD_INDEXES`. | `troubleshooting.md:588-590`. | Use #331's payload-index sentence, with the permalink repinned to `e147c352b100ebbf29e6555453fdde5152066138`. |
| The 768d-to-1024d example is OpenAI → Voyage. | **Validated** as a discrepancy. OpenAI small is 1536d native (with optional `VECTOR_SIZE` truncation): `automem/config.py:127-135`; FastEmbed's default dimension is 768 and its base model is 768d: `automem/embedding/fastembed.py:15-20,31-49`. | `troubleshooting.md:485-489`. | Change only Scenario 1 to FastEmbed (768d) → Voyage (1024d), as #331 does. |
| The monitor file is repo-root `health_monitor.py`. | **Validated** as a discrepancy. The release command and argparse entrypoint are in `scripts/health_monitor.py:360-405`. | Mermaid label at `troubleshooting.md:320-325`. | Change only the label to `scripts/health_monitor.py`. |

**Disposition:** #331's factual corrections validate. Its two newly changed
GitHub permalinks should use the audited release SHA, not its later `969755d`
snapshot.

## #332 — Background Processing

Active page: `src/content/docs/docs/architecture/background-processing.md`.

| Candidate claim | Status | Release evidence | Current page | Smallest fresh page-scoped replacement |
|---|---|---|---|---|
| `/health` has `embedding.queue_depth`, `consolidation.last_runs`, and `consolidation.next_runs`. | **Validated** as a discrepancy. Release `/health` includes enrichment, counts, sync status, and vector dimensions—not embedding or consolidation blocks: `automem/api/health.py:87-110`. Scheduling/history are returned by `/consolidate/status`: `automem/api/consolidation.py:43-66`. | `background-processing.md:230-243`. | Apply #332's three real `/health` rows plus the one sentence directing scheduling/history to `/consolidate/status`; pin any new source URLs to `e147c352b100ebbf29e6555453fdde5152066138`. |
| All four operational endpoints require an admin token. | **Validated** as a discrepancy. Only reprocess calls the admin guard: `automem/api/enrichment.py:36-66`; the two consolidate routes do not: `automem/api/consolidation.py:22-69`. The ordinary API-token hook is global: `app.py:266-282`. | `background-processing.md:245-254`. | Rename the section and add the per-row Auth column exactly as #332 proposes. |
| Relationship-cache deep link points to `consolidation.py:152`. | **Validated** as a discrepancy. The cache is `@lru_cache(maxsize=10000)` at `consolidation.py:201-216`; line 152 is not the cache. | `background-processing.md:306-309`. | Repoint only this link to `consolidation.py:201-216` at `e147c352b100ebbf29e6555453fdde5152066138` (not #332's `969755d`). |

**Disposition:** #332 is content-correct for the release. Rebase its one new
cache-source link to the release SHA as part of the smallest replacement.

## #333 — Performance Tuning

Active page: `src/content/docs/docs/operations/performance.md`.

| Candidate claim | Status | Release evidence | Current page | Smallest fresh page-scoped replacement |
|---|---|---|---|---|
| Batch accumulation continues with 0.1-second polling sleeps. | **Validated** as a discrepancy. The worker calls `embedding_queue.get(timeout=timeout)`, flushes a partial batch on `Empty`, and sleeps one second only in the outer error path: `automem/embedding/runtime_pipeline.py:51-84`. **Invalidated** as written in #333: its replacement says the queue call always uses `timeout=EMBEDDING_BATCH_TIMEOUT_SECONDS`, but the release actually computes `max(0.1, batch_deadline - now)`: `:51,59-74`. | `performance.md:83-89`. | Replace step 5 with: “Otherwise keep blocking on the queue until the batch deadline. The worker calls `get()` with the remaining deadline (minimum 0.1s), flushes a partial batch on timeout, and sleeps 1s only during error recovery.” |
| Recall logs use `Recall completed`, and the documented grep commands therefore work. | **Validated** as a discrepancy. The release message is `recall_complete`: `automem/api/recall.py:2581-2599`. | `performance.md:225-240,269-280`. | Change the sample and both grep expressions to `recall_complete`, as #333 does. |
| The recall field table is complete with eight fields. | **Validated** as a discrepancy. The log `extra` also emits `has_exclude_filter`, `dedup_removed`, `is_multi`, and `context_language`: `automem/api/recall.py:2583-2598`. | `performance.md:242-253`. | Add exactly #333's four rows. |

**Disposition:** do not land #333 verbatim. Its logging/table updates are
release-correct; make the one-sentence batch wording precise before carrying it
forward.

## Reconciliation summary

- **Fresh page work still needed:** #330 (with three wording fixes), #331,
  #332, and #333 (with one wording fix).
- **Already fixed on website `origin/main`:** none.
- **Do not reuse later-source URLs:** #331 and #332 introduce `969755d`
  permalinks; use the audited `e147c352b100ebbf29e6555453fdde5152066138`
  release SHA wherever a new AutoMem source permalink is retained.
