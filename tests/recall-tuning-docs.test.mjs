import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/core-concepts/recall-tuning.md', import.meta.url),
);

async function readRecallTuningPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + 1);
  const end = rest.indexOf('\n---\n');
  return end === -1 ? rest : rest.slice(0, end);
}

function mermaidDiagram(page) {
  const diagram = page.match(/```mermaid\n([\s\S]*?)\n```/);
  assert.ok(diagram, 'expected the ranking pipeline diagram');
  return diagram[1];
}

test('recall tuning diagram ends in an un-normalized final_score, not a normalization step', async () => {
  const diagram = mermaidDiagram(await readRecallTuningPage());

  assert.match(diagram, /final_score<br\/>\(not normalized\)/);
  assert.doesNotMatch(diagram, /Normalize to 0\.0/i);
  assert.match(diagram, /10 components → sum 1\.95/);
});

test('recall tuning documents ten weights that sum to 1.95 and are not renormalized', async () => {
  const weights = section(await readRecallTuningPage(), 'Component weights');

  const rows = [...weights.matchAll(/^\| `(SEARCH_WEIGHT_[A-Z]+)` \| `([0-9.]+)` \|/gm)];
  assert.deepEqual(
    Object.fromEntries(rows.map(([, name, value]) => [name, value])),
    {
      SEARCH_WEIGHT_VECTOR: '0.35',
      SEARCH_WEIGHT_KEYWORD: '0.35',
      SEARCH_WEIGHT_METADATA: '0.35',
      SEARCH_WEIGHT_RELATION: '0.25',
      SEARCH_WEIGHT_TAG: '0.20',
      SEARCH_WEIGHT_EXACT: '0.20',
      SEARCH_WEIGHT_RECENCY: '0.10',
      SEARCH_WEIGHT_IMPORTANCE: '0.10',
      SEARCH_WEIGHT_CONFIDENCE: '0.05',
      SEARCH_WEIGHT_RELEVANCE: '0.00',
    },
  );
  assert.equal(rows.length, 10);
  const hundredths = rows.reduce((sum, [, , value]) => sum + Math.round(Number(value) * 100), 0);
  assert.equal(hundredths, 195, 'default weights must sum to 1.95');

  assert.match(weights, /base `final_score` is a weighted sum of ten components plus an unweighted context bonus/);
  assert.match(weights, /not normalized to `\[0\.0, 1\.0\]`/);
  assert.match(weights, /can score above `1\.0`/);
  assert.match(weights, /they sum to 1\.95/);
  assert.match(weights, /not normalized, it also changes the absolute scores/);
  assert.match(weights, /re-check any `min_score` or `RECALL_MIN_SCORE` threshold/);

  assert.doesNotMatch(weights, /returned as `final_score` as-is/);
  assert.doesNotMatch(weights, /then normalized to/i);
  assert.doesNotMatch(weights, /renormalized/i);
  assert.doesNotMatch(weights, /rarely need to rescale/i);
  assert.doesNotMatch(weights, /equivalent to lowering/i);
});

test('SEARCH_WEIGHT_RELEVANCE weights the consolidation relevance score, not the context bonus', async () => {
  const weights = section(await readRecallTuningPage(), 'Component weights');
  const row = weights.match(/^\| `SEARCH_WEIGHT_RELEVANCE` \|.*$/m);

  assert.ok(row, 'expected a SEARCH_WEIGHT_RELEVANCE row');
  assert.match(row[0], /Consolidation decay `relevance_score`/);
  assert.match(row[0], /opt-in/);
  assert.doesNotMatch(row[0], /context_tags/);
  assert.doesNotMatch(row[0], /Context-profile bonus/i);
});

test('recall tuning keeps the context bonus separate from the ten weights', async () => {
  const weights = section(await readRecallTuningPage(), 'Component weights');

  assert.match(weights, /The context bonus is not one of these ten weights/);
  assert.match(weights, /`context_tags` soft boost/);
  assert.match(weights, /`context_types` and `priority_ids` hints/);
  assert.match(weights, /and the automatic language, style, and `context`-label hints/);
  assert.match(weights, /separate additive `context_bonus` term/);
  assert.match(weights, /outside the weight table and is never gated/);
  assert.match(
    weights,
    /hardcoded rather than configurable: 0\.45 for a tag hit, 0\.25 for a type hit, 0\.2 for a keyword hit, and 0\.9 for a `priority_ids` match/,
  );
  assert.match(weights, /also sit outside the ten weights/);
  assert.match(weights, /adds `SEARCH_WEIGHT_TEMPORAL` × relative recency when it runs/);
  assert.match(weights, /entity expansion \(`expand_entities`\) get a flat `\+0\.15`/);
});

test('recall tuning relevance gate lists consolidation relevance as a gated component', async () => {
  const gate = section(await readRecallTuningPage(), 'The relevance gate');

  assert.match(
    gate,
    /\(importance, confidence, recency, tag overlap, consolidation relevance\)/,
  );
  assert.match(gate, /scaled by `evidence \/ gate`/);
  assert.match(gate, /The context bonus is never gated/);
});

test('recall tuning keeps the normalization that really exists in other features', async () => {
  const page = await readRecallTuningPage();
  const recency = section(page, 'Recency: age decay vs. relative re-rank');
  const tagScore = section(page, 'Tag-score normalization');

  assert.match(recency, /min-max normalized \*\*across the current candidate set\*\*/);
  assert.match(tagScore, /caps the denominator used to normalize tag-overlap scores/);
});
