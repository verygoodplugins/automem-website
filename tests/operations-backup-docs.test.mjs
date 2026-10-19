import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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

// Slice from one heading to the next named heading. Explicit end headings avoid
// treating `# comment` lines inside fenced shell blocks as page headings.
function between(page, startHeading, endHeading) {
  const start = page.indexOf(`\n${startHeading}\n`);
  assert.notEqual(start, -1, `expected a "${startHeading}" heading`);
  const end = page.indexOf(`\n${endHeading}\n`, start + 1);
  assert.notEqual(end, -1, `expected a "${endHeading}" heading after "${startHeading}"`);
  return page.slice(start, end);
}

test('FalkorDB export is documented as a Cypher graph dump, not a Redis keyspace dump', async () => {
  const page = await readBackupPage();
  const format = between(page, '### Backup Format', '### Command-Line Usage');
  const falkor = format.slice(0, format.indexOf('**Qdrant Export Structure:**'));

  assertAbsent(falkor, /entire Redis keyspace/i);
  assertAbsent(falkor, /Metadata and indices/i);
  assert.match(falkor, /Cypher/);
  assert.match(falkor, /not a dump of the Redis keyspace/i);

  for (const key of ['timestamp', 'graph_name', 'nodes', 'relationships', 'stats']) {
    assert.ok(falkor.includes(`\`${key}\``), `expected FalkorDB top-level key ${key}`);
  }
  for (const key of ['id', 'labels', 'properties', 'source_id', 'type', 'target_id']) {
    assert.ok(falkor.includes(`\`${key}\``), `expected node/relationship field ${key}`);
  }
  assert.match(falkor, /`node_count`/);
  assert.match(falkor, /`relationship_count`/);
  assert.match(falkor, /Indexes and other Redis-level structures are not part of the export/);
});

test('--cleanup --keep N is documented as a per-store file count ranked by modification time', async () => {
  const page = await readBackupPage();
  const usage = between(page, '### Command-Line Usage', '### Local Filesystem Storage');
  const storage = between(page, '### Local Filesystem Storage', '### S3 Cloud Storage');

  assertAbsent(page, /older than/i);
  assertAbsent(page, /filename timestamp parsing/i);
  assertAbsent(page, /N days/);

  assert.match(
    usage,
    /# With retention policy - after backing up, keeps the 7 most recent backup files per store, deleting the rest\n/,
  );
  assert.match(storage, /file count, not an age/);
  assert.match(storage, /`backups\/falkordb\/` and `backups\/qdrant\/`/);
  assert.match(storage, /most recent `\.json\.gz` files/);
  assert.match(storage, /file modification time/);
  assert.match(storage, /`N` defaults to 7/);
});

test('environment variable table marks FalkorDB port and password optional and lists the backup directory', async () => {
  const page = await readBackupPage();
  const env = between(page, '### Environment Variables', '### Retention Policy Recommendations');
  const row = (name) => env.match(new RegExp(`^\\| \`${name}\` \\|.*$`, 'm'))?.[0];

  const port = row('FALKORDB_PORT');
  assert.ok(port, 'expected a FALKORDB_PORT row');
  assert.match(port, /^\| `FALKORDB_PORT` \| No \| `6379` \|/);

  const password = row('FALKORDB_PASSWORD');
  assert.ok(password, 'expected a FALKORDB_PASSWORD row');
  assert.match(password, /^\| `FALKORDB_PASSWORD` \| No \| - \|/);
  assert.match(password, /password-protected/i);

  const backupDir = row('AUTOMEM_BACKUP_DIR');
  assert.ok(backupDir, 'expected an AUTOMEM_BACKUP_DIR row');
  assert.match(backupDir, /^\| `AUTOMEM_BACKUP_DIR` \| No \| `\.\/backups` \|/);
  assert.match(backupDir, /`backup_automem\.py`/);
  assert.match(backupDir, /`restore_from_backup\.py`/);
  assert.match(backupDir, /`--backup-dir`/);
});

test('Qdrant backup files are documented as a JSON object whose points array holds the memories', async () => {
  const page = await readBackupPage();
  const method2 = between(
    page,
    '## Method 2: Backup File Restoration',
    '## Method 3: Railway Volume Restore',
  );

  assertAbsent(page, /array of point objects/i);
  assertAbsent(page, /Parse JSON array/);

  assert.match(
    method2,
    /Each Qdrant backup is a JSON object with `timestamp`, `collection_name`, `points`, and `stats`/,
  );
  assert.match(method2, /`stats` holds `points_count` and `vector_size`/);
  assert.match(method2, /Each entry in `points` has `id`, `vector`/);
  assert.match(method2, /Restore->>Restore: Parse JSON object<br\/>json\.load\(\)/);
});

test('backup integrity check counts points inside the Qdrant backup object', async () => {
  const page = await readBackupPage();
  const integrity = page.slice(page.indexOf('### Verifying Backup Integrity'));

  assertAbsent(page, /jq 'length'/);
  assert.match(
    integrity,
    /zcat backups\/qdrant\/qdrant_latest\.json\.gz \| jq '\.stats\.points_count, \(\.points \| length\)'/,
  );
  assert.match(integrity, /the file is an object, so count its points/);
});
