// Source commits the docs may link to, read from scripts/docs-source-pins.json.
// Docs follow published releases: the docs-update workflow records each release
// there before it edits pages, so tests never hardcode a source SHA.
import { readFileSync } from 'node:fs';

const pins = JSON.parse(
  readFileSync(new URL('../../scripts/docs-source-pins.json', import.meta.url), 'utf8'),
);

function entry(repo) {
  const value = pins[`verygoodplugins/${repo}`];
  if (!value) throw new Error(`No source pins recorded for ${repo}`);
  return value;
}

// The newest published release recorded for a source repo.
export function currentRelease(repo) {
  return entry(repo).releases[0];
}

// Every SHA a page may pin for this repo: published releases plus noted legacy pins.
export function pinnedShas(repo) {
  const { releases, legacy = [] } = entry(repo);
  return [...releases, ...legacy].map(({ sha }) => sha);
}

// Regex source matching any pinned SHA, for interpolation into RegExp patterns.
export function pinnedShaPattern(repo) {
  return `(?:${pinnedShas(repo).join('|')})`;
}

export function isPinnedSha(repo, sha) {
  return pinnedShas(repo).includes(sha);
}

export { pins };
