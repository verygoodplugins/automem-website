import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const rootUrl = new URL("../", import.meta.url);
const sourceUrl = (path) => new URL(path, rootUrl);
const readSource = (path) => readFile(sourceUrl(path), "utf8");

test("robots.txt declares Content Signals for agents", async () => {
  const robots = await readSource("public/robots.txt");

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Content-Signal: ai-train=yes, search=yes, ai-input=yes$/m);
  assert.match(robots, /^Sitemap: https:\/\/automem\.ai\/sitemap-index\.xml$/m);
});

test("agent readiness helper serves homepage markdown and discovery Link headers", async () => {
  const helperUrl = sourceUrl("src/lib/agent-readiness.mjs");
  assert.equal(existsSync(helperUrl), true, "expected src/lib/agent-readiness.mjs to exist");

  const helper = await import(helperUrl.href);
  const markdown = helper.getHomepageMarkdown();
  assert.match(markdown, /^---\ntitle: AutoMem/m);
  assert.match(markdown, /# AutoMem/);
  assert.match(markdown, /https:\/\/automem\.ai\/docs\//);

  const markdownResponse = helper.createHomepageMarkdownResponse("GET");
  assert.equal(markdownResponse.status, 200);
  assert.equal(markdownResponse.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(markdownResponse.headers.get("Vary"), "Accept");
  assert.equal(markdownResponse.headers.get("Content-Signal"), "ai-train=yes, search=yes, ai-input=yes");
  assert.ok(Number(markdownResponse.headers.get("x-markdown-tokens")) > 0);
  assert.equal(await markdownResponse.text(), markdown);

  const htmlResponse = new Response("<!doctype html>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  const linkedResponse = helper.withAgentDiscoveryHeaders(htmlResponse, new URL("https://automem.ai/"));
  const linkHeader = linkedResponse.headers.get("Link");

  assert.match(linkHeader, /<\/\.well-known\/api-catalog>; rel="api-catalog"/);
  assert.match(linkHeader, /<\/llms\.txt>; rel="describedby"/);
  assert.match(linkHeader, /<\/auth\.md>; rel="describedby"/);
});

test("API catalog is a truthful docs catalog, not fake OAuth metadata", async () => {
  const helperUrl = sourceUrl("src/lib/agent-readiness.mjs");
  assert.equal(existsSync(helperUrl), true, "expected src/lib/agent-readiness.mjs to exist");

  const { getApiCatalog } = await import(helperUrl.href);
  const catalog = getApiCatalog();
  const serialized = JSON.stringify(catalog);

  assert.ok(Array.isArray(catalog.linkset));
  assert.match(serialized, /https:\/\/automem\.ai\/docs\/reference\/api\/direct-vs-mcp\//);
  assert.match(serialized, /https:\/\/automem\.ai\/docs\/operations\/health\//);
  assert.doesNotMatch(serialized, /token_endpoint|authorization_endpoint|jwks_uri/);
});

test("auth.md is self-contained and does not claim hosted agent OAuth", async () => {
  const authUrl = sourceUrl("public/auth.md");
  assert.equal(existsSync(authUrl), true, "expected public/auth.md to exist");

  const authMd = await readFile(authUrl, "utf8");

  assert.match(authMd, /^# auth\.md$/m);
  assert.match(authMd, /does not issue OAuth credentials/i);
  assert.match(authMd, /self-hosted AutoMem/i);
});

test("Agent Skills index points to a digest-verified skill artifact", async () => {
  const indexUrl = sourceUrl("public/.well-known/agent-skills/index.json");
  const skillUrl = sourceUrl("public/.well-known/agent-skills/use-automem-docs/SKILL.md");
  assert.equal(existsSync(indexUrl), true, "expected Agent Skills index to exist");
  assert.equal(existsSync(skillUrl), true, "expected Agent Skills artifact to exist");

  const indexText = await readFile(indexUrl, "utf8");
  const skillText = await readFile(skillUrl, "utf8");
  const index = JSON.parse(indexText);

  assert.equal(index.$schema, "https://schemas.agentskills.io/discovery/0.2.0/schema.json");
  assert.equal(index.skills.length, 1);

  const [skill] = index.skills;
  const digest = createHash("sha256").update(skillText).digest("hex");
  assert.equal(skill.name, "use-automem-docs");
  assert.equal(skill.type, "skill-md");
  assert.equal(skill.url, "https://automem.ai/.well-known/agent-skills/use-automem-docs/SKILL.md");
  assert.equal(skill.digest, `sha256:${digest}`);
});

test("Pages worker routes include homepage and API catalog for agent negotiation", async () => {
  const bundler = await readSource("scripts/bundle-worker.mjs");

  assert.match(bundler, /'\/'/);
  assert.match(bundler, /'\/\.well-known\/api-catalog'/);
});

test("homepage is server-rendered so middleware can negotiate markdown", async () => {
  const homepage = await readSource("src/pages/index.astro");

  assert.match(homepage, /export const prerender = false;/);
});
