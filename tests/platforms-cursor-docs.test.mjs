import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/cursor.md', import.meta.url),
);

async function readCursorPage() {
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

test('Cursor installer falls back to the memory server name, so tools are mcp_memory_* by default', async () => {
  const page = await readCursorPage();
  const installer = section(page, /The installer:\n/, /\n---\n/);
  const naming = section(page, /### Tool Naming Convention/, /\n---\n/);

  assert.match(installer, /looks for `memory`, `automem`, or any server with AutoMem signatures\) and uses `memory` when it finds none/);
  assert.match(naming, /replaces every character other than an ASCII letter, digit, or underscore with an underscore/);
  assert.match(naming, /If it finds no AutoMem server in `~\/\.cursor\/mcp\.json`, it falls back to the server name `memory`/);
  assert.match(naming, /so the rules use `mcp_memory_\*` tool names by default/);
  assert.doesNotMatch(naming, /automatically detects/);
});

test('Cursor rule file is two-phase recall plus three storage triggers, not a three-phase lifecycle', async () => {
  const page = await readCursorPage();
  const rules = section(page, /## Rule File Structure/, /\n---\n/);

  assert.match(rules, /### Two-Phase Recall and Three Storage Triggers/);
  assert.match(rules, /two recalls at the start of a session, followed by three mid-conversation storage triggers/);
  assert.match(rules, /\*\*Session start: two recalls, issued in parallel\*\*/);
  assert.match(rules, /independent recalls, so the rule file has Cursor issue both in a single message/);
  assert.match(rules, /`limit: 20` for preferences, `limit: 30` for task context, and a 90-day task window/);
  assert.match(rules, /\*\*Preferences\*\*: `tags: \["preference"\]`, `limit: 20`, `sort: "updated_desc"`/);
  assert.match(rules, /`time_query: "last 90 days"` and `limit: 30`/);
  assert.match(rules, /`language` and `active_path` parameters boost results and do not gate them/);
  assert.match(rules, /Skip the task-context recall for pure syntax questions, trivial edits, one-off calculations, direct factual queries about current files, and casual openings/);
  assert.match(rules, /Debug recall is separate and runs only when Cursor is investigating a concrete symptom/);
  assert.match(rules, /`limit: 20`, and no tag gate/);
  assert.match(rules, /add a tag gate \(a stable category or the unambiguous project slug\)/);
  assert.match(rules, /adding `expand_respect_tags: true` only when traversal must stay inside the tag gate/);
  assert.doesNotMatch(rules, /plus `expand_respect_tags: true`/);
  assert.match(rules, /not to re-recall mid-conversation unless the topic shifts, a new proper noun enters, or debugging starts/);

  assert.doesNotMatch(page, /Three-Phase/i);
  assert.doesNotMatch(page, /three-phase/i);
  assert.doesNotMatch(page, /Phase [123]/);
  assert.doesNotMatch(rules, /Always recall for/);
  assert.doesNotMatch(rules, /Adaptive recall logic/);
  assert.doesNotMatch(rules, /Performance optimization/);
  assert.doesNotMatch(rules, /tagged with those components/);
  assert.doesNotMatch(rules, /Recall context for most questions/);
});

test('Cursor storage triggers use the 0.9 / 0.85-0.9 / 0.8 importance values and an Insight at 0.75', async () => {
  const page = await readCursorPage();
  const rules = section(page, /## Rule File Structure/, /\n---\n/);
  const triggers = section(rules, /\*\*During the conversation: three storage triggers\*\*/, /\*\*No end-of-conversation summary\*\*/);

  const rows = new Map(
    triggers
      .split('\n')
      .filter((line) => /^\| (User correction|Decision stabilizes|Pattern the user)/.test(line))
      .map((line) => {
        const cells = line.split('|').map((cell) => cell.trim());
        return [cells[2].match(/`(\w+)`/)[1], cells];
      }),
  );

  assert.deepEqual([...rows.keys()], ['Preference', 'Decision', 'Pattern']);
  assert.equal(rows.get('Preference')[3], '0.9');
  assert.match(rows.get('Preference')[2], /tag `correction`, confidence 0\.95/);
  assert.match(rows.get('Preference')[4], /`INVALIDATED_BY`/);
  assert.equal(rows.get('Decision')[3], '0.85–0.9');
  assert.match(rows.get('Decision')[4], /`PREFERS_OVER`/);
  assert.equal(rows.get('Pattern')[3], '0.8');
  assert.match(rows.get('Pattern')[4], /`EXEMPLIFIES`/);

  assert.match(triggers, /and only these three/);
  assert.match(triggers, /A bug-fix root cause is stored as an `Insight` \(importance 0\.75, confidence 0\.85\) tagged `bugfix` and `solution`, then associated with the bug report through `LEADS_TO`/);

  assert.match(triggers, /Every store follows the same four steps/);
  assert.match(triggers, /1\. Recall related memories \(`limit: 5`\)/);
  assert.match(triggers, /retry the store once if it is missing/);
  assert.match(triggers, /Associate it with the related memory from step 1 when one exists/);

  assert.doesNotMatch(page, /0\.6–0\.8/);
  assert.doesNotMatch(page, /0\.5–0\.7/);
  assert.doesNotMatch(rules, /^\| Context \|/m);
  assert.doesNotMatch(rules, /\| Preference \| 0\.6/);
  assert.doesNotMatch(rules, /\| Pattern \| 0\.7/);
  assert.doesNotMatch(rules, /\| Insight \| 0\.8/);
  assert.doesNotMatch(rules, /JWT authentication/);
});

test('Cursor rule file has no end-of-conversation summary', async () => {
  const page = await readCursorPage();
  const summary = section(page, /\*\*No end-of-conversation summary\*\*/, /\n---\n/);

  assert.match(summary, /never to store session summaries, progress reports, confirmations, speculative context, or attentiveness notes/);
  assert.match(summary, /never to store secrets, credentials, tokens, or PII/);
  assert.match(summary, /It has no wrap-up step at the end of the conversation/);

  assert.doesNotMatch(page, /Summarize when/);
  assert.doesNotMatch(page, /Conversation End/);
  assert.doesNotMatch(page, /Multiple files were modified/i);
});

test('Cursor tagging convention is bare category, project, and language tags', async () => {
  const page = await readCursorPage();
  const tagging = section(page, /## Tagging Conventions/, /\n---\n/);

  assert.match(tagging, /Use bare tags only/);
  assert.match(tagging, /`automem`, not `project\/automem`/);
  assert.match(tagging, /`lang\/` prefixes, platform tags \(so no `cursor` tag\), and date-stamped tags \(so no `YYYY-MM`\)/);
  assert.match(tagging, /`entity:\*:\*` tags are injected by the server/);
  assert.match(tagging, /treats tags as a hard gate on recall/);
  assert.match(tagging, /rather than guessed topic tags/);
  assert.match(tagging, /1\. \*\*Category tag\*\*: a stable category such as `preference`, `bugfix`, `solution`, or `correction`/);
  assert.match(tagging, /2\. \*\*Project tag\*\*: your project name \(`\{\{PROJECT_NAME\}\}` in the rule template\)/);
  assert.match(tagging, /detected from `package\.json`, the git remote, or the directory name, or set with `--name`/);
  assert.match(tagging, /3\. \*\*Language tag\*\*/);
  assert.match(tagging, /the rule file drops the project tag gate on recall and relies on the semantic query alone/);
  assert.match(tagging, /`api`, `app`, `test`, `video`/);
  assert.match(tagging, /A language tag is not a gate/);
  assert.match(tagging, /session-start preferences recall is gated on `preference` alone/);
  assert.match(tagging, /is gated on `preference` alone and is not scoped to a project, so the most recently updated `preference`-tagged memories \(up to 20\) surface in any project/);
  assert.doesNotMatch(tagging, /found in every project/);
  assert.match(tagging, /set `t_valid` and `t_invalid` instead of encoding a date in a tag/);

  assert.doesNotMatch(tagging, /Platform tag/);
  assert.doesNotMatch(tagging, /Current month/);
  assert.doesNotMatch(tagging, /Component tag/);
  assert.doesNotMatch(tagging, /`personal`/);
  assert.doesNotMatch(tagging, /discoverable across all projects/);
  assert.doesNotMatch(tagging, /^\d\. `cursor`/m);
  assert.doesNotMatch(tagging, /^\d\. `YYYY-MM`/m);

  const example = tagging.match(/```json\n(\[[^\n]*\])\n```/);
  assert.ok(example, 'expected a JSON tag example');
  const tags = JSON.parse(example[1]);
  assert.deepEqual(tags, ['decision', 'my-app', 'typescript']);
  for (const tag of tags) {
    assert.doesNotMatch(tag, /\//, 'example tags must not use namespace prefixes');
    assert.doesNotMatch(tag, /^\d{4}-\d{2}$/, 'example tags must not be date-stamped');
    assert.notEqual(tag, 'cursor', 'example tags must not include a platform tag');
  }
});

test('Cursor CLI flag table lists every project-name fallback for --name', async () => {
  const page = await readCursorPage();
  const row = page.split('\n').find((line) => line.startsWith('| `--name <project>`'));

  assert.ok(row, 'expected a --name row');
  assert.equal(row.split('|')[3].trim(), 'Auto-detected from `package.json`, git remote, or directory name');
  assert.match(page, /1\. Detects project name from `package\.json`, git remote, or directory name/);
});

test('Cursor store_memory parameters list the validity window fields the tag guidance points to', async () => {
  const page = await readCursorPage();
  const store = section(page, /\*\*`store_memory`\*\*/, /\*\*`recall_memory`\*\*/);

  assert.match(store, /- `t_valid` \/ `t_invalid` \(optional\): ISO 8601 timestamps for when the memory becomes valid and when it expires \(single-memory mode only\)/);
});

test('Cursor page source links, if any, use pinned release revisions', async () => {
  const page = await readCursorPage();
  const links = [
    ...page.matchAll(
      /https:\/\/github\.com\/verygoodplugins\/(automem|mcp-automem|automem-graph-viewer)\/blob\/([0-9a-f]{40})\//g,
    ),
  ];

  for (const [, repo, sha] of links) {
    assert.ok(isPinnedSha(repo, sha), `${repo} link must use a pinned release SHA`);
  }
});
