import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/claude-code.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Text between a start marker and the next marker, so assertions stay scoped.
function between(page, start, end) {
  const from = page.indexOf(start);
  assert.notEqual(from, -1, `expected to find ${start}`);
  const to = page.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `expected to find ${end} after ${start}`);
  return page.slice(from, to);
}

test('plugin tree lists both registered hook events and all three bundled scripts', async () => {
  const page = await readPage();
  const tree = between(page, '~/.claude/plugins/automem@marketplace-name/\n', '\n```\n');

  assert.match(tree, /hooks\.json\s+# SessionStart \+ PostToolUse hook config/);
  assert.doesNotMatch(tree, /hooks\.json\s+# SessionStart hook config/);
  assert.match(tree, /session-start\.sh/);
  assert.match(tree, /stop-nudge\.sh\s+# Stop nudge script \(not registered by hooks\.json\)/);
  assert.match(tree, /track-store\.sh\s+# PostToolUse store tracker/);
});

test('plugin section says hooks.json registers SessionStart and PostToolUse but no Stop hook', async () => {
  const page = await readPage();
  const section = between(page, '### Method 1: Plugin Installation', '### Method 2:');

  assert.match(section, /`hooks\.json` registers two hooks: SessionStart \(the recall prompt\) and PostToolUse/);
  assert.match(section, /`stop-nudge\.sh` ships with the plugin, but `hooks\.json` does not register a Stop hook/);
});

test('session-start recall uses preference limit 20 and a single 90-day limit-30 task query', async () => {
  const page = await readPage();
  const recall = between(page, '### Two-Phase Recall at Session Start', '### Storage Patterns by Type');

  const phase1 = between(recall, '**Phase 1', '**Phase 2');
  assert.match(phase1, /tags: \["preference"\],\s+limit: 20,\s+sort: "updated_desc"/);
  assert.match(phase1, /no query and no time filter/);

  const phase2 = recall.slice(recall.indexOf('**Phase 2'));
  assert.match(phase2, /\bquery: "<proper nouns, specific tools, exact topics from the user's message>"/);
  assert.match(phase2, /tags: \["<project-slug>"\]/);
  assert.match(phase2, /time_query: "last 90 days"/);
  assert.match(phase2, /limit: 30/);
  assert.match(phase2, /Drop the `tags` line when the slug collides with a common topic word/);
  assert.match(phase2, /issue them in parallel in a single message/);
  assert.match(phase2, /`queries\[\]` with `auto_decompose` only for genuinely multi-topic questions/);

  assert.doesNotMatch(recall, /limit: 10/);
  assert.doesNotMatch(recall, /queries: \[/);
  assert.doesNotMatch(recall, /last 30 days/);
  assert.doesNotMatch(recall, /current task/);
  assert.doesNotMatch(recall, /Do not mix tag-based preference recall/);
});

test('storage pattern importance for Pattern is 0.8', async () => {
  const page = await readPage();
  const table = between(page, '### Storage Patterns by Type', '### Content Size Governance');

  assert.match(table, /^\| `Pattern` \| 0\.8 \| Reusable approaches, best practices \|/m);
  assert.doesNotMatch(table, /^\| `Pattern` \| 0\.7 /m);
  // Neighbouring rows keep the values the release rules give them.
  assert.match(table, /^\| `Preference` \| 0\.9 \|/m);
  assert.match(table, /^\| `Decision` \| 0\.9 \|/m);
});

test('a bug fix is associated with LEADS_TO, not DERIVED_FROM', async () => {
  const page = await readPage();
  const triggers = between(page, '**Association triggers:**', '\n---');

  assert.match(triggers, /^\| Bug fix \| Link to original bug discovery \| `LEADS_TO` \|$/m);
  assert.doesNotMatch(triggers, /DERIVED_FROM/);

  // DERIVED_FROM stays a valid authorable type in the relationship table.
  const relationships = between(page, '### Relationship Types (14 types)', '**Association triggers:**');
  assert.match(relationships, /^\| `DERIVED_FROM` \| Source relationships, origins \|$/m);
  assert.match(relationships, /^\| `LEADS_TO` \| Bug → Solution, Problem → Fix \|$/m);
});

test('tagging strategy uses bare tags with no platform or date tag and validity windows', async () => {
  const page = await readPage();
  const tagging = between(page, '## Tagging Strategy', '## Migration from Legacy Hook Installs');

  assert.match(tagging, /Use bare tags only\. Do not add a platform tag \(such as `claude-code`\) or date tags/);
  assert.match(tagging, /`entity:\*:\*` tags, which the server injects/);
  assert.match(tagging, /One category tag when applicable: `preference`, `decision`, `pattern`, `bugfix`, `solution`/);
  assert.match(tagging, /bare project slug when the memory is project-specific/);
  assert.match(tagging, /3\. A language or component\/domain tag only when it improves recall/);
  assert.match(
    tagging,
    /do not gate recall on guessed topic tags; put those nouns in the query/,
  );
  assert.doesNotMatch(tagging, /so do not guess topic tags/);
  assert.match(tagging, /`t_valid` \(and `t_invalid` when known\)/);

  const examples = tagging.match(/\*\*Examples:\*\* (.+)/);
  assert.ok(examples, 'expected an Examples line');
  assert.match(examples[1], /\["decision", "my-app"\]/);
  assert.match(examples[1], /\["decision", "my-app", "typescript"\]/);
  assert.match(examples[1], /\["bugfix", "solution", "my-app", "auth"\]/);
  assert.doesNotMatch(examples[1], /claude-code/);
  assert.doesNotMatch(examples[1], /\d{4}-\d{2}/);

  assert.doesNotMatch(tagging, /Add platform tag/);
  assert.doesNotMatch(tagging, /Include current month/);
  assert.doesNotMatch(tagging, /YYYY-MM/);
});

test('guided-installer wording from the install-command update stays in place', async () => {
  const page = await readPage();

  assert.match(page, /`npx @verygoodplugins\/mcp-automem install`/);
  assert.match(page, /`--claude-code-mode settings` selects it without the prompt/);
  assert.match(page, /The `claude-code` command is the settings-level writer, not a second guided installer\./);
});

test('source permalinks on the page use validated release revisions', async () => {
  const page = await readPage();
  const links = [
    ...page.matchAll(
      /github\.com\/verygoodplugins\/(automem-graph-viewer|mcp-automem|automem)\/blob\/([0-9a-f]{40})\//g,
    ),
  ];

  for (const [, name, sha] of links) {
    assert.ok(isPinnedSha(name, sha), `${name} permalink ${sha} must be a pinned revision`);
  }
});
