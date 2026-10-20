import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift fixes for the root overview, the memory model, and the enrichment
// architecture page. Each block pins one corrected fact and checks that the
// old wrong phrase is gone. Facts were verified against the AutoMem release
// source recorded in scripts/docs-source-pins.json.

const docsRoot = new URL('../src/content/docs/docs/', import.meta.url);

async function readDoc(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, docsRoot)), 'utf8');
}

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.notEqual(start, -1, `expected "${startMarker}"`);
  const rest = text.slice(start + startMarker.length);
  const end = rest.indexOf(endMarker);
  assert.notEqual(end, -1, `expected "${endMarker}" after "${startMarker}"`);
  return rest.slice(0, end);
}

test('overview: the embedding worker does not retry a failed batch and the 40-50% claim is gone', async () => {
  const page = await readDoc('overview.md');
  const workers = between(page, '**Worker responsibilities:**', '\n---');
  const bullet = workers.split('\n').find((line) => line.startsWith('- **EmbeddingWorker**'));

  assert.ok(bullet, 'expected the EmbeddingWorker bullet');
  assert.match(bullet, /Batches requests \(20 items, 2-second timeout\)/u);
  assert.match(bullet, /A failed batch is not re-queued/u);
  assert.match(bullet, /falls back to per-item calls/u);
  assert.match(bullet, /placeholder vector/u);
  assert.doesNotMatch(bullet, /retries on failure/u);
  assert.doesNotMatch(bullet, /max 3 attempts/u);
  assert.doesNotMatch(bullet, /40-50%/u);
  assert.doesNotMatch(page, /reduce API costs by 40-50%/u);
});

test('overview: the consolidation scheduler lists five tasks including the disabled-by-default identity task', async () => {
  const page = await readDoc('overview.md');
  const bullet = page.split('\n').find((line) => line.startsWith('- **ConsolidationScheduler**'));

  assert.ok(bullet, 'expected the ConsolidationScheduler bullet');
  assert.match(bullet, /Runs five scheduled tasks/u);
  assert.match(bullet, /Decay, Creative, Cluster, Forget, and Identity/u);
  assert.match(bullet, /interval defaults to 0, disabled, unless `IDENTITY_SYNTHESIS_ENABLED=true`/u);
  assert.match(bullet, /Forget's interval defaults to 0, disabled/u);
  assert.doesNotMatch(bullet, /four cycles/u);
  assert.doesNotMatch(page, /Runs four cycles/u);
});

test('overview: only auto provider mode falls through to the next provider', async () => {
  const page = await readDoc('overview.md');
  const providers = between(page, '## Embedding Provider Abstraction\n', '### Provider Selection Logic');

  assert.match(providers, /Only `EMBEDDING_PROVIDER=auto` \(the default\) falls through to the next provider/u);
  assert.match(providers, /an explicitly named provider raises if it cannot initialize/u);
  assert.match(providers, /does not trigger a switch/u);
  assert.doesNotMatch(page, /automatic failover/u);
  assert.doesNotMatch(providers, /based on availability/u);
});

test('overview: PATCH /memory/:id is not drawn as feeding either queue', async () => {
  const page = await readDoc('overview.md');
  const diagram = between(page, '### Worker Coordination Diagram\n\n```mermaid\n', '\n```');

  assert.doesNotMatch(diagram, /PatchMem/u);
  assert.doesNotMatch(diagram, /PATCH \/memory/u);
  assert.match(diagram, /PostMem --> EnrichQueue/u);
});

test('memory model: temporal links use PRECEDED_BY', async () => {
  const page = await readDoc('core-concepts/memory-model.md');
  const enriching = between(page, '3. **Enriching**:', '4. **Active**:');

  assert.match(enriching, /Temporal links created \(`PRECEDED_BY`\)/u);
  assert.doesNotMatch(enriching, /OCCURRED_BEFORE/u);
});

test('memory model: PATCH does not queue re-enrichment in the lifecycle', async () => {
  const page = await readDoc('core-concepts/memory-model.md');
  const lifecycle = between(page, '## Memory Lifecycle', '## Implementation Details');
  const active = between(lifecycle, '4. **Active**:', '5. **Decaying**:');

  assert.match(lifecycle, /Active --> Active: PATCH \/memory\/:id<br\/>No enrichment job queued/u);
  assert.doesNotMatch(lifecycle, /ReEnrichment/u);
  assert.doesNotMatch(lifecycle, /Active --> Updated/u);
  assert.doesNotMatch(lifecycle, /Content changed/u);
  assert.match(active, /`PATCH \/memory\/:id` saves the edit without queuing enrichment/u);
  assert.match(active, /`POST \/enrichment\/reprocess` re-runs it/u);
});

test('memory model: FalkorDB has no created indexes and Qdrant indexes tags, tag_prefixes, and type', async () => {
  const page = await readDoc('core-concepts/memory-model.md');
  const falkor = between(page, '### FalkorDB (Graph Database)', '### Qdrant (Vector Database)');
  const qdrant = between(page, '### Qdrant (Vector Database)', '**Dual Storage Strategy:**');

  assert.match(falkor, /AutoMem does not create FalkorDB indexes on `Memory` properties/u);
  assert.doesNotMatch(falkor, /Indexes on `tags`, `tag_prefixes`, `timestamp`, `importance`/u);

  assert.match(
    qdrant,
    /Keyword payload indexes on `tags`, `tag_prefixes`, and `type` for fast filtering, created at startup unless `QDRANT_ENSURE_PAYLOAD_INDEXES` is `false`/u,
  );
  assert.doesNotMatch(qdrant, /Keyword indexes on `tags` and `tag_prefixes` for fast filtering/u);
});

test('memory model: the Qdrant recovery script restores nodes only and archived memories cannot be restored', async () => {
  const page = await readDoc('core-concepts/memory-model.md');
  const stores = between(page, '**Dual Storage Strategy:**', ':::note');
  const archived = between(page, '6. **Archived**:', '7. **Deleted**:');

  assert.match(
    stores,
    /`scripts\/recover_from_qdrant\.py` re-creates `Memory` nodes from the Qdrant payloads\. It clears the graph first and does not restore relationships/u,
  );
  assert.doesNotMatch(stores, /Qdrant can rebuild FalkorDB if graph data is lost/u);

  assert.match(archived, /the API has no route to restore an archived memory/u);
  assert.doesNotMatch(archived, /Can be restored or deleted/u);
});

test('memory model: the classification cost tip names the default model', async () => {
  const page = await readDoc('core-concepts/memory-model.md');
  const tip = between(page, ':::tip\nCost is approximately', '\n:::');

  assert.match(tip, /requiring LLM classification with the default `gpt-4o-mini`/u);
  assert.match(tip, /Other `CLASSIFICATION_MODEL` values are priced differently/u);
});

test('enrichment: the job creation table lists batch creation, not PATCH', async () => {
  const page = await readDoc('architecture/enrichment.md');
  const creation = between(page, '### Job Creation', '### Retry Logic');

  assert.match(creation, /\| Batch creation \| `POST \/memory\/batch` \| Automatic enqueue for each stored memory \|/u);
  assert.doesNotMatch(creation, /\| Memory update \|/u);
  assert.doesNotMatch(creation, /Re-enqueue if content\/tags changed/u);
  assert.match(creation, /`PATCH \/memory\/:id` does not enqueue enrichment/u);
  assert.match(creation, /Run `POST \/enrichment\/reprocess` to re-enrich it/u);
});

test('enrichment: a missing memory is a skipped success, not a recorded failure', async () => {
  const page = await readDoc('architecture/enrichment.md');
  const failures = between(page, '### Failure Scenarios', '### Retry Mechanics');
  const row = failures.split('\n').find((line) => line.startsWith('| Memory ID not found |'));

  assert.ok(row, 'expected the missing-memory failure scenario row');
  assert.match(row, /`enrich_memory` returns `False`/u);
  assert.match(row, /records a skipped success, not a failure/u);
  assert.match(row, /\| No retry \|$/u);
  assert.doesNotMatch(failures, /Invalid memory ID/u);
  assert.doesNotMatch(failures, /Log error, record failure/u);
});
