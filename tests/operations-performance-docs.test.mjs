import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/operations/performance.md', import.meta.url),
);

async function readPerformancePage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading, nextHeading) {
  const start = page.indexOf(heading);
  assert.notEqual(start, -1, `expected section ${heading}`);
  const end = page.indexOf(nextHeading, start + heading.length);
  assert.notEqual(end, -1, `expected ${nextHeading} after ${heading}`);
  return page.slice(start, end);
}

test('embedding batching blocks on the queue until the batch deadline instead of polling', async () => {
  const page = await readPerformancePage();
  const implementation = section(page, '### Implementation', '### Key Functions');

  assert.match(implementation, /keep blocking on the queue until the batch deadline/i);
  assert.match(implementation, /`get\(\)` with the time remaining until that deadline \(minimum 0\.1s\)/);
  assert.match(implementation, /flushes any partial batch when the call times out/i);
  assert.match(implementation, /does not poll on a sleep interval/i);
  assert.match(
    implementation,
    /sleeps 1s only while the queue is not initialized or after an unexpected error/i,
  );
  assert.doesNotMatch(page, /0\.1s sleep intervals/);
  assert.doesNotMatch(page, /continue accumulating with/i);
});

test('recall log sample and parsing commands use the recall_complete message', async () => {
  const page = await readPerformancePage();

  assert.equal(page.match(/Recall completed/gi), null, 'no stale "Recall completed" message');
  assert.match(page, /logger\.info\("recall_complete", extra=\{/);
  assert.match(page, /railway logs \| grep "recall_complete" \| jq 'select\(\.latency_ms > 500\)'/);
  assert.match(page, /railway logs \| grep "recall_complete" \| jq '\.query' \| sort \| uniq -c/);
  assert.equal(page.match(/recall_complete/g).length, 3, 'sample plus two grep commands');
});

test('recall logged-fields table lists all twelve emitted fields', async () => {
  const page = await readPerformancePage();
  const table = section(
    page,
    '### Recall Endpoint Logged Fields',
    '### Memory Store Logged Fields',
  );
  const fields = [...table.matchAll(/^\| `([a-z_]+)` \|/gm)].map(([, name]) => name);

  assert.deepEqual(
    [...fields].sort(),
    [
      'context_language',
      'dedup_removed',
      'has_exclude_filter',
      'has_tag_filter',
      'has_time_filter',
      'is_multi',
      'latency_ms',
      'limit',
      'query',
      'results',
      'vector_enabled',
      'vector_matches',
    ],
  );
  assert.match(table, /\| `has_exclude_filter` \| bool \| `exclude_tags` filtering active \|/);
  assert.match(table, /\| `dedup_removed` \| int \| Results dropped as duplicates/);
  assert.match(
    table,
    /\| `is_multi` \| bool \| Multi-query mode: `queries` supplied, or `auto_decompose` generated sub-queries \|/,
  );
  assert.doesNotMatch(table, /Multiple queries ran/);
  assert.match(table, /\| `context_language` \| string \\\| null \| Language from the context profile \|/);
});

test('recall logging code sample emits the same fields as the table', async () => {
  const page = await readPerformancePage();
  const sample = page.match(/logger\.info\("recall_complete", extra=\{([\s\S]*?)\n\}\)/);

  assert.ok(sample, 'expected the recall_complete logging sample');
  const keys = [...sample[1].matchAll(/^\s+"([a-z_]+)":/gm)].map(([, name]) => name);
  assert.equal(keys.length, 12);
  for (const key of ['has_exclude_filter', 'dedup_removed', 'is_multi', 'context_language']) {
    assert.ok(keys.includes(key), `sample is missing ${key}`);
  }
});

test('log parsing examples and the structured logging premise require a JSON formatter', async () => {
  const page = await readPerformancePage();
  const purpose = section(page, '### Purpose', '### Implementation Pattern');
  const parsing = section(page, '### Log Parsing and Analysis', '## Monitoring and Observability');

  assert.match(purpose, /With a JSON log formatter that renders `extra` fields \(stock AutoMem does not ship one\)/);
  assert.doesNotMatch(purpose, /provides machine-parseable performance data in log output/);
  assert.match(parsing, /need a JSON log formatter that renders `extra` fields/);
  assert.match(parsing, /Stock AutoMem does not ship one/);
  assert.match(parsing, /default format prints only the message/);
  assert.ok(
    parsing.indexOf('JSON log formatter') < parsing.indexOf('```bash'),
    'qualifier must come before the commands',
  );
});
