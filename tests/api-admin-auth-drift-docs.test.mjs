import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pins } from './helpers/source-pins.mjs';

// Drift fixes for the admin API and authentication pages, verified against the
// AutoMem release recorded in scripts/docs-source-pins.json.

const docsRoot = new URL('../src/content/docs/docs/reference/', import.meta.url);

async function readDoc(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, docsRoot)), 'utf8');
}

function sectionBetween(page, startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find ${startMarker}`);
  const end = page.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `expected to find ${endMarker} after ${startMarker}`);
  return page.slice(start, end);
}

test('admin reembed describes force as dropping only the null-content filter', async () => {
  const page = await readDoc('api/admin.md');
  const request = sectionBetween(page, '## POST /admin/reembed', '### Example Request');
  const forceRow = request.split('\n').find((line) => line.startsWith('| `force` |'));

  assert.ok(forceRow, 'expected a force row in the reembed request schema');
  assert.match(forceRow, /Omits the `WHERE m\.content IS NOT NULL` filter/);
  assert.match(forceRow, /never checks Qdrant for existing vectors, so every selected memory is re-embedded with or without `force`/);
  assert.match(forceRow, /Rows with null or empty content are still skipped/);
  assert.match(forceRow, /rows with null content count toward `limit`/);
  assert.match(forceRow, /Default: `false`/);
  assert.doesNotMatch(page, /Re-embed memories even if embeddings already exist/);
});

test('admin reembed diagram increments processed by the upserted points, not the batch size', async () => {
  const page = await readDoc('api/admin.md');
  const diagram = sectionBetween(page, '### Processing Architecture', '### Response Schema');

  assert.match(diagram, /IncrCount\["processed \+= len\(points\)/);
  assert.match(diagram, /a failed batch adds to failed instead/);
  assert.doesNotMatch(page, /processed_count/);
  assert.doesNotMatch(page, /\+= batch_size/);
});

test('admin enrichment status documents the circuit object and its cooldown setting', async () => {
  const page = await readDoc('api/admin.md');
  const status = sectionBetween(page, '## GET /enrichment/status', '### Example Usage');

  assert.match(status, /"classification": \{\},\n {2}"circuit": \{\n {4}"open": false,\n {4}"circuit_open_skips": 0,\n {4}"recoveries": 0\n {2}\}/);
  const circuitRow = status.split('\n').find((line) => line.startsWith('| `circuit` |'));
  assert.ok(circuitRow, 'expected a circuit row in the status field table');
  assert.match(circuitRow, /`open` \(`true` while the cooldown is running\)/);
  assert.match(circuitRow, /`circuit_open_skips`/);
  assert.match(circuitRow, /`recoveries`/);
  assert.match(status, /`ENRICHMENT_CIRCUIT_COOLDOWN_SECONDS` \(default `300`\)/);
  assert.match(status, /one recovery probe call is allowed/);
});

test('admin source notes split the app.py link into exemptions and the error handler', async () => {
  const page = await readDoc('api/admin.md');
  // Any recorded AutoMem release (not a legacy pin), so a newer release does not break this test.
  const releaseShas = pins['verygoodplugins/automem'].releases.map(({ sha }) => sha);
  const base = `https://github\\.com/verygoodplugins/automem/blob/(?:${releaseShas.join('|')})`;

  assert.match(
    page,
    new RegExp(`\\[app\\.py\\]\\(${base}/app\\.py#L273-L289\\) — API-token exemptions\\n`),
    'expected the exemptions link to cover only the API-token guard',
  );
  assert.match(
    page,
    new RegExp(`\\[app\\.py\\]\\(${base}/app\\.py#L480-L489\\) — HTTP error responses\\n`),
    'expected a separate link for the error handler',
  );
  assert.match(
    page,
    new RegExp(`\\[automem/api/entity\\.py\\]\\(${base}/automem/api/entity\\.py#L316-L456\\)`),
    'expected a source link for the entity audit and merge endpoints',
  );
  assert.doesNotMatch(page, /API-token exemptions and HTTP error responses/);
});

test('admin sync documents the complete response and points to the 503 table', async () => {
  const page = await readDoc('api/admin.md');
  const sync = page.match(/## POST \/admin\/sync\n([\s\S]*?)\n---/);

  assert.ok(sync, 'expected a sync section');
  assert.match(
    sync[1],
    /`\{"status": "complete", "falkordb_count", "qdrant_count", "synced", "failed", "orphaned_count"\}`/,
  );
  assert.match(sync[1], /`qdrant_count` is the Qdrant count from before the run plus `synced`/);
  assert.match(sync[1], /`failed_ids` \(up to 10 IDs\) is present only when `failed > 0`/);
  assert.match(sync[1], /`failed_ids_truncated` is `true` when more than 10 IDs failed/);
  assert.match(sync[1], /empty content are skipped without being counted in `synced` or `failed`/);

  const example = sync[1].match(/```json\n(\{\n {2}"status": "complete"[\s\S]*?\n\})\n```/);
  assert.ok(example, 'expected a complete-response example');
  const body = JSON.parse(example[1]);
  // qdrant_count = prior Qdrant count + synced, and the prior count is
  // falkordb_count - (synced + failed) + orphaned_count when no empty rows are skipped.
  assert.equal(body.qdrant_count, body.falkordb_count - body.failed + body.orphaned_count);

  assert.match(sync[1], /A `503` is returned when Qdrant or FalkorDB is unavailable/);
  assert.match(sync[1], /\[Error Responses\]\(#error-responses\)/);
});

test('admin page documents the entity audit and merge endpoints', async () => {
  const page = await readDoc('api/admin.md');
  const audit = sectionBetween(page, '## GET /entities/audit', '\n---');
  const merge = sectionBetween(page, '## POST /entity/&lt;slug&gt;/merge', '\n---');

  assert.match(audit, /\*\*Authentication:\*\* API token \+ Admin token/);
  assert.match(audit, /the response always has `"dry_run": true`/);
  for (const param of ['summary', 'include_merge_candidates', 'limit', 'offset', 'category', 'reason']) {
    assert.ok(audit.includes(`| \`${param}\` |`), `expected audit parameter ${param}`);
  }
  assert.match(audit, /Max: `500`/);
  assert.match(audit, /`GET \/entities`, `GET \/entity\/<slug>`, and `GET \/entities\/merge-candidates` need only the API token/);
  assert.match(audit, /\{"error": "Failed to audit entities", "details": "<exception text>"\}/);
  assert.match(audit, /A non-integer `limit` or `offset` takes this path/);
  assert.doesNotMatch(audit, /`400`/, 'a bad limit or offset returns 500, not 400');

  assert.match(merge, /\*\*Authentication:\*\* API token \+ Admin token/);
  assert.match(merge, /\| `merge_into` \| string \(JSON body\) \| \*\*Yes\*\* \|/);
  assert.match(merge, /aliases are not resolved here/);
  for (const field of ['canonical', 'alias', 'alias_slug', 'edges_moved']) {
    assert.ok(merge.includes(`| \`${field}\` |`), `expected merge response field ${field}`);
  }
  assert.match(merge, /'merge_into' slug is required/);
  assert.match(merge, /Source and target entity must be different/);
  assert.match(merge, /\{"error": "Merge failed", "details": "<exception text>"\}/);

  const authModel = sectionBetween(page, '### Endpoint Authentication Requirements', '### Error Responses');
  assert.match(authModel, /EntityAudit\["\/entities\/audit"\]/);
  assert.match(authModel, /EntityMerge\["\/entity\/&lt;slug&gt;\/merge"\]/);
  assert.match(authModel, /Layer1-->EntityAudit/);
  assert.match(authModel, /Layer2-->EntityMerge/);
  assert.match(page, /for managing enrichment processing, embedding generation, and entity cleanup/);
});

test('authentication validates the extracted API token against AUTOMEM_API_TOKEN only', async () => {
  const page = await readDoc('authentication.md');

  assert.match(page, /ValidateToken\["Validate against<br\/>AUTOMEM_API_TOKEN"\]/);
  assert.doesNotMatch(page, /AUTOMEM_API_TOKEN or<br\/>ADMIN_API_TOKEN/);
});

test('authentication scopes the admin token to the routes that check it', async () => {
  const page = await readDoc('authentication.md');
  const tokenTypes = sectionBetween(page, '## Token Types', '\n---');
  const adminRow = tokenTypes.split('\n').find((line) => line.startsWith('| **Admin Token** |'));

  assert.ok(adminRow, 'expected an Admin Token row');
  for (const route of [
    '/admin/reembed',
    '/admin/sync',
    '/enrichment/reprocess',
    '/entities/audit',
    '/entity/<slug>/merge',
    '/backup',
  ]) {
    assert.ok(adminRow.includes(`\`${route}\``), `expected ${route} in the admin token row`);
  }
  assert.doesNotMatch(page, /Admin and enrichment endpoints/);
  assert.doesNotMatch(adminRow, /\/enrichment\/status/);
});

test('authentication troubleshooting names every admin token source and the API token requirement', async () => {
  const page = await readDoc('authentication.md');
  const unauthorized = sectionBetween(
    page,
    '### Admin Endpoint Returns 401',
    '### Admin Endpoint Returns 403',
  );

  assert.match(unauthorized, /Missing admin token\. AutoMem reads it from/);
  assert.match(unauthorized, /`X-Admin-Token` header, the `X-Admin-Api-Key` header, or the `admin_token` query parameter/);
  assert.match(unauthorized, /Admin endpoints other than `\/backup` also need the API token/);
  assert.doesNotMatch(page, /Missing `X-Admin-Token` header/);
  assert.doesNotMatch(page, /admin endpoints require both headers/);
});

test('admin circuit, audit flag and merge counts match the entity and circuit code', async () => {
  const page = await readFile(fileURLToPath(new URL('../src/content/docs/docs/reference/api/admin.md', import.meta.url)), 'utf8');

  assert.match(page, /A probe that fails with any other error, such as an unavailable OpenAI client, also closes the circuit but does not increment `recoveries`\./);
  assert.match(page, /with `summary` and without this flag, the merge-candidate search is skipped\. When `summary` is not set, the search always runs/);
  assert.doesNotMatch(page, /without it the merge-candidate search always runs/);
  assert.match(page, /including edges to memories the canonical entity already referenced \(no duplicate edge is created\)/);
});
