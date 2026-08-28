import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const defaultPagePath = fileURLToPath(
  new URL('../src/content/docs/docs/cli/setup.md', import.meta.url),
);
const pagePath = process.env.CLI_SETUP_DOCS_PAGE_PATH || defaultPagePath;
const releaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('cli setup docs match the audited 0.16.0 setup and config surfaces', async () => {
  const page = await readPage();

  assert.match(page, /npm run prebuild.*memory-policy.*template versions/si);
  assert.match(page, new RegExp(releaseSha, 'u'));
  assert.match(page, /Print the current configuration for other platforms \(Claude Desktop JSON, Claude Code env export, Hermes YAML\)/);
  assert.match(page, /npx @verygoodplugins\/mcp-automem config/);
  assert.match(page, /npx @verygoodplugins\/mcp-automem config --format=json/);
  assert.match(page, /human-readable output/);
  assert.match(page, /raw MCP configuration object/);
  assert.match(page, /For Claude Code:.*placeholder API key/si);
  assert.match(page, /your-auto-mem-api-key/);
  assert.match(page, /For Hermes:.*`mcp_servers` YAML snippet/si);
  assert.match(page, /npx @verygoodplugins\/mcp-automem hermes/);
  assert.doesNotMatch(
    page,
    /For Hermes:.*`mcp_servers`\s+or\s+`memory\.provider`/si,
  );
  assert.doesNotMatch(page, /For Cursor\/Codex:/);
  assert.doesNotMatch(page, /exact Desktop snippet/u);

  for (const templateDir of [
    'antigravity',
    'claude-code',
    'codex',
    'copilot',
    'cursor',
    'grok',
    'hermes',
    'openclaw',
  ]) {
    assert.match(page, new RegExp(String.raw`${templateDir}\/`, 'u'));
  }
});
