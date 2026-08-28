# Release audit: legacy docs PRs #259 and #261–#266

**Audit baseline.** Website target is `origin/main` at `f93b17b7a6afd945ed5d5e31d1ff5cd4f9fcff0b` (2026-08-28). Source-of-truth releases are AutoMem `0.16.2` / `e147c352b100ebbf29e6555453fdde5152066138` and mcp-automem `0.16.0` / `9a0bbf754dd31db524da25638b0e97907e32ff37`. All seven PRs remain open drafts, and none of their target-text changes is already present on `origin/main`.

Status means: **valid** = the proposed documentation assertion matches the release source; **invalid** = the proposed assertion does not match that release (including a stale replacement source anchor); **already-fixed** = the current website already contains the correction.

## #259 — OpenAI Codex

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| Codex substitutes `{{PROJECT_NAME}}` but not `{{CURRENT_MONTH}}`. | **valid** | mcp-automem `src/cli/codex.ts:30-42` constructs `vars` with only `PROJECT_NAME` and passes it to `replaceTemplateVars()`. | `src/content/docs/docs/platforms/codex.md:210-213`. Replace that four-line placeholder list with the PR’s one-variable wording. |

## #261 — Hermes Agent

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| `--mode`, `--dry-run`, and `--yes` are not environment-variable inputs to the `hermes` subcommand; endpoint and key are inherited from `AUTOMEM_API_URL` / `AUTOMEM_API_KEY` (or aliases). The three former variables belong to guided install. | **valid** | mcp-automem `src/cli/hermes.ts:216-230` resolves endpoint/key from process env; `src/cli/hermes.ts:367-378` parses mode only from argv. Guided-install reads `AUTOMEM_HERMES_MODE`, `AUTOMEM_DRY_RUN`, and `AUTOMEM_YES` in `src/cli/install.ts:683-686`. | `src/content/docs/docs/platforms/hermes.md:49-59`. This is one contiguous fresh slice: blank the three cells, add the installer distinction, and retain endpoint/key mappings. |
| “Every changed file keeps a `.bak` copy” is false; `.env` is updated in place. | **valid** | mcp-automem `src/cli/hermes.ts:176-201` uses `writeFileWithBackup()` for provider files but `mergeHermesEnvFile()` for `.env`; that function writes directly at `src/cli/hermes.ts:123-132`. Rules use backup at `src/cli/hermes.ts:309`. | Same slice, `platforms/hermes.md:59`: name backed-up files and identify `$HERMES_HOME/.env` as the exception. |

## #262 — Amazon Alexa

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| Alexa recall first uses `alexa` + user + device tags, then retries without **any** tags; there is no user-only fallback. | **valid** | AutoMem `mcp-sse-server/server.js:946-952` builds all three primary tags; `:1017-1029` calls the primary with `tags`, then fallback with `{ query, limit: 5 }` only. | `src/content/docs/docs/platforms/alexa.md:124-135` for the explanatory claim, plus `:213-224` for the cross-device example. These are the two smallest affected slices. |

## #263 — Context Engineering

This PR contains real drift findings, but three proposed replacement anchors are themselves stale after the 0.16.0 MCP-surface extraction. Do not merge it unchanged.

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| `{{PROJECT_DESC}}` and `{{CURRENT_MONTH}}` are supported template variables. | **valid** (removal) | Neither identifier exists in the 0.16.0 `src/` or `templates/` tree. Codex supplies only `PROJECT_NAME` (`src/cli/codex.ts:30-42`). | `src/content/docs/docs/best-practices/context-engineering.md:207-215`. Remove both rows. |
| The replacement explanation may attribute template substitution generally to `src/cli/host-toolkit.ts`. | **invalid** | The shared helper exists at `src/cli/host-toolkit.ts:341-347`, but Cursor has its own helper at `src/cli/cursor.ts:104-110`; Cursor supplies `MCP_SERVER_NAME`/`MCP_TOOL_PREFIX` at `:315-320`. A general, singular attribution is inaccurate. | Same slice, `context-engineering.md:215`: say substitution is host-specific; cite the shared helper for Codex and the local Cursor helper separately. |
| The surviving Cursor example values are universally `mcp_automem_` and `automem`. | **invalid** as stated | Cursor derives both from the configured server name, defaulting to `memory` (`src/cli/cursor.ts:312-320`), so the defaults render `mcp_memory_` / `memory`; `automem` is only one valid configured name. | Same slice, `:209-215`: describe the values symbolically (`mcp_<sanitized-server-name>_` and the configured server name), or show `memory` / `mcp_memory_` as the default example. |
| `/memory/by-tag` is invoked through nonexistent public `searchByTag()` rather than `recallMemory({ tags, exhaustive: true })`. | **valid** | mcp-automem `src/automem-client.ts:470-488` routes exhaustive tag enumeration to private `listByTag()`; `:720-739` issues the GET request and returns pagination fields. | `context-engineering.md:279-283` and `:451-454`. Replace both `searchByTag()` references with the real `recallMemory({ tags, exhaustive: true })` / `recall_memory` form appropriate to the surrounding API layer. |
| Content-size enforcement belongs at proposed `src/index.ts:1435-1463`. | **invalid** | 0.16.0 `src/index.ts` is the CLI/stdio entry point and imports the surface at `src/index.ts:20-24`; enforcement is in `src/mcp-surface.ts:1043-1078`, not `src/index.ts`. | `context-engineering.md:18`: replace the stale original anchor with `src/mcp-surface.ts:1043-1078`; keep the size values. |
| Expansion parameters belong at proposed `src/index.ts:764-805`. | **invalid** | They are defined in the tool schema at `src/mcp-surface.ts:373-418`. | `context-engineering.md:146`: replace with `src/mcp-surface.ts:373-418`. |
| Tool registration belongs at proposed `src/index.ts:466`. | **invalid** | The registered `tools` array starts at `src/mcp-surface.ts:85`; `src/index.ts:466` is lifecycle/shutdown code. | `context-engineering.md:316-319`: replace with `src/mcp-surface.ts:85`. |
| The old `src/cli/commands/[platform].ts` directory is the integration location. | **valid** (correction needed) | Host handlers are directly under `src/cli/`, including `codex.ts`, `cursor.ts`, and `hermes.ts` (for example `src/index.ts:10-16` imports those paths). | `context-engineering.md:215-222`: change the documented installation path to `src/cli/[platform].ts`, while applying the host-specific attribution correction above. |

## #264 — Google AntiGravity

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| The sample’s `antigravity` platform tag and `YYYY-MM` date tag violate the shipped bare-tag policy; temporal fields should be used for time-bounded facts. | **valid** | mcp-automem `src/memory-policy/shared.ts:498-503` bans platform and date-stamped tags; `src/mcp-surface.ts:91-100` exposes `t_valid` / `t_invalid` in the supported store surface. | `src/content/docs/docs/platforms/antigravity.md:191-201`. Remove only the two disallowed tag examples and add the policy sentence. |
| `/health` returns a service version. | **valid** (removal/replacement) | AutoMem `automem/api/health.py:87-99` returns `falkordb`, `qdrant`, `memory_count`, `vector_count`, and `sync_status`; no version field exists. | `platforms/antigravity.md:214-225`. Replace only the three expected-response bullets. |

## #265 — Claude.ai (Web)

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| Streamable HTTP keeps resumable server-side sessions and supports `Last-Event-ID` replay. | **valid** (removal/replacement) | AutoMem `mcp-sse-server/server.js:1051-1085` constructs a new transport per request with `sessionIdGenerator: undefined` and logs any session header as ignored. `InMemoryEventStore` is only a class definition (`:223-263`); no instance is attached to an SSE session (`:1119-1128`) or streamable transport. | `src/content/docs/docs/platforms/claude-web.md:28-32`, `:191-196`, and `:222-224`. State that only SSE has sessions; Streamable HTTP is stateless and does not replay missed events. |
| Unset `PORT` makes the memory service bind Flask’s default `5000`. | **valid** (removal/replacement) | AutoMem `automem/runtime_wiring.py:82` defaults `PORT` to `8001`. | `platforms/claude-web.md:61-65`: make `AUTOMEM_API_URL` match the actual service port; `8001` is already the default. |
| `AUTOMEM_API_TOKEN` is a seventh `getAuthToken()` extraction tier. | **valid** (wording correction) | `getAuthToken()` ends after header/query extraction at `mcp-sse-server/server.js:908-916`; route handlers apply `|| process.env.AUTOMEM_API_TOKEN` at `:1067-1070` and `:1104-1109`. | `platforms/claude-web.md:129-136`: retain the six function tiers, then describe the route-level environment fallback. |

## #266 — ChatGPT

| Claim | Status | Release evidence | Current target / smallest fresh slice |
|---|---|---|---|
| The memory service requires explicit `PORT=8001`, otherwise it binds `5000`; missing that variable explains the connection error. | **valid** (removal/replacement) | AutoMem `automem/runtime_wiring.py:82` defaults to `8001`, so `PORT=8001` is redundant and not the failure mode described. | `src/content/docs/docs/platforms/chatgpt.md:62-64` and `:157-161`. Replace the caution and the first troubleshooting row with the actual port-mismatch diagnosis. |

## Reconciliation outcome

- **Merge-ready unchanged:** #259, #261, #262, #264, #265, and #266. Their proposed textual corrections all match the specified releases and are absent from `origin/main`.
- **Needs a fresh replacement slice:** #263. Preserve its valid removals and API-method/path corrections, but replace all `src/index.ts` anchors with the 0.16.0 `src/mcp-surface.ts` locations and make the template-substitution wording host-specific.
- **Already fixed:** none.
