import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/core-concepts/consolidation.md', import.meta.url),
);
const sourceSha = '5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('consolidation source-note links use the validated AutoMem source pin', async () => {
  const page = await readPage();
  const sourceNote = page.match(/:::note\[Source files\]\n([\s\S]*?)\n:::/);

  assert.ok(sourceNote, 'expected a Source files note');
  const sourceLinks = [
    ...sourceNote[1].matchAll(
      /https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/[^)#]+(?:#L\d+(?:-L\d+)?)?/g,
    ),
  ];

  assert.ok(sourceLinks.length >= 12, 'expected pinned consolidation source-note links');
  assert.ok(
    sourceLinks.every(([, sha]) => sha === sourceSha),
    'consolidation source-note links must use the validated source pin',
  );
});

test('consolidation documents the persisted MetaMemory contract', async () => {
  const page = await readPage();
  const section = page.match(/\*\*MetaMemory Node Properties:\*\*\n([\s\S]*?)\n---/);

  assert.ok(section, 'expected a MetaMemory Node Properties section');
  assert.match(section[1], /`:Memory:MetaMemory`/);
  assert.match(section[1], /\| `id` \| string \|/);
  assert.match(section[1], /\| `type` \| string \| `"MetaPattern"` \|/);
  assert.match(section[1], /\| `timestamp` \| ISO datetime \|/);
  assert.doesNotMatch(section[1], /\| `label` \|/);
  assert.doesNotMatch(section[1], /\| `dominant_type` \|/);
  assert.doesNotMatch(section[1], /\| `temporal_span_days` \|/);
  assert.doesNotMatch(section[1], /\| `created_at` \|/);
  assert.match(page, /cluster\["size"\] >= 5/);
});

test('consolidation documents SUMMARIZES links by MetaMemory and member IDs', async () => {
  const page = await readPage();

  assert.match(page, /MATCH \(meta:MetaMemory \{id: \$meta_id\}\)/);
  assert.match(page, /MATCH \(m:Memory \{id: \$mem_id\}\)/);
  assert.match(page, /CREATE \(meta\)-\[:SUMMARIZES\]->\(m\)/);
});
