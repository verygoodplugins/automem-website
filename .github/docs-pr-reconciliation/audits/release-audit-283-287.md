# Release-pinned reconciliation: PRs 283-287

Audit date: 2026-08-28.
Website target: chore/docs-pr-reconciliation at 2d68ed3.
Sources: AutoMem 0.16.2 e147c352b100ebbf29e6555453fdde5152066138; MCP AutoMem 0.16.0 9a0bbf754dd31db524da25638b0e97907e32ff37.

All five legacy PRs are open drafts. None is safe to merge or transplant: the ordinary fixes below remain necessary; PR 285's proposed line-number transplant is itself stale after the MCP surface extraction.

## PR 283 - Overview

Target: src/content/docs/docs/overview.md.

| Legacy claim / correction | Release-pinned classification and exact evidence | Already fixed? |
|---|---|---|
| Replace Health Monitor's nonexistent check_drift / repair_drift with check_consistency, trigger_recovery, and send_alert. | **Keep.** HealthMonitor is at [health_monitor.py:40](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L40); its 5% monitor setting at [62](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L62); the real methods at [142](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L142), [184](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L184), and [219](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/scripts/health_monitor.py#L219). | **No** - target line 152. |
| SyncWorker auto-repairs only after 5% divergence. | **Keep.** It computes a set difference, returns only when empty, then queues every missing id ([runtime_worker.py:75-102](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/sync/runtime_worker.py#L75-L102)). 5% belongs to the separate Health Monitor. | **No** - line 390. |
| Provider-selection entry is _generate_real_embedding(); explicit ollama is absent. | **Keep.** Selection is owned by [init_embedding_provider at provider_init.py:59-82](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/embedding/provider_init.py#L59-L82). Explicit modes include ollama at [75-81](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/embedding/provider_init.py#L75-L81), with its branch at [141](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/embedding/provider_init.py#L141). | **No** - lines 402, 405, 422-449, 531. |

Smallest fresh slice: lines 152, 390, 400-455, and 531 only. Preserve the narrower provider-initialization framing; leave provider characteristics and Railway prose alone.

## PR 284 - Relationship Operations

Target: src/content/docs/docs/reference/api/relationships.md.

| Legacy claim / correction | Release-pinned classification and exact evidence | Already fixed? |
|---|---|---|
| The two memory.py source-note links target unrelated ranges. | **Keep.** /associate begins at [memory.py:1041](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/memory.py#L1041); _create_association_batch begins at [157](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/memory.py#L157). | **No** - lines 9-10. |
| REST and MCP single-pair type is required. | **Keep.** REST defaults it to RELATES_TO ([memory.py:1059-1063](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/memory.py#L1059-L1063)); MCP single-pair schema has no required array ([mcp-surface.ts:699-757](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/mcp-surface.ts#L699-L757)). Scope the wording to single-pair mode: batch items do require type and strength ([753](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/mcp-surface.ts#L753)). | **No** - lines 54, 223, 468. |
| Edges use created_at, and custom fields arrive in a nested properties object. | **Keep.** _prepare_association_props seeds strength and updated_at, then reads allowed relation properties directly from top-level payload fields ([memory.py:62-75](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/memory.py#L62-L75)); the route passes its payload at [1082-1088](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/memory.py#L1082-L1088). | **No** - lines 337, 347, 357. |

Smallest fresh slice: source links 9-10; the three single-pair optionality cells (54, 223, 468); and edge-property examples/table (337, 347, 357). Batch-mode documentation is a separate omission - do not add it.

## PR 285 - MCP Bridge

Target: src/content/docs/docs/architecture/mcp-bridge.md.

| Legacy claim / correction | Release-pinned classification and exact evidence | Already fixed? |
|---|---|---|
| Unset PORT makes Flask use :5000. | **Keep.** run_default_server defaults it to 8001 ([runtime_wiring.py:81-83](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/runtime_wiring.py#L81-L83)). | **No** - line 514. |
| Move mode-detection anchor from src/index.ts:41-42 to :42-43. | **Rework; do not transplant.** MCP 0.16.0 mode detection is [src/index.ts:30-31](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/index.ts#L30-L31), so the PR replacement is stale too. | **No** - line 85. |
| Move installStdioErrorGuards() from :100-110 to :101-111. | **Rework; do not transplant.** It is [src/index.ts:102-112](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/index.ts#L102-L112). | **No** - line 90. |
| Move new Server(), StdioServerTransport, and CallToolRequestSchema to later src/index.ts lines. | **Rework; source layout changed.** Transport is [src/index.ts:447-448](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/index.ts#L447-L448), but construction and request handling moved to [src/mcp-surface.ts:1020-1039](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/mcp-surface.ts#L1020-L1039). | **No** - lines 91-93. |
| Key resolution has only API_KEY then API_TOKEN. | **Keep.** It then checks two Claude plugin-option tiers, with both supported casings ([src/env.ts:12-23](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/env.ts#L12-L23)). | **No** - lines 344-349. |

Smallest fresh slice: diagram labels 85 and 90-93, key list/note 344-349, and PORT caution 513-515. Prefer function/source-file labels over line numbers so this survives the mcp-surface.ts extraction.

## PR 286 - Configuration Reference

Target: src/content/docs/docs/reference/configuration.md.

| Legacy claim / correction | Release-pinned classification and exact evidence | Already fixed? |
|---|---|---|
| Flask falls back to 5000 when PORT is unset. | **Keep.** Default is 8001 ([runtime_wiring.py:81-83](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/runtime_wiring.py#L81-L83)). | **No** - line 91. |
| Sync repair begins after 5% drift. | **Keep.** It is empty/non-empty set-difference repair ([runtime_worker.py:75-102](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/sync/runtime_worker.py#L75-L102)). | **No** - line 288. |
| Codex TOML uses [mcp.servers.automem]. | **Keep.** Shipped template uses [mcp_servers.memory] and [mcp_servers.memory.env] ([templates/codex/config.toml:7-18](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/templates/codex/config.toml#L7-L18)). | **No** - lines 466 and 470. |
| Key-priority diagram has two tiers. | **Keep.** Four tiers are implemented ([src/env.ts:12-23](https://github.com/verygoodplugins/mcp-automem/blob/9a0bbf754dd31db524da25638b0e97907e32ff37/src/env.ts#L12-L23)). | **No** - line 382. |
| Auto provider ladder conflates local/Ollama. | **Keep.** Actual order: Voyage -> OpenAI -> Ollama -> FastEmbed -> placeholder ([provider_init.py:171-271](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/embedding/provider_init.py#L171-L271)). | **No** - line 153. |

Smallest fresh slice: lines 90-92, 153, 285-288, 381-382, and 463-473. Do not copy PR 285's stale MCP Bridge anchors into this independent page patch.

## PR 287 - Authentication

Target: src/content/docs/docs/reference/authentication.md.

| Legacy claim / correction | Release-pinned classification and exact evidence | Already fixed? |
|---|---|---|
| Only /health and /backup bypass API-token validation. | **Keep.** Before-request guard also returns for OPTIONS and /viewer* ([app.py:266-282](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/app.py#L266-L282)). Viewer blueprint is conditionally registered ([runtime_bootstrap.py:199-202](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/runtime_bootstrap.py#L199-L202)); do not call it a general data-API exemption. | **No** - lines 8 and 154. |
| Invalid admin token is 403, while an unset server admin token is 401. | **Keep.** Unset configuration aborts 403; missing/mismatched supplied token aborts 401 ([auth_helpers.py:25-42](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/auth_helpers.py#L25-L42)). | **No** - diagram line 130 and troubleshooting. |
| Only X-Admin-Token is accepted. | **Keep.** Release tries X-Admin-Token, then X-Admin-Api-Key, then admin_token query input ([auth_helpers.py:35-39](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/auth_helpers.py#L35-L39)). | **No** - line 137. |
| Entity audit and entity merge are not admin-protected. | **Keep.** Both invoke admin guard: [/entities/audit entity.py:316-320](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/entity.py#L316-L320), [/entity/slug/merge 400-404](https://github.com/verygoodplugins/automem/blob/e147c352b100ebbf29e6555453fdde5152066138/automem/api/entity.py#L400-L404). | **No** - absent from lines 147-152 and 182-211. |

Smallest fresh slice: opening/closing exemption prose (8, 154), admin-validation diagram and credential paragraph (130, 137), endpoint table/diagram/category row (147-152, 182-211), and unset-admin-token troubleshooting. Leave general security guidance untouched.

## Final already-fixed verdict

**No claimed PR correction is already present in the current target pages.** All semantic corrections need new release-pinned patches. That does not authorize applying PR 285: its replacement anchors are stale at MCP 0.16.0 and must be rewritten for the split src/index.ts / src/mcp-surface.ts layout.
