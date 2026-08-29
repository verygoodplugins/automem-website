import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/memory-operations.md', import.meta.url),
);

const automemSha = 'e147c352b100ebbf29e6555453fdde5152066138';
const mcpSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('memory operations links to the pinned API and MCP surface sources', async () => {
  const page = await readPage();

  assert.match(page, new RegExp(`/automem/blob/${automemSha}/automem/api/memory\\.py`));
  assert.match(page, new RegExp(`/mcp-automem/blob/${mcpSha}/src/mcp-surface\\.ts`));
  assert.doesNotMatch(page, /mcp-automem\/blob\/[^\n)]*\/src\/index\.ts/);
});

test('memory creation documents server-generated IDs and source-valid Qdrant states', async () => {
  const page = await readPage();

  assert.match(page, /ignores any caller-supplied `id` and generates a UUID server-side/i);
  assert.match(page, /`stored`, `failed`, `queued`, `unconfigured`, or `null`/);
  assert.doesNotMatch(page, /Custom UUID \(auto-generated if omitted\)/);
  assert.doesNotMatch(page, /"qdrant": "ok"/);
});

test('batch ingestion reflects its object body, validation contract, and inline vector work', async () => {
  const page = await readPage();
  const batch = page.match(/## POST \/memory\/batch[\s\S]*?(?=\n---\n)/)?.[0] ?? '';

  assert.match(batch, /\{\s*"memories"\s*:\s*\[/);
  assert.match(batch, /does not accept `id`, `embedding`, `t_valid`, or `t_invalid`/i);
  assert.match(batch, /malformed, empty, and over-500 requests return `400 Bad Request`/i);
  assert.match(batch, /`status`, `code`, and `message`/);
  assert.match(batch, /synchronously generates embeddings and upserts successful vectors/i);
  assert.match(batch, /only embedding failures are queued for retry/i);
  assert.match(batch, /`stored \(N\)`, `queued`, or `queued \(fallback\)`/);
  assert.doesNotMatch(batch, /413 Payload Too Large/);
  assert.doesNotMatch(batch, /background embedding/i);
});

test('updates, tag enumeration, and MCP deletion retain their actual contracts', async () => {
  const page = await readPage();
  const patch = page.match(/## PATCH \/memory\/:id[\s\S]*?(?=\n---\n)/)?.[0] ?? '';
  const byTag = page.match(/## GET \/memory\/by-tag[\s\S]*?(?=\n---\n)/)?.[0] ?? '';
  const deletion = page.match(/### MCP Tool: `delete_memory`[\s\S]*?(?=\n---\n)/)?.[0] ?? '';

  assert.match(patch, /synchronously generates a fresh embedding and upserts it to Qdrant/i);
  assert.match(patch, /`updated_at`, `last_accessed`/);
  assert.doesNotMatch(patch, /Queue re-embedding/);
  assert.match(byTag, /does not hydrate related memories or include recall scoring/i);
  assert.doesNotMatch(byTag, /score.*importance/i);
  assert.match(deletion, /XOR with `tags`/);
  assert.match(deletion, /exact, case-insensitive/i);
  assert.doesNotMatch(deletion, /handles this gracefully/i);
});

test('the shared error envelope and tag policy reject stale examples', async () => {
  const page = await readPage();

  assert.match(page, /\{\s*"status": "error",\s*"code": 400,\s*"message":/);
  assert.doesNotMatch(page, /"error": "Invalid memory at index/);
  assert.match(page, /forbids platform and date-stamped tags/i);
  assert.doesNotMatch(page, /"2025-01"/);
});
