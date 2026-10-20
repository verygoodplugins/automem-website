import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// Drift fixes for reference/api/relationships.md. Facts checked against the
// pinned AutoMem and mcp-automem releases recorded in scripts/docs-source-pins.json.

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/api/relationships.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `expected to find ${endMarker} after ${startMarker}`);
  return text.slice(start, end);
}

test('validation flow checks strength before the IDs and the graph before the memory lookup', async () => {
  const page = await readPage();
  const flow = between(page, '### Validation Flow', '\n---\n');

  assert.match(flow, /Single-pair checks run in the order shown/u);
  assert.match(flow, /`strength` is checked before the IDs/u);
  assert.match(flow, /FalkorDB availability is checked before the memories are looked up/u);

  const edges = [
    'AuthCheck -->|Yes| BodyCheck',
    'BodyCheck -->|Yes| StrengthCheck',
    'StrengthCheck -->|Yes| FieldCheck',
    'FieldCheck -->|Yes| UuidCheck',
    'UuidCheck -->|Yes| SelfCheck',
    'SelfCheck -->|No| TypeCheck',
    'TypeCheck -->|Yes| GraphCheck',
    'GraphCheck -->|Yes| CreateEdge',
    'CreateEdge -->|Query ran| MemoryCheck',
    'MemoryCheck -->|Yes| Success',
  ];
  let previous = -1;
  for (const edge of edges) {
    const index = flow.indexOf(edge);
    assert.notEqual(index, -1, `expected flow edge ${edge}`);
    assert.ok(index > previous, `flow edge ${edge} is out of order`);
    previous = index;
  }

  assert.match(flow, /GraphCheck -->\|No\| Err503/u);
  assert.match(flow, /CreateEdge -->\|Query error\| Err500/u);
  assert.match(flow, /MemoryCheck -->\|No\| Err404/u);
  assert.doesNotMatch(flow, /CreateEdge -->\|DB Down\| Err503/u);
  assert.doesNotMatch(flow, /StrengthCheck -->\|Yes\| MemoryCheck/u);
});

test('error responses document the importance-worded strength error and the UUID error', async () => {
  const page = await readPage();
  const errors = between(page, '### Error Responses', '\n---\n');

  assert.ok(
    errors.includes(
      '"status": "error",\n  "code": 400,\n  "message": "\'importance\' must be between 0 and 1"',
    ),
    'expected the out-of-range strength error body',
  );
  assert.match(errors, /the message names `importance`/u);
  assert.match(errors, /"'importance' must be a number"/u);
  assert.ok(
    errors.includes('"status": "error",\n  "code": 400,\n  "message": "memory_id must be a valid UUID"'),
    'expected the invalid UUID error body',
  );
});

test('batch 201 vs 207 note says a bad strength rejects the whole request', async () => {
  const page = await readPage();
  const note = between(page, ':::note[201 vs 207]', '\n:::\n');

  assert.match(note, /A `strength` that is not a number or is outside 0\.0–1\.0 is the exception/u);
  assert.match(note, /rejects the whole request with the same `400` and `'importance'` messages as a single pair/u);
  assert.match(note, /before anything is written/u);
});

test('older-service caution quotes the client message with the item count', async () => {
  const page = await readPage();
  const caution = between(page, ':::caution[AutoMem service version requirement for batch mode]', '\n:::\n');

  assert.match(caution, /or send the N association\(s\) one per call\./u);
  assert.match(caution, /`N` is the number of items in the batch/u);
  assert.doesNotMatch(caution, /send the associations one per call/u);
});

test('MCP section documents batch mode and the batch output fields', async () => {
  const page = await readPage();
  const tool = between(page, '## MCP Tool: `associate_memories`', '### Association Creation Data Flow');
  const input = between(tool, '### Input Schema', '### Output Schema');
  const output = tool.slice(tool.indexOf('### Output Schema'));

  assert.match(
    input,
    /^\| `associations` \| array of objects \| Batch mode \| 1–500 items \|[^\n]*Do not combine with the top-level pair fields \|$/mu,
  );
  assert.match(input, /:::note\[Batch mode\]/u);
  assert.match(input, /required only when `associations` is not an array/u);
  assert.match(input, /empty, has more than 500 items, or is combined with any top-level pair field/u);
  assert.match(input, /\[Batch Associations\]\(#batch-associations\)/u);

  assert.match(
    output,
    /^\| `success` \| boolean \| Yes \| Whether every requested association was created; `false` for partial batch results \|$/mu,
  );
  for (const field of ['created_count', 'failed_count', 'succeeded', 'failed', 'summary']) {
    assert.match(output, new RegExp(`^\\| \`${field}\` \\| (?:integer|array|string) \\| No \\| Batch mode:`, 'mu'));
  }
  assert.doesNotMatch(output, /Whether association was created\b/u);
});

test('MCP strength stays required with no default while REST keeps the 0.5 default', async () => {
  const page = await readPage();
  const tool = between(page, '## MCP Tool: `associate_memories`', '### Output Schema');

  assert.match(tool, /^\| `strength` \| number \| Yes \| 0\.0–1\.0 \| Relationship strength\. The MCP tool has no default \|$/mu);
  assert.doesNotMatch(tool, /default 0\.5/u);
  assert.match(page, /^\| `strength` \| float \| No \| Edge weight 0\.0–1\.0 \(default: 0\.5\) \|$/mu);
});

test('relationships page does not claim the MCP server validates the type enum', async () => {
  const page = await readFile(fileURLToPath(new URL('../src/content/docs/docs/reference/api/relationships.md', import.meta.url)), 'utf8');

  assert.doesNotMatch(page, /validates the enum at request time/u);
  assert.match(page, /the mcp-automem server does not check arguments against it: the client only requires `type` to be present/u);
  assert.match(page, /required only when `associations` is not an array/u);
});

test('relationships sequence diagram declares participants with mermaid alias syntax', async () => {
  const page = await readFile(fileURLToPath(new URL('../src/content/docs/docs/reference/api/relationships.md', import.meta.url)), 'utf8');

  assert.doesNotMatch(page, /participant [A-Za-z_]+\[/u);
  assert.match(page, /participant Flask as automem\/api\/memory\.py<br\/>POST \/associate/u);
});
