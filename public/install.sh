#!/bin/sh
set -eu

PACKAGE_SPEC="${AUTOMEM_PACKAGE_SPEC:-@verygoodplugins/mcp-automem@latest}"
QUIET="${AUTOMEM_QUIET:-0}"
HELP_LOG=""

# Default launcher: npx -y @verygoodplugins/mcp-automem@latest install

if [ -t 1 ] && [ -z "${NO_COLOR-}" ]; then
  BOLD="$(tput bold 2>/dev/null || printf '')"
  GREY="$(tput setaf 8 2>/dev/null || tput setaf 0 2>/dev/null || printf '')"
  RED="$(tput setaf 1 2>/dev/null || printf '')"
  GREEN="$(tput setaf 2 2>/dev/null || printf '')"
  GOLD="$(printf '\033[38;2;249;216;87m')"
  RESET="$(tput sgr0 2>/dev/null || printf '')"
else
  BOLD=""
  GREY=""
  RED=""
  GREEN=""
  GOLD=""
  RESET=""
fi

say() {
  [ "$QUIET" = "1" ] && return 0
  printf '%s\n' "$*"
}

fail() {
  printf '%s\n' "${RED}x $*${RESET}" >&2
  exit 1
}

warn() {
  printf '%s\n' "${GOLD}! $*${RESET}" >&2
}

detail() {
  say "             $*"
}

need() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required before installing AutoMem."
}

banner() {
  say "${GOLD}[automem]${RESET} ${BOLD}AutoMem${RESET}"
  say "${GREY}          guided memory setup for local and cloud agents${RESET}"
  say ""
}

is_headless() {
  [ -n "${CI-}" ] || [ -n "${CODEX-}" ] || [ -n "${CLAUDE_CODE-}" ] || [ -n "${GITHUB_ACTIONS-}" ]
}

cleanup() {
  [ -n "$HELP_LOG" ] && [ -f "$HELP_LOG" ] && rm -f "$HELP_LOG"
}

trap cleanup EXIT HUP INT TERM

check_install_command() {
  [ "${AUTOMEM_SKIP_PACKAGE_CHECK:-0}" = "1" ] && return 0

  HELP_LOG="$(mktemp "${TMPDIR:-/tmp}/automem-install-help.XXXXXX")" || fail "could not create a temporary file."
  if ! npx -y "$PACKAGE_SPEC" help >"$HELP_LOG" 2>&1; then
    warn "Could not inspect $PACKAGE_SPEC."
    warn "The installer help output follows:"
    tail -40 "$HELP_LOG" >&2 || true
    fail "mcp-automem package check failed."
  fi

  if ! grep -E '^[[:space:]]*install[[:space:]]' "$HELP_LOG" >/dev/null 2>&1; then
    warn "$PACKAGE_SPEC does not expose 'install'."
    warn "The published npm latest may not include the guided installer yet."
    warn "Publish mcp-automem or rerun with AUTOMEM_PACKAGE_SPEC pointing to a local or canary package."
    fail "mcp-automem guided installer is unavailable."
  fi
}

banner

say "${GREY}stage 1/4${RESET}  ${GOLD}detect${RESET}  checking prerequisites"
need node
need npm
detail "${GREEN}ok${RESET} node $(node --version 2>/dev/null || printf unknown)"
detail "${GREEN}ok${RESET} npm $(npm --version 2>/dev/null || printf unknown)"

say "${GREY}stage 2/4${RESET}  ${GOLD}plan  ${RESET}  preparing guided installer arguments"
set -- install
[ -n "${AUTOMEM_INSTALL_TARGET-}" ] && set -- "$@" --target "$AUTOMEM_INSTALL_TARGET"
[ -n "${AUTOMEM_CLIENTS-}" ] && set -- "$@" --clients "$AUTOMEM_CLIENTS"
[ -n "${AUTOMEM_API_URL-}" ] && set -- "$@" --endpoint "$AUTOMEM_API_URL"
[ -n "${AUTOMEM_LOCAL_DIR-}" ] && set -- "$@" --local-dir "$AUTOMEM_LOCAL_DIR"
[ "${AUTOMEM_DRY_RUN:-0}" = "1" ] && set -- "$@" --dry-run
[ "${AUTOMEM_NO_AGENT_INSTALL:-0}" = "1" ] && set -- "$@" --no-agent-install
if [ "${AUTOMEM_YES:-0}" = "1" ] || is_headless; then
  set -- "$@" --yes
fi

say "${GREY}stage 3/4${RESET}  ${GOLD}verify${RESET}  checking mcp-automem install command"
check_install_command
detail "${GREEN}ok${RESET} $PACKAGE_SPEC exposes install"

say "${GREY}stage 4/4${RESET}  ${GOLD}setup ${RESET}  npx -y $PACKAGE_SPEC $*"
if [ -t 0 ]; then
  exec npx -y "$PACKAGE_SPEC" "$@"
elif (: </dev/tty) 2>/dev/null; then
  exec </dev/tty
  exec npx -y "$PACKAGE_SPEC" "$@"
else
  exec npx -y "$PACKAGE_SPEC" "$@"
fi
