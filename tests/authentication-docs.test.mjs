import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/reference/authentication.md', import.meta.url),
);

async function readAuthenticationPage() {
  return readFile(pagePath, 'utf8');
}

function sectionBetween(page, startMarker, endMarker) {
  const start = page.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find ${startMarker}`);
  const end = page.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `expected to find ${endMarker} after ${startMarker}`);
  return page.slice(start, end);
}

test('authentication lists every API-token guard exemption', async () => {
  const page = await readAuthenticationPage();
  const intro = sectionBetween(page, 'AutoMem uses a two-tier', '\n\nFor deployment-specific');
  const tokenTypes = sectionBetween(page, '## Token Types', '\n---');

  for (const text of [intro, tokenTypes]) {
    assert.match(text, /`\/health`, `\/backup`, and `\/viewer\*`/);
    assert.match(text, /`OPTIONS` preflight/);
  }

  assert.doesNotMatch(page, /except `\/health` and `\/backup`/);
  assert.doesNotMatch(page, /only `\/health` requires no authentication at all/);
});

test('authentication describes /viewer* as a redirect, not a static or data-API exemption', async () => {
  const page = await readAuthenticationPage();
  const note = sectionBetween(page, 'Note: `/enrichment/status`', '\n---');

  assert.match(
    note,
    /API token guard skips only `\/health`, `\/backup`, `\/viewer\*`, and `OPTIONS` requests/,
  );
  assert.match(note, /redirects to the standalone graph viewer at `GRAPH_VIEWER_URL`/);
  assert.match(note, /`ENABLE_GRAPH_VIEWER`/);
  assert.match(note, /not a data-API exemption/);
  assert.match(note, /`\/backup` endpoint is still protected by the admin token/);
  assert.doesNotMatch(page, /\/viewer[^\n]*static/i);
});

test('authentication documents the admin token sources in lookup order', async () => {
  const page = await readAuthenticationPage();
  const admin = sectionBetween(page, '## Admin Authentication', '### Admin-Protected Endpoints');

  assert.match(
    admin,
    /`X-Admin-Token` header, then the `X-Admin-Api-Key` header, then the `admin_token` query parameter/,
  );
  assert.match(admin, /first non-empty value/);
  assert.match(admin, /`ADMIN_API_TOKEN`/);
  assert.doesNotMatch(page, /provided in a separate `X-Admin-Token` header/);
});

test('authentication lists the entity audit and merge endpoints as admin-protected', async () => {
  const page = await readAuthenticationPage();
  const table = sectionBetween(page, '### Admin-Protected Endpoints', '\nNote:');
  const diagram = sectionBetween(page, '## Endpoint Authentication Requirements', '\n| Category |');
  const summary = sectionBetween(page, '| Category |', '\n---');

  assert.match(table, /\| `\/entities\/audit` \| GET \| [^|]+ \| Yes \| Yes \|/);
  assert.match(table, /\| `\/entity\/<slug>\/merge` \| POST \| [^|]+ \| Yes \| Yes \|/);

  const adminSubgraph = sectionBetween(
    diagram,
    'subgraph "API Token + Admin Token Required"',
    '    end',
  );
  assert.match(adminSubgraph, /\/entities\/audit<br\/>GET/);
  assert.match(adminSubgraph, /\/entity\/&lt;slug&gt;\/merge<br\/>POST/);
  assert.match(diagram, /style EntitiesAudit fill:#FF6B6B/);
  assert.match(diagram, /style EntityMerge fill:#FF6B6B/);

  assert.match(
    summary,
    /\| \*\*Admin\*\* \| [^\n]*`\/entities\/audit`[^\n]*`\/entity\/<slug>\/merge`[^\n]* \| Yes \| Yes \|/,
  );
});

test('authentication shows /viewer* in the public endpoints diagram and table', async () => {
  const page = await readAuthenticationPage();
  const diagram = sectionBetween(page, '## Endpoint Authentication Requirements', '\n| Category |');
  const summary = sectionBetween(page, '| Category |', '\n---');

  const publicSubgraph = sectionBetween(diagram, 'subgraph "Public Endpoints"', '    end');
  assert.match(publicSubgraph, /\/health<br\/>GET/);
  assert.match(publicSubgraph, /\/viewer\*<br\/>GET/);
  assert.match(diagram, /style Viewer fill:#90EE90/);
  assert.match(summary, /\| \*\*Public\*\* \| `\/health`, `\/viewer\*` \| No \| No \|/);
});

test('authentication validation flow separates 401 admin failures from the 403 unconfigured case', async () => {
  const page = await readAuthenticationPage();
  const flow = sectionBetween(page, '## Full Token Validation Flow', '\n---');

  assert.match(
    flow,
    /ValidateAdmin -->\|"Admin token missing or incorrect"\| \w+\["401 Unauthorized"\]/,
  );
  assert.match(
    flow,
    /ValidateAdmin -->\|"ADMIN_API_TOKEN not configured"\| \w+\["403 Forbidden"\]/,
  );
  assert.doesNotMatch(flow, /ValidateAdmin -->\|Invalid\|/);
});

test('authentication troubleshooting reports an unset admin token as 403, not 401', async () => {
  const page = await readAuthenticationPage();
  const unauthorized = sectionBetween(
    page,
    '### Admin Endpoint Returns 401',
    '### Admin Endpoint Returns 403',
  );
  const forbidden = sectionBetween(
    page,
    '### Admin Endpoint Returns 403',
    '### Token Exposure Response',
  );

  assert.doesNotMatch(unauthorized, /not configured/i);
  assert.match(unauthorized, /Admin token mismatch between client and server/);

  assert.match(forbidden, /`403 Forbidden`/);
  assert.match(forbidden, /Admin token not configured/);
  assert.match(forbidden, /`ADMIN_API_TOKEN` is not set on the server/);
});
