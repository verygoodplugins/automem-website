import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/hermes.md', import.meta.url),
);

async function readHermesPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + 1);
  const end = rest.indexOf('\n---\n');
  return end === -1 ? rest : rest.slice(0, end);
}

function cliOptionRows(page) {
  const installation = section(page, 'Installation');
  const rows = new Map();
  for (const line of installation.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const flag = cells[1]?.match(/^`(--[a-z-]+)/u);
    if (flag && cells.length >= 6) rows.set(flag[1], cells);
  }
  return rows;
}

test('hermes CLI table leaves mode, dry-run, and yes without environment variables', async () => {
  const rows = cliOptionRows(await readHermesPage());

  for (const flag of ['--mode', '--dry-run', '--yes']) {
    assert.ok(rows.has(flag), `expected a ${flag} row`);
    assert.equal(rows.get(flag)[2], '—', `${flag} has no environment variable on the hermes command`);
  }
  assert.equal(rows.get('--endpoint')[2], '`AUTOMEM_API_URL`');
  assert.equal(rows.get('--api-key')[2], '`AUTOMEM_API_KEY`');
});

test('hermes page attributes the mode, dry-run, and yes variables to the guided installer', async () => {
  const installation = section(await readHermesPage(), 'Installation');

  assert.doesNotMatch(installation, /AUTOMEM_DRY_RUN=1|AUTOMEM_YES=1/u);
  assert.match(
    installation,
    /`AUTOMEM_HERMES_MODE`, `AUTOMEM_DRY_RUN`, and `AUTOMEM_YES` are read by the \[guided installer\]\(\/docs\/getting-started\/quick-start\/\)/u,
  );
  assert.match(installation, /`npx @verygoodplugins\/mcp-automem install`/u);
  assert.match(installation, /takes the mode as `--hermes-mode`/u);
  assert.match(
    installation,
    /`--mode`, `--dry-run`, and `--yes` are command-line flags only/u,
  );
  assert.match(
    installation,
    /only `--endpoint` and `--api-key` have environment-variable equivalents/u,
  );
  assert.match(installation, /`AUTOMEM_ENDPOINT`/u);
  assert.match(installation, /`AUTOMEM_API_TOKEN`/u);
});

test('hermes page limits .bak copies to backed-up files and excludes .env', async () => {
  const installation = section(await readHermesPage(), 'Installation');

  assert.doesNotMatch(installation, /every changed file keeps a `\.bak` copy/iu);
  assert.match(
    installation,
    /when an existing `config\.yaml`, rules file, or provider plugin file changes, the previous copy is saved next to it as `\.bak`/u,
  );
  assert.match(installation, /`\.bak\.1`/u);
  assert.match(
    installation,
    /`\$HERMES_HOME\/\.env` is the exception: it is edited in place with no backup/u,
  );
});

test('hermes provider mode documents its five automem_* tools', async () => {
  const page = await readHermesPage();
  const tools = section(page, 'Available tools');

  assert.doesNotMatch(page, /no explicit tools/iu);
  assert.doesNotMatch(page, /no manual tool calls/iu);
  assert.match(tools, /In \*\*provider\*\* mode, recall is ambient/u);
  assert.match(tools, /`AUTOMEM_HERMES_PROVIDER_TOOLS=true`/u);
  for (const name of [
    'automem_recall_memory',
    'automem_store_memory',
    'automem_associate_memories',
    'automem_update_memory',
    'automem_check_database_health',
  ]) {
    assert.ok(tools.includes(`\`${name}\``), `expected provider tool ${name}`);
  }
  assert.match(tools, /Explicit `automem_recall_memory` calls are capped at 10 results/u);
  assert.match(tools, /without the `mcp_` prefix/u);
});

test('hermes both mode still keeps explicit tools on the MCP surface', async () => {
  const page = await readHermesPage();

  assert.match(page, /In `both` mode the installer writes `AUTOMEM_HERMES_PROVIDER_TOOLS=false`/u);
  assert.match(page, /Hermes never exposes duplicate `automem_\*` provider tools/u);
});

test('hermes registers the MCP server under the automem key, not memory', async () => {
  const page = await readHermesPage();
  const yaml = page.match(/```yaml\nmcp_servers:\n([\s\S]*?)```/u);

  assert.ok(yaml, 'expected the mcp_servers YAML example');
  assert.match(yaml[1], /^ {2}automem:\n/u);
  assert.doesNotMatch(yaml[1], /^ {2}memory:/mu);
  assert.match(page, /`mcp_servers\.automem`/u);
  assert.match(page, /hermes mcp test automem/u);
});
