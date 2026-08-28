import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const defaultPagePath = fileURLToPath(
  new URL('../src/content/docs/docs/cli/platform-installers.md', import.meta.url),
);
const pagePath = process.env.PLATFORM_INSTALLERS_DOCS_PAGE_PATH || defaultPagePath;
const releaseSha = '9a0bbf754dd31db524da25638b0e97907e32ff37';

async function readPage() {
  return readFile(pagePath, 'utf8');
}

test('platform installers overview includes Copilot and current generated outputs', async () => {
  const page = await readPage();

  assert.match(page, /\| `copilot` \| `\.github\/instructions\/automem\.instructions\.md` \+ `\.vscode\/mcp\.json` \| Copilot Chat\/VS Code MCP settings \(manual\) \|/);
  assert.match(page, /"memory"/);
  assert.match(page, /"args": \["-y", "@verygoodplugins\/mcp-automem"\]/);
  assert.match(page, /Cursor can receive `AUTOMEM_API_URL` and `AUTOMEM_API_KEY` from the MCP config `env` block/);
});

test('platform installers claude desktop instructions link is release pinned', async () => {
  const page = await readPage();

  assert.match(
    page,
    new RegExp(
      String.raw`\[` + '`' + String.raw`templates\/CLAUDE_DESKTOP_INSTRUCTIONS\.md` + '`' + String.raw`\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/${releaseSha}\/templates\/CLAUDE_DESKTOP_INSTRUCTIONS\.md\)`,
      'u',
    ),
  );
  assert.doesNotMatch(page, /https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/main\/templates\/CLAUDE_DESKTOP_INSTRUCTIONS\.md/u);
});

test('platform installers claude code section describes hooks and retired scripts accurately', async () => {
  const page = await readPage();

  assert.match(page, /Hook scripts in `~\/\.claude\/hooks\/`/);
  assert.match(page, /removes retired hook-era files from older installs/);
  assert.doesNotMatch(page, /~\/\.claude\/scripts\//);
});
