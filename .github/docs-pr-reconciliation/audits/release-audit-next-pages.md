# Legacy docs PR release audit — next pages

Audited 2026-08-28 against `origin/main` (`f93b17b`) and only these release
snapshots:

- AutoMem `0.16.2`: `e147c352b100ebbf29e6555453fdde5152066138`
- mcp-automem `0.16.0`: `9a0bbf754dd31db524da25638b0e97907e32ff37`

`Validated` means the source-backed defect remains in the target page.
`Already fixed` is reserved for a correction already present on `origin/main`.
`Invalidated` identifies a proposed correction that does not meet the stated
release baseline. PR overlap is informative only; it is not closure authority.

## PR #315 — `platforms/hermes`

Target: `src/content/docs/docs/platforms/hermes.md`.

| Claim | Classification | Evidence | Small fresh replacement |
| --- | --- | --- | --- |
| The direct `hermes` command maps `--mode` to `AUTOMEM_HERMES_MODE`. | **Validated** | Target mapping: `origin/main:src/content/docs/docs/platforms/hermes.md:51`. Direct-command parsing only accepts argv flags at `mcp-automem@9a0bbf7:src/cli/hermes.ts:367-383`; guided-install parsing reads `AUTOMEM_HERMES_MODE` at `src/cli/install.ts:683-687`. | Clear that table cell and distinguish the guided installer from `hermes`. |
| The direct `hermes` command maps `--dry-run` / `--yes` to `AUTOMEM_DRY_RUN` / `AUTOMEM_YES`. | **Validated** | Target mappings: `platforms/hermes.md:55-56`. `runHermesSetup()` only parses argv at `mcp-automem@9a0bbf7:src/cli/hermes.ts:367-383`; the two variables are guided-installer inputs at `src/cli/install.ts:685-686`. | Clear the two table cells; retain the direct flags. |
| Every changed file has a `.bak`. | **Validated** | Target says this at `platforms/hermes.md:59`. Provider files and rules use `writeFileWithBackup` at `mcp-automem@9a0bbf7:src/cli/hermes.ts:176-181,309`; `.env` is rewritten directly, with mode `0600`, at `src/cli/hermes.ts:74-126,193-200`. | Name the backed-up files and explicitly exclude `$HERMES_HOME/.env`. |
| Provider mode has no explicit tools. | **Validated** | Target says this at `platforms/hermes.md:149`. Provider install sets `AUTOMEM_HERMES_PROVIDER_TOOLS=true` for `provider` at `mcp-automem@9a0bbf7:src/cli/hermes.ts:193-200,305-306`; the five `automem_*` names are defined at `src/memory-policy/shared.ts:874-880`. | State that provider mode has ambient recall plus its five `automem_*` tools; retain the existing `both`-mode duplicate-tool explanation. |

## PR #318 — `getting-started/quick-start`

Target: `src/content/docs/docs/getting-started/quick-start.md`.

| Claim | Classification | Evidence | Small fresh replacement |
| --- | --- | --- | --- |
| `X-API-Token` is the custom auth header. | **Validated** | Target curl is at `quick-start.md:310`. AutoMem accepts `Authorization`, then `X-API-Key`, then `api_key`; it never reads `X-API-Token` at `automem@e147c352:automem/api/auth_helpers.py:10-20`. | Change the curl header to `X-API-Key`. |
| Unconfigured Qdrant reports `"unavailable"`. | **Validated** | Target repeats it at `quick-start.md:223,229,334`. The release emits `"connected"` or `"disconnected"` at `automem@e147c352:automem/api/health.py:87-90`. | Change all three occurrences to `"disconnected"`. |
| Grok is installable and has a configurable detection root. | **Already fixed (except the omitted override detail)** | `AGENT_CLIENTS` contains Grok at `mcp-automem@9a0bbf7:src/cli/clients.ts:10-17`; its root is `env.GROK_HOME || ~/.grok` at `src/cli/install.ts:798-805`. #335 already added Grok to the picker, detection list, and `--clients` list at `origin/main:quick-start.md:114,117,177`. The page omits only `$HERMES_HOME` / `$GROK_HOME`. | Do not reapply the PR’s three Grok additions. Amend only the detection sentence to name the two environment overrides. |
| Unset `PORT` falls through to Flask `:5000`. | **Validated** | Target says this at `quick-start.md:266,336`. AutoMem defaults to `8001` at `automem@e147c352:automem/runtime_wiring.py:81-83`. | Replace both lines with the actual mismatch warning: a platform-set non-8001 `PORT` conflicts with callers still using `:8001`. |
| `CI`, `CODEX`, `CLAUDE_CODE`, or `GITHUB_ACTIONS` imply `--yes`. | **Validated** | Target claim: `quick-start.md:187-189`. Noninteractive mode previews unless `yes` is set at `mcp-automem@9a0bbf7:src/cli/install.ts:1042-1048,2046-2049,2073-2079`; the listed runtime variables only suppress animation at `src/cli/install-ui.ts:217-219`. | Remove the auto-yes sentence; retain the safe headless-preview behavior and say to pass `--yes` or `AUTOMEM_YES=1` to apply. |

## PR #319 — `getting-started/docker`

Target: `src/content/docs/docs/getting-started/docker.md`.

| Claim | Classification | Evidence | Small fresh replacement |
| --- | --- | --- | --- |
| The diagram calls the API service `memory-service`. | **Validated** | Target: `docker.md:42`; release compose service: `automem@e147c352:docker-compose.yml:37-40` (`flask-api`). | Rename only the diagram node to `flask-api`. |
| `falkordb_data` mounts at `/var/lib/falkordb/data`. | **Validated** | Target: `docker.md:48`; release mount: `automem@e147c352:docker-compose.yml:9-18` (`/data`). | Correct only that diagram label. |
| The fixed four-row port table is complete. | **Validated** | Target table: `docker.md:173-180`; release compose publishes Qdrant gRPC 6334 and parameterizes every host port at `automem@e147c352:docker-compose.yml:6-8,29-31,39-40`. | Add the 6334 row and one concise host-port override note. |
| `EMBEDDING_PROVIDER` excludes `ollama`. | **Validated** | Target list: `docker.md:154`; `ollama` is an explicit supported value and part of auto selection at `automem@e147c352:automem/embedding/provider_init.py:68-81,171-276`. | Add `ollama` and use the source order: `auto|voyage|openai|ollama|local|placeholder`. |
| The optional-variable table can omit `VOYAGE_API_KEY` and `VECTOR_SIZE`. | **Validated** | Both are compose variables at `automem@e147c352:docker-compose.yml:61-64`; target table ends without them at `docker.md:146-155`. | Add just those two rows. |

## PR #321 — `core-concepts/hybrid-search`

Target: `src/content/docs/docs/core-concepts/hybrid-search.md`.

| Claim | Classification | Evidence | Small fresh replacement |
| --- | --- | --- | --- |
| Final scores are normalized to `[0.0, 1.0]`. | **Validated** | Target repeats the normalization premise at `hybrid-search.md:215,232,267-302,391`. The release returns the unnormalized weighted sum at `automem@e147c352:automem/utils/scoring.py:246-280`. | Correct the three prose notes and Mermaid path in one page-local patch. |
| `SEARCH_WEIGHT_RELEVANCE` weights `context_bonus`. | **Validated** | Target formula/table: `hybrid-search.md:212,230,389`. In the release it weights `relevance_score`; `context_bonus` is added unweighted at `automem@e147c352:automem/utils/scoring.py:212-215,246-262`; default is `0.0` at `automem/config.py:479-482`. | Split relevance and context into distinct formula/table entries. |
| Recency uses `last_accessed`. | **Validated** | Target: `hybrid-search.md:185,191,249`. Release scoring reads only `timestamp` at `automem@e147c352:automem/utils/scoring.py:66-71,166`; configuration exposes the 180-day/linear-or-exp controls at `automem/config.py:496-503`. | Correct the recency explanation and diagram source label. |
| Missing importance/confidence score as `0.5`/`0.7`. | **Validated** | Target: `hybrid-search.md:187-191`. Missing or non-numeric values score `0.0` at `automem@e147c352:automem/utils/scoring.py:160-166`. | Correct the two fallback bullets and make the write-time versus score-time distinction explicit. |
| Repin the nine source links from `0720da2` to `42ba8b6`. | **Invalidated as a release-pin replacement** | The target has the old links at `hybrid-search.md:10-18`; however `42ba8b6` is not the requested 0.16.2 release commit. | Repin all nine links directly to `e147c352b100ebbf29e6555453fdde5152066138`, not to the older audit SHA. |

## PR #323 — `architecture/mcp-bridge`

Target: `src/content/docs/docs/architecture/mcp-bridge.md`.

| Claim | Classification | Evidence | Small fresh replacement |
| --- | --- | --- | --- |
| The entry-mode diagram’s `index.ts` anchors and ownership are current. | **Validated (but its old-SHA pin is not)** | Target has obsolete anchors at `mcp-bridge.md:85-93`. At mcp 0.16.0, mode detection is `src/index.ts:30-31`, guards are `:102-112`, stdio transport is `:447-448`, and server/tool handler are in `src/mcp-surface.ts:1020-1039`. | Repoint the five diagram nodes to those exact 0.16.0 locations. |
| CLI mode omits Copilot and Grok. | **Validated** | Target node/edge lists omit both at `mcp-bridge.md:96-129`. Both route through the release entry point at `mcp-automem@9a0bbf7:src/index.ts:327-354`; `HOST_SETUP_COMMANDS` is included in the recognized command set at `src/index.ts:32-42`. | Add only COPILOT/GROK nodes and edges. |
| Unset `PORT` defaults Flask to `:5000`. | **Validated** | Target: `mcp-bridge.md:513-515`; AutoMem release default: `automem@e147c352:automem/runtime_wiring.py:81-83`. | Replace with the `PORT`/`AUTOMEM_API_URL` mismatch warning. |
| Repin mcp-automem source notes from `538721c` to `0cd7498`. | **Invalidated as a release-pin replacement** | Target source note remains at `mcp-bridge.md:13-14`; `0cd7498` predates the required mcp 0.16.0 release. | Point `index.ts`, new `mcp-surface.ts`, and `automem-client.ts` references at `9a0bbf754dd31db524da25638b0e97907e32ff37`. |
| `associateMemories()` accepts only one association. | **Validated** | Target table is single-pair only at `mcp-bridge.md:284-293`. Release client sends either an `associations` array or one pair at `automem@e147c352:mcp-sse-server/server.js:343-349`; schema permits 1–500 batch entries at `server.js:542-587`. | Amend that single request-body cell to include the `associations` batch shape and 1–500 bound. |

## Cross-PR overlap and ordering

- #318 and #323 independently correct the same underlying AutoMem `PORT`
  default, but on different pages. Each page needs its own fresh patch.
- #318’s Grok inclusion was already merged by #335; that overlap closes only
  the picker/list portion, not the missing home-directory override detail.
- #321 and #323 both contain stale-commit repins. Neither older audit SHA is
  an acceptable replacement for the requested release SHA.

Create five narrow, page-scoped replacements (one per target page) rather than
merging or cherry-picking these stale PR branches. In particular, start the
`mcp-bridge` replacement from current `origin/main` so later release work on
that page remains intact.
