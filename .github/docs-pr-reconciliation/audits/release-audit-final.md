# Final release audit — PRs #279, #280, #281, #282, #325, and #327

Audit date: 2026-08-28  
Website baseline: `origin/main` = `f93b17b7a6afd945ed5d5e31d1ff5cd4f9fcff0b`  
AutoMem source baseline: `0.16.2` = `e147c352b100ebbf29e6555453fdde5152066138`  
mcp-automem source baseline: `0.16.0` = `9a0bbf754dd31db524da25638b0e97907e32ff37`

## Classification key

- **SUPPORTED / UNFIXED** — the pinned release source supports the correction and the named current page still contains the incorrect claim.
- **SUPPORTED / PARTIAL** — nearby current text already reflects part of the source truth, but the PR's exact target claim remains wrong. This is not a closure.
- **SOURCE NUANCE** — a legacy patch has the right direction but overstates what the pinned source guarantees; retain the factual correction and narrow its replacement wording.

All six PR heads change only the page named below. None is safe to merge or rebase as a closure: each was authored against older source commits, and current `origin/main` still needs a freshly source-pinned replacement.

## #279 — `getting-started/introduction`

PR: [#279](https://github.com/verygoodplugins/automem-website/pull/279) (`a056e3f`); target: `src/content/docs/docs/getting-started/introduction.md`.

| Claim in the legacy PR | Classification | Pinned-release evidence | Current-page evidence / smallest fresh replacement |
|---|---|---|---|
| Omitted `type` is regex-first, with LLM only as fallback; a failed/no-result LLM ends at `Memory`, `0.3`. | **SUPPORTED / UNFIXED** | [`MemoryClassifier.classify()` lines 108–140](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/classification/memory_classifier.py#L108-L140) returns on the first matching regex before attempting `_classify_with_llm`, then returns `("Memory", 0.3)`. | Current page line 39 still says only “LLM-based classification.” Replace that tip with the release-accurate fallback description. |
| Store flow queues normal embeddings after FalkorDB/enrichment; caller-provided embeddings are attempted inline; no Qdrant produces `unconfigured`. | **SUPPORTED / UNFIXED** | [`memory.py` lines 669–726](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/memory.py#L669-L726): enrichment is queued, provided embeddings set `provided`, ordinary embeddings call `enqueue_embedding`, and an absent client yields `unconfigured`. | Current lines 174–177 incorrectly generate/store the embedding synchronously before FalkorDB. Replace just steps 4–7, preserving the distinction between queued normal embeddings and supplied embeddings. |
| Hybrid score has 10 weighted components, not 9. | **SUPPORTED / UNFIXED** | [`config.py` lines 473–482](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L473-L482) declares ten `SEARCH_WEIGHT_*` components. | Current line 179 says “9-component.” Change to 10. |
| `app.py` is approximately 526 lines. | **SUPPORTED / UNFIXED** | `git show e147c352:app.py | wc -l` is 526. | Current line 107 says ~506. Change only that approximation. |

**Fresh replacement:** one surgical PR touching this page; retain the four corrections above and cite AutoMem `e147c352` rather than #279's `8ff266e`.

## #280 — `platforms/github-copilot`

PR: [#280](https://github.com/verygoodplugins/automem-website/pull/280) (`59ed75f`); target: `src/content/docs/docs/platforms/github-copilot.md`.

| Claim in the legacy PR | Classification | Pinned-release evidence | Current-page evidence / smallest fresh replacement |
|---|---|---|---|
| Recommended examples must not use platform (`copilot`) or date (`YYYY-MM`) tags; use bare stable tags and temporal fields for validity. | **SUPPORTED / UNFIXED** | [`shared.ts` lines 493–499](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/memory-policy/shared.ts#L493-L499) bans platform/date tags; [`lines 647–660`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/memory-policy/shared.ts#L647-L660) gives bare-tag examples and `t_valid`/`t_invalid`. | Current lines 127–136 still prescribe `copilot` and `YYYY-MM`. Replace the example and add a short bare-tag/temporal-validity sentence. |
| Cross-platform example should not claim a memory is tagged `copilot`. | **SUPPORTED / UNFIXED** | Same policy evidence above; platform tags are explicitly prohibited. | Current line 153 still says it is “tagged with `copilot`.” Replace with repository/component context plus the stored timestamp. |
| The service operator sets `AUTOMEM_API_TOKEN`; `API_TOKEN` is the Python configuration constant. | **SUPPORTED / UNFIXED** | [`config.py` line 592](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L592) is `API_TOKEN = os.getenv("AUTOMEM_API_TOKEN")`. | Current line 184 tells users to set `API_TOKEN`. Change it to `AUTOMEM_API_TOKEN`. |

**Already-aligned but not a closure:** current lines 49–53 already use server key `memory` and `npx -y`; that is adjacent configuration correctness, not any of the three unfixed claims above.

**Fresh replacement:** one surgical PR for the three lines/sections above, pinned to `e147c352` and `9a0bbf7`.

## #281 — `cli/setup`

PR: [#281](https://github.com/verygoodplugins/automem-website/pull/281) (`e42411d`); target: `src/content/docs/docs/cli/setup.md`.

| Claim in the legacy PR | Classification | Pinned-release evidence | Current-page evidence / smallest fresh replacement |
|---|---|---|---|
| `prebuild` first runs `sync-memory-policy.ts`, then `sync-template-versions.mjs`. | **SUPPORTED / UNFIXED** | [`package.json` lines 14–18](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/package.json#L14-L18). | Current line 257 names only version sync. Add the first command. |
| `setup` prints Claude Desktop, Claude Code, and Hermes material. | **SUPPORTED / UNFIXED** | [`setup.ts` lines 235–246](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/setup.ts#L235-L246). | Current wizard diagram line 286 lists only Desktop and Claude Code. Add Hermes. |
| The actual Claude Desktop output uses `mcpServers.memory`, `npx -y`, and unresolved `${AUTOMEM_*}` placeholders. | **SUPPORTED / UNFIXED** | [`templates.ts` lines 5–20](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/templates.ts#L5-L20), called by `runSetup` at lines 235–237. | Current lines 327–340 give the old `automem`, omit `-y`, and show fabricated resolved values. Replace this block with the actual Desktop output. |
| The wizard does not print Cursor/Codex JSON; it prints Claude Code shell instructions and a Hermes snippet, then points to `config --format=json`. | **SUPPORTED / UNFIXED** | [`setup.ts` lines 238–246](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/setup.ts#L238-L246); Claude Code output is defined at [`templates.ts` lines 23–31](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/templates.ts#L23-L31). | Current lines 343–355 label a fabricated JSON block “For Cursor/Codex.” Replace that block and surrounding explanation with the actual output categories. |

**SOURCE NUANCE:** do not repeat #281's broad statement that *every* shipped snippet uses server key `memory`. The pinned `buildHermesSnippet()` uses `mcp_servers.automem` ([`templates.ts` lines 34–55](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/templates.ts#L34-L55)). State the `memory` key only for the Claude Desktop/Claude Code/Codex examples to which it applies.

**Fresh replacement:** one page-only PR with the four supported corrections, using scoped key wording above.

## #282 — `cli/config-tools`

PR: [#282](https://github.com/verygoodplugins/automem-website/pull/282) (`0d1f9fb`); target: `src/content/docs/docs/cli/config-tools.md`.

| Claim in the legacy PR | Classification | Pinned-release evidence | Current-page evidence / smallest fresh replacement |
|---|---|---|---|
| `AUTOMEM_PARENT_WATCHDOG_MS` is a documented runtime setting, defaults to 30,000 ms, is POSIX-only in effect, and has no disable value. | **SUPPORTED / UNFIXED** | [`index.ts` lines 478–485](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/index.ts#L478-L485) and [`lifecycle.ts` lines 17–40](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/lifecycle.ts#L17-L40). | Current environment table lines 16–22 omits it. Add one concise row. |
| Endpoint resolution is first nonblank `AUTOMEM_API_URL`, then Claude plugin API URL, then deprecated `AUTOMEM_ENDPOINT`, then default; API keys have four precedence tiers. | **SUPPORTED / PARTIAL** | [`env.ts` lines 12–24](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/env.ts#L12-L24) and [`lines 31–49`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/env.ts#L31-L49). | Current prose lines 32 and 38–48 already mentions the legacy alias and four key tiers, but diagram lines 69–90 still shows a binary URL check and only two keys. Update the diagram; partial prose alignment is not closure. |
| JSON examples for the listed Desktop/Cursor-style configuration should use `memory` and `-y`. | **SUPPORTED / UNFIXED** | Shipped Desktop and Cursor templates use `memory` + `-y`: [`claude_desktop_config.json`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/claude_desktop_config.json#L1-L10), [`cursor_mcp.json`](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/cursor_mcp.json#L1-L10). | Current lines 141–156 use `automem` and omit `-y`. Correct the concrete copy/paste example. |
| Codex TOML must use `[mcp_servers.memory]` and `[mcp_servers.memory.env]`, not an array table with `name`. | **SUPPORTED / UNFIXED** | [`templates/codex/config.toml` lines 7–15](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/codex/config.toml#L7-L15). | Current lines 160–173 provide the non-registering array-table form. Replace it with the shipped form. |

**SOURCE NUANCE:** `config --format=json` itself builds a `memory` entry *without* `-y` ([`templates.ts` lines 58–70](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/cli/templates.ts#L58-L70)). The fresh page should say its generic JSON block follows the shipped Desktop/Cursor templates, not claim that every JSON-emitting CLI surface has identical args.

**Fresh replacement:** page-only PR; add the watchdog row, correct the diagram and both examples, and retain the source nuance.

## #325 — `overview`

PR: [#325](https://github.com/verygoodplugins/automem-website/pull/325) (`40bc713`); target: `src/content/docs/docs/overview.md`.

| Claim in the legacy PR | Classification | Pinned-release evidence | Current-page evidence / smallest fresh replacement |
|---|---|---|---|
| Health monitor symbols are `HealthMonitor`, `check_consistency`, and `trigger_recovery`, not `check_drift`/`repair_drift`. | **SUPPORTED / UNFIXED** | [`health_monitor.py` lines 40–65](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L40-L65), [`142–145`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L142-L145), and [`219–222`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L219-L222). | Current table line 152 still names nonexistent functions. Replace that cell. |
| `ollama` is an accepted `EMBEDDING_PROVIDER` value. | **SUPPORTED / PARTIAL** | [`provider_init.py` lines 75–81](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/embedding/provider_init.py#L75-L81) and [`273–276`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/embedding/provider_init.py#L273-L276). | Current page already depicts Ollama in automatic selection (lines 412 and 418), but its config diagram line 405 and configuration table line 531 omit it. Add it in both places; existing narrative is partial only. |
| Sync queues each non-excluded FalkorDB memory missing from Qdrant; the 5% threshold belongs to health-monitor alerting, not sync repair. | **SUPPORTED / UNFIXED** | [`runtime_worker.py` lines 71–102](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/sync/runtime_worker.py#L71-L102); [`health_monitor.py` line 62](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L62). | Current line 390 says auto-repair occurs when divergence exceeds 5%. Replace only that worker-responsibility bullet with the release-accurate behavior. |

**Fresh replacement:** page-only PR with these three precise corrections. It may separately add an explicit `ollama` branch to the Mermaid diagram, but that is a completeness improvement; it is not needed to close the three factual drifts.

## #327 — `reference/api/recall-operations`

PR: [#327](https://github.com/verygoodplugins/automem-website/pull/327) (`90aac40`); target: `src/content/docs/docs/reference/api/recall-operations.md`.

| Claim in the legacy PR | Classification | Pinned-release evidence | Current-page evidence / smallest fresh replacement |
|---|---|---|---|
| Recency uses the memory `timestamp`, a configurable `SEARCH_RECENCY_WINDOW_DAYS` (default 180), and optional exponential curve with the window as half-life—not time since last access and not a hardcoded formula. | **SUPPORTED / UNFIXED** | [`scoring.py` lines 66–81](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/utils/scoring.py#L66-L81), [`line 166`](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/utils/scoring.py#L166), and [`config.py` lines 495–503](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L495-L503). | Current line 318 still gives 180-day, last-access linear decay. Replace that one bullet with the parameterized release behavior. |
| Score sorting combines 10 weighted components, not 9. | **SUPPORTED / PARTIAL** | [`config.py` lines 473–482](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/config.py#L473-L482) and [`scoring.py` lines 250–260](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/utils/scoring.py#L250-L260). | The page's formula/table already show ten components (lines 250–290), but current line 624 still says nine. Change that sentence; the internal table is partial already-fixed work, not closure. |

**Fresh replacement:** one two-line page-only correction pinned to AutoMem `e147c352`.

## Recommended reconciliation outcome

Create six narrow, fresh replacement PRs (one per target page) or one source-pinned, clearly partitioned documentation PR if maintainers prefer a single review surface. Do **not** merge the legacy heads merely because their diffs are small: #281 and #282 need scoped wording around configuration output, and all six cite superseded release commits.

Until the replacement(s) merge, leave #279, #280, #281, #282, #325, and #327 open for traceability. After merging, close each legacy PR with a comment linking its replacement; partial neighboring correctness identified above must not be treated as a closure.
