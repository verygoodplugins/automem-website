# Installer screenshot tapes (VHS)

These [VHS](https://github.com/charmbracelet/vhs) tapes regenerate the standardized
terminal images of the AutoMem guided installer used in the docs (e.g.
`getting-started/quick-start`, `cli/guided-cloud-setup`). Re-run them whenever the
installer UI changes so the docs stay current.

## Prerequisites

- `vhs` (`brew install vhs`) and `node`.
- A reachable AutoMem `/health` endpoint at `http://127.0.0.1:8001`. The bundled
  stub is enough for capture:

  ```bash
  node scripts/tapes/health-stub.mjs &
  ```

## Generate

Run from the repo root. Point `AUTOMEM_BIN` at a local mcp-automem build so the
image shows the canonical `npx @verygoodplugins/mcp-automem install` command while
running that build offline (omit it to use the published npx package):

```bash
mkdir -p scripts/tapes/out
export AUTOMEM_BIN=../mcp-servers/mcp-automem/dist/index.js   # optional
for t in scripts/tapes/installer-*.tape; do vhs "$t"; done
```

Raw frames land in `scripts/tapes/out/` (gitignored). Frame, optimize, and place
the final committed PNGs into `public/img/docs/` with the `docs-screenshot-packager`
skill (1200px-wide optimized PNGs; verification gates dimensions, byte size, and a
token/secret scan).

## Safety

- Every tape runs with `AUTOMEM_DRY_RUN=1` (set in `_preamble.sh`) — the installer
  prints its plan and **stops**; nothing is written.
- `_preamble.sh` points `HOME` at an isolated `SHOTS_HOME` (so agent detection is
  deterministic and your real config is untouched) and captures from a generic
  `SHOTS_CWD` so plan paths carry no username/PII.
