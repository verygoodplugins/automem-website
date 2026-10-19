import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/consolidation.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected a section matching ${startPattern}`);
  const rest = page.slice(start);
  const end = rest.slice(1).search(endPattern);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

function jsonBlocks(markdown) {
  return [...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map(([, body]) => JSON.parse(body));
}

test('consolidation API source links share one pinned AutoMem revision', async () => {
  const page = await readPage();
  const note = page.match(/:::note\[Source files\]\n([\s\S]*?)\n:::/);

  assert.ok(note, 'expected a Source files note');
  const shas = [
    ...note[1].matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\//g),
  ].map(([, sha]) => sha);

  assert.ok(shas.length >= 5, 'expected pinned source links for every claim area');
  assert.equal(new Set(shas).size, 1, 'source links must use one validated revision');

  const pageShas = [
    ...page.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{7,40})\//g),
  ].map(([, sha]) => sha);

  assert.ok(pageShas.length >= shas.length, 'expected every AutoMem link on the page to be scanned');
  for (const sha of pageShas) {
    assert.ok(isPinnedSha('automem', sha), `AutoMem link uses an unpinned revision: ${sha}`);
  }
});

test('GET /consolidate/status requires the API token everywhere the page mentions it', async () => {
  const page = await readPage();

  assert.match(
    page,
    /\| `\/consolidate\/status` \| GET \| Query scheduler state and last run times \| API token \|/,
  );

  const status = section(page, /^## GET \/consolidate\/status$/m, /^---$/m);
  assert.match(status, /\*\*Authentication:\*\* API token required/);
  assert.match(
    status,
    /curl "https:\/\/your-automem-instance\/consolidate\/status" \\\n\s+-H "Authorization: Bearer YOUR_TOKEN"/,
  );

  const auth = section(page, /^## Authentication$/m, /^---$/m);
  assert.match(
    auth,
    /Both `POST \/consolidate` and `GET \/consolidate\/status` require authentication using the `AUTOMEM_API_TOKEN`/,
  );
  assert.match(auth, /`\/health`, which is exempt from token checks/);

  assert.doesNotMatch(page, /None required/);
  assert.doesNotMatch(page, /is unauthenticated/);
  assert.doesNotMatch(page, /curl "https:\/\/your-automem-instance\/consolidate\/status"\n/);
});

test('consolidation documents the identity mode and the conditional full step', async () => {
  const page = await readPage();

  assert.match(
    page,
    /\| `mode` \| string \| No \| `"full"` \| Task type to execute: `decay`, `creative`, `cluster`, `forget`, `identity`, or `full` \|/,
  );

  const tasks = section(page, /^### Task Types$/m, /^### Execution Flow$/m);
  assert.match(tasks, /\| `identity` \| 604800s \(7 days\) when `IDENTITY_SYNTHESIS_ENABLED` is true, otherwise 0 \(disabled\)/);
  assert.match(tasks, /`CONSOLIDATION_IDENTITY_INTERVAL_SECONDS`/);
  assert.match(tasks, /requires an OpenAI client/);
  assert.match(
    tasks,
    /\| `full` \| N\/A \| Execute `decay`, `creative`, `cluster`, `identity` \(when `IDENTITY_SYNTHESIS_ENABLED` is true\), then `forget` in sequence \|/,
  );
  assert.match(tasks, /`mode="identity"` runs whenever you request it/);
  assert.doesNotMatch(page, /all four tasks/);
  assert.doesNotMatch(page, /Execute all four/);
  assert.doesNotMatch(tasks, /and `forget` in sequence, plus `identity`/);

  const config = section(page, /^## Configuration$/m, /^---$/m);
  assert.match(config, /\| `IDENTITY_SYNTHESIS_ENABLED` \| `false` \|/);
  assert.match(
    config,
    /\| `CONSOLIDATION_IDENTITY_INTERVAL_SECONDS` \| 604800 when `IDENTITY_SYNTHESIS_ENABLED` is true, otherwise 0 \|/,
  );

  const control = section(page, /^### ConsolidationControl Node$/m, /^### ConsolidationRun Nodes$/m);
  assert.match(control, /`identity`/);
  assert.doesNotMatch(control, /four tasks/);
});

test('POST /consolidate success responses use the nested steps shape', async () => {
  const page = await readPage();
  const success = section(page, /^#### Success \(200 OK\)$/m, /^#### Error \(500 Internal Server Error\)$/m);
  const [single, full] = jsonBlocks(success);

  for (const body of [single, full]) {
    assert.equal(body.status, 'success');
    const result = body.consolidation;
    assert.deepEqual(
      Object.keys(result).sort(),
      ['completed_at', 'dry_run', 'mode', 'started_at', 'steps', 'success'],
    );
    assert.equal(result.success, true);
    assert.equal(typeof result.steps, 'object');
  }

  const sortedKeys = (value) => Object.keys(value).sort();

  assert.deepEqual(sortedKeys(single.consolidation.steps), ['decay']);
  assert.deepEqual(sortedKeys(single.consolidation.steps.decay), [
    'avg_relevance_after',
    'avg_relevance_before',
    'distribution',
    'processed',
  ]);
  assert.deepEqual(sortedKeys(single.consolidation.steps.decay.distribution), [
    'archive',
    'high',
    'low',
    'medium',
  ]);

  const steps = full.consolidation.steps;
  assert.deepEqual(sortedKeys(steps), ['cluster', 'creative', 'decay', 'forget', 'identity']);
  assert.deepEqual(sortedKeys(steps.creative), ['created', 'discovered', 'sample_associations']);
  assert.deepEqual(sortedKeys(steps.cluster), [
    'clusters_found',
    'meta_memories_created',
    'sample_clusters',
  ]);
  assert.deepEqual(sortedKeys(steps.identity), ['reason', 'skipped']);
  assert.deepEqual(sortedKeys(steps.forget), [
    'archived',
    'deleted',
    'examined',
    'preserved',
    'protected',
  ]);

  // Every examined memory is archived, deleted, or preserved, so the example must add up.
  const { examined, archived, deleted, preserved } = steps.forget;
  assert.equal(examined, archived.length + deleted.length + preserved);

  // The endpoint serializes with sorted keys, so the page must not promise key order.
  assert.doesNotMatch(success, /in execution order/);
  assert.match(success, /`steps` contains one entry per task that ran/);
  assert.match(
    success,
    /tasks run in the order `decay`, `creative`, `cluster`, `identity`, `forget`/,
  );
  assert.match(success, /`sample_associations` and `sample_clusters` arrays hold the first 3 associations and the first 2 clusters/);

  assert.match(success, /nests each task's statistics under `steps`/);
  assert.match(success, /`full` run that completes always includes an `identity` entry/);
  assert.match(success, /still returns `200 OK`, with `success` set to `false` and an `error` string/);

  assert.doesNotMatch(success, /"updates"/);
  assert.doesNotMatch(success, /"duration_seconds"/);
  assert.doesNotMatch(success, /"associations"/);
  assert.doesNotMatch(success, /"forgotten"/);
  assert.doesNotMatch(success, /combined metrics/);
});

test('HTTP error rows (401 and 503) use the shared error envelope', async () => {
  const page = await readPage();
  const errors = section(page, /^## Error Handling$/m, /^---$/m);

  assert.match(
    errors,
    /\| 503 Service Unavailable \| FalkorDB is unavailable \(both endpoints, before any work starts\) \| `\{"status": "error", "code": 503, "message": "FalkorDB is unavailable"\}` \|/,
  );
  assert.doesNotMatch(errors, /`\{"error": "FalkorDB is unavailable"\}`/);

  assert.match(
    errors,
    /\| 401 Unauthorized \| Missing or invalid token \| `\{"status": "error", "code": 401, "message": "Unauthorized"\}` \|/,
  );
  assert.doesNotMatch(errors, /`\{"error": "Unauthorized"\}`/);
});

test('decay importance threshold is at-or-above and scheduler-only', async () => {
  const page = await readPage();
  const config = section(page, /^## Configuration$/m, /^---$/m);
  const row = config.match(/\| `CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD` \| 0\.3 \|([^\n]*)\|/);

  assert.ok(row, 'expected the decay threshold row');
  assert.match(row[1], /at or above this value/);
  assert.match(row[1], /lower-importance memories are skipped/);
  assert.match(row[1], /Only the background scheduler passes it/);
  assert.match(row[1], /manual `POST \/consolidate` sends no threshold/);
  assert.doesNotMatch(page, /Skip decay for memories above this importance/);

  const tip = section(page, /^:::tip\[When to trigger manual consolidation\]$/m, /^:::$/m);
  assert.doesNotMatch(tip, /CONSOLIDATION_DECAY_IMPORTANCE_THRESHOLD/);
  assert.doesNotMatch(tip, /run `decay` to reapply/);
});
