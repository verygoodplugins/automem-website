# Introduction documentation reconciliation report

## Source

- AutoMem 0.16.2, commit `e147c352b100ebbf29e6555453fdde5152066138` only.
- Verified `app.py` has 526 lines; `MemoryClassifier` checks regex patterns before its LLM fallback; and `runtime_memory_routes.py` persists FalkorDB first, queues enrichment and ordinary embeddings, and exposes the documented response statuses.

## Changes

- Corrected omitted-type classification to regex-first, LLM-second, with the `Memory`/`0.3` fallback.
- Updated the `app.py` size from approximately 506 to 526 lines.
- Replaced the universal synchronous embedding narrative with the release-supported store order and queued/provided/unconfigured status behavior.
- Corrected hybrid recall scoring from nine to ten components.
- Added `tests/introduction-docs.test.mjs`, a static regression test that asserts each correction and rejects the superseded wording.

## Verification

- Red: `node --test tests/introduction-docs.test.mjs` failed against the former LLM-only classification text.
- Green: focused test passed (1 passed, 0 failed).
- `npm test` passed (83 passed, 0 failed, 1 skipped because `data/emdash.db` is absent).
- `npm run build` completed successfully. It emitted existing Astro markdown-plugin deprecation and Vite unused-import warnings.
- `git diff --check` passed.

### Fix round 1

- Expanded the focused static test to require the full fallback trigger: no usable LLM result **or** LLM failure, both falling back to `Memory` at `0.3`.
- Added exact assertions for `embedding_status: skipped` with `qdrant: unconfigured`, plus enrichment's `queued` and `disabled` outcomes; negative assertions reject the former incomplete status claims.
- `node --test tests/introduction-docs.test.mjs` passed (1 passed, 0 failed).
- `git diff --check` passed.

## Commit

- `docs: reconcile introduction release behavior`
- `docs: guard introduction status semantics`

## Self-review

- Scope is limited to the Introduction page, its focused test, and this requested report. No legacy branch content was rebased or cherry-picked.
- The status wording distinguishes ordinary stores without a Qdrant client (`embedding_status: skipped`, `qdrant: unconfigured`) from configured queueing and caller-provided embeddings.
