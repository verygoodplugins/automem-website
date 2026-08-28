import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
