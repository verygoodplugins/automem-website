import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/claude-desktop.md', import.meta.url),
);

async function readClaudeDesktopPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, startPattern, endPattern) {
  const start = page.search(startPattern);
  assert.notEqual(start, -1, `expected a section starting at ${startPattern}`);
  const rest = page.slice(start);
  const end = rest.slice(1).search(endPattern);
  assert.notEqual(end, -1, `expected the section to end at ${endPattern}`);
  return rest.slice(0, end + 1);
}

test('one-click install names the extension field AutoMem API URL and its local default', async () => {
  const page = await readClaudeDesktopPage();
  const install = section(page, /### Method 1: One-Click/, /### Method 2: Manual JSON/);

  assert.match(install, /1\. Enter your \*\*AutoMem API URL\*\*/);
  assert.match(install, /defaults to `http:\/\/127\.0\.0\.1:8001` for a local AutoMem/);
  assert.match(install, /replace it with your Railway URL for cloud/);
  assert.match(install, /2\. Optionally enter your \*\*API Key\*\*/);
  assert.match(install, /skip for local/);
  assert.doesNotMatch(page, /AutoMem Endpoint/);
});

test('Personal Preferences template link is pinned to a published mcp-automem release', async () => {
  const page = await readClaudeDesktopPage();
  const links = [
    ...page.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/([^/]+)\/templates\/CLAUDE_DESKTOP_INSTRUCTIONS\.md/g,
    ),
  ];

  assert.equal(links.length, 1, 'expected exactly one template link');
  assert.ok(
    isPinnedSha('mcp-automem', links[0][1]),
    `template link uses an unpinned revision: ${links[0][1]}`,
  );
  assert.doesNotMatch(page, /mcp-automem\/blob\/(?:main|master)\//);
});

test('health verification does not promise a service version or guaranteed counts', async () => {
  const page = await readClaudeDesktopPage();
  const verification = section(page, /## Verification/, /\n---\n/);

  assert.match(verification, /Overall health status \(`healthy`, `degraded`, or `error`\)/);
  assert.match(verification, /- FalkorDB connection status/);
  assert.match(verification, /- Qdrant connection status/);
  assert.match(
    verification,
    /Other statistics when the service reports them, such as memory and vector counts, sync status, and enrichment status/,
  );
  assert.doesNotMatch(page, /service version/i);
  assert.doesNotMatch(verification, /- [^\n]*memory\/vector counts/);
});

test('health verification says /health is token-exempt and does not prove the key works', async () => {
  const page = await readClaudeDesktopPage();
  const verification = section(page, /## Verification/, /\n---\n/);

  assert.match(verification, /`\/health` endpoint skips the API token check/);
  assert.match(verification, /does not prove that `AUTOMEM_API_KEY` is accepted/);
  assert.match(verification, /Ask Claude to recall something/);
});

test('troubleshooting does not use /health to test the API key', async () => {
  const page = await readClaudeDesktopPage();
  const unreachable = section(page, /### Service unreachable/, /### Authentication failures/);
  const auth = section(page, /### Authentication failures/, /### Memory not persisting/);

  assert.match(unreachable, /curl http:\/\/127\.0\.0\.1:8001\/health/);
  assert.match(unreachable, /curl https:\/\/your-automem\.up\.railway\.app\/health/);
  assert.match(unreachable, /`\/health` skips the API token check/);
  assert.match(unreachable, /only show whether the service is reachable/);
  assert.match(unreachable, /succeed even if `AUTOMEM_API_KEY` is wrong/);

  assert.match(auth, /endpoint that requires the token, because `\/health` does not check it/);
  assert.match(auth, /curl -i -H "Authorization: Bearer \$KEY" "\$ENDPOINT\/recall\?limit=1"/);
  assert.match(auth, /`401 Unauthorized` response means the service rejected the key/);
  assert.doesNotMatch(auth, /\$ENDPOINT\/health/);

  // No curl on the page sends a bearer token to /health, where it would be ignored.
  assert.doesNotMatch(page, /Authorization: Bearer[^\n]*\/health/);
});

test('related platforms spell Antigravity and give its documented config path', async () => {
  const page = await readClaudeDesktopPage();
  const related = section(page, /## Related Platforms/, /\nAll platforms share/);

  assert.match(
    related,
    /- \*\*Google Antigravity\*\* — uses `~\/\.gemini\/antigravity\/mcp_config\.json`, which Antigravity's own MCP docs describe opening from the built-in MCP Store's raw config view/,
  );
  assert.doesNotMatch(page, /AntiGravity/);
  assert.doesNotMatch(related, /uses `mcp_config\.json`/);
});
