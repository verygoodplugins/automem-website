# Local setup reconciliation report

## Source evidence

- AutoMem `0.16.2` is pinned at `e147c352b100ebbf29e6555453fdde5152066138`.
  - `docker-compose.yml` names the API service `flask-api` and exports
    `FLASK_ENV: development` plus `FLASK_DEBUG: "1"`.
  - `automem/config.py` defaults consolidation intervals to 86,400 seconds
    (decay), 604,800 (creative), 2,592,000 (cluster), and 0 (forget).
  - `automem/runtime_wiring.py` calls `app.run(..., debug=False)`.
- mcp-automem `0.16.0` is pinned at `9a0bbf754dd31db524da25638b0e97907e32ff37`.
  - `package.json` declares Node `^20.19.0 || ^22.13.0 || >=24`.
  - Its `prebuild` starts with `tsx scripts/sync-memory-policy.ts`; its
    `postbuild` only runs the OpenClaw package builder.

## Changes

- Reconciled `src/content/docs/docs/development/local-setup.md` to those
  source pins, including the Compose service name, scheduler sequence,
  runtime debug explanation, Node engine range, and npm hooks.
- Added `tests/local-setup-docs.test.mjs`, a static guard covering every
  corrected claim and rejecting the superseded values/text.
- Kept the unrelated `0.0.0.0` bind wording untouched, per scope.

## Verification

- `node --test tests/local-setup-docs.test.mjs` — 4 passed.
- `npm test` — 94 passed, 1 skipped, 0 failed.
- `npm run build` — passed; pre-existing Astro/Vite warnings only.
- `git diff --check` — passed.

## Commit and self-review

- Commit subject: `docs(development): reconcile local setup docs`.
- Reviewed the final diff against both pinned source revisions. It contains
  only the assigned page, its focused test, and this implementation report;
  no stale service name, schedule, debug/autoreload claim, engine range, or
  `chmod +x` postbuild claim remains.

## SDD fix round 1

- Extended the static guard to require the e147 bootstrap-script source link
  and reject the stale ed36 pin.
- Added negative checks for the old Flask configuration-table row, a
  standalone `FLASK_ENV=development` shell instruction, the old Node minimum,
  individual stale scheduler intervals, and the stale standalone prebuild
  command.
- The deferred Mermaid `Optional` label remains unchanged because it is
  outside the assigned #300 scope.
