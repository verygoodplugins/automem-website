import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const overviewPath = fileURLToPath(
  new URL('../src/content/docs/docs/overview.md', import.meta.url),
);

test('overview frames internal benchmark figures as baselines, not cross-system claims', async () => {
  const overview = await readFile(overviewPath, 'utf8');

  assert.doesNotMatch(overview, /current canonical benchmark claims/i);
  assert.match(overview, /87\.00%[\s\S]*84\.74%[\s\S]*internal engineering baselines/i);
  assert.match(overview, /neutral Agent Memory Benchmark/i);
  assert.match(overview, /\[Benchmarks\]\(\/benchmarks\/\)/);
});
