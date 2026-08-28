# Release audit: PRs #267–#272

**Audit target:** `origin/main` at `f93b17b` (read-only).
**Server release baseline:** `automem` 0.16.2, `e147c352b100ebbf29e6555453fdde5152066138`.
**MCP release baseline:** `mcp-automem` 0.16.0, `9a0bbf754dd31db524da25638b0e97907e32ff37`.

`Valid` means the proposed fact is supported by the named release source; `Invalid`
means the proposed replacement itself is wrong or over-broad at that baseline;
`Already fixed` means the current target page already says the supported fact.
Historical SHA refreshes are assessed as fresh release work, not merely as links that
happen to resolve.

## #267 — `docs/development/testing`

Target page: `src/content/docs/docs/development/testing.md`.

| PR claim/replacement | Classification | Release and target evidence |
|---|---|---|
| `calculate_relevance_score()` accepts one memory dictionary, rather than the five keyword arguments in the target example. | **Valid** | The release signature is `calculate_relevance_score(self, memory, current_time=None)` and reads its fields from `memory` (`consolidation.py:227-266`). The target still passes `memory_id=`, `access_count=`, and `created_at=` (`testing.md:183-190`), which would raise `TypeError`. |
| `FakeGraph` starts at line 42; its observable state is `queries`, `deleted`, `archived`, and tuple-list `updated_scores`; `FakeVectorStore` records `deletions`. | **Valid** | Release: `tests/support/fake_graph.py:42-50,68-75,97-100,125-134`; `tests/test_consolidation_engine.py:19-24`. The target still documents the obsolete `query_history`, `deleted_nodes`, `archived_nodes`, and `deleted_ids` names (`testing.md:131-140,250-281`). |
| Creative sample rows are `[id, content, type, embedding, timestamp]`, and legacy graph-backed cluster rows are `[id, content, embedding, type]`. | **Valid** | Release query/parser: `consolidation.py:343-365,529-554`; release tests use those shapes at `tests/test_consolidation_engine.py:73-77,105-109`. The target examples omit those columns (`testing.md:207-223`). |
| Decay rows are `[id, content, last_accessed, importance, timestamp, relevance_score]`. | **Invalid** | The release `_apply_decay()` query returns **`[id, content, timestamp, importance, last_accessed, old_score]`** (`consolidation.py:1045-1073`). PR #267 reverses the two timestamps. Its sample happens not to expose the error because both fixture timestamps are valid strings. |
| `vector_store.deletions` should be inspected with `selector.get("point_ids")`. | **Invalid** | The release's dummy-client path sends `{"points": [memory_id]}` (`consolidation.py:706-717`); the release test deliberately accepts `point_ids` **or** `points` (`tests/test_consolidation_engine.py:281-286`). The PR's proposed `point_ids`-only assertion is not portable to the tested path. |
| Repointing AutoMem links to `8ff266e` and the mcp CI link to `946f9e5` produces a current source-note/CI section. | **Invalid** | Neither is the requested release baseline. More importantly, MCP 0.16.0's workflow includes `Format check` and an installer e2e step in addition to the page's five listed steps (`mcp-automem@9a0bbf7:.github/workflows/ci.yml:50-89`); the target's claim that the five-step list is the workflow remains stale (`testing.md:443-451`). |

**Overlap context:** #267 and #271 both touch response/testing fixtures only as
documentation consumers; no file overlap exists with the other PRs in this cohort.

**Smallest fresh single-page replacement:** replace #267 with one revision to
`docs/development/testing.md`: retain the signature and mock-name fixes; correct the
decay fixture order to `timestamp` before `last_accessed`; accept both selector forms
in the fake-vector assertion; and update the MCP CI list/link against `9a0bbf7`.

## #268 — `docs/core-concepts/hybrid-search`

Target page: `src/content/docs/docs/core-concepts/hybrid-search.md`.

| PR claim/replacement | Classification | Release and target evidence |
|---|---|---|
| `SEARCH_WEIGHT_RELEVANCE` weights consolidation `relevance_score`; `context_bonus` is separately added without that weight. | **Valid** | The release retrieves `memory["relevance_score"]` (`automem/utils/scoring.py:212-215`) and adds both `SEARCH_WEIGHT_RELEVANCE * relevance_score` and bare `context_bonus` (`:246-262`). The target instead multiplies `context_bonus` (`hybrid-search.md:201-213,219-230`). |
| There is no final-score normalization; scores may exceed 1.0. | **Valid** | `_compute_metadata_score()` returns the raw sum (`scoring.py:250-262`); recall stores it directly (`automem/api/recall.py:1687-1699`) and entity expansion adds another `0.15` (`:1468-1478`). The target asserts normalization three times and renders a Normalize node (`hybrid-search.md:215,232,266-302`). |
| Missing/non-numeric `importance` and `confidence` contribute `0.0`, and recency uses `timestamp`, with configurable linear/exp curves and a 180-day default window. | **Valid** | Release scoring uses numeric-or-`0.0` for confidence and recency from `memory.get("timestamp")` (`scoring.py:163-166`); the recency implementation and config are at `:66-81` and `automem/config.py:495-503`. The target retains the 0.5/0.7 and `last_accessed` claims (`hybrid-search.md:181-191`). |
| Refreshing source links from `0720da2` to `8ff266e` is the correct current rebaseline. | **Invalid** | It is an older verification SHA, not 0.16.2. A fresh release-aligned change must use `e147c352…` for files whose notes are being rebaselined; the target still carries `0720da2` links. |

**Overlap context:** #268 and #272 both explain `SEARCH_WEIGHT_RELEVANCE`; one
release-aligned wording should be reused, but the pages have distinct audiences.

**Smallest fresh single-page replacement:** a fresh update to
`docs/core-concepts/hybrid-search.md` may preserve #268's substantive scoring,
defaults, recency, and diagram corrections, but must repin source notes to `e147c352…`
rather than `8ff266e`.

## #269 — `docs/graph-viewer/overview`

Target page: `src/content/docs/docs/graph-viewer/overview.md`.

No graph-viewer release SHA was supplied. These viewer-only claims were therefore
checked against the PR's cited `c6338d13…`; the same three files are unchanged at the
available checkout head `b63b718e` (`git diff c6338d13..b63b718e --` those paths is
empty). The two supplied AutoMem/MCP releases do not govern these UI claims.

| PR claim/replacement | Classification | Source and target evidence |
|---|---|---|
| `Enter` and `/` are not shortcuts; the actual navigation/action map includes arrows, Shift+Up/Down, Tab, Escape, P, R/Shift+R, comma, L, and `?`. | **Valid** | `automem-graph-viewer@c6338d13:src/hooks/useKeyboardNavigation.ts:151-292` registers exactly that map, with no `Enter` or `/`. The target still states the two nonexistent bindings (`overview.md:84-88`). |
| Force settings have five fields, including `linkStrength`, and the real property is `centerStrength`. | **Valid** | `src/lib/types.ts:130-175` defines five fields and their ranges/defaults. The target has four rows and says “Center gravity” (`overview.md:41-48`). |
| The 2,000-node cap is client-side, defaulted by `MAX_SNAPSHOT`, and can be overridden by `?cap=` or `localStorage.automem_snapshot_cap`. | **Valid** | `src/api/client.ts:169-201` defines the cap and both overrides, documenting the on-main-thread simulation limit. The target still calls it “the most important memories first” (`overview.md:39`). |

**Smallest fresh single-page replacement:** update only
`docs/graph-viewer/overview.md`, retaining #269's shortcut table, force-config table,
and client-cap explanation. Do not describe this as an AutoMem 0.16.2 or MCP 0.16.0
release rebaseline without a graph-viewer release reference.

## #270 — `docs/reference/api/health`

Target page: `src/content/docs/docs/reference/api/health.md`.

| PR claim/replacement | Classification | Release and target evidence |
|---|---|---|
| `/health` returns JSON through a bare `jsonify(health_data)`, so degraded health is still HTTP 200. | **Already fixed** | Release `automem/api/health.py:87-111` returns `jsonify` without a status override. The target already says HTTP 200 and renders it in the flow (`health.md:38,75,145-150`). |
| `status` is also degraded when `vector_count < memory_count` / `sync_status == "drift_detected"`. | **Already fixed** | Release `health.py:59-76`; target covers it at `health.md:68-75,111,149`. |
| `/analyze` success includes top-level `elapsed_ms: 0`, which is a hardcoded sentinel rather than a measurement. | **Valid** | Release `automem/api/recall.py:2867-2891` returns `{"status", "analytics", "elapsed_ms": 0}`. The target example omits it (`health.md:216-240`). |
| `AUTOMEM_LOG_LEVEL` belongs to the MCP client, while the Python service initializes logging at INFO. | **Already fixed** | Server release: `app.py:95-98` and `automem/runtime_environment.py:9-14`; MCP release reads the variable at `mcp-automem@9a0bbf7:src/index.ts:90-97,487-490`. The target already states the service behavior (`health.md:414-416`). |
| Replacing source-note SHA `0720da2` with `8ff266e` is a fresh correction. | **Invalid** | The current target has already moved all health-note links to newer `5df0b83…` (`health.md:8-13`), and the requested release baseline is `e147c352…`, not `8ff266e`. |

**Overlap context:** #270 and #272 share the logging-origin correction; it is already
settled on this page but still stale in the environment-variable reference.

**Smallest fresh single-page replacement:** do **not** reopen #270. If a follow-up is
wanted, make a one-page, one-example patch to `docs/reference/api/health.md` that adds
`"elapsed_ms": 0` plus its hardcoded-value note; retain the current newer source-note
links.

## #271 — `docs/reference/api/memory-operations`

Target page: `src/content/docs/docs/reference/api/memory-operations.md`.

| PR claim/replacement | Classification | Release and target evidence |
|---|---|---|
| `POST /memory/batch` requires an object containing a nonempty `memories` array; a bare array returns 400. | **Valid** | Release `automem/api/memory.py:1123-1158` documents and validates the object form. The target presents a bare array in both examples (`memory-operations.md:325-355`). |
| A batch larger than 500 returns 400, and unavailable FalkorDB can return 503. | **Valid** | Size validation is `abort(400)` at `memory.py:1138-1142`; no graph is `abort(503)` at `:1263-1267`. The target claims 413 and omits 503 (`memory-operations.md:373-380`). |
| `qdrant` is never `"ok"`; replacing both the single and batch examples with `"queued"` and listing only five simple status pairs is accurate. | **Invalid** | `"ok"` is indeed absent. Single-store values are handled at `memory.py:672-726`, so a no-embedding configured-Qdrant example can be `"queued"`. But batch ingest computes its own values: `"unconfigured"`, `"stored (N)"`, `"stored (N), queued (N)"`, `"queued (fallback)"`, or `"queued"` (`:1304-1357,1372-1383`). PR #271's batch `"queued"` example and its cross-endpoint correlation table overgeneralize. The target's two `"ok"` fields remain wrong (`memory-operations.md:240,365`). |
| Every endpoint uses the app-wide `{status, code, message}` error envelope. | **Invalid** | `abort()` paths do receive that envelope through `app.py:471-488`, so it is suitable for the batch validation example. It is not universal: `/analyze` directly returns `{"error": "Analyze failed", "details": ...}` on its local exception path (`automem/api/recall.py:2888-2891`). The replacement must scope the envelope to the documented batch/Flask `HTTPException` paths, not “all endpoints.” |
| `memory.py` should be source-noted at `8ff266e`. | **Invalid** | A fresh release audit needs `e147c352…`; the target remains at the older `ebcf5f16…` (`memory-operations.md:8-12`). |

**Overlap context:** #271's batch envelope/statuses are separate from #270's `/analyze`
exception shape; the latter is precisely why a site-wide envelope claim should not be
introduced here.

**Smallest fresh single-page replacement:** update only
`docs/reference/api/memory-operations.md`: use the object request body; document 400
and 503; show a truthful single-store `queued` example and a batch result such as
`"stored (2)"` (or label it explicitly as an example of a variant); scope the error
envelope; and pin `memory.py` to `e147c352…`.

## #272 — `docs/getting-started/environment-variables`

Target page: `src/content/docs/docs/getting-started/environment-variables.md`.

| PR claim/replacement | Classification | Release and target evidence |
|---|---|---|
| The server defaults `PORT` to 8001, not Flask's 5000. | **Valid** | `automem/runtime_wiring.py:81-83` uses `os.environ.get("PORT", "8001")`. The target repeats the 5000/Railway warning (`environment-variables.md:39-43`). |
| Railway sets `PORT` for you. | **Invalid** | This platform-behavior assertion is not evidenced by either supplied release source. It should not be carried into a source-backed correction without independent Railway documentation. |
| The Python service has no `LOG_LEVEL`, `FLASK_ENV`, or `FLASK_DEBUG` configuration; it initializes logging at INFO. | **Valid** | Release startup calls `configure_logging(level=logging.INFO)` (`app.py:95-98`), whose function only accepts an explicit argument (`automem/runtime_environment.py:9-14`); no service source reads those variables. The target still documents `LOG_LEVEL` and `FLASK_ENV` (`environment-variables.md:179-184`). |
| `SEARCH_WEIGHT_RELEVANCE` weights consolidation-decay `relevance_score`, defaulting to an inert 0.0; it is not LLM-scored relevance. | **Valid** | Release config default: `automem/config.py:473-482`; scoring meaning: `automem/utils/scoring.py:212-215,250-262`. The target calls it LLM-scored (`environment-variables.md:130-144`). |
| `JIT_ENRICHMENT_ENABLED` runs lightweight enrichment during recall for memories not yet handled by the background worker, rather than inline on store. | **Valid** | Release config comment/flag: `automem/config.py:119-125`; runtime wiring supplies it as `jit_enrich_fn` to recall at `automem/runtime_wiring.py:39-57`. The target says “inline on store” (`environment-variables.md:87-101`). |

**Smallest fresh single-page replacement:** update only
`docs/getting-started/environment-variables.md` with #272's four source-supported
facts, but omit “Railway sets it for you” and avoid asserting that debug/hot reload are
globally unavailable beyond this service's own configuration.

## Disposition

None of #267–#272 should be revived unchanged. The smallest release-aligned
single-page follow-ups are, respectively: `testing.md`, `hybrid-search.md`,
`graph-viewer/overview.md`, `health.md` (elapsed-ms only),
`memory-operations.md`, and `environment-variables.md`. The existing `health.md`
content means #270 is mostly superseded; all other target pages still contain the
underlying stale claims noted above.
