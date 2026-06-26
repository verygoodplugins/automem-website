import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { buildBenchmarkData, syncBenchmarks } from "../scripts/sync-benchmarks.mjs";

const manifest = {
  bundle: "automem-arxiv-2026-05",
  generated_at_utc: "2026-05-18T06:20:58Z",
  automem_git_sha_at_creation: "a742602f5d6ad2dea5a4d3c387d5b49d610afe2c",
  official_claim_source: "benchmarks/EXPERIMENT_LOG.md",
  judge_policy: "docs/BENCHMARK_JUDGE_POLICY.md",
  claims: [
    {
      status: "canonical",
      benchmark: "LongMemEval",
      scope: "full",
      questions: 500,
      score: "87.00% (435/500)",
      retrieval: "recall@5 97.00% (485/500)",
      answer_model: "gpt-5-mini",
      judge_model: "gpt-5.4-mini-2026-03-17",
      source: "benchmarks/EXPERIMENT_LOG.md",
      generated_artifact: {
        path: "benchmarks/results/longmemeval-full-publication-20260518.json",
        gitignored: true,
        sha256: "a".repeat(64),
      },
      memory_ingest_failures: 0,
      judge_errors: 0,
      publishable: true,
      category_breakdown: {
        "knowledge_update": "88.46% (69/78)",
      },
    },
    {
      status: "representative_canary",
      benchmark: "LongMemEval",
      scope: "mini stratified",
      questions: 30,
      score: "70.00% (21/30)",
      retrieval: "recall@5 96.67% (29/30)",
      generated_artifact: {
        path: "benchmarks/results/longmemeval-mini-publication-20260517.json",
        gitignored: true,
        sha256: "b".repeat(64),
      },
    },
    {
      status: "canonical",
      benchmark: "LoCoMo",
      scope: "full",
      questions: 1986,
      score: "84.74% (1683/1986)",
      retrieval: null,
      judge_model: "gpt-5.4-mini-2026-03-17",
      source: "benchmarks/EXPERIMENT_LOG.md",
      generated_artifact: {
        path: "benchmarks/results/locomo_baseline_20260517_193934.json",
        gitignored: true,
        sha256: "c".repeat(64),
      },
      judge_calls: 444,
      judge_errors: 0,
      judge_skips: 0,
      estimated_cost_usd: 0.790877,
    },
    {
      status: "exploratory",
      benchmark: "Writ",
      scope: "drift category",
      questions: 5,
      score: "100.0% recall_accuracy",
      source: "../automem-evals/docs/writ_integration.md",
    },
  ],
  not_yet_run: ["BEAM official 1M/10M"],
};

test("buildBenchmarkData separates canonical, supplemental, and canary claims", () => {
  const data = buildBenchmarkData(manifest, { sourceRepo: "verygoodplugins/automem" });

  assert.equal(data.generatedAt, "2026-05-18T06:20:58Z");
  assert.equal(data.sourceRepo, "verygoodplugins/automem");
  assert.equal(data.sourceSha, "a742602f5d6ad2dea5a4d3c387d5b49d610afe2c");
  assert.equal(data.canonicalClaims.length, 2);
  assert.equal(data.canaryClaims.length, 1);
  assert.equal(data.supplementalClaims.length, 1);
  assert.equal(data.canonicalClaims[0].publishable, true);
  assert.deepEqual(data.notYetRun, ["BEAM official 1M/10M"]);
});

test("syncBenchmarks writes stable generated data from a source checkout", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "automem-benchmarks-"));
  const source = join(tempRoot, "automem");
  const outFile = join(tempRoot, "benchmarks.json");
  const bundleDir = join(source, "benchmarks/publication/2026-05-arxiv");

  await import("node:fs/promises").then(({ mkdir }) => mkdir(bundleDir, { recursive: true }));
  await writeFile(join(bundleDir, "artifact-manifest.json"), JSON.stringify(manifest), "utf8");

  try {
    await syncBenchmarks({ source, outFile });
    const generated = JSON.parse(await readFile(outFile, "utf8"));

    assert.equal(generated.canonicalClaims.length, 2);
    assert.equal(generated.canaryClaims[0].statusLabel, "Representative canary");
    assert.equal(generated.supplementalClaims[0].statusLabel, "Exploratory");
    assert.match(generated.canonicalClaims[0].artifact.sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("syncBenchmarks preserves hand-curated ambSubmission across a re-sync", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "automem-benchmarks-"));
  const source = join(tempRoot, "automem");
  const outFile = join(tempRoot, "benchmarks.json");
  const bundleDir = join(source, "benchmarks/publication/2026-05-arxiv");

  await import("node:fs/promises").then(({ mkdir }) => mkdir(bundleDir, { recursive: true }));
  await writeFile(join(bundleDir, "artifact-manifest.json"), JSON.stringify(manifest), "utf8");

  // Pre-seed the out file with a hand-curated AMB block (as ships in src/data).
  await writeFile(
    outFile,
    JSON.stringify({
      generatedAt: "old",
      ambSubmission: { status: "submitted_pr_under_review", version: "AMB v1" },
    }),
    "utf8",
  );

  try {
    const data = await syncBenchmarks({ source, outFile });

    // Manifest-derived fields are regenerated...
    assert.equal(data.generatedAt, "2026-05-18T06:20:58Z");
    assert.equal(data.canonicalClaims.length, 2);
    // ...and the hand-curated AMB block survives the sync.
    assert.equal(data.ambSubmission.version, "AMB v1");

    const generated = JSON.parse(await readFile(outFile, "utf8"));
    assert.equal(generated.ambSubmission.status, "submitted_pr_under_review");
    // Preserved key is re-inserted right after the manifest header.
    const keys = Object.keys(generated);
    assert.equal(keys[keys.indexOf("judgePolicy") + 1], "ambSubmission");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildBenchmarkData rejects unpublishable canonical LongMemEval claims", () => {
  const badManifest = structuredClone(manifest);
  badManifest.claims[0].publishable = false;

  assert.throws(
    () => buildBenchmarkData(badManifest),
    /Canonical LongMemEval full claim must have publishable=true/,
  );
});
