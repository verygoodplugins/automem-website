import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("homepage promotes InstaPods referral deployment and works-everywhere positioning", async () => {
  const homepage = await readSource("../src/pages/index.astro");

  assert.match(homepage, /https:\/\/instapods\.com\/apps\/automem\/\?ref=jack/);
  assert.match(homepage, /description=\{homepageDescription\}/);
  assert.match(homepage, /Claude, Cursor, Copilot, Codex, ChatGPT/);
  assert.match(homepage, /MCP and Streamable HTTP/);
  assert.match(homepage, /Deploy Once\. Remember Everywhere\./);
  assert.match(homepage, /title: 'InstaPods'/);
  assert.match(homepage, /title: 'Railway'/);
  assert.match(homepage, /Self-hosted \/ Docker/);

  for (const client of [
    "Claude Desktop",
    "Claude Code",
    "Cursor",
    "GitHub Copilot",
    "Codex",
    "Windsurf",
    "ChatGPT",
    "Any MCP-compatible client",
  ]) {
    assert.match(homepage, new RegExp(client.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

});

test("footer links to the InstaPods referral page", async () => {
  const footer = await readSource("../src/components/SiteFooter.astro");

  assert.match(footer, /https:\/\/instapods\.com\/apps\/automem\/\?ref=jack/);
  assert.match(footer, /InstaPods/);
});

test("base layout default metadata avoids Claude-only framing", async () => {
  const layout = await readSource("../src/layouts/Layout.astro");

  assert.match(layout, /MCP-compatible AI tools/);
  assert.doesNotMatch(layout, /Claude Desktop memory service/i);
});

test("docs include InstaPods as a deployment option", async () => {
  const [astroConfig, quickStart, cliSetup, instaPods] = await Promise.all([
    readSource("../astro.config.mjs"),
    readSource("../src/content/docs/docs/getting-started/quick-start.md"),
    readSource("../src/content/docs/docs/cli/setup.md"),
    readSource("../src/content/docs/docs/deployment/instapods.md"),
  ]);

  assert.match(astroConfig, /label: 'InstaPods'/);
  assert.match(astroConfig, /slug: 'docs\/deployment\/instapods'/);

  for (const source of [quickStart, cliSetup, instaPods]) {
    assert.match(source, /https:\/\/instapods\.com\/apps\/automem\/\?ref=jack/);
    assert.match(source, /InstaPods/);
  }

  assert.match(instaPods, /about 30 seconds/i);
  assert.match(instaPods, /\$15\/mo flat/);
  assert.match(instaPods, /generated MCP config/i);
});
