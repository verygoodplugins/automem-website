import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/direct-vs-mcp.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function between(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected to find ${startPattern}`);
  const rest = page.slice(start + 1);
  const end = rest.search(endPattern);
  assert.notEqual(end, -1, `expected to find ${endPattern} after ${startPattern}`);
  return page.slice(start, start + 1 + end);
}

async function storeSection() {
  return between(await readPage(), /### store_memory vs POST \/memory/, /### recall_memory vs/);
}

async function recallSection() {
  return between(await readPage(), /### recall_memory vs GET \/recall/, /### associate_memories vs/);
}

async function associateSection() {
  return between(await readPage(), /### associate_memories vs/, /### update_memory vs/);
}

async function deleteSection() {
  return between(await readPage(), /### delete_memory vs DELETE/, /### check_database_health vs/);
}

test('the changed source links use a recorded release pin', async () => {
  const page = await readPage();
  const notes = page.match(/:::note\[Source files\]\n([\s\S]*?)\n:::/);
  assert.ok(notes, 'expected a Source files note');

  const mcpLinks = [
    ...notes[1].matchAll(
      /https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/([0-9a-f]{7,40})\/(src\/[\w./-]+)/g,
    ),
  ];
  for (const file of ['src/index.ts', 'src/mcp-surface.ts', 'src/automem-client.ts']) {
    const link = mcpLinks.find(([, , path]) => path === file);
    assert.ok(link, `expected a source link for ${file}`);
    assert.ok(isPinnedSha('mcp-automem', link[1]), `${file} must link a recorded release pin`);
  }

  const automemLinks = [
    ...page.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{7,40})\//g),
  ];
  assert.ok(automemLinks.length >= 1, 'expected the server-assigned memory ID source link');
  for (const [, sha] of automemLinks) {
    assert.ok(isPinnedSha('automem', sha), 'AutoMem links must use a recorded release pin');
  }
});

test('tool definitions and handlers are attributed to mcp-surface.ts, not the entry point', async () => {
  const page = await readPage();
  const registration = between(page, /## Tool Registration and Discovery/, /$/);

  assert.match(registration, /live in `src\/mcp-surface\.ts`/);
  assert.match(registration, /`createAutoMemMcpServer\(\)`/);
  assert.match(registration, /`ListToolsRequestSchema` handler \(`src\/mcp-surface\.ts` line 1034\)/);
  assert.match(registration, /`CallToolRequestSchema` handler \(`src\/mcp-surface\.ts` lines 1038-1321\)/);
  assert.match(registration, /`tools` array \(`src\/mcp-surface\.ts` lines 85-1007\)/);
  assert.doesNotMatch(registration, /line 669|671–826|177–667/);

  assert.match(page, /MCP Tools \(createAutoMemMcpServer\)/);
  assert.doesNotMatch(page, /buildMcpServer/);
});

test('process lifecycle ranges describe the 496-line entry point', async () => {
  const page = await readPage();
  const lifecycle = between(page, /### Process Lifecycle/, /### Error Resilience/);

  for (const range of ['1–28', '30–84', '86–125', '127–411', '413–433', '435–439', '441–496']) {
    assert.ok(lifecycle.includes(`| ${range} |`), `expected lifecycle range ${range}`);
  }
  assert.doesNotMatch(lifecycle, /785|795|178–783|119–177|63–118|58–62/);
  // Guards are defined in the helpers but installed inside main().
  assert.doesNotMatch(lifecycle, /Configuration[^\n]*stdio guards/);
  assert.match(lifecycle, /Main Loop[^\n]*install stdio guards/);

  assert.match(page, /\/\/ src\/index\.ts lines 30-31/);
  assert.match(page, /\/\/ src\/index\.ts lines 102-112/);
  assert.match(page, /\/\/ src\/index\.ts lines 78-84/);
  assert.match(page, /logToStderr/);
  assert.doesNotMatch(page, /process\.stderr\.write\(args\.join/);
});

test('process supervision uses the real env vars', async () => {
  const page = await readPage();

  assert.match(page, /`AUTOMEM_PROCESS_TAG` \(or `MCP_PROCESS_TAG`\)/);
  assert.doesNotMatch(page, /PROCESS_TITLE/);
  assert.doesNotMatch(page, /stable PID/);
});

test('delete_memory is annotated non-idempotent everywhere the page states it', async () => {
  const page = await readPage();
  const summary = between(page, /### Tool Summary/, /## Side-by-Side Tool Reference/);
  const annotations = between(page, /### MCP Tool Annotations/, /\n---/);

  assert.match(summary, /\| `delete_memory` \|[^\n]*\| No \| Yes \| No \|/);
  assert.match(summary, /\| `store_memory` \|[^\n]*\| No \| No \| No \|/);
  assert.match(annotations, /\| `idempotentHint` \|[^\n]*All except `store_memory` and `delete_memory`/);
  assert.match(summary, /`store_memory` and `delete_memory` are the only tools with `idempotentHint: false`/);
  assert.doesNotMatch(page, /`store_memory` is the only tool with `idempotentHint: false`/);
  assert.doesNotMatch(page, /re-?deleting[^\n]*no-op/i);
});

test('tool summary lists the HTTP route behind each mode', async () => {
  const summary = between(await readPage(), /### Tool Summary/, /### MCP Tool Annotations/);

  assert.match(summary, /`POST \/memory\/batch`/);
  assert.match(summary, /`GET \/memory\/:id`/);
  assert.match(summary, /`GET \/memory\/by-tag`/);
  assert.match(summary, /`DELETE \/memory\/by-tag`/);
  assert.match(summary, /`POST \/associate` \(pair and batch modes\)/);
});

test('store_memory documents single, supersede, and batch modes', async () => {
  const section = await storeSection();

  assert.match(section, /mode-multiplexed/);
  assert.match(section, /\| `content` \| string \| Single mode \(XOR `memories`\) \|/);
  assert.match(section, /\| `memories` \| array\[object\] \| Batch mode \(XOR `content`\) \| 1–500 items;/);
  for (const field of [
    'type',
    'confidence',
    't_valid',
    't_invalid',
    'updated_at',
    'last_accessed',
    'supersedes_memory_id',
    'supersede_relation',
    'supersede_reason',
  ]) {
    assert.ok(section.includes(`\`${field}\``), `expected the published store field ${field}`);
  }
  assert.match(section, /`INVALIDATED_BY` \(default\)/);
  assert.match(section, /rejects per-item `id`, `embedding`, `t_valid`, and `t_invalid`/);
  assert.match(section, /rejects any top-level single-mode field sent alongside `memories`/);
  assert.match(section, /no top-level `required` array/);
});

test('store_memory does not claim an id parameter or unpublished fields', async () => {
  const section = await storeSection();

  assert.doesNotMatch(section, /\| `id` \|/);
  assert.doesNotMatch(section, /also accepts `id`/);
  assert.doesNotMatch(section, /not listed in the published MCP schema/);
  assert.match(section, /The tool has no `id` parameter/);
  assert.match(section, /Every parameter above is published in the MCP `inputSchema`/);
  assert.match(section, /client orchestrates fetch → store → invalidate → associate/);
});

test('store_memory output requires only message and varies by mode', async () => {
  const section = await storeSection();
  const output = between(section, /\*\*MCP Tool Output:\*\*/, /\*\*HTTP API equivalent:\*\*/);

  assert.match(output, /Only `message` is a required output field/);
  assert.match(output, /\| `message` \| string \| Yes \|/);
  assert.match(output, /\| `memory_id` \| string \| No \|/);
  assert.doesNotMatch(output, /\| `memory_id` \| string \| Yes \|/);
  for (const field of [
    'memory_ids',
    'stored',
    'qdrant',
    'enrichment',
    'query_time_ms',
    'superseded_memory_id',
    'association_created',
  ]) {
    assert.ok(output.includes(`\`${field}\``), `expected the mode-specific output field ${field}`);
  }
});

test('content size governance is scoped to single-memory mode', async () => {
  const page = await readPage();
  const section = await storeSection();

  assert.match(section, /Content Size Governance \(single mode;/);
  assert.match(section, /In batch mode the client only checks that each item's `content` is non-empty/);
  assert.match(page, /Built-in two-tier limits \(single mode\)/);
});

test('recall_memory documents ID-fetch and tag-enumeration modes', async () => {
  const section = await recallSection();

  assert.match(section, /picks one of three modes/);
  assert.match(section, /\| `memory_id` \| string \| No \|[^\n]*ID-fetch mode/);
  assert.match(section, /No other parameter is sent to the server, but `format` still shapes the response/);
  assert.match(section, /An ID that does not exist returns `count: 0`/);
  assert.doesNotMatch(section, /An unknown ID/);
  assert.doesNotMatch(section, /ignores every other parameter/);
  assert.match(section, /\| `exhaustive` \| boolean \| No \|[^\n]*Requires non-empty `tags`/);
  assert.match(section, /rejects `tag_match: "prefix"`, `tag_mode: "all"`/);
  assert.match(section, /\| `offset` \| integer \| No \|/);
  assert.match(section, /\| `embedding` \| array\[number\] \| No \|/);
  assert.match(section, /\| `mode` \| string \| No \|[^\n]*`"id_fetch"`/);
  assert.match(section, /\| `has_more` \| boolean \| No \|[^\n]*Enumeration mode/);
  assert.match(section, /no top-level `required` array/);
  // The expand_respect_tags row came from a separate update and must stay.
  assert.match(section, /\| `expand_respect_tags` \| boolean \| No \|/);
});

test('recall_memory lists every published input field and no longer calls them unpublished', async () => {
  const section = await recallSection();

  const published = [
    'memory_id',
    'exhaustive',
    'exclude_tags',
    'query',
    'queries',
    'embedding',
    'limit',
    'time_query',
    'start',
    'end',
    'tags',
    'tag_mode',
    'tag_match',
    'expand_entities',
    'expand_relations',
    'expand_respect_tags',
    'auto_decompose',
    'expansion_limit',
    'relation_limit',
    'expand_min_importance',
    'expand_min_strength',
    'current_only',
    'state_debug',
    'state_mode',
    'recency_bias',
    'scope_fallback',
    'min_score',
    'adaptive_floor',
    'context',
    'language',
    'active_path',
    'context_tags',
    'context_types',
    'priority_ids',
    'per_query_limit',
    'sort',
    'format',
    'offset',
  ];
  for (const field of published) {
    assert.ok(section.includes(`\`${field}\``), `expected the published recall field ${field}`);
  }
  assert.doesNotMatch(section, /not listed in the published MCP schema/);
  assert.match(section, /The published `inputSchema` also carries/);
});

test('recall_memory limit wording follows the server cap, not the schema estimate', async () => {
  const section = await recallSection();

  assert.match(section, /\| `limit` \| integer \| No \| 1–200 \(schema default 5\) \|/);
  assert.match(section, /Ranked mode defaults to 5; enumeration without `limit` uses the server default of 20/);
  assert.doesNotMatch(section, /\| `limit` \| integer \| No \| 1–200, default 5 \|/);
  assert.match(section, /Enumeration mode honors up to 200/);
  assert.match(section, /default 100 via `RECALL_MAX_LIMIT`/);
  assert.doesNotMatch(section, /~50/);
});

test('associate_memories documents pair and batch modes with runtime requirements', async () => {
  const section = await associateSection();

  assert.match(section, /single-pair mode and a batch mode/);
  assert.match(section, /no top-level `required` array/);
  assert.match(section, /\| `memory1_id` \| string \| Pair mode \|/);
  assert.match(section, /\| `memory2_id` \| string \| Pair mode \|/);
  assert.match(section, /\| `type` \| string \| Pair mode \|/);
  // The MCP client rejects a missing strength; only the HTTP API defaults it.
  assert.match(section, /\| `strength` \| number \| Pair mode \| 0–1 \|[^\n]*MCP client throws if it is missing/);
  assert.match(section, /HTTP API defaults to 0\.5/);
  assert.doesNotMatch(section, /\| `strength` \| number \| No \|/);
  assert.match(section, /\| `associations` \| array\[object\] \| Batch mode \| 1–500 items;/);
  for (const field of [
    'context',
    'reason',
    'pattern_type',
    'confidence',
    'resolution',
    'observations',
    'timestamp',
    'transformation',
    'role',
  ]) {
    assert.ok(section.includes(`\`${field}\``), `expected the relation property ${field}`);
  }
  assert.match(section, /sends `\{"associations": \[\.\.\.\]\}` to the same `POST \/associate` endpoint/);
});

test('associate_memories output covers partial batch results', async () => {
  const section = await associateSection();
  const output = between(section, /\*\*MCP Tool Output:\*\*/, /\*\*HTTP API equivalent:\*\*/);

  assert.match(output, /Whether every requested association was created; `false` for partial batch results/);
  assert.match(output, /`created_count`, `failed_count`/);
  assert.match(output, /`succeeded`, `failed`/);
  assert.match(output, /\| `summary` \| string \| No \|/);
  assert.doesNotMatch(output, /Whether association was created\b/);
});

test('delete_memory output requires only message and splits single and bulk results', async () => {
  const section = await deleteSection();
  const output = between(section, /\*\*MCP Tool Output:\*\*/, /\*\*HTTP API equivalent:\*\*/);

  assert.match(output, /Only `message` is a required output field/);
  assert.match(output, /\| `message` \| string \| Yes \|/);
  assert.match(output, /\| `memory_id` \| string \| No \| Single-delete mode/);
  assert.match(output, /\| `deleted_count` \| integer \| No \| Bulk-by-tag mode/);
  assert.match(output, /\| `tags` \| array\[string\] \| No \| Bulk-by-tag mode/);
  assert.doesNotMatch(output, /\| `memory_id` \| string \| Yes \|/);
  assert.match(section, /Bulk-by-tag mode calls `DELETE \/memory\/by-tag\?tags=\.\.\.` instead/);
  assert.match(section, /Exactly one of `memory_id` or `tags` must be provided/);
});

test('the tool diagram reflects mode-based input schemas', async () => {
  const diagram = between(await readPage(), /## The Six MCP Tools/, /### Tool Summary/);

  assert.match(diagram, /One of: content \(single\)<br\/>or memories\[\] \(batch\)/);
  assert.match(diagram, /Modes: memory_id \(fetch\)/);
  assert.match(diagram, /or associations\[\] \(batch\)/);
  assert.match(diagram, /One of: memory_id or tags/);
  assert.match(diagram, /properties: \{memory_id, tags\[\]\}<br\/>no top-level required/);
  assert.doesNotMatch(diagram, /required: \['content'\]/);
  assert.doesNotMatch(diagram, /required: all/);
  // update_memory is the one tool whose schema still declares a required field.
  assert.match(diagram, /required: \['memory_id'\]/);
});

test('the response example shows the real single-mode store output', async () => {
  const formatting = between(await readPage(), /## Response Formatting/, /## When to Use Each Interface/);

  assert.match(formatting, /Memory stored successfully!/);
  assert.match(formatting, /structuredContent: output/);
  assert.match(formatting, /auto-summarize \(summarized, original_length, summarized_length\)/);
  assert.doesNotMatch(formatting, /Memory stored with ID/);
});

test('the bridge description does not claim it has no logic beyond mapping', async () => {
  const page = await readPage();

  assert.match(page, /the client-side supersede flow/);
  assert.doesNotMatch(page, /No business logic lives in the bridge/);
});
