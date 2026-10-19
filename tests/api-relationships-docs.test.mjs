import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/relationships.md', import.meta.url),
);

async function readRelationshipsPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + heading.length + 2);
  const end = rest.search(/\n(?:## |---\n)/u);
  return end === -1 ? rest : rest.slice(0, end);
}

test('relationships source note points at the /associate route and batch helper', async () => {
  const page = await readRelationshipsPage();
  const links = [
    ...page.matchAll(
      /\[automem\/api\/memory\.py#(L\d+-L\d+)\]\(https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{40})\/automem\/api\/memory\.py#(L\d+-L\d+)\) — ([^\n]+)/gu,
    ),
  ];

  assert.equal(links.length, 2, 'expected exactly two memory.py source-note links');
  assert.equal(links[0][2], links[1][2], 'both memory.py links must share one pinned revision');
  for (const [, label, , anchor] of links) {
    assert.equal(label, anchor, 'link text and URL anchor must match');
  }

  const [route, helper] = links;
  assert.equal(route[1], 'L1110-L1201');
  assert.match(route[4], /`\/associate` endpoint/u);
  assert.equal(helper[1], 'L158-L266');
  assert.match(helper[4], /`_create_association_batch`/u);

  assert.doesNotMatch(page, /memory\.py#L664-L743/u);
  assert.doesNotMatch(page, /memory\.py#L244-L365/u);
});

test('REST single-pair request treats type as optional with a RELATES_TO default', async () => {
  const page = await readRelationshipsPage();
  const fields = section(page, '### Field Specifications');

  assert.match(fields, /\| `memory1_id` \| string \| Yes \|/u);
  assert.match(fields, /\| `memory2_id` \| string \| Yes \|/u);
  assert.match(
    fields,
    /\| `type` \| string \| No \| Relationship type[^\n]*default: `RELATES_TO`/u,
  );
  assert.doesNotMatch(fields, /\| `type` \| string \| Yes \|/u);
});

test('validation rules require only the memory IDs and default type to RELATES_TO', async () => {
  const page = await readRelationshipsPage();
  const validation = section(page, '## Validation Rules');
  const required = validation.match(/^4\. \*\*Required Fields\*\*: ([^\n]+)$/mu);

  assert.ok(required, 'expected a Required Fields rule');
  assert.match(required[1], /`memory1_id` and `memory2_id` are mandatory/u);
  assert.match(required[1], /`type` is optional and defaults to `RELATES_TO`/u);
  assert.doesNotMatch(required[1], /`memory1_id`, `memory2_id`, and `type` are mandatory/u);
});

test('MCP associate_memories table still lists type as required', async () => {
  const page = await readRelationshipsPage();
  const mcp = section(page, '## MCP Tool: `associate_memories`');

  assert.match(mcp, /\| `type` \| string \(enum\) \| Yes \| 11 authorable types \|/u);
});

test('edge storage uses updated_at and top-level relation properties, not created_at', async () => {
  const page = await readRelationshipsPage();
  const storage = section(page, '## Graph Storage Implementation');

  assert.match(
    storage,
    /MERGE \(m1\)-\[r:LEADS_TO\]->\(m2\)\nSET r\.strength = \$strength,\n\s+r\.updated_at = \$updated_at\n/u,
  );
  assert.match(storage, /PREFERS_OVER<br\/>strength: 0\.9<br\/>reason: 'ACID'<br\/>updated_at: /u);

  const edgeProperties = storage.match(/^\| Edge Properties \| ([^\n]+) \|$/mu);
  assert.ok(edgeProperties, 'expected an Edge Properties row');
  assert.match(edgeProperties[1], /`strength`, `updated_at`/u);
  assert.match(edgeProperties[1], /read from top-level request fields/u);
  assert.doesNotMatch(edgeProperties[1], /`properties` field/u);

  assert.doesNotMatch(storage, /created_at/u);
  assert.doesNotMatch(storage, /from `properties` field/u);
});
