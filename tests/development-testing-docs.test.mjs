import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/development/testing.md', import.meta.url),
);

async function readTestingPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + heading.length + 2);
  const end = rest.search(/\n#{1,4} /);
  return end === -1 ? rest : rest.slice(0, end);
}

function pythonBlockAfter(text, marker) {
  const start = text.indexOf(marker);
  assert.notEqual(start, -1, `expected text "${marker}"`);
  const block = text.slice(start).match(/```python\n([\s\S]*?)```/);
  assert.ok(block, `expected a python block after "${marker}"`);
  return block[1];
}

test('testing page source links use pinned release revisions', async () => {
  const page = await readTestingPage();

  const automemLinks = [
    ...page.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\//g),
  ];
  assert.ok(automemLinks.length >= 5, 'expected AutoMem source links for the test fixtures');
  assert.ok(
    automemLinks.every(([, sha]) => isPinnedSha('automem', sha)),
    'AutoMem fixture links must use a pinned AutoMem revision',
  );

  const ciLinks = [
    ...page.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/([^/]+)\/\.github\/workflows\/ci\.yml/g,
    ),
  ];
  assert.equal(ciLinks.length, 1, 'expected exactly one mcp-automem CI workflow link');
  assert.ok(
    isPinnedSha('mcp-automem', ciLinks[0][1]),
    'the CI workflow link must use a pinned mcp-automem revision',
  );
  assert.doesNotMatch(page, /mcp-automem\/blob\/main\//);
});

test('FakeGraph anchor covers the class through the end of fake_graph.py', async () => {
  const page = await readTestingPage();
  const fakeGraph = section(page, '#### `FakeGraph` Class');

  assert.match(fakeGraph, /\[tests\/support\/fake_graph\.py:57-899\]/);
  assert.match(fakeGraph, /fake_graph\.py#L57-L899\)/);
  assert.doesNotMatch(page, /fake_graph\.py:35-795/);
  assert.doesNotMatch(page, /fake_graph\.py#L35-L795/);
});

test('mock state uses the real FakeGraph and FakeVectorStore attribute names', async () => {
  const page = await readTestingPage();
  const fakeGraph = section(page, '#### `FakeGraph` Class');
  const fakeVectorStore = section(page, '#### `FakeVectorStore` Class');
  const interactions = section(page, '#### Verifying Mock Interactions');

  assert.match(fakeGraph, /`graph\.deleted` \(a list of memory IDs\)/);
  assert.match(fakeGraph, /`graph\.archived` and `graph\.updated_scores`/);
  assert.match(fakeGraph, /`graph\.queries` as a `\(query, params\)` tuple/);
  assert.match(
    fakeVectorStore,
    /`\(collection_name, points_selector\)` tuple in `vector_store\.deletions`/,
  );

  assert.match(interactions, /for query, _params in graph\.queries/);
  assert.match(interactions, /"mem_001" in graph\.deleted/);
  assert.match(interactions, /for memory_id, _score in graph\.archived/);
  assert.match(interactions, /dict\(graph\.updated_scores\)\["mem_003"\] < 0\.2/);

  for (const stale of ['query_history', 'deleted_nodes', 'archived_nodes', 'deleted_ids']) {
    assert.ok(!page.includes(stale), `page must not mention the nonexistent ${stale}`);
  }
  assert.doesNotMatch(page, /graph\.updated_scores\.get\(/);
});

test('dry run and execution examples assert on graph.deleted and vector_store.deletions', async () => {
  const page = await readTestingPage();
  const dryRun = section(page, '#### Testing Dry Run vs Execution');

  assert.match(dryRun, /assert graph\.deleted == \[\]/);
  assert.match(dryRun, /assert len\(graph\.deleted\) > 0/);
  assert.match(dryRun, /assert len\(vector_store\.deletions\) > 0/);
});

test('vector store assertion reads either selector key like the repository test', async () => {
  const page = await readTestingPage();
  const interactions = section(page, '#### Verifying Mock Interactions');

  assert.match(
    interactions,
    /points = selector\.get\("point_ids"\) or selector\.get\("points"\)/,
  );
  assert.match(interactions, /assert points == \["mem_001"\]/);
  assert.doesNotMatch(
    page,
    /selector\.get\("point_ids"\)(?! or)/,
    'a point_ids-only selector assertion is not portable to the dummy-client path',
  );
  assert.match(interactions, /\{"points": \[\.\.\.\]\}/);
});

test('calculate_relevance_score example passes one memory dict', async () => {
  const page = await readTestingPage();
  const structure = section(page, '#### Test Function Structure');

  assert.match(structure, /takes one memory dict \(plus an optional `current_time`\)/);
  assert.match(structure, /requires the dict's `id`/);
  assert.match(
    structure,
    /calculate_relevance_score\(\n\s+\{\n\s+"id": "mem_001",\n\s+"timestamp": iso_days_ago\(2\),\n\s+"last_accessed": iso_days_ago\(1\),\n\s+"importance": 0\.8,\n\s+"confidence": 0\.7,\n\s+\}\n\s+\)/,
  );

  const mockData = section(page, '#### Mock Data Configuration');
  for (const text of [structure, mockData]) {
    assert.doesNotMatch(text, /memory_id="mem_001"/);
    assert.doesNotMatch(text, /access_count/);
    assert.doesNotMatch(text, /created_at/);
  }
});

test('iso_days_ago example builds its base inline instead of using FROZEN_TIME', async () => {
  const page = await readTestingPage();
  const helpers = section(page, '#### Helper Functions');

  assert.match(helpers, /base = datetime\(2024, 1, 1, tzinfo=timezone\.utc\)/);
  assert.match(helpers, /return \(base - timedelta\(days=days\)\)\.isoformat\(\)/);
  assert.match(helpers, /tests\/test_consolidation_engine\.py:42-44/);
  assert.ok(!page.includes('FROZEN_TIME'), 'FROZEN_TIME is not defined in the test suite');
});

test('row fixtures are lists in the column order of the matching queries', async () => {
  const page = await readTestingPage();
  const mockData = section(page, '#### Mock Data Configuration');

  assert.match(mockData, /plain lists of column values/);
  assert.match(mockData, /not dicts/);

  assert.match(mockData, /`sample_rows` as `\[id, content, type, embedding, timestamp\]`/);
  assert.match(mockData, /`cluster_rows` as `\[id, content, embedding, type\]`/);
  assert.match(
    mockData,
    /`decay_rows` as `\[id, content, timestamp, importance, last_accessed, old_score\]`/,
  );
  assert.match(
    mockData,
    /`forgetting_rows` as `\[id, content, score, timestamp, type, importance, last_accessed\]`/,
  );

  const sampleRows = pythonBlockAfter(mockData, 'configure `sample_rows`');
  assert.match(sampleRows, /"Decision", \[1\.0, 0\.0, 0\.0\], iso_days_ago\(3\)\]/);

  const clusterRows = pythonBlockAfter(mockData, 'configure `cluster_rows`');
  assert.match(clusterRows, /\[0\.1, 0\.2, 0\.3\], "Insight"\]/);
  assert.equal(
    clusterRows.match(/\["mem_/g).length,
    3,
    'cluster fixtures need min_cluster_size (3) rows to form a cluster',
  );

  const decayRows = pythonBlockAfter(mockData, 'configure `decay_rows`');
  assert.match(
    decayRows,
    /\["mem_001", "Early note", iso_days_ago\(60\), 0\.8, iso_days_ago\(30\), 0\.75\]/,
  );

  const forgettingRows = pythonBlockAfter(mockData, 'configure `forgetting_rows`');
  assert.match(
    forgettingRows,
    /\["mem_001", "Superseded note", 0\.01, iso_days_ago\(365\), "Memory", 0\.1, iso_days_ago\(365\)\]/,
  );
});

test('forgetting fixture produces the outcomes the mock assertions check', async () => {
  const page = await readTestingPage();
  const mockData = section(page, '#### Mock Data Configuration');
  const interactions = section(page, '#### Verifying Mock Interactions');
  const forgettingRows = pythonBlockAfter(mockData, 'configure `forgetting_rows`');

  // mem_001 is the deleted row, mem_002 the archived row, mem_003 the kept row with an updated score.
  assert.match(forgettingRows, /# Deleted[^\n]*\n\s+\["mem_001"/);
  assert.match(forgettingRows, /# Archived[^\n]*\n\s+\["mem_002"/);
  assert.match(forgettingRows, /# Kept[^\n]*\n\s+\["mem_003"/);

  assert.match(interactions, /"mem_001" in graph\.deleted/);
  assert.match(interactions, /memory_id == "mem_002" for memory_id, _score in graph\.archived/);
  assert.match(interactions, /dict\(graph\.updated_scores\)\["mem_003"\] < 0\.2/);
  assert.match(interactions, /assert points == \["mem_001"\]/);
});

test('decay row column order keeps timestamp before last_accessed', async () => {
  const page = await readTestingPage();

  assert.doesNotMatch(
    page,
    /\[id, content, last_accessed, importance, timestamp, relevance_score\]/,
    'the reversed timestamp order is not what _apply_decay() selects',
  );
  assert.doesNotMatch(page, /"access_count": 10/);
  assert.doesNotMatch(page, /"relevance_score": 0\.75/);
});

test('cluster rows are scoped to the graph-embedding fallback', async () => {
  const page = await readTestingPage();
  const mockData = section(page, '#### Mock Data Configuration');

  assert.match(mockData, /graph-embedding fallback in `cluster_similar_memories\(\)`/);
  assert.match(mockData, /runs when the consolidator has no vector store/);
  assert.match(mockData, /reads embeddings from Qdrant instead/);
  assert.match(mockData, /at least `min_cluster_size` rows \(3 by default\)/);
});

test('mcp-automem CI section describes the three jobs and every test job step', async () => {
  const page = await readTestingPage();
  const ci = section(page, '### CI/CD Integration');

  assert.match(ci, /as three jobs/);
  assert.match(ci, /\*\*Check Links\*\* \(`links`\)/);
  assert.match(ci, /`README\.md`, `INSTALLATION\.md`, and `CHANGELOG\.md`/);
  assert.match(ci, /\*\*Hook commands\*\* \(`hooks-windows`\) runs on Windows/);
  assert.match(ci, /tests\/installer\/hook-commands\.test\.ts/);

  const steps = [
    'npm run format:check',
    'npm run lint',
    'npm run build',
    'npm test',
    'npm run test:coverage',
    'npm run test:e2e',
  ];
  const positions = steps.map((step) => {
    const index = ci.indexOf(`\`${step}\``);
    assert.notEqual(index, -1, `expected the ${step} step`);
    return index;
  });
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
    'steps must follow the workflow order',
  );

  assert.match(ci, /`npm run test:coverage` — Coverage report \(non-blocking\)/);
  assert.match(ci, /checks out `verygoodplugins\/automem-website`/);
  assert.doesNotMatch(ci, /^1\. Link validation on documentation files/m);
});
