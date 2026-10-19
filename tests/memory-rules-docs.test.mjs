import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { isPinnedSha } from './helpers/source-pins.mjs';

const pagePath = fileURLToPath(
  new URL('../src/content/docs/docs/best-practices/memory-rules.md', import.meta.url),
);

async function readPage() {
  return readFile(pagePath, 'utf8');
}

// Text of a `## ` section, from its heading to the next top-level heading.
function section(page, heading) {
  const start = page.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" section`);
  const rest = page.slice(start + 1);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

// Text of a `### ` subsection, from its heading to the next heading of either level.
function subsection(page, heading) {
  const start = page.indexOf(`\n### ${heading}\n`);
  assert.notEqual(start, -1, `expected a "${heading}" subsection`);
  const rest = page.slice(start + 1);
  const next = rest.slice(4).search(/\n#{2,3} /);
  return next === -1 ? rest : rest.slice(0, next + 4);
}

test('graph expansion parameters link to the pinned MCP tool schema, not src/index.ts', async () => {
  const page = await readPage();
  const links = [
    ...page.matchAll(
      /\[`src\/mcp-surface\.ts` L373–L418\]\(https:\/\/github\.com\/verygoodplugins\/mcp-automem\/blob\/([0-9a-f]{40})\/src\/mcp-surface\.ts#L373-L418\)/g,
    ),
  ];

  assert.equal(links.length, 1, 'expected one permalink to the recall_memory expansion schema');
  assert.ok(
    isPinnedSha('mcp-automem', links[0][1]),
    'the expansion schema permalink must use a pinned mcp-automem release SHA',
  );
  assert.doesNotMatch(page, /src\/index\.ts/);
  for (const parameter of [
    'expand_entities',
    'expand_relations',
    'expand_min_importance',
    'expand_min_strength',
    'expansion_limit',
    'relation_limit',
  ]) {
    assert.match(page, new RegExp(`- \`${parameter}: `), `expected ${parameter} in the parameter list`);
  }
});

test('tag examples use bare tags with no platform, date, or namespace tags', async () => {
  const page = await readPage();
  const tagArrays = [...page.matchAll(/"tags":\s*\[([^\]]*)\]/g)].map(([, tags]) => tags);

  assert.ok(tagArrays.length >= 4, 'expected tag examples on the page');
  for (const tags of tagArrays) {
    assert.doesNotMatch(tags, /"(?:cursor|codex|claude-code|claude-desktop)"/, `platform tag in [${tags}]`);
    assert.doesNotMatch(tags, /"\d{4}-\d{2}"/, `date-stamped tag in [${tags}]`);
    assert.doesNotMatch(tags, /"personal"/, `personal tag in [${tags}]`);
    assert.doesNotMatch(tags, /"(?:project|lang)\//, `namespace-prefixed tag in [${tags}]`);
  }

  const tagging = section(page, 'Tagging Conventions');
  assert.match(tagging, /"tags": \["decision", "my-api-service", "typescript"\]/);
  assert.match(tagging, /"tags": \["preference"\]/);
  assert.match(tagging, /:::caution\[Bare tags only\]/);
  assert.match(tagging, /no `project\/` or `lang\/` prefixes/);
  assert.match(tagging, /no platform tags \(`cursor`, `claude-code`\)/);
  assert.match(tagging, /no date-stamped tags such as `YYYY-MM`/);
  assert.match(tagging, /`entity:\*:\*` tags are added by the service during enrichment, so don't author them/);
  assert.match(tagging, /Tags are a hard gate on recall, so gate on a stable category or the project slug, and put topic words in the `query`/);
  assert.match(tagging, /api`, `app`, `test`, `video`/);
});

test('tagging conventions no longer teach namespaces, personal tags, or monthly tags', async () => {
  const page = await readPage();

  assert.doesNotMatch(page, /Namespace Hierarchy/);
  assert.doesNotMatch(page, /Namespace Support via Prefix Matching/);
  assert.doesNotMatch(page, /Hierarchical Tagging Schema/);
  assert.doesNotMatch(page, /Why Separate Personal and Project Namespaces/);
  assert.doesNotMatch(page, /From template documentation/);
  assert.doesNotMatch(page, /Personal namespace/);
  assert.doesNotMatch(page, /project-x\//);
  assert.doesNotMatch(page, /auth\/jwt|auth\/oauth|`auth\/\*`/);
  assert.doesNotMatch(page, /Monthly Tags/);
  assert.doesNotMatch(page, /Time Tag Conventions/);
  assert.doesNotMatch(page, /Always include the current month/);
  assert.doesNotMatch(page, /"tags": \["2026-0\d"/);
  assert.doesNotMatch(page, /\{\{CURRENT_MONTH\}\}/);
  assert.doesNotMatch(page, /\{\{PROJECT_DESC\}\}/);
  assert.doesNotMatch(page, /Tag consistently\*\* — project, platform, date, component/);
  assert.match(page, /\*\*Tag consistently\*\* — bare strings: category, project slug, language/);
});

test('time conventions use time filters and validity windows instead of date tags', async () => {
  const page = await readPage();
  const time = subsection(page, 'Time Conventions');

  assert.match(time, /Don't put dates in tags/);
  assert.match(time, /carries a `timestamp` \(the store time unless you pass one\)/);
  assert.match(time, /`time_query` \(or explicit `start` \/ `end`\) filters on it/);
  assert.match(time, /"time_query": "last 30 days"/);
  assert.match(time, /`t_valid` and `t_invalid` on `store_memory` \(single-memory mode only\)/);
  assert.match(time, /serves them from `GET \/memory\/<id>`; they don't always appear in `\/recall` responses/);
  assert.doesNotMatch(page, /hides the memory by default/);
  assert.doesNotMatch(page, /state_mode: "history"/);
});

test('prefix matching is documented for existing hierarchical tags, not as a tagging convention', async () => {
  const page = await readPage();
  const modes = subsection(page, 'Tag Matching Modes');

  assert.match(modes, /\*\*Prefix Matching\*\*/);
  assert.match(modes, /"tags": \["entity:people"\]/);
  assert.match(modes, /splits tags on `:` and `\/`/);
  assert.match(modes, /The service adds `entity:<category>:<slug>` tags during enrichment/);
  assert.match(modes, /don't build your own namespaces/);
  assert.match(modes, /`project\/<slug>` tags/);
  assert.match(modes, /retry without the gate/);
  assert.doesNotMatch(modes, /Set `tag_match: "prefix"` to support hierarchical tag queries/);
});

test('preference importance is 0.9 in both the type table and the scoring matrix', async () => {
  const page = await readPage();

  assert.match(page, /\| `Preference` \| User\/team preferences \| 0\.9 \|/);
  assert.match(page, /\| \*\*Preferences\*\* \| 0\.9 \| Tool choices, style preferences \|/);
  assert.doesNotMatch(page, /\| \*\*Preferences\*\* \| 0\.6–0\.8 \|/);
  assert.doesNotMatch(page, /Stable but lower priority than corrections/);
  assert.doesNotMatch(page, /\| `Preference` \| User\/team preferences \| 0\.75–0\.90 \|/);
});

test('type and confidence guidance follows the shipped memory rules', async () => {
  const page = await readPage();
  const taxonomy = subsection(page, 'Memory Type Taxonomy');

  assert.match(taxonomy, /Set an explicit `type` on every store/);
  assert.match(taxonomy, /`confidence` is a separate dial from `importance`/);
  assert.match(taxonomy, /0\.95 for something the user stated, 0\.8 for an observed pattern, 0\.6 for a tentative inference/);
  assert.match(taxonomy, /defaults to 0\.9 when you provide a `type`/);
  assert.doesNotMatch(page, /Omit `type` to let the system auto-classify/);
  assert.doesNotMatch(page, /less accurate but acceptable/);
  assert.doesNotMatch(page, /Include `confidence: 0\.95` when providing explicit type/);
  assert.match(page, /\*\*Use explicit types\*\* — set `type` on every store/);
});

test('recall examples keep the shipped limits and gate tags only on stable scopes', async () => {
  const page = await readPage();

  assert.match(page, /\{"tags": \["preference"\], "tag_mode": "any", "limit": 20\}/);
  assert.doesNotMatch(page, /"limit": 10\}/);
  assert.match(page, /\| \*\*Tag-based\*\* \| Precise filtering \|[^\n]*stable categories \(`preference`, `bugfix`\)/);
  assert.doesNotMatch(page, /component filtering/);
  assert.match(page, /\| `tag_mode: "any"` \(default\) \| OR logic — match any tag \| Broad recall, multiple categories \|/);
  assert.doesNotMatch(page, /multiple components/);

  const phase2 = page.indexOf('**Phase 2 — Task context');
  const keyInsight = page.indexOf(':::tip[Key insight]');
  const gateNote = page.indexOf('Gate Phase 2 on the project slug only when it is unambiguous');
  assert.ok(phase2 !== -1 && gateNote > phase2 && gateNote < keyInsight, 'expected the slug-collision note after Phase 2');
  assert.match(
    page.slice(gateNote, keyInsight),
    /\(`api`, `app`, `test`, `video`\), drop `tags` and rely on the semantic `query` alone/,
  );

  const contextAware = page.slice(
    page.indexOf('**Context-Aware Coding Recall**'),
    page.indexOf('**Parallel Recall for Comprehensive Context**'),
  );
  assert.match(contextAware, /"tags": \["my-project"\]\n/);
  assert.doesNotMatch(contextAware, /"auth"/);
  assert.match(contextAware, /`language` and `context_types` are rankers/);
  assert.match(contextAware, /`tags` works differently: it is a hard gate that filters before scoring/);
  assert.doesNotMatch(contextAware, /file path patterns/);
});

test('parallel recall does not claim the service runs separate parallel queries', async () => {
  const page = await readPage();

  assert.doesNotMatch(page, /already implements parallel queries/);
  assert.doesNotMatch(page, /matches by meaning and by keyword/);
  assert.match(page, /both can be issued to the MCP server in a single message/);
  assert.match(page, /\nThe service deduplicates the results within each call\.\n/);
});

test('association examples link the old memory to the new one and the bug to its fix', async () => {
  const page = await readPage();
  const corrections = page.slice(
    page.indexOf('**Association Pattern: User Corrections**'),
    page.indexOf('**Association Pattern: Bug Fixes**'),
  );

  assert.match(
    corrections,
    /associate_memories\(\{ memory1_id: "<old_id>", memory2_id: "<new_id>", type: "INVALIDATED_BY", strength: 0\.9 \}\)/,
  );
  assert.doesNotMatch(page, /memory1_id: "<new_id>"/);
  assert.ok(
    corrections.indexOf('recall_memory({ query: "variable naming style preference"') <
      corrections.indexOf('store_memory({ content: "User prefers camelCase'),
    'expected the related-memory recall before the store, as in the atomic ritual',
  );
  assert.match(corrections, /type: "Preference", tags: \["correction", "<project>"\], importance: 0\.9, confidence: 0\.95/);
  assert.match(corrections, /Verify it landed/);

  assert.match(
    page,
    /associate_memories\(\{ memory1_id: "<bug_id>", memory2_id: "<fix_id>", type: "LEADS_TO", strength: 0\.85 \}\)/,
  );
  assert.doesNotMatch(page, /memory1_id: "<fix_id>"/);
  assert.match(page, /\| `LEADS_TO` \| Causal relationship \(A caused B\) \| 0\.8–0\.95 \| Bug → Solution/);
});

test('template variables and tool prefixes match what the installers substitute', async () => {
  const page = await readPage();
  const variables = subsection(page, 'Template Variable Substitution');

  assert.match(variables, /Platform templates such as Cursor and Codex use placeholder variables/);
  assert.match(variables, /\| `\{\{PROJECT_NAME\}\}` \| From package\.json, git remote, or directory name \|/);
  assert.match(variables, /\| `\{\{MCP_TOOL_PREFIX\}\}` \| Cursor tool prefix, built from the server name as `mcp_<server>_` \| `mcp_memory_` \|/);
  assert.match(variables, /\| `\{\{MCP_SERVER_NAME\}\}` \| Cursor MCP server name from config \|/);
  assert.doesNotMatch(variables, /PROJECT_DESC|CURRENT_MONTH/);

  assert.match(variables, /\| Cursor \| `memory` \| `mcp_memory_` \| `mcp_memory_recall_memory` \|/);
  assert.doesNotMatch(variables, /\| Cursor \|[^\n]*mcp__memory__/);
  assert.match(variables, /\| Claude Code \| `memory` \| `mcp__memory__` \|/);
  assert.match(variables, /\| Claude Code \(plugin\) \| `plugin_automem_memory` \| `mcp__plugin_automem_memory__` \|/);
  assert.match(variables, /\| Codex \| `memory` \| `mcp__memory__` \|/);
  assert.match(variables, /\| Claude Desktop \| `memory` \| `mcp__memory__` \|/);
});

test('platform patterns describe the shipped Cursor, Claude Code, Codex, and Desktop rules', async () => {
  const page = await readPage();
  const platforms = subsection(page, 'Platform Integration Patterns');
  const cursor = platforms.slice(
    platforms.indexOf('**Cursor: Rule-Based Integration**'),
    platforms.indexOf('**Claude Code:'),
  );
  const claudeCode = platforms.slice(
    platforms.indexOf('**Claude Code:'),
    platforms.indexOf('**Codex: AGENTS.md Integration**'),
  );
  const codex = platforms.slice(
    platforms.indexOf('**Codex: AGENTS.md Integration**'),
    platforms.indexOf('**Claude Desktop:'),
  );
  const desktop = platforms.slice(platforms.indexOf('**Claude Desktop:'));

  assert.match(cursor, /`\.cursor\/rules\/automem\.mdc` with `alwaysApply: true`/);
  assert.match(cursor, /\*\*Two-phase session-start recall\*\* \(preferences tag-only, task context semantic\+time\)/);
  assert.match(cursor, /on-demand debug recall with no tag gate/);
  assert.match(
    cursor,
    /\*\*three mid-conversation storage triggers\*\* \(user correction, decision stabilized, pattern articulated\)/,
  );
  assert.match(cursor, /never to store session summaries or progress reports/);
  assert.doesNotMatch(page, /3-phase lifecycle/);
  assert.doesNotMatch(page, /conversation end\)/);

  assert.match(claudeCode, /Claude Code uses three mechanisms:/);
  assert.match(claudeCode, /3\. A SessionStart hook that prompts the two-phase recall/);
  assert.doesNotMatch(claudeCode, /two mechanisms/);

  assert.match(codex, /\*\*Two-phase session-start recall\*\* and the same three storage triggers as Cursor/);
  assert.doesNotMatch(page, /Simple recall at task start/);

  assert.match(desktop, /\*\*Semantic-first recall\*\* at conversation start/);
  assert.match(desktop, /adding a tag gate only once the user scopes the task, and the same three storage triggers as Cursor/);
  assert.doesNotMatch(page, /corrections as gold/);
});

test('hook history keeps the removal and states that current hooks never write memories', async () => {
  const page = await readPage();
  const note = page.match(/:::note\[Hook system history\]\n([\s\S]*?)\n:::/);

  assert.ok(note, 'expected the hook history note');
  assert.match(note[1], /then removed in v0\.8\.0 and v0\.6\.0 respectively/);
  assert.match(note[1], /Those hooks captured activity such as edits, builds, tests, and deploys mechanically/);
  assert.match(note[1], /SessionStart hook that prompts the two-phase recall/);
  assert.match(note[1], /optional Stop hook that nudges once when a substantive session stored nothing/);
  assert.match(note[1], /They prompt and observe; they never write memories themselves/);
});
