import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/overview.md', import.meta.url),
);

async function readOverviewPage() {
  return readFile(pagePath, 'utf8');
}

// Text from `start` up to (not including) `end`, both literal strings in the page.
function between(page, start, end) {
  const from = page.indexOf(start);
  assert.notEqual(from, -1, `expected "${start}" in the page`);
  const to = page.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `expected "${end}" after "${start}"`);
  return page.slice(from, to);
}

function automemLinks(text) {
  return [
    ...text.matchAll(
      /\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/([^)#]+)(#[^)]*)?\)/g,
    ),
  ].map(([, sha, path, anchor = '']) => ({ sha, path, anchor }));
}

test('architecture overview names every registered API blueprint', async () => {
  const page = await readOverviewPage();
  const line = page.match(/^- \[automem\/api\/\]\([^)]+\) — Route blueprints \(([^)]+)\)$/m);

  assert.ok(line, 'expected the automem/api source-note line');
  const files = line[1].split(',').map((name) => name.trim());
  assert.deepEqual(
    [...files].sort(),
    [
      'admin.py',
      'backup.py',
      'consolidation.py',
      'enrichment.py',
      'entity.py',
      'graph.py',
      'health.py',
      'memory.py',
      'recall.py',
      'stream.py',
      'viewer.py',
    ],
  );
});

test('architecture overview attributes graph serializers to utils/graph.py', async () => {
  const page = await readOverviewPage();
  const section = between(page, '### Graph Store Module', '### Vector Store Module');
  const beforeUtilsLink = section.slice(0, section.indexOf('automem/utils/graph.py'));

  assert.ok(section.includes('automem/utils/graph.py'), 'expected a utils/graph.py reference');
  assert.match(section, /`_build_graph_tag_predicate\(tag_mode, tag_match\)`/);
  assert.match(section, /`_serialize_node\(node\)`/);
  assert.match(section, /`_summarize_relation_node\(data\)`/);
  assert.doesNotMatch(section, /_summarize_relation_node\(rel\)/);

  // The serializers are introduced after the utils/graph.py link, not under graph_store.py.
  assert.doesNotMatch(beforeUtilsLink, /_serialize_node|_summarize_relation_node/);
  assert.doesNotMatch(section, /encapsulates FalkorDB operations/);
});

test('architecture overview describes the relation summary as a related memory summary', async () => {
  const page = await readOverviewPage();
  const section = between(page, '### Graph Store Module', '### Vector Store Module');
  const summarize = section.match(/^- `_summarize_relation_node\(data\)` — (.+)$/m);

  assert.ok(summarize, 'expected the _summarize_relation_node bullet');
  assert.match(summarize[1], /related memory/);
  assert.match(summarize[1], /up to five tags/);
  assert.doesNotMatch(summarize[1], /strength|context\)/);
});

test('architecture overview documents the API token guard on consolidation endpoints', async () => {
  const page = await readOverviewPage();
  const section = between(page, '### Admin Endpoints', '**Configuration:**');
  const row = (endpoint) => section.match(new RegExp(`^\\| \`${endpoint}\` \\|.*$`, 'm'))?.[0];

  assert.doesNotMatch(section, /Admin Token Required/);
  assert.match(row('GET /consolidate/status'), /\| API token \|$/);
  assert.match(row('POST /consolidate'), /\| API token \|$/);
  assert.match(row('POST /admin/reembed'), /\| API token \+ admin token \|$/);
  assert.match(row('POST /enrichment/reprocess'), /\| API token \+ admin token \|$/);
  assert.doesNotMatch(row('GET /consolidate/status'), /\| No \|/);

  const guard = section.match(/When `AUTOMEM_API_TOKEN` is set,[^\n]+/);
  assert.ok(guard, 'expected the API token guard sentence');
  assert.match(guard[0], /every route except/);
  for (const exempt of ['`/health`', '`/viewer*`', '`/backup`', '`OPTIONS`']) {
    assert.ok(guard[0].includes(exempt), `guard sentence should name ${exempt}`);
  }
});

test('architecture overview configuration table gives no variable counts', async () => {
  const page = await readOverviewPage();
  const section = between(
    page,
    '### Core Configuration Categories',
    '### Configuration Loading Priority',
  );
  const row = (category) => section.match(new RegExp(`^\\| \\*\\*${category}\\*\\* \\|.*$`, 'm'))?.[0];

  assert.doesNotMatch(page, /\(\d+ variables?\)/);
  assert.match(row('Enrichment'), /`ENRICHMENT_MAX_ATTEMPTS`/);
  assert.match(row('Enrichment'), /`ENRICHMENT_FAILURE_BACKOFF_SECONDS`/);
  assert.match(row('Consolidation'), /`CONSOLIDATION_TICK_SECONDS`/);
  assert.match(row('Consolidation'), /`CONSOLIDATION_DECAY_INTERVAL_SECONDS`/);
  assert.match(row('Search'), /`SEARCH_WEIGHT_VECTOR`/);
  assert.match(row('Search'), /`SEARCH_WEIGHT_KEYWORD`/);
});

test('architecture overview loads the project .env before the user .env', async () => {
  const page = await readOverviewPage();
  const section = between(page, '### Configuration Loading Priority', '### Memory Type System');
  const order = [
    '**Environment variables**',
    '**Project .env**',
    '**~/.config/automem/.env**',
    '**Hardcoded defaults**',
  ].map((label) => section.indexOf(label));

  assert.ok(order.every((index) => index !== -1), 'expected all four configuration sources');
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.match(section, /`load_dotenv\(\)` for the project `\.env` before the user file/);
  assert.match(section, /`load_dotenv` does not override names that are already set/);
});

test('architecture overview scopes enrichment retry behavior to the enrichment worker', async () => {
  const page = await readOverviewPage();
  const section = between(page, '### Background Worker Resilience', '### API Error Responses');
  const enrichmentRow = section.match(/^\| Enrichment \|.*$/m)?.[0];

  assert.ok(enrichmentRow, 'expected an Enrichment resilience row');
  assert.doesNotMatch(section, /exponential/i);
  assert.doesNotMatch(section, /5s, 10s, 15s/);
  assert.doesNotMatch(section, /Each worker implements retry logic/);
  assert.match(section, /Failure handling differs by worker/);

  assert.match(enrichmentRow, /Up to 2, forced jobs only/);
  assert.match(enrichmentRow, /`ENRICHMENT_MAX_ATTEMPTS`/);
  assert.match(enrichmentRow, /Flat `ENRICHMENT_FAILURE_BACKOFF_SECONDS` \(default 5s\)/);
});

test('architecture overview says only forced enrichment jobs are re-queued after a failure', async () => {
  const page = await readOverviewPage();
  const section = between(page, '### Background Worker Resilience', '### API Error Responses');
  const note = section.match(/:::note\[Enrichment retries\]\n([\s\S]*?)\n:::/);

  assert.ok(note, 'expected an Enrichment retries note');
  assert.match(note[1], /failed memory ID is still marked in flight/);
  assert.match(note[1], /a non-forced job \(the kind `POST \/memory` queues\) is not re-queued/);
  assert.match(note[1], /Forced jobs from `POST \/enrichment\/reprocess` are re-queued/);
});

test('architecture overview source links added or repinned use a validated AutoMem revision', async () => {
  const page = await readOverviewPage();
  const touched = automemLinks(page).filter(
    ({ path, anchor }) =>
      path === 'automem/api/' ||
      path === 'automem/utils/graph.py' ||
      path === 'automem/enrichment/runtime_worker.py' ||
      (path === 'app.py' && anchor.startsWith('#L')) ||
      (path === 'automem/api/auth_helpers.py' && anchor.startsWith('#L')),
  );

  // api/ tree, utils/graph.py, app.py guard, auth_helpers.py guard, and two runtime_worker.py anchors.
  assert.equal(touched.length, 6);
  assert.ok(
    touched.every(({ sha }) => isPinnedSha('automem', sha)),
    'links added or repinned for this page must use a validated AutoMem revision',
  );
});
