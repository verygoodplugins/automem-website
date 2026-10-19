import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/health.md', import.meta.url),
);

async function readAnalyzeSection() {
  const page = await readFile(pagePath, 'utf8');
  const section = page.match(/## GET \/analyze\n([\s\S]*?)\n---/);

  assert.ok(section, 'expected a GET /analyze section');
  return section[1];
}

test('analyze response schema includes the top-level elapsed_ms sentinel', async () => {
  const analyze = await readAnalyzeSection();
  const schema = analyze.match(/### Response Schema\n\n```json\n([\s\S]*?)\n```/);

  assert.ok(schema, 'expected a JSON response schema in the /analyze section');

  const body = JSON.parse(schema[1]);

  assert.deepEqual(Object.keys(body), ['status', 'analytics', 'elapsed_ms']);
  assert.equal(body.status, 'success');
  assert.equal(body.elapsed_ms, 0);
  assert.ok(!('elapsed_ms' in body.analytics), 'elapsed_ms is a sibling of analytics, not nested in it');
});

test('analyze docs say elapsed_ms is hardcoded rather than a measurement', async () => {
  const analyze = await readAnalyzeSection();

  assert.match(analyze, /`elapsed_ms` field is a hardcoded `0`, not a timing measurement/i);
  assert.match(analyze, /does not time the request/i);
  assert.doesNotMatch(analyze, /elapsed_ms[^.\n]*(milliseconds|query time|latency in ms)/i);
});
