import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

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

const SOURCE_LINK =
  /https:\/\/github\.com\/verygoodplugins\/(automem|mcp-automem|automem-graph-viewer)\/blob\/([0-9a-f]{40})\/([^\s)#]+)(#L[0-9]+(?:-L[0-9]+)?)?/g;

test('context engineering source links use the validated release revisions', async () => {
  const page = await readPage();
  const links = [...page.matchAll(SOURCE_LINK)];

  assert.ok(links.length >= 8, 'expected line-anchored source links for the claims on this page');
  for (const [url, repo, sha] of links) {
    assert.ok(isPinnedSha(repo, sha), `${url} must use a validated ${repo} release revision`);
  }
  assert.doesNotMatch(
    page,
    /github\.com\/verygoodplugins\/[a-z-]+\/blob\/(?![0-9a-f]{40}\/)/,
    'source links must be pinned to a full commit SHA, not a branch or short SHA',
  );
  assert.ok(
    links.some(([, repo, , path]) => repo === 'mcp-automem' && path === 'src/mcp-surface.ts'),
    'expected links into the 0.16.0 MCP surface (src/mcp-surface.ts)',
  );
});

test('no stale src/index.ts line anchor remains on the page', async () => {
  const page = await readPage();

  assert.doesNotMatch(
    page,
    /src\/index\.ts:\d/,
    'src/index.ts is the CLI entry point, not the tool surface',
  );
  assert.doesNotMatch(page, /src\/index\.ts#L\d/);
});

test('content size governance points at the store_memory handler in the MCP surface', async () => {
  const page = await readPage();
  const governance = section(page, '## Memory Content Size Governance');

  assert.match(
    governance,
    /\*\*Implementation\*\* in \[`src\/mcp-surface\.ts:\d+-\d+`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/mcp-surface\.ts#L\d+-L\d+\) within the `store_memory` tool handler/,
  );
  assert.doesNotMatch(governance, /src\/index\.ts/);
  // The limits themselves are unchanged and still match the handler.
  assert.match(governance, /\*\*Target\*\*: 150–300 characters/);
  assert.match(governance, /\*\*Soft limit\*\*: 500 characters/);
  assert.match(governance, /\*\*Hard limit\*\*: 2000 characters/);
});

test('entity expansion parameters are anchored in the recall_memory tool schema', async () => {
  const page = await readPage();
  const expansion = section(page, '### Multi-hop Reasoning with Entity Expansion');

  assert.match(
    expansion,
    /\*\*API parameters\*\* \(exposed in \[`src\/mcp-surface\.ts:\d+-\d+`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/mcp-surface\.ts#L\d+-L\d+\)\)/,
  );
  assert.doesNotMatch(expansion, /src\/index\.ts/);
  for (const param of [
    'expand_entities',
    'expand_relations',
    'expand_min_importance',
    'expand_min_strength',
    'expansion_limit',
    'relation_limit',
  ]) {
    assert.match(expansion, new RegExp(`\`${param}: `), `expected ${param} to stay documented`);
  }
});

test('multi-query recall is attributed to the client forwarding and the AutoMem service', async () => {
  const page = await readPage();
  const parallel = section(page, '### Parallel Recall for Comprehensive Context');
  const optimization = parallel.match(/\*\*Optimization\*\*: ([^\n]+)/);

  assert.ok(optimization, 'expected the Optimization note');
  assert.match(optimization[1], /Pass `queries`/);
  assert.match(
    optimization[1],
    /`AutoMemClient\.recallMemory\(\)`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/automem-client\.ts#L\d+-L\d+\)/,
  );
  assert.match(optimization[1], /repeated `queries` parameter/);
  assert.match(
    optimization[1],
    /AutoMem service \[runs the queries, then merges and deduplicates the results\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/[0-9a-f]{40}\/automem\/api\/recall\.py#L\d+-L\d+\)/,
  );
  assert.match(optimization[1], /`dedup_removed`/);
  assert.doesNotMatch(optimization[1], /src\/index\.ts/);
  assert.doesNotMatch(optimization[1], /parallel/i, 'the service runs the queries in a loop, not in parallel');
  assert.doesNotMatch(optimization[1], /tag filtering are requested/);
});

test('template variable table lists only variables the installers pass', async () => {
  const page = await readPage();
  const variables = section(page, '### Variable Resolution');
  const rows = variables.split('\n').filter((line) => /^\| `\{\{/.test(line));

  assert.deepEqual(
    rows.map((row) => row.match(/^\| `(\{\{[A-Z_]+\}\})`/)[1]),
    ['{{PROJECT_NAME}}', '{{MCP_TOOL_PREFIX}}', '{{MCP_SERVER_NAME}}', '{{HERMES_MODE_RULES}}'],
  );
  assert.doesNotMatch(page, /\{\{PROJECT_DESC\}\}/);
  assert.doesNotMatch(page, /\{\{CURRENT_MONTH\}\}/);

  const prefix = tableRow(variables, '`{{MCP_TOOL_PREFIX}}`');
  assert.match(prefix, /Cursor installer only/);
  assert.match(prefix, /`mcp_<server name>_`/);
  assert.match(prefix, /\| `mcp_memory_` \|$/, 'the default Cursor server name memory renders mcp_memory_');
  assert.doesNotMatch(prefix, /mcp__memory__/);
  assert.doesNotMatch(prefix, /mcp_automem_/);

  const serverName = tableRow(variables, '`{{MCP_SERVER_NAME}}`');
  assert.match(serverName, /Cursor installer only/);
  assert.match(serverName, /`~\/\.cursor\/mcp\.json`/);
  assert.match(serverName, /`memory` if none is found/);
  assert.match(serverName, /\| `memory` \|$/);
  assert.doesNotMatch(serverName, /\| `automem` \|$/);

});

test('template substitution is documented per host: one shared helper, per-installer variables', async () => {
  const page = await readPage();
  const variables = section(page, '### Variable Resolution');
  const implementation = variables.match(/\*\*Implementation\*\*: ([^\n]+)/);

  assert.ok(implementation, 'expected the template Implementation note');
  assert.match(implementation[1], /Template substitution is host-specific/);
  assert.match(
    implementation[1],
    /Codex, Grok, Hermes, and Cursor installers share \[`replaceTemplateVars\(\)`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/cli\/host-toolkit\.ts#L\d+-L\d+\) in `src\/cli\/host-toolkit\.ts`/,
  );
  assert.doesNotMatch(implementation[1], /has its own/, 'the Cursor installer imports the shared helper');
  assert.match(implementation[1], /substitutes only the variables it passes/);
  assert.match(implementation[1], /Codex passes `\{\{PROJECT_NAME\}\}` alone/);
  assert.match(
    implementation[1],
    /Cursor installer also passes `\{\{MCP_TOOL_PREFIX\}\}` and `\{\{MCP_SERVER_NAME\}\}`/,
  );
  assert.doesNotMatch(page, /src\/cli\/commands\//);
});

test('new platform integrations add their installer directly under src/cli', async () => {
  const page = await readPage();
  const steps = section(page, '### Building a New Platform Integration');

  assert.match(steps, /4\. \*\*Implement CLI command\*\*: Add installer in `src\/cli\/\[platform\]\.ts`/);
  assert.doesNotMatch(steps, /src\/cli\/commands/);
});

test('tag enumeration goes through recallMemory, not a nonexistent searchByTag method', async () => {
  const page = await readPage();
  const client = section(page, '### AutoMemClient HTTP Implementation');
  const byTag = tableRow(client, 'GET | `/memory/by-tag?tags=...`');

  assert.doesNotMatch(page, /searchByTag/);
  assert.match(byTag, /`recallMemory\(\{ tags, exhaustive: true \}\)`/);
  for (const field of ['memories[]', 'count', 'limit', 'offset', 'has_more']) {
    assert.ok(byTag.includes(field), `expected the by-tag response to list ${field}`);
  }

  const troubleshooting = section(page, '### Common Integration Issues');
  const timeout = tableRow(troubleshooting, '**Timeout errors**');
  assert.match(
    timeout,
    /`recall_memory\(\{ tags: \[\.\.\.\], exhaustive: true \}\)` \(paginated tag enumeration\)/,
  );
});

test('MCP protocol section attributes the server to the MCP surface and the entry point to index.ts', async () => {
  const page = await readPage();
  const protocol = section(page, '## MCP Protocol Implementation Details');

  assert.match(
    protocol,
    /created by \[`createAutoMemMcpServer\(\)`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/mcp-surface\.ts#L\d+-L\d+\) in `src\/mcp-surface\.ts`/,
  );
  assert.match(protocol, /`src\/index\.ts` is the CLI and stdio entry point/);
  assert.match(
    protocol,
    /\*\*Tool registration\*\* in the `tools` array starting at \[`src\/mcp-surface\.ts:\d+`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/[0-9a-f]{40}\/src\/mcp-surface\.ts#L\d+\)/,
  );
  assert.doesNotMatch(protocol, /The MCP server implementation in `src\/index\.ts`/);
});
