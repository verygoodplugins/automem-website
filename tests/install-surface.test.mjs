import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('homepage promotes the install-first path', async () => {
  const homepage = await readSource('../src/pages/index.astro');

  // Hero manifesto: "Recall is Power." with the install-first subhead.
  assert.match(homepage, /<h1[^>]*>[\s\S]*?Recall is/);
  assert.match(homepage, /Power\.<\/span>/);
  assert.match(homepage, /Deploy once\. Remember everywhere\./);
  assert.match(homepage, /Universal memory for your AI agent\./);
  assert.match(homepage, /href="\/install"/);
  assert.doesNotMatch(homepage, /AutoMemMark/);
  assert.match(homepage, /\/automem-icon\.svg/);
  // The install command now lives in the shared InstallCommand widget (single
  // source of truth in src/lib/install-commands.ts), not inline on the page.
  assert.match(homepage, /import InstallCommand from/);
  assert.match(homepage, /<InstallCommand size="hero"/);
  assert.match(homepage, /https:\/\/automem\.ai\/skill\.md/);
  assert.match(homepage, /AGENT CLIENTS/);
  assert.match(homepage, /Model Context Protocol/);
  assert.match(homepage, /FalkorDB/);
  assert.match(homepage, /Graph Storage/);
  assert.match(homepage, /Qdrant/);
  assert.match(homepage, /Vector Store/);
  assert.match(homepage, /Local \(Docker\)/i);
  assert.match(homepage, /Qdrant/i);
  assert.match(homepage, /Railway/i);
  assert.match(homepage, /InstaPods/i);
  assert.match(homepage, /detect environment/i);
  assert.match(homepage, /choose local or cloud/i);
  assert.match(homepage, /provision AutoMem/i);
  assert.match(homepage, /wire MCP clients/i);
  // The 4-step "What the installer does" overview moved off the homepage and
  // onto /install (asserted in the install-page test below).
  assert.doesNotMatch(homepage, /What the installer does/);
  assert.match(homepage, /Works where agents already run/);
  assert.match(homepage, /Built on research\. Designed for recall\./);
  assert.match(homepage, /Graph \(FalkorDB\)/);
  assert.match(homepage, /Vector \(Qdrant\)/);
  assert.match(homepage, /Existing Endpoint/i);
  assert.match(homepage, /Codex/i);
  assert.match(homepage, /Claude/i);
  assert.match(homepage, /Cursor/i);
  assert.match(homepage, /ChatGPT/i);
  assert.match(homepage, /MCP-compatible/i);
  // concept story restored on top of the install-first page
  assert.match(homepage, /import MemoryHero/);
  assert.match(homepage, /import MemoryNexus/);
  assert.match(homepage, /<MemoryHero/);
  assert.match(homepage, /<MemoryNexus/);
  assert.match(homepage, /From forgetful to brilliant/);
  assert.match(homepage, /Memories link themselves\./);
  // Terminal-chrome eyebrows (comment-header) are intentionally restored in the
  // animated-hero redesign — a deliberate reversal of the earlier strip.
  assert.match(homepage, /comment-header/);
  assert.doesNotMatch(homepage, /timelineEntries/);
  assert.doesNotMatch(homepage, /MEMORY_STREAM/);
});

test('/install page describes local, cloud, and existing endpoint setup', async () => {
  const installPage = await readSource('../src/pages/install.astro');

  // /install must prerender to a static asset; output: 'server' + absence from
  // the _worker.js routes (scripts/bundle-worker.mjs) would otherwise 404 it.
  assert.match(installPage, /export const prerender = true/);
  assert.match(installPage, /INSTALL_AUTOMEM\.sh/);
  // Primary command uses the shared widget; path cards get copy buttons.
  assert.match(installPage, /<InstallCommand size="page"/);
  assert.match(installPage, /<CopyButton/);
  // The 4-step installer overview now lives here (moved off the homepage).
  assert.match(installPage, /What the installer does/);
  assert.match(installPage, /Local Docker/i);
  assert.match(installPage, /Hosted Cloud/i);
  assert.match(installPage, /Existing Endpoint/i);
  assert.match(installPage, /mcp-automem install/);
  assert.match(installPage, /codex/);
  assert.match(installPage, /claude-code/);
  assert.match(installPage, /cursor/);
  assert.match(installPage, /openclaw/);
  assert.match(installPage, /hermes/);
});

test('install command widget centralizes commands and exposes copy + toggle', async () => {
  const commands = await readSource('../src/lib/install-commands.ts');
  const widget = await readSource('../src/components/InstallCommand.astro');
  const copyButton = await readSource('../src/components/CopyButton.astro');

  // Single source of truth: both the curl launcher and the npm command.
  // The launcher uses the short, standardized URL (get.automem.ai → install.sh worker).
  assert.match(commands, /curl -fsSL get\.automem\.ai \| sh/);
  assert.doesNotMatch(commands, /automem\.ai\/install\.sh/);
  assert.match(commands, /npx @verygoodplugins\/mcp-automem setup/);

  // Script ⇄ npm toggle and one-line (non-wrapping) presentation.
  assert.match(widget, /data-install-tab="script"/);
  assert.match(widget, /data-install-tab="npm"/);
  assert.match(widget, /whitespace-nowrap/);
  assert.doesNotMatch(widget, /break-all/);

  // Copy affordance is the shared data-copy-text button.
  assert.match(copyButton, /data-copy-text/);
  assert.match(copyButton, /navigator\.clipboard\.writeText/);
});

test('public install.sh is a thin launcher for mcp-automem install', async () => {
  const installScriptUrl = new URL('../public/install.sh', import.meta.url);
  await access(installScriptUrl);
  const installScript = await readFile(installScriptUrl, 'utf8');

  assert.match(installScript, /^#!\/bin\/sh/);
  assert.match(installScript, /AutoMem/);
  assert.match(installScript, /node/);
  assert.match(installScript, /npm/);
  assert.match(installScript, /npx -y @verygoodplugins\/mcp-automem@latest install/);
  assert.match(installScript, /set -- install/);
  assert.match(installScript, /"\$@"/);
  assert.doesNotMatch(installScript, /--api-key/);
  assert.doesNotMatch(installScript, /AutoVault/);
});
