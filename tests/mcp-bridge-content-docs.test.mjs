import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/mcp-bridge.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function between(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected to find ${startPattern}`);
  const rest = page.slice(start);
  const end = rest.slice(1).search(endPattern);
  assert.notEqual(end, -1, `expected to find ${endPattern} after ${startPattern}`);
  return rest.slice(0, end + 1);
}

async function readEntryModeDiagram() {
  const page = await readPage();
  return between(page, /### Entry Mode Detection/, /\*\*Server Mode\*\*/);
}

test('MCP bridge source notes cover index.ts, mcp-surface.ts, and automem-client.ts on a recorded release pin', async () => {
  const page = await readPage();
  const notes = page.match(/:::note\[Source files\]\n([\s\S]*?)\n:::/);

  assert.ok(notes, 'expected a Source files note');

  const mcpLinks = [
    ...notes[1].matchAll(
      /https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/([0-9a-f]{7,40})\/(src\/[\w./-]+)/g,
    ),
  ];
  const files = mcpLinks.map(([, , file]) => file);

  assert.deepEqual(
    files.sort(),
    ['src/automem-client.ts', 'src/index.ts', 'src/mcp-surface.ts'],
    'source notes must cover index.ts, mcp-surface.ts, and automem-client.ts',
  );
  assert.ok(
    mcpLinks.every(([, sha]) => isPinnedSha('mcp-automem', sha)),
    'mcp-automem source notes must use a recorded mcp-automem release pin',
  );
  assert.match(notes[1], /`createAutoMemMcpServer\(\)`/);
  assert.doesNotMatch(notes[1], /stdio client/i);
});

test('MCP bridge links added or repinned for this change use recorded release pins', async () => {
  const page = await readPage();
  const touched = [
    ['mcp-automem', 'src/env.ts#L12-L24'],
    ['automem', 'mcp-sse-server/server.js#L343-L350'],
    ['automem', 'mcp-sse-server/server.js#L542-L588'],
    ['automem', 'mcp-sse-server/server.js#L684-L714'],
    ['automem', 'automem/runtime_wiring.py#L81-L83'],
  ];

  for (const [repo, target] of touched) {
    const links = [
      ...page.matchAll(
        new RegExp(
          `github\\.com/verygoodplugins/${repo}/blob/([0-9a-f]+)/${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'g',
        ),
      ),
    ];

    assert.ok(links.length >= 1, `expected a ${repo} link to ${target}`);
    assert.ok(
      links.every(([, sha]) => isPinnedSha(repo, sha)),
      `${repo} link to ${target} must use a recorded release pin`,
    );
  }
});

test('MCP bridge entry-mode diagram anchors the server and tool handler in mcp-surface.ts', async () => {
  const diagram = await readEntryModeDiagram();

  assert.match(diagram, /Mode Detection<br\/>src\/index\.ts:30-31/);
  assert.match(diagram, /installStdioErrorGuards\(\)<br\/>src\/index\.ts:102-112/);
  assert.match(diagram, /StdioServerTransport<br\/>src\/index\.ts:448"/);
  assert.match(diagram, /new Server\(\)<br\/>src\/mcp-surface\.ts:1026"/);
  assert.match(diagram, /CallToolRequestSchema<br\/>handler<br\/>src\/mcp-surface\.ts:1038"/);
});

test('MCP bridge entry-mode diagram drops the pre-extraction index.ts anchors', async () => {
  const diagram = await readEntryModeDiagram();

  for (const stale of [
    'src/index.ts:41-42',
    'src/index.ts:100-110',
    'src/index.ts:457-464',
    'src/index.ts:1715',
    'src/index.ts:1424',
  ]) {
    assert.ok(!diagram.includes(stale), `stale anchor ${stale} must not remain`);
  }
});

test('MCP bridge CLI mode routes Copilot and Grok setup', async () => {
  const diagram = await readEntryModeDiagram();

  assert.match(diagram, /COPILOT\["runCopilotSetup\(\)<br\/>src\/cli\/copilot\.ts"\]/);
  assert.match(diagram, /GROK\["runGrokSetup\(\)<br\/>src\/cli\/grok\.ts"\]/);
  assert.match(diagram, /CHECK --> COPILOT\b/);
  assert.match(diagram, /CHECK --> GROK\b/);
});

test('MCP bridge documents the full mcp-automem API key resolution order', async () => {
  const page = await readPage();
  const priority = between(
    page,
    /\*\*mcp-automem environment variable priority:\*\*/,
    /\n---\n/,
  );

  const order = [
    '`AUTOMEM_API_KEY`',
    '`AUTOMEM_API_TOKEN`',
    '`CLAUDE_PLUGIN_OPTION_API_KEY`',
    '`CLAUDE_PLUGIN_OPTION_API_TOKEN`',
  ].map((name) => priority.indexOf(name));

  assert.ok(order.every((index) => index !== -1), 'all four key sources must be listed');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'key sources must be listed in priority order');
  assert.match(priority, /`CLAUDE_PLUGIN_OPTION_api_key`/);
  assert.match(priority, /`CLAUDE_PLUGIN_OPTION_api_token`/);
  assert.match(priority, /`AUTOMEM_API_TOKEN` \(deprecated alias/);
  assert.match(priority, /first non-blank value wins/i);
  assert.doesNotMatch(priority, /\(fallback\)/);
});

test('MCP bridge documents batch associations for the mcp-sse-server client', async () => {
  const page = await readPage();
  const row = page.match(/^\| `associateMemories\(\)` \| POST \| `\/associate` \|(.*)\|$/m);

  assert.ok(row, 'expected the associateMemories() method row');
  assert.match(row[1], /type\/strength/);
  assert.match(row[1], /`associations` array/);
  assert.match(row[1], /1-500/);
  assert.doesNotMatch(row[1], /^\s*Two IDs \+ type\/strength\s*$/);

  const batch = page.match(/\*\*Batch associations:\*\*([^\n]*)/);
  assert.ok(batch, 'expected a Batch associations note');
  assert.match(batch[1], /`\{ associations \}`/);
  assert.match(batch[1], /1-500 entries/);
  assert.match(batch[1], /`memory1_id`, `memory2_id`, `type`, and `strength`/);
  assert.match(batch[1], /mcp-sse-server\/server\.js#L343-L350/);
  assert.match(batch[1], /mcp-sse-server\/server\.js#L542-L588/);
});

test('MCP bridge PORT caution describes a port mismatch, not a Flask :5000 default', async () => {
  const page = await readPage();
  const caution = page.match(/:::caution\[Common Issue: PORT[^\]]*\]\n([\s\S]*?)\n:::/);

  assert.ok(caution, 'expected the PORT caution block');
  assert.match(caution[1], /defaults? to `8001`|falls back to `8001`/);
  assert.match(caution[1], /only when it is unset/);
  assert.match(caution[1], /`AUTOMEM_API_URL`/);
  assert.match(caution[1], /`ECONNREFUSED`/);
  assert.match(caution[1], /runtime_wiring\.py#L81-L83/);
  assert.match(caution[1], /set `PORT=8001` explicitly on the memory-service/);

  assert.doesNotMatch(page, /defaults to `:5000`/);
  assert.doesNotMatch(caution[1], /:5000|port 5000/);
});
