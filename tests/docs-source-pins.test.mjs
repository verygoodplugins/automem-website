import assert from 'node:assert/strict';
import test from 'node:test';

import { currentRelease, pins } from './helpers/source-pins.mjs';

const sourceRepos = [
  'verygoodplugins/automem',
  'verygoodplugins/mcp-automem',
  'verygoodplugins/automem-graph-viewer',
];

test('source pins cover exactly the documented source repos', () => {
  assert.deepEqual(Object.keys(pins).sort(), [...sourceRepos].sort());
});

test('every source pin is a full commit SHA recorded once', () => {
  for (const repo of sourceRepos) {
    const { releases, legacy = [] } = pins[repo];
    assert.ok(releases.length > 0, `${repo} records no release`);

    const shas = [...releases, ...legacy].map(({ sha }) => sha);
    for (const sha of shas) assert.match(sha, /^[0-9a-f]{40}$/u, `${repo} pin ${sha}`);
    assert.equal(new Set(shas).size, shas.length, `${repo} records a pin twice`);
  }
});

test('releases carry their version and tag, newest first', () => {
  for (const repo of sourceRepos) {
    const { releases } = pins[repo];
    for (const { version, tag } of releases) {
      assert.match(version, /^\d+\.\d+\.\d+$/u, `${repo} version ${version}`);
      assert.ok(tag.endsWith(`v${version}`), `${repo} tag ${tag} does not name ${version}`);
    }

    const ordered = [...releases].sort((a, b) =>
      b.version.localeCompare(a.version, 'en', { numeric: true }),
    );
    assert.deepEqual(releases, ordered, `${repo} releases are not newest first`);
    assert.equal(currentRelease(repo.split('/')[1]), releases[0]);
  }
});

test('legacy pins explain why a page may still link to them', () => {
  for (const repo of sourceRepos) {
    for (const { note } of pins[repo].legacy ?? []) {
      assert.ok(note && note.length > 20, `${repo} legacy pin needs a note`);
    }
  }
});
