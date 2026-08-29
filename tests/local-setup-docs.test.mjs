import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/development/local-setup.md', import.meta.url),
);
const automemRelease = 'e147c352b100ebbf29e6555453fdde5152066138';
const mcpAutomemRelease = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('local setup is pinned to the validated AutoMem and MCP releases', async () => {
  const page = await readPage();

  assert.match(page, new RegExp(`automem/blob/${automemRelease}/scripts/bootstrap_dev\\.sh`));
  assert.match(page, new RegExp(`automem/blob/${automemRelease}/docker-compose\\.yml`));
  assert.match(page, new RegExp(`automem/blob/${automemRelease}/automem/config\\.py`));
  assert.match(page, new RegExp(`automem/blob/${automemRelease}/automem/runtime_wiring\\.py`));
  assert.match(page, new RegExp(`mcp-automem/blob/${mcpAutomemRelease}/package\\.json`));
  assert.doesNotMatch(page, /ed36b98e3e1569dde71aa430417b6549520f7068/);
});

test('local setup names the Compose API service and default consolidation schedule', async () => {
  const page = await readPage();

  assert.match(page, /APIContainer\["flask-api\\nPort 8001\\nOptional"\]/);
  assert.doesNotMatch(page, /memory-service/i);
  assert.match(page, /decay \(1d\)\\ncreative \(7d\)\\ncluster \(30d\)\\nforget disabled/);
  assert.doesNotMatch(page, /decay \(1h\)\\ncreative \(1h\)\\ncluster \(6h\)\\nforget \(1d\)/);
  assert.doesNotMatch(page, /decay \(1h\)|creative \(1h\)|cluster \(6h\)|forget \(1d\)/);
});

test('local setup distinguishes Compose debug exports from the hardcoded Flask runtime', async () => {
  const page = await readPage();

  assert.match(page, /Docker Compose exports `FLASK_ENV=development` and `FLASK_DEBUG=1`/);
  assert.match(page, /`debug=False`/);
  assert.match(page, /do not enable Flask debug mode or the autoreloader/i);
  assert.doesNotMatch(
    page,
    /\| `FLASK_ENV` \| `production` \| Flask mode \(`development` enables debug\) \|/,
  );
  assert.doesNotMatch(page, /```bash\s*FLASK_ENV=development\s*(?:\r?\nLOG_LEVEL=DEBUG)?\s*```/);
  assert.doesNotMatch(page, /FLASK_ENV=development setting enables/i);
  assert.doesNotMatch(page, /auto-reload on file changes/i);
});

test('local setup documents the release-pinned Node engine and build hooks', async () => {
  const page = await readPage();

  assert.match(page, /\^20\.19\.0 \|\| \^22\.13\.0 \|\| >=24/);
  assert.doesNotMatch(page, /\*\*Node\.js\*\*: Version 20\.0\.0 or higher/);
  assert.match(
    page,
    /`tsx scripts\/sync-memory-policy\.ts && node scripts\/sync-template-versions\.mjs`/,
  );
  assert.match(page, /`node scripts\/build-openclaw-plugin-package\.mjs`/);
  assert.doesNotMatch(page, /\| `prebuild` \| `node scripts\/sync-template-versions\.mjs` \|/);
  assert.doesNotMatch(page, /chmod \+x dist\/index\.js/);
});
