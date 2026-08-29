import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const defaultPagePath = fileURLToPath(
  new URL('../src/content/docs/docs/cli/queue.md', import.meta.url),
);
const pagePath = process.env.QUEUE_DOCS_PAGE_PATH || defaultPagePath;
const releaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('queue docs match the audited mcp-automem 0.16.0 queue and type surfaces', async () => {
  const page = await readPage();

  assert.match(page, new RegExp(releaseSha, 'u'));
  assert.doesNotMatch(page, /538721c/u);
  assert.match(page, /memory-queue\.jsonl/u);
  assert.doesNotMatch(page, /\.jsonll/u);

  const queueSection = page.split('## Queue Processing CLI Command')[1];
  assert.ok(queueSection, 'queue section is present');
  assert.match(queueSection, /storeMemory[\s\S]*associateMemories/i);
  assert.doesNotMatch(queueSection, /POST \/memory or PATCH \/memory\/\{id\}/u);
  assert.doesNotMatch(queueSection, /PATCH \/memory\/\{id\}/u);
  assert.match(queueSection, /AutoMem endpoint unavailable; skipping queue drain\./u);
  assert.doesNotMatch(queueSection, /Service unavailable - skipping queue processing/u);
  assert.doesNotMatch(queueSection, /Queue will be retried on next run/u);

  for (const field of [
    'falkordb',
    'qdrant',
    'graph',
    'timestamp',
    'memory_count',
    'vector_count',
    'sync_status',
    'vector_dimensions',
    'enrichment',
  ]) {
    assert.match(page, new RegExp('statistics\\.' + field, 'u'));
  }
  assert.match(page, /`statistics\.falkordb`[\s\S]*`any`/u);
  assert.match(page, /`statistics\.qdrant`[\s\S]*`any`/u);

  assert.match(page, /\| `t_valid` \| `string` \(ISO\) \| No \|/u);
  assert.match(page, /\| `t_invalid` \| `string` \(ISO\) \| No \|/u);
});
