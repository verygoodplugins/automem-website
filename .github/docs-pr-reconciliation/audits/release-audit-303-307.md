# Release audit: legacy PRs #303–#307

Audited 2026-08-28, read-only. Website baseline: `origin/main` at
`f93b17b7a6afd945ed5d5e31d1ff5cd4f9fcff0b`. Source baselines:
`automem@e147c352b100ebbf29e6555453fdde5152066138` (0.16.2) and
`mcp-automem@9a0bbf754dd31db524da25638b0e97907e32ff37` (0.16.0).

Status meanings: **valid** means the PR's correction matches the pinned source;
**already fixed** means that correction is present on `origin/main`; **invalid**
means the proposed correction does not match the pinned source.

## PR #303 — Guided Cloud Setup

Target: `src/content/docs/docs/cli/guided-cloud-setup.md`.

| Claim | Status | Pinned-source evidence | `origin/main` evidence |
|---|---|---|---|
| CI-related environment variables infer `--yes`. | **valid** correction: they do not. `AUTOMEM_YES` is the only approval environment input, and `--yes`/`-y` are explicit flags. `CI`, `CODEX`, and `CLAUDE_CODE` only disable animation; `GITHUB_ACTIONS` has no `src/` reference. | `mcp-automem@9a0bbf7:src/cli/install.ts:686,733-735,2046-2082`; `src/cli/install-ui.ts:217-222` | The false assertion remains at `guided-cloud-setup.md:126-128`. |
| Guided Railway can reuse an existing deployment. | **valid** correction: generic orchestration has a reuse branch, but Railway's only live provider returns an empty deployment list, so its selector is unreachable and it always deploys fresh. | `mcp-automem@9a0bbf7:src/cli/cloud/orchestrate.ts:41-53,68-82`; `src/cli/cloud/railway.ts:338-343` | The unsupported Railway-reuse promise remains at `guided-cloud-setup.md:71-73,163-164`. |
| The existing-endpoint fallback is **Other — I already have a URL + key**. | **valid**. | `mcp-automem@9a0bbf7:src/cli/install.ts:1774-1797` | The page instead tells users to choose the unreachable reuse option at `guided-cloud-setup.md:163-164`. |
| Qdrant health uses `"unavailable"` when absent. | **valid** correction: health emits `"disconnected"`; absent Qdrant makes the overall status `"degraded"`. | `automem@e147c35:automem/api/health.py:70-76,87-111` | The non-existent value remains at `guided-cloud-setup.md:151`. |

Smallest fresh single-page replacement: recreate the four hunks from #303 only on
`cli/guided-cloud-setup.md`: correct the headless note, add the Railway-specific
reuse limitation plus **Other** fallback, change the Qdrant value/status, and
replace the two troubleshooting remedies. No other page is required.

## PR #304 — Railway Deployment

Target: `src/content/docs/docs/deployment/railway.md`.

| Claim | Status | Pinned-source evidence | `origin/main` evidence |
|---|---|---|---|
| The service uses Flask + Gunicorn. | **valid** correction: the image runs `python app.py`; requirements include Flask but no Gunicorn. | `automem@e147c35:Dockerfile:14-29`; `requirements.txt:2-3` | `railway.md:35` still labels the node “Flask + Gunicorn”. |
| `/health` returns 503 when FalkorDB is unavailable. | **valid** correction: availability only changes the payload status; the route returns `jsonify(health_data)` with no non-200 branch. | `automem@e147c35:automem/api/health.py:20-25,70-76,87-111` | The 503 diagram branch remains at `railway.md:210-213`. |
| Failed backends are reported as `"unavailable"`. | **valid** correction: both fields have only `connected` and `disconnected` values. | `automem@e147c35:automem/api/health.py:87-90` | Both fabricated values remain at `railway.md:212,222`. |

Smallest fresh single-page replacement: recreate #304's three diagram-label edits
on `deployment/railway.md`—Flask runtime, FalkorDB degraded branch, and Qdrant
degraded branch. No supporting prose change is needed.

## PR #305 — Development Testing

Target: `src/content/docs/docs/development/testing.md`.

| Claim | Status | Pinned-source evidence | `origin/main` evidence |
|---|---|---|---|
| `FakeGraph` begins at line 35 and the linked file ends at line 795. | **valid** correction: the helper occupies line 35, `FakeGraph` begins at line 42, and the pinned file has 847 lines. | `automem@e147c35:tests/support/fake_graph.py:35-49` | The stale permalink/range remains at `testing.md:129-132`. |
| `calculate_relevance_score` accepts separate `memory_id`, `importance`, `access_count`, `last_accessed`, and `created_at` keyword arguments. | **valid** correction: it accepts one memory dictionary (plus optional current time), reads `timestamp` and `last_accessed` from that dictionary, and requires its `id`. | `automem@e147c35:consolidation.py:227-259`; `tests/test_consolidation_engine.py:47-59` | The invalid call remains at `testing.md:177-190`. |
| `iso_days_ago()` subtracts from `FROZEN_TIME`. | **valid** correction: the real helper constructs its fixed UTC base inline; no such constant is needed. | `automem@e147c35:tests/test_consolidation_engine.py:42-44` | The undefined symbol remains at `testing.md:159-164`. |
| Mock observation fields are `deleted_nodes`, `archived_nodes`, `query_history`, `deleted_ids`, and a dict-like `updated_scores`. | **valid** correction: the actual fields are `deleted`, `archived`, `updated_scores`, `queries`, and vector-store `deletions`; the last three use tuple shapes. | `automem@e147c35:tests/support/fake_graph.py:49-75,97-100,125-133`; `tests/test_consolidation_engine.py:19-24,252-286` | Every stale field name remains in the examples at `testing.md:244-282`. |

Smallest fresh single-page replacement: recreate the five #305 documentation
hunks on `development/testing.md` (permalink, timestamp helper, relevance example,
forgetting assertions, and mock-interaction examples). The change is isolated to
that page.

## PR #306 — Memory Operations

Target: `src/content/docs/docs/reference/api/memory-operations.md`.

| Claim | Status | Pinned-source evidence | `origin/main` evidence |
|---|---|---|---|
| `POST /memory/batch` accepts a bare JSON array. | **valid** correction: it requires an object containing a non-empty `memories` array. | `automem@e147c35:automem/api/memory.py:1123-1142` | The bare schema, instruction, and curl body remain at `memory-operations.md:325-355`. |
| A batch above 500 returns 413. | **valid** correction: the guard calls `abort(400, ...)`. | `automem@e147c35:automem/api/memory.py:1138-1142` | The false 413 row remains at `memory-operations.md:373-380`. |
| Validation errors use `{ "error", "index" }`. | **valid** correction: the global handler emits `{ "status", "code", "message" }` for HTTP exceptions. | `automem@e147c35:app.py:471-488`; `automem/api/memory.py:1146-1157` | The fabricated envelope remains at `memory-operations.md:382-388`. |
| MCP `delete_memory` requires only `memory_id`. | **valid** correction: it supports XOR single-ID and bulk-by-tag modes; the tag mode is exact, case-insensitive, any-of, and has no dry run. | `mcp-automem@9a0bbf7:src/mcp-surface.ts:894-915,1213-1234`; `src/types.ts:346-350` | The one-parameter table remains at `memory-operations.md:612-620`. |
| Platform and `YYYY-MM` date tags are recommended convention. | **valid** correction: policy explicitly prohibits namespace prefixes, platform tags, and date-stamped tags. | `mcp-automem@9a0bbf7:src/memory-policy/shared.ts:494-498,650-655,1031-1035` | The prohibited tag patterns and example remain at `memory-operations.md:192-200,273-285`. |

Smallest fresh single-page replacement: recreate #306's five clusters on
`reference/api/memory-operations.md`: bare-tag guidance/table/example, batch
object schema and curl, 400-only batch validation status, actual error envelope,
and the two-mode `delete_memory` table. Do not combine this with Queue Management.

## PR #307 — Queue Management

Target: `src/content/docs/docs/cli/queue.md`.

| Claim | Status | Pinned-source evidence | `origin/main` evidence |
|---|---|---|---|
| The command example uses `.jsonll`. | **valid** correction: the default path and JSONL convention use `.jsonl`. | `mcp-automem@9a0bbf7:src/cli/queue.ts:113-128` | The copy-paste typo remains at `queue.md:300-310`. |
| Queue draining can PATCH an existing memory. | **valid** correction: each accepted record calls `storeMemory`; `relatesTo` records receive a later association call, not a PATCH. | `mcp-automem@9a0bbf7:src/cli/queue.ts:170-205,213-230` | The false PATCH branch remains in the diagram at `queue.md:325-330`. |
| Unhealthy-endpoint output is the documented three-line transcript. | **valid** correction: the exact emitted message is one line: `AutoMem endpoint unavailable; skipping queue drain.` | `mcp-automem@9a0bbf7:src/cli/queue.ts:135-140` | The invented three-line transcript remains at `queue.md:351-360`. |
| `HealthStatus.statistics` has only four fields and backend statuses are strings. | **valid** correction: it declares nine optional statistic members; `falkordb` and `qdrant` are `any`. | `mcp-automem@9a0bbf7:src/types.ts:166-181` | The incomplete/mistyped table remains at `queue.md:219-226`. |
| `UpdateMemoryArgs` lacks `t_valid` and `t_invalid`. | **valid** correction: both temporal-bound fields are accepted. | `mcp-automem@9a0bbf7:src/types.ts:331-344` | Both rows are absent from the update table at `queue.md:48-62`. |

Smallest fresh single-page replacement: recreate #307's five hunks on
`cli/queue.md`: two temporal update fields, complete optional health-statistics
table, `.jsonl`, store-then-associate diagram label, and exact unavailable output.
Keep the out-of-scope follow-ups (diagram ordering and unlink-versus-truncate) out
of this replacement.

## Cross-PR context

- #303 and #304 independently correct the same health-response fabrication:
  backend fields are `connected`/`disconnected`, and degraded health remains an
  HTTP 200 payload. They must remain two page-local changes, not one combined PR.
- #306 and #307 both describe MCP tools, but their accepted schemas are consistent
  with the 0.16.0 source. Keep their replacements separate because their target
  pages and user tasks differ.

## Conclusion

All 21 audited claims are **valid** against the requested releases; none is
already fixed on current `origin/main`, and none is invalid. Each legacy PR can
be replaced by one fresh, isolated single-page documentation PR with the scope
listed above.
