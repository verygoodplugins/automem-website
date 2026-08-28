import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const workflowPath = fileURLToPath(
  new URL('../.github/workflows/deploy.yml', import.meta.url),
);

test('Pages deploy stays on the last Wrangler version compatible with previews', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(workflow, /wranglerVersion:\s*4\.79\.0/);
});
