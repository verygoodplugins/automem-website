import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/mcp-bridge.md', import.meta.url),
);
const releaseSha = 'e147c352b100ebbf29e6555453fdde5152066138';

test('MCP bridge documents the 0.16.2 recall result formats', async () => {
  const page = await readFile(pagePath, 'utf8');
  const resultFormatting = page.match(/### Result Formatting\n([\s\S]*?)\n---/);

  assert.ok(resultFormatting, 'expected a Result Formatting section');
  const section = resultFormatting[1];
  const sourceLinks = [
    ...section.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/mcp-sse-server\/server\.js#L\d+-L\d+/g),
  ];

  assert.ok(sourceLinks.length >= 2, 'expected pinned server.js source links');
  assert.ok(
    sourceLinks.every(([, sha]) => sha === releaseSha),
    'result-formatting links must use the 0.16.2 release source pin',
  );
  assert.match(section, /compact[\s\S]*`Created:`[\s\S]*timestamp[\s\S]*created_at/i);
  assert.match(section, /detailed[\s\S]*`Timestamp:`[\s\S]*timestamp[\s\S]*created_at/i);
  assert.match(section, /`json`[\s\S]*(?:raw|unchanged)[\s\S]*(?:response|payload)/i);
});
