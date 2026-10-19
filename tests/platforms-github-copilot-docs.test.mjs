import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/platforms/github-copilot.md', import.meta.url),
);

async function readCopilotPage() {
  return readFile(pagePath, 'utf8');
}

function section(page, heading) {
  const start = page.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + heading.length + 2);
  const next = rest.search(/\n(?:---|#{2,3} )/);
  return next === -1 ? rest : rest.slice(0, next);
}

test('recommended tag example uses bare category and repository tags only', async () => {
  const page = await readCopilotPage();
  const rules = section(page, '## Memory Rules for Copilot');
  const example = rules.match(/```json\n([\s\S]*?)\n```/);

  assert.ok(example, 'expected the tagging example JSON block');
  const { tags } = JSON.parse(example[1]);

  assert.deepEqual(tags, ['decision', 'repo-name']);
  assert.ok(
    tags.every((tag) => /^[a-z][a-z0-9-]*$/.test(tag)),
    'tags must be bare strings with no prefixes, dates, or platform names',
  );
  assert.ok(!tags.includes('copilot'), 'the example must not use a platform tag');
  assert.ok(
    !tags.some((tag) => /\d{4}-\d{2}|YYYY/i.test(tag)),
    'the example must not use a date-stamped tag',
  );
});

test('tagging guidance rules out platform, date, and namespace tags and points to temporal fields', async () => {
  const page = await readCopilotPage();
  const rules = section(page, '## Memory Rules for Copilot');

  assert.match(rules, /Tags are bare strings/);
  assert.match(
    rules,
    /shared mcp-automem memory policy \(the source of the Cursor, Codex, and Claude rules\) rules out/,
  );
  assert.match(rules, /rules out platform tags \(for example `copilot`\)/);
  assert.match(rules, /date-stamped tags \(for example `YYYY-MM`\)/);
  assert.match(rules, /namespace prefixes \(for example `project\/` or `lang\/`\)/);
  assert.match(rules, /`timestamp`/);
  assert.match(rules, /`t_valid` and `t_invalid`/);
  assert.match(rules, /instead of adding a date tag/);
  assert.ok(!/component-name/.test(page), 'the stale component tag placeholder must be gone');
});

test('cross-platform example does not claim a platform tag', async () => {
  const page = await readCopilotPage();
  const crossPlatform = section(page, '## Cross-Platform Memory Access');

  assert.match(
    crossPlatform,
    /3\. Memory includes context: tagged with the repository slug and a category such as `decision`, plus the stored `timestamp`/,
  );
  assert.ok(
    !/tagged with `copilot`/.test(crossPlatform),
    'a memory stored from Copilot is not tagged with the platform name',
  );
});

test('authentication troubleshooting names the AutoMem service variable AUTOMEM_API_TOKEN', async () => {
  const page = await readCopilotPage();
  const auth = section(page, '### Authentication failures');

  assert.match(
    auth,
    /`AUTOMEM_API_KEY` matches the `AUTOMEM_API_TOKEN` set in your AutoMem service/,
  );
  assert.ok(
    !auth.includes('`API_TOKEN`'),
    'API_TOKEN is the Python constant, not a variable operators set',
  );
  assert.ok(
    !/(?<![A-Z_])API_TOKEN/.test(page),
    'every API_TOKEN mention on the page must be the AUTOMEM_API_TOKEN variable',
  );
});
