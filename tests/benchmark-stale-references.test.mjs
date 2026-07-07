import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const STALE_BENCHMARK_PATTERN = new RegExp(
  [
    "2026-05-" + "ar" + "xiv",
    "automem-" + "ar" + "xiv",
    "benchmarks/" + "publication",
    "publication" + " bundle",
    "publication" + "Bundle",
    "ar" + "xiv",
    "research " + "preprint",
  ].join("|"),
  "i",
);

const FILES_WITH_PUBLIC_SITE_CONTENT = [
  "package.json",
  "scripts/file-doc-map.json",
  "src/content/blog/11-docs-portal-launch/index.md",
  "src/content/blog/12-benchmarking-honesty/index.md",
  "src/content/docs/docs/core-concepts/consolidation.md",
  "src/content/docs/docs/core-concepts/hybrid-search.md",
  "src/content/docs/docs/overview.md",
  "src/content/docs/docs/research.md",
  "src/data/benchmarks.json",
  "src/lib/benchmarks.mjs",
  "src/pages/benchmarks.astro",
];

test("public benchmark surface has no removed benchmark bundle references", async () => {
  const offenders = [];

  for (const file of FILES_WITH_PUBLIC_SITE_CONTENT) {
    const contents = await readFile(file, "utf8");
    if (STALE_BENCHMARK_PATTERN.test(contents)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, []);
});
