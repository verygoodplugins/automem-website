import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('homepage promotes the install-first path', async () => {
  const homepage = await readSource('../src/pages/index.astro');

  assert.match(homepage, /<h1[^>]*>\s*AutoMem\s*<\/h1>/s);
  assert.match(homepage, /Persistent memory for\s*every agent you use\./);
  assert.match(homepage, /Open-source memory layer your agents and MCP tools can/);
  assert.match(homepage, /href="\/install"/);
  assert.doesNotMatch(homepage, /AutoMemMark/);
  assert.match(homepage, /\/automem-icon\.svg/);
  assert.match(homepage, /curl -fsSL https:\/\/automem\.ai\/install\.sh \| sh/);
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
  assert.match(homepage, /What the installer does/);
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
  assert.match(homepage, /import MemoryDrive/);
  assert.match(homepage, /<MemoryHero/);
  assert.match(homepage, /<MemoryDrive/);
  assert.match(homepage, /From forgetful to brilliant/);
  assert.match(homepage, /Dreams while you dream/);
  assert.doesNotMatch(homepage, /comment-header/);
  assert.doesNotMatch(homepage, /timelineEntries/);
  assert.doesNotMatch(homepage, /MEMORY_STREAM/);
});

test('/install page describes local, cloud, and existing endpoint setup', async () => {
  const installPage = await readSource('../src/pages/install.astro');

  // /install must prerender to a static asset; output: 'server' + absence from
  // the _worker.js routes (scripts/bundle-worker.mjs) would otherwise 404 it.
  assert.match(installPage, /export const prerender = true/);
  assert.match(installPage, /INSTALL_AUTOMEM\.sh/);
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
