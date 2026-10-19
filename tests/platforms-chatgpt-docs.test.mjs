import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/chatgpt.md', import.meta.url),
);

async function readChatGptPage() {
  return readFile(pagePath, 'utf8');
}

function railwayCaution(page) {
  const caution = page.match(/:::caution\n([\s\S]*?)\n:::/);
  assert.ok(caution, 'expected the Railway caution block');
  return caution[1];
}

function connectionErrors(page) {
  const section = page.match(
    /### Memory service connection errors \(502\/504\)\n([\s\S]*?)\n### Variable resolution failures/,
  );
  assert.ok(section, 'expected the memory service connection errors section');
  return section[1];
}

test('ChatGPT page says the memory service defaults to port 8001 when PORT is unset', async () => {
  const page = await readChatGptPage();
  const caution = railwayCaution(page);

  assert.match(caution, /memory-service\.railway\.internal:8001/);
  assert.match(caution, /listens on `PORT`/);
  assert.match(caution, /falls back to `8001` only when `PORT` is unset/);
  assert.match(
    caution,
    /port in `AUTOMEM_API_URL` must match the port the service is actually listening on/,
  );
  assert.match(
    caution,
    /Set `PORT=8001` explicitly on the memory service rather than relying on the fallback/,
  );
});

test('ChatGPT page no longer tells readers to set PORT=8001 to avoid a Flask 5000 default', async () => {
  const page = await readChatGptPage();

  assert.doesNotMatch(page, /Flask defaults to port 5000/);
  assert.doesNotMatch(page, /\b5000\b/);
  assert.doesNotMatch(page, /\*\*must\*\* have `PORT=8001`/);
  assert.doesNotMatch(page, /Missing `PORT=8001`/);
  assert.doesNotMatch(page, /Add `PORT=8001` to memory service environment variables/);
});

test('ChatGPT connection error table diagnoses a port mismatch instead of a missing PORT', async () => {
  const page = await readChatGptPage();
  const errors = connectionErrors(page);

  assert.match(errors, /Memory service listening on a different port/);
  assert.match(
    errors,
    /Set `PORT=8001` explicitly on the memory service so it matches the port in `AUTOMEM_API_URL`, then redeploy/,
  );
  assert.match(errors, /AutoMem uses `8001` only when `PORT` is unset/);

  // The other two causes stay in the table.
  assert.match(errors, /Wrong internal hostname/);
  assert.match(errors, /Service not running/);
});

test('ChatGPT page source links use a validated AutoMem revision', async () => {
  const page = await readChatGptPage();
  const links = [
    ...page.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([0-9a-f]{7,40})\/(automem\/[^\s)#]+)(#L\d+(?:-L\d+)?)?/g,
    ),
  ];
  const portDefault = links.find(([, , file]) => file === 'automem/runtime_wiring.py');

  assert.ok(portDefault, 'expected a source link for the PORT default');
  assert.equal(portDefault[3], '#L81-L83');
  assert.ok(
    links.every(([, sha]) => isPinnedSha('automem', sha)),
    'ChatGPT page AutoMem source links must use a pinned AutoMem revision',
  );
});
