import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/data-stores.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(heading);
  assert.notEqual(start, -1, `expected a "${heading}" heading`);
  const rest = page.slice(start + heading.length);
  const end = rest.search(/\n(?:\*\*[^\n]+\*\*|#{2,3} [^\n]+|---)\n/);
  return end === -1 ? rest : rest.slice(0, end);
}

function sourceLinks(text) {
  return [
    ...text.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/([^)\s#]+)(#L\d+(?:-L\d+)?)?/g,
    ),
  ].map(([, sha, path, anchor]) => ({ sha, path, anchor }));
}

test('data stores source links added or repointed use the validated AutoMem revision', async () => {
  const page = await readPage();
  const touched = sourceLinks(page).filter(
    ({ path, anchor }) =>
      path === 'automem/stores/graph_store.py' ||
      path === 'automem/stores/vector_store.py' ||
      path === 'automem/search/runtime_recall_helpers.py' ||
      (path === 'automem/api/memory.py' && anchor === '#L626'),
  );

  // source note (3 files) + memory creation + keyword search + vector search
  assert.ok(touched.length >= 6, 'expected the repointed search and write-path links');
  assert.ok(
    touched.every(({ sha }) => isPinnedSha('automem', sha)),
    'repointed data store source links must use a validated AutoMem revision',
  );
});

test('memory creation points at the memory API MERGE, not the graph store', async () => {
  const page = await readPage();
  const creation = section(page, '**Memory Node Creation**');

  assert.match(creation, /`MERGE \(m:Memory \{id: \$id\}\)`/);
  const links = sourceLinks(creation);
  assert.equal(links.length, 1);
  assert.equal(links[0].path, 'automem/api/memory.py');
  assert.equal(links[0].anchor, '#L626');
  assert.match(creation, /`POST \/memory` always generates a fresh server-side UUID/);
  assert.match(creation, /does not deduplicate a retried request/);
  assert.doesNotMatch(creation, /idempoten/i);
  assert.doesNotMatch(creation, /graph_store/);
});

test('keyword search is linked to the recall helpers with graph_store as the tag predicate', async () => {
  const page = await readPage();
  const keyword = section(page, '**Keyword Search**');

  const links = sourceLinks(keyword);
  assert.equal(links.length, 1);
  assert.equal(links[0].path, 'automem/search/runtime_recall_helpers.py');
  assert.equal(links[0].anchor, '#L595');
  assert.match(keyword, /`_graph_keyword_search` function performs content and tag matching/);
  assert.match(
    keyword,
    /When tag filters are supplied, it adds the predicate built by `_build_graph_tag_predicate` in `automem\/stores\/graph_store\.py`/,
  );
});

test('vector search is linked to the recall helpers with vector_store as the filter builder', async () => {
  const page = await readPage();
  const vector = section(page, '### Vector Search Implementation');

  const links = sourceLinks(vector);
  assert.equal(links.length, 1);
  assert.equal(links[0].path, 'automem/search/runtime_recall_helpers.py');
  assert.equal(links[0].anchor, '#L940');
  assert.match(vector, /`_vector_search` function performs similarity queries/);
  assert.match(
    vector,
    /covering tag constraints and excluded memory types, with `_build_qdrant_tag_filter` from `automem\/stores\/vector_store\.py`/,
  );
});

test('source note describes the store modules as filter builders, not store abstractions', async () => {
  const page = await readPage();
  const note = page.match(/:::note\[Source files\]\n([\s\S]*?)\n:::/);
  assert.ok(note, 'expected the Source files note');

  assert.match(note[1], /graph_store\.py[^\n]*— Cypher tag-filter predicate builder/);
  assert.match(note[1], /vector_store\.py[^\n]*— Qdrant filter builder/);
  assert.match(note[1], /runtime_recall_helpers\.py[^\n]*`_graph_keyword_search`, `_vector_search`/);
  assert.doesNotMatch(note[1], /FalkorDB abstraction/);
  assert.doesNotMatch(note[1], /Qdrant abstraction/);
});

test('Qdrant configuration documents the host and port URL fallback', async () => {
  const page = await readPage();
  const table = page.match(/\| `QDRANT_URL`[\s\S]*?\| `VECTOR_SIZE`/);
  assert.ok(table, 'expected the Qdrant configuration table');

  assert.match(table[0], /\| `QDRANT_URL` \| _\(none\)_ \|[^\n]*Takes precedence over `QDRANT_HOST` and `QDRANT_PORT`/);
  assert.match(
    table[0],
    /\| `QDRANT_HOST` \| _\(none\)_ \|[^\n]*Used only when `QDRANT_URL` is unset or empty: the API service builds `http:\/\/<QDRANT_HOST>:<QDRANT_PORT>`/,
  );
  assert.match(
    table[0],
    /\| `QDRANT_HOST` [^\n]*`scripts\/reembed_embeddings\.py` reads only `QDRANT_URL`/,
  );
  assert.match(table[0], /\| `QDRANT_PORT` \| `6333` \|[^\n]*`QDRANT_HOST`/);
});

test('Qdrant filtered search is described as tag filters and excluded memory types', async () => {
  const page = await readPage();
  const capabilities = page.match(/Qdrant stores dense vector embeddings[\s\S]*?\n:::/);
  assert.ok(capabilities, 'expected the Qdrant capabilities list');

  assert.match(capabilities[0], /\*\*Filtered search\*\*: Combine vector similarity with tag filters and excluded memory types/);
  assert.doesNotMatch(capabilities[0], /tag\/metadata filters/);
  assert.doesNotMatch(capabilities[0], /memory-type filters/);
});
