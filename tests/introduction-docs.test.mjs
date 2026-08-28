import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/getting-started/introduction.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('introduction documents the audited AutoMem 0.16.2 storage and recall behavior', async () => {
  const page = await readPage();

  assert.match(
    page,
    /regex patterns first[\s\S]*LLM only when no pattern matches[\s\S]*`Memory` with confidence `0\.3`/i,
  );
  assert.match(
    page,
    /If the LLM returns no usable result or fails, AutoMem falls back to `Memory` with confidence `0\.3`/i,
  );
  assert.doesNotMatch(page, /LLM-based classification/i);
  assert.doesNotMatch(page, /falls back to `Memory` with confidence `0\.3` only when the LLM fails/i);

  assert.match(page, /`app\.py` is a ~526-line orchestration file/i);
  assert.doesNotMatch(page, /`app\.py` is a ~506-line orchestration file/i);

  assert.match(
    page,
    /canonical memory record is stored in FalkorDB[\s\S]*enrichment is queued[\s\S]*ordinary embedding work is queued/i,
  );
  assert.match(page, /caller-supplied embedding is attempted inline/i);
  assert.match(page, /`embedding_status` and the Qdrant status are `queued`/i);
  assert.match(page, /`embedding_status` as `provided`/i);
  assert.match(
    page,
    /when Qdrant is unavailable for an ordinary store, `embedding_status` is `skipped` and the Qdrant status is `unconfigured`/i,
  );
  assert.doesNotMatch(page, /when Qdrant is unavailable[\s\S]*`embedding_status` is `queued`/i);
  assert.match(
    page,
    /The enrichment response status is `queued` when its worker queue is available and `disabled` otherwise/i,
  );
  assert.doesNotMatch(page, /The enrichment response status is always `queued`/i);
  assert.doesNotMatch(page, /EmbeddingProvider generates a vector representation/i);
  assert.doesNotMatch(page, /Qdrant stores the vector for semantic search/i);

  assert.match(page, /10-component relevance score/i);
  assert.doesNotMatch(page, /9-component relevance score/i);
});
