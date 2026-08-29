# Memory Operations Documentation Reconciliation

## Scope

- Updated only `src/content/docs/docs/reference/api/memory-operations.md`.
- Added `tests/memory-operations-docs.test.mjs` as a focused static regression guard.

## Source evidence

- AutoMem 0.16.2: `e147c352b100ebbf29e6555453fdde5152066138`, primarily `automem/api/memory.py` and `app.py`.
- MCP 0.16.0: `9a0bbf754dd31db524da25638b0e97907e32ff37`, primarily `src/mcp-surface.ts` and `src/automem-client.ts`.

## Reconciled contracts

- Single `POST /memory` generates server UUIDs and documents its actual Qdrant values.
- Batch requests use `{ "memories": [...] }`, omit `id`, `embedding`, `t_valid`, and `t_invalid`, return 400 for malformed/empty/oversized input, and embed/upsert synchronously with queue fallback only for failures.
- PATCH accepts `updated_at` and `last_accessed`; a content change synchronously embeds and upserts.
- Tag enumeration is not ranked recall and does not hydrate relationships.
- MCP deletion supports XOR ID/bulk-tag modes with exact, case-insensitive tag matching; missing single IDs keep the HTTP 404.
- The global error envelope and tag examples use the current policy.

## TDD and verification

- RED: `node --test tests/memory-operations-docs.test.mjs` failed all five new assertions against the stale page.
- GREEN: the focused test passes (5/5).
- `npm test`: 101 passed, 0 failed, 1 skipped (missing local CMS database).
- `npm run build`: passed. Existing Vite deprecation/chunk-size warnings remain non-blocking.
- `git diff --check`: passed.
