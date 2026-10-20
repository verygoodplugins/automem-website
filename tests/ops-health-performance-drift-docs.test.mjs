import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pinnedShaPattern } from './helpers/source-pins.mjs';

// Drift fixes for operations/health and operations/performance. Facts were
// verified against the AutoMem release recorded in scripts/docs-source-pins.json
// (scripts/health_monitor.py, automem/api/health.py, automem/api/recall.py,
// automem/api/memory.py and the embedding worker).

const docsRoot = new URL('../src/content/docs/docs/operations/', import.meta.url);

async function readDoc(name) {
  return readFile(fileURLToPath(new URL(name, docsRoot)), 'utf8');
}

function section(page, heading, nextHeading) {
  const start = page.indexOf(heading);
  assert.notEqual(start, -1, `expected section ${heading}`);
  const end = nextHeading ? page.indexOf(nextHeading, start + heading.length) : page.length;
  assert.notEqual(end, -1, `expected ${nextHeading} after ${heading}`);
  return page.slice(start, end);
}

test('health startup recall permalink starts at the route decorator on a pinned revision', async () => {
  const page = await readDoc('health.md');
  const sha = pinnedShaPattern('automem');

  assert.match(
    page,
    new RegExp(`\\[startup recall handler\\]\\(https://github\\.com/verygoodplugins/automem/blob/${sha}/automem/api/recall\\.py#L2696-L2753\\)`),
  );
  assert.doesNotMatch(page, /recall\.py#L2693-L2753/);
});

test('health drift formula divides by the Qdrant count floored at 1', async () => {
  const page = await readDoc('health.md');

  assert.match(page, /\|falkordb_count - qdrant_count\| \/ max\(qdrant_count, 1\) \* 100/);
  assert.match(page, /\|FK - QD\| \/ max\(QD, 1\)/);
  assert.equal(
    page.match(/abs\(falkor - qdrant\) \/ max\(qdrant, 1\)/g)?.length,
    2,
    'both diagrams use the real denominator',
  );
  assert.match(page, /The denominator is the Qdrant count, floored at 1/);
  assert.doesNotMatch(page, /max\(falkordb_count, qdrant_count\)/);
  assert.doesNotMatch(page, /max\(FK, QD\)/);
  assert.doesNotMatch(page, /max\(falkor, qdrant\)/);
});

test('health threshold flowchart has the three real bands and names the flags', async () => {
  const page = await readDoc('health.md');
  const flowchart = section(page, '#### Understanding Drift Thresholds', '## Deployment Options');
  const causes = section(page, '**Common Causes of Drift:**', '#### Understanding Drift Thresholds');
  const troubleshooting = section(
    page,
    '### Problem: Health Monitor Shows High Drift',
    '### Problem: Health Endpoint Reports Degraded',
  );

  assert.doesNotMatch(flowchart, /"< 1%"/);
  assert.doesNotMatch(flowchart, /"1-5%"/);
  assert.match(flowchart, /--drift-threshold/);
  assert.match(flowchart, /--critical-threshold/);
  assert.doesNotMatch(flowchart, /HEALTH_MONITOR_DRIFT_THRESHOLD/);
  assert.doesNotMatch(flowchart, /HEALTH_MONITOR_CRITICAL_THRESHOLD/);

  assert.doesNotMatch(causes, /< 1% drift/);
  assert.doesNotMatch(causes, /5-10% drift/);
  assert.match(causes, /Up to the warning threshold \(5%\)/);

  assert.doesNotMatch(troubleshooting, /5-10% drift/);
  assert.match(troubleshooting, /\*\*5-50% drift\*\*/);
});

test('health troubleshooting example matches the monitor arithmetic', async () => {
  const page = await readDoc('health.md');
  const troubleshooting = section(
    page,
    '### Problem: Health Monitor Shows High Drift',
    '### Problem: Health Endpoint Reports Degraded',
  );
  const falkor = Number(troubleshooting.match(/FalkorDB: (\d+) memories/)[1]);
  const qdrant = Number(troubleshooting.match(/Qdrant: (\d+) vectors/)[1]);
  const drift = (Math.abs(falkor - qdrant) / Math.max(qdrant, 1)) * 100;

  assert.match(troubleshooting, new RegExp(`Warning: ${drift.toFixed(1)}% drift detected`));
  assert.doesNotMatch(troubleshooting, /Warning: 12% drift detected/);
});

test('health explains that the CLI threshold flags override the threshold env vars', async () => {
  const page = await readDoc('health.md');
  const options = section(page, '### Monitor Command Options', '## Monitoring Best Practices');

  assert.match(options, /copies `--drift-threshold` and `--critical-threshold` into the `HEALTH_MONITOR_DRIFT_THRESHOLD` and `HEALTH_MONITOR_CRITICAL_THRESHOLD` environment variables/);
  assert.match(options, /a value set only in the environment is overwritten/);
  assert.match(options, /Set the thresholds with the flags/);
});

test('health does not claim the webhook payload works for Slack and Discord as is', async () => {
  const page = await readDoc('health.md');
  const slack = section(page, '### Slack Integration', '### Discord Integration');
  const discord = section(page, '### Discord Integration', '### Custom Webhook Endpoint');
  const options = section(page, '### Monitor Command Options', '## Monitoring Best Practices');

  assert.doesNotMatch(page, /Discord webhooks use the same format as Slack/);
  assert.doesNotMatch(options, /\| Slack\/Discord webhook URL \|/);
  assert.match(options, /URL that receives the JSON alert payload/);

  assert.match(slack, /does not add a `text` field/);
  assert.match(slack, /relay/);
  assert.doesNotMatch(slack, /hooks\.slack\.com\/services/);
  assert.match(slack, /does not check the response status/);

  assert.match(discord, /`content` \(or `embeds`\)/);
  assert.match(discord, /the monitor sends neither/);
  assert.match(discord, /relay/);
});

test('health structured logging section reports what the endpoints really log', async () => {
  const page = await readDoc('health.md');
  const logging = section(page, '## Structured Logging');

  assert.doesNotMatch(page, /All three monitoring endpoints emit structured logs/);
  assert.doesNotMatch(page, /logs connection check results and memory counts/);
  assert.doesNotMatch(page, /logs query execution times for each analytics query/);
  assert.doesNotMatch(page, /logs number of memories returned by each phase/);

  assert.match(logging, /None of the three monitoring endpoints logs a structured event on a successful request/);
  assert.match(logging, /`\/health`: no endpoint-specific logging/);
  assert.match(logging, /`\/analyze`: logs only a failure/);
  assert.match(logging, /`\/startup-recall`: logs only a failure/);
  assert.match(logging, /`recall_complete` \(`GET \/recall`\)/);
  assert.match(logging, /stock log format prints only the message/);
  assert.match(logging, /custom or JSON formatter/);
});

test('performance memory-create diagram shows the 201 the route returns', async () => {
  const page = await readDoc('performance.md');

  assert.match(page, /Return\["Return 201 Created<br\/>100-150ms total"\]/);
  assert.doesNotMatch(page, /Return 200 OK/);
});

test('performance batching steps do not say the deadline is checked after each get()', async () => {
  const page = await readDoc('performance.md');
  const implementation = section(page, '### Implementation', '### Key Functions');

  assert.match(
    implementation,
    /3\. Check if `len\(batch\) >= EMBEDDING_BATCH_SIZE`\. The batch deadline is not checked after a successful `get\(\)`/,
  );
  assert.match(implementation, /4\. If the batch is full, call `process_embedding_batch\(\)`/);
  assert.doesNotMatch(page, /or timeout elapsed/);
  assert.doesNotMatch(page, /If batch ready/);
});

test('performance memory store log table lists the status values the route emits', async () => {
  const page = await readDoc('performance.md');
  const table = section(
    page,
    '### Memory Store Logged Fields',
    '### Log Parsing and Analysis',
  );

  assert.match(table, /\| `embedding_status` \| string \| `"queued"`, `"provided"`, or `"skipped"` \|/);
  assert.match(
    table,
    /\| `qdrant_status` \| string \\\| null \| `"queued"`, `"stored"`, `"failed"`, `"unconfigured"`, or `null` \|/,
  );
  assert.doesNotMatch(table, /"disabled"/);
});

test('performance enrichment status lists only the values /health returns', async () => {
  const page = await readDoc('performance.md');
  const monitoring = section(page, '### Enrichment Metrics in /health', '## Configuration Reference');

  assert.match(monitoring, /\| `status` \| `"running"` or `"stopped"` \| Alert if not `"running"` \|/);
  assert.doesNotMatch(monitoring, /"error"/);
});

test('performance log volume claim depends on a formatter that renders extra fields', async () => {
  const page = await readDoc('performance.md');

  assert.match(
    page,
    /\*\*Structured Logging\*\*: With a formatter that renders `extra` fields, log volume increases by ~200 bytes per request \(the stock format prints only the message\)/,
  );
  assert.doesNotMatch(page, /\*\*Structured Logging\*\*: Log volume increases by/);
});

test('health enrichment counters match what /health reports', async () => {
  const page = await readDoc('health.md');

  assert.match(
    page,
    /\| `queue_depth` \| integer \| Current size reported by the enrichment queue; it does not equal `pending` \+ `inflight`, which are tracked separately \|/,
  );
  assert.doesNotMatch(page, /Total jobs in queue \(pending \+ inflight\)/);
  assert.match(page, /\| `failed` \| integer \| Failed enrichment attempts since service start; every failed attempt counts, including one that is retried \|/);
  assert.doesNotMatch(page, /failed permanently/);
});

test('performance content_length counts characters, not bytes', async () => {
  const page = await readDoc('performance.md');

  assert.match(page, /\| `content_length` \| int \| Content length in characters \(`len\(content\)`\) \|/);
  assert.doesNotMatch(page, /Content size in bytes/);
});
