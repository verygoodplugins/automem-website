import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/codex.md', import.meta.url),
);

async function readCodexPage() {
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

test('Codex installer step describes the marker-bounded AGENTS.md block, not a month-aware section', async () => {
  const page = await readCodexPage();
  const step = section(page, /### Step 3: Add Memory Rules/, /### Step 4: Restart Codex/);

  assert.match(step, /<!-- BEGIN AUTOMEM CODEX RULES -->/);
  assert.match(step, /<!-- END AUTOMEM CODEX RULES -->/);
  assert.match(step, /gets the block appended/);
  assert.match(step, /one marker pair has that block replaced in place/);
  assert.match(step, /refused with an error/);
  assert.match(step, /does not edit `~\/\.codex\/config\.toml`/);
  assert.doesNotMatch(step, /month-aware/i);
  assert.doesNotMatch(step, /validates your MCP config/i);
  assert.doesNotMatch(page, /month-aware/i);
});

test('Codex rule template documents PROJECT_NAME as its only placeholder', async () => {
  const page = await readCodexPage();
  const rules = section(page, /## AGENTS\.md Rule System/, /\n### Memory Operation Patterns/);

  assert.match(rules, /`templates\/codex\/memory-rules\.md`/);
  assert.match(rules, /The template has one placeholder/);
  assert.match(rules, /- `\{\{PROJECT_NAME\}\}` → the `--name` value, otherwise detected from/);
  assert.match(rules, /`package\.json`, the git remote, or the directory name/);

  const placeholders = new Set(page.match(/\{\{[A-Z_]+\}\}/g));
  assert.deepEqual([...placeholders], ['{{PROJECT_NAME}}']);
  assert.doesNotMatch(page, /CURRENT_MONTH/);
});

test('Codex task start recall is the two-phase 20/30/90 pattern, issued in parallel', async () => {
  const page = await readCodexPage();
  const recall = section(page, /\*\*1\. Task Start Recall/, /\*\*2\. During-Task Storage/);

  assert.match(recall, /Task Start Recall \(two phases, issued in parallel\)/);
  assert.match(recall, /independent recalls, so the rules issue both in a single message/);
  assert.match(recall, /tags: \["preference"\],\s+limit: 20,\s+sort: "updated_desc"/);
  assert.match(recall, /query: "<proper nouns, product names, people, tools, specific topics/);
  assert.match(recall, /tags: \["\{\{PROJECT_NAME\}\}"\]/);
  assert.match(recall, /time_query: "last 90 days",\s+limit: 30,\s+language: "<typescript\|python\|go\|rust\|\.\.\.>"\s+\/\/ optional ranker/);
  assert.match(recall, /The task-context query is one semantic query/);
  assert.doesNotMatch(recall, /Then one semantic|Preferences first/);
  assert.doesNotMatch(recall, /last 30 days/);
  assert.doesNotMatch(recall, /queries:/);
  assert.doesNotMatch(recall, /switching projects|resuming work/i);
});

test('Codex tagging convention is bare category, project, and language tags', async () => {
  const page = await readCodexPage();
  const tagging = section(page, /## Tagging Convention/, /\n---\n/);

  assert.match(tagging, /Use bare tags only/);
  assert.match(tagging, /`automem`, not `project\/automem`/);
  assert.match(tagging, /`lang\/` prefixes, platform tags/);
  assert.match(tagging, /date-stamped tags/);
  assert.match(tagging, /`entity:\*:\*` tags are injected by the server/);
  assert.match(tagging, /The generated rules treat tags as a hard gate on recall/);
  assert.doesNotMatch(tagging, /By default, tags are a hard gate/);
  assert.match(tagging, /\*\*Category tag\*\*/);
  assert.match(tagging, /\*\*Project identifier\*\*/);
  assert.match(tagging, /\*\*Language tag\*\*/);
  assert.match(tagging, /`api`, `app`, `test`, `video`/);
  assert.match(tagging, /A language tag is not a gate/);
  assert.match(tagging, /optional `language` parameter, which boosts memories carrying that language tag without excluding the rest/);
  assert.match(tagging, /in the rules template/);
  assert.doesNotMatch(tagging, /in the generated rules\)/);
  assert.match(tagging, /`t_valid` and `t_invalid`/);

  assert.doesNotMatch(tagging, /4-part/);
  assert.doesNotMatch(tagging, /\*\*Platform tag\*\*/);
  assert.doesNotMatch(tagging, /\*\*Component tag\*\*/);
  assert.doesNotMatch(tagging, /\*\*Temporal tag\*\*/);
  assert.doesNotMatch(tagging, /time-based decay/);

  const example = tagging.match(/```json\n(\[[^\n]*\])\n```/);
  assert.ok(example, 'expected a JSON tag example');
  const tags = JSON.parse(example[1]);
  assert.deepEqual(tags, ['bugfix', 'my-app', 'typescript']);
  for (const tag of tags) {
    assert.doesNotMatch(tag, /\//, 'example tags must not use namespace prefixes');
    assert.doesNotMatch(tag, /^\d{4}-\d{2}$/, 'example tags must not be date-stamped');
    assert.notEqual(tag, 'codex', 'example tags must not include a platform tag');
  }
});

test('Codex cross-platform sync does not recommend platform tags', async () => {
  const page = await readCodexPage();
  const sync = section(page, /## Cross-Platform Memory Sync/, /\n---\n/);

  assert.match(sync, /Do not add a platform tag \(`codex`, `cursor`, `claude-code`\)/);
  assert.match(sync, /ban platform tags/);
  assert.match(sync, /Store the same bare project tag on every platform/);
  assert.match(sync, /`tag_mode: "any"` \(default\)/);
  assert.doesNotMatch(sync, /distinguishes source/);
  assert.doesNotMatch(sync, /Always include the project identifier tag/);
});

test('Codex CLI reference lists the real defaults and the --quiet flag', async () => {
  const page = await readCodexPage();
  const reference = section(page, /## CLI Command Reference/, /\n---\n/);
  const rows = new Map(
    reference
      .split('\n')
      .filter((line) => line.startsWith('| `--'))
      .map((line) => {
        const cells = line.split('|').map((cell) => cell.trim());
        return [cells[1].split(' ')[0].replaceAll('`', ''), cells];
      }),
  );

  assert.deepEqual([...rows.keys()], ['--name', '--dry-run', '--rules', '--quiet']);
  assert.equal(rows.get('--rules')[3], '`./AGENTS.md`');
  assert.equal(rows.get('--quiet')[2], 'Suppress output');
  assert.equal(rows.get('--quiet')[3], '`false`');
  assert.match(rows.get('--name')[3], /directory name/);
  assert.doesNotMatch(reference, /Current working directory/);
});
