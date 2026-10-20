import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const read = (path) => readFile(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

function section(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected a section starting at ${startPattern}`);
  const rest = page.slice(start);
  const end = rest.slice(1).search(endPattern);
  assert.notEqual(end, -1, `expected the section to end at ${endPattern}`);
  return rest.slice(0, end + 1);
}

test('setup troubleshooting treats a missing AUTOMEM_API_URL as a default-URL warning, not a missing .env', async () => {
  const page = await read('src/content/docs/docs/cli/setup.md');
  const row = page.split('\n').find((line) => line.startsWith('| `AUTOMEM_API_URL not set`'));

  assert.ok(row, 'expected the AUTOMEM_API_URL not set troubleshooting row');
  assert.match(row, /falls back to `http:\/\/127\.0\.0\.1:8001`/);
  assert.match(row, /prints this warning only in an interactive terminal/);
  assert.match(row, /Run the `install` wizard \(`setup` is an alias\), or set `AUTOMEM_API_URL`/);
  assert.match(row, /Nothing to fix if your AutoMem runs at the default local address/);
  assert.doesNotMatch(row, /`\.env` file missing or not in current directory/);
  assert.doesNotMatch(row, /manually create `\.env`/);
});

test('Claude Desktop importance table matches the Personal Preferences template values', async () => {
  const page = await read('src/content/docs/docs/platforms/claude-desktop.md');
  const patterns = section(page, /### Memory Storage Patterns/, /\n---\n/);

  assert.match(patterns, /Importance values the template uses:/);
  assert.match(patterns, /\| Preference \/ Decision \| 0\.9 \|/);
  assert.match(patterns, /\| Insight \/ Bug fix \| 0\.75 \|/);
  assert.match(patterns, /\| Pattern \| 0\.8 \|/);
  assert.doesNotMatch(patterns, /\| Insight \/ Bug fix \| 0\.8 \|/);
  assert.doesNotMatch(patterns, /\| Pattern \| 0\.7 \|/);
  assert.doesNotMatch(patterns, /\| Context \|/);
  assert.doesNotMatch(patterns, /Recommended importance thresholds/);

  assert.match(
    patterns,
    /store the correction as a high-importance `Preference` tagged `correction`/,
  );
  assert.doesNotMatch(patterns, /style signal/);
});

test('Claude Desktop key sections name the template headings', async () => {
  const page = await read('src/content/docs/docs/platforms/claude-desktop.md');
  const sections = section(page, /Key sections:/, /### Memory Storage Patterns/);

  for (const heading of [
    'Memory - Desktop is semantic-first',
    'Conversation start - semantic-first recall',
    'Storage Discipline',
    'Three mid-conversation triggers (and only three)',
    'The atomic ritual - every store runs all four steps',
    'Mandatory association pairings',
  ]) {
    assert.ok(sections.includes(`| ${heading} |`), `expected a row named ${heading}`);
  }

  for (const invented of [
    '| Desktop is semantic-first |',
    '| Conversation start |',
    '| When to store |',
    '| Storage format |',
    '| Mid-conversation memory ops |',
    '| Relation types |',
  ]) {
    assert.ok(!sections.includes(invented), `unexpected row ${invented}`);
  }

  assert.match(sections, /lists the 11 authorable relation types for `associate_memories`/);
});

test('Claude Desktop documents AUTOMEM_API_URL as optional with a local default', async () => {
  const page = await read('src/content/docs/docs/platforms/claude-desktop.md');
  const env = section(page, /## Environment Variables/, /\n---\n/);

  assert.match(
    env,
    /\| `AUTOMEM_API_URL` \| No \| AutoMem service URL\. Defaults to the local URL; set it for cloud deployments \|/,
  );
  assert.doesNotMatch(env, /\| `AUTOMEM_API_URL` \| Yes \|/);
});

test('Claude Desktop and Antigravity authentication troubleshooting does not invent key expiry', async () => {
  for (const [path, app, next] of [
    ['src/content/docs/docs/platforms/claude-desktop.md', 'Claude Desktop', /### Memory not persisting/],
    ['src/content/docs/docs/platforms/antigravity.md', 'Antigravity', /### MCP Store vs\. custom server conflicts/],
  ]) {
    const page = await read(path);
    const auth = section(page, /### Authentication failures/, next);

    assert.match(auth, /has no token expiry/, path);
    assert.match(auth, /fails only if the service token changed/, path);
    assert.match(auth, new RegExp(`Update \`AUTOMEM_API_KEY\` to the current value and restart ${app}`), path);
    assert.doesNotMatch(auth, /Regenerate API key if expired/, path);
  }
});

test('Claude Desktop health verification only promises stats the service reports', async () => {
  const page = await read('src/content/docs/docs/platforms/claude-desktop.md');
  const verification = section(page, /## Verification/, /\n---\n/);

  assert.match(
    verification,
    /- Other statistics when the service reports them, such as memory and vector counts, sync status, and enrichment status/,
  );
});

test('llms.txt and the agent-readiness homepage spell Google Antigravity', async () => {
  const llms = await read('public/llms.txt');
  const readiness = await read('src/lib/agent-readiness.mjs');

  assert.match(llms, /^- Google Antigravity: https:\/\/automem\.ai\/docs\/platforms\/antigravity\/$/m);
  assert.match(readiness, /OpenClaw, and Google Antigravity\./);
  assert.doesNotMatch(llms, /AntiGravity/);
  assert.doesNotMatch(readiness, /AntiGravity/);

  const antigravityPage = await read('src/content/docs/docs/platforms/antigravity.md');
  assert.match(antigravityPage, /^title: Google Antigravity$/m);
});
