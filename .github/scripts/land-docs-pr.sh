#!/usr/bin/env bash
# Land docs audit changes: test, commit, push, open/update PR, notify maintainer.
# Called from .github/workflows/docs-update.yml after Claude Code finishes.
#
# Each source repo has one rolling PR on docs/audit-<repo>, which
# prepare-docs-branch.sh checks out before Claude runs. The docs tests run here,
# deterministically: a red suite lands the PR as a HOLD draft instead of leaving
# auto-merge waiting on a check that will never pass.
set -euo pipefail

SOURCE_REPO="${SOURCE_REPO:?SOURCE_REPO required}"
SOURCE_SHA="${SOURCE_SHA:?SOURCE_SHA required}"
RELEASE_TAG="${RELEASE_TAG:-}"
STRUCTURED_OUTPUT="${STRUCTURED_OUTPUT:-}"
BASE_BRANCH="${BASE_BRANCH:-main}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
MAINTAINER="${DOCS_MAINTAINER:-@jgarturo}"
PINS_FILE="${PINS_FILE:-scripts/docs-source-pins.json}"
TEST_CMD="${DOCS_TEST_CMD:-npm test}"
# Pushes made with the workflow's own GITHUB_TOKEN don't trigger CI, so a
# rolling PR would never get a fresh Build check. Push with this token instead.
PUSH_TOKEN="${PUSH_TOKEN:-}"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${REPO}/actions/runs/${GITHUB_RUN_ID:-}"

# Derive branch slug from source repo name (e.g. verygoodplugins/automem -> automem)
REPO_SLUG="${SOURCE_REPO##*/}"
SHORT_SHA="${SOURCE_SHA:0:7}"
SOURCE_LABEL="${RELEASE_TAG:-$SHORT_SHA}"
BRANCH="docs/audit-${REPO_SLUG}"

# Parse structured output from Claude Code action. Missing or malformed
# output fails closed to HOLD so auto-merge never ships an unverified PR.
CONFIDENCE="HOLD"
TITLE=""
FIXES_JSON="[]"
QUESTIONS_JSON="[]"

if [ -n "$STRUCTURED_OUTPUT" ] && [ "$STRUCTURED_OUTPUT" != "null" ]; then
  if PARSED="$(printf '%s' "$STRUCTURED_OUTPUT" | jq -c '
    {
      confidence: (.confidence // "HOLD"),
      title: (.title // ""),
      fixes: (.fixes // []),
      questions: (.questions // [])
    }' 2>/dev/null)"; then
    CONFIDENCE="$(printf '%s' "$PARSED" | jq -r '.confidence')"
    TITLE="$(printf '%s' "$PARSED" | jq -r '.title')"
    FIXES_JSON="$(printf '%s' "$PARSED" | jq -c '.fixes')"
    QUESTIONS_JSON="$(printf '%s' "$PARSED" | jq -c '.questions')"
  else
    echo "Structured audit output was not valid JSON; defaulting to HOLD."
  fi
else
  echo "No structured audit output from Claude; defaulting to HOLD."
fi

case "$CONFIDENCE" in
  CLEAR|HOLD|NO_CHANGES) ;;
  *)
    echo "Unknown confidence '$CONFIDENCE'; defaulting to HOLD."
    CONFIDENCE="HOLD"
    ;;
esac

# Force HOLD if questions array is non-empty
QUESTION_COUNT="$(printf '%s' "$QUESTIONS_JSON" | jq 'length')"
if [ "$QUESTION_COUNT" -gt 0 ]; then
  CONFIDENCE="HOLD"
fi

# Default title if model omitted it
if [ -z "$TITLE" ]; then
  TITLE="docs: update docs to reflect ${SOURCE_REPO}@${SOURCE_LABEL}"
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Run git against GitHub with PUSH_TOKEN when set (an empty extraheader first
# drops any credential actions/checkout persisted).
git_remote() {
  if [ -n "$PUSH_TOKEN" ]; then
    local auth
    auth="$(printf 'x-access-token:%s' "$PUSH_TOKEN" | base64 | tr -d '\n')"
    git -c "http.https://github.com/.extraheader=" \
      -c "http.https://github.com/.extraheader=AUTHORIZATION: basic ${auth}" "$@"
  else
    git "$@"
  fi
}

# Doc edits are anything but the pins file, which prepare-docs-branch.sh bumps
# for every release whether or not a page changes.
HAS_DOC_CHANGES=false
if [ -n "$(git status --porcelain --untracked-files=all -- . ":(exclude)${PINS_FILE}")" ]; then
  HAS_DOC_CHANGES=true
fi

if [ "$HAS_DOC_CHANGES" = "false" ]; then
  git checkout -- "$PINS_FILE" 2>/dev/null || true
  if [ "$CONFIDENCE" != "HOLD" ]; then
    echo "No doc changes to land (confidence=${CONFIDENCE}); exiting."
    exit 0
  fi
  echo "HOLD with no file edits; landing an empty commit so the questions are visible."
elif [ "$CONFIDENCE" = "NO_CHANGES" ]; then
  echo "Model reported NO_CHANGES but the tree is dirty; failing closed to HOLD."
  CONFIDENCE="HOLD"
fi

# prepare-docs-branch.sh leaves the rolling branch checked out. Without it, the
# edits move onto a branch of that name at the current commit.
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  git checkout -B "$BRANCH"
fi

# Test the tree that will be pushed.
TESTS_FAILED=false
FAILED_TESTS=""
if [ "$HAS_DOC_CHANGES" = "true" ]; then
  TEST_LOG="$(mktemp)"
  echo "Running ${TEST_CMD}..."
  if ! bash -c "$TEST_CMD" >"$TEST_LOG" 2>&1; then
    TESTS_FAILED=true
    CONFIDENCE="HOLD"
    FAILED_TESTS="$(grep -E '^[[:space:]]*(✖|not ok )' "$TEST_LOG" | sed -E 's/^[[:space:]]*(✖|not ok [0-9]+ -)[[:space:]]*//; s/ \([0-9.]+ms\)$//' | tr '`' "'" | sort -u | head -20 || true)"
    echo "Docs tests failed; holding the PR as a draft."
    tail -n 60 "$TEST_LOG"
  fi
  rm -f "$TEST_LOG"
fi

git add -A -- .
if git diff --cached --quiet; then
  git commit --allow-empty -m "$TITLE"
else
  git commit -m "$TITLE"
fi

# Never rewrite an open rolling PR; a closed or merged one restarts from main.
EXISTING_PR="$(gh pr list --head "$BRANCH" --base "$BASE_BRANCH" --state open --json url --jq '.[0].url // ""')"
REMOTE_SHA="$(git_remote ls-remote origin "refs/heads/${BRANCH}" | cut -f1)"
if [ -n "$REMOTE_SHA" ] && [ -n "$EXISTING_PR" ] && ! git merge-base --is-ancestor "$REMOTE_SHA" HEAD 2>/dev/null; then
  echo "::error::${BRANCH} has an open PR whose head is not in this branch; refusing to rewrite it."
  exit 1
fi
git_remote push --force-with-lease="refs/heads/${BRANCH}:${REMOTE_SHA}" origin "HEAD:refs/heads/${BRANCH}"

# Build PR body
FIX_COUNT="$(printf '%s' "$FIXES_JSON" | jq 'length')"
BODY_FILE="$(mktemp)"
{
  echo "## Summary"
  echo
  if [ -n "$RELEASE_TAG" ]; then
    echo "Automated docs audit for [\`${SOURCE_REPO}\`](https://github.com/${SOURCE_REPO}) release [\`${RELEASE_TAG}\`](https://github.com/${SOURCE_REPO}/releases/tag/${RELEASE_TAG}) (\`${SHORT_SHA}\`)."
  else
    echo "Automated docs audit for [\`${SOURCE_REPO}\`](https://github.com/${SOURCE_REPO}) @ [\`${SHORT_SHA}\`](https://github.com/${SOURCE_REPO}/commit/${SOURCE_SHA})."
  fi
  echo
  echo "This is the rolling docs PR for \`${REPO_SLUG}\`: each release adds commits here until it merges."
  echo
  echo "## Fixes"
  echo
  echo "| Claim | Current state | Fix | Source |"
  echo "| --- | --- | --- | --- |"
  if [ "$FIX_COUNT" -gt 0 ]; then
    printf '%s' "$FIXES_JSON" | jq -r '.[] | "| \(.claim // "-") | \(.current // "-") | \(.fix // "-") | `\(.source_sha // "'"${SHORT_SHA}"'")` |"'
  else
    echo "| (see diff) | — | Doc updates in this PR | \`${SHORT_SHA}\` |"
  fi
  echo
  if [ "$TESTS_FAILED" = "true" ]; then
    echo "## Failing tests"
    echo
    echo "\`${TEST_CMD}\` failed on this branch, so the PR is held as a draft. Full output: ${RUN_URL}"
    echo
    if [ -n "$FAILED_TESTS" ]; then
      printf '%s\n' "$FAILED_TESTS" | sed 's/^/- /'
      echo
    fi
  fi
  if [ "$QUESTION_COUNT" -gt 0 ]; then
    echo "## Open questions"
    echo
    printf '%s' "$QUESTIONS_JSON" | jq -r '.[] | "- \(.)"'
    echo
  fi
  if [ "$CONFIDENCE" = "CLEAR" ]; then
    echo "<!-- DOCS-AUDIT: CLEAR -->"
  else
    echo "<!-- DOCS-AUDIT: HOLD -->"
  fi
} > "$BODY_FILE"

# Create or update PR
if [ -n "$EXISTING_PR" ]; then
  gh pr edit "$EXISTING_PR" --title "$TITLE" --body-file "$BODY_FILE"
  PR_URL="$EXISTING_PR"
  echo "Updated existing PR: $PR_URL"
else
  if [ "$CONFIDENCE" = "HOLD" ]; then
    PR_URL="$(gh pr create --base "$BASE_BRANCH" --head "$BRANCH" --title "$TITLE" --body-file "$BODY_FILE" --draft)"
  else
    PR_URL="$(gh pr create --base "$BASE_BRANCH" --head "$BRANCH" --title "$TITLE" --body-file "$BODY_FILE")"
  fi
  echo "Created PR: $PR_URL"
fi

# CLEAR audits are marked ready; HOLD audits must stay (or return to) draft.
IS_DRAFT="$(gh pr view "$PR_URL" --json isDraft --jq '.isDraft')"
if [ "$CONFIDENCE" = "CLEAR" ]; then
  if [ "$IS_DRAFT" = "true" ]; then
    gh pr ready "$PR_URL"
    echo "Marked PR ready for review."
  fi
elif [ "$CONFIDENCE" = "HOLD" ] && [ "$IS_DRAFT" != "true" ]; then
  gh pr ready --undo "$PR_URL"
  echo "Converted held PR back to draft."
fi

# Summary comment + maintainer ping
COMMENT_FILE="$(mktemp)"
{
  echo "${MAINTAINER} docs audit **${CONFIDENCE}** for \`${SOURCE_REPO}@${SOURCE_LABEL}\`."
  echo
  if [ "$CONFIDENCE" = "CLEAR" ]; then
    echo "Verified edits will auto-merge once CI passes."
  elif [ "$TESTS_FAILED" = "true" ]; then
    echo "This PR is held because \`${TEST_CMD}\` failed — see **Failing tests** above."
  else
    echo "This PR is held for your input — see **Open questions** above."
  fi
  echo
  echo "**Changes:** ${FIX_COUNT} documented fix(es)."
  if [ "$FIX_COUNT" -gt 0 ]; then
    printf '%s' "$FIXES_JSON" | jq -r '.[] | "- \(.fix // .claim // "update")"'
  fi
} > "$COMMENT_FILE"

gh pr comment "$PR_URL" --body-file "$COMMENT_FILE"

rm -f "$BODY_FILE" "$COMMENT_FILE"
echo "Done. PR: $PR_URL (confidence=${CONFIDENCE})"
