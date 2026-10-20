import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isPinnedSha } from './helpers/source-pins.mjs';

// Pages whose source links were repinned from pre-release commits to the
// published AutoMem release, with every line anchor re-derived there.
const pages = [
  'core-concepts/recall-tuning.md',
  'operations/backup.md',
  'operations/performance.md',
  'operations/troubleshooting.md',
];

// Any ref is captured, so a branch, tag or short SHA fails the pin check
// instead of slipping past the pattern.
const SOURCE_LINK =
  /https:\/\/github\.com\/verygoodplugins\/(automem|mcp-automem|automem-graph-viewer)\/(?:blob|tree)\/([^/\s)#]+)/gu;

function readPage(page) {
  return readFile(new URL(`../src/content/docs/docs/${page}`, import.meta.url), 'utf8');
}

for (const page of pages) {
  test(`${page} links source only at published release pins`, async () => {
    const links = [...(await readPage(page)).matchAll(SOURCE_LINK)];
    assert.ok(links.length > 0, `${page} has no source links`);

    for (const [url, repo, sha] of links) {
      assert.ok(isPinnedSha(repo, sha), `${page} links ${repo} at unreleased ${sha}: ${url}`);
    }
  });
}

test('relationship-count cache links name the decorated method only', async () => {
  for (const page of ['operations/performance.md', 'operations/troubleshooting.md']) {
    const text = await readPage(page);
    assert.match(text, /consolidation\.py#L201-L216\)/u, page);
    assert.doesNotMatch(text, /consolidation\.py#L201-L217\b/u, page);
  }
  assert.match(
    await readPage('operations/troubleshooting.md'),
    /\[`consolidation\.py:201-216`\]\([^)]*consolidation\.py#L201-L216\)/u,
  );
});

test('performance query-time links open the timing lines', async () => {
  const page = await readPage('operations/performance.md');
  // /analyze reports elapsed_ms on its success return; the old anchor opened its error return.
  assert.match(page, /automem\/api\/recall\.py#L2901\) \| `elapsed_ms`/u);
  assert.match(page, /automem\/api\/health\.py#L100-L107\)/u);
  assert.match(page, /\[`app\.py`\]\([^)]*app\.py#L224-L225\) and passed into `embedding_worker\(\)`/u);
});
