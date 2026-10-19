import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isPinnedSha } from './helpers/source-pins.mjs';

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

// Slice from one heading line to the next named heading line. Explicit end
// headings keep fenced blocks (JSON, Mermaid, curl) from being mistaken for
// page headings.
function between(page, startHeading, endHeading) {
  const start = page.indexOf(`\n${startHeading}\n`);
  assert.notEqual(start, -1, `expected a "${startHeading}" heading`);
  const end = page.indexOf(`\n${endHeading}\n`, start + 1);
  assert.notEqual(end, -1, `expected a "${endHeading}" heading after "${startHeading}"`);
  return page.slice(start, end);
}

function subScores(page) {
  return between(page, '**Importance, Confidence, Recency & Tag Sub-Scores:**', '---');
}

function formulaSection(page) {
  return between(page, 'The formula:', '### Scoring Component Details');
}

function responseSection(page) {
  return between(page, '### Standard Response Structure', '### Expansion Response Fields');
}

function stateFilteringSection(page) {
  return between(page, '### State Filtering Parameters', '### Metadata Sidecar Search');
}

function stateExampleSection(page) {
  return between(page, '### Current-State Recall (Default)', '## Sorting Modes');
}

function sortingSection(page) {
  return between(page, '### Score-Based Sorting (Default)', '### Time-Based Sorting');
}

function errorSection(page) {
  return between(page, '## Error Handling', '## Performance Optimization Techniques');
}

test('recency sub-score decays from timestamp with a configurable window and curve', async () => {
  const section = subScores(await readPage());

  assert.match(section, /age_days \/ SEARCH_RECENCY_WINDOW_DAYS/);
  assert.match(section, /recency window \(default 180 days\)/);
  assert.match(section, /measured from the memory's `timestamp` rather than `last_accessed`/);
  assert.match(section, /`SEARCH_RECENCY_CURVE=exp`/);
  assert.match(section, /`0\.5 \*\* \(age_days \/ SEARCH_RECENCY_WINDOW_DAYS\)`/);
  assert.match(section, /half-life/);
  assert.match(section, /missing or unparseable `timestamp` scores 0\.0/);

  assertAbsent(section, /time since last access/i);
  assertAbsent(section, /6-month/);
  assertAbsent(section, /age_days \/ 180\)/);
});

test('tag sub-score is described as query keywords matched against tags and metadata terms', async () => {
  const section = subScores(await readPage());

  assert.match(section, /`min\(1, matched_tokens \/ total_query_tokens\)`/);
  assert.match(section, /query keywords that exactly match one of the memory's tags or metadata terms/);
  assertAbsent(section, /query tags and memory tags/);
});

test('stale recency wording is gone from the whole page', async () => {
  const page = await readPage();

  assertAbsent(page, /time since last access/i);
  assertAbsent(page, /based on time since last/i);
});

test('score formula adds the unweighted context bonus and says the sum is not normalized', async () => {
  const section = formulaSection(await readPage());
  const formula = section.match(/```\n(final_score = [\s\S]*?)\n```/);

  assert.ok(formula, 'expected the final_score formula block');
  const weights = formula[1].match(/SEARCH_WEIGHT_[A-Z]+/g) ?? [];
  assert.deepEqual(
    [...new Set(weights)].sort(),
    [
      'SEARCH_WEIGHT_CONFIDENCE',
      'SEARCH_WEIGHT_EXACT',
      'SEARCH_WEIGHT_IMPORTANCE',
      'SEARCH_WEIGHT_KEYWORD',
      'SEARCH_WEIGHT_METADATA',
      'SEARCH_WEIGHT_RECENCY',
      'SEARCH_WEIGHT_RELATION',
      'SEARCH_WEIGHT_RELEVANCE',
      'SEARCH_WEIGHT_TAG',
      'SEARCH_WEIGHT_VECTOR',
    ],
    'the formula lists exactly the ten weighted terms',
  );
  assert.match(formula[1], /\+\n\s+context_bonus$/, 'context_bonus is the last, unweighted term');

  assert.match(section, /`context_bonus` is added without a weight/);
  assert.match(section, /not normalized, so `final_score` can exceed 1\.0/);
});

test('context hint paragraph points at the context bonus, not the ten weighted components', async () => {
  const page = await readPage();

  assert.match(page, /Context hints add an unweighted context bonus to the final score/);
  assertAbsent(page, /Context hints influence the 10-component scoring system/);
});

test('score sorting counts ten weighted components plus the context bonus', async () => {
  const page = await readPage();
  const section = sortingSection(page);

  assert.match(section, /sum of all 10 weighted components plus the unweighted context bonus/);
  assertAbsent(page, /\ball 9 components\b/);
  assertAbsent(page, /\b9 components\b/);
});

test('standard response sample uses the real HTTP result shape', async () => {
  const section = responseSection(await readPage());
  const block = section.match(/```json\n([\s\S]*?)\n```/);

  assert.ok(block, 'expected a JSON sample in the Standard Response Structure section');
  const body = JSON.parse(block[1]);

  assert.equal(body.status, 'success');
  assert.equal(body.count, body.results.length);
  assert.equal(body.state_mode, 'current');

  const [result] = body.results;
  assert.equal(result.match_type, 'vector');
  assert.equal(typeof result.id, 'string', 'the memory ID is the result-level id');
  assert.ok('timestamp' in result.memory, 'the memory payload carries timestamp');
  assert.ok(!('memory_id' in result.memory), 'HTTP memory payload has no memory_id');
  assert.ok(!('created_at' in result.memory), 'HTTP memory payload has no created_at');
});

// Default weights as the page's own weight table states them, keyed by the
// score_components name (SEARCH_WEIGHT_VECTOR -> vector).
function pageWeights(page) {
  const section = between(page, '**Default weight configuration (all configurable via environment variables):**', '### Scoring Component Details');
  const weights = {};
  for (const row of section.matchAll(/^\| [A-Za-z]+ \| `SEARCH_WEIGHT_([A-Z]+)` \| ([0-9.]+) \|$/gm)) {
    weights[row[1].toLowerCase()] = Number(row[2]);
  }
  return weights;
}

test('standard response sample carries the always-present keys and the full score_components set', async () => {
  const section = responseSection(await readPage());
  const body = JSON.parse(section.match(/```json\n([\s\S]*?)\n```/)[1]);

  assert.deepEqual(body.state_filter, {
    current_only: true,
    suppressed_count: 0,
    replacement_count: 0,
  });
  assert.deepEqual(body.keywords, ['postgresql', 'database', 'decisions']);

  // Flask sorts JSON keys, so compare sorted key sets, never key order.
  assert.deepEqual(Object.keys(body.results[0].score_components).sort(), [
    'confidence',
    'context',
    'evidence',
    'exact',
    'importance',
    'keyword',
    'metadata',
    'recency',
    'relation',
    'relevance',
    'relevance_gated',
    'tag',
    'vector',
  ]);
});

test('standard response sample final_score equals the default-weight sum of its score_components', async () => {
  const page = await readPage();
  const body = JSON.parse(responseSection(page).match(/```json\n([\s\S]*?)\n```/)[1]);
  const [result] = body.results;
  const weights = pageWeights(page);

  assert.deepEqual(Object.keys(weights).sort(), [
    'confidence',
    'exact',
    'importance',
    'keyword',
    'metadata',
    'recency',
    'relation',
    'relevance',
    'tag',
    'vector',
  ]);

  const weighted = Object.entries(weights).reduce(
    (sum, [name, weight]) => sum + weight * result.score_components[name],
    0,
  );
  const expected = weighted + result.score_components.context;
  // The sample rounds components to four decimals, so allow rounding slack.
  assert.ok(
    Math.abs(result.final_score - expected) < 0.001,
    `final_score ${result.final_score} should equal the weighted component sum ${expected}`,
  );

  // Components that the query and tag rules can produce with three query keywords.
  const { keyword, tag, evidence, vector } = result.score_components;
  for (const value of [keyword, tag]) {
    assert.ok(
      [0, 1 / 3, 2 / 3, 1].some((reachable) => Math.abs(value - reachable) < 0.0001),
      `${value} is a ratio over three query keywords`,
    );
  }
  assert.ok(Math.abs(evidence - Math.max(vector, keyword, result.score_components.metadata, result.score_components.exact)) < 1e-9);
  assert.equal(body.keywords.length, 3);
});

test('score notes point at the recency re-rank term', async () => {
  const page = await readPage();

  assert.match(formulaSection(page), /\[`recency_bias`\]\(#relative-recency-bias\).*`SEARCH_WEIGHT_TEMPORAL \* relative_recency`.*off by default/);
  assert.match(sortingSection(page), /\[`recency_bias`\]\(#relative-recency-bias\) is active/);
  assert.match(page, /^### Relative-Recency Bias$/m, 'the link target heading exists');
});

test('match_type lists exactly the values the service emits', async () => {
  const section = responseSection(await readPage());
  const bullet = section.match(/^- `match_type`: Type of match — (.+)$/m);

  assert.ok(bullet, 'expected a match_type result-field bullet');
  const values = [...bullet[1].matchAll(/`([a-z_]+)`/g)].map((match) => match[1]);

  assert.deepEqual(values.sort(), [
    'entity_expansion',
    'keyword',
    'metadata',
    'priority_id',
    'relation',
    'state_replacement',
    'tag',
    'trending',
    'vector',
  ]);
  assertAbsent(section, /"match_type": "semantic"/);
  assertAbsent(section, /`semantic`/);
  assert.ok(!values.includes('entity'), 'entity is not an emitted match_type');
});

test('result field bullets use id and timestamp, not memory_id and created_at', async () => {
  const section = responseSection(await readPage());

  assert.match(section, /^- `id`: The memory's ID$/m);
  assert.match(section, /^- `memory`: .*`timestamp`/m);
  assert.match(section, /memory ID is the result-level `id` \(vector hits carry no ID inside `memory`\)/);
  assert.match(section, /the MCP tool presents them as `memory_id` and `created_at`/);
  assertAbsent(section, /stored memory object with `memory_id`/);
});

test('state_mode=history lifts the current-state filter but not the archived candidate exclusion', async () => {
  const section = stateFilteringSection(await readPage());

  assert.match(section, /`state_mode=history` turns that filter off/);
  assert.match(
    section,
    /`history` skips the current-state filter, so superseded, expired, and not-yet-valid memories can be returned/,
  );
  assert.match(
    section,
    /Archived memories stay excluded from the vector, keyword, trending, tag-only, and metadata candidate searches/,
  );
  assert.match(section, /Any other value returns 400/);
  assert.match(section, /`current_only` \*\*wins\*\*/);
  assert.match(section, /a `history` response has no `state_filter`/);
  assert.match(section, /to retrieve superseded, expired, or not-yet-valid memories/);

  assertAbsent(section, /full set including superseded\/expired\/archived/);
  assertAbsent(section, /superseded, expired, or archived memories you must pass/);
  assertAbsent(section, /suppressed unless you explicitly ask for history/);
});

test('state example puts state_debug on the current-state call and none on history', async () => {
  const section = stateExampleSection(await readPage());
  const calls = [...section.matchAll(/curl "([^"]+)"/g)].map((match) => match[1]);

  assert.equal(calls.length, 2);
  const [current, history] = calls;
  assert.ok(!current.includes('state_mode='), 'default call relies on the default state_mode');
  assert.ok(current.includes('state_debug=true'));
  assert.ok(history.includes('state_mode=history'));
  assert.ok(!history.includes('state_debug'), 'state_debug has no effect in history mode');

  assert.match(section, /its response has no `state_filter` object/);
  assertAbsent(section, /including superseded and archived memories/);
  assertAbsent(section, /full lifecycle/);
});

test('internal artifact exclusion also covers health counts, admin sync, and the sync worker', async () => {
  const page = await readPage();
  const section = between(page, '### Internal Artifact Type Exclusion', '### Relative-Recency Bias');

  assert.match(section, /`RECALL_EXCLUDED_TYPES` \(default `MetaPattern`/);
  assert.match(section, /`\/health` memory and vector counts/);
  assert.match(section, /`\/admin\/sync`/);
  assert.match(section, /background sync worker's drift repair/);
  assert.match(section, /not counted there either/);

  assertAbsent(section, /applies to ranked recall only/);
  assertAbsent(section, /still count all `Memory` nodes/);
});

test('relation expansion is one hop over the default_expand relationship types', async () => {
  const page = await readPage();
  const section = between(page, '## Graph Expansion', '### Entity Expansion Flow');
  const followed = [
    'RELATES_TO',
    'LEADS_TO',
    'OCCURRED_BEFORE',
    'PREFERS_OVER',
    'EXEMPLIFIES',
    'CONTRADICTS',
    'REINFORCES',
    'INVALIDATED_BY',
    'EVOLVED_INTO',
    'DERIVED_FROM',
    'PART_OF',
  ];

  const edgeLine = section.match(/\*\*Edge types traversed:\*\*(.+)/);
  assert.ok(edgeLine, 'expected an Edge types traversed line');
  const [followedText, notFollowedText] = edgeLine[1].split('system-generated');
  assert.ok(notFollowedText, 'expected the system-generated edge types to be called out');
  for (const type of followed) {
    assert.ok(followedText.includes(`\`${type}\``), `${type} is a default_expand type`);
  }
  for (const type of ['SIMILAR_TO', 'PRECEDED_BY', 'DISCOVERED']) {
    assert.ok(!followedText.includes(`\`${type}\``), `${type} is not followed`);
    assert.ok(notFollowedText.includes(`\`${type}\``), `${type} is called out as not followed`);
  }
  assert.match(edgeLine[1], /`default_expand`/);

  assert.match(section, /expands each seed memory by one hop/);
  assertAbsent(section, /and all other relationship types/);
  assertAbsent(section, /multi-hop graph traversal using Cypher/);
});

test('error handling matches how /recall actually fails', async () => {
  const section = errorSection(await readPage());

  assert.match(
    section,
    /\| FalkorDB unavailable \| Graph-backed steps .* vector search still runs \| 200 \|/,
  );
  assert.match(section, /\| Invalid `start` or `end` \| 400 \|/);
  assert.match(section, /\| Invalid `state_mode` \| 400 \|/);
  assert.match(
    section,
    /unrecognized `time_query` expression is not an error: it is ignored, and only `start` and `end`, if given, set the time window/,
  );
  assertAbsent(section, /no time filter is applied/);
  assert.match(section, /\{"status": "error", "code": <HTTP status>, "message": "<description>"\}/);

  assertAbsent(section, /\| FalkorDB unavailable \| Returns 503 error \| 503 \|/);
  assertAbsent(section, /Invalid time query/);
  assertAbsent(section, /Unparseable time expression/);
});

test('lines documenting newer mcp-automem behaviour stay in place', async () => {
  const page = await readPage();

  // The expand_respect_tags rows and the enumeration-mode rejection list were
  // added from newer mcp-automem source; this page change must not revert them.
  const respectTagsRows = page.match(/^\| `expand_respect_tags` \|/gm) ?? [];
  assert.equal(respectTagsRows.length, 2, 'HTTP and MCP tables both document expand_respect_tags');
  assert.match(page, /`priority_ids`, and `per_query_limit`\. Only `tags`, `limit`, `offset`/);
});

test('source file links for the AutoMem server files use the pinned release commit', async () => {
  const page = await readPage();
  const note = between(page, ':::note[Source files]', ':::');
  const links = [...note.matchAll(/\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/([^)]+)\)/g)];

  assert.deepEqual(
    links.map((match) => match[2]),
    [
      'automem/api/recall.py',
      'automem/search/runtime_recall_helpers.py',
      'automem/utils/scoring.py',
      'automem/config.py',
    ],
  );
  for (const [, sha, file] of links) {
    assert.ok(isPinnedSha('automem', sha), `${file} must link to a pinned AutoMem revision`);
  }
});
