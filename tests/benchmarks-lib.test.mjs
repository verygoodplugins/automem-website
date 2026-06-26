import assert from "node:assert/strict";
import { test } from "node:test";

import {
  benchmarkComparisonRows,
  benchmarkMeaningCards,
  benchmarkTimeline,
  publishedBenchmarkRows,
  artifactUrl,
  formatGeneratedDate,
  primaryPercent,
  sourceLabel,
  statusTone,
} from "../src/lib/benchmarks.mjs";

test("primaryPercent extracts the leading percentage from a benchmark score", () => {
  assert.equal(primaryPercent("87.00% (435/500)"), "87.00%");
  assert.equal(primaryPercent("76.25% (305/400), avg 0.677"), "76.25%");
  assert.equal(primaryPercent(null), "n/a");
});

test("formatGeneratedDate renders UTC dates without local timezone drift", () => {
  assert.equal(formatGeneratedDate("2026-05-18T06:20:58Z"), "May 18, 2026");
});

test("statusTone maps benchmark status to stable design variants", () => {
  assert.equal(statusTone("canonical"), "accent");
  assert.equal(statusTone("exploratory"), "muted");
});

test("sourceLabel and artifactUrl produce human-facing source references", () => {
  assert.equal(sourceLabel("benchmarks/EXPERIMENT_LOG.md; fresh run"), "Experiment log");
  assert.equal(
    artifactUrl("verygoodplugins/automem", "benchmarks/EXPERIMENT_LOG.md"),
    "https://github.com/verygoodplugins/automem/blob/main/benchmarks/EXPERIMENT_LOG.md",
  );
});

test("benchmark context keeps interpretation and comparison guardrails explicit", () => {
  assert.deepEqual(
    benchmarkMeaningCards.map((card) => card.title),
    ["LongMemEval", "LoCoMo", "Recall@5"],
  );
  assert.equal(
    benchmarkComparisonRows.find((row) => row.label === "AutoMem canonical runs")?.status,
    "official rerun",
  );
  assert.equal(
    benchmarkComparisonRows.find((row) => row.label === "Mem0, Zep/Graphiti, Letta, A-MEM")?.status,
    "external reported",
  );
  assert.ok(
    benchmarkComparisonRows
      .find((row) => row.label === "External memory systems")
      ?.note.includes("not apples-to-apples"),
  );
});

test("benchmark timeline summarizes the release path without overemphasizing publication", () => {
  assert.equal(benchmarkTimeline.at(0)?.date, "Feb 2026");
  assert.equal(benchmarkTimeline.at(-1)?.date, "Jun 2026");
  assert.doesNotMatch(benchmarkTimeline.at(-1)?.summary ?? "", /publication bundle/i);
});

test("published benchmark rows include relevant external systems with caveats", () => {
  assert.deepEqual(
    publishedBenchmarkRows.map((row) => row.system),
    [
      "AutoMem",
      "Mem0 Cloud",
      "Zep / Graphiti",
      "Supermemory",
      "Hindsight",
      "Mastra Observational Memory",
      "Honcho",
      "Letta / MemGPT",
      "MemMachine",
      "HydraDB",
      "Exabase M-1",
    ],
  );
  assert.equal(
    publishedBenchmarkRows.find((row) => row.system === "Mem0 Cloud")?.longMemEval,
    "94.4%",
  );
  assert.equal(
    publishedBenchmarkRows.find((row) => row.system === "Zep / Graphiti")?.longMemEval,
    "71.2% (gpt-4o)",
  );
  assert.equal(
    publishedBenchmarkRows.find((row) => row.system === "Zep / Graphiti")?.locomo,
    "not reported",
  );
  assert.equal(
    publishedBenchmarkRows.find((row) => row.system === "Hindsight")?.locomo,
    "up to 89.61%",
  );
  assert.equal(
    publishedBenchmarkRows.find((row) => row.system === "Exabase M-1")?.longMemEval,
    "96.4% top-50",
  );
  assert.equal(
    publishedBenchmarkRows.find((row) => row.system === "Letta / MemGPT")?.status,
    "no official standardized score found",
  );
  assert.ok(publishedBenchmarkRows.every((row) => row.sourceUrl.startsWith("https://")));
});
