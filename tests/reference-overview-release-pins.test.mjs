import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { isPinnedSha } from './helpers/source-pins.mjs';

// Pages whose source links were repinned from pre-release commits to the
// published AutoMem and mcp-automem releases.
const pages = [
  'deployment/railway.md',
  'overview.md',
  'reference/api/relationships.md',
  'reference/configuration.md',
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

test('relationships source note points associate_memories at src/mcp-surface.ts', async () => {
  const page = await readPage('reference/api/relationships.md');
  assert.match(
    page,
    /\[src\/mcp-surface\.ts\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/mcp-surface\.ts\) — MCP `associate_memories` tool/u,
  );
  assert.doesNotMatch(page, /\[src\/index\.ts\]\([^)]*\) — MCP `associate_memories` tool/u);
});

test('overview describes require_api_token as a before_request call, not a decorator', async () => {
  const page = await readPage('overview.md');
  assert.doesNotMatch(page, /`require_api_token` decorator/u);
  assert.match(page, /which an `@app\.before_request` hook calls/u);
  assert.match(page, /`X-Admin-Token` \(or `X-Admin-Api-Key`\) header/u);
});
