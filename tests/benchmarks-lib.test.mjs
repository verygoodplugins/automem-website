import assert from "node:assert/strict";
import { test } from "node:test";

import {
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
