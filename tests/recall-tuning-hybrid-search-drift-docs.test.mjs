import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pins } from './helpers/source-pins.mjs';

// Drift fixes for the recall-tuning and hybrid-search pages. Each block asserts
// the corrected text is present and the old wrong phrase is gone. Facts were
// verified against the pinned AutoMem release (see scripts/docs-source-pins.json).

const docsRoot = new URL('../src/content/docs/docs/core-concepts/', import.meta.url);

function readPage(name) {
  return readFile(fileURLToPath(new URL(name, docsRoot)), 'utf8');
}

// Compact absence assertion: assert.doesNotMatch dumps the whole page on failure.
function assertAbsent(text, pattern) {
  assert.ok(!pattern.test(text), `stale text still present: ${pattern}`);
}

function tableRow(page, variable) {
  const row = page.match(new RegExp(`^\\| \`${variable}\` \\|.*$`, 'm'))?.[0];
  assert.ok(row, `expected a ${variable} table row`);
  return row;
}

test('recall tuning separates the v0.16.0 no-change knobs from the v0.16.1 on-by-default changes', async () => {
  const page = await readPage('recall-tuning.md');

  assertAbsent(page, /every knob on this page defaults to \*no behavior change\*/);
  assertAbsent(page, /Introduced across AutoMem \*\*v0\.16\.0\*\*\. All knobs/);

  assert.match(page, /the v0\.16\.0 ranking knobs on this page default to \*no behavior change\* from prior releases/);
  assert.match(page, /apart from the metadata sidecar weight `SEARCH_WEIGHT_METADATA` \(new in v0\.16\.0 and active by default\)/);
  assert.match(
    page,
    /vector candidate pool and artifact-type exclusion added in v0\.16\.1 are on by default/,
  );
  assert.match(page, /Introduced across AutoMem \*\*v0\.16\.0\*\* and \*\*v0\.16\.1\*\*\. All knobs/);

  // The defaults behind the claim: over-fetch is 4x and MetaPattern is excluded out of the box.
  assert.match(tableRow(page, 'RECALL_VECTOR_OVERFETCH'), /\| `4` \|/);
  assert.match(page, /`RECALL_EXCLUDED_TYPES` \(default `MetaPattern`/);
});

test('RECALL_VECTOR_FETCH_CAP caps the over-fetch but never drops the fetch below the requested limit', async () => {
  const page = await readPage('recall-tuning.md');
  const row = tableRow(page, 'RECALL_VECTOR_FETCH_CAP');

  assertAbsent(page, /Hard ceiling on fetched vector candidates/);
  assert.match(row, /\| `200` \|/);
  assert.match(row, /Cap on the over-fetched candidate count/);
  assert.match(row, /kept separate from `RECALL_MAX_LIMIT`/);
  assert.match(row, /never drops below the per-query result limit \(`limit`, or `per_query_limit` when set\)/);
});

test('the relevance gate only runs when the query yields keyword tokens', async () => {
  const page = await readPage('recall-tuning.md');

  assertAbsent(page, /When the gate is set and a result's best query-topical evidence/);
  assert.match(page, /When the gate is set and the query yields at least one keyword token/);
  assert.match(page, /Words under three characters and common stopwords don't count as keyword tokens/);
  assert.match(page, /a tags-only or embedding-only request, or a query made only of such words, is never gated/);
  // The existing gate description stays intact.
  assert.match(page, /scaled by `evidence \/ gate`/);
  assert.match(page, /The context bonus is never gated/);
});

test('recall tuning describes the tag term as query-token hits, not the tag filter', async () => {
  const page = await readPage('recall-tuning.md');
  const row = tableRow(page, 'SEARCH_WEIGHT_TAG');

  assertAbsent(page, /Tag-filter overlap/);
  assertAbsent(page, /Query keywords that exactly match a memory tag or metadata term/);
  assert.match(row, /\| `0\.20` \|/);
  assert.match(row, /Query-token hits against tag and metadata terms/);
});

test('recall tuning describes the exact term as a whole-query match against metadata terms', async () => {
  const page = await readPage('recall-tuning.md');
  const row = tableRow(page, 'SEARCH_WEIGHT_EXACT');

  assertAbsent(page, /Exact-phrase boost/);
  assert.match(row, /\| `0\.20` \|/);
  assert.match(row, /Whole-query exact match against metadata terms/);
});

test('hybrid search describes the tag and exact terms by what scoring.py computes', async () => {
  const page = await readPage('hybrid-search.md');

  const weights = page.match(/^\| Tag \| 20% \| `SEARCH_WEIGHT_TAG` \|.*$/m)?.[0];
  assert.ok(weights, 'expected the Tag row in the component weights table');
  assert.match(weights, /Query-token hits against tag and metadata terms/);
  const exactWeights = page.match(/^\| Exact \| 20% \| `SEARCH_WEIGHT_EXACT` \|.*$/m)?.[0];
  assert.ok(exactWeights, 'expected the Exact row in the component weights table');
  assert.match(exactWeights, /Whole-query exact match against metadata terms/);
  assert.match(tableRow(page, 'SEARCH_WEIGHT_EXACT'), /Whole-query exact match against metadata terms/);

  assertAbsent(page, /Tag filter matching/);
  assertAbsent(page, /Exact phrase match boost/);
  assertAbsent(page, /Prefix\/exact matching<br\/>Weight: 0\.20/);
  assertAbsent(page, /Query tags vs<br\/>memory tags/);
  assertAbsent(page, /Query phrase vs<br\/>memory content/);
  assert.match(page, /Tag\["Tag Overlap<br\/>Query tokens vs tag\/metadata terms<br\/>Weight: 0\.20"\]/);
  assert.match(page, /TagSrc\["Query tokens vs<br\/>tag and metadata terms"\]/);
  assert.match(page, /ExSrc\["Whole query vs<br\/>metadata terms"\]/);
});

test('CONSOLIDATION_MIN_CLUSTER_SIZE advice reflects the fixed size-5 summary threshold', async () => {
  const page = await readPage('recall-tuning.md');

  assertAbsent(page, /lower `CONSOLIDATION_MIN_CLUSTER_SIZE` to consolidate more aggressively/);
  assertAbsent(page, /more aggressively on smaller corpora/);

  assert.match(
    page,
    /`CONSOLIDATION_MIN_CLUSTER_SIZE` only decides which groups are reported as clusters/,
  );
  assert.match(page, /a `MetaPattern` summary is written only when/);
  assert.match(page, /a fixed threshold, so any value of 5 or less writes the same summaries, and lowering it from the default 3 only reports more clusters/);
  assertAbsent(page, /lowering it below 5 reports more clusters/);

  const link = page.match(
    /\[`cluster\["size"\] >= 5`\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/consolidation\.py#L(\d+)-L(\d+)\)/,
  );
  assert.ok(link, 'expected a pinned consolidation.py link for the size-5 threshold');
  // Any recorded AutoMem release (not a legacy pin), so a newer release does not break this test.
  const releaseShas = pins['verygoodplugins/automem'].releases.map(({ sha }) => sha);
  assert.ok(releaseShas.includes(link[1]), 'expected the link to pin a recorded AutoMem release');
  assert.equal(link[2], '926');
  assert.equal(link[3], '927');
});

test('hybrid search labels utils/graph.py as node serialization, not graph traversal', async () => {
  const page = await readPage('hybrid-search.md');
  const line = page.match(/^- \[automem\/utils\/graph\.py\].*$/m)?.[0];

  assert.ok(line, 'expected the utils/graph.py source link');
  assertAbsent(page, /Graph traversal utilities/);
  assert.match(line, /Node serialization and relation summary helpers/);
});

test('the importance write-time default is scoped to the API write routes', async () => {
  const page = await readPage('hybrid-search.md');
  const line = page.match(/^- Missing or non-numeric `importance` contributes 0\.0\..*$/m)?.[0];

  assert.ok(line, 'expected the missing importance bullet');
  assert.match(line, /A memory stored without `importance` gets 0\.5 at write time on `POST \/memory` and `POST \/memory\/batch`/);
  assert.match(line, /\(`PATCH \/memory\/\{id\}` applies no default\)/);
  assert.match(line, /such as one written outside those routes/);
  assertAbsent(line, /gets 0\.5 at write time, so the 0\.0 fallback/);
});

test('hybrid search no longer claims seed results are never filtered', async () => {
  const page = await readPage('hybrid-search.md');

  assertAbsent(page, /Seed results never filtered/);
  assert.match(
    page,
    /\*\*Filter application:\*\* Seed results go through the request filters \(tags, time range, `exclude_tags`, `min_score`\)/,
  );
  assert.match(page, /and, by default, current-state filtering/);
  assert.match(page, /Expanded results get the same filters except the tag scope, which applies only with `expand_respect_tags=true`/);
  assertAbsent(page, /Entity expansion respects original tag filters/);
  assertAbsent(page, /relation-expanded results also respect/);
});
