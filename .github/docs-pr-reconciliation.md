# Documentation PR reconciliation ledger

**Status:** active reconciliation.  The legacy `docs/audit-*` pull requests are
evidence of reported drift, not a merge queue.  Do not bulk-merge or bulk-close
them.

## Operating rule

For every legacy claim:

1. Validate it against the current authoritative source revision.
2. Make one fresh, page-scoped replacement pull request containing only the
   still-true correction (and a source-pinned citation where appropriate).
3. Let the normal docs checks and auto-merge workflow land that replacement.
4. Only then mark the legacy PR as superseded, preserving its discussion and
   links to the replacement.

This keeps useful research while preventing a stale branch from overwriting
newer documentation or source semantics.

## Authority snapshot

| Source | Revision used for current validation |
| --- | --- |
| AutoMem 0.16.2 release commit | `e147c352b100ebbf29e6555453fdde5152066138` |
| mcp-automem 0.16.0 release commit | `9a0bbf754dd31db524da25638b0e97907e32ff37` |

`mcp-automem@9a0bbf…` is the published 0.16.0 release.  AutoMem's 0.16.2
release commit is `e147c…`; GitHub's release listing still labels 0.16.1 as
latest, so do not mistake that UI lag for an older source authority.  Existing
replacements #340–#345 were directly revalidated against a later `main`
snapshot; all remaining work uses these release pins.  Never transplant the
older audit SHA just because it appears in the legacy diff.

## Source-validated replacement queue

These twelve pages have been checked against the authority snapshot and need
fresh replacement PRs.  They are deliberately one-page slices so their checks,
review, auto-merge, and rollback remain independent.

| Legacy PR | Replacement page | Scope constraint |
| --- | --- | --- |
| #320 | `reference/api/health` | Correct health/degraded and queue semantics; do not claim endpoint-wide structured logging. |
| #328 | `operations/health` | Document the six `/analyze` groups, startup-recall auth/limits, and monitor flags; say “up to 100 timestamped memories,” not “most recent.” |
| #329 | `reference/api/admin` | Scope the shared envelope to HTTP/auth errors; correct admin/reprocess semantics. |
| #330 | `getting-started/environment-variables` | Correct port, inert logging variables, relevance, test defaults, and MCP watchdog behavior. |
| #331 | `operations/troubleshooting` | Correct recovery, vector autodetection, payload-index, and embedding-provider claims. |
| #332 | `architecture/background-processing` | Correct health/status/auth/cache claims without inventing health blocks. |
| #333 | `operations/performance` | Correct worker batching and `recall_complete` logging fields. |
| #311 | `cli/platform-installers` | Keep current Copilot/Desktop/Cursor/Claude Code behavior; repin client citations. |
| #317 | `cli/setup` | Distinguish plain `config` output from raw `config --format=json`. |
| #322 | `platforms/claude-desktop` | Limit health claims to the MCP projection; do not infer raw backend schema or UI/asset behavior. |
| #324 | `cli/config-tools` | Correct config precedence, templates, recall parsing, and narrow debug behavior. |
| #326 | `reference/api/direct-vs-mcp` | Correct process tag, lifecycle, factory, and handler locations; retain raw-service schema work for its own validation. |
| #308 | `deployment/docker` | Correct the Compose service, healthcheck, health state, and restart guidance; do not expose inert runtime variables. |
| #309 | `core-concepts/consolidation` | Correct the current MetaMemory persistence and `SUMMARIZES` contract while retaining the five-member gate. |
| #310 | `core-concepts/relationship-types` | Correct the associate request/response/Cypher contract, `updated_at`, and source attribution. |
| #312 | `architecture/overview` | Correct bootstrapping, serialization, retry, and `.env` precedence; avoid volatile configuration-variable counts. |

## Legacy overlap: preserve, do not discard

Six newer legacy PRs fully overlap an earlier single-page PR: `#257 → #308`,
`#259 → #297`, `#261 → #315`, `#268 → #321`, `#276 → #318`, and `#281 → #317`.
Eight overlap only partially: `#267 → #305`, `#270 → #320`, `#271 → #306`,
`#272 → #330`, `#273 → #332`, `#274 → #328`, `#275 → #329`, and `#277 → #326`.

Neither classification authorizes closure: partial pairs include extra factual
claims that must be validated separately, and even fully overlapping legacy
PRs need their newest successor rechecked before a fresh replacement is made.

## Release-audited cohorts awaiting replacements

The following legacy PRs remain open but now have release-pinned findings.
They still require fresh replacements; an entry here is not permission to
merge the legacy branch.

| Legacy PRs | Pages / important carry-forward constraint |
| --- | --- |
| #330–#333 | Environment, troubleshooting, background processing, and performance all remain wrong.  Do not call relevance experimental; describe worker batching with a remaining-deadline timeout. |
| #311, #317, #322, #324, #326 | Five MCP pages remain wrong.  Generic `config --format=json` uses `memory` **without** `-y`; Claude Desktop counts are optional; Configuration is lines 413–433. |
| #312 | Overview remains wrong, but remove fragile configuration-prefix counts rather than replacing them. |
| #313 | Backup semantics remain wrong: retention is a per-store count, and Qdrant artifacts wrap `points` in an object. |
| #314 | The simple Compose/TypeScript/ESLint corrections validate; any CLI/template tree refresh must include Grok or be explicitly non-exhaustive. |
| #315 | Hermes direct-command flags are not environment-variable mappings; `.env` is the backup exception. |
| #318 | Quick Start needs auth, Qdrant, PORT, and noninteractive corrections.  Grok picker/list work is already in #335; only home-directory overrides remain. |
| #319 | Docker & Local Dev needs the current Compose service, mounts, ports, provider list, and optional variables. |
| #321 | Hybrid search needs unnormalised scoring, separate relevance/context, timestamp recency, zero fallbacks, and release-pinned links. |
| #323 | MCP bridge needs current split-file anchors, Copilot/Grok routing, correct PORT guidance, and batch association shape. |
| #283–#287 | All semantic corrections remain needed.  #285's old MCP line anchors are stale at 0.16.0, so rewrite the source map around `mcp-surface.ts`. |
| #288–#294 | All seven pages remain wrong, but #288, #291, and #294 need narrowly corrected wording before their fresh patches are written. |
| #295–#302 | Thirty-three corrections remain valid.  #301's `classification` item is already fixed; #302 must use `mcp-surface.ts`, not its obsolete `index.ts` anchor. |
| #303–#307 | All twenty-one audited claims remain active drift; no target-page correction is already on main. |

Each of these findings is recorded in `.superpowers/reconciliation/` with
claim-level source evidence.  Open a replacement only from the latest website
main and the corresponding release pin.

## Remaining queue

All other open `docs/audit-*` PRs remain in the ledger as **pending
current-source validation**.  Group them by source and page rather than merge
order, and treat each PR body as a list of candidate claims:

- Automem service/docs pages: #257, #262–#280, #283–#294, #300–#310,
  #312–#315, #318–#321, #323, #325, #327.
- MCP client/platform pages: #259, #261, #281–#282, #295–#297, #299,
  #311, #315, #317, #319, #321–#326.

Some numbers appear in both streams because their page combines service and
client behavior.  Resolve that by recording which repository proves each
individual assertion; do not infer a claim from the other repository.

## Completion record for a legacy PR

Before a legacy PR is closed, record its replacement PR URL, the source SHA
used, and any rejected assertion.  If a claim is no longer true or already
covered on `main`, close it only with a short explanation—not by silently
abandoning the work.
