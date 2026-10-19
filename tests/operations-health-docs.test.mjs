import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/operations/health.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('operations health documents the current six /analyze result groups', async () => {
  const page = await readPage();

  assert.match(page, /six result groups/i);
  for (const resultGroup of [
    'memory_types',
    'patterns',
    'preferences',
    'temporal_insights',
    'entity_frequency',
    'confidence_distribution',
  ]) {
    assert.match(page, new RegExp('`' + resultGroup + '`'));
  }
  assert.match(page, /up to 100 timestamped memories/i);
  assert.doesNotMatch(page, /100 most recent/i);
});

test('operations health documents startup recall authentication and fixed limits', async () => {
  const page = await readPage();
  const section = page.match(/## Startup Context Retrieval([\s\S]*?)\n## Health Monitor Service/);

  assert.ok(section, 'expected Startup Context Retrieval section');
  assert.match(section[1], /\*\*Authentication\*\*\s*\|\s*Required/i);
  assert.match(section[1], /up to 10/i);
  assert.match(section[1], /up to 5/i);
  assert.match(section[1], /Authorization: Bearer YOUR_TOKEN/);
  assert.doesNotMatch(section[1], /falls back to recent memories/i);
});

test('operations health documents health-monitor CLI control flags', async () => {
  const page = await readPage();

  assert.match(page, /`--interval`/);
  assert.match(page, /`--auto-recover`/);
  assert.doesNotMatch(page, /HEALTH_MONITOR_AUTO_RECOVER/);
  assert.doesNotMatch(page, /HEALTH_MONITOR_CHECK_INTERVAL/);
});

test('operations health documents the real webhook alert payload', async () => {
  const page = await readPage();
  const section = page.match(/### Webhook Alert Format([\s\S]*?)\n### Slack Integration/);

  assert.ok(section, 'expected Webhook Alert Format section');
  const payload = section[1].match(/```json\n([\s\S]*?)\n```/);
  assert.ok(payload, 'expected a JSON webhook payload example');

  const alert = JSON.parse(payload[1]);
  assert.deepEqual(Object.keys(alert), [
    'level',
    'title',
    'message',
    'details',
    'timestamp',
    'system',
  ]);
  assert.ok(['info', 'warning', 'critical'].includes(alert.level));
  assert.equal(alert.system, 'AutoMem Health Monitor');
  assert.ok(alert.details.drift_percent !== undefined, 'drift values are nested under details');
  assert.equal(alert.drift_percent, undefined);
  assert.doesNotMatch(alert.timestamp, /Z$/, 'timestamp is a UTC ISO string without a zone suffix');

  for (const level of ['info', 'warning', 'critical']) {
    assert.match(section[1], new RegExp('`' + level + '`'));
  }
  assert.match(section[1], /nested under `details`/);
});

test('operations health states the webhook level values exactly once', async () => {
  const page = await readPage();

  assert.equal(page.match(/`level` is one of/g)?.length, 1);
  assert.doesNotMatch(page, /alert_type/);
  assert.doesNotMatch(page, /service_url/);
});

test('operations health does not claim /analyze reports relationship counts', async () => {
  const page = await readPage();
  const section = page.match(/## Memory Analytics([\s\S]*?)\n## Startup Context Retrieval/);

  assert.ok(section, 'expected Memory Analytics section');
  assert.doesNotMatch(section[1], /relationship counts/i);
  assert.match(section[1], /`\/analyze` does not report edge counts/);
  assert.doesNotMatch(section[1], /does not report edges\b/);
  assert.match(section[1], /`GET \/graph\/stats`/);
  assert.match(section[1], /`totals\.edges`/);
  assert.match(section[1], /`by_relationship`/);
});

test('operations health permalinks added for the alert sender and graph stats use pinned AutoMem SHAs', async () => {
  const page = await readPage();

  for (const sourcePath of ['scripts/health_monitor.py#L184-L217', 'automem/api/graph.py#L366-L458']) {
    const escaped = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const link = page.match(
      new RegExp('https://github\\.com/verygoodplugins/automem/blob/([^/]+)/' + escaped),
    );

    assert.ok(link, `expected a source link for ${sourcePath}`);
    assert.ok(
      isPinnedSha('automem', link[1]),
      `${sourcePath} must use a pinned AutoMem revision`,
    );
  }
});
