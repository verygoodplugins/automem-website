import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isPinnedSha } from './helpers/source-pins.mjs';

// Pages whose source links were repinned from pre-release commits to the
// published AutoMem and mcp-automem releases, with line numbers re-derived there.
const pages = ['best-practices/progressive-disclosure.md', 'development/structure.md'];

// Short SHAs are matched too, so a 7-character pin cannot slip past.
const SOURCE_LINK =
  /https:\/\/github\.com\/verygoodplugins\/(automem|mcp-automem|automem-graph-viewer)\/(?:blob|tree)\/([0-9a-f]{7,40})\//gu;

// A `path:N-M` label, or "lines N-M" prose right after the link, must name the
// lines its anchor opens.
const LABELLED_ANCHOR =
  /\[`?[\w./-]+:(\d+)(?:-(\d+))?`?\]\(https:\/\/github\.com\/verygoodplugins\/[^)\s]*#L(\d+)(?:-L(\d+))?\)/gu;
const ANCHOR_THEN_LINES =
  /\(https:\/\/github\.com\/verygoodplugins\/[^)\s]*#L(\d+)(?:-L(\d+))?\)[^\n[]*?\blines (\d+)-(\d+)/gu;

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

test('line numbers named beside a source link match its anchor', async () => {
  let checked = 0;
  for (const page of pages) {
    const text = await readPage(page);
    for (const [link, from, to, anchorFrom, anchorTo] of text.matchAll(LABELLED_ANCHOR)) {
      assert.equal(`${from}-${to ?? from}`, `${anchorFrom}-${anchorTo ?? anchorFrom}`, `${page}: ${link}`);
      checked += 1;
    }
    for (const [link, anchorFrom, anchorTo, from, to] of text.matchAll(ANCHOR_THEN_LINES)) {
      assert.equal(`${from}-${to}`, `${anchorFrom}-${anchorTo ?? anchorFrom}`, `${page}: ${link}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 5, `expected line-numbered links to check, found ${checked}`);
});

test('progressive disclosure points the tool surface at src/mcp-surface.ts', async () => {
  const page = await readPage('best-practices/progressive-disclosure.md');
  assert.match(page, /Tool definitions: \[`src\/mcp-surface\.ts`\]/u);
  assert.match(page, /Tool handlers: \[`src\/mcp-surface\.ts`\]/u);
  assert.doesNotMatch(page, /src\/index\.ts#L(?:466|1424)\b/u);
  assert.doesNotMatch(page, /invoked at line 1714/u);
});

test('development structure lists types that src/types.ts exports', async () => {
  const page = await readPage('development/structure.md');
  for (const removed of ['MCPServerConfig', 'ClaudeCodeConfig', 'AssociateMemoriesArgs', 'SetupAnswers']) {
    assert.doesNotMatch(page, new RegExp(`\`${removed}\``, 'u'));
  }
  assert.match(page, /`AssociateMemoryArgs`/u);
});
