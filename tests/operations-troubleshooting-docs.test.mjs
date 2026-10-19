import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha, pins } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/operations/troubleshooting.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, startHeading, endHeading) {
  const start = page.indexOf(startHeading);
  assert.notEqual(start, -1, `expected heading ${startHeading}`);
  const end = page.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(end, -1, `expected heading ${endHeading} after ${startHeading}`);
  return page.slice(start, end);
}

// Every AutoMem source link in `text` that points at `sourcePath`, as { sha, anchor }.
function automemLinks(text, sourcePath) {
  const escaped = sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `https://github\\.com/verygoodplugins/automem/blob/([^/]+)/${escaped}(#L\\d+-L\\d+)?`,
    'g',
  );
  return [...text.matchAll(pattern)].map(([, sha, anchor]) => ({ sha, anchor }));
}

function assertPublishedReleaseLink(link, label) {
  assert.ok(isPinnedSha('automem', link.sha), `${label} must use a recorded AutoMem pin`);
  assert.ok(
    pins['verygoodplugins/automem'].releases.some(({ sha }) => sha === link.sha),
    `${label} must use a published AutoMem release, not a legacy pin`,
  );
  assert.match(link.anchor ?? '', /^#L\d+-L\d+$/, `${label} must keep a line anchor`);
}

const option1Start = '**Option 1: Auto-detect existing dimensions (safe)**';
const option1End = '**Option 2: Reset Qdrant collection (data loss)**';

test('troubleshooting labels the health monitor with its scripts/ path', async () => {
  const page = await readPage();
  const diagram = section(
    page,
    '#### Understanding Drift Thresholds',
    '**Default thresholds:**',
  );

  assert.match(diagram, /Monitor\["Health Monitor<br\/>scripts\/health_monitor\.py"\]/);
  assert.doesNotMatch(diagram, /<br\/>health_monitor\.py/);
});

test('troubleshooting enables drift auto-recovery with the CLI flag, not an environment variable', async () => {
  const page = await readPage();
  const recovery = section(
    page,
    '**Option 1: Auto-Recovery (if enabled)**',
    '**Option 2: Manual Recovery**',
  );

  assert.match(recovery, /off by default/i);
  assert.match(recovery, /`--auto-recover` flag/);
  assert.match(recovery, /python scripts\/health_monitor\.py --auto-recover/);
  assert.match(recovery, /no environment variable/i);
  assert.doesNotMatch(page, /HEALTH_MONITOR_AUTO_RECOVER/);
});

test('troubleshooting names the 768d setup behind the dimension mismatch example', async () => {
  const page = await readPage();
  const causes = section(
    page,
    '#### Root Cause: Changed Provider or Model',
    '#### Solution: Reconfigure or Reset Collection',
  );

  assert.match(causes, /\*\*Scenario 1:\*\*[^\n]*`VECTOR_SIZE=768`[^\n]*Voyage \(1024d\)/);
  assert.doesNotMatch(causes, /OpenAI \(768d\)/);
  assert.doesNotMatch(causes, /FastEmbed \(768d\)/);
});

test('troubleshooting documents VECTOR_SIZE_AUTODETECT and its strict-mode runtime behavior', async () => {
  const page = await readPage();
  const option1 = section(page, option1Start, option1End);

  assert.match(option1, /`VECTOR_SIZE_AUTODETECT`, which defaults to `true`/);
  assert.match(option1, /adopts the existing collection's dimension/);
  assert.match(option1, /does not convert vectors from a different model/i);
  assert.match(option1, /use Option 2 or 3 to re-embed/);

  // Strict mode raises, but the startup path swallows it and disables Qdrant.
  assert.match(option1, /`VECTOR_SIZE_AUTODETECT=false` enforces strict matching/);
  assert.match(option1, /`VectorDimensionMismatchError`/);
  assert.match(option1, /FATAL: Vector dimension mismatch detected!/);
  assert.match(option1, /Failed to ensure Qdrant collection; disabling client/);
  assert.match(option1, /Qdrant client disabled/);
  assert.doesNotMatch(option1, /exits?\b|startup fails|aborts?\b/i);

  // The old source pointer and knob were wrong.
  assert.doesNotMatch(option1, /EMBEDDING_PROVIDER=auto/);
  assert.doesNotMatch(option1, /automem\/api\/memory\.py/);
});

test('troubleshooting points dimension auto-detection at validation.py and runtime_clients.py', async () => {
  const page = await readPage();
  const option1 = section(page, option1Start, option1End);

  const validation = automemLinks(option1, 'automem/utils/validation.py');
  assert.equal(validation.length, 1, 'expected one validation.py link');
  assertPublishedReleaseLink(validation[0], 'validation.py link');

  const runtimeClients = automemLinks(option1, 'automem/stores/runtime_clients.py');
  assert.equal(runtimeClients.length, 1, 'expected one runtime_clients.py link');
  assertPublishedReleaseLink(runtimeClients[0], 'runtime_clients.py link');
});

test('troubleshooting locates Qdrant payload index setup in runtime_clients.py', async () => {
  const page = await readPage();
  const indexes = section(page, '**2. Verify indexes:**', '**3. Limit expansion:**');

  assert.match(indexes, /payload indexes/i);
  assert.match(indexes, /`tags`, `tag_prefixes`, and `type`/);
  assert.match(indexes, /`QDRANT_ENSURE_PAYLOAD_INDEXES`/);
  assert.match(indexes, /runs by default/i);
  assert.doesNotMatch(indexes, /vector_store\.py/);
  assert.doesNotMatch(indexes, /keyword index/i);

  const links = automemLinks(indexes, 'automem/stores/runtime_clients.py');
  assert.equal(links.length, 1, 'expected one runtime_clients.py link');
  assertPublishedReleaseLink(links[0], 'payload index link');
});
