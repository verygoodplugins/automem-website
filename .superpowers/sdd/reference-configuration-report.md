# Reference Configuration Reconciliation Report

## Scope

Page-scoped reconciliation for `src/content/docs/docs/reference/configuration.md` only. This change carries the five residual claims from legacy PR #286 and deliberately leaves independently observed configuration-table drift untouched (including identity entries, cooldown wording, internal constants, and FalkorDB requiredness).

## Release-pinned evidence

- AutoMem 0.16.2: `e147c352b100ebbf29e6555453fdde5152066138`
- mcp-automem 0.16.0: `9a0bbf754dd31db524da25638b0e97907e32ff37`

The page now links both revisions and the focused test asserts that both pins remain present. The source-validated behavior covered by this slice is:

1. AutoMem defaults `PORT` to `8001`; a platform-provided alternative can disagree with callers hardcoded to `:8001`. It is not a Flask/5000 fallback claim.
2. Auto embedding selection is `Voyage → OpenAI → Ollama (when configured) → FastEmbed → placeholder`.
3. Sync repair derives `missing_ids = falkor_ids - qdrant_ids` and, with automatic repair enabled, queues every missing ID—there is no percentage threshold.
4. MCP API-key lookup prioritizes `AUTOMEM_API_KEY`, `AUTOMEM_API_TOKEN`, `CLAUDE_PLUGIN_OPTION_API_KEY` (including lowercase), then `CLAUDE_PLUGIN_OPTION_API_TOKEN` (including lowercase).
5. Codex TOML uses `[mcp_servers.memory]` with `[mcp_servers.memory.env]`.

## Exact edits

- Replaced the Railway/Flask port warning with the validated default and caller-compatibility warning.
- Replaced the generic local/Ollama fallback sentence with the exact five-stage provider ladder.
- Replaced the claimed 5% sync threshold with the set-difference and per-ID repair behavior.
- Added the full MCP API-key priority list beneath the configuration diagram.
- Updated the Codex example from obsolete `[mcp.servers.automem]` sections to the `mcp_servers.memory` sections.
- Added `tests/reference-configuration-docs.test.mjs`, a static Node test that guards each correction and rejects the superseded port, fallback, sync-threshold, and TOML claims.

## Validation

- RED: `node --test tests/reference-configuration-docs.test.mjs` failed before documentation edits because the page did not contain the release pins.
- GREEN: `node --test tests/reference-configuration-docs.test.mjs` passed after the edits.
- `npm test` passed: 96 passed, 1 skipped, 0 failed.
- `npm run build` passed. Existing non-failing warnings: Astro markdown-plugin deprecation, inspector-port fallback, unused `createRequire`, and chunk-size advisory.
- `git diff --check` passed.

## Self-review

The diff is limited to the requested page plus its focused static test and this report. No legacy PR state, worktree, branch, release-pinned claim outside the five targets, or separately discovered configuration drift was modified.

## Commit

`docs(reference): reconcile configuration behavior` (this report is committed with the documentation and regression test).

## Fix round 1 — Mermaid API-key priority

The `KEY_PRIORITY` node in the API-key resolution Mermaid diagram had retained only `AUTOMEM_API_KEY` and `AUTOMEM_API_TOKEN`, despite the adjacent resolution list documenting the plugin fallbacks. It now presents one complete sequence:

1. `AUTOMEM_API_KEY`
2. `AUTOMEM_API_TOKEN`
3. `CLAUDE_PLUGIN_OPTION_API_KEY / claude_plugin_option_api_key`
4. `CLAUDE_PLUGIN_OPTION_API_TOKEN / claude_plugin_option_api_token`

The focused static test asserts this exact `KEY_PRIORITY` node and rejects the former partial two-entry node. RED verification failed against the partial diagram; GREEN verification passed with `node --test tests/reference-configuration-docs.test.mjs`. `git diff --check` also passed.
