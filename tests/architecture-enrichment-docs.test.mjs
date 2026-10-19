import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/architecture/enrichment.md', import.meta.url),
);

async function readEnrichmentPage() {
  return readFile(pagePath, 'utf8');
}

function sectionBetween(page, startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  assert.notEqual(start, -1, `expected "${startMarker}"`);
  const rest = page.slice(start + startMarker.length);
  const end = rest.indexOf(endMarker);
  assert.notEqual(end, -1, `expected "${endMarker}" after "${startMarker}"`);
  return rest.slice(0, end);
}

function sectionFrom(page, startMarker) {
  const start = page.indexOf(startMarker);
  assert.notEqual(start, -1, `expected "${startMarker}"`);
  return page.slice(start + startMarker.length);
}

function tableRow(section, type) {
  const row = section.split('\n').find((line) => line.startsWith(`| \`${type}\` |`));
  assert.ok(row, `expected an entity type row for ${type}`);
  return row;
}

test('enrichment source note names entity_extraction.py instead of graph_store.py', async () => {
  const page = await readEnrichmentPage();
  const note = sectionBetween(page, ':::note[Source files]\n', '\n:::');

  const link = note.match(
    /\[automem\/utils\/entity_extraction\.py\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/automem\/utils\/entity_extraction\.py\) — ([^\n]+)/u,
  );
  assert.ok(link, 'expected an entity_extraction.py source-note entry');
  assert.ok(
    isPinnedSha('automem', link[1]),
    'entity_extraction.py link must use a recorded AutoMem release pin',
  );
  for (const name of ['extract_entities', '_is_valid_entity', '_slugify', 'generate_summary']) {
    assert.ok(link[2].includes(`\`${name}\``), `expected ${name} in the entity_extraction.py note`);
  }

  assert.doesNotMatch(note, /graph_store\.py/u);
  assert.doesNotMatch(page, /Graph write operations for enrichment/u);
});

test('spaCy model caching is a lock-guarded module-level global, not an LRU cache', async () => {
  const page = await readEnrichmentPage();
  const extraction = sectionBetween(page, '## Entity Extraction\n', '\n---');
  const tier1 = sectionBetween(extraction, '**Tier 1: spaCy NLP**\n', '\n**Tier 2');

  assert.match(tier1, /module-level `_SPACY_NLP` global/u);
  assert.match(tier1, /`_SPACY_INIT_LOCK` \(a `threading\.Lock`\)/u);
  assert.doesNotMatch(tier1, /LRU/iu);
  assert.doesNotMatch(page, /cached via LRU cache/u);
  assert.doesNotMatch(page, /5-10 second/u);
});

test('spaCy label mapping lists LAW under tools and NORP under concepts everywhere', async () => {
  const page = await readEnrichmentPage();
  const extraction = sectionBetween(page, '## Entity Extraction\n', '\n---');
  const tier1 = sectionBetween(extraction, '**Tier 1: spaCy NLP**\n', '\n**Tier 2');

  const nerLine = tier1.split('\n').find((line) => line.includes('Named Entity Recognition'));
  assert.ok(nerLine, 'expected the NER bullet');
  for (const label of [
    'PERSON',
    'ORG',
    'PRODUCT',
    'WORK_OF_ART',
    'LAW',
    'EVENT',
    'GPE',
    'LOC',
    'NORP',
  ]) {
    assert.ok(nerLine.includes(`\`${label}\``), `expected ${label} in the NER bullet`);
  }

  const types = sectionBetween(extraction, '### Entity Types\n', '\n### Entity Validation');
  const tools = tableRow(types, 'tools');
  const concepts = tableRow(types, 'concepts');
  assert.match(tools, /`PRODUCT`, `WORK_OF_ART`, `LAW`/u);
  assert.match(concepts, /`EVENT`, `GPE`, `LOC`, `NORP`/u);
  assert.doesNotMatch(tools, /NORP/u);
  assert.doesNotMatch(concepts, /LAW/u);
});

test('reprocess documents list or comma-separated ids, query fallback, and 202/400 responses', async () => {
  const page = await readEnrichmentPage();
  const admin = sectionBetween(page, '## Admin Operations\n', '\n---');
  const reprocess = sectionFrom(admin, '### Force Reprocessing\n');

  const params = sectionBetween(reprocess, '**Parameters:**\n', '\n\n**Responses**');
  assert.match(params, /JSON array or a comma-separated string in the JSON body/u);
  assert.match(params, /`\?ids=` query parameter is used only when the body has no `ids` value/u);
  assert.match(params, /trimmed and de-duplicated/u);
  assert.doesNotMatch(reprocess, /Array of memory UUIDs to reprocess/u);

  const responses = sectionFrom(reprocess, '**Responses**');
  assert.match(responses, /once the admin-token check passes/u);
  assert.match(responses, /`202 Accepted`/u);
  assert.match(responses, /"status": "queued"/u);
  assert.match(responses, /`count` is the number of distinct IDs/u);
  assert.match(responses, /`forced=true`/u);
  assert.match(responses, /`400 Bad Request`/u);
  assert.match(
    responses,
    /\{"status": "error", "code": 400, "message": "No memory ids provided for reprocessing"\}/u,
  );
});

test('status endpoint keeps the classification and circuit blocks', async () => {
  const page = await readEnrichmentPage();
  const status = sectionBetween(page, '### Status Endpoint\n', '\n### Tracking Sets');

  assert.match(status, /"classification": \{/u);
  assert.match(status, /"circuit": \{/u);
  assert.match(status, /- `classification` — /u);
  assert.match(status, /- `circuit` — /u);
});
