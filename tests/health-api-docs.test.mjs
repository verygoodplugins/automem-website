import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const healthPagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/health.md', import.meta.url),
);
const sourceSha = '5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb';

async function readHealthPage() {
  return readFile(healthPagePath, 'utf8');
}

test('health docs pin their source links to the current validated AutoMem revision', async () => {
  const page = await readHealthPage();

  assert.match(page, new RegExp(`github\\.com/verygoodplugins/automem/blob/${sourceSha}/automem/api/health\\.py`));
  assert.match(page, new RegExp(`github\\.com/verygoodplugins/automem/blob/${sourceSha}/app\\.py`));
});

test('health docs match the current degraded and enrichment queue semantics', async () => {
  const page = await readHealthPage();

  assert.match(page, /HTTP 200, including when the status is `"degraded"`/i);
  assert.match(page, /FalkorDB or Qdrant is unavailable, or when `sync_status` is `"drift_detected"`/i);
  assert.match(page, /does not equal `pending` \+ `inflight`/i);
  assert.doesNotMatch(page, /HTTP 503 if degraded/i);
});

test('health docs scope logging guidance to process configuration', async () => {
  const page = await readHealthPage();

  assert.match(page, /process logging is configured at `INFO` and written to stdout/i);
  assert.doesNotMatch(page, /All three endpoints emit structured logs/i);
  assert.doesNotMatch(page, /AUTOMEM_LOG_LEVEL/);
});
