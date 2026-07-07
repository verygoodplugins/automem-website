import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

const STALE_BENCHMARK_PATTERN = new RegExp(
  [
    "2026-05-" + "ar" + "xiv",
    "automem-" + "ar" + "xiv",
    "benchmarks/" + "publication",
    "publication" + " bundle",
    "publication" + "Bundle",
    "research " + "preprint",
  ].join("|"),
  "i",
);

const SOURCE_CONTROLLED_BENCHMARK_SURFACES = [
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

const CMS_BLOG_SLUGS = ["benchmarking-honesty", "docs-portal-launch"];
const LOCAL_EMDASH_DB = "data/emdash.db";

test("public benchmark surface has no removed benchmark bundle references", async () => {
  const offenders = [];

  for (const file of SOURCE_CONTROLLED_BENCHMARK_SURFACES) {
    const contents = await readFile(file, "utf8");
    if (STALE_BENCHMARK_PATTERN.test(contents)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, []);
});

test("local CMS blog posts have no removed benchmark bundle references", async (t) => {
  try {
    await stat(LOCAL_EMDASH_DB);
  } catch (error) {
    if (error?.code === "ENOENT") {
      t.skip(`${LOCAL_EMDASH_DB} is not present`);
      return;
    }

    throw error;
  }

  const { default: Database } = await import("better-sqlite3");
  const db = new Database(LOCAL_EMDASH_DB, { readonly: true, fileMustExist: true });

  try {
    const placeholders = CMS_BLOG_SLUGS.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `select slug, title, excerpt, content
         from ec_posts
         where deleted_at is null
           and slug in (${placeholders})`,
      )
      .all(...CMS_BLOG_SLUGS);
    const slugs = rows.map((row) => row.slug).sort();
    const offenders = rows
      .filter((row) => STALE_BENCHMARK_PATTERN.test(JSON.stringify(row)))
      .map((row) => row.slug)
      .sort();

    assert.deepEqual(slugs, [...CMS_BLOG_SLUGS].sort());
    assert.deepEqual(offenders, []);
  } finally {
    db.close();
  }
});
