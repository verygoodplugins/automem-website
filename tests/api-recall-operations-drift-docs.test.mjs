import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift fixes for the Recall Operations API page. Facts were verified against
// the AutoMem 0.16.2 and mcp-automem 0.17.0 release sources recorded in
// scripts/docs-source-pins.json (automem/api/recall.py, automem/utils/scoring.py,
// automem/enrichment/runtime_worker.py, and the recall_memory inputSchema in
// mcp-automem src/mcp-surface.ts).

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/recall-operations.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Compact absence assertion: assert.doesNotMatch dumps the whole page on failure.
function assertAbsent(text, pattern) {
  assert.ok(!pattern.test(text), `stale text still present: ${pattern}`);
}

function between(page, startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  assert.notEqual(start, -1, `expected "${startMarker}"`);
  const end = page.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `expected "${endMarker}" after "${startMarker}"`);
  return page.slice(start, end);
}

function tableRow(section, parameter) {
  const row = section.match(new RegExp(`^\\| \`${parameter}\` \\|.*$`, 'm'));
  assert.ok(row, `expected a table row for ${parameter}`);
  return row[0];
}

function mcpSchemaSection(page) {
  return between(page, '**Full input schema:**', '**Output schema:**');
}

function httpSection(page, heading, endHeading) {
  return between(page, `\n${heading}\n`, `\n${endHeading}\n`);
}

test('last_accessed updates are described as synchronous, not asynchronous', async () => {
  const page = await readPage();

  assert.match(
    page,
    /\*\*Access Tracking\*\*: `last_accessed` updates for the seed matches \(not expanded memories\) run synchronously, in one batched write before the response is returned/,
  );
  assertAbsent(page, /happen asynchronously/);
  assertAbsent(page, /\basynchronous(ly)?\b/i);
});

test('relationship expansion diagram names the real expansion code, not fetch_relations', async () => {
  const page = await readPage();
  const flow = between(page, '### Relationship Expansion Flow', 'The `_expand_related_memories()` function');

  assert.match(flow, /FetchRelations\["Cypher MATCH per seed<br\/>_expand_related_memories\(\)<br\/>api\/recall\.py"\]/);
  assertAbsent(flow, /fetch_relations\(\)/);
  assertAbsent(flow, /runtime_relations\.py/);
});

test('priority_ids is documented as a fixed bonus plus a direct fetch that still respects filters', async () => {
  const page = await readPage();
  const note = between(page, ':::note[`priority_ids` semantics]', '\n:::');

  assert.match(note, /fixed \+0\.9 context bonus/);
  assert.match(note, /fetched directly by ID and returned with `match_type: "priority_id"`/);
  assert.match(note, /placed ahead of other candidates before results are trimmed to `limit`/);
  assert.match(note, /does \*\*not\*\* bypass filters or guarantee inclusion/);
  assert.match(note, /`exclude_tags`, `min_score`, the current-state filter, and the adaptive score floor/);
  assert.match(note, /\[`GET \/memory\/\{id\}`\]/);
  assertAbsent(note, /adds a relevance boost/);

  const httpRow = tableRow(httpSection(page, '### Context Hint Parameters', '### Graph Expansion Parameters'), 'priority_ids');
  assert.match(httpRow, /fetch directly when the search missed them/);
  assertAbsent(httpRow, /\| Memory IDs to boost during scoring \|$/);

  const mcpRow = tableRow(mcpSchemaSection(page), 'priority_ids');
  assert.match(mcpRow, /fetch directly when the search missed them \(does not bypass filters\)/);
});

test('embedding failure falls back to a placeholder vector, not keyword search', async () => {
  const page = await readPage();
  const section = between(page, '## Error Handling', '### Validation Errors');

  assert.match(
    section,
    /\| Embedding generation fails \| Falls back to a deterministic placeholder vector, so vector hits are not semantically meaningful \| 200 \|/,
  );
  assertAbsent(section, /Embedding generation fails \| Falls back to keyword search/);
});

test('multi-query, auto-decompose, and the candidate search flow are described as sequential', async () => {
  const page = await readPage();

  // Multi-query execution
  assert.match(page, /The backend executes them one after another and deduplicates results server-side\./);
  assertAbsent(page, /executes them in parallel/);

  // Auto-decompose
  const decompose = between(page, '### Auto Query Decomposition', '### Multiple Query Deduplication');
  assert.match(
    decompose,
    /Searched as: the original query plus up to three topic keywords, `\["React OAuth authentication patterns", "react", "oauth", "authentication"\]`/,
  );
  assert.match(decompose, /capitalized names \(at most two are used\)/);
  assert.match(decompose, /Runs the searches one after another, not in parallel/);
  assertAbsent(decompose, /Executes parallel searches/);
  assertAbsent(decompose, /Decomposed into: `\["React", "OAuth", "authentication", "patterns"\]`/);

  // MCP schema row for auto_decompose
  const row = tableRow(mcpSchemaSection(page), 'auto_decompose');
  assert.match(row, /Auto-extract entities and topics from query to generate supplementary searches/);
  assertAbsent(row, /parallel/i);

  // Query execution sequence diagram: no par/and block, graph search fills remaining slots
  const sequence = between(page, '## Query Execution Flow', '**Typical performance:**');
  assert.match(sequence, /API->>Vector: "search\(embedding, limit\)"/);
  assert.match(sequence, /API->>Graph: "keyword search Cypher \(fills remaining slots\)"/);
  assertAbsent(sequence, /^\s*par Vector Search$/m);
  assertAbsent(sequence, /^\s*and Graph Search$/m);

  // Performance list
  const performance = page.slice(page.indexOf('## Performance Optimization Techniques'));
  assert.match(performance, /2\. \*\*Sequential Candidate Search\*\*: Vector search runs first, and graph keyword search only fills the slots it leaves open/);
  assertAbsent(performance, /Parallel Search/);
  assertAbsent(performance, /execute concurrently/);

  // Nothing on the page still claims parallel or concurrent work except the explicit negation.
  const withoutNegation = page.replace('Runs the searches one after another, not in parallel', '');
  assertAbsent(withoutNegation, /parallel|concurren/i);
});

test('entity expansion is documented as a single sequential pass over entities from the seed memories', async () => {
  const page = await readPage();
  const section = between(page, '### Entity Expansion Flow', '### Auto Query Decomposition');

  assert.match(section, /It runs once, after the seed results and any relation expansion are assembled, and only when Qdrant is available/);
  assert.match(section, /Collect entities from the seed memories and any relation-expanded memories: `metadata\.entities` \(people, places, organizations\) and `entity:people:<slug>` tags/);
  assert.match(section, /For up to 5 of those entities, one after another, search for memories tagged `entity:people:<slug>` \(up to 5 per entity, capped by `expansion_limit`\)/);
  assert.match(section, /`match_type: "entity_expansion"` and `expanded_from_entity`/);
  assertAbsent(section, /Extract entity tags from query/);
  assertAbsent(section, /second hop/);
  assertAbsent(section, /first hop/);
});

test('MCP recall_memory input schema table lists every 0.17.0 parameter', async () => {
  const page = await readPage();
  const section = mcpSchemaSection(page);
  const names = [...section.matchAll(/^\| `([a-z_]+)` \|/gm)].map((match) => match[1]);

  // The 38 properties of the recall_memory inputSchema, sorted.
  const expected = [
    'active_path',
    'adaptive_floor',
    'auto_decompose',
    'context',
    'context_tags',
    'context_types',
    'current_only',
    'embedding',
    'end',
    'exclude_tags',
    'exhaustive',
    'expand_entities',
    'expand_min_importance',
    'expand_min_strength',
    'expand_relations',
    'expand_respect_tags',
    'expansion_limit',
    'format',
    'language',
    'limit',
    'memory_id',
    'min_score',
    'offset',
    'per_query_limit',
    'priority_ids',
    'queries',
    'query',
    'recency_bias',
    'relation_limit',
    'scope_fallback',
    'sort',
    'start',
    'state_debug',
    'state_mode',
    'tag_match',
    'tag_mode',
    'tags',
    'time_query',
  ];

  assert.equal(expected.length, 38);
  assert.equal(new Set(names).size, names.length, 'no parameter row is duplicated');
  assert.deepEqual([...names].sort(), expected);

  assert.match(tableRow(section, 'memory_id'), /^\| `memory_id` \| string \| No \| — \| ID fetch mode: .*`GET \/memory\/\{id\}`.* ignores all other parameters \|$/);
  assert.match(tableRow(section, 'exhaustive'), /^\| `exhaustive` \| boolean \| No \| — \| Tag enumeration mode: requires non-empty `tags` and routes to `GET \/memory\/by-tag`/);
  assert.match(tableRow(section, 'embedding'), /^\| `embedding` \| array\[number\] \| No \|/);
  assert.match(tableRow(section, 'exclude_tags'), /^\| `exclude_tags` \| array\[string\] \| No \| — \| Ranked mode only: /);
  assert.match(tableRow(section, 'per_query_limit'), /^\| `per_query_limit` \| integer \| No \| 1–50, default `limit` \|/);
  assert.match(tableRow(section, 'sort'), /^\| `sort` \| string \| No \| `"score"`, `"time_desc"`, `"time_asc"`, `"updated_desc"`, or `"updated_asc"` \|/);
  assert.match(tableRow(section, 'format'), /^\| `format` \| string \| No \| `"text"`, `"items"`, `"detailed"`, or `"json"`; default `"text"` \|/);
  assert.match(tableRow(section, 'offset'), /^\| `offset` \| integer \| No \| 0 or more \| Enumeration mode only \(`exhaustive: true`\)/);
  assert.match(tableRow(section, 'offset'), /rejects `offset > 0`/);

  // The enumeration-mode routing section still lists the same ranked-only parameters.
  assert.match(page, /`priority_ids`, and `per_query_limit`\. Only `tags`, `limit`, `offset`/);
  assert.equal((page.match(/^\| `expand_respect_tags` \|/gm) ?? []).length, 2);
});

test('min_score and adaptive_floor defaults are stated everywhere the page describes them', async () => {
  const page = await readPage();

  const gating = between(page, '### Weak-Result Gating', '\n---\n');
  assert.match(tableRow(gating, 'min_score'), /\| from `RECALL_MIN_SCORE` \(ships `0\.0`, disabled\) \|/);
  assert.match(tableRow(gating, 'adaptive_floor'), /\| from `RECALL_ADAPTIVE_FLOOR` \(ships `true`\) \|/);

  const mcp = mcpSchemaSection(page);
  assert.match(tableRow(mcp, 'min_score'), /\| 0–1 \| .*default from `RECALL_MIN_SCORE` \(ships `0\.0`, disabled\) \|$/);
  assert.match(tableRow(mcp, 'adaptive_floor'), /default from `RECALL_ADAPTIVE_FLOOR` \(ships `true`\) \|$/);

  assert.match(page, /^- `RECALL_MIN_SCORE` \(default: 0\.0, disabled\) — /m);
  assert.match(page, /^- `RECALL_ADAPTIVE_FLOOR` \(default: true\) — /m);
  assertAbsent(page, /^- `RECALL_MIN_SCORE` — /m);
  assertAbsent(page, /^- `RECALL_ADAPTIVE_FLOOR` — /m);
});

test('the sample response notes that its memory object is abridged and keeps the 13-key score_components set', async () => {
  const page = await readPage();
  const section = between(page, '### Standard Response Structure', '### Expansion Response Fields');

  assert.match(
    section,
    /The `memory` object in the sample is abridged too: stored memories can also carry `tag_prefixes`, `updated_at`, `last_accessed`, `t_valid`, `t_invalid`, and `metadata`\./,
  );

  // The conditional keys are described in prose, never added to the sample JSON.
  const sample = JSON.parse(section.match(/```json\n([\s\S]*?)\n```/)[1]);
  const components = Object.keys(sample.results[0].score_components);
  assert.equal(components.length, 13);
  assert.ok(!components.includes('temporal'));
  assert.ok(!components.includes('entity_expansion'));
});

test('score_components documents the conditional temporal and entity_expansion keys', async () => {
  const page = await readPage();
  const bullet = page.match(/^- `score_components`: .*$/m);

  assert.ok(bullet, 'expected a score_components result-field bullet');
  assert.match(bullet[0], /Two keys appear only conditionally:/);
  assert.match(
    bullet[0],
    /`temporal` \(the result's recency relative to the other candidates, 0\.0 to 1\.0\) when the \[recency re-rank\]\(#relative-recency-bias\) changes scores/,
  );
  assert.match(bullet[0], /`entity_expansion` \(0\.15\) on entity-expanded results/);
  assert.match(page, /^### Relative-Recency Bias$/m, 'the link target heading exists');
});

test('the exact component is labelled as a whole-query match against metadata terms', async () => {
  const page = await readPage();
  const diagram = between(page, '### 10-Component Score Calculation', 'The formula:');

  assert.match(
    diagram,
    /ExactComp\["Exact Component<br\/>Weight: SEARCH_WEIGHT_EXACT<br\/>Whole-query exact match against metadata terms"\]/,
  );
  assertAbsent(diagram, /Direct content overlap/);

  // The exact score is computed in the Python scoring step, so it sits with the
  // other scoring components, not under the FalkorDB keyword search subgraph.
  const keywordSubgraph = between(diagram, 'subgraph KeywordSearch', 'subgraph MetadataSidecar');
  assertAbsent(keywordSubgraph, /ExactComp/);
  const scoringSubgraph = between(diagram, 'subgraph MetadataScoring', 'subgraph ContextScoring');
  assert.match(scoringSubgraph, /ExactComp\[/);
  assert.match(diagram, /ExactComp --> FinalScore/);
});

test('MCP response formatting keeps content previews and treats summary as additive', async () => {
  const page = await readFile(fileURLToPath(new URL('../src/content/docs/docs/reference/api/recall-operations.md', import.meta.url)), 'utf8');

  assert.doesNotMatch(page, /summary-first/);
  assert.doesNotMatch(page, /Prefers each memory's server-generated `summary`/);
  assert.match(page, /Cuts content longer than 400 characters to a 400-character preview and flags it with `content_truncated` and `content_chars`/);
  assert.match(page, /it stands in for the preview in the text channel only when `content` is empty/);
  assert.match(page, /- In `detailed`, collapses relations to compact stubs/);
});
