import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift fixes for the Testing page. Facts were verified against the release
// sources recorded in scripts/docs-source-pins.json (AutoMem Makefile, tests/ and
// mcp-sse-server/; mcp-automem Vitest configs and tests, same on 0.16.0 and 0.17.0).

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/development/testing.md', import.meta.url),
);

async function readTestingPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + heading.length + 2);
  const end = rest.search(/\n#{1,4} /);
  return end === -1 ? rest : rest.slice(0, end);
}

test('make test is described as unit tests plus the MCP bridge Node tests', async () => {
  const page = await readTestingPage();
  const markers = section(page, '### Pytest Markers');

  assert.match(
    markers,
    /`make test` runs the unit tests \(`pytest -rs -m unit`\), then the MCP bridge's Node tests through `make test-node`\./,
  );
  assert.doesNotMatch(page, /`make test` runs unit tests only/);
});

test('MCP bridge is documented as tested, not manual-only', async () => {
  const page = await readTestingPage();
  const coverage = section(page, '#### Coverage by Component');
  const running = section(page, '### Running Tests');
  const uncovered = section(page, '#### Uncovered Components');
  const future = section(page, '### Future Testing Priorities');

  assert.match(
    coverage,
    /\| MCP Bridge \| `mcp-sse-server\/test\/server\.test\.js`, `mcp-sse-server\/test\/parity\.test\.js` \| Covered/,
  );
  assert.doesNotMatch(page, /Manual testing only/);
  assert.doesNotMatch(page, /deploy to Railway and test with Claude Desktop/);

  assert.match(running, /\*\*MCP bridge:\*\* the bridge's tests use Node's built-in test runner/);
  assert.match(running, /`make test-node`/);
  assert.match(running, /`npm test` inside `mcp-sse-server\/`, which runs `node --test`/);
  assert.match(running, /`make test` runs them after the unit tests/);
  assert.match(running, /`node-test` job runs them on Node 20/);
  assert.match(running, /`parity\.test\.js` skip unless `AUTOMEM_RUN_PARITY_TESTS=1` is set/);
  assert.match(running, /`make test-parity` starts its own Docker stack on port 8011/);

  assert.match(uncovered, /\*\*MCP Bridge\*\*/);
  assert.match(uncovered, /skip the three parity tests in `parity\.test\.js`/);
  assert.match(uncovered, /`\.github\/workflows\/mcp-parity\.yml`/);
  assert.match(uncovered, /`continue-on-error`/);
  assert.doesNotMatch(uncovered, /only checked by/);

  assert.doesNotMatch(future, /\*\*MCP bridge tests\*\*/);
});

test('Vitest unit tests stub the global fetch and live in src and tests, not tests/unit', async () => {
  const page = await readTestingPage();
  const organization = section(page, '### Test Organization');
  const mocks = section(page, '### Mock Strategy');

  assert.ok(!page.includes('node-fetch'), 'the Vitest suites do not mock node-fetch');
  assert.ok(!page.includes('tests/unit'), 'mcp-automem has no tests/unit directory');

  assert.match(organization, /`src\/\*\*\/\*\.test\.ts` and `tests\/\*\*\/\*\.test\.ts`/);
  assert.match(organization, /stub the global `fetch` for HTTP requests/);

  assert.match(mocks, /`AutoMemClient` calls the global `fetch`, so stub it/);
  assert.match(mocks, /vi\.stubGlobal\('fetch', mockFetch\)/);
  assert.match(mocks, /mockFetch\.mockResolvedValueOnce\(/);
});

test('Vitest integration tests name the one service-backed file and the real env var', async () => {
  const page = await readTestingPage();
  const organization = section(page, '### Test Organization');
  const requirements = section(page, '### Integration Test Requirements');

  assert.match(organization, /`tests\/integration\/automem-service\.test\.ts` — requires a running AutoMem service/);
  assert.match(organization, /`vitest\.config\.ts` excludes this file from the unit run/);
  assert.match(organization, /`vitest\.integration\.config\.ts` runs only this file/);
  assert.match(organization, /`mcp-tools\.test\.ts`, needs no service and runs with the unit tests/);

  assert.match(requirements, /^AUTOMEM_TEST_API_URL=http:\/\/localhost:8001$/m);
  assert.match(requirements, /`AUTOMEM_TEST_ENDPOINT` is the deprecated alias/);
  assert.match(requirements, /sends no API key/);
  assert.doesNotMatch(requirements, /AUTOMEM_API_URL=/);
  assert.doesNotMatch(requirements, /AUTOMEM_API_KEY/);
});

test('scope prose no longer says only consolidation is tested', async () => {
  const page = await readTestingPage();
  const scope = section(page, '### Purpose and Scope');

  assert.match(scope, /unit tests covering the Flask API, the consolidation engine, enrichment, and embedding providers/);
  assert.match(scope, /The API endpoints have the largest share of tests/);
  assert.match(scope, /route and error contracts in `tests\/contracts\/`/);
  assert.match(scope, /`ConsolidationScheduler` has none/);

  assert.doesNotMatch(page, /Currently, the test suite focuses on consolidation logic/);
  assert.doesNotMatch(page, /validated through manual testing and production monitoring/);
  assert.doesNotMatch(page, /emphasis on the consolidation engine/);

  const future = section(page, '### Future Testing Priorities');
  assert.doesNotMatch(future, /\*\*API endpoint tests\*\*/);
  assert.match(future, /1\. \*\*Background worker tests\*\* — Test enrichment and embedding workers/);
});

test('test tree lists the lab directory and the main files it used to omit', async () => {
  const page = await readTestingPage();
  const tree = section(page, '### Test Suite Organization');

  for (const entry of [
    'test_backup_endpoint.py',
    'test_enrichment_circuit.py',
    'test_entity_identities.py',
    'test_stream_events.py',
    '├── lab/',
    '├── contracts/',
    '├── support/',
    '└── benchmarks/',
  ]) {
    assert.ok(tree.includes(entry), `expected the tree to list ${entry}`);
  }
  assert.match(tree, /The tree shows the main files, not every module\./);
});
