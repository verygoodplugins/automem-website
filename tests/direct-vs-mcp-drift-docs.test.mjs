import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift fixes for the Direct API vs MCP Tools page. Facts were checked against
// the mcp-automem sources recorded in scripts/docs-source-pins.json.

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/direct-vs-mcp.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function between(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected to find ${startPattern}`);
  const rest = page.slice(start + 1);
  const end = rest.search(endPattern);
  assert.notEqual(end, -1, `expected to find ${endPattern} after ${startPattern}`);
  return page.slice(start, start + 1 + end);
}

test('recall budgeting describes content previews with summary as an extra field', async () => {
  const page = await readPage();
  const budgeting = between(page, /\*\*MCP response budgeting/, /\*\*HTTP API equivalent:\*\*/);

  assert.match(budgeting, /Content longer than 400 characters is cut to a 400-character preview/);
  assert.match(budgeting, /`content_truncated` and `content_chars`/);
  assert.match(budgeting, /`summary` is kept as an additional field/);
  assert.match(budgeting, /only stands in for the preview in the text channel when `content` is empty/);
  assert.match(budgeting, /ID fetches via `memory_id` are never truncated/);

  assert.doesNotMatch(page, /summary-first/i);
  assert.doesNotMatch(budgeting, /shows that instead of a long `content` preview/);
});

test('check_database_health documents the degraded status', async () => {
  const page = await readPage();
  const section = between(page, /### check_database_health vs GET \/health/, /\n---/);

  assert.match(
    section,
    /\| `status` \| string \| Yes \| `"healthy"`, `"degraded"` \([^)]*backend or sync check needs attention\), or `"error"` \|/,
  );
  assert.doesNotMatch(section, /`"healthy"` or `"error"`/);
});

test('update_memory lists the t_valid and t_invalid validity window', async () => {
  const page = await readPage();
  const section = between(page, /### update_memory vs PATCH/, /### delete_memory vs DELETE/);

  assert.match(
    section,
    /\| `t_valid`, `t_invalid` \| string \| No \| ISO 8601 \|[^\n]*expires or was superseded/,
  );
  // The required field and the existing timestamp rows must stay.
  assert.match(section, /\| `memory_id` \| string \| Yes \|/);
  assert.match(section, /\| `timestamp` \| string \| No \|/);
  assert.match(section, /\| `updated_at` \| string \| No \|/);
});

test('associate_memories names every system or internal relation the tool rejects', async () => {
  const page = await readPage();
  const section = between(page, /### associate_memories vs POST \/associate/, /### update_memory vs/);

  assert.match(section, /`SIMILAR_TO`, `PRECEDED_BY`, and `DISCOVERED`/);
  for (const legacy of ['EXPLAINS', 'SHARES_THEME', 'PARALLEL_CONTEXT']) {
    assert.ok(section.includes(`\`${legacy}\``), `expected the non-input relation ${legacy}`);
  }
  assert.match(section, /legacy names to `DISCOVERED` with a matching `kind`/);
});

test('destructiveHint follows the MCP annotation meaning and still applies only to delete_memory', async () => {
  const page = await readPage();
  const annotations = between(page, /### MCP Tool Annotations/, /\n---/);

  assert.match(
    annotations,
    /\| `destructiveHint` \| boolean \| Tool may perform destructive updates \(only meaningful when `readOnlyHint` is false\) \| `delete_memory` only \|/,
  );
  assert.doesNotMatch(annotations, /permanently removes or modifies data/);
});

test('annotation glosses, health comparison and update_memory type follow the spec and source', async () => {
  const page = await readPage();

  assert.match(page, /\| `idempotentHint` \| boolean \| Repeated calls with the same arguments have no additional effect on the environment/);
  assert.doesNotMatch(page, /Same args always produce same result/);
  assert.doesNotMatch(page, /requires elevated confirmation before invocation/);
  assert.match(page, /annotation is an advisory hint that the tool may perform destructive updates/);
  assert.match(page, /`check_database_health` calls `GET \/health` and repackages the response rather than trimming it/);
  assert.doesNotMatch(page, /Simplified output only/);
  assert.equal(
    (page.match(/\| `type` \| string \| No \| enum: `Decision`, `Pattern`, `Preference`, `Style`, `Habit`, `Insight`, `Context` \|/g) || []).length,
    2,
  );
});
