import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const defaultPagePath = fileURLToPath(
  new URL('../src/content/docs/docs/cli/config-tools.md', import.meta.url),
);
const pagePath = process.env.CONFIG_TOOLS_DOCS_PAGE_PATH || defaultPagePath;
const releaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('config tools docs match the audited 0.16.0 config surfaces', async () => {
  const page = await readPage();

  assert.match(page, new RegExp(releaseSha, 'u'));
  assert.match(
    page,
    /AUTOMEM_API_URL[\s\S]*CLAUDE_PLUGIN_OPTION_API_URL[\s\S]*AUTOMEM_ENDPOINT[\s\S]*http:\/\/127\.0\.0\.1:8001/i,
  );
  assert.match(page, /CLAUDE_PLUGIN_OPTION_API_KEY/);
  assert.match(page, /CLAUDE_PLUGIN_OPTION_API_TOKEN/);

  assert.match(page, /"memory"\s*:\s*\{/);
  assert.match(
    page,
    /"args"\s*:\s*\[\s*"@verygoodplugins\/mcp-automem"\s*\]/,
  );
  assert.doesNotMatch(
    page,
    /"args"\s*:\s*\[\s*"-y"\s*,\s*"@verygoodplugins\/mcp-automem"\s*\]/,
  );

  assert.match(page, /\[mcp_servers\.memory\]/);
  assert.match(page, /\[mcp_servers\.memory\.env\]/);
  assert.match(page, /args = \["-y", "@verygoodplugins\/mcp-automem"\]/);
  assert.doesNotMatch(page, /\[\[mcp_servers\]\]/);
  assert.doesNotMatch(page, /name = "automem"/);

  assert.match(page, /mcp-automem recall --query "project architecture"/);
  assert.doesNotMatch(page, /mcp-automem recall "project architecture"/);

  assert.match(page, /AUTOMEM_PROCESS_TAG=cursor-session-1/);
  assert.match(page, /AutoMem server running on stdio transport/);
  assert.doesNotMatch(page, /HTTP request\/response details/i);
  assert.doesNotMatch(page, /Retry attempts and backoff timing/i);
  assert.doesNotMatch(page, /Each tool call with parameters/i);
  assert.doesNotMatch(page, /Configuration values loaded/i);
});
