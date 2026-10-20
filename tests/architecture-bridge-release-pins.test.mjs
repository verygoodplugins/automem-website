import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isPinnedSha } from './helpers/source-pins.mjs';

// Pages whose source links were repinned from pre-release commits to the
// published AutoMem release, with every line anchor re-derived there.
const pages = [
  'architecture/enrichment.md',
  'architecture/mcp-bridge.md',
  'architecture/overview.md',
];

// Any ref is captured, so a branch, tag or short SHA fails the pin check
// instead of slipping past the pattern.
const SOURCE_LINK =
  /https:\/\/github\.com\/verygoodplugins\/(automem|mcp-automem|automem-graph-viewer)\/(?:blob|tree)\/([^/\s)#]+)/gu;

// A `path:N` or `path:N-M` link label must name the lines its anchor opens.
const LABELLED_ANCHOR =
  /\[`?[\w./-]+:(\d+)(?:-(\d+))?`?\]\(https:\/\/github\.com\/verygoodplugins\/[^)\s]*#L(\d+)(?:-L(\d+))?\)/gu;

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

test('line-number link labels match their anchors', async () => {
  let checked = 0;
  for (const page of pages) {
    for (const [link, from, to, anchorFrom, anchorTo] of (await readPage(page)).matchAll(
      LABELLED_ANCHOR,
    )) {
      assert.equal(`${from}-${to ?? from}`, `${anchorFrom}-${anchorTo ?? anchorFrom}`, `${page}: ${link}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 25, `expected labelled anchors to check, found ${checked}`);
});

test('mcp-bridge prose names the release, not a commit', async () => {
  const page = await readPage('architecture/mcp-bridge.md');
  assert.doesNotMatch(page, /at `[0-9a-f]{7,40}`/u);
  assert.match(page, /request-scoped at AutoMem v0\.16\.2/u);
});

test('architecture overview describes the legacy dimension check as log-only', async () => {
  const page = await readPage('architecture/overview.md');
  assert.doesNotMatch(page, /validate_vector_dimensions\(\)` function [^\n]*prevents dimension mismatches/u);
  assert.match(page, /The legacy `validate_vector_dimensions\(\)` only logs/u);
  assert.match(page, /`VECTOR_SIZE_AUTODETECT=false`, a mismatch raises `VectorDimensionMismatchError`/u);
});
