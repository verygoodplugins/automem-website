import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/admin.md', import.meta.url),
);

async function readAdminPage() {
  return readFile(pagePath, 'utf8');
}

test('admin API documents reembed response shapes including truncation and the no-work case', async () => {
  const page = await readAdminPage();
  const reembed = page.match(/## POST \/admin\/reembed\n([\s\S]*?)\n---/);

  assert.ok(reembed, 'expected a reembed section');
  const responseSchema = reembed[1].match(/### Response Schema\n([\s\S]*?)\n### Implementation Details/);
  assert.ok(responseSchema, 'expected a reembed Response Schema section');
  assert.match(responseSchema[1], /\| `failed_ids_truncated` \| boolean \|/);
  assert.match(responseSchema[1], /more than 10 IDs failed/i);
  assert.match(responseSchema[1], /"message": "No memories found to reembed"/);
  assert.match(responseSchema[1], /"processed": 0,\s*"total": 0/);
  assert.match(
    responseSchema[1],
    /`failed`, `batch_size`, and `metadata_preserved` are absent/,
  );
  assert.match(responseSchema[1], /\| `total` \| integer \| Number of memories selected for re-embedding/);
  assert.doesNotMatch(responseSchema[1], /Total memory count in database/);
});

test('admin API describes reembed batch failures as whole-batch and silently drops empty content', async () => {
  const page = await readAdminPage();
  const reembed = page.match(/## POST \/admin\/reembed\n([\s\S]*?)\n---/);

  assert.ok(reembed, 'expected a reembed section');
  const errorHandling = reembed[1].match(/### Error Handling\n([\s\S]*)$/);
  assert.ok(errorHandling, 'expected a reembed Error Handling section');

  assert.match(errorHandling[1], /share one `try`\/`except` per batch/);
  assert.match(errorHandling[1], /marks the whole batch failed/);
  assert.match(
    errorHandling[1],
    /retries a failed batch call one item at a time with no placeholder vectors/,
  );
  const errorIntro = errorHandling[1].split('\n| Error')[0];
  assert.match(errorIntro, /With no provider or the placeholder provider, the helper raises before any call/);
  assert.match(errorIntro, /every batch fails immediately with no retry/);
  assert.match(errorIntro, /on the provider side the batch fails only if one of those item calls fails/);
  assert.match(
    errorIntro,
    /a provider failure that remains \(a failed item call, or the immediate failure above\) or a failed Qdrant write marks the whole batch failed/,
  );
  assert.doesNotMatch(errorIntro, /a failure that survives that retry/);
  assert.match(errorIntro, /HTTP `200` `complete` with every memory counted in `failed`/);
  for (const sentence of errorIntro.split(/(?<=\.)\s+/)) {
    if (/fails only if one of those/.test(sentence)) {
      assert.match(sentence, /^With a real provider/, `unqualified absolute: ${sentence}`);
    }
  }
  assert.match(
    errorHandling[1],
    /Provider API rate limit \|[^\n]*retries the batch item by item[^\n]*only if one of those item calls fails/,
  );
  assert.match(
    errorHandling[1],
    /Wrong vector count or dimensions \|[^\n]*Helper discards the batch result and retries item by item[^\n]*only if an item call fails/,
  );
  assert.doesNotMatch(errorHandling[1], /Vector count mismatch/);
  assert.doesNotMatch(errorHandling[1], /`ValueError` raised and caught/);
  assert.match(errorHandling[1], /Qdrant connection failure \|[^\n]*whole batch counted in `failed`/);
  assert.match(errorHandling[1], /Null or empty content \|[^\n]*Filtered out silently/);
  assert.ok(
    errorHandling[1].includes(
      'logger.error(f"Failed to process batch starting at index {i}: {e}")',
    ),
    'expected the real batch-failure log call',
  );

  assert.doesNotMatch(errorHandling[1], /logger\.exception/);
  assert.doesNotMatch(errorHandling[1], /extra=/);
  assert.doesNotMatch(errorHandling[1], /structured context/i);
  assert.doesNotMatch(errorHandling[1], /Deleted between enumeration and fetch/);
  assert.doesNotMatch(errorHandling[1], /non-string content/i);

  const qdrantUpdate = reembed[1].match(/\*\*Phase 3: Qdrant Update\*\*\n([\s\S]*?)\n### /);
  assert.ok(qdrantUpdate, 'expected the Phase 3 Qdrant Update description');
  assert.match(qdrantUpdate[1], /counts the whole batch as failed, but later batches still run/);
  assert.doesNotMatch(qdrantUpdate[1], /graceful degradation/i);
  assert.doesNotMatch(qdrantUpdate[1], /don't halt the operation/i);

  const providerBatch = reembed[1].match(/\*\*Phase 2: [^\n]*\*\*\n([\s\S]*?)\n\*\*Phase 3/);
  assert.ok(providerBatch, 'expected the Phase 2 provider batch description');
  assert.match(providerBatch[1], /retries the batch one item at a time with single-input calls/);
  assert.match(providerBatch[1], /never substituting placeholder vectors/);
  assert.match(providerBatch[1], /With a real provider, the batch fails only if one of those item calls fails/);
  assert.match(
    providerBatch[1],
    /With no provider, or with the placeholder provider[^.]*falls back to when no real provider initializes\), the helper raises before any provider call, so there is no retry and every batch fails immediately/,
  );
  assert.match(providerBatch[1], /Placeholder-only or other provider failures[^.]*HTTP \*\*200\*\*/);
  for (const sentence of providerBatch[1].split(/(?<=\.)\s+/)) {
    if (/fails only if one of those/.test(sentence)) {
      assert.match(sentence, /^With a real provider/, `unqualified absolute: ${sentence}`);
    }
  }
  assert.doesNotMatch(providerBatch[1], /entire batch in a single provider call/);
});

test('admin API documents the 503 responses for reembed and sync dependencies', async () => {
  const page = await readAdminPage();
  const errorResponses = page.match(/### Error Responses\n([\s\S]*?)\n---/);

  assert.ok(errorResponses, 'expected an Error Responses section');
  for (const message of [
    'Embedding provider is not configured',
    'Qdrant is not available - cannot store embeddings',
    'FalkorDB is unavailable',
  ]) {
    assert.ok(
      errorResponses[1].includes(`{"status": "error", "code": 503, "message": "${message}"}`),
      `expected a 503 row for "${message}"`,
    );
  }
  const providerRow = errorResponses[1]
    .split('\n')
    .find((line) => line.includes('"message": "Embedding provider is not configured"'));
  assert.ok(providerRow, 'expected the embedding provider 503 row');
  assert.match(providerRow, /Returned only when the batch-embedding callable is absent, not when no real provider is configured/);
  assert.match(providerRow, /a missing or placeholder provider returns HTTP `200` `complete` with every memory in `failed`/);
  assert.doesNotMatch(providerRow, /need an embedding provider/);
  assert.match(providerRow, /stock server \(`app\.py`\) always binds that callable, so this 503 is effectively unreachable there/);
  assert.match(errorResponses[1], /`\/admin\/sync` uses the shorter message `Qdrant is not available`/);
  assert.match(errorResponses[1], /`dry_run` and `already_synced` responses are unaffected/);
});

test('admin API documents sync batch_size cap and the dry_run and already_synced responses', async () => {
  const page = await readAdminPage();
  const sync = page.match(/## POST \/admin\/sync\n([\s\S]*?)\n---/);

  assert.ok(sync, 'expected a sync section');
  assert.match(sync[1], /\| `batch_size` \| integer \| No \|[^\n]*Default: `32`\. Max: `100`/);
  assert.match(sync[1], /"status": "dry_run"/);
  for (const field of ['falkordb_count', 'qdrant_count', 'missing_count', 'orphaned_count']) {
    assert.ok(sync[1].includes(`"${field}"`), `expected dry_run field ${field}`);
  }
  assert.match(sync[1], /"missing_sample", "orphaned_sample"/);
  assert.match(sync[1], /each sample holds up to 10 IDs/);
  assert.match(sync[1], /"status": "already_synced"[^\n]*"synced": 0/);
  assert.match(sync[1], /When `dry_run` is false and nothing is missing from Qdrant/);
  assert.match(sync[1], /return before the embedding-provider check/);
});
