import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/getting-started/environment-variables.md', import.meta.url),
);
const automemReleaseSha = 'e147c352b100ebbf29e6555453fdde5152066138';
const mcpReleaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('environment variables docs match the audited AutoMem and MCP release behavior', async () => {
  const page = await readPage();

  assert.match(page, /AutoMem defaults `PORT` to `8001` when unset/i);
  assert.doesNotMatch(page, /mandatory on Railway/i);
  assert.doesNotMatch(page, /Flask defaults to port 5000 if unset/i);

  assert.match(
    page,
    /JIT_ENRICHMENT_ENABLED[\s\S]*Run lightweight enrichment during recall for memories not yet handled by the background worker/i,
  );
  assert.doesNotMatch(page, /JIT_ENRICHMENT_ENABLED[\s\S]*inline on store/i);
  assert.doesNotMatch(page, /JIT_ENRICHMENT_ENABLED[\s\S]*just-in-time/i);

  assert.match(
    page,
    /SEARCH_WEIGHT_RELEVANCE[\s\S]*Weight on consolidation-decay `relevance_score` \(access patterns \+ age\); `0\.0` disables it\./i,
  );
  assert.doesNotMatch(page, /SEARCH_WEIGHT_RELEVANCE[\s\S]*LLM-scored relevance/i);
  assert.doesNotMatch(page, /SEARCH_WEIGHT_RELEVANCE[\s\S]*Experimental/i);

  assert.doesNotMatch(page, /### API Server/u);
  assert.doesNotMatch(page, /`LOG_LEVEL`/u);
  assert.doesNotMatch(page, /`FLASK_ENV`/u);

  assert.match(
    page,
    /`AUTOMEM_STOP_DOCKER`[\s\S]*Auto-stop Docker Compose started by the test fixture; set `0`, `false`, or `no` to leave it running/i,
  );
  assert.match(page, /`AUTOMEM_STOP_DOCKER`\s*\|\s*No\s*\|\s*`1`\s*\|/u);
  assert.match(page, /`AUTOMEM_TEST_API_TOKEN`\s*\|\s*No\s*\|\s*`test-token`\s*\|/u);
  assert.match(page, /`AUTOMEM_TEST_ADMIN_TOKEN`\s*\|\s*No\s*\|\s*`test-admin-token`\s*\|/u);

  assert.match(page, /`AUTOMEM_PARENT_WATCHDOG_MS`\s*\|\s*No\s*\|\s*`30000`\s*\|/u);
  assert.match(
    page,
    new RegExp(`github\\.com/verygoodplugins/mcp-automem/blob/${mcpReleaseSha}/src/index\\.ts#L478-L485`, 'u'),
  );
  assert.doesNotMatch(page, new RegExp(`github\\.com/verygoodplugins/mcp-automem/blob/${mcpReleaseSha}/src/lifecycle\\.ts`, 'u'));
  assert.match(page, new RegExp(mcpReleaseSha, 'u'));
  assert.match(page, new RegExp(automemReleaseSha, 'u'));
});
