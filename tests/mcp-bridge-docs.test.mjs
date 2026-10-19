import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const defaultPagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/mcp-bridge.md', import.meta.url),
);
const pagePath = process.env.MCP_BRIDGE_DOCS_PAGE_PATH || defaultPagePath;

async function readResultFormatting() {
  const page = await readFile(pagePath, 'utf8');
  const resultFormatting = page.match(/### Result Formatting\n([\s\S]*?)\n---/);

  assert.ok(resultFormatting, 'expected a Result Formatting section');
  return resultFormatting[1];
}

test('MCP bridge result-formatting links use a recorded AutoMem release pin', async () => {
  const section = await readResultFormatting();
  const sourceLinks = [
    ...section.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/mcp-sse-server\/server\.js#L\d+-L\d+/g),
  ];

  assert.ok(sourceLinks.length >= 2, 'expected pinned server.js source links');
  assert.ok(
    sourceLinks.every(([, sha]) => isPinnedSha('automem', sha)),
    'result-formatting links must use a recorded AutoMem release pin',
  );
});

test('MCP bridge documents compact Created output and its timing rationale', async () => {
  const section = await readResultFormatting();

  assert.match(section, /compact[\s\S]*`Created:`[\s\S]*timestamp[\s\S]*created_at/i);
  assert.match(section, /standalone `Created:` line after `ID:`/i);
  assert.match(section, /relative language[\s\S]*current moment/i);
});

test('MCP bridge documents the detailed timestamp fallback', async () => {
  const section = await readResultFormatting();

  assert.match(section, /detailed[\s\S]*`Timestamp:`[\s\S]*timestamp[\s\S]*created_at/i);
});

test('MCP bridge documents unchanged raw json output', async () => {
  const section = await readResultFormatting();

  assert.match(
    section,
    /`json` bypasses result formatting[\s\S]*raw upstream API response unchanged/i,
  );
});
