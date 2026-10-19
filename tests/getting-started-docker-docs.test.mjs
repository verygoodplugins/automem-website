import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/getting-started/docker.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading, terminator) {
  const start = page.indexOf(heading);
  assert.notEqual(start, -1, `expected a "${heading.trim()}" section`);
  const body = page.slice(start + heading.length);
  const end = body.search(terminator);
  return end === -1 ? body : body.slice(0, end);
}

function tableRow(text, firstCell) {
  const row = text.split('\n').find((line) => line.startsWith(`| ${firstCell} |`));
  assert.ok(row, `expected a table row starting with ${firstCell}`);
  return row;
}

async function diagram() {
  const page = await readPage();
  return section(page, '```mermaid\n', /\n```/);
}

async function serviceDetails() {
  const page = await readPage();
  return section(page, '### Service Details\n', /\n### /);
}

async function optionalVariables() {
  const page = await readPage();
  return section(page, 'Optional variables with defaults:\n', /\nEnvironment variable resolution order/);
}

async function dependencies() {
  const page = await readPage();
  return section(page, '### Service Dependencies and Health Checks\n', /\n### /);
}

async function portMappings() {
  const page = await readPage();
  return section(page, '### Port Mappings\n', /\n### /);
}

test('Compose diagram uses the real service name and FalkorDB mount path', async () => {
  const graph = await diagram();

  assert.ok(graph.includes('API["flask-api<br/>app.py<br/>localhost:8001"]'));
  assert.ok(graph.includes('FalkorVol["falkordb_data<br/>/data"]'));
  assert.doesNotMatch(graph, /memory-service/);
  assert.doesNotMatch(graph, /\/var\/lib\/falkordb/);
});

test('volume table and page agree that FalkorDB data lives at /data', async () => {
  const page = await readPage();

  assert.doesNotMatch(page, /\/var\/lib\/falkordb/);
  assert.match(page, /\| `falkordb_data` \| `\/data` \|/);
});

test('service details publish both Qdrant ports and describe the password-aware health check', async () => {
  const details = await serviceDetails();

  assert.match(tableRow(details, '`qdrant`'), /\| 6333 \(REST\), 6334 \(gRPC\) \|/);
  assert.match(tableRow(details, '`falkordb`'), /Password-aware `redis-cli ping` every 10s/);
});

test('dependency list matches the password-aware FalkorDB health check', async () => {
  const deps = await dependencies();

  assert.match(deps, /password-aware `redis-cli ping` every 10s, 5 retries/);
  assert.match(deps, /`condition: service_healthy`/);
  assert.match(deps, /`condition: service_started`/);
});

test('port mappings list the Qdrant gRPC port and every host-port override', async () => {
  const ports = await portMappings();

  assert.match(ports, /\| Container Port \| Default Host Port \|/);
  assert.match(tableRow(ports, '6334'), /\| 6334 \| 6334 \| qdrant \| gRPC \|/);

  for (const name of [
    'AUTOMEM_API_HOST_PORT',
    'FALKORDB_HOST_PORT',
    'FALKORDB_BROWSER_HOST_PORT',
    'QDRANT_HOST_PORT',
    'QDRANT_GRPC_HOST_PORT',
  ]) {
    assert.ok(ports.includes(`\`${name}\``), `expected the ${name} override to be documented`);
  }
  assert.match(ports, /Only the host side changes/);
  assert.doesNotMatch(ports, /\| Container Port \| Host Port \|/);
});

test('embedding provider row lists ollama and the full value set', async () => {
  const vars = await optionalVariables();
  const row = tableRow(vars, '`EMBEDDING_PROVIDER`');

  assert.ok(row.includes('`auto\\|voyage\\|openai\\|ollama\\|local\\|placeholder`'));
  assert.ok(!row.includes('`auto\\|openai\\|voyage\\|local\\|placeholder`'));
});

test('optional variables include VOYAGE_API_KEY and VECTOR_SIZE with their Compose defaults', async () => {
  const vars = await optionalVariables();

  assert.match(tableRow(vars, '`VOYAGE_API_KEY`'), /\| `\$\{VOYAGE_API_KEY:-\}` \|/);
  assert.match(tableRow(vars, '`VECTOR_SIZE`'), /\| `\$\{VECTOR_SIZE:-1024\}` \|/);
  assert.match(tableRow(vars, '`VECTOR_SIZE`'), /`vector_dimensions\.configured`/);
});
