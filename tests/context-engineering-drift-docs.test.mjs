import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pins } from './helpers/source-pins.mjs';

// Drift pass for the context engineering page. Facts were verified against
// mcp-automem 0.16.0 and 0.17.0 (identical for every fact below unless noted)
// and AutoMem 0.16.2, the releases recorded in scripts/docs-source-pins.json.

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/best-practices/context-engineering.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Text from `heading` up to the next heading of the same or a higher level.
function section(page, heading) {
  const level = heading.match(/^#+/)[0].length;
  const start = page.indexOf(`${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + heading.length);
  const end = rest.search(new RegExp(`\\n#{1,${level}} `));
  return end === -1 ? rest : rest.slice(0, end);
}

function tableRow(text, firstCell) {
  const row = text.split('\n').find((line) => line.startsWith(`| ${firstCell} |`));
  assert.ok(row, `expected a table row starting with ${firstCell}`);
  return row;
}

test('tool annotation table matches the annotations in the MCP surface', async () => {
  const page = await readPage();
  const protocol = section(page, '## MCP Protocol Implementation Details');

  // mcp-surface.ts: delete_memory is idempotentHint false; associate_memories and
  // update_memory are idempotentHint true; every tool sets openWorldHint false.
  const idempotent = tableRow(protocol, '`idempotentHint`');
  assert.match(idempotent, /`update_memory`, `associate_memories`/);
  assert.doesNotMatch(idempotent, /delete_memory/);

  const openWorld = tableRow(protocol, '`openWorldHint`');
  assert.match(openWorld, /`false` on every tool/);
  assert.doesNotMatch(openWorld, /Not used/);

  const readOnly = tableRow(protocol, '`readOnlyHint`');
  assert.match(readOnly, /`recall_memory`, `check_database_health`/);
  assert.match(tableRow(protocol, '`destructiveHint`'), /\| `delete_memory` \|$/);
});

test('destructiveHint is glossed per the MCP spec, not as deleting or modifying data', async () => {
  const page = await readPage();
  const protocol = section(page, '## MCP Protocol Implementation Details');

  assert.doesNotMatch(page, /Tool deletes\/modifies data/);
  assert.doesNotMatch(page, /\| `destructiveHint` \| Tool removes data \|/);
  assert.match(
    protocol,
    /- `destructiveHint`: Tool may perform destructive updates \(meaningful only when `readOnlyHint` is false\)/,
  );
  assert.match(
    tableRow(protocol, '`destructiveHint`'),
    /Tool may perform destructive updates \(meaningful only when `readOnlyHint` is false\)/,
  );
});

test('size limits are documented as single-memory checks, not as applying to batch stores', async () => {
  const page = await readPage();
  const governance = section(page, '## Memory Content Size Governance');

  // mcp-surface.ts store_memory handler: SOFT_LIMIT and HARD_LIMIT run only when
  // `memories` is not an array; batchStore only requires non-empty `content`.
  assert.match(governance, /In single-memory mode, exceeding the soft limit \(500 chars\)/);
  assert.match(governance, /These checks run only in single-memory mode\./);
  assert.match(governance, /In batch mode \(`memories: \[\.\.\.\]`\) the client does not check content length; it only requires each item's `content` to be non-empty/);
  assert.match(governance, /The AutoMem service applies its own limits \(by default it rejects/);
  assert.doesNotMatch(governance, /^Exceeding the soft limit \(500 chars\) causes the server/m);
});

test('tagging advice follows the shipped memory policy: no date-stamped or platform tags', async () => {
  const page = await readPage();

  // shared.ts and the host templates: "no `lang/` prefixes, platform tags, or
  // date-stamped tags"; shelf-life facts use t_valid and t_invalid instead.
  assert.doesNotMatch(page, /"2026-02"/);
  assert.doesNotMatch(page, /Add temporal tag/);
  assert.doesNotMatch(page, /Project name, platform, month, component tags/);
  assert.match(page, /tags: \["my-project", "preference", "python"\]/);
  assert.match(
    page,
    /Bare tags for project name, category, and language; no platform or date-stamped tags/,
  );
  assert.match(
    page,
    /- Do not add date-stamped tags \(such as `2025-01`\); use the `timestamp` field, or `t_valid` and `t_invalid` for facts with a shelf life/,
  );
});

test('the /associate response is the service shape, not the client result shape', async () => {
  const page = await readPage();
  const client = section(page, '### AutoMemClient HTTP Implementation');
  const associate = tableRow(client, 'POST | `/associate`');

  // AutoMem automem/api/memory.py: 201 with status, message, relation_type, strength.
  assert.match(associate, /\| `\{status, message, relation_type, strength, \.\.\.\}` \|/);
  assert.doesNotMatch(page, /\{success, message\}/);
});

test('debugging advice uses variables and flags the source reads', async () => {
  const page = await readPage();
  const debugging = section(page, '### Debugging Techniques');

  // index.ts reads AUTOMEM_LOG_LEVEL only; no code reads DEBUG. The Cursor installer
  // parses --dry-run and silently ignores unknown flags such as --verbose.
  assert.doesNotMatch(page, /DEBUG=automem:\*/);
  assert.doesNotMatch(page, /cursor --dry-run --verbose/);
  assert.match(debugging, /AUTOMEM_LOG_LEVEL=debug npx @verygoodplugins\/mcp-automem/);
  assert.match(debugging, /mcp-automem reads `AUTOMEM_LOG_LEVEL`, not `DEBUG`/);
  assert.match(debugging, /npx @verygoodplugins\/mcp-automem cursor --dry-run\n/);
  assert.match(debugging, /there is no `--verbose` flag/);
  assert.match(debugging, /does not print the rendered templates/);
  assert.match(debugging, /open the generated `\.cursor\/rules\/automem\.mdc`/);
});

test('new platform integrations register the client in src/cli/clients.ts', async () => {
  const page = await readPage();
  const steps = section(page, '### Building a New Platform Integration');

  // clients.ts is the client registry: HOST_SETUP_COMMANDS and UNINSTALL_PLATFORMS
  // are derived from AGENT_CLIENTS; src/index.ts has a dispatch branch per command.
  assert.match(steps, /4\. \*\*Implement CLI command\*\*: Add installer in `src\/cli\/\[platform\]\.ts`, register the client in `src\/cli\/clients\.ts`/);
  assert.match(steps, /`AGENT_CLIENTS`/);
  assert.match(steps, /dispatch branch in `src\/index\.ts`/);
});

test('the variable table and implementation note cover the Hermes installer and the shared helper', async () => {
  const page = await readPage();
  const variables = section(page, '### Variable Resolution');

  // hermes.ts passes PROJECT_NAME and HERMES_MODE_RULES (renderHermesModeRules(mode),
  // default mode mcp). At 0.17.0 the Cursor installer imports the shared
  // replaceTemplateVars from host-toolkit.ts instead of defining its own.
  const modeRules = tableRow(variables, '`{{HERMES_MODE_RULES}}`');
  assert.match(modeRules, /Hermes installer only/);
  assert.match(modeRules, /`--mode mcp`, `provider`, or `both`; default `mcp`/);
  assert.match(modeRules, /`renderHermesModeRules\(\)`/);

  const implementation = variables.match(/\*\*Implementation\*\*: ([^\n]+)/)[1];
  assert.match(implementation, /Codex, Grok, Hermes, and Cursor installers share/);
  assert.doesNotMatch(implementation, /has its own/);
  assert.match(implementation, /the Hermes installer also passes `\{\{HERMES_MODE_RULES\}\}`/);

  // The shared-helper links describe mcp-automem 0.17.0 behaviour, so they must pin 0.17.0 or newer.
  const { releases } = pins['verygoodplugins/mcp-automem'];
  for (const file of ['host-toolkit.ts', 'codex.ts', 'hermes.ts', 'cursor.ts']) {
    const sha = implementation.match(new RegExp(`/blob/([0-9a-f]{40})/src/cli/${file.replace('.', '\\.')}#L`))?.[1];
    const release = releases.find((r) => r.sha === sha);
    assert.ok(
      release && release.version.localeCompare('0.17.0', 'en', { numeric: true }) >= 0,
      `expected the ${file} link to pin mcp-automem 0.17.0 or newer`,
    );
  }
});

test('context engineering tag advice and HTTP response cells match the service and policy', async () => {
  const page = await readFile(fileURLToPath(new URL('../src/content/docs/docs/best-practices/context-engineering.md', import.meta.url)), 'utf8');

  assert.doesNotMatch(page, /`auth\/\*` matching/);
  assert.match(page, /There is no `\*` wildcard\. Use it for the server-injected `entity:\*` tags, not for your own namespaces\./);
  assert.doesNotMatch(page, /Use hierarchical tags with prefix matching/);
  assert.match(page, /Use bare tags with no namespace prefixes: `auth`, not `project\/auth` or `auth\/login`/);
  assert.doesNotMatch(page, /`bug-fix`/);
  assert.doesNotMatch(page, /\| `\{memory_id, message\}` \|/);
  assert.match(page, /\| PATCH \| `\/memory\/:id` \|[^\n]*\| `\{status, memory_id\}` \|/);
  assert.match(page, /\| DELETE \| `\/memory\/:id` \|[^\n]*\| `\{status, memory_id\}` \|/);
  assert.match(page, /wire it into the guided installer in `src\/cli\/install\.ts`/);
});
