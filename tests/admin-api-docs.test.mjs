import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/admin.md', import.meta.url),
);
const sourceSha = '5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb';

async function readAdminPage() {
  return readFile(pagePath, 'utf8');
}

test('admin API source links use the current validated AutoMem revision', async () => {
  const page = await readAdminPage();
  const links = [
    ...page.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\//g),
  ];

  assert.ok(links.length >= 4, 'expected current source links for the admin API page');
  assert.ok(
    links.every(([, sha]) => sha === sourceSha),
    'admin API source links must use the validated current AutoMem revision',
  );
});

test('admin API scopes the shared error envelope to HTTP exceptions', async () => {
  const page = await readAdminPage();
  const errorResponses = page.match(/### Error Responses\n([\s\S]*?)\n---/);

  assert.ok(errorResponses, 'expected an Error Responses section');
  assert.match(errorResponses[1], /HTTP exception path/i);
  assert.match(errorResponses[1], /do not assume it applies to every error response/i);
  assert.match(errorResponses[1], /`\{"status": "error", "code": 401, "message": "Unauthorized"\}`/);
});

test('admin API documents reprocess input normalization and deterministic results', async () => {
  const page = await readAdminPage();
  const reprocess = page.match(/## POST \/enrichment\/reprocess\n([\s\S]*?)\n---/);

  assert.ok(reprocess, 'expected a reprocess section');
  assert.match(reprocess[1], /array\[string\] \\\\?\| string/);
  assert.match(reprocess[1], /`\?ids=` is used when the body has no `ids` value/i);
  assert.match(reprocess[1], /deduplicates IDs/i);
  assert.match(reprocess[1], /`forced=True`/);
  assert.match(reprocess[1], /Deduplicated memory UUIDs queued, sorted lexicographically/);
});
