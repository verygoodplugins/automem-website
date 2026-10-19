import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha, pins } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/research.md', import.meta.url),
);

const AUTOMEM_LINK =
  /https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/([^#)\s]+)#L(\d+)(?:-L(\d+))?/g;

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A heading's body, up to the next heading or horizontal rule.
function section(page, heading) {
  const match = page.match(
    new RegExp(`${escapeRegExp(heading)}\\n([\\s\\S]*?)(?=\\n#{2,3} |\\n---\\n|$)`),
  );
  assert.ok(match, `expected a "${heading}" section`);
  return match[1];
}

function automemLinks(text) {
  return [...text.matchAll(AUTOMEM_LINK)].map(([, sha, path, from, to]) => ({
    sha,
    path,
    from: Number(from),
    to: Number(to ?? from),
  }));
}

const dualDatabase = (page) => section(page, '### Dual Database Architecture');
const enrichment = (page) =>
  section(page, '### Enrichment Pipeline: Automatic Knowledge Graph Construction');
const hybridSearch = (page) => section(page, '### Hybrid Search: Parallel Retrieval Pathways');
const summary = (page) => section(page, '## Summary: Research Principles in Production');

const releaseShas = pins['verygoodplugins/automem'].releases.map(({ sha }) => sha);

test('research implementation-mapping links use a published AutoMem release revision', async () => {
  const page = await readPage();
  const sections = {
    'dual database': [dualDatabase(page), 2],
    enrichment: [enrichment(page), 5],
    'hybrid search': [hybridSearch(page), 2],
    summary: [summary(page), 4],
  };

  for (const [name, [text, expectedCount]] of Object.entries(sections)) {
    const links = automemLinks(text);
    assert.equal(links.length, expectedCount, `${name} source link count`);
    for (const { sha, path } of links) {
      assert.ok(
        isPinnedSha('automem', sha),
        `${name} link to ${path} must use a pinned AutoMem revision`,
      );
      assert.ok(
        releaseShas.includes(sha),
        `${name} link to ${path} must use a published release revision, not a legacy pin`,
      );
    }
  }
});

test('research dual database table points at the client initialisation helpers', async () => {
  const text = dualDatabase(await readPage());
  const rows = text.split('\n').filter((line) => /^\| (FalkorDB|Qdrant) \|/.test(line));

  assert.equal(rows.length, 2);
  const [falkordb, qdrant] = rows;
  assert.match(falkordb, /\[`automem\/stores\/runtime_clients\.py:12-51`\]/);
  assert.match(falkordb, /runtime_clients\.py#L12-L51\) `init_falkordb\(\)`/);
  assert.match(qdrant, /\[`automem\/stores\/runtime_clients\.py:54-110`\]/);
  assert.match(qdrant, /runtime_clients\.py#L54-L110\) `init_qdrant\(\)`/);
  assert.doesNotMatch(text, /app\.py/);
});

test('research entity tags use plural categories assembled as entity:{category}:{slug}', async () => {
  const text = enrichment(await readPage());
  const lead = text.match(/\*\*Auto-tagging strategy\*\*([\s\S]*?)\n\n\|/);

  assert.ok(lead, 'expected the auto-tagging lead-in before the table');
  assert.match(lead[1], /`enrich_memory\(\)`/);
  assert.match(lead[1], /`entity:\{category\}:\{slug\}`/);
  assert.match(lead[1], /runtime_orchestration\.py#L221-L228/);
  for (const category of ['tools', 'projects', 'people', 'concepts', 'organizations']) {
    assert.match(
      lead[1],
      new RegExp(`\`${category}\``),
      `lead-in should name the ${category} category`,
    );
  }

  for (const tag of [
    'entity:tools:postgresql',
    'entity:projects:automem',
    'entity:people:jack-ross',
    'entity:concepts:reliability',
  ]) {
    const rows = text.split('\n').filter((line) => line.includes(`\`${tag}\``));
    assert.equal(rows.length, 1, `expected one table row for ${tag}`);
    assert.equal(
      rows[0].split(tag).length - 1,
      2,
      `${tag} should appear as both the tag format and the example result`,
    );
    assert.match(rows[0], /entity_extraction\.py#L151-L159\) `extract_entities\(\)`/);
  }

  assert.match(text, /`tags=entity:tools&tag_match=prefix`/);
  assert.doesNotMatch(
    text,
    /entity:(tool|project|person|concept)[:&]/,
    'singular entity tag categories are not what the server writes',
  );
  assert.doesNotMatch(text, /app\.py/);
});

test('research hybrid search section links /recall to its handler and route', async () => {
  const text = hybridSearch(await readPage());
  const links = automemLinks(text);

  assert.deepEqual(
    links.map(({ path, from, to }) => [path, from, to]),
    [
      ['automem/api/recall.py', 1704, 1704],
      ['automem/api/recall.py', 2665, 2666],
    ],
  );
  assert.match(text, /`handle_recall\(\)`/);
  assert.match(text, /`create_recall_blueprint\(\)`/);
  assert.doesNotMatch(text, /app\.py/);
});

test('research summary table links each implementation to the module that holds it', async () => {
  const text = summary(await readPage());
  const rowFor = (paper) => {
    const row = text.split('\n').find((line) => line.startsWith(`| **${paper}** |`));
    assert.ok(row, `expected a ${paper} summary row`);
    return row;
  };

  assert.match(
    rowFor('HippoRAG 2'),
    /\[`automem\/stores\/runtime_clients\.py:12-110`\].*runtime_clients\.py#L12-L110\)/,
  );
  assert.match(
    rowFor('A-MEM'),
    /\[`consolidation\.py:1118-1137`\].*\/consolidation\.py#L1118-L1137\)/,
  );
  assert.match(
    rowFor('MELODI'),
    /\[`automem\/utils\/entity_extraction\.py:127-148`\].*entity_extraction\.py#L127-L148\)/,
  );
  assert.match(
    rowFor('ReadAgent'),
    /\[`automem\/utils\/time\.py:89-159`\].*time\.py#L89-L159\) `_parse_time_expression\(\)`/,
  );
  assert.doesNotMatch(text, /app\.py/);
  assert.doesNotMatch(text, /blob\/main\//);
});

test('research page no longer links into the app.py bootstrap module', async () => {
  const page = await readPage();

  assert.doesNotMatch(page, /automem\/blob\/[^/\s)]+\/app\.py/);
  assert.doesNotMatch(page, /blob\/main\/consolidation\.py/);
});
