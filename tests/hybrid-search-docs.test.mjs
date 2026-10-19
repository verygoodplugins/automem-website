import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/core-concepts/hybrid-search.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Compact absence assertion: assert.doesNotMatch dumps the whole page on failure.
function assertAbsent(text, pattern) {
  assert.ok(!pattern.test(text), `stale text still present: ${pattern}`);
}

// Slice from one heading to the next named heading. Explicit end headings keep
// fenced blocks (formula, Mermaid) from being mistaken for page headings.
function between(page, startHeading, endHeading) {
  const start = page.indexOf(`\n${startHeading}\n`);
  assert.notEqual(start, -1, `expected a "${startHeading}" heading`);
  const end = page.indexOf(`\n${endHeading}\n`, start + 1);
  assert.notEqual(end, -1, `expected a "${endHeading}" heading after "${startHeading}"`);
  return page.slice(start, end);
}

function metadataSection(page) {
  return between(page, '### Metadata Scoring Components', '## 10-Component Scoring System');
}

function scoringIntroAndFormula(page) {
  return between(page, '## 10-Component Scoring System', '### Component Weights');
}

function componentWeights(page) {
  return between(page, '### Component Weights', '### Score Combination Flow');
}

function combinationFlow(page) {
  return between(page, '### Score Combination Flow', '## Multi-Hop Reasoning');
}

function configReference(page) {
  return between(page, '### Search Weight Environment Variables', '### Expansion and Limit Configuration');
}

test('source note links use pinned AutoMem revisions', async () => {
  const page = await readPage();
  const note = page.match(/:::note\[Source files\]\n([\s\S]*?)\n:::/);
  assert.ok(note, 'expected the Source files note');

  const links = [
    ...note[1].matchAll(
      /\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/)]+)\/([^)]+)\)/g,
    ),
  ];
  assert.equal(links.length, 9, 'expected the nine source file links');

  for (const [, sha, file] of links) {
    assert.ok(isPinnedSha('automem', sha), `${file} must use a pinned AutoMem revision, got ${sha}`);
  }

  const files = links.map(([, , file]) => file);
  for (const file of ['automem/utils/scoring.py', 'automem/api/recall.py', 'automem/config.py']) {
    assert.ok(files.includes(file), `expected a source link for ${file}`);
  }
});

test('the scoring formula separates the weighted relevance_score from the unweighted context bonus', async () => {
  const page = await readPage();
  const section = scoringIntroAndFormula(page);

  assertAbsent(section, /context_bonus\s+×\s+SEARCH_WEIGHT_RELEVANCE/);
  assert.match(
    section,
    /\+ relevance_score\s+× SEARCH_WEIGHT_RELEVANCE\s+\(default: 0\.0\)/,
  );
  assert.match(section, /\+ context_bonus\s+\(unweighted\)/);
  assert.match(section, /sum of ten weighted components plus an unweighted context bonus/);
  assert.match(section, /the context bonus has no environment variable/);
});

test('the component weights table splits Relevance from the Context bonus', async () => {
  const page = await readPage();
  const table = componentWeights(page);

  assertAbsent(table, /^\| Context \| 0% \|/m);
  assertAbsent(table, /Context profile scoring bonus/);

  const relevance = table.match(/^\| Relevance \|.*$/m)?.[0];
  assert.ok(relevance, 'expected a Relevance row');
  assert.match(relevance, /`SEARCH_WEIGHT_RELEVANCE`/);
  assert.match(relevance, /`relevance_score`/);
  assert.match(relevance, /consolidation/i);

  const context = table.match(/^\| Context bonus \|.*$/m)?.[0];
  assert.ok(context, 'expected a Context bonus row');
  assert.match(context, /unweighted/);
  assertAbsent(context, /SEARCH_WEIGHT_RELEVANCE/);
});

test('the ten SEARCH_WEIGHT defaults on the page sum to the documented 1.95', async () => {
  const page = await readPage();
  const config = configReference(page);
  const weights = [...config.matchAll(/^\| `SEARCH_WEIGHT_([A-Z]+)` \| ([0-9.]+) \|/gm)];

  assert.deepEqual(
    weights.map(([, name]) => name).sort(),
    [
      'CONFIDENCE',
      'EXACT',
      'IMPORTANCE',
      'KEYWORD',
      'METADATA',
      'RECENCY',
      'RELATION',
      'RELEVANCE',
      'TAG',
      'VECTOR',
    ],
  );
  const sum = weights.reduce((total, [, , value]) => total + Number(value), 0);
  assert.equal(sum.toFixed(2), '1.95');
  assert.match(config, /sum to 1\.95/);
  assert.match(componentWeights(page), /sum = 1\.95/);
});

test('final scores are documented as an unnormalized sum, not normalized to [0.0, 1.0]', async () => {
  const page = await readPage();

  assertAbsent(page, /normalized to the range \[0\.0, 1\.0\]/i);
  assertAbsent(page, /normalized to \[0\.0, 1\.0\]/i);
  assertAbsent(page, /Normalize to 0\.0 - 1\.0/);
  assertAbsent(page, /\bNormalize\b\s*-->/);
  assertAbsent(page, /-->\s*Normalize\b/);

  const intro = scoringIntroAndFormula(page);
  assert.match(intro, /The sum is not normalized\./);
  assert.match(intro, /a score can exceed 1\.0/);
  assert.match(intro, /ranking signal, not a probability/);
  assert.match(componentWeights(page), /no normalization step/);
  assert.match(configReference(page), /the weighted sum is not normalized/);
});

test('post-scoring additions are documented: entity expansion boost and the recency re-rank weight', async () => {
  const page = await readPage();
  const intro = scoringIntroAndFormula(page);

  assert.match(intro, /Entity expansion \(`expand_entities=true`\) adds a flat 0\.15/);
  assert.match(intro, /`SEARCH_WEIGHT_TEMPORAL` \(default 0\.1\)/);
  assert.match(intro, /`recency_bias` request parameter or `RECALL_RECENCY_BIAS`, off by default/);
  assert.match(intro, /\(\/docs\/core-concepts\/recall-tuning\/\)/);

  const note = configReference(page).match(/\*\*Note on weight configuration:\*\*.*$/m)?.[0];
  assert.ok(note, 'expected the weight configuration note');
  assertAbsent(note, /maintain relative proportions/);
  assert.match(note, /`min_score` thresholds/);
  assert.match(note, /flat 0\.15 entity-expansion boost/);
});

test('the context bonus is documented as fixed, unweighted amounts with every profile source', async () => {
  const page = await readPage();
  const section = componentWeights(page);
  const paragraph = section.match(/^The context bonus is not a `SEARCH_WEIGHT_\*` term\..*$/m)?.[0];
  assert.ok(paragraph, 'expected the context bonus paragraph');

  assert.match(paragraph, /`_compute_context_bonus\(\)`/);
  assert.match(paragraph, /0\.45 for a context tag hit/);
  assert.match(paragraph, /0\.25 for a type match/);
  assert.match(paragraph, /0\.2 for a keyword match/);
  assert.match(paragraph, /0\.9 when the memory ID is in `priority_ids`/);
  assert.match(paragraph, /hardcoded in `_build_context_profile\(\)`/);
  assert.match(paragraph, /cannot be set through the environment/);
  for (const source of ['context_tags', 'context_types', 'priority_ids', 'context', 'language', 'active_path']) {
    assert.ok(paragraph.includes(`\`${source}\``), `expected context profile source ${source}`);
  }
  assert.match(paragraph, /\(\/docs\/reference\/api\/recall-operations\/\)/);
});

test('recency is documented as timestamp decay with a configurable window and curve', async () => {
  const page = await readPage();
  const section = metadataSection(page);

  assertAbsent(section, /time since last access/i);
  assertAbsent(section, /if never accessed/i);
  assertAbsent(section, /last_accessed` falls back/);
  assert.match(section, /Recency decays with the age of the memory's `timestamp`/);
  assert.match(section, /`last_accessed` plays no part in the recency score/);
  assert.match(section, /`SEARCH_RECENCY_WINDOW_DAYS=180`, `SEARCH_RECENCY_CURVE=linear`/);
  assert.match(section, /`max\(0\.0, 1\.0 - \(age_days \/ 180\.0\)\)`/);
  assert.match(
    section,
    /`SEARCH_RECENCY_CURVE=exp`.*`0\.5 \*\* \(age_days \/ SEARCH_RECENCY_WINDOW_DAYS\)`/,
  );

  // No surface still presents recency as a fixed linear 180-day decay or as last-access based.
  assertAbsent(page, /Linear decay 180 days/);
  assertAbsent(page, /\| Linear decay over 180 days \|/);
  assertAbsent(page, /Recency decay contribution \(linear over 180 days\)/);
  assertAbsent(page, /memory\.timestamp \/<br\/>last_accessed/);
  assert.match(page, /Age decay from timestamp<br\/>Weight: 0\.10/);
  assert.match(
    componentWeights(page),
    /\| Recency \| 10% \| `SEARCH_WEIGHT_RECENCY` \| Age decay from `timestamp`/,
  );

  const config = configReference(page);
  const windowRow = config.match(/^\| `SEARCH_RECENCY_WINDOW_DAYS` \| 180 \|.*$/m)?.[0];
  assert.ok(windowRow, 'expected a SEARCH_RECENCY_WINDOW_DAYS row with default 180');
  assert.match(windowRow, /non-positive value falls back to 180/);
  const curveRow = config.match(/^\| `SEARCH_RECENCY_CURVE` \| `linear` \|.*$/m)?.[0];
  assert.ok(curveRow, 'expected a SEARCH_RECENCY_CURVE row with default linear');
  assert.match(curveRow, /`linear` or `exp`/);
  assert.match(curveRow, /falls back to `linear`/);
});

test('missing importance, confidence, and timestamp contribute 0.0, with the write-time defaults kept separate', async () => {
  const page = await readPage();
  const section = metadataSection(page);

  assertAbsent(section, /Missing `importance` defaults to 0\.5/);
  assertAbsent(section, /Missing `confidence` defaults to 0\.7/);
  assertAbsent(section, /0\.7/);

  assert.match(section, /Missing or non-numeric `importance` contributes 0\.0\./);
  assert.match(section, /Missing or non-numeric `confidence` contributes 0\.0\./);
  assert.match(section, /missing or unparseable `timestamp` scores 0\.0 for recency/i);
  assert.match(section, /stored without `importance` gets 0\.5 at write time/);
  assert.match(section, /When a memory is created, `confidence` comes from the request when it supplies both `type` and `confidence`/);
  assert.match(section, /is 0\.9 when it supplies only `type`/);
  assert.match(section, /otherwise comes from the classifier/);
  assert.match(section, /`relevance_score` is also read, but its default weight is 0\.0/);
});

test('the score combination diagram wires relevance and the context bonus separately and has no normalize step', async () => {
  const page = await readPage();
  const flow = combinationFlow(page);

  assertAbsent(flow, /\bNormalize\b/);
  assertAbsent(flow, /GS\s*-->\s*CtxW/);
  assertAbsent(flow, /CtxW\["× SEARCH_WEIGHT_RELEVANCE/);

  assert.match(flow, /RecSrc\["memory\.timestamp"\]/);
  assert.match(flow, /RelSrc\["memory\.relevance_score<br\/>from consolidation"\]/);
  assert.match(flow, /RelW\["× SEARCH_WEIGHT_RELEVANCE<br\/>0\.0"\]/);
  assert.match(flow, /CtxW\["Context bonus<br\/>added unweighted"\]/);
  for (const edge of ['RelSrc --> RelW', 'CtxSrc --> CtxW', 'RelW --> Sum', 'CtxW --> Sum', 'Sum --> Sort']) {
    assert.ok(flow.includes(edge), `expected diagram edge ${edge}`);
  }
});

test('the weights environment table describes SEARCH_WEIGHT_RELEVANCE as the consolidation relevance_score weight', async () => {
  const page = await readPage();
  const config = configReference(page);
  const row = config.match(/^\| `SEARCH_WEIGHT_RELEVANCE` \|.*$/m)?.[0];

  assert.ok(row, 'expected a SEARCH_WEIGHT_RELEVANCE row');
  assertAbsent(row, /Context profile/i);
  assert.match(row, /`relevance_score`/);
  assert.match(row, /Consolidation decay/);
});
