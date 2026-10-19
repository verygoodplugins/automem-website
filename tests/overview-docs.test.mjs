import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/overview.md', import.meta.url),
);

async function readOverviewPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const match = page.match(new RegExp(`\\n## ${heading}\\n([\\s\\S]*?)\\n---`));
  assert.ok(match, `expected a "${heading}" section`);
  return match[1];
}

test('overview names the real health monitor class and methods', async () => {
  const page = await readOverviewPage();
  const components = section(page, 'Core Components');
  const row = components.match(/^\| \*\*Health Monitor\*\* \|.*$/m);

  assert.ok(row, 'expected a Health Monitor row in the component table');
  assert.match(row[0], /`scripts\/health_monitor\.py`/);
  assert.match(row[0], /`HealthMonitor`/);
  assert.match(row[0], /`check_consistency`/);
  assert.match(row[0], /`send_alert`/);
  assert.match(row[0], /`trigger_recovery`/);
  assert.match(row[0], /optional auto-recovery/i);
  assert.doesNotMatch(page, /check_drift|repair_drift/);
});

test('overview scopes the 5% drift threshold to the health monitor, not the sync worker', async () => {
  const page = await readOverviewPage();
  const workers = section(page, 'Background Processing Architecture');
  const bullet = workers.match(/^- \*\*SyncWorker\*\*:.*$/m);

  assert.ok(bullet, 'expected a SyncWorker responsibility bullet');
  assert.match(bullet[0], /`SYNC_CHECK_INTERVAL_SECONDS`/);
  assert.match(bullet[0], /compares memory IDs in FalkorDB and Qdrant/i);
  assert.match(bullet[0], /queues memories missing from Qdrant for embedding when they still have content/i);
  assert.match(bullet[0], /`RECALL_EXCLUDED_TYPES`/);
  assert.doesNotMatch(bullet[0], /every FalkorDB memory/i);
  assert.match(bullet[0], /5% drift threshold belongs to the separate health monitor/i);
  assert.doesNotMatch(bullet[0], /auto-repairs when divergence exceeds 5%/i);
  assert.doesNotMatch(page, /divergence exceeds 5%/i);
});

test('overview provider selection starts at init_embedding_provider and includes ollama', async () => {
  const page = await readOverviewPage();
  const providers = section(page, 'Embedding Provider Abstraction');
  const diagram = providers.match(/```mermaid\n([\s\S]*?)\n```/);

  assert.ok(diagram, 'expected the provider selection diagram');
  assert.match(diagram[1], /Start\["Provider Initialization<br\/>init_embedding_provider\(\)/);
  assert.match(diagram[1], /automem\/embedding\/provider_init\.py/);
  assert.doesNotMatch(page, /_generate_real_embedding/);
  assert.match(diagram[1], /Voyage --> Result\["Provider set on<br\/>state\.embedding_provider"\]/);
  assert.doesNotMatch(diagram[1], /Return embedding/);

  assert.match(
    diagram[1],
    /EMBEDDING_PROVIDER<br\/>auto\/voyage\/openai\/local\/ollama\/placeholder/,
  );
  assert.match(diagram[1], /ForceOllama\["EMBEDDING_PROVIDER=ollama"\]/);
  assert.match(diagram[1], /EnvProvider -->\|"ollama"\| ForceOllama/);
  assert.match(diagram[1], /ForceOllama --> Ollama\b/);
  assert.match(diagram[1], /CheckOllama\{"OLLAMA_BASE_URL or<br\/>OLLAMA_MODEL set\?"\}/);
});

test('overview lists ollama as an EMBEDDING_PROVIDER value and a provider class', async () => {
  const page = await readOverviewPage();
  const envRow = page.match(/^\| `EMBEDDING_PROVIDER` \|.*$/m);
  const providerRow = page.match(/^\| \*\*Embedding Providers\*\* \|.*$/m);

  assert.ok(envRow, 'expected an EMBEDDING_PROVIDER row in the environment variable table');
  assert.match(
    envRow[0],
    /`auto`, `voyage`, `openai`, `local`, `ollama`, `placeholder`/,
  );

  assert.ok(providerRow, 'expected an Embedding Providers row in the component table');
  assert.match(providerRow[0], /`OllamaEmbeddingProvider`/);
});
