import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Cross-page follow-up to the docs drift pass. Each block carries a fact that an
// earlier page-group PR corrected onto the other pages that repeated it. Facts
// were verified against the pinned AutoMem and mcp-automem releases recorded in
// scripts/docs-source-pins.json.

const docsRoot = new URL('../src/content/docs/docs/', import.meta.url);

async function readDoc(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, docsRoot)), 'utf8');
}

test('background-processing diagrams do not route PATCH /memory/:id into the queues', async () => {
  const page = await readDoc('architecture/background-processing.md');

  assert.doesNotMatch(page, /PatchMem(?:ory)?\b/u);
  assert.match(page, /PostMem --> EnrichQueue/u);
  assert.match(page, /PostMemory -->\|"queue\.put\(memory_id\)"\| EnrichQ/u);
});

test('consolidation reference separates cluster reporting from MetaPattern creation', async () => {
  const page = await readDoc('core-concepts/consolidation.md');

  assert.doesNotMatch(page, /Minimum memories per cluster to create MetaMemory/u);
  assert.match(
    page,
    /\| `min_cluster_size` \| 3 \| Minimum memories for a group to be reported as a cluster \(`CONSOLIDATION_MIN_CLUSTER_SIZE`\); a MetaPattern summary is created only for clusters of 5 or more \|/u,
  );
});

test('backup page says Qdrant recovery restores Memory nodes without relationships', async () => {
  const page = await readDoc('operations/backup.md');

  assert.doesNotMatch(page, /rebuild the entire FalkorDB graph structure/u);
  assert.doesNotMatch(page, /Parse `metadata\.relationships` array/u);
  assert.doesNotMatch(page, /If relationships were stored only in FalkorDB/u);
  assert.match(page, /Clears the FalkorDB graph and re-creates `Memory` nodes from Qdrant's vector payloads\. Relationships are not restored\./u);
  assert.match(page, /The script re-creates `Memory` nodes only, so relationship edges are not recovered/u);
});

test('progressive-disclosure HTTP table shows service response bodies', async () => {
  const page = await readDoc('best-practices/progressive-disclosure.md');

  assert.doesNotMatch(page, /\| `\{memory_id, message\}` \|/u);
  assert.doesNotMatch(page, /\| `\{success, message\}` \|/u);
  assert.match(page, /\| `\{status, memory_id, stored_at, type, confidence, qdrant, \.\.\.\}` \| `storeMemory\(\)` \|/u);
  assert.match(page, /\| `\{status, message, relation_type, strength, \.\.\.\}` \| `associateMemories\(\)` \|/u);
  assert.match(page, /\| `\{status, memory_id\}` \| `updateMemory\(\)` \|/u);
  assert.match(page, /\| `\{status, memory_id\}` \| `deleteMemory\(\)` \|/u);
});

test('development structure page matches make test and the CLI flags', async () => {
  const page = await readDoc('development/structure.md');

  assert.match(page, /runs with `make test`, which then runs the MCP bridge's Node tests through `make test-node`/u);
  assert.doesNotMatch(page, /--verbose/u);
});

test('authentication flow diagram shows the API-token exemptions', async () => {
  const page = await readDoc('reference/authentication.md');

  assert.match(page, /RequireAPIToken -->\|"OPTIONS, \/viewer\*, \/health,<br\/>or AUTOMEM_API_TOKEN unset"\| ProcessRequest/u);
  assert.match(page, /RequireAPIToken -->\|"\/backup skips the API token"\| ValidateAdmin/u);
});

test('overview keeps the CHANGELOG-sourced batching figure', async () => {
  const page = await readDoc('overview.md');

  // AutoMem's CHANGELOG (v0.6.0, "Embedding Batching (40-50% Cost Reduction)") is the source.
  assert.match(page, /- \*\*EmbeddingWorker\*\*: Batches requests \(20 items, 2-second timeout\) to reduce API costs by 40-50%\. A failed batch is not re-queued/u);
});

test('enrichment temporal links describe the fixed 7-day, 5-memory window', async () => {
  const page = await readDoc('architecture/enrichment.md');

  assert.doesNotMatch(page, /within the configured time window/u);
  assert.match(page, /Connects a memory to up to 5 earlier memories from the last 7 days\./u);
  assert.match(page, /within the last 7 days \(a fixed cutoff, not configurable\), newest first, up to 5/u);
});

test('testing guide gates integration tests and describes the live marker', async () => {
  const page = await readDoc('development/testing.md');

  assert.match(page, /\| `integration` \| `AUTOMEM_RUN_INTEGRATION_TESTS=1 pytest -rs -m integration tests\/` \|/u);
  assert.match(page, /\| `live` \| `pytest -m live tests\/` \| Benchmark setup \| Benchmark suites under `tests\/benchmarks\/`, which are marked `live` automatically \|/u);
  assert.doesNotMatch(page, /Production smoke tests/u);
  assert.match(page, /without that variable the integration tests skip/u);
  assert.match(page, /`AUTOMEM_ALLOW_LIVE=1` is a separate switch that lets the integration tests run against a non-local `AUTOMEM_TEST_BASE_URL`/u);
});
