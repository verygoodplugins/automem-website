import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const workflowPath = fileURLToPath(
  new URL('../.github/workflows/deploy.yml', import.meta.url),
);

test('Pages deploy avoids the incompatible project config', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(
    workflow,
    /command:\s*--cwd \/tmp pages deploy \$\{\{ github\.workspace \}\}\/dist\/client /,
  );
  assert.doesNotMatch(workflow, /wranglerVersion:/);
});
