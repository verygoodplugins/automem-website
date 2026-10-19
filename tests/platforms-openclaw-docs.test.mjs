import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/openclaw.md', import.meta.url),
);

async function readOpenClawPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected a section starting at ${startPattern}`);
  const rest = page.slice(start);
  const end = rest.slice(1).search(endPattern);
  assert.notEqual(end, -1, `expected the section to end at ${endPattern}`);
  return rest.slice(0, end + 1);
}

function jsonBlock(text) {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, 'expected a json code block');
  return JSON.parse(match[1]);
}

function optionRow(page, flag) {
  const cli = section(page, /### CLI Options/, /\n### What the installer does/);
  const row = cli.split('\n').find((line) => line.startsWith(`| \`${flag} `));
  assert.ok(row, `expected a CLI options row for ${flag}`);
  return row;
}

test('plugin config example uses a single bare default tag', async () => {
  const page = await readOpenClawPage();
  const config = jsonBlock(section(page, /## Plugin Configuration/, /### Config fields/));

  assert.deepEqual(config.plugins.entries.automem.config.defaultTags, ['my-project']);
  assert.doesNotMatch(page, /platform\/openclaw/);
  assert.doesNotMatch(page, /project\/my-project/);
  assert.doesNotMatch(page, /project\/<name>/);
  assert.doesNotMatch(page, /namespace-style/i);
});

test('defaultTags field is merged into stores and updates, not only applied when tags are missing', async () => {
  const page = await readOpenClawPage();
  const fields = section(page, /### Config fields/, /### MCP\/Skill configuration/);
  const row = fields.split('\n').find((line) => line.startsWith('| `defaultTags` |'));
  assert.ok(row, 'expected a defaultTags config field row');

  assert.match(row, /Merged, together with any tags the call supplies/);
  assert.match(row, /stored or updated through the plugin tools/);
  assert.match(row, /project gate for first-turn task-context recall/);
  assert.doesNotMatch(row, /doesn't supply tags/);
  assert.doesNotMatch(page, /Tags applied when the request doesn't supply tags/);
});

test('Tags section describes one sanitized bare slug, or none for ambiguous slugs', async () => {
  const page = await readOpenClawPage();
  const tags = section(page, /### Tags/, /\n### Memory Layers/);

  assert.match(tags, /Tags are bare strings/);
  assert.match(tags, /avoid platform tags like `openclaw`/);
  assert.match(tags, /at most one default tag from the project name/);
  assert.match(tags, /`--name`, otherwise detected from `package\.json`, the git remote, or the directory name/);
  assert.match(tags, /a leading `@scope\/` is dropped/);
  assert.match(tags, /lowercased/);
  assert.match(tags, /each run of non-alphanumeric characters becomes `-`/);
  assert.match(tags, /leading and trailing `-` are trimmed/);
  assert.match(tags, /cut to 64 characters/);
  assert.match(tags, /`api`, `app`, `test`, or `video`/);
  assert.match(tags, /the installer writes no default tag/);
  assert.match(tags, /saved as `defaultTags` in `plugins\.entries\.automem\.config`/);
  assert.match(tags, /recorded as `AUTOMEM_DEFAULT_TAGS` in the skill entry's `env`/);
  assert.doesNotMatch(tags, /automatically added/);
  assert.doesNotMatch(tags, /derived from project name/);
});

test('MCP/skill config example puts the key in top-level apiKey and keeps it out of env', async () => {
  const page = await readOpenClawPage();
  const block = section(page, /### MCP\/Skill configuration/, /\n---\n/);
  const entry = jsonBlock(block).skills.entries.automem;

  assert.equal(entry.enabled, true);
  assert.equal(entry.apiKey, 'your-token-here');
  assert.deepEqual(Object.keys(entry.env).sort(), ['AUTOMEM_API_URL', 'AUTOMEM_DEFAULT_TAGS']);
  assert.equal(entry.env.AUTOMEM_API_URL, 'http://127.0.0.1:8001');
  assert.equal(entry.env.AUTOMEM_DEFAULT_TAGS, 'my-project');
  assert.ok(!('AUTOMEM_API_KEY' in entry.env));

  assert.match(block, /A new entry keeps the API key in the top-level `apiKey` field, not in `env`/);
  assert.match(block, /shipped skills declare `AUTOMEM_API_KEY` as their `primaryEnv`/);
  assert.match(block, /`AUTOMEM_API_KEY` and `AUTOMEM_API_TOKEN` in `env` are set to empty strings/);
  assert.match(block, /keeps that copy in sync with `apiKey` on a re-run/);
  assert.match(block, /`AUTOMEM_DEFAULT_TAGS` is added only when a default tag resolves/);
});

test('skill-mode installer step names env.AUTOMEM_API_URL and the top-level apiKey', async () => {
  const page = await readOpenClawPage();
  const installer = section(page, /### What the installer does/, /### Workspace Detection/);
  const skillMode = section(installer, /\*\*Skill mode \(legacy\):\*\*/, /$/);

  assert.match(skillMode, /`env\.AUTOMEM_API_URL`/);
  assert.match(skillMode, /`env\.AUTOMEM_DEFAULT_TAGS` when a default project tag resolves/);
  assert.match(skillMode, /API key as a top-level `apiKey`/);
  assert.doesNotMatch(skillMode, /Configures `skills\.entries\.automem\.env` with endpoint and API key/);
  assert.doesNotMatch(page, /Configures `skills\.entries\.automem\.env` with endpoint and API key/);
});

test('legacy curl store example uses non-platform tags', async () => {
  const page = await readOpenClawPage();
  const legacy = section(page, /## Memory Operations \(Legacy Skill\)/, /\*\*Recall memories:\*\*/);
  const body = legacy.match(/-d '(\{[\s\S]*?\})'/);
  assert.ok(body, 'expected the store example -d body');
  const payload = JSON.parse(body[1]);

  assert.deepEqual(payload.tags, ['project-slug', 'decision']);
  assert.equal(payload.importance, 0.7);
  assert.match(legacy, /Replace `project-slug` with your bare project tag/);
  assert.doesNotMatch(page, /"tags": \["openclaw"\]/);
});

test('CLI defaults document the endpoint and key environment fallbacks', async () => {
  const page = await readOpenClawPage();
  const endpoint = optionRow(page, '--endpoint');
  const apiKey = optionRow(page, '--api-key');

  assert.match(endpoint, /`\$AUTOMEM_API_URL`, then `\$AUTOMEM_ENDPOINT`, then `http:\/\/127\.0\.0\.1:8001`/);
  assert.match(apiKey, /`\$AUTOMEM_API_KEY`, then `\$AUTOMEM_API_TOKEN`/);
  assert.doesNotMatch(apiKey, /None \(optional\)/);

  const cli = section(page, /### CLI Options/, /\n### What the installer does/);
  assert.match(cli, /The environment fallback for the key is paired with the endpoint/);
  assert.match(cli, /used only when no endpoint is exported \(`AUTOMEM_API_URL`, then `AUTOMEM_ENDPOINT`\)/);
  assert.match(cli, /or when the exported endpoint matches the one being installed/);
  assert.match(cli, /a key already stored in `openclaw\.json` is reused on a re-run, again only for the same endpoint/);
  assert.doesNotMatch(cli, /CLAUDE_PLUGIN_OPTION/);
});

test('--plugin-source default prefers the bundled plugin package', async () => {
  const page = await readOpenClawPage();
  const row = optionRow(page, '--plugin-source');

  assert.match(row, /bundled `dist\/openclaw-plugin-package` when present/);
  assert.match(row, /otherwise `@verygoodplugins\/mcp-automem`/);
  assert.doesNotMatch(row, /\| `@verygoodplugins\/mcp-automem` \|\s*$/);
});
