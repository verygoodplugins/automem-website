#!/usr/bin/env bash
# Land docs audit changes: commit, push, open/update PR, notify maintainer.
# Called from .github/workflows/docs-update.yml after Claude Code finishes.
set -euo pipefail

SOURCE_REPO="${SOURCE_REPO:?SOURCE_REPO required}"
SOURCE_SHA="${SOURCE_SHA:?SOURCE_SHA required}"
STRUCTURED_OUTPUT="${STRUCTURED_OUTPUT:-}"
BASE_BRANCH="${BASE_BRANCH:-main}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}"
MAINTAINER="${DOCS_MAINTAINER:-@jgarturo}"

# Derive branch slug from source repo name (e.g. verygoodplugins/automem -> automem)
REPO_SLUG="${SOURCE_REPO##*/}"
SHORT_SHA="${SOURCE_SHA:0:7}"
DEFAULT_BRANCH="docs/audit-${REPO_SLUG}-${SHORT_SHA}"
BRANCH="${CLAUDE_BRANCH:-$DEFAULT_BRANCH}"

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
  TITLE="docs: update docs to reflect ${SOURCE_REPO}@${SHORT_SHA}"
fi

# Check for local changes or an existing audit branch
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

HAS_CHANGES=false
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  HAS_CHANGES=true
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == docs/audit-* ]]; then
  BRANCH="$CURRENT_BRANCH"
fi

# Remote branch exists?
REMOTE_BRANCH_EXISTS=false
if git ls-remote --exit-code origin "refs/heads/${BRANCH}" >/dev/null 2>&1; then
  REMOTE_BRANCH_EXISTS=true
fi

if [ "$CONFIDENCE" = "NO_CHANGES" ] && [ "$HAS_CHANGES" = "true" ]; then
  echo "Model reported NO_CHANGES but the tree is dirty; failing closed to HOLD."
  CONFIDENCE="HOLD"
fi

if [ "$CONFIDENCE" = "NO_CHANGES" ] && [ "$HAS_CHANGES" = "false" ]; then
  echo "No doc changes needed; exiting."
  exit 0
fi

# Keep a checkoutable origin/$BRANCH on Actions runners (fetch of a branch
# name alone updates FETCH_HEAD, not the remote-tracking ref).
fetch_audit_branch() {
  git fetch origin "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
}

stash_landing_worktree() {
  git stash push --include-untracked -m "docs-audit-landing" -- . ':!.source-repo' ':!.source-repo/**'
}

if [ "$HAS_CHANGES" = "false" ] && [ "$REMOTE_BRANCH_EXISTS" = "false" ]; then
  if [ "$CONFIDENCE" = "HOLD" ]; then
    echo "HOLD with no file edits; opening an empty-commit draft so questions are visible."
    git checkout -B "$BRANCH"
    git commit --allow-empty -m "$TITLE"
    git push -u origin "$BRANCH"
  else
    echo "No local changes and no remote branch; nothing to land."
    exit 0
  fi
fi

# Commit and push if there are local changes
if [ "$HAS_CHANGES" = "true" ]; then
  if [ "$REMOTE_BRANCH_EXISTS" = "true" ]; then
    fetch_audit_branch
    if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
      stash_landing_worktree
      git checkout -B "$BRANCH" "origin/$BRANCH"
      git stash pop
    else
      stash_landing_worktree
      git pull --rebase origin "$BRANCH"
      git stash pop
    fi
  elif [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    git checkout -B "$BRANCH"
  fi
  git add -A -- . ':!.source-repo' ':!.source-repo/**'
  if git diff --cached --quiet; then
    echo "Existing audit branch already has these changes; skipping commit."
  else
    git commit -m "$TITLE"
  fi
  git push -u origin "$BRANCH"
elif [ "$REMOTE_BRANCH_EXISTS" = "true" ]; then
  fetch_audit_branch
  git checkout -B "$BRANCH" "origin/$BRANCH"
fi

# Build PR body
FIX_COUNT="$(printf '%s' "$FIXES_JSON" | jq 'length')"
BODY_FILE="$(mktemp)"
{
  echo "## Summary"
  echo
  echo "Automated docs audit for [\`${SOURCE_REPO}\`](https://github.com/${SOURCE_REPO}) @ [\`${SOURCE_SHA:0:7}\`](https://github.com/${SOURCE_REPO}/commit/${SOURCE_SHA})."
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
EXISTING_PR="$(gh pr list --head "$BRANCH" --base "$BASE_BRANCH" --json number,url --jq '.[0].url // ""')"
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
  echo "${MAINTAINER} docs audit **${CONFIDENCE}** for \`${SOURCE_REPO}@${SHORT_SHA}\`."
  echo
  if [ "$CONFIDENCE" = "CLEAR" ]; then
    echo "Verified edits will auto-merge once CI passes."
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
