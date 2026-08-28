import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const relationshipTypesPath = fileURLToPath(
  new URL('../src/content/docs/docs/core-concepts/relationship-types.md', import.meta.url),
);
const sourceSha = '5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb';

async function readRelationshipTypes() {
  return readFile(relationshipTypesPath, 'utf8');
}

test('relationship-types documents the current top-level associate contract', async () => {
  const page = await readRelationshipTypes();

  assert.match(
    page,
    /"memory1_id"[\s\S]*"memory2_id"[\s\S]*"type"[\s\S]*"strength"[\s\S]*"context"[\s\S]*"reason"/,
  );
  assert.match(page, /"status": "success"[\s\S]*"relation_type": "PREFERS_OVER"/);
  assert.match(
    page,
    /MATCH \(m1:Memory \{id: \$id1\}\)[\s\S]*MATCH \(m2:Memory \{id: \$id2\}\)[\s\S]*SET r\.strength = \$strength,[\s\S]*r\.updated_at = \$updated_at/,
  );
  assert.doesNotMatch(page, /"memory_id": "uuid-of-source-memory"/);
  assert.doesNotMatch(page, /"relation": "PREFERS_OVER"/);
  assert.doesNotMatch(page, /SET r \+= \$properties/);
});

test('relationship-types preserves current automatic relationship properties and sources', async () => {
  const page = await readRelationshipTypes();

  assert.match(page, /\| `updated_at` \| ISO datetime \| When the relationship was last created or updated/);
  assert.match(page, /SIMILAR_TO[\s\S]*`score`[\s\S]*`updated_at`/);
  assert.doesNotMatch(page, /`similarity_score`/);
  assert.match(
    page,
    new RegExp(`automem/blob/${sourceSha}/automem/api/memory\\.py`),
  );
  assert.doesNotMatch(page, /graph_store\.py\).*Cypher query construction for relationship creation/);
});
