import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/graph-viewer/overview.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, startHeading, endHeading) {
  const start = page.indexOf(startHeading);
  const end = page.indexOf(endHeading, start + startHeading.length);

  assert.notEqual(start, -1, `expected a "${startHeading}" heading`);
  assert.notEqual(end, -1, `expected a "${endHeading}" heading after "${startHeading}"`);

  return page.slice(start, end);
}

function tableRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|[-| ]+\|$/u.test(line))
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    );
}

test('/viewer route links use the current validated AutoMem revision', async () => {
  const page = await readPage();
  const links = [
    ...page.matchAll(/https:\/\/github\.com\/verygoodplugins\/automem\/blob\/([^/]+)\/([^)#\s]+)/g),
  ];

  assert.ok(links.length >= 1, 'expected a source link for the /viewer compatibility route');
  assert.ok(
    links.some(([, , file]) => file === 'automem/api/viewer.py'),
    'expected the /viewer route to link to automem/api/viewer.py',
  );
  assert.ok(
    links.every(([, sha]) => isPinnedSha('automem', sha)),
    'AutoMem source links must use a validated AutoMem revision',
  );

  const viewerLinks = [
    ...page.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/automem-graph-viewer\/blob\/([^/]+)\//g,
    ),
  ];
  assert.ok(
    viewerLinks.every(([, sha]) => isPinnedSha('automem-graph-viewer', sha)),
    'graph-viewer source links must use a validated graph-viewer revision',
  );
});

test('/viewer is described as a configured redirect, not a bundled viewer', async () => {
  const page = await readPage();
  const intro = section(page, 'The AutoMem Graph Viewer is a standalone', '![AutoMem Graph Viewer overview');

  assert.match(intro, /needs `GRAPH_VIEWER_URL`/);
  assert.match(intro, /without it, `\/viewer` answers 503/);
  assert.match(intro, /`ENABLE_GRAPH_VIEWER` is enabled, which is the default/);
  assert.match(intro, /skips the API-token guard, but the viewer's own API calls do not/);
  assert.match(intro, /when `AUTOMEM_API_TOKEN` is set, they need that token/);
  assert.doesNotMatch(intro, /directly from a running AutoMem instance/);
  assert.doesNotMatch(intro, /compatibility routes that redirect into the graph viewer/);
});

test('overview size documents the client-side cap and its hidden override', async () => {
  const page = await readPage();
  const canvas = section(page, '### 3D Graph Canvas', '### Expandable Graph');

  assert.match(canvas, /loads the most important memories first, up to 2,000 nodes by default/);
  assert.match(canvas, /client-side limit \(`MAX_SNAPSHOT` in the viewer\)/);
  assert.match(canvas, /\*\*Overview size\*\* under Settings → Filters offers 500, 1,000, or 2,000 nodes/);
  assert.match(canvas, /`\?cap=10000`/);
  assert.match(canvas, /`localStorage\.automem_snapshot_cap = '10000'`/);
  assert.match(canvas, /URL parameter wins over `localStorage`/);
  assert.match(canvas, /non-numeric or below 1 falls back to 2,000/);
  assert.match(canvas, /not one of the presets shows up as an extra \*\*Overview size\*\* button/);
  assert.doesNotMatch(canvas, /\(default 2,000 nodes\)/);
});

test('force settings list all five controls with their real names, ranges, and defaults', async () => {
  const page = await readPage();
  const canvas = section(page, '### 3D Graph Canvas', '### Expandable Graph');
  const forcesStart = canvas.indexOf('The **Forces** section of the Settings panel');
  assert.notEqual(forcesStart, -1, 'expected the Forces settings table');
  const forces = canvas.slice(forcesStart);
  const rows = tableRows(forces).slice(1);

  assert.match(canvas, /has five sliders, plus Reheat and Reset buttons/);
  assert.deepEqual(
    rows.map(([label, field, , range, fallback]) => [label, field, range, fallback]),
    [
      ['Center Force', '`centerStrength`', '0.01 to 0.2', '0.05'],
      ['Repel Force', '`chargeStrength`', '-200 to -20', '-100'],
      ['Link Force', '`linkStrength`', '0.1 to 1', '0.5'],
      ['Link Distance', '`linkDistance`', '20 to 100', '50'],
      ['Collision Radius', '`collisionRadius`', '1 to 4', '2'],
    ],
  );

  const effects = Object.fromEntries(rows.map(([label, , effect]) => [label, effect]));
  assert.equal(effects['Center Force'], 'Keeps the graph centered on the origin');
  assert.equal(
    effects['Link Force'],
    "How strongly each edge holds its preferred length, scaled by each relationship's own strength",
  );

  for (const wrong of [
    /Center gravity/i,
    /Pull toward the origin/,
    /pull their endpoints together/,
    /Charge strength/,
    /Minimum node spacing/,
    /-200 to -50/,
  ]) {
    assert.doesNotMatch(canvas, wrong);
  }
});

test('keyboard navigation lists the real shortcut map and credits search focus to the search bar', async () => {
  const page = await readPage();
  const navigation = section(page, '### Navigation', '### Hand Tracking Controls');
  const rows = tableRows(navigation).slice(1);

  assert.deepEqual(rows, [
    ['`↑` `↓` `←` `→`', 'Navigate between nodes'],
    ['`Shift` + `↑` `↓`', 'Navigate in the Z axis'],
    ['`Tab`', 'Next node'],
    ['`Shift` + `Tab`', 'Previous node'],
    ['`Esc`', 'Deselect, or cancel pathfinding'],
    ['`P`', 'Find a path from the selected node'],
    ['`R`', 'Reheat the simulation'],
    ['`Shift` + `R`', 'Reset the view'],
    ['`,`', 'Toggle settings'],
    ['`L`', 'Toggle labels'],
    ['`?`', 'Show the shortcuts panel'],
  ]);

  // `Enter` is not a node-select shortcut; it only picks a recent search inside the search box.
  assert.doesNotMatch(navigation, /\bEnter\b/);
  assert.doesNotMatch(navigation, /arrow keys to traverse nodes/);

  // `/` is a real shortcut, owned by the SearchBar rather than useKeyboardNavigation.
  assert.match(navigation, /`\/` or `Cmd`\/`Ctrl` \+ `K` focuses the search box/);
  assert.match(navigation, /\*\*SearchBar\*\* handles both/);
  assert.match(navigation, /`T` toggles the tag cloud/);
  assert.match(navigation, /`Cmd`\/`Ctrl` \+ `\[` and `Cmd`\/`Ctrl` \+ `\]`/);
  assert.match(navigation, /While time travel is active, `Space`/);
});
