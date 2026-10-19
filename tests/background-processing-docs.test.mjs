import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/background-processing.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading, terminator) {
  const start = page.indexOf(heading);
  assert.notEqual(start, -1, `expected a "${heading.trim()}" section`);
  const body = page.slice(start + heading.length);
  const end = body.search(terminator);
  return end === -1 ? body : body.slice(0, end);
}

async function healthSection() {
  const page = await readPage();
  return section(page, '### Health Endpoint Statistics\n', /\n###? |\n---\n/);
}

async function endpointsSection() {
  const page = await readPage();
  return section(page, '### Operational Endpoints\n', /\n---\n/);
}

test('background processing documents only the real /health blocks', async () => {
  const health = await healthSection();

  assert.match(health, /`enrichment\.status`/);
  assert.match(health, /`running`/);
  assert.match(health, /`stopped`/);
  assert.match(health, /`memory_count`/);
  assert.match(health, /`vector_count`/);
  assert.match(health, /`sync_status`/);
  assert.match(health, /`drift_detected`/);
  assert.match(health, /`orphaned_vectors`/);
  assert.match(health, /`vector_dimensions`/);
  assert.match(health, /`configured`/);
  assert.match(health, /`effective`/);
  assert.match(health, /`collection`/);
  assert.match(health, /`mismatch`/);

  assert.doesNotMatch(health, /`embedding\.queue_depth`/);
  assert.doesNotMatch(health, /`consolidation\.last_runs`/);
  assert.doesNotMatch(health, /`consolidation\.next_runs`/);
  assert.doesNotMatch(health, /real-time statistics for all background systems/i);
});

test('background processing sends consolidation scheduling and history to /consolidate/status', async () => {
  const health = await healthSection();

  assert.match(health, /no `embedding` or `consolidation` block/i);
  assert.match(health, /`GET \/consolidate\/status`/);
  assert.match(health, /`next_runs`/);
  assert.match(health, /`history`/);
});

test('background processing defines enrichment.pending as enqueued but not yet claimed', async () => {
  const health = await healthSection();
  const row = health.split('\n').find((line) => line.includes('`enrichment.pending`'));

  assert.ok(row, 'expected an enrichment.pending row');
  assert.match(row, /not yet claimed by the worker/i);
  assert.match(row, /`enrichment\.inflight`/);
  assert.doesNotMatch(row, /not yet enriched/i);
});

test('background processing scopes the admin token to /enrichment/reprocess', async () => {
  const endpoints = await endpointsSection();
  const rows = Object.fromEntries(
    endpoints
      .split('\n')
      .filter((line) => line.startsWith('| `/'))
      .map((line) => [line.split('|')[1].trim(), line]),
  );

  assert.match(endpoints, /\| Endpoint \| Method \| Auth \| Purpose \|/);
  assert.deepEqual(Object.keys(rows), [
    '`/enrichment/status`',
    '`/enrichment/reprocess`',
    '`/consolidate`',
    '`/consolidate/status`',
  ]);

  assert.match(rows['`/enrichment/reprocess`'], /API token \+ admin token/i);
  for (const route of ['`/enrichment/status`', '`/consolidate`', '`/consolidate/status`']) {
    assert.match(rows[route], /\| API token \|/, `${route} needs only the API token`);
    assert.doesNotMatch(rows[route], /admin token/i, `${route} must not require the admin token`);
  }

  assert.match(endpoints, /`AUTOMEM_API_TOKEN`/);
  assert.match(endpoints, /`ADMIN_API_TOKEN`/);
  assert.match(endpoints, /`X-Admin-Token`/);
  assert.match(endpoints, /`X-Admin-Api-Key`/);
  assert.match(endpoints, /`\?admin_token`/);
  assert.match(endpoints, /`\/health` is exempt/i);
  assert.doesNotMatch(endpoints, /Advanced monitoring available via admin token/);
});

test('background processing does not promise pending-ID samples from /enrichment/status', async () => {
  const page = await readPage();
  const endpoints = await endpointsSection();
  const row = endpoints.split('\n').find((line) => line.startsWith('| `/enrichment/status`'));

  assert.ok(row, 'expected an /enrichment/status row');
  assert.match(row, /no pending-ID samples/i);
  assert.doesNotMatch(row, /counts only/i);
  assert.doesNotMatch(page, /Detailed enrichment stats \+ sample pending IDs/);
});

test('background processing no longer calls every monitoring endpoint admin-only', async () => {
  const page = await readPage();

  assert.doesNotMatch(page, /### Admin Endpoints/);
  assert.doesNotMatch(page, /via `\/health` and admin endpoints/);
  assert.match(page, /via `\/health` and the operational endpoints/);
});

test('background processing points the relationship-count cache link at the lru_cache implementation', async () => {
  const page = await readPage();
  const cacheSection = section(page, '**Relationship Count Caching', /\n---\n/);
  const link = cacheSection.match(
    /\[consolidation\.py:201-216\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/consolidation\.py#L201-L216\)/,
  );

  assert.ok(link, 'expected the cache link to point at consolidation.py lines 201-216');
  assert.ok(isPinnedSha('automem', link[1]), 'cache link must use a pinned AutoMem commit');
  assert.doesNotMatch(page, /consolidation\.py#L152/);
  assert.doesNotMatch(page, /consolidation\.py:152/);
});
