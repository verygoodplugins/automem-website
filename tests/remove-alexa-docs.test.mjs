import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const docsRoot = path.join(repoRoot, 'src/content/docs');

const alexaPagePath = path.join(docsRoot, 'docs/platforms/alexa.md');
const alexaMdxPagePath = path.join(docsRoot, 'docs/platforms/alexa.mdx');

async function read(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function listFiles(root, extensions) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extensions.includes(path.extname(entry.name)))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

test('the Alexa platform page is removed', async () => {
  assert.equal(await exists(alexaPagePath), false, 'alexa.md must not exist');
  assert.equal(await exists(alexaMdxPagePath), false, 'alexa.mdx must not exist');
});

test('the Starlight sidebar has no Alexa entry and keeps its neighbours', async () => {
  const config = await read('astro.config.mjs');

  assert.doesNotMatch(config, /alexa/i);
  assert.doesNotMatch(config, /docs\/platforms\/alexa/);
  assert.match(config, /slug: 'docs\/platforms\/elevenlabs'/);
  assert.match(config, /slug: 'docs\/platforms\/openclaw'/);
});

test('no docs page links to the removed Alexa page', async () => {
  const files = await listFiles(docsRoot, ['.md', '.mdx']);
  assert.ok(files.length > 50, 'expected to scan the docs sources');

  const offenders = [];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    if (/platforms\/alexa/i.test(contents)) {
      offenders.push(path.relative(repoRoot, file));
    }
  }

  assert.deepEqual(offenders, []);
});

test('no docs page or site-wide agent copy mentions Alexa as an integration', async () => {
  // Release notes may later record the upstream route removal, so they are not scanned.
  const releaseNotes = new Set([
    'src/content/docs/docs/development/changelog.md',
    'src/content/docs/docs/whats-new.md',
  ]);
  const files = (await listFiles(docsRoot, ['.md', '.mdx']))
    .map((file) => path.relative(repoRoot, file))
    .filter((file) => !releaseNotes.has(file));
  files.push('src/lib/agent-readiness.mjs', 'public/llms.txt', 'public/skill.md');

  const offenders = [];
  for (const file of files) {
    const contents = await read(file);
    if (/alexa/i.test(contents)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, []);
});

test('overview keeps OpenClaw as the direct API example without Alexa', async () => {
  const overview = await read('src/content/docs/docs/overview.md');

  assert.match(
    overview,
    /Direct API clients such as OpenClaw plugin mode can bypass the bridge entirely\./,
  );
  const directApiSection = overview.match(/### Direct API Integration\n([\s\S]*?)\n---/);
  assert.ok(directApiSection, 'expected the Direct API Integration section');
  assert.match(directApiSection[1], /\[OpenClaw\]\(\/docs\/platforms\/openclaw\/\)/);
  assert.doesNotMatch(directApiSection[1], /alexa/i);
});

test('MCP bridge page no longer documents an Alexa endpoint', async () => {
  const bridge = await read('src/content/docs/docs/architecture/mcp-bridge.md');

  assert.doesNotMatch(bridge, /^### Alexa Integration/m);
  assert.doesNotMatch(bridge, /buildAlexaTags|RememberIntent|RecallIntent|AMAZON\.HelpIntent/);
  assert.doesNotMatch(bridge, /voice interface/i);
  assert.match(
    bridge,
    /uses `process\.env\.AUTOMEM_API_TOKEN` from \[server\.js\]\([^)]+\) \(Streamable HTTP and SSE endpoints\)\./,
  );
  assert.match(bridge, /^### Health Endpoint$/m);

  const choosing = bridge.match(/## Choosing the Right Integration\n([\s\S]*)$/);
  assert.ok(choosing, 'expected the Choosing the Right Integration section');
  assert.match(choosing[1], /ChatGPT, Claude\.ai, ElevenLabs, any cloud AI/);
});
