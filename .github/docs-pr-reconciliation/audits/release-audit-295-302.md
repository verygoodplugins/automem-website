# Release audit: legacy documentation PRs #295–#302

Audited 2026-08-28 against website `origin/main` at `f93b17b7a6afd945ed5d5e31d1ff5cd4f9fcff0b`, AutoMem 0.16.2 at `e147c352b100ebbf29e6555453fdde5152066138`, and mcp-automem 0.16.0 at `9a0bbf754dd31db524da25638b0e97907e32ff37`.

Classification means: **valid** = the legacy PR's substantive page correction is still needed; **already fixed** = the target page already carries the needed correction; **invalid** = the proposed correction is wrong for the pinned release. Evidence uses `origin/main:<path>:<line>` for the website and `<repo>@<sha>:<path>:<line>` for the release source.

## Disposition

| PR | Page | Valid | Already fixed | Invalid | Fresh action |
|---|---|---:|---:|---:|---|
| #295 | `platforms/claude-code` | 5 | 0 | 0 | Reapply all five content corrections. |
| #296 | `platforms/cursor` | 5 | 0 | 0 | Reapply all five content corrections. |
| #297 | `platforms/codex` | 5 | 0 | 0 | Reapply all five content corrections. |
| #299 | `platforms/openclaw` | 5 | 0 | 0 | Reapply all five content corrections. |
| #300 | `development/local-setup` | 5 | 0 | 0 | Reapply four verbatim; soften the unsupported “not read anywhere” wording in the Flask-env caution. |
| #301 | `architecture/enrichment` | 4 | 1 | 0 | Reapply every hunk except `classification`, which is already documented. |
| #302 | `best-practices/memory-rules` | 4 | 0 | 1 | Reapply four content corrections; replace the bad `src/index.ts` anchor with `src/mcp-surface.ts`. |

## Claim-level audit

### #295 — Claude Code

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| Plugin tree must name both `SessionStart` and `PostToolUse`, and list `session-start.sh`, `stop-nudge.sh`, and `track-store.sh`. | **Valid** | The target still says only SessionStart and lists only `session-start.sh`: `origin/main:src/content/docs/docs/platforms/claude-code.md:41-43`. The plugin declares both hook events: `mcp-automem@9a0…:plugins/automem/hooks/hooks.json:3-24`, and ships all three scripts. |
| Preference recall must use `limit: 20, sort: "updated_desc"`; task context is one `query`, 90 days, limit 30. | **Valid** | Stale `limit: 10`, `queries`, 30-day text remains at `origin/main:src/content/docs/docs/platforms/claude-code.md:172-181`. The release rule template has the required calls at `templates/codex/memory-rules.md:21-47`; the shared defaults are `20/30/90` at `src/memory-policy/shared.ts:3-9`. |
| Pattern importance is 0.8. | **Valid** | Site says 0.7 at `origin/main:src/content/docs/docs/platforms/claude-code.md:190-198`; policy says 0.8 at `src/memory-policy/shared.ts:662-666`. |
| A bug fix links to its report with `LEADS_TO`, not `DERIVED_FROM`. | **Valid** | Site says `DERIVED_FROM` at `origin/main:src/content/docs/docs/platforms/claude-code.md:233-240`; policy pairing says `LEADS_TO` at `src/memory-policy/shared.ts:676-685`. |
| Authored tags must be bare, with no platform or `YYYY-MM` tag; use validity windows for expiring facts. | **Valid** | The platform/date recipe remains at `origin/main:src/content/docs/docs/platforms/claude-code.md:279-287`. The pinned template prohibits those tags and names `t_valid`/`t_invalid` at `templates/codex/memory-rules.md:15-19,77-94`. |

### #296 — Cursor

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| The rule is two-phase startup recall followed by three in-turn storage triggers, not a three-phase lifecycle. | **Valid** | Old three-phase section remains at `origin/main:src/content/docs/docs/platforms/cursor.md:122-155`. The release template has two startup recalls at `templates/cursor/automem.mdc.template:27-69` and exactly three triggers at `:96-100`. |
| End-of-conversation summaries are forbidden. | **Valid** | The site still tells users to summarize at conversation end: `origin/main:src/content/docs/docs/platforms/cursor.md:155-162`. The template forbids session summaries at `templates/cursor/automem.mdc.template:80-94`. |
| Insight/Pattern/Preference importance is 0.75/0.8/0.9. | **Valid** | The stale 0.8/0.7/0.6–0.8 table remains at `origin/main:src/content/docs/docs/platforms/cursor.md:146-153`; release policy specifies 0.75/0.8/0.9 at `src/memory-policy/shared.ts:662-683`. |
| Tag guidance must reject platform and date tags, and use bare category/project/language tags with the ambiguous-slug exception. | **Valid** | Current project/personal tagging still includes `cursor` and `YYYY-MM`: `origin/main:src/content/docs/docs/platforms/cursor.md:198-211`. Release rule text forbids them and defines the collision rule at `templates/cursor/automem.mdc.template:14-25,80-100`. |
| Time-bound facts use `t_valid`/`t_invalid`, not monthly tags. | **Valid** | The personal block still calls for the current month at `origin/main:src/content/docs/docs/platforms/cursor.md:206-210`; the release template uses validity fields at `templates/cursor/automem.mdc.template:92-94`. |

### #297 — Codex

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| Installer writes/replaces the marker-bounded AutoMem block; it is not month-aware. | **Valid** | “month-aware” remains at `origin/main:src/content/docs/docs/platforms/codex.md:155`. The release installer substitutes only `PROJECT_NAME` and calls `upsertMarkedBlock` at `mcp-automem@9a0…:src/cli/codex.ts:23-51`. |
| `{{CURRENT_MONTH}}` is not a Codex template variable. | **Valid** | It remains documented at `origin/main:src/content/docs/docs/platforms/codex.md:210-212`; the only installer vars entry is `PROJECT_NAME` at `src/cli/codex.ts:34-36`. |
| Task-start recall must show preference and semantic-task phases with 20/30/90 defaults. | **Valid** | The old multi-query, 30-day snippet remains at `origin/main:src/content/docs/docs/platforms/codex.md:214-229`. Pinned rules specify the two calls at `templates/codex/memory-rules.md:21-47`. |
| Codex tag advice must be bare category/project/language tags, without platform/month tags. | **Valid** | Four-part platform/date recipe remains at `origin/main:src/content/docs/docs/platforms/codex.md:329-352`; pinned rules prohibit it at `templates/codex/memory-rules.md:10-19,73-94`. |
| `--rules` defaults to `./AGENTS.md` and `--quiet` is supported. | **Valid** | Target table says “Current working directory” and omits quiet at `origin/main:src/content/docs/docs/platforms/codex.md:379-384`. The default is `path.join(process.cwd(), 'AGENTS.md')` at `src/cli/codex.ts:30-33`; common parsing includes `--quiet` at `src/cli/host-toolkit.ts:556-596`. |

### #299 — OpenClaw

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| Default tags are one sanitized bare project slug, or none for ambiguous slugs—not `platform/openclaw` plus `project/<name>`. | **Valid** | The old namespaced config remains at `origin/main:src/content/docs/docs/platforms/openclaw.md:156-160,296-300`. `buildDefaultProjectTags` returns one normalized slug or `[]` at `mcp-automem@9a0…:src/memory-policy/shared.ts:90-107`; both OpenClaw skills forbid platform tags at `templates/openclaw/skill-legacy/SKILL.md:61-65` and `skill-mcp/SKILL.md:27-34`. |
| New skill config puts the resolved key in top-level `apiKey`; `env` holds `AUTOMEM_API_URL` and optional `AUTOMEM_DEFAULT_TAGS`. | **Valid** | Site nests `AUTOMEM_API_KEY` in `env` at `origin/main:src/content/docs/docs/platforms/openclaw.md:192-199`. Release implementation creates that `env` shape at `src/cli/openclaw.ts:602-615` and assigns `entry.apiKey` at `:621-635`. |
| Legacy curl store example must use non-platform tags. | **Valid** | Site uses `["openclaw"]` at `origin/main:src/content/docs/docs/platforms/openclaw.md:235-244`; pinned legacy skill example is `["project-slug", "decision"]` at `templates/openclaw/skill-legacy/SKILL.md:22-33`. |
| `--plugin-source` prefers bundled package, then package name, then npm fallback. | **Valid** | Site gives only the npm package at `origin/main:src/content/docs/docs/platforms/openclaw.md:103-110`; the resolution order is `src/cli/openclaw.ts:63-68,281-287`. |
| Endpoint/key default documentation must include `AUTOMEM_API_URL` → `AUTOMEM_ENDPOINT` and `AUTOMEM_API_KEY` → `AUTOMEM_API_TOKEN`. | **Valid** | Static/none defaults remain at `origin/main:src/content/docs/docs/platforms/openclaw.md:103-108`. Endpoint fallback is at `src/cli/openclaw.ts:1169-1184`; key fallback order is `src/env.ts:8-24`. |

### #300 — Local Setup

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| Compose service is `flask-api`, not `memory-service`. | **Valid** | Site diagram says `memory-service` at `origin/main:src/content/docs/docs/development/local-setup.md:105-109`; release compose defines `flask-api` at `automem@e147…:docker-compose.yml:37-40`. |
| Default consolidation cadence is decay 1d, creative 7d, cluster 30d, forget disabled. | **Valid** | Site retains 1h/1h/6h/1d at `origin/main:src/content/docs/docs/development/local-setup.md:212-217`; source defaults are 86400/604800/2592000/0 at `automem@e147…:automem/config.py:29-42`. |
| The `FLASK_ENV`/`LOG_LEVEL` page instructions cannot enable debug or autoreload. | **Valid, with a wording correction** | `run_default_server` hardcodes `debug=False` at `automem@e147…:automem/runtime_wiring.py:106-109`, so the documented behavior at `origin/main:src/content/docs/docs/development/local-setup.md:263-276` is false. Do **not** repeat the PR-body assertion that neither variable occurs anywhere: compose exports `FLASK_ENV=development` and `FLASK_DEBUG=\"1\"` at `docker-compose.yml:48-51`; they simply do not control the server's hardcoded debug setting. |
| Node prerequisite is `^20.19.0 || ^22.13.0 || >=24`, not “20.0.0 or higher.” | **Valid** | Target says 20.0.0+ at `origin/main:src/content/docs/docs/development/local-setup.md:384-389`; release `engines.node` is the precise range at `mcp-automem@9a0…:package.json:8-10`. |
| `prebuild` regenerates memory policy first; `postbuild` has no chmod. | **Valid** | Old script table remains at `origin/main:src/content/docs/docs/development/local-setup.md:400-407`; release scripts are at `mcp-automem@9a0…:package.json:14-19`. |

### #301 — Enrichment

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| Source note should replace `graph_store.py` “Graph write operations” with `entity_extraction.py`. | **Valid** | Mislabel remains at `origin/main:src/content/docs/docs/architecture/enrichment.md:8-17`. `graph_store.py` is a tag predicate helper at `automem@e147…:automem/stores/graph_store.py:4-37`; the documented extraction functions and label mapping live in `automem/utils/entity_extraction.py:20-60,151-180`. |
| `/enrichment/status` needs a top-level `classification` field. | **Already fixed** | Target already shows `classification` in the JSON example and field list at `origin/main:src/content/docs/docs/architecture/enrichment.md:301-325`. Release response returns that key at `automem@e147…:automem/api/enrichment.py:25-34`. Do not carry this hunk forward. |
| `/enrichment/reprocess` accepts JSON list or comma string from body/query and documents 202/400 responses. | **Valid** | Current page still says only array and omits responses at `origin/main:src/content/docs/docs/architecture/enrichment.md:385-391`. Release handler accepts both forms and returns 400/202 payloads at `automem/api/enrichment.py:36-66`. |
| Entity table must include `LAW` for tools and `NORP` for concepts. | **Valid** | Omissions remain at `origin/main:src/content/docs/docs/architecture/enrichment.md:143-147`; source maps the two labels at `automem/utils/entity_extraction.py:173-180`. |
| spaCy model caching is module-global plus lock, not `lru_cache`. | **Valid** | “LRU cache” remains at `origin/main:src/content/docs/docs/architecture/enrichment.md:126-129`; source declares `_SPACY_NLP` and `_SPACY_INIT_LOCK` and memoizes under that lock at `automem/utils/entity_extraction.py:20-60`. |

### #302 — Memory Rules & Patterns

| Claim / legacy hunk | Classification | Evidence |
|---|---|---|
| Replace `src/index.ts:764-811` with a link to `src/index.ts` L784–L831. | **Invalid** | The release's recall tool schema is not in `src/index.ts`; it is in `mcp-automem@9a0…:src/mcp-surface.ts:373-418`. The current site anchor is stale at `origin/main:src/content/docs/docs/best-practices/memory-rules.md:87-93`, but PR #302's new `2816…/src/index.ts` permalink is not source-pinned to the requested release. |
| Remove `{{CURRENT_MONTH}}`. | **Valid** | It remains in target table at `origin/main:src/content/docs/docs/best-practices/memory-rules.md:434-443`; the pinned templates contain no substitution, and the Cursor smoke test asserts absence at `mcp-automem@9a0…:tests/cli/smoke.test.ts:611`. |
| Replace platform/month tag guidance with bare tags and time-query/validity-window guidance. | **Valid** | Platform/month diagram, examples, and monthly-tag instruction remain at `origin/main:src/content/docs/docs/best-practices/memory-rules.md:243-327`. Release policy prohibits them and supplies `t_valid`/`t_invalid` at `src/memory-policy/shared.ts:496-498,650-666`. |
| Preference importance in the scoring matrix is 0.9. | **Valid** | Site still says 0.6–0.8 at `origin/main:src/content/docs/docs/best-practices/memory-rules.md:222-232`; policy requires `Preference`, 0.9 at `src/memory-policy/shared.ts:662-666`. |
| Cursor pattern is two startup recalls plus three mid-conversation triggers; no end summary. | **Valid** | Current three-phase statement remains at `origin/main:src/content/docs/docs/best-practices/memory-rules.md:458-465`. Release template specifies two recalls at `templates/cursor/automem.mdc.template:27-69`, no summaries at `:80-94`, and three triggers at `:96-100`. |

## Smallest source-pinned fresh replacement

Create one fresh docs change containing only the residual corrections below. This preserves every valid legacy correction, drops work already present on `origin/main`, and uses the requested release pins.

1. Reapply the five hunks from #295, #296, #297, and #299 without substantive changes.
2. Reapply #300's service-name, cadence, Node-range, and npm-script hunks. Replace its Flask-env caution with: “`FLASK_ENV` and `LOG_LEVEL` do not enable this server's debug or autoreload behavior. The compose setup exports `FLASK_ENV`, but `run_default_server()` calls `app.run(..., debug=False)`; restart the server yourself or use an external watcher.”
3. Reapply #301's source-note, cache-mechanism, entity-label, and reprocess-contract hunks. Omit its `classification` JSON/list hunk because the page already has that field.
4. Reapply #302's `CURRENT_MONTH`, bare-tag/time-convention, preference-importance, Cursor-lifecycle, and summary-tagging hunks. Replace its source-anchor hunk with this source-pinned wording:

   ```md
   API parameters exposed in [`src/mcp-surface.ts` L373–L418](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/mcp-surface.ts#L373-L418):
   ```

No other page changes are required to reconcile these seven PRs. In particular, the stale `0.0.0.0` bind text in Local Setup and the additional current-page enrichment material are outside the seven PR diffs and should be audited separately.
