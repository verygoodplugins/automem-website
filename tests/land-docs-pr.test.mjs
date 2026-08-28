import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..');
const landingScript = join(projectRoot, '.github/scripts/land-docs-pr.sh');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

test('lands updates without staging or stashing the ignored source checkout', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'land-docs-pr-'));
  t.after(() => rm(workspace, { force: true, recursive: true }));

  const remote = join(workspace, 'remote.git');
  const checkout = join(workspace, 'checkout');
  const fakeBin = join(workspace, 'bin');
  const fakeGh = join(fakeBin, 'gh');

  await mkdir(checkout);
  await mkdir(fakeBin);
  run('git', ['init', '--bare', remote]);
  run('git', ['init', '--initial-branch=main'], { cwd: checkout });
  run('git', ['config', 'user.name', 'Test User'], { cwd: checkout });
  run('git', ['config', 'user.email', 'test@example.com'], { cwd: checkout });
  await writeFile(join(checkout, '.gitignore'), '.source-repo/\n');
  await writeFile(join(checkout, 'guide.md'), 'before\n');
  run('git', ['add', '.gitignore', 'guide.md'], { cwd: checkout });
  run('git', ['commit', '-m', 'chore: initialize test repository'], { cwd: checkout });
  run('git', ['remote', 'add', 'origin', remote], { cwd: checkout });
  run('git', ['push', '-u', 'origin', 'main'], { cwd: checkout });

  await mkdir(join(checkout, '.source-repo'));
  await writeFile(join(checkout, '.source-repo', 'source.md'), 'ignored source checkout\n');
  await writeFile(join(checkout, 'guide.md'), 'after\n');
  await writeFile(
    fakeGh,
    `#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  echo "https://github.example.test/owner/repo/pull/1"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  echo false
  exit 0
fi
exit 0
`,
  );
  await chmod(fakeGh, 0o755);

  run('bash', [landingScript], {
    cwd: checkout,
    env: {
      ...process.env,
      BASE_BRANCH: 'main',
      GITHUB_REPOSITORY: 'owner/repo',
      GH_TOKEN: 'test-token',
      PATH: `${fakeBin}:${process.env.PATH}`,
      SOURCE_REPO: 'verygoodplugins/mcp-automem',
      SOURCE_SHA: '0123456789abcdef0123456789abcdef01234567',
      STRUCTURED_OUTPUT: JSON.stringify({
        confidence: 'CLEAR',
        fixes: [],
        questions: [],
        title: 'docs: update guide',
      }),
    },
  });

  assert.equal(run('git', ['branch', '--show-current'], { cwd: checkout }).trim(), 'docs/audit-mcp-automem-0123456');
  assert.equal(await readFile(join(checkout, 'guide.md'), 'utf8'), 'after\n');
  assert.equal(run('git', ['status', '--short'], { cwd: checkout }).trim(), '');
  assert.equal(run('git', ['show', 'HEAD:guide.md'], { cwd: checkout }), 'after\n');

  await writeFile(join(checkout, 'guide.md'), 'after second update\n');
  run('bash', [landingScript], {
    cwd: checkout,
    env: {
      ...process.env,
      BASE_BRANCH: 'main',
      GITHUB_REPOSITORY: 'owner/repo',
      GH_TOKEN: 'test-token',
      PATH: `${fakeBin}:${process.env.PATH}`,
      SOURCE_REPO: 'verygoodplugins/mcp-automem',
      SOURCE_SHA: '0123456789abcdef0123456789abcdef01234567',
      STRUCTURED_OUTPUT: JSON.stringify({
        confidence: 'CLEAR',
        fixes: [],
        questions: [],
        title: 'docs: update guide',
      }),
    },
  });

  assert.equal(await readFile(join(checkout, '.source-repo', 'source.md'), 'utf8'), 'ignored source checkout\n');
  assert.equal(run('git', ['status', '--short'], { cwd: checkout }).trim(), '');
  assert.equal(run('git', ['show', 'HEAD:guide.md'], { cwd: checkout }), 'after second update\n');
});
