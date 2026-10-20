import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift pass for the configuration reference, the architecture scoring table and
// the local setup guide. Facts were verified against the AutoMem release recorded
// in scripts/docs-source-pins.json: automem/config.py (token and JIT settings),
// automem/utils/scoring.py (exact and tag terms), automem/api/recall.py (JIT
// enrichment hook) and automem/runtime_wiring.py (server bind address).

const docsRoot = new URL('../src/content/docs/docs/', import.meta.url);

async function readDoc(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, docsRoot)), 'utf8');
}

function tableRow(page, variable) {
  const row = page.split('\n').find((line) => line.startsWith(`| \`${variable}\``));
  assert.ok(row, `row for ${variable} must exist`);
  return row;
}

test('configuration authentication table lists only the variables AutoMem reads', async () => {
  const page = await readDoc('reference/configuration.md');
  const section = page.match(/### Authentication\n([\s\S]*?)\n### /u);
  assert.ok(section, 'Authentication section must exist');

  assert.match(section[1], /^\| `AUTOMEM_API_TOKEN` \|/mu);
  assert.match(section[1], /^\| `ADMIN_API_TOKEN` \|/mu);
  assert.doesNotMatch(page, /^\| `API_TOKEN` \|/mu);
  assert.doesNotMatch(page, /^\| `ADMIN_TOKEN` \|/mu);
  assert.doesNotMatch(page, /Fallback alias for `(?:AUTOMEM_API_TOKEN|ADMIN_API_TOKEN)`/u);
});

test('SEARCH_WEIGHT_EXACT describes a whole-query metadata match', async () => {
  for (const path of ['reference/configuration.md', 'getting-started/environment-variables.md']) {
    const page = await readDoc(path);
    const row = tableRow(page, 'SEARCH_WEIGHT_EXACT');

    assert.match(row, /Whole-query exact match against metadata terms/u, path);
    assert.doesNotMatch(row, /Content token overlap/u, path);
  }
});

test('architecture scoring table describes the tag term as query-token hits', async () => {
  const page = await readDoc('architecture/overview.md');
  const row = page.split('\n').find((line) => line.startsWith('| Tag matching |'));
  assert.ok(row, 'Tag matching row must exist');

  assert.match(row, /Query-token hits against tag and metadata terms/u);
  assert.match(row, /`SEARCH_WEIGHT_TAG`/u);
  assert.doesNotMatch(page, /Prefix\/exact tag filters/u);
});

test('configuration places JIT enrichment on recall, not on store', async () => {
  const page = await readDoc('reference/configuration.md');
  const row = tableRow(page, 'JIT_ENRICHMENT_ENABLED');

  assert.match(row, /inline during recall/u);
  assert.match(row, /not yet enriched/u);
  assert.doesNotMatch(row, /inline on store/u);
});

test('local setup says Flask binds to the IPv6 dual-stack address', async () => {
  const page = await readDoc('development/local-setup.md');

  assert.match(
    page,
    /The Flask application binds to `::` \(IPv6 dual-stack\) on port `8001` by default\./u,
  );
  assert.match(page, /Flask->>Flask: "Bind to \[::\]:8001"/u);
  assert.doesNotMatch(page, /binds to `0\.0\.0\.0:8001`/u);
  assert.doesNotMatch(page, /Bind to 0\.0\.0\.0:8001/u);
});

test('IPv4-only startup log excerpts stay framed as old-version output', async () => {
  const troubleshooting = await readDoc('operations/troubleshooting.md');
  const railway = await readDoc('deployment/railway.md');

  assert.match(troubleshooting, /# Bad output \(old versions\):\n\* Running on http:\/\/0\.0\.0\.0:8001/u);
  assert.match(railway, /\(old versions only\)[^\n]*\n```\n\* Running on http:\/\/0\.0\.0\.0:8001/u);
  assert.match(troubleshooting, /\* Running on http:\/\/\[::\]:8001/u);
  assert.match(railway, /\* Running on http:\/\/\[::\]:8001/u);
});
