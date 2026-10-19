import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/development/structure.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Text between a start marker and the next marker, so assertions stay scoped.
function between(page, start, end) {
  const from = page.indexOf(start);
  assert.notEqual(from, -1, `expected to find ${start}`);
  const to = page.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `expected to find ${end} after ${start}`);
  return page.slice(from, to);
}

test('Docker Compose services use the real flask-api service name', async () => {
  const page = await readPage();
  const services = between(page, '**Docker Compose services:**', '### Testing Infrastructure');

  assert.match(services, /- `flask-api`: Flask API \(port 8001\)/);
  assert.match(services, /- `falkordb`: Graph database \(port 6379\)/);
  assert.match(services, /- `qdrant`: Vector database \(port 6333\)/);
  assert.doesNotMatch(services, /memory-service/);
});

test('env load order puts the real environment before the project .env before the user file', async () => {
  const page = await readPage();
  const section = between(
    page,
    '#### Environment Variable Load Order',
    '#### Key Configuration Categories',
  );

  assert.match(section, /calls `load_dotenv` twice and never sets `override=True`/);
  assert.match(section, /value that is already set is never replaced/);

  const processEnv = section.indexOf('process environment');
  const projectEnv = section.indexOf('The project `.env`');
  const userEnv = section.indexOf('`~/.config/automem/.env`, loaded second');
  assert.ok(processEnv > -1 && projectEnv > processEnv && userEnv > projectEnv);
  assert.match(section, /1\. Variables already in the process environment/);
  assert.match(section, /2\. The project `\.env`/);
  assert.match(section, /3\. `~\/\.config\/automem\/\.env`/);
  assert.match(section, /only fills in variables that are still unset/);

  assert.doesNotMatch(section, /user-specific overrides/i);
  assert.doesNotMatch(section, /Railway injects secrets as environment variables\n/);
});

test('TypeScript configuration documents NodeNext and ES2022 from the pinned release', async () => {
  const page = await readPage();
  const section = between(page, '**TypeScript configuration**', '**Build scripts:**');

  assert.match(section, /- `module: "NodeNext"`/);
  assert.match(section, /- `target: "ES2022"`/);
  assert.match(section, /- `outDir: "dist"`/);
  assert.doesNotMatch(section, /ES2020/);
  assert.doesNotMatch(section, /outDir: "\.\/dist"/);
  assert.doesNotMatch(page, /ES2020/);

  const link = section.match(
    /\[`tsconfig\.json`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/([0-9a-f]{40})\/tsconfig\.json(#[^)]*)?\)/,
  );
  assert.ok(link, 'expected a pinned tsconfig.json source link');
  assert.ok(
    isPinnedSha('mcp-automem', link[1]),
    'tsconfig.json link must use a recorded mcp-automem release SHA',
  );
});

test('root configuration table names the real ESLint config file', async () => {
  const page = await readPage();
  const section = between(page, '#### Root-Level Configuration', '#### Version Synchronization');

  assert.match(section, /\| `eslint\.config\.mjs` \| ESLint flat config \(ESLint 9\+\) \|/);
  assert.doesNotMatch(page, /eslint\.config\.js\b/);
});

test('client directory layout is labelled a selected layout and lists each command module plus clients.ts and cloud/', async () => {
  const page = await readPage();
  const section = between(page, '## MCP Client', '### Source Directory (`src/`)');

  assert.match(section, /selected layout, not an exhaustive listing/i);

  for (const mod of [
    'setup.ts',
    'install.ts',
    'clients.ts',
    'claude-code.ts',
    'cursor.ts',
    'codex.ts',
    'copilot.ts',
    'hermes.ts',
    'grok.ts',
    'openclaw.ts',
    'queue.ts',
    'migrate.ts',
    'uninstall.ts',
    'cloud/',
  ]) {
    const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(section, new RegExp(`CLI --> \\w+\\["${escaped}"\\]`), `diagram lists ${mod}`);
  }

  for (const platform of ['copilot', 'hermes', 'grok', 'antigravity']) {
    assert.match(section, new RegExp(`TEMPLATES --> \\w+\\["${platform}\\/`), `diagram lists ${platform}/`);
  }
  assert.match(section, /codex\/\\nconfig\.toml, memory-rules\.md/);
  assert.match(section, /claude-code\/\\nhooks, settings"/);

  assert.doesNotMatch(section, /warp/i);
  assert.doesNotMatch(section, /AGENTS\.md/);
  assert.doesNotMatch(section, /hooks, scripts, settings/);
});

test('templates layout lists the real platform directories and files', async () => {
  const page = await readPage();
  const section = between(page, '### Templates Directory (`templates/`)', '### Build Artifacts');
  const tree = between(section, '```text\ntemplates/', '**Template file types:**');

  assert.match(section, /Selected layout of `templates\/` \(not exhaustive/);

  for (const entry of [
    'antigravity/',
    'mcp_config.json',
    'copilot/',
    'automem.instructions.md',
    'automem.mdc.template',
    'rule-evals.md',
    'user-rules.md',
    'grok/',
    'hermes/',
    'OPENCLAW_SETUP.md',
    'claude_desktop_config.json',
    'cursor_mcp.json',
  ]) {
    assert.ok(tree.includes(entry), `tree lists ${entry}`);
  }
  assert.match(tree, /├── codex\/\n│   ├── config\.toml\n│   └── memory-rules\.md/);
  assert.match(tree, /├── grok\/\n│   ├── config\.toml\n│   └── memory-rules\.md/);
  assert.match(tree, /skill-mcp\//);
  assert.match(tree, /skill-legacy\//);

  // The claude-code block no longer has a profiles/ directory or a lean profile.
  const claudeCode = between(tree, '├── claude-code/', '├── codex/');
  assert.doesNotMatch(claudeCode, /profiles\//);
  assert.doesNotMatch(claudeCode, /retired/i);
  assert.doesNotMatch(claudeCode, /lean profile/i);
  assert.match(claudeCode, /settings\.json\s+# Base hook configuration \(default silent profile\)/);
  assert.match(claudeCode, /automem-stop-nudge\.sh\s+# Optional Stop nudge \(--profile nudged\)/);

  for (const gone of [/warp/i, /AGENTS\.md/, /config\.toml\.snippet/, /mcp-config\.json/, /automem\.mdc\s+#/]) {
    assert.doesNotMatch(tree, gone);
  }
});

test('template file type table matches the real templates', async () => {
  const page = await readPage();
  const table = between(page, '**Template file types:**', '### Build Artifacts');

  assert.match(table, /\| Hook Scripts \| `\.sh`, `\.ps1` \|[^\n]*Claude Code[^\n]*Copilot/);
  assert.match(table, /\| Rule Files \| `\.md`, `\.mdc\.template` \|[^\n]*Claude Code, Claude Desktop, Cursor, Codex, Copilot, Grok, Hermes, OpenClaw/);
  assert.match(table, /\| Config Snippets \|[^\n]*Claude Desktop, Cursor, Antigravity, Codex, Grok/);
  assert.doesNotMatch(table, /warp/i);
  assert.doesNotMatch(table, /All platforms/);
  assert.doesNotMatch(table, /Filter Configs/);
});
