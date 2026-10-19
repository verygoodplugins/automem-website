import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/deployment/railway.md', import.meta.url),
);

async function readRailwayPage() {
  return readFile(pagePath, 'utf8');
}

async function readHealthCheckSequence() {
  const page = await readRailwayPage();
  const section = page.match(/### Health Check Sequence\n([\s\S]*?)\n### IPv6 Dual-Stack Binding/);

  assert.ok(section, 'expected a Health Check Sequence section before the IPv6 section');
  return section[1];
}

test('Railway architecture diagram labels the memory-service runtime as plain Flask', async () => {
  const page = await readRailwayPage();

  assert.match(page, /FlaskApp\["python app\.py<br\/>Flask<br\/>PORT=8001"\]/);
  assert.doesNotMatch(page, /gunicorn/i);
});

test('Railway health check diagram reports failed backends as disconnected and degraded', async () => {
  const sequence = await readHealthCheckSequence();

  assert.match(sequence, /Set falkordb: connected/);
  assert.match(sequence, /Set falkordb: disconnected<br\/>status: degraded/);
  assert.match(sequence, /Set qdrant: connected/);
  assert.match(sequence, /Set qdrant: disconnected<br\/>status: degraded \(continue anyway\)/);
  assert.doesNotMatch(sequence, /Set (?:falkordb|qdrant): unavailable/);
});

test('Railway health check diagram ends in 200 OK without a 503 branch', async () => {
  const page = await readRailwayPage();
  const sequence = await readHealthCheckSequence();

  assert.doesNotMatch(sequence, /503|Service Unavailable/);
  assert.doesNotMatch(page, /503/);
  assert.match(sequence, /API-->>Client: 200 OK<br\/>\{status, falkordb, qdrant,<br\/>memory_count, enrichment\}/);
  // A FalkorDB failure no longer ends the request early, so the diagram must not
  // imply that the FalkorDB memory count still runs when the graph is unavailable.
  assert.match(
    sequence,
    /opt FalkorDB connected\n\s+API->>Falkor: Count memories[^\n]*\n\s+Falkor-->>API: count\n\s+end/,
  );
});

test('Railway health check diagram keeps its alt and opt blocks balanced', async () => {
  const sequence = await readHealthCheckSequence();
  const openers = sequence.match(/^\s*(?:alt|opt)\b/gm) ?? [];
  const closers = sequence.match(/^\s*end\s*$/gm) ?? [];

  assert.equal(openers.length, 3);
  assert.equal(closers.length, openers.length);
});
