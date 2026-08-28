# Documentation PR reconciliation ledger

**Status:** release audit complete. Legacy `docs/audit-*` pull requests are
research records, not a merge queue. Create each replacement from current
`main`, keep it page-scoped, and carry only the source-supported residuals
recorded in `.superpowers/reconciliation/`.

## Authority snapshot

| Source | Release used by the audit |
| --- | --- |
| AutoMem 0.16.2 | `e147c352b100ebbf29e6555453fdde5152066138` |
| mcp-automem 0.16.0 | `9a0bbf754dd31db524da25638b0e97907e32ff37` |

The reconciliation reports are the claim-level authority. A manifest row is
one fresh replacement PR for its one target page; grouped numbers share that
page, and `residual` means only the still-valid work not covered by the closed
legacy PR is carried forward.

## Complete legacy records

These seven legacy audit PRs are closed and require no replacement from their
own branches: #257, #308, #309, #310, #320, #328, and #329. Their surviving
same-page residuals, where any, are explicitly assigned below. #316 is a
merged CI change, not a documentation-page audit record.

## Executable replacement manifest

Run batches in order. Each semicolon-separated entry is `legacy PR group ->`
`target path`; it creates one replacement PR. Do not copy audit prose or merge
a legacy branch.

1. **Setup/install/config — batch 1:** #311 -> `cli/platform-installers`; #317, #281 -> `cli/setup`; #324, #282 -> `cli/config-tools`.
2. **Setup/install/config — batch 2:** #272 residual unresolved before closure with #330 -> `getting-started/environment-variables`; #276, #318 -> `getting-started/quick-start`; #279 -> `getting-started/introduction`.
3. **Setup/install/config — batch 3:** #303 -> `cli/guided-cloud-setup`; #307 -> `cli/queue`; #286 -> `reference/configuration`.
4. **API/reference — batch 1:** #285, #323 -> `architecture/mcp-bridge`; #271 residual unresolved before closure with #306 -> `reference/api/memory-operations`; #275 residual after #329 -> `reference/api/admin`.
5. **API/reference — batch 2:** #277 residual unresolved before closure with #326 -> `reference/api/direct-vs-mcp`; #284 -> `reference/api/relationships`; #287 -> `reference/authentication`.
6. **API/reference — batch 3:** #288 -> `reference/api/consolidation`; #293, #327 -> `reference/api/recall-operations`; #270 residual after #320 -> `reference/api/health`.
7. **Operations/architecture — batch 1:** #274 residual after #328 -> `operations/health`; #273 residual unresolved before closure with #332 -> `architecture/background-processing`; #313 -> `operations/backup`.
8. **Operations/architecture — batch 2:** #331 -> `operations/troubleshooting`; #333 -> `operations/performance`; #312 -> `architecture/overview`.
9. **Operations/architecture — batch 3:** #289 -> `architecture/embeddings`; #292 -> `architecture/data-stores`; #301 -> `architecture/enrichment`.
10. **Operations/architecture — batch 4:** #319 -> `getting-started/docker`; #304 -> `deployment/railway`; #300 -> `development/local-setup`.
11. **Operations/architecture — batch 5:** #314 -> `development/structure`; #283, #325 -> `overview`; #268, #321 -> `core-concepts/hybrid-search`.
12. **Concepts/development/platforms — batch 1:** #290 -> `core-concepts/recall-tuning`; #294 -> `core-concepts/memory-model`; #267 residual unresolved before closure with #305 -> `development/testing`.
13. **Concepts/development/platforms — batch 2:** #269 -> `graph-viewer/overview`; #278 -> `research`; #302 -> `best-practices/memory-rules`.
14. **Concepts/development/platforms — batch 3:** #259, #297 -> `platforms/codex`; #261, #315 -> `platforms/hermes`; #262 -> `platforms/alexa`.
15. **Concepts/development/platforms — batch 4:** #264 -> `platforms/antigravity`; #265 -> `platforms/claude-web`; #266 -> `platforms/chatgpt`.
16. **Concepts/development/platforms — batch 5:** #280 -> `platforms/github-copilot`; #295 -> `platforms/claude-code`; #296 -> `platforms/cursor`.
17. **Concepts/development/platforms — batch 6:** #299 -> `platforms/openclaw`; #291 -> `platforms/elevenlabs`; #322 -> `platforms/claude-desktop`.
18. **Concepts/development/platforms — final remainder:** #263 -> `best-practices/context-engineering`.

## Completion rule

After a replacement merges, close its listed legacy PRs with the replacement
URL, release SHA, and any rejected claim. For a residual row, retain that
qualification in the closing comment; a closed overlapping PR never implies
that its uncarried claims were accepted.
