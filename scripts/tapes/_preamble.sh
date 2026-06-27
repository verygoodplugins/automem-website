# Shared setup for the AutoMem installer screenshot tapes (sourced by each .tape).
# Keeps fragile shell out of the .tape files and makes capture deterministic.
#
# Configure via env before running `vhs` (all optional):
#   AUTOMEM_BIN  Path to a local mcp-automem build (dist/index.js) to run instead
#               of the published npx package — keeps capture offline/deterministic.
#   SHOTS_HOME  Isolated HOME so agent detection is deterministic and the real
#               user config is never touched (default: /tmp/automem-shots-home).
#   SHOTS_CWD   Generic project dir so plan paths carry no username/PII
#               (default: /tmp/automem-demo).
#
# Capture also needs a reachable AutoMem /health endpoint at the URL typed in the
# tapes (default http://127.0.0.1:8001). scripts/tapes/health-stub.mjs provides one.

SHOTS_HOME="${SHOTS_HOME:-/tmp/automem-shots-home}"
SHOTS_CWD="${SHOTS_CWD:-/tmp/automem-demo}"
mkdir -p "$SHOTS_HOME/.codex" "$SHOTS_HOME/.claude" "$SHOTS_HOME/.cursor" "$SHOTS_CWD"
export HOME="$SHOTS_HOME"
export PS1='$ '
# Never write during capture — the installer prints the plan and stops.
export AUTOMEM_DRY_RUN=1
# Show the canonical public command while running a local build, when provided.
if [ -n "${AUTOMEM_BIN:-}" ]; then
  npx() { node "$AUTOMEM_BIN" "${@:2}"; }
fi
cd "$SHOTS_CWD"
clear
