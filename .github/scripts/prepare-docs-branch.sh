#!/usr/bin/env bash
# Check out the rolling docs branch for one source repo before Claude edits.
# Called from .github/workflows/docs-update.yml.
#
# Each source repo has one rolling PR on docs/audit-<repo>. While that PR is
# open, a new release stacks its edits on it (after merging main in). Once it
# merges or closes, the branch restarts from main.
#
# For a release dispatch it also records the release in the source pins file,
# which the docs tests read, so pages may link to the new release commit.
set -euo pipefail

SOURCE_REPO="${SOURCE_REPO:?SOURCE_REPO required}"
SOURCE_SHA="${SOURCE_SHA:?SOURCE_SHA required}"
RELEASE_TAG="${RELEASE_TAG:-}"
RELEASE_VERSION="${RELEASE_VERSION:-}"
BASE_BRANCH="${BASE_BRANCH:-main}"
PINS_FILE="${PINS_FILE:-scripts/docs-source-pins.json}"

BRANCH="docs/audit-${SOURCE_REPO##*/}"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch origin "refs/heads/${BASE_BRANCH}:refs/remotes/origin/${BASE_BRANCH}"

OPEN_PR="$(gh pr list --head "$BRANCH" --base "$BASE_BRANCH" --state open --json number --jq '.[0].number // ""')"
if [ -n "$OPEN_PR" ]; then
  echo "Stacking on open rolling docs PR #${OPEN_PR} (${BRANCH})."
  git fetch origin "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
  git checkout -B "$BRANCH" "origin/${BRANCH}"
  if ! git merge --no-edit "origin/${BASE_BRANCH}"; then
    git merge --abort
    echo "::error::Rolling docs PR #${OPEN_PR} conflicts with ${BASE_BRANCH}. Resolve it so new releases can stack on it."
    exit 1
  fi
else
  echo "No open rolling docs PR; starting ${BRANCH} from ${BASE_BRANCH}."
  git checkout -B "$BRANCH" "origin/${BASE_BRANCH}"
fi

if [ -n "$RELEASE_TAG" ]; then
  if [ -z "$RELEASE_VERSION" ]; then
    RELEASE_VERSION="${RELEASE_TAG##*v}"
  fi
  PINS_TMP="$(mktemp)"
  jq --arg repo "$SOURCE_REPO" --arg version "$RELEASE_VERSION" --arg tag "$RELEASE_TAG" --arg sha "$SOURCE_SHA" '
    .[$repo] |= ((. // {releases: []})
      | .releases = ([{version: $version, tag: $tag, sha: $sha}] + (.releases | map(select(.sha != $sha)))))
  ' "$PINS_FILE" > "$PINS_TMP"
  mv "$PINS_TMP" "$PINS_FILE"
  echo "Recorded ${SOURCE_REPO} ${RELEASE_TAG} (${SOURCE_SHA:0:7}) in ${PINS_FILE}."
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "branch=${BRANCH}" >> "$GITHUB_OUTPUT"
fi
