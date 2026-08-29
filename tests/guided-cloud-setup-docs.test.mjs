import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/cli/guided-cloud-setup.md', import.meta.url),
);
const mcpAutomemRelease = '9a0bbf754dd31db524da25638b0e97907e32ff37';
const automemRelease = 'e147c352b100ebbf29e6555453fdde5152066138';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('guided cloud setup is scoped to the validated 0.16 releases', async () => {
  const page = await readPage();

  assert.match(page, new RegExp(mcpAutomemRelease, 'u'));
  assert.match(page, new RegExp(automemRelease, 'u'));
});

test('guided cloud setup documents the actual non-interactive approval boundary', async () => {
  const page = await readPage();

  assert.match(
    page,
    /Without a TTY, the installer prints the plan and stops unless you explicitly pass `--yes` or set `AUTOMEM_YES=1`\./,
  );
  assert.match(page, /Only `CI`, `CODEX`, and `CLAUDE_CODE` suppress the installer animation\./);
  assert.match(page, /`GITHUB_ACTIONS` is not a separate approval or animation trigger\./);
  assert.doesNotMatch(page, /installer assumes `--yes`/i);
  assert.doesNotMatch(page, /When `CI`, `CODEX`, `CLAUDE_CODE`, or `GITHUB_ACTIONS` is set/i);
});

test('guided cloud setup keeps Railway on its supported fresh-deploy and Other flows', async () => {
  const page = await readPage();

  assert.match(page, /Railway [(]guided[)].*fresh AutoMem deployment/si);
  assert.match(
    page,
    /waits for the deployment's generated domain, reads the AutoMem API token, and verifies the endpoint before it configures agents/i,
  );
  assert.match(page, /If the guided flow cannot complete, provide the endpoint and key manually instead\./);
  assert.match(page, /does not discover or reuse an existing Railway deployment in this release/i);
  assert.ok(page.includes('choose **Other** and paste its endpoint and key'));
  assert.doesNotMatch(page, /Reuse vs\. fresh deploy/i);
  assert.doesNotMatch(page, /reuse an existing (one|deployment)/i);
  assert.doesNotMatch(page, /choose the existing deployment to reuse/i);
  assert.doesNotMatch(page, /Usage-based/i);
  assert.doesNotMatch(page, /every service shows green/i);
  assert.doesNotMatch(page, /service → Variables/i);
});

test('guided cloud setup distinguishes manual InstaPods credentials from Railway capture', async () => {
  const page = await readPage();

  assert.match(page, /description: .*provider-specific credential setup\./i);
  assert.match(page, /\*\*InstaPods\*\*.*Paste the endpoint and key you receive/s);
  assert.match(
    page,
    /\*\*Railway [(]guided[)]\*\*.*The installer reads the endpoint and key after the deployment is available/s,
  );
  assert.match(page, /the installer does not read InstaPods credentials automatically/i);
  assert.match(page, /AutoMem API URL.*AutoMem API key/s);
  assert.doesNotMatch(page, /automatic endpoint and token capture/i);
  assert.doesNotMatch(page, /Choose the \*\*Grow\*\* plan/i);
  assert.doesNotMatch(page, /\$15\/mo flat/i);
  assert.doesNotMatch(page, /complete checkout/i);
});

test('guided cloud setup rejects unsupported Railway platform and billing claims', async () => {
  const page = await readPage();

  assert.doesNotMatch(page, /PORT=8001/i);
  assert.doesNotMatch(page, /memory-service/i);
  assert.doesNotMatch(page, /Any \*\*billable\*\* deploy is gated behind an explicit confirmation/i);
  assert.doesNotMatch(page, /names the plan/i);
});

test('guided cloud setup uses the release health vocabulary and supported CLI surface', async () => {
  const page = await readPage();

  assert.match(page, /`"qdrant": "disconnected"`/);
  assert.match(page, /top-level `"status": "degraded"`/);
  assert.doesNotMatch(page, /`"qdrant": "unavailable"`/);
  assert.doesNotMatch(page, /`"status": "unavailable"`/);
  assert.match(page, /`--clients`/);
  assert.doesNotMatch(page, /`--client`/);
});
