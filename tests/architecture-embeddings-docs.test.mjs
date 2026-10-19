import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/embeddings.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, pattern, label) {
  const match = page.match(pattern);
  assert.ok(match, `expected ${label}`);
  return match[1];
}

function validationSection(page) {
  return section(page, /### Dimension Validation\n([\s\S]*?)\n---/, 'the Dimension Validation section');
}

test('dimension validation describes adopt-by-default reconciliation at startup', async () => {
  const page = await readPage();
  const validation = validationSection(page);

  assert.match(validation, /Dimension reconciliation happens at startup — \*\*not\*\* on every write:/);
  assert.doesNotMatch(page, /initialised/);
  assert.match(validation, /`VECTOR_SIZE_AUTODETECT=true`/);
  assert.match(validation, /`get_effective_vector_size\(\)`/);
  assert.match(validation, /adopts the collection's dimension/);
  assert.match(validation, /builds the embedding provider at that size/);

  assert.doesNotMatch(page, /### Dimension Validation and Fail-Fast/);
  assert.doesNotMatch(page, /two checkpoints/);
  assert.doesNotMatch(page, /every write to Qdrant/);
  assert.doesNotMatch(page, /\*\*At init:\*\*/);
  assert.doesNotMatch(page, /\*\*At write:\*\*/);
  assert.doesNotMatch(page, /A mismatch aborts startup/);
  assert.doesNotMatch(page, /Mismatches raise `ValueError`/);
});

test('strict mode raises VectorDimensionMismatchError but the startup path swallows it', async () => {
  const validation = validationSection(await readPage());

  assert.match(validation, /`VECTOR_SIZE_AUTODETECT=false`/);
  assert.match(validation, /raise `VectorDimensionMismatchError` \(a `RuntimeError`, not a `ValueError`\)/);
  assert.match(validation, /`ensure_qdrant_collection\(\)`/);
  assert.match(validation, /generic exception handler/);
  assert.match(validation, /sets the Qdrant client to `None`/);
  assert.match(validation, /startup continues without a Qdrant client instead of exiting/);
  assert.doesNotMatch(validation, /fails startup with `VectorDimensionMismatchError`/);
});

test('validate_vector_dimensions is documented as an uncalled legacy wrapper', async () => {
  const page = await readPage();
  const validation = validationSection(page);

  assert.match(validation, /`validate_vector_dimensions\(\)` is a \[legacy wrapper\]/);
  assert.match(validation, /`app\.py` imports it but nothing calls it\./);
  assert.doesNotMatch(validation, /no dimension check runs/);
  assert.doesNotMatch(validation, /nothing calls it, so/);
  assert.doesNotMatch(page, /re-checks every embedding/);
});

test('per-write length checks are documented in the embedding helpers, not at upsert', async () => {
  const page = await readPage();
  const validation = validationSection(page);

  assert.match(validation, /Length checks happen where vectors are produced, not at the Qdrant call/);
  assert.match(validation, /`generate_real_embeddings_batch\(\)`/);
  assert.match(validation, /compares every vector with the effective dimension/);
  assert.match(validation, /retries a failed or mismatched batch item by item/);
  assert.match(validation, /replaces items that still fail with placeholder vectors/);
  assert.match(validation, /raises when called with `allow_placeholder_fallback=False`/);
  assert.match(validation, /`embedding` with the wrong length is rejected with a 400 by \[`coerce_embedding\(\)`\]/);
  assert.match(validation, /Together these checks prevent Qdrant collection corruption/);
  assert.doesNotMatch(validation, /^- Prevents Qdrant collection corruption/m);
  assert.match(page, /- Validates dimension consistency before storage/);
});

test('only Voyage has a hard init-time dimension check, fatal only when selected explicitly', async () => {
  const validation = validationSection(await readPage());

  assert.match(validation, /Voyage is the only provider with a hard dimension check at init/);
  assert.match(validation, /256, 512, 1024, or 2048/);
  assert.match(
    validation,
    /With `EMBEDDING_PROVIDER=voyage`, any other dimension[^\n]*raises a `RuntimeError` and startup fails/,
  );
  assert.match(
    validation,
    /In `auto` mode the same failure is logged as a warning and selection moves on to the next provider/,
  );
  assert.doesNotMatch(validation, /raises a fatal `RuntimeError` at provider init/);
});

test('dimension validation source links use pinned AutoMem revisions with line anchors', async () => {
  const page = await readPage();
  const validation = validationSection(page);
  const links = [
    ...validation.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/(automem\/[^)#\s]+)#L\d+-L\d+/g,
    ),
  ];
  const paths = links.map(([, , path]) => path);

  assert.ok(links.length >= 6, 'expected anchored source links in the validation section');
  for (const path of [
    'automem/utils/validation.py',
    'automem/stores/runtime_clients.py',
    'automem/embedding/provider_init.py',
    'automem/embedding/runtime_helpers.py',
  ]) {
    assert.ok(paths.includes(path), `expected an anchored link to ${path}`);
  }
  assert.ok(
    links.every(([, sha]) => isPinnedSha('automem', sha)),
    'validation section links must use a pinned AutoMem revision',
  );

  const noteLink = page.match(
    /\[automem\/utils\/validation\.py\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/automem\/utils\/validation\.py\) — Dimension validation/,
  );
  assert.ok(noteLink, 'expected the validation.py source-file note link');
  assert.ok(isPinnedSha('automem', noteLink[1]), 'validation.py note link must use a pinned revision');
});

test('batch accumulation uses a rolling deadline and tuple batch items', async () => {
  const page = await readPage();
  const accumulation = section(
    page,
    /### Accumulation Logic\n([\s\S]*?)\n### Configuration Parameters/,
    'the Accumulation Logic section',
  );

  assert.match(accumulation, /A queue read times out while a batch is pending/);
  assert.match(accumulation, /rolling `EMBEDDING_BATCH_TIMEOUT_SECONDS` deadline/);
  assert.match(accumulation, /restarts after every flush and every empty-queue timeout/);
  assert.match(accumulation, /not measured from the moment the first item was added/);
  assert.doesNotMatch(page, /Timeout elapsed since first item added/);

  const flow = section(
    page,
    /### End-to-End Flow\n([\s\S]*?)\n### Bulk Embedding Generation/,
    'the End-to-End Flow diagram',
  );
  assert.match(flow, /batch: List\[Tuple\[str, str\]\]/);
  assert.match(flow, /For each \(memory_id, content, embedding\)/);
  assert.doesNotMatch(flow, /List\[Dict\]/);
  assert.doesNotMatch(flow, /For each \(memory_id, embedding\)/);
});

test('configuration reference documents VECTOR_SIZE_AUTODETECT and adopt-by-default sizing', async () => {
  const page = await readPage();
  const core = section(
    page,
    /### Core Embedding Configuration\n([\s\S]*?)\n### Provider-Specific Configuration/,
    'the core configuration table',
  );

  assert.match(
    core,
    /\| `VECTOR_SIZE_AUTODETECT` \| bool \| `true` \| When an existing Qdrant collection's dimension differs from `VECTOR_SIZE`, adopt the collection's dimension and log a warning\./,
  );
  assert.match(core, /Set to `false` for strict matching, which raises `VectorDimensionMismatchError`/);
  assert.match(
    core,
    /\| `VECTOR_SIZE` \| int \| 1024 \| Embedding dimension used to create a new Qdrant collection\. With `VECTOR_SIZE_AUTODETECT=true` \(the default\), an existing collection's dimension takes precedence\./,
  );
  assert.doesNotMatch(core, /Embedding dimension \(must match Qdrant collection\)/);
  assert.match(core, /passes the effective dimension as `dimensions` to OpenAI's own API/);
  assert.doesNotMatch(core, /`dimensions=VECTOR_SIZE`/);

  const validationList = section(
    page,
    /\*\*Configuration validation:\*\*\n([\s\S]*?)\n### Tuning Recommendations/,
    'the configuration validation list',
  );
  assert.match(validationList, /By default a differing collection dimension is adopted/);
  assert.match(validationList, /`VECTOR_SIZE_AUTODETECT=false` a mismatch raises `VectorDimensionMismatchError`/);
  assert.doesNotMatch(validationList, /`VECTOR_SIZE` must match the Qdrant collection dimension/);
});
