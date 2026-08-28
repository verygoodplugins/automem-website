import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/getting-started/quick-start.md', import.meta.url),
);

// Claims audited against automem@e147c352b100ebbf29e6555453fdde5152066138
// and mcp-automem@9a0bbf754dd31db524da25638b0e97907e32ff37.
const automemReleaseSha = 'e147c352b100ebbf29e6555453fdde5152066138';
const mcpReleaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('quick start retains only release-validated installation and health claims', async () => {
  const page = await readPage();

  assert.equal(automemReleaseSha.length, 40);
  assert.equal(mcpReleaseSha.length, 40);

  assert.match(page, /X-API-Key: YOUR_TOKEN/u);
  assert.doesNotMatch(page, /X-API-Token/u);

  assert.match(page, /`qdrant`\s*\|\s*Vector store connection: `"connected"` or `"disconnected"`/u);
  assert.doesNotMatch(page, /"qdrant": "unavailable"/u);

  assert.match(page, /`\$HERMES_HOME`/u);
  assert.match(page, /`\$GROK_HOME`/u);

  assert.match(
    page,
    /Without a TTY[\s\S]*prints the plan and stops unless you explicitly pass `--yes` or set `AUTOMEM_YES=1`/u,
  );
  assert.match(page, /`CI`, `CODEX`, `CLAUDE_CODE`, and `GITHUB_ACTIONS`[\s\S]*suppress animation only/u);
  assert.doesNotMatch(page, /assumes `--yes` automatically/u);

  assert.match(page, /AutoMem defaults to port `8001`/u);
  assert.match(page, /non-`8001` `PORT`[\s\S]*callers.*`:8001`/u);
  assert.match(page, /pin `PORT=8001`/u);
  assert.doesNotMatch(page, /Flask defaults to port 5000/u);
  assert.doesNotMatch(page, /must set `PORT=8001`/u);
});
