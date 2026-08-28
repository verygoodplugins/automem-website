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
| `verygoodplugins/automem` `origin/main` | `5df0b83eb37a34b1206f89bf5d52190fe5a6ccdb` |
| `verygoodplugins/mcp-automem` `origin/main` | `9a0bbf754dd31db524da25638b0e97907e32ff37` |

The website baseline is `automem-website@7052f7b` (`docs: clarify benchmark
comparison context (#339)`).  Replace these pins when a later cohort is
validated; never transplant the older PR's pin just because it appears in the
legacy diff.

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
