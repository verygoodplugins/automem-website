---
title: What's New
description: Highlights from the latest AutoMem server and MCP client releases.
sidebar:
  order: 1
---

The latest releases — **AutoMem server 0.16.0** and **mcp-automem 0.15.0** (June 2026) — focus on recall correctness, batch operations, two new install paths, and data-driven tuning. This page summarizes the highlights; each item links to the page that documents it in full.

For the complete commit-level history, see the [Changelog](/docs/development/changelog/) and the release notes on [automem](https://github.com/verygoodplugins/automem/releases) and [mcp-automem](https://github.com/verygoodplugins/mcp-automem/releases).

---

## AutoMem server 0.16.0

### Recall ranking overhaul

The ranking release reworks how recall scores and orders results — the theme is *correctness over knobs*: fewer hand-tuned weights, more principled scoring.

- **Date-aware ranking & latest-fact selection** — recent facts are prioritized while older context stays reachable, and superseded facts give way to the latest answer. See [Recall Operations](/docs/reference/api/recall-operations/) and [Hybrid Search](/docs/core-concepts/hybrid-search/).
- **Configurable recency** — the recency decay window and curve are now tunable, alongside an optional relative-recency re-rank. See the [Recall Tuning](/docs/core-concepts/recall-tuning/) guide.
- **Tag-score cap** — the tag-score denominator can be capped to remove query-length bias (opt-in). See [Recall Tuning](/docs/core-concepts/recall-tuning/).
- **Relevance gate** — query-independent scoring is gated on topical evidence within the tag scope, cutting low-signal matches. See [Recall Tuning](/docs/core-concepts/recall-tuning/).
- **`state_mode=current|history`** — recall can now return only current memories or include superseded/invalidated ones for audit timelines. See [Recall Operations](/docs/reference/api/recall-operations/).
- **Metadata sidecar search** and metadata + `updated_at` surfaced in the detailed recall format.

### Bulk memory associations

A single API call can now create or update many memory relationships at once — far faster for batch graph building. See [Relationship Operations](/docs/reference/api/relationships/).

### Admin backup endpoint

A new admin endpoint exports your memories for backup and recovery. See [Admin Operations](/docs/reference/api/admin/) and [Backup & Recovery](/docs/operations/backup/).

### Consolidation: entity dedup & identity synthesis

Consolidation gained entity deduplication and identity synthesis, plus hardened entity cleanup/repair tooling, so the graph collapses duplicate people/tools/entities more reliably. See [Consolidation & Decay](/docs/core-concepts/consolidation/).

### Enrichment metrics

`/enrichment/status` now exposes the classification **fallback-rate** so you can see how often enrichment falls back from the LLM classifier. See [Enrichment Pipeline](/docs/architecture/enrichment/) and [Health & Analytics](/docs/reference/api/health/).

### Recall Quality Lab

A new contributor/maintainer harness tunes recall scoring against a **clone of real data** instead of guesswork — generate a test set with known answers, then measure Recall@K / MRR / NDCG with a statistical comparison to tell a real improvement from noise. It is not required to run AutoMem. See [Hybrid Search](/docs/core-concepts/hybrid-search/) and [Research & Motivation](/docs/research/).

---

## mcp-automem 0.15.0

### Two new install paths

- **Hermes Agent** — AutoMem now installs into the Hermes terminal agent as MCP tools, a native memory provider, or both. See the [Hermes guide](/docs/platforms/hermes/).
- **Guided cloud installer** — the installer can stand up a hosted backend (InstaPods or Railway) and capture the endpoint + token for you. See [Guided Cloud Setup](/docs/cli/guided-cloud-setup/).

### Plugin-first Claude Code

`claude-code` now installs as a Claude Code **plugin** that bundles the MCP server + hooks and **auto-updates**, replacing the manual settings-level wiring (still available as an option). Legacy hook entries are auto-migrated on re-run. See the [Claude Code guide](/docs/platforms/claude-code/).

### Smarter storage hooks

The Stop hook now uses an **LLM-judged storage nudge** instead of mechanically capturing build/test/deploy output — durable facts are stored by the model per the shared memory policy. See [Memory Rules & Patterns](/docs/best-practices/memory-rules/).

### Supersede memory mode

`store_memory` can supersede an existing memory — store a correction and invalidate the old fact in one step. See [Memory Operations](/docs/reference/api/memory-operations/).

### Leaner recall responses

Summary-first, token-aware budgeted recall formats keep responses well under the response-size cap so recalls don't flood an agent's context. See [Recall Operations](/docs/reference/api/recall-operations/).

---

## Upgrade notes

| Change | Impact | What to do |
|---|---|---|
| `AUTOMEM_ENDPOINT` → `AUTOMEM_API_URL` | The endpoint variable was renamed (the old name still works as a fallback) | Prefer `AUTOMEM_API_URL` in new configs. See [Environment Variables](/docs/getting-started/environment-variables/). |
| Installer permission scope tightened | The installer now merges only the six `mcp__memory__*` entries instead of granting broad Bash/file-tool permissions; re-running removes the four hook-era grants | Re-run the installer to adopt the narrower permission set |
| Hooks no longer auto-capture results | Build/test/deploy output is no longer mechanically stored; the model stores durable facts instead | No action required; expect fewer, higher-signal memories |

---

## Next steps

- **Install or upgrade** — [Quick Start](/docs/getting-started/quick-start/) (`curl -fsSL get.automem.ai | sh`).
- **New platform** — [Hermes Agent](/docs/platforms/hermes/).
- **Hosted backend** — [Guided Cloud Setup](/docs/cli/guided-cloud-setup/).
