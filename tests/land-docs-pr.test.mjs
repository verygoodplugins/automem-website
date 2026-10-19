import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..');
const landingScript = join(projectRoot, '.github/scripts/land-docs-pr.sh');
const prepareScript = join(projectRoot, '.github/scripts/prepare-docs-branch.sh');

const sourceSha = '0123456789abcdef0123456789abcdef01234567';
const pinsPath = 'scripts/docs-source-pins.json';
const initialPins = {
  'verygoodplugins/mcp-automem': {
    releases: [{ version: '0.16.0', tag: 'mcp-automem-v0.16.0', sha: 'a'.repeat(40) }],
  },
};

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

// A checkout of a docs repo with a bare origin and a fake gh that records calls.
async function makeWorkspace(t) {
  const workspace = await mkdtemp(join(tmpdir(), 'land-docs-pr-'));
  t.after(() => rm(workspace, { force: true, recursive: true }));

  const remote = join(workspace, 'remote.git');
  const checkout = join(workspace, 'checkout');
  const fakeBin = join(workspace, 'bin');
  const ghLog = join(workspace, 'gh.log');
  const ghBody = join(workspace, 'gh-body.md');

  await mkdir(join(checkout, 'scripts'), { recursive: true });
  await mkdir(fakeBin);
  run('git', ['init', '--bare', remote]);
  run('git', ['init', '--initial-branch=main'], { cwd: checkout });
  run('git', ['config', 'user.name', 'Test User'], { cwd: checkout });
  run('git', ['config', 'user.email', 'test@example.com'], { cwd: checkout });
  await writeFile(join(checkout, '.gitignore'), '.source-repo/\n');
  await writeFile(join(checkout, 'guide.md'), 'before\n');
  await writeFile(join(checkout, pinsPath), `${JSON.stringify(initialPins, null, 2)}\n`);
  run('git', ['add', '.gitignore', 'guide.md', pinsPath], { cwd: checkout });
  run('git', ['commit', '-m', 'chore: initialize test repository'], { cwd: checkout });
  run('git', ['remote', 'add', 'origin', remote], { cwd: checkout });
  run('git', ['push', '-u', 'origin', 'main'], { cwd: checkout });

  await writeFile(
    join(fakeBin, 'gh'),
    `#!/usr/bin/env bash
set -euo pipefail
echo "$*" >> "${ghLog}"
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  printf '%s' "\${GH_OPEN_PR:-}"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  while [ $# -gt 0 ]; do
    if [ "$1" = "--body-file" ]; then cp "$2" "${ghBody}"; fi
    shift
  done
  echo "https://github.example.test/owner/repo/pull/1"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  echo "\${GH_IS_DRAFT:-false}"
  exit 0
fi
exit 0
`,
  );
  await chmod(join(fakeBin, 'gh'), 0o755);

  const env = (overrides = {}) => ({
    ...process.env,
    BASE_BRANCH: 'main',
    GITHUB_REPOSITORY: 'owner/repo',
    GH_TOKEN: 'test-token',
    PATH: `${fakeBin}:${process.env.PATH}`,
    SOURCE_REPO: 'verygoodplugins/mcp-automem',
    SOURCE_SHA: sourceSha,
    DOCS_TEST_CMD: 'true',
    STRUCTURED_OUTPUT: JSON.stringify({
      confidence: 'CLEAR',
      fixes: [],
      questions: [],
      title: 'docs: update guide',
    }),
    ...overrides,
  });

  const readGhLog = async () => readFile(ghLog, 'utf8').catch(() => '');
  return { checkout, remote, env, ghBody, readGhLog };
}

test('lands updates on the rolling branch without staging the ignored source checkout', async (t) => {
  const { checkout, env } = await makeWorkspace(t);

  await mkdir(join(checkout, '.source-repo'));
  await writeFile(join(checkout, '.source-repo', 'source.md'), 'ignored source checkout\n');
  await writeFile(join(checkout, 'guide.md'), 'after\n');

  run('bash', [landingScript], { cwd: checkout, env: env() });

  assert.equal(run('git', ['branch', '--show-current'], { cwd: checkout }).trim(), 'docs/audit-mcp-automem');
  assert.equal(await readFile(join(checkout, 'guide.md'), 'utf8'), 'after\n');
  assert.equal(run('git', ['status', '--short'], { cwd: checkout }).trim(), '');
  assert.equal(run('git', ['show', 'HEAD:guide.md'], { cwd: checkout }), 'after\n');

  await writeFile(join(checkout, 'guide.md'), 'after second update\n');
  run('bash', [landingScript], { cwd: checkout, env: env() });

  assert.equal(await readFile(join(checkout, '.source-repo', 'source.md'), 'utf8'), 'ignored source checkout\n');
  assert.equal(run('git', ['status', '--short'], { cwd: checkout }).trim(), '');
  assert.equal(run('git', ['show', 'HEAD:guide.md'], { cwd: checkout }), 'after second update\n');
  assert.equal(
    run('git', ['rev-parse', 'refs/heads/docs/audit-mcp-automem'], { cwd: checkout }).trim(),
    run('git', ['ls-remote', 'origin', 'refs/heads/docs/audit-mcp-automem'], { cwd: checkout }).split('\t')[0],
  );
});

test('a failing test suite lands the PR as a HOLD draft that names the failures', async (t) => {
  const { checkout, env, ghBody, readGhLog } = await makeWorkspace(t);
  await writeFile(join(checkout, 'guide.md'), 'after\n');

  run('bash', [landingScript], {
    cwd: checkout,
    env: env({ DOCS_TEST_CMD: `echo "✖ memory operations links to every pinned source (1.2ms)"; exit 1` }),
  });

  const body = await readFile(ghBody, 'utf8');
  assert.match(body, /<!-- DOCS-AUDIT: HOLD -->/u);
  assert.doesNotMatch(body, /DOCS-AUDIT: CLEAR/u);
  assert.match(body, /## Failing tests/u);
  assert.match(body, /- memory operations links to every pinned source$/mu);
  assert.match(await readGhLog(), /^pr create .*--draft$/mu);
});

test('a release with no doc edits drops the pin bump and pushes nothing', async (t) => {
  const { checkout, env, readGhLog } = await makeWorkspace(t);
  await writeFile(join(checkout, pinsPath), '{"bumped": true}\n');

  run('bash', [landingScript], {
    cwd: checkout,
    env: env({
      STRUCTURED_OUTPUT: JSON.stringify({ confidence: 'NO_CHANGES', fixes: [], questions: [], title: '' }),
    }),
  });

  assert.equal(run('git', ['status', '--short'], { cwd: checkout }).trim(), '');
  assert.equal(run('git', ['ls-remote', 'origin', 'refs/heads/docs/audit-mcp-automem'], { cwd: checkout }), '');
  assert.doesNotMatch(await readGhLog(), /pr create/u);
});

test('prepare starts the rolling branch from main and records the release pin', async (t) => {
  const { checkout, env } = await makeWorkspace(t);
  const releaseSha = 'b'.repeat(40);

  run('bash', [prepareScript], {
    cwd: checkout,
    env: env({ SOURCE_SHA: releaseSha, RELEASE_TAG: 'mcp-automem-v0.16.1' }),
  });

  assert.equal(run('git', ['branch', '--show-current'], { cwd: checkout }).trim(), 'docs/audit-mcp-automem');
  const pins = JSON.parse(await readFile(join(checkout, pinsPath), 'utf8'));
  assert.deepEqual(pins['verygoodplugins/mcp-automem'].releases.map(({ version }) => version), ['0.16.1', '0.16.0']);
  assert.deepEqual(pins['verygoodplugins/mcp-automem'].releases[0], {
    version: '0.16.1',
    tag: 'mcp-automem-v0.16.1',
    sha: releaseSha,
  });
});

test('prepare stacks a new release on the open rolling PR after merging main', async (t) => {
  const { checkout, env } = await makeWorkspace(t);

  // An open rolling PR carrying an unmerged edit, then main moves on.
  run('git', ['checkout', '-b', 'docs/audit-mcp-automem'], { cwd: checkout });
  await writeFile(join(checkout, 'guide.md'), 'unmerged release edit\n');
  run('git', ['commit', '-am', 'docs: earlier release'], { cwd: checkout });
  run('git', ['push', 'origin', 'docs/audit-mcp-automem'], { cwd: checkout });
  run('git', ['checkout', 'main'], { cwd: checkout });
  await writeFile(join(checkout, 'other.md'), 'main moved on\n');
  run('git', ['add', 'other.md'], { cwd: checkout });
  run('git', ['commit', '-m', 'docs: unrelated main change'], { cwd: checkout });
  run('git', ['push', 'origin', 'main'], { cwd: checkout });

  run('bash', [prepareScript], { cwd: checkout, env: env({ GH_OPEN_PR: '7' }) });

  assert.equal(run('git', ['branch', '--show-current'], { cwd: checkout }).trim(), 'docs/audit-mcp-automem');
  assert.equal(await readFile(join(checkout, 'guide.md'), 'utf8'), 'unmerged release edit\n');
  assert.equal(await readFile(join(checkout, 'other.md'), 'utf8'), 'main moved on\n');
});

test('a closed rolling PR restarts from main and replaces the stale branch', async (t) => {
  const { checkout, env } = await makeWorkspace(t);

  run('git', ['checkout', '-b', 'docs/audit-mcp-automem'], { cwd: checkout });
  await writeFile(join(checkout, 'guide.md'), 'stale closed-PR edit\n');
  run('git', ['commit', '-am', 'docs: stale edit'], { cwd: checkout });
  run('git', ['push', 'origin', 'docs/audit-mcp-automem'], { cwd: checkout });
  const staleSha = run('git', ['rev-parse', 'HEAD'], { cwd: checkout }).trim();
  run('git', ['checkout', 'main'], { cwd: checkout });

  run('bash', [prepareScript], { cwd: checkout, env: env() });
  assert.equal(await readFile(join(checkout, 'guide.md'), 'utf8'), 'before\n');
  await writeFile(join(checkout, 'guide.md'), 'fresh release edit\n');
  run('bash', [landingScript], { cwd: checkout, env: env() });

  const remoteHead = run('git', ['ls-remote', 'origin', 'refs/heads/docs/audit-mcp-automem'], { cwd: checkout }).split('\t')[0];
  assert.equal(remoteHead, run('git', ['rev-parse', 'HEAD'], { cwd: checkout }).trim());
  assert.notEqual(remoteHead, staleSha);
  assert.equal(run('git', ['show', `${remoteHead}:guide.md`], { cwd: checkout }), 'fresh release edit\n');
});

test('landing refuses to rewrite an open rolling PR it did not build on', async (t) => {
  const { checkout, remote, env } = await makeWorkspace(t);

  run('git', ['checkout', '-b', 'docs/audit-mcp-automem'], { cwd: checkout });
  await writeFile(join(checkout, 'guide.md'), 'open PR edit\n');
  run('git', ['commit', '-am', 'docs: open PR edit'], { cwd: checkout });
  run('git', ['push', 'origin', 'docs/audit-mcp-automem'], { cwd: checkout });
  const openSha = run('git', ['rev-parse', 'HEAD'], { cwd: checkout }).trim();
  run('git', ['checkout', 'main'], { cwd: checkout });
  run('git', ['branch', '-D', 'docs/audit-mcp-automem'], { cwd: checkout });

  await writeFile(join(checkout, 'other.md'), 'edit made without the open PR\n');
  assert.throws(() =>
    run('bash', [landingScript], {
      cwd: checkout,
      env: env({ GH_OPEN_PR: 'https://github.example.test/owner/repo/pull/7' }),
    }),
  );
  assert.equal(
    run('git', ['--git-dir', remote, 'rev-parse', 'refs/heads/docs/audit-mcp-automem']).trim(),
    openSha,
  );
});
