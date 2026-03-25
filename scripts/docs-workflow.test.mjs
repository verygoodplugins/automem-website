import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyUnmappedFiles,
  collectAffectedDocs,
  matchesPattern,
  resolveRefRange,
} from './docs-workflow-lib.mjs';

test('matchesPattern handles exact file matches', () => {
  assert.equal(matchesPattern('src/index.ts', 'src/index.ts'), true);
  assert.equal(matchesPattern('src/index.ts', 'src/index.js'), false);
});

test('matchesPattern handles subtree patterns ending in /**', () => {
  assert.equal(matchesPattern('automem/search/runtime_relations.py', 'automem/search/**'), true);
  assert.equal(matchesPattern('automem/search/runtime/helpers.py', 'automem/search/**'), true);
  assert.equal(matchesPattern('automem/searchish/runtime_relations.py', 'automem/search/**'), false);
});

test('collectAffectedDocs deduplicates slugs and tracks matching files', () => {
  const docMap = {
    automem: {
      'automem/search/**': ['reference/api/recall-operations'],
      'automem/search/runtime_relations.py': ['reference/api/relationships'],
    },
  };

  const { affectedDocs } = collectAffectedDocs('automem', docMap, [
    'automem/search/runtime_relations.py',
  ]);

  assert.deepEqual(
    affectedDocs.map((doc) => doc.slug),
    ['reference/api/recall-operations', 'reference/api/relationships']
  );
  assert.deepEqual(affectedDocs[0].changedFiles, ['automem/search/runtime_relations.py']);
});

test('classifyUnmappedFiles separates ignored and doc-relevant files', () => {
  const repoConfig = {
    repoKey: 'mcp-automem',
    ignoredPatterns: ['tests/**', '**/*.test.ts', '.github/**'],
  };
  const docMap = {
    'mcp-automem': {
      'src/index.ts': ['reference/api/direct-vs-mcp'],
    },
  };

  const result = classifyUnmappedFiles(repoConfig, docMap, [
    'src/index.ts',
    'src/recall-memory.ts',
    'src/recall-memory.test.ts',
    'tests/integration/mcp-tools.test.ts',
    '.github/workflows/docs-dispatch.yml',
  ]);

  assert.deepEqual(result.docRelevant, ['src/recall-memory.ts']);
  assert.deepEqual(result.ignored, [
    'src/recall-memory.test.ts',
    'tests/integration/mcp-tools.test.ts',
    '.github/workflows/docs-dispatch.yml',
  ]);
});

test('resolveRefRange uses configured default release range', () => {
  const repoConfig = {
    repoKey: 'automem',
    defaultRange: {
      from_ref: 'v0.14.0',
      to_ref: 'v0.15.1',
    },
  };

  assert.deepEqual(resolveRefRange(repoConfig, null, null), {
    fromRef: 'v0.14.0',
    toRef: 'v0.15.1',
    source: 'default_release_range',
  });
});
