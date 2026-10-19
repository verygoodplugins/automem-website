import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/antigravity.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const match = page.match(new RegExp(`\\n## ${heading}\\n([\\s\\S]*?)(?=\\n---\\n|(?![\\s\\S]))`));
  assert.ok(match, `expected a "${heading}" section`);
  return match[1];
}

function jsonBlocks(markdown) {
  return [...markdown.matchAll(/```json\n([\s\S]*?)```/g)].map(([, body]) => JSON.parse(body));
}

test('antigravity tagging example uses bare category and project tags only', async () => {
  const configuring = section(await readPage(), 'Configuring Agent Instructions');
  const [example] = jsonBlocks(configuring.slice(configuring.indexOf('**Tagging convention:**')));

  assert.ok(example, 'expected a tagging convention JSON example');
  assert.deepEqual(example.tags, ['decision', 'project-name']);
  for (const tag of example.tags) {
    assert.doesNotMatch(tag, /antigravity/i, 'platform tags are excluded by the memory rules');
    assert.doesNotMatch(tag, /\d{4}-\d{2}|YYYY-MM/i, 'date-stamped tags are excluded by the memory rules');
    assert.doesNotMatch(tag, /\//, 'namespace-prefixed tags are excluded by the memory rules');
  }
  assert.equal(example.type, 'Decision');
});

test('antigravity tagging text states the bare-tag rules and the temporal fields', async () => {
  const configuring = section(await readPage(), 'Configuring Agent Instructions');
  const guidance = configuring.slice(configuring.indexOf('**Tagging convention:**'));

  assert.match(guidance, /Keep tags bare/);
  assert.match(
    guidance,
    /rules that mcp-automem generates for Codex, Cursor, Grok, and Claude Desktop \(and its OpenClaw policy\) exclude platform tags \(`antigravity`, `cursor`\)/,
  );
  assert.doesNotMatch(guidance, /other supported hosts/, 'Claude Code, Copilot, and Hermes rules do not state this');
  assert.match(guidance, /namespace prefixes \(`project\/\*`, `lang\/\*`\)/);
  assert.match(guidance, /date-stamped tags \(`YYYY-MM`\)/);
  assert.match(guidance, /use `t_valid` and `t_invalid` on a single-memory `store_memory` call/);
  assert.match(guidance, /Batch items do not accept those fields/);
  assert.doesNotMatch(guidance, /"tags": \[[^\]]*(?:antigravity|YYYY-MM)/);
});

test('antigravity verification lists what the health check reports and no service version', async () => {
  const verification = section(await readPage(), 'Verification');
  const expected = verification.slice(verification.indexOf('Expected response includes:'));

  assert.match(expected, /FalkorDB connection status \(`connected` or `disconnected`\)/);
  assert.match(expected, /Qdrant connection status \(`connected` or `disconnected`\)/);
  assert.match(expected, /Memory and vector counts/);
  assert.match(expected, /a sync status \(/);
  assert.match(expected, /`unknown` when a count is unavailable/);
  assert.doesNotMatch(expected, /comparing them/);
  for (const value of ['synced', 'drift_detected', 'orphaned_vectors', 'unknown']) {
    assert.match(expected, new RegExp(`\`${value}\``));
  }
  assert.doesNotMatch(verification, /version/i, '/health and check_database_health report no service version');
});

test('antigravity server snippets register the memory server through npx', async () => {
  const installation = section(await readPage(), 'Installation');
  const npxSnippets = jsonBlocks(installation).filter(
    (config) => config.mcpServers.memory?.command === 'npx',
  );

  assert.equal(npxSnippets.length, 2, 'expected the cloud and local npx snippets');
  for (const config of npxSnippets) {
    assert.deepEqual(Object.keys(config.mcpServers), ['memory']);
    assert.deepEqual(config.mcpServers.memory.args, ['-y', '@verygoodplugins/mcp-automem']);
    assert.ok(config.mcpServers.memory.env.AUTOMEM_API_URL);
  }
});
