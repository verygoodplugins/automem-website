import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/core-concepts/memory-model.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Text from `start` up to (not including) `end`, both literal strings in the page.
function between(page, start, end) {
  const from = page.indexOf(start);
  assert.notEqual(from, -1, `expected "${start}" in the page`);
  const to = page.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `expected "${end}" after "${start}"`);
  return page.slice(from, to);
}

function automemLinks(text) {
  return [
    ...text.matchAll(
      /\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/([^)#]+)(#[^)]*)?\)/g,
    ),
  ].map(([, sha, path, anchor = '']) => ({ sha, path, anchor }));
}

function tableRow(section, property) {
  const row = section.split('\n').find((line) => line.startsWith(`| \`${property}\` |`));
  assert.ok(row, `expected a table row for \`${property}\``);
  return row;
}

test('memory model points the MemoryRow source link at the dataclass in a pinned release', async () => {
  const page = await readPage();
  const note = between(page, ':::note[Source files]', '\n:::\n');
  const links = automemLinks(note);
  const memoryRow = links.find((link) => link.path === 'consolidation.py');

  assert.ok(memoryRow, 'expected the consolidation.py source link');
  assert.equal(memoryRow.anchor, '#L68-L79');
  assert.ok(isPinnedSha('automem', memoryRow.sha), 'MemoryRow link must use a pinned AutoMem SHA');
  assert.doesNotMatch(note, /consolidation\.py#L40-L50/);
});

test('memory model sizes embeddings by the effective vector size instead of a fixed 1024', async () => {
  const page = await readPage();
  const overview = between(page, '## Overview', '## Memory Schema');
  const core = between(page, '### Core Properties', '### Temporal Properties');
  const validation = page.slice(page.indexOf('### Embedding Validation'));

  assert.match(overview, /embedding: float\[VECTOR_SIZE\]/);
  assert.doesNotMatch(overview, /float\[1024\]/);

  const embeddingRow = tableRow(core, 'embedding');
  assert.match(embeddingRow, /effective `VECTOR_SIZE` \(default 1024\)/);
  assert.match(embeddingRow, /`VECTOR_SIZE_AUTODETECT` is on \(the default\)/);
  assert.match(embeddingRow, /existing Qdrant collection's dimension is adopted/);
  assert.doesNotMatch(embeddingRow, /1024-dimensional/);

  assert.match(validation, /Must match the effective vector dimension/);
  assert.match(validation, /`VECTOR_SIZE` \(default `1024`\)/);
  assert.match(validation, /`VECTOR_SIZE_AUTODETECT` \(default `true`\) adopts it/);
  assert.doesNotMatch(validation, /exactly 1024/);
});

test('memory model describes the automatic embedding provider chain in order', async () => {
  const page = await readPage();
  const validation = page.slice(page.indexOf('### Embedding Validation'));
  const generated = validation
    .split('\n')
    .find((line) => line.startsWith('- On `POST /memory`, generated in the background'));

  assert.ok(generated, 'expected the generated-embedding bullet');
  assert.match(generated, /if omitted and Qdrant is configured/);
  assert.match(generated, /otherwise `embedding_status` is `skipped`/);
  assert.match(generated, /`EMBEDDING_PROVIDER=auto` \(the default\)/);
  assert.match(generated, /Ollama \(`OLLAMA_BASE_URL` or `OLLAMA_MODEL`\)/);

  const order = ['Voyage', 'OpenAI', 'Ollama', 'FastEmbed', 'deterministic placeholder'].map(
    (name) => generated.indexOf(name),
  );
  assert.ok(
    order.every((index) => index !== -1),
    'every provider is named',
  );
  assert.deepEqual(
    [...order].sort((a, b) => a - b),
    order,
    'providers are listed in selection order',
  );
  assert.doesNotMatch(validation, /text-embedding-3-small/);
  assert.match(validation, /\]\(\/docs\/architecture\/embeddings\/\)/);
});

test('history mode lifts the current-state filter and the time parameters do not', async () => {
  const page = await readPage();
  const query = between(page, '### Query Behavior', '**Example Scenarios:**');

  assert.match(query, /Pass `state_mode=history` \(or the legacy `current_only=false`\)/);
  assert.match(query, /skip the \[current-state filter\]\(/);
  assert.match(query, /include not-yet-valid and expired memories/);
  assert.match(query, /replaces a superseded memory/);
  assert.match(query, /`INVALIDATED_BY` or `EVOLVED_INTO`/);
  assert.match(
    query,
    /`time_query`, `start`, and `end` only set the time window; they do not include expired memories/,
  );
  assert.match(query, /candidate searches skip archived memories in either mode/);
  assert.doesNotMatch(
    query,
    /Use `time_query` or explicit `start`\/`end` parameters to include expired memories/,
  );
  assert.doesNotMatch(query, /not-yet-valid, expired, and archived/);

  const links = automemLinks(query);
  assert.deepEqual(
    links.map(({ path, anchor }) => `${path}${anchor}`),
    [
      'automem/api/recall.py#L2301-L2314',
      'automem/api/recall.py#L1853-L1866',
      'automem/search/runtime_recall_helpers.py#L635',
      'automem/search/runtime_recall_helpers.py#L1012-L1013',
    ],
  );
  for (const { sha, path } of links) {
    assert.ok(isPinnedSha('automem', sha), `${path} must use a pinned AutoMem SHA`);
  }
});

test('core and temporal properties document server-side ids and creation defaults', async () => {
  const page = await readPage();
  const core = between(page, '### Core Properties', '### Temporal Properties');
  const temporal = between(page, '### Temporal Properties', '### Enrichment Properties');

  assert.match(
    tableRow(core, 'id'),
    /always generated server-side \(an `id` sent in the request is ignored\)/,
  );
  assert.doesNotMatch(core, /auto-generated if not provided/);
  assert.match(
    tableRow(core, 'type'),
    /or the `Memory` fallback\. An explicit `type` in the request is stored as sent/,
  );
  assert.match(
    tableRow(core, 'confidence'),
    /Defaults to `0\.9` when the request sets `type`; a `confidence` sent without `type` is ignored/,
  );
  assert.match(
    tableRow(core, 'importance'),
    /User-specified importance \(0\.0-1\.0, default: 0\.5\)/,
  );
  assert.doesNotMatch(tableRow(core, 'importance'), /derived/);

  assert.match(tableRow(temporal, 't_valid'), /Defaults to `timestamp`/);
  assert.match(
    tableRow(temporal, 'updated_at'),
    /Update timestamp, not bumped automatically\. Defaults to `timestamp` on creation; `PATCH \/memory\/:id` keeps the stored value unless the request sends `updated_at`/,
  );
  assert.doesNotMatch(tableRow(temporal, 'updated_at'), /Last modification timestamp/);
  assert.match(tableRow(temporal, 'last_accessed'), /Defaults to `updated_at` on creation/);
});

test('enrichment fields match what the pipeline writes', async () => {
  const page = await readPage();
  const properties = between(page, '### Enrichment Properties', '### State Properties');
  const metadata = between(page, '### Enrichment Metadata', '### Reserved Fields');

  assert.doesNotMatch(page, /enrichment_attempts/);
  assert.match(tableRow(properties, 'enriched_at'), /When enrichment pipeline processed this memory/);
  assert.match(tableRow(properties, 'summary'), /first sentence, max 240 chars/);
  assert.match(
    tableRow(properties, 'metadata.entities'),
    /Stored inside `metadata`, not as a top-level property/,
  );
  assert.doesNotMatch(properties, /^\| `entities` \|/m);

  assert.match(tableRow(metadata, 'metadata.entities'), /Extracted entities by category/);
  const run = tableRow(metadata, 'metadata.enrichment');
  for (const key of [
    'last_run',
    'forced',
    'temporal_links',
    'patterns_detected',
    'semantic_neighbors',
    'jit',
    'jit_at',
  ]) {
    assert.match(run, new RegExp(`\`${key}\``), `metadata.enrichment documents ${key}`);
  }
  assert.doesNotMatch(metadata, /`metadata\.enriched_at`|`metadata\.summary`/);
  assert.match(metadata, /`enriched_at` and `summary` are top-level properties/);
});

test('the Memory fallback type is documented as stored as returned, not normalized to Context', async () => {
  const page = await readPage();
  const taxonomy = between(page, '## Memory Type Taxonomy', '## Classification System');
  const classification = between(page, '## Classification System', '## Temporal Validity Model');
  const architecture = between(classification, '### Architecture', '### Pattern-Based Classification');

  assert.match(taxonomy, /classifier assigns one of seven semantic types/);
  assert.match(
    taxonomy,
    /`POST \/memory` stores it as returned: nothing in the store path maps it to `"Context"`/,
  );
  assert.match(taxonomy, /an explicit `type` in the request is stored exactly as sent/);
  assert.doesNotMatch(taxonomy, /immediately normalized/);
  assert.doesNotMatch(taxonomy, /will always have one of the seven canonical types/);

  assert.doesNotMatch(page, /→ normalized to Context/);
  assert.doesNotMatch(page, /normalized to `"Context"` via `TYPE_ALIASES` during storage/);
  assert.doesNotMatch(architecture, /Valid<br\/>type\?/);
  assert.match(architecture, /Explicit -->\|"Yes: stored as sent"\| Decision/);
  assert.match(architecture, /Fallback\["Memory \(fallback\)<br\/>confidence: 0\.3"\]/);
  assert.match(
    architecture,
    /It is stored as sent, with confidence `0\.9` unless the request sets `confidence`/,
  );
  assert.match(architecture, /classifier returns `Memory` with confidence `0\.3`/);
  assert.match(classification, /Classifier-->>API: "Memory \(fallback\), 0\.3"/);
});

test('pattern classification uses the first matching type and the real confidence formula', async () => {
  const page = await readPage();
  const patterns = between(page, '### Pattern-Based Classification', '### LLM Classification');

  assert.match(patterns, /first type with a matching pattern wins/);
  assert.match(patterns, /Base confidence: `0\.6` when a single pattern of that type matches/);
  assert.match(patterns, /`min\(0\.95, 0\.6 \+ 0\.1 × matches\)`/);
  assert.match(patterns, /two matches give `0\.8`, three give `0\.9`, and four or more give `0\.95`/);
  assert.doesNotMatch(patterns, /`\+0\.1` for each additional pattern match/);
  assert.match(tableRow(patterns, 'Habit'), /r"\\balways\\b\(\?!\\s\+use\\b\)"/);
  assert.match(patterns, /`always use` is a `Preference` pattern/);
});

test('LLM classification documents the configurable model, token parameter, and fallbacks', async () => {
  const page = await readPage();
  const llm = between(page, '### LLM Classification', 'The full classification sequence');

  assert.match(llm, /`CLASSIFICATION_MODEL`, default `gpt-4o-mini`/);
  assert.match(
    llm,
    /sent as `max_completion_tokens` for model names starting with `o1`, `o3`, `o4`, `gpt-4o`, `gpt-4\.1`, or `gpt-5`/,
  );
  assert.match(llm, /sent only with `max_tokens`, so the default model receives no temperature parameter/);
  assert.doesNotMatch(llm, /deterministic/);
  assert.doesNotMatch(page, /approximately 30% of cases/);

  const validation = between(llm, '**Validation:**', ':::tip');
  assert.match(validation, /normalized through `TYPE_ALIASES` \(for example `analysis` becomes `Insight`/);
  assert.match(validation, /cannot be mapped is stored as `"Context"` with confidence `0\.5`/);
  assert.match(validation, /omits `confidence`, `0\.7` is used/);
  assert.match(
    validation,
    /falls back to `"Memory"` with confidence `0\.3`, and `"Memory"` is stored as returned/,
  );
  assert.match(validation, /enrichment circuit breaker is open, the LLM call is skipped/);
  assert.match(validation, /`ENRICHMENT_CIRCUIT_COOLDOWN_SECONDS` \(default `300`\)/);
  assert.doesNotMatch(validation, /Returned type must exist in `MEMORY_TYPES`/);
});

test('the lifecycle describes flat backoff and forced-only enrichment retries', async () => {
  const page = await readPage();
  const lifecycle = between(page, '## Memory Lifecycle', '## Implementation Details');
  const queued = between(lifecycle, '2. **Enrichment Queued**:', '3. **Enriching**:');

  assert.doesNotMatch(page, /exponential backoff/i);
  assert.doesNotMatch(lifecycle, /Retry \(max 3\)|Backoff retry|Max attempts\n/);
  assert.doesNotMatch(queued, /polls queue every 2 seconds/);
  assert.match(queued, /wakes at least every `ENRICHMENT_IDLE_SLEEP_SECONDS` \(default 2 seconds\)/);
  assert.match(queued, /Up to `ENRICHMENT_MAX_ATTEMPTS` attempts \(default 3\)/);
  assert.match(queued, /flat `ENRICHMENT_FAILURE_BACKOFF_SECONDS` sleep \(default 5 seconds\)/);
  assert.match(queued, /in-flight duplicate check, which drops it for non-forced jobs/);
  assert.match(queued, /only forced jobs from `POST \/enrichment\/reprocess` are retried/);

  assert.match(lifecycle, /EnrichmentFailed --> Enriching: Forced jobs only<br\/>Flat backoff/);
  assert.match(lifecycle, /EnrichmentFailed --> Abandoned: Non-forced job<br\/>or max attempts/);
});

test('validation rules match what POST /memory enforces', async () => {
  const page = await readPage();
  const rules = page.slice(page.indexOf('## Validation Rules'));
  const types = between(rules, '### Type Validation', '### Confidence Validation');
  const confidence = between(rules, '### Confidence Validation', '### Importance Validation');
  const tags = between(rules, '### Tag Validation', '### Timestamp Validation');

  assert.match(
    types,
    /classifier assigns one of: `Decision`, `Pattern`, `Preference`, `Style`, `Habit`, `Insight`, `Context`/,
  );
  assert.match(
    types,
    /An explicit `type` is not checked: `POST \/memory` and `POST \/memory\/batch` store whatever string the request sends/,
  );
  assert.match(
    types,
    /or the `Memory` fallback \(confidence `0\.3`\) when no pattern matches and the LLM returns nothing usable/,
  );
  assert.doesNotMatch(types, /Invalid types return `400 Bad Request`/);
  assert.doesNotMatch(types, /Case-sensitive/);

  assert.match(
    confidence,
    /Default: `0\.9` if type explicitly provided\. Otherwise the classifier computes it and any `confidence` in the request is ignored/,
  );

  assert.doesNotMatch(tags, /Normalized to lowercase/);
  assert.doesNotMatch(tags, /Empty tags filtered out/);
  assert.doesNotMatch(tags, /Array of strings or comma-separated string\n/);
  assert.match(
    tags,
    /single string that is stored as one tag \(`POST \/memory` does not split comma-separated strings\)/,
  );
  assert.match(tags, /`tags` are stored as sent, with case preserved and blank entries kept/);
  assert.match(tags, /`tag_prefixes` are computed from the trimmed, lowercased tags, skipping blank entries/);
  assert.match(tags, /`PATCH \/memory\/:id` and the enrichment pipeline use a different normalizer/);
  assert.match(tags, /until the enrichment run rewrites them/);
  assert.match(
    tags,
    /Enrichment rewrites the stored `tags` with it, removes duplicates, and appends `entity:<category>:<slug>` tags/,
  );
});

test('the creation flow enqueues enrichment after the embedding step, as POST /memory does', async () => {
  const page = await readPage();
  const flow = between(page, '### Memory Creation Flow', '## Validation Rules');
  const embeddingStep = flow.indexOf('API->>EmQ: Queue for generation');
  const enrichmentStep = flow.indexOf('API->>EQ: Enqueue enrichment');
  const response = flow.indexOf('API-->>C: 201 Created');

  assert.notEqual(embeddingStep, -1, 'expected the embedding queue step');
  assert.notEqual(enrichmentStep, -1, 'expected the enrichment enqueue step');
  assert.ok(embeddingStep < enrichmentStep, 'enrichment is enqueued after the embedding step');
  assert.ok(enrichmentStep < response, 'enrichment is enqueued before the response is sent');
  assert.match(
    flow.slice(flow.indexOf('alt Embedding provided'), enrichmentStep),
    /else No embedding[\s\S]*end\n/,
  );
});

test('storage and lifecycle describe when the vector is written or queued', async () => {
  const page = await readPage();
  const stores = between(page, '**Dual Storage Strategy:**', ':::note');
  const created = between(page, '1. **Created** (`POST /memory`):', '2. **Enrichment Queued**:');
  const states = between(page, '### State Properties', '\n---\n');

  assert.doesNotMatch(stores, /Data is written to both databases synchronously/);
  assert.match(
    stores,
    /FalkorDB is written synchronously\. Qdrant is written in the same request only when the request supplies `embedding`/,
  );
  assert.match(stores, /otherwise the vector is queued for generation, or skipped when Qdrant is not configured/);
  assert.match(created, /Embedding queued for generation \(when omitted and Qdrant is configured\)/);

  assert.match(tableRow(states, 'archived'), /excluded from search candidates/);
  assert.doesNotMatch(tableRow(states, 'archived'), /excluded from search by default/);
});
