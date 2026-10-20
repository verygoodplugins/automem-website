import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pinnedShaPattern } from './helpers/source-pins.mjs';

// Drift fixes for the Health & Analytics and Consolidation Operations API pages,
// verified against the AutoMem release recorded in scripts/docs-source-pins.json.

const docsRoot = new URL('../src/content/docs/docs/reference/api/', import.meta.url);

async function readDoc(name) {
  return readFile(fileURLToPath(new URL(name, docsRoot)), 'utf8');
}

function section(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected a section matching ${startPattern}`);
  const rest = page.slice(start);
  const end = rest.slice(1).search(endPattern);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

function firstJsonBlock(markdown) {
  const match = markdown.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, 'expected a JSON block');
  return JSON.parse(match[1]);
}

test('consolidation intro and architecture diagram include the identity task', async () => {
  const page = await readDoc('consolidation.md');

  assert.match(
    page,
    /An `identity` task also merges duplicate entities and synthesizes identity definitions for Entity nodes\./,
  );

  const diagram = section(page, /^## System Architecture$/m, /^---$/m);
  assert.match(diagram, /Consolidator -->\|"Merge entities, synthesize identities"\| FalkorGraph/);
});

test('consolidation dry_run does not claim decay is simulated', async () => {
  const page = await readDoc('consolidation.md');

  const params = section(page, /^### Parameters$/m, /^### Task Types$/m);
  assert.match(params, /`decay` has no dry-run guard and always updates relevance scores/);
  assert.match(params, /`mode="decay"` and `mode="full"` write even with the default `dry_run: true`/);
  assert.doesNotMatch(page, /If `true`, simulate without making changes/);

  const flow = section(page, /^### Execution Flow$/m, /^### Response Format$/m);
  assert.match(flow, /Results \(no writes, except decay scores\)/);
  assert.doesNotMatch(page, /Simulated results \(no writes\)/);
});

test('consolidation status example uses the real next_runs strings and run record fields', async () => {
  const page = await readDoc('consolidation.md');
  const status = section(page, /^## GET \/consolidate\/status$/m, /^---$/m);
  const body = firstJsonBlock(status);

  assert.deepEqual(Object.keys(body.next_runs).sort(), [
    'cluster',
    'creative',
    'decay',
    'forget',
    'identity',
  ]);
  for (const value of Object.values(body.next_runs)) {
    assert.match(value, /^(Due now|Disabled|In \d+ (day|hour)\(s\))$/);
  }
  assert.equal(body.next_runs.forget, 'Disabled');

  assert.ok(body.history.length >= 1);
  for (const run of body.history) {
    assert.deepEqual(Object.keys(run).sort(), [
      'completed_at',
      'dry_run',
      'id',
      'mode',
      'result',
      'started_at',
      'success',
      'task',
    ]);
    assert.equal(typeof run.result, 'string');
    const result = JSON.parse(run.result);
    assert.equal(result.mode, run.mode);
    assert.equal(result.started_at, run.started_at);
    assert.equal(result.completed_at, run.completed_at);
    const { processed, distribution } = result.steps.decay;
    assert.equal(processed, Object.values(distribution).reduce((sum, count) => sum + count, 0));
  }

  assert.match(status, /Human-readable time until the task is next due, not a timestamp/);
  assert.match(status, /`"Disabled"` when the task's interval is 0/);
  assert.match(status, /\| `history\[\]\.result` \| string \| The full `consolidation` result object, serialized as a JSON string/);
  assert.doesNotMatch(status, /string \(ISO 8601\) \\\| null/);
  assert.doesNotMatch(status, /duration_seconds/);
  assert.doesNotMatch(status, /history\[\]\.(updates|associations|clusters|forgotten|timestamp)/);
  assert.doesNotMatch(status, /"timestamp"/);
  assert.doesNotMatch(status, /"updates"/);
  assert.doesNotMatch(status, /"forget": null/);
});

test('consolidation run history records only non-dry runs and orders by started_at', async () => {
  const page = await readDoc('consolidation.md');

  assert.match(
    page,
    /Each recorded execution \(scheduled runs and `POST \/consolidate` calls with `dry_run` set to `false`\) creates a `ConsolidationRun` node/,
  );
  assert.match(page, /ordered by `started_at` descending/);
  assert.doesNotMatch(page, /Each execution creates a timestamped record/);
  assert.doesNotMatch(page, /ordered by timestamp descending/);
});

test('consolidation error handling does not promise stack traces', async () => {
  const page = await readDoc('consolidation.md');

  assert.match(page, /The two `500` handlers log only the exception message at error level, not a stack trace\./);
  assert.doesNotMatch(page, /full stack traces/);
});

test('health docs explain what vector_dimensions.mismatch means', async () => {
  const page = await readDoc('health.md');
  const row = page.match(/^\| `vector_dimensions` \|([^\n]*)\|$/m);

  assert.ok(row, 'expected the vector_dimensions row');
  assert.match(row[1], /`mismatch` \(boolean: `true` when `collection` differs from `configured`/);
  assert.match(row[1], /`false` when Qdrant is unavailable/);
  assert.match(row[1], /it does not change `status`/);
});

test('health docs list the 503 and 500 responses for analyze and startup-recall', async () => {
  const page = await readDoc('health.md');

  const analyze = section(page, /^## GET \/analyze$/m, /^---$/m);
  assert.match(
    analyze,
    /\*\*Response:\*\* HTTP 200 with JSON analytics, HTTP 401 if unauthorized, HTTP 503 if FalkorDB is unavailable, or HTTP 500 with `\{"error": "Analyze failed", "details": "<exception message>"\}`/,
  );
  assert.doesNotMatch(analyze, /HTTP 200 with JSON analytics, or HTTP 401 if unauthorized\./);

  const startup = section(page, /^## GET \/startup-recall$/m, /^---$/m);
  assert.match(
    startup,
    /\*\*Response:\*\* HTTP 200 with JSON memory list, HTTP 401 if unauthorized, HTTP 503 if FalkorDB is unavailable, or HTTP 500 with `\{"error": "Startup recall failed", "details": "<exception message>"\}`/,
  );
  assert.doesNotMatch(startup, /HTTP 200 with JSON memory list, or HTTP 503 if FalkorDB unavailable\./);
});

test('health docs describe the polling monitor as scripts/health_monitor.py behaves', async () => {
  const page = await readDoc('health.md');
  const monitoring = section(page, /^### Health Monitoring Service$/m, /^### Structured Logging$/m);

  assert.match(monitoring, /Runs a check every 300 seconds \(5 minutes\) by default; change it with `--interval`/);
  assert.match(monitoring, /It does not read `status`, so a `"degraded"` response does not raise an alert/);
  assert.match(monitoring, /Queries FalkorDB and Qdrant directly and compares their own counts, not the `memory_count` and `vector_count` fields from `\/health`/);
  assert.match(monitoring, /percentage of the Qdrant count/);
  assert.match(monitoring, /Sends a warning alert if drift exceeds 5% \(`--drift-threshold`\)/);
  assert.match(monitoring, /Sends a critical alert if drift exceeds 50% \(`--critical-threshold`\)/);
  assert.match(monitoring, /With `--auto-recover` it then runs `scripts\/recover_from_qdrant\.py`; without that flag it only alerts/);
  assert.match(monitoring, /posted to the webhook set with `--webhook` or `HEALTH_MONITOR_WEBHOOK`/);

  assert.match(monitoring, /Monitor-->\|"Direct count query"\|FalkorDB/);
  assert.match(monitoring, /Monitor-->\|"Direct collection query"\|Qdrant/);
  assert.match(monitoring, /Alert\["Alert System<br\/>\(Log\/Webhook\)"\]/);
  assert.doesNotMatch(monitoring, /Monitor-->\|"If degraded"\|Alert/);
  assert.doesNotMatch(monitoring, /Slack\/Discord\/Webhook/);
  assert.doesNotMatch(monitoring, /Polls `\/health` every 5 minutes/);
  assert.doesNotMatch(monitoring, /Compares `memory_count` \(FalkorDB\) vs `vector_count` \(Qdrant\) to detect drift/);
  assert.doesNotMatch(monitoring, /Optionally triggers auto-recovery via `recover_from_qdrant\.py`/);

  assert.match(
    page,
    new RegExp(
      `github\\.com/verygoodplugins/automem/blob/${pinnedShaPattern('automem')}/scripts/health_monitor\\.py#L40-L352`,
    ),
  );
});

test('health alert thresholds say drift already makes /health degraded', async () => {
  const page = await readDoc('health.md');
  const thresholds = section(page, /^### Alert Thresholds$/m, /^See \[Operations/m);

  assert.match(
    thresholds,
    /\| `status: "degraded"` with `falkordb` or `qdrant` showing `"disconnected"` \| Immediate page/,
  );
  assert.match(
    thresholds,
    /`\/health` itself reports `status: "degraded"` \(with `sync_status: "drift_detected"`\) as soon as `vector_count` is below `memory_count`, with no 5% tolerance/,
  );
  assert.doesNotMatch(thresholds, /\| `status: "degraded"` \| Immediate page/);
});

test('health docs name the AUTOMEM_API_TOKEN environment variable, not API_TOKEN', async () => {
  const page = await readDoc('health.md');

  assert.match(page, /\*\*Authentication:\*\* Required when `AUTOMEM_API_TOKEN` is configured/);
  assert.doesNotMatch(page, /`API_TOKEN`/);
  assert.doesNotMatch(page, /Required when `API_TOKEN`/);
});
