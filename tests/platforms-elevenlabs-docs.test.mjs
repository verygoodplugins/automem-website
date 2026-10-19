import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/elevenlabs.md', import.meta.url),
);
const platformsDir = new URL('../src/content/docs/docs/platforms/', import.meta.url);

async function readElevenLabsPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + 1);
  const end = rest.indexOf('\n---\n');
  return end === -1 ? rest : rest.slice(0, end);
}

function subsection(page, heading) {
  const start = page.indexOf(`\n### ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" subsection`);
  const rest = page.slice(start + 1);
  const end = rest.search(/\n(?:### |## |---\n)/u);
  return end === -1 ? rest : rest.slice(0, end);
}

function intro(page) {
  const start = page.indexOf('\nElevenLabs Agents connect');
  assert.notEqual(start, -1, 'expected the introduction paragraph');
  const rest = page.slice(start + 1);
  return rest.slice(0, rest.indexOf('\n\n'));
}

test('elevenlabs intro does not call header authentication unique to ElevenLabs', async () => {
  const text = intro(await readElevenLabsPage());

  assert.doesNotMatch(text, /only cloud platform/iu);
  assert.match(text, /ElevenLabs supports custom HTTP headers, so it can use the more secure header-based authentication/u);
  assert.match(
    text,
    /\[Claude\.ai \(Web\)\]\(\/docs\/platforms\/claude-web\/\) can use a header or a URL token too/u,
  );
  assert.match(
    text,
    /\[ChatGPT\]\(\/docs\/platforms\/chatgpt\/\) is limited to URL-based tokens/u,
  );
  assert.match(text, /The sidecar itself accepts a token from either place/u);
});

test('elevenlabs intro links resolve to platform pages', async () => {
  for (const file of ['claude-web.md', 'chatgpt.md']) {
    await access(new URL(file, platformsDir));
  }
});

test('elevenlabs connection stability lists the full Cache-Control value', async () => {
  const page = await readElevenLabsPage();
  const stability = section(page, 'Connection Stability');

  assert.match(
    stability,
    /`X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`/u,
  );
  assert.doesNotMatch(page, /`Cache-Control: no-cache`/u);
});

test('elevenlabs "Agent cannot connect" separates sidecar liveness from upstream readiness', async () => {
  const text = subsection(await readElevenLabsPage(), 'Agent cannot connect');

  assert.match(text, /\/health`\. It returns `200` whenever the sidecar process is up, even if AutoMem is down/u);
  assert.match(text, /`upstream` reports the sidecar's last check of AutoMem/u);
  for (const value of ['reachable', 'unreachable', 'unconfigured', 'unknown']) {
    assert.match(text, new RegExp(`\`${value}\``, 'u'), `expected the ${value} upstream value`);
  }
  assert.match(text, /`unconfigured` when `AUTOMEM_API_TOKEN` is not set on the sidecar/u);
  assert.match(
    text,
    /`upstream_error` gives the reason when AutoMem cannot be reached, while `upstream_details` carries AutoMem's own health report/u,
  );
  assert.match(text, /`GET \/ready` runs the check on each request and returns `503` unless AutoMem reports healthy/u);
});

test('elevenlabs token test hits a guarded AutoMem route, never a /health endpoint', async () => {
  const page = await readElevenLabsPage();
  const text = subsection(page, '401 Unauthorized');

  assert.match(
    text,
    /curl -i -H "Authorization: Bearer \$TOKEN" "https:\/\/your-automem\.up\.railway\.app\/recall\?query=test&limit=1"/u,
  );
  assert.match(text, /A `401` means AutoMem rejected the token; a `200` means the token was accepted/u);
  assert.doesNotMatch(text, /any other status means the token passed/u);
  assert.match(text, /neither the sidecar's `\/health` nor AutoMem's own `\/health` checks the token/u);

  // AutoMem's /health skips the API-token guard, so no token test may point at a /health URL.
  assert.doesNotMatch(page, /curl[^\n]*Authorization[^\n]*https?:\/\/[^\s"`]*\/health\b/u);
  assert.doesNotMatch(page, /curl[^\n]*https?:\/\/[^\s"`]*\/health\b[^\n]*Authorization/u);
});

test('elevenlabs 401 section limits sidecar 401s to requests with no token and no default', async () => {
  const text = subsection(await readElevenLabsPage(), '401 Unauthorized');

  assert.match(
    text,
    /returns `401` only when a request carries no token and `AUTOMEM_API_TOKEN` is not set on the sidecar/u,
  );
  assert.match(
    text,
    /If `AUTOMEM_API_TOKEN` is set, a request with no token uses that default, and a token in the request is used in preference to it/u,
  );
  assert.doesNotMatch(text, /only when no token is presented at all/iu);
});

test('elevenlabs 401 section explains that a wrong token surfaces as a tool error', async () => {
  const text = subsection(await readElevenLabsPage(), '401 Unauthorized');

  assert.match(text, /A token that is present but wrong is forwarded to AutoMem/u);
  assert.match(text, /MCP tool error \(for example `AutoMem error: Unauthorized`\) instead of an HTTP `401` from the sidecar/u);
  assert.match(
    text,
    /`check_database_health` can still succeed with a wrong token, because AutoMem's `\/health` does not check it/u,
  );
});

test('elevenlabs unreachable-service troubleshooting reports a tool error, not a sidecar 502', async () => {
  const page = await readElevenLabsPage();
  const text = subsection(page, 'Memory service unreachable');

  assert.doesNotMatch(page, /sidecar returns 502/iu);
  assert.match(text, /the sidecar does not turn it into an HTTP `502`/u);
  assert.match(text, /MCP tool error \(`isError: true`\)/u);
  assert.match(text, /`AutoMem error: fetch failed`/u);
  assert.match(text, /`AutoMem request timed out`/u);
  assert.match(text, /`AutoMem service is temporarily unavailable`/u);
});

test('elevenlabs page does not invent a missing-URL configuration error', async () => {
  const page = await readElevenLabsPage();
  const text = subsection(page, 'Memory service unreachable');

  assert.doesNotMatch(page, /AUTOMEM_API_URL not configured/u);
  assert.doesNotMatch(page, /returns `500`/u);
  assert.match(
    text,
    /If `AUTOMEM_API_URL` is not set, the sidecar falls back to the legacy `AUTOMEM_ENDPOINT`, then to `http:\/\/127\.0\.0\.1:8001`, instead of reporting a configuration error/u,
  );
});
