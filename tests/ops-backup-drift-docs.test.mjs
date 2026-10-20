import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift fixes for operations/backup.md, verified against the pinned AutoMem
// release sources (scripts/backup_automem.py, automem/backup.py, and every
// Qdrant payload builder).

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/operations/backup.md', import.meta.url),
);

async function readBackupPage() {
  return readFile(pagePath, 'utf8');
}

// Compact absence assertion: assert.doesNotMatch dumps the whole page on failure.
function assertAbsent(text, pattern) {
  assert.ok(!pattern.test(text), `stale text still present: ${pattern}`);
}

// Slice from one heading to the next named heading.
function between(page, startHeading, endHeading) {
  const start = page.indexOf(`\n${startHeading}\n`);
  assert.notEqual(start, -1, `expected a "${startHeading}" heading`);
  const end = page.indexOf(`\n${endHeading}\n`, start + 1);
  assert.notEqual(end, -1, `expected a "${endHeading}" heading after "${startHeading}"`);
  return page.slice(start, end);
}

test('QDRANT_URL and QDRANT_API_KEY are not marked required, and the script cannot skip Qdrant', async () => {
  const page = await readBackupPage();
  const env = between(page, '### Environment Variables', '### Retention Policy Recommendations');
  const row = (name) => env.match(new RegExp(`^\\| \`${name}\` \\|.*$`, 'm'))?.[0];

  const url = row('QDRANT_URL');
  assert.ok(url, 'expected a QDRANT_URL row');
  assert.match(url, /^\| `QDRANT_URL` \| No \| `http:\/\/localhost:6333` \|/);

  const key = row('QDRANT_API_KEY');
  assert.ok(key, 'expected a QDRANT_API_KEY row');
  assert.match(key, /^\| `QDRANT_API_KEY` \| No \| - \|/);
  assert.match(key, /without authentication/);

  assertAbsent(env, /Yes\*/);
  assertAbsent(env, /^\*Qdrant variables/m);
  assertAbsent(page, /without vector storage/i);

  assert.match(env, /`backup_automem\.py` always exports Qdrant as well as FalkorDB/);
  assert.match(env, /has no option to skip it/);
  assert.match(env, /the run fails after the FalkorDB file is written/);
  assert.match(env, /`restore_from_backup\.py` can skip Qdrant with `--falkordb-only`/);
});

test('the Railway backup service row is gone from the method comparison', async () => {
  const page = await readBackupPage();
  const comparison = between(page, '## Backup Method Comparison', '## Disaster Recovery');

  assertAbsent(page, /\*\*Railway Service\*\*/);
  assertAbsent(comparison, /Railway-centric/);
  assertAbsent(comparison, /\$1-2\/mo/);

  for (const method of ['Railway Volumes', 'GitHub Actions', 'Manual Script']) {
    assert.ok(comparison.includes(`**${method}**`), `expected the ${method} row to remain`);
  }
});

test('retention table maps day targets to --keep file counts and says S3 is not pruned', async () => {
  const page = await readBackupPage();
  const retention = between(page, '### Retention Policy Recommendations', '## Backup Method Comparison');

  assertAbsent(retention, /\| Retention Period \|/);
  assert.match(
    retention,
    /\| Use Case \| Backup Frequency \| Retention Target \| `--keep` Value \| Storage Location \| Estimated Cost \|/,
  );

  const row = (label) => retention.match(new RegExp(`^\\| \\*\\*${label}\\*\\* \\|.*$`, 'm'))?.[0];
  assert.match(row('Personal/Development'), /\| 7 days \| `--keep 7` \|/);
  assert.match(row('Team/Small Production'), /\| 14 days \| `--keep 56` \|/);
  assert.match(row('Production'), /\| 30 days \| `--keep 120` to `--keep 720` \|/);
  assert.match(row('Enterprise'), /\| 90 days \+ archive \| `--keep 2160` \|/);

  assert.match(retention, /`--keep` takes a number of files per store, not a number of days/);
  assert.match(retention, /`--cleanup` prunes only the local backup directory/);
  assert.match(retention, /`backup_automem\.py` does not delete S3 objects/);
  assert.match(retention, /bucket lifecycle rule/);
  assert.match(retention, /every 6 hours with `--keep 14`/);
});

test('Qdrant payload keys cover the shared set and note which write paths differ', async () => {
  const page = await readBackupPage();
  const method2 = between(
    page,
    '## Method 2: Backup File Restoration',
    '## Method 3: Railway Volume Restore',
  );

  const sentence = method2.split('\n').find((line) => line.includes('Each entry in `points`'));
  assert.ok(sentence, 'expected the Method 2 sentence describing each entry in `points`');
  assertAbsent(sentence, /memory_id/);
  assertAbsent(sentence, /created_at/);
  for (const key of [
    'content',
    'tags',
    'tag_prefixes',
    'importance',
    'timestamp',
    'type',
    'confidence',
    'updated_at',
    'last_accessed',
    'metadata',
  ]) {
    assert.ok(sentence.includes(`\`${key}\``), `expected payload key ${key} in the points sentence`);
  }

  const notes = method2.split('\n').find((line) => line.startsWith('The exact payload keys depend'));
  assert.ok(notes, 'expected a paragraph on payload keys that vary by write path');
  assert.match(notes, /Every AutoMem code path that builds a Qdrant memory payload writes/);
  assertAbsent(notes, /Every Qdrant upsert path/);
  assertAbsent(notes, /memory_id/);
  assertAbsent(notes, /created_at/);

  const variants = method2.slice(method2.indexOf('Beyond that core set:'));
  assert.match(
    variants,
    /- `tag_prefixes` is written by every path except the `\/admin\/reembed` and `\/admin\/sync` endpoints and `scripts\/reembed_embeddings\.py`\./,
  );
  assert.match(
    variants,
    /- `t_valid` and `t_invalid` are written only when a client supplies the embedding on create or when a memory is updated\./,
  );
  assert.match(variants, /- The embedding worker also writes `relevance_score`/);
  assert.match(variants, /consolidation can later set `relevance_score` and `archived`/);
});

test('backup secrets and sequence diagram match the FalkorDB client and Qdrant scroll calls', async () => {
  const page = await readFile(fileURLToPath(new URL('../src/content/docs/docs/operations/backup.md', import.meta.url)), 'utf8');

  assert.doesNotMatch(page, /redis\.Redis\(/);
  assert.match(page, /\| `FALKORDB_HOST` \|[^\n]*\| `FalkorDB\(\)` connection \|/);
  assert.match(page, /\| `FALKORDB_PASSWORD` \|[^\n]*\| `FalkorDB\(password=\)` \|/);
  assert.match(page, /Script->>QDR: Scroll points \(POST \/collections\/memories\/points\/scroll\)/);
  assert.doesNotMatch(page, /HTTPS GET \/collections\/memories\/points/);
});
