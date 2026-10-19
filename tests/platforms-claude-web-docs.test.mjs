import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/claude-web.md', import.meta.url),
);

async function readClaudeWebPage() {
  return readFile(pagePath, 'utf8');
}

// Text of a "## Heading" section, up to the next horizontal rule.
function section(page, heading) {
  const start = page.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + 1);
  const end = rest.indexOf('\n---\n');
  return end === -1 ? rest : rest.slice(0, end);
}

// Text of a "### Heading" subsection, up to the next heading or horizontal rule.
function subsection(page, heading) {
  const start = page.indexOf(`\n### ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" subsection`);
  const rest = page.slice(start + 1);
  const end = rest.slice(1).search(/\n(?:#{2,3} |---\n)/u);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

test('architecture says only SSE keeps sessions and Streamable HTTP is stateless', async () => {
  const architecture = section(await readClaudeWebPage(), 'Architecture');

  assert.match(architecture, /\*\*Streamable HTTP\*\* \(recommended\): `POST \/mcp` — stateless MCP-over-HTTP/u);
  assert.match(architecture, /Only the SSE transport keeps server-side sessions/u);
  assert.match(architecture, /registered in memory under a `sessionId`/u);
  assert.match(architecture, /every `POST \/mcp\/messages`/u);
  assert.match(architecture, /Streamable HTTP is stateless/u);
  assert.match(architecture, /builds a new server and transport/u);
  assert.match(architecture, /no event store/u);
  assert.match(architecture, /any `Mcp-Session-Id` header is ignored/u);
  assert.match(architecture, /a `Last-Event-ID` header has no effect/u);

  assert.doesNotMatch(architecture, /Sessions are maintained server-side/u);
  assert.doesNotMatch(architecture, /1-hour TTL/u);
  assert.doesNotMatch(architecture, /supports `Last-Event-ID` for resumability/u);
  assert.doesNotMatch(architecture, /full-duplex/iu);
});

test('endpoint table describes the Streamable HTTP route as stateless, not full-duplex', async () => {
  const deploy = section(await readClaudeWebPage(), 'Deploy the MCP Sidecar');
  const mcpRow = deploy.split('\n').find((line) => line.startsWith('| `/mcp` |'));

  assert.ok(mcpRow, 'expected a /mcp row in the sidecar endpoints table');
  assert.match(mcpRow, /\| POST \| Streamable HTTP \| Stateless MCP over HTTP \(recommended\) \|/u);
  assert.doesNotMatch(mcpRow, /full-duplex/iu);
});

test('port caution says the memory service defaults to 8001 and does not blame Flask port 5000', async () => {
  const deploy = section(await readClaudeWebPage(), 'Deploy the MCP Sidecar');
  const caution = deploy.match(/:::caution\n([\s\S]*?)\n:::/u);

  assert.ok(caution, 'expected the port caution block');
  assert.match(caution[1], /`AUTOMEM_API_URL` must point at the port the memory service listens on/u);
  assert.match(caution[1], /reads `PORT` and falls back to `8001` only when it is unset/u);
  assert.match(caution[1], /Keep the memory service's `PORT` and the port in `AUTOMEM_API_URL` identical/u);
  assert.match(
    caution[1],
    /On Railway, set `PORT=8001` on the memory service \(see the \[Railway guide\]\(\/docs\/deployment\/railway\/\)\) and use internal DNS for `AUTOMEM_API_URL`: `http:\/\/memory-service\.railway\.internal:8001`/u,
  );
  assert.match(caution[1], /`http:\/\/memory-service\.railway\.internal:8001`/u);

  assert.doesNotMatch(caution[1], /\*\*must\*\* have `PORT=8001`/u);
  assert.doesNotMatch(caution[1], /Flask defaults/u);
  assert.doesNotMatch(caution[1], /5000/u);
});

test('token extraction lists the six getAuthToken tiers and describes the env fallback separately', async () => {
  const auth = section(await readClaudeWebPage(), 'Authentication Options');
  const start = auth.indexOf('**Token extraction priority**');
  assert.notEqual(start, -1, 'expected the token extraction list');
  const extraction = auth.slice(start);

  const tiers = [...extraction.matchAll(/^(\d+)\. (.+)$/gmu)].map(([, n, text]) => [n, text]);
  assert.deepEqual(tiers, [
    ['1', '`Authorization: Bearer <token>` header'],
    ['2', '`X-API-Key: <token>` header'],
    ['3', '`X-API-Token: <token>` header'],
    ['4', '`?api_key=<token>` query parameter'],
    ['5', '`?apiKey=<token>` query parameter'],
    ['6', '`?api_token=<token>` query parameter'],
  ]);
  assert.doesNotMatch(extraction, /^7\. /mu);
  assert.doesNotMatch(extraction, /^\d+\. `AUTOMEM_API_TOKEN`/mu);

  const lastTier = extraction.indexOf('6. `?api_token=<token>` query parameter');
  const fallback = extraction.indexOf('`getAuthToken()` checks only those six sources.');
  assert.ok(fallback > lastTier, 'the env fallback paragraph must follow the six tiers');
  const fallbackText = extraction.slice(fallback);
  assert.match(fallbackText, /the `\/mcp` and `\/mcp\/sse` route handlers fall back to the sidecar's `AUTOMEM_API_TOKEN` environment variable/u);
  assert.match(fallbackText, /answer `401` if that is unset too/u);
  assert.match(fallbackText, /A token sent by the client therefore takes precedence over the environment variable/u);
  assert.match(fallbackText, /forwarded to AutoMem as a `Bearer` token/u);
  assert.match(
    fallbackText,
    /on every endpoint except `\/health`, so `check_database_health` does not test the token/u,
  );
});

test('401 troubleshooting tests the token against an endpoint that checks it, not /health', async () => {
  const unauthorized = subsection(await readClaudeWebPage(), '401 Unauthorized');

  assert.match(unauthorized, /Test token against an endpoint that checks it \(`\/health` does not\)/u);
  assert.match(unauthorized, /your-automem\.up\.railway\.app\/recall\?query=test&limit=1/u);
  assert.doesNotMatch(unauthorized, /Test token: `curl [^`]*\/health`/u);
});

test('migration benefits no longer promise resumability or full-duplex streaming', async () => {
  const migration = section(await readClaudeWebPage(), 'Migrating from SSE to Streamable HTTP');
  const benefits = migration.slice(migration.indexOf('Benefits of Streamable HTTP:'));

  assert.match(benefits, /answered in the body of its own `POST \/mcp`/u);
  assert.match(benefits, /No `sessionId` management needed/u);
  assert.match(benefits, /ignores any `Mcp-Session-Id` header/u);
  assert.match(benefits, /cannot resume a stream with `Last-Event-ID`/u);

  assert.doesNotMatch(benefits, /full-duplex/iu);
  assert.doesNotMatch(benefits, /Lower latency/u);
  assert.doesNotMatch(benefits, /Better error handling/u);
  assert.doesNotMatch(benefits, /stream resumability/u);
  assert.doesNotMatch(benefits, /Supports `Last-Event-ID`/u);
});

test('troubleshooting says Streamable HTTP does not replay events', async () => {
  const page = await readClaudeWebPage();
  const troubleshooting = section(page, 'Troubleshooting');
  const reconnecting = subsection(page, 'Reconnecting (Streamable HTTP)');

  assert.match(reconnecting, /The sidecar does not replay missed events/u);
  assert.match(reconnecting, /created without an event store/u);
  assert.match(reconnecting, /a `Last-Event-ID` header has no effect/u);
  assert.match(reconnecting, /`InMemoryEventStore` class in `server\.js` is defined but never attached to a transport/u);
  assert.match(reconnecting, /simply sends a new `POST \/mcp`/u);

  assert.doesNotMatch(troubleshooting, /### Stream replay/u);
  assert.doesNotMatch(troubleshooting, /replays missed events automatically/u);
  assert.doesNotMatch(troubleshooting, /persists events for 1 hour/u);
  assert.doesNotMatch(troubleshooting, /1000 events per stream/u);
});

test('page no longer claims Last-Event-ID resumability, full-duplex streaming, or a 5000 default', async () => {
  const page = await readClaudeWebPage();

  assert.doesNotMatch(page, /full-duplex/iu);
  assert.doesNotMatch(page, /Flask defaults to port 5000/u);
  assert.doesNotMatch(page, /\bmust\*\* have `PORT=8001`/u);
  assert.doesNotMatch(page, /supports `Last-Event-ID` for (?:stream )?resumability/iu);
  assert.doesNotMatch(page, /sidecar replays missed events/u);
  assert.doesNotMatch(page, /Sessions are maintained server-side with a 1-hour TTL/u);
});

test('AutoMem source links on the page use the validated release revision', async () => {
  const page = await readClaudeWebPage();
  const links = [
    ...page.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/(mcp-sse-server\/server\.js|automem\/runtime_wiring\.py)#(L\d+(?:-L\d+)?)/gu,
    ),
  ];
  const targets = links.map(([, , path, anchor]) => `${path}#${anchor}`);

  for (const expected of [
    'mcp-sse-server/server.js#L1051-L1085',
    'mcp-sse-server/server.js#L1119-L1128',
    'mcp-sse-server/server.js#L908-L916',
    'mcp-sse-server/server.js#L1067-L1071',
    'mcp-sse-server/server.js#L1106-L1109',
    'mcp-sse-server/server.js#L223-L263',
    'automem/runtime_wiring.py#L82',
  ]) {
    assert.ok(targets.includes(expected), `expected a source link to ${expected}`);
  }
  assert.ok(
    links.every(([, sha]) => isPinnedSha('automem', sha)),
    'claude-web source links must use a pinned AutoMem revision',
  );

  const allAutomemLinks = [
    ...page.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\//gu),
  ];
  assert.equal(allAutomemLinks.length, links.length, 'every AutoMem link should be one of the checked targets');
});
