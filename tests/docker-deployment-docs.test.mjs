import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dockerGuidePath = fileURLToPath(
  new URL('../src/content/docs/docs/deployment/docker.md', import.meta.url),
);
const sourceSha = '5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb';

async function readDockerGuide() {
  return readFile(dockerGuidePath, 'utf8');
}

test('Docker guide is pinned to the current Compose source', async () => {
  const guide = await readDockerGuide();

  assert.match(guide, new RegExp(`automem/blob/${sourceSha}/docker-compose\\.yml`));
  assert.match(guide, /API\["flask-api/);
});

test('Docker guide documents password-aware dependency health and degradation', async () => {
  const guide = await readDockerGuide();

  assert.match(guide, /redis-cli -a.*REDIS_PASSWORD.*ping.*redis-cli ping/is);
  assert.match(guide, /`"qdrant": "disconnected"`[\s\S]*overall `"status"` is `"degraded"`/);
});

test('Docker guide does not promise a Flask debugger or hot reload', async () => {
  const guide = await readDockerGuide();

  assert.match(guide, /runs with `debug=False`[\s\S]*does not enable Flask debug mode or hot reload/i);
  assert.match(guide, /restart the `flask-api` container/i);
  assert.doesNotMatch(guide, /set `LOG_LEVEL=INFO` or `WARNING`/i);
});
