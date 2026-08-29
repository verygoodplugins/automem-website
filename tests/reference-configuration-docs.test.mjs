import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/configuration.md', import.meta.url),
);
const automemReleaseSha = 'e147c352b100ebbf29e6555453fdde5152066138';
const mcpReleaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('configuration reference matches the audited AutoMem and MCP release behavior', async () => {
  const page = await readPage();

  assert.match(page, new RegExp(automemReleaseSha, 'u'));
  assert.match(page, new RegExp(mcpReleaseSha, 'u'));

  assert.match(page, /AutoMem defaults `PORT` to `8001` when unset/i);
  assert.match(page, /platform(?:-set)? non-`8001` `PORT` can conflict with callers using `:8001`/i);
  assert.doesNotMatch(page, /Flask defaults to port 5000 if unset/i);
  assert.doesNotMatch(page, /Railway requires `PORT=8001` explicitly set/i);

  assert.match(
    page,
    /Voyage\s*→\s*OpenAI\s*→\s*Ollama \(when configured\)\s*→\s*FastEmbed\s*→\s*placeholder/i,
  );
  assert.doesNotMatch(page, /then local\/Ollama, then placeholder/i);

  assert.match(page, /missing_ids\s*=\s*falkor_ids\s*-\s*qdrant_ids/i);
  assert.match(page, /queues every missing ID/i);
  assert.doesNotMatch(page, /drift exceeds 5%/i);

  assert.match(
    page,
    /1\.\s*`AUTOMEM_API_KEY`[\s\S]*2\.\s*`AUTOMEM_API_TOKEN`[\s\S]*3\.\s*`CLAUDE_PLUGIN_OPTION_API_KEY` \(or `claude_plugin_option_api_key`\)[\s\S]*4\.\s*`CLAUDE_PLUGIN_OPTION_API_TOKEN` \(or `claude_plugin_option_api_token`\)/i,
  );

  assert.match(page, /\[mcp_servers\.memory\]/);
  assert.match(page, /\[mcp_servers\.memory\.env\]/);
  assert.doesNotMatch(page, /\[mcp\.servers\.automem\]/);
});
