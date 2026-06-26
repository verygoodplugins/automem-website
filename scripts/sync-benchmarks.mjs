#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_SOURCE = "../automem";
const DEFAULT_OUT_FILE = "src/data/benchmarks.json";
const BUNDLE_PATH = "benchmarks/publication/2026-05-arxiv";
const MANIFEST_PATH = `${BUNDLE_PATH}/artifact-manifest.json`;
const SOURCE_REPO = "verygoodplugins/automem";

// Top-level keys in the generated data file that are hand-curated rather than
// derived from the source manifest. syncBenchmarks() carries these forward so a
// re-sync never silently drops them (e.g. the neutral AMB submission dataset
// the benchmarks page renders).
const PRESERVED_KEYS = ["ambSubmission"];

const STATUS_LABELS = {
  canonical: "Canonical",
  representative_canary: "Representative canary",
  fresh_verification: "Fresh verification",
  exploratory: "Exploratory",
  external_reported: "External reported",
  not_yet_run: "Not yet run",
};

const CANARY_STATUSES = new Set(["representative_canary", "fresh_verification"]);
const SCORE_PATTERN = /^\d+(?:\.\d+)?% \(\d+\/\d+\)(?:, avg \d+(?:\.\d+)?)?$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function statusLabel(status) {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function normalizeArtifact(artifact) {
  if (!artifact) return null;

  return {
    path: artifact.path,
    gitignored: Boolean(artifact.gitignored),
    sha256: artifact.sha256,
  };
}

function normalizeBreakdown(breakdown) {
  if (!breakdown) return null;

  return Object.entries(breakdown).map(([key, value]) => ({
    key,
    label: key.replaceAll("_", " ").replaceAll("-", " "),
    value,
  }));
}

function normalizeClaim(claim) {
  return {
    status: claim.status,
    statusLabel: statusLabel(claim.status),
    benchmark: claim.benchmark,
    scope: claim.scope,
    questions: claim.questions ?? null,
    score: claim.score ?? null,
    retrieval: claim.retrieval ?? null,
    answerModel: claim.answer_model ?? null,
    judgeModel: claim.judge_model ?? null,
    source: claim.source ?? null,
    artifact: normalizeArtifact(claim.generated_artifact),
    hypothesesArtifact: normalizeArtifact(claim.hypotheses_artifact),
    publishable: claim.publishable ?? null,
    memoryIngestFailures: claim.memory_ingest_failures ?? null,
    judgeErrors: claim.judge_errors ?? null,
    judgeSkips: claim.judge_skips ?? null,
    judgeCalls: claim.judge_calls ?? null,
    estimatedCostUsd: claim.estimated_cost_usd ?? null,
    elapsedSeconds: claim.elapsed_seconds ?? null,
    categoryBreakdown: normalizeBreakdown(claim.category_breakdown),
    failureSplit: claim.failure_split ?? null,
  };
}

function assertClaimShape(claim, context) {
  if (!claim.benchmark || !claim.scope || !claim.status) {
    throw new Error(`${context}: claim is missing benchmark, scope, or status`);
  }

  if (claim.score && !SCORE_PATTERN.test(claim.score)) {
    throw new Error(`${context}: malformed score "${claim.score}"`);
  }

  const artifact = claim.generated_artifact;
  if (artifact?.sha256 && !SHA256_PATTERN.test(artifact.sha256)) {
    throw new Error(`${context}: malformed artifact sha256`);
  }
}

function validateCanonicalClaims(claims) {
  const canonical = claims.filter((claim) => claim.status === "canonical");
  const longMemEvalFull = canonical.find(
    (claim) => claim.benchmark === "LongMemEval" && claim.scope === "full",
  );
  const locomoFull = canonical.find(
    (claim) => claim.benchmark === "LoCoMo" && claim.scope === "full",
  );

  if (!longMemEvalFull) {
    throw new Error("Missing canonical LongMemEval full claim");
  }

  if (!locomoFull) {
    throw new Error("Missing canonical LoCoMo full claim");
  }

  for (const claim of canonical) {
    assertClaimShape(claim, `${claim.benchmark} ${claim.scope}`);
  }

  if (longMemEvalFull.publishable !== true) {
    throw new Error("Canonical LongMemEval full claim must have publishable=true");
  }
}

export function buildBenchmarkData(manifest, options = {}) {
  const claims = manifest.claims ?? [];
  validateCanonicalClaims(claims);

  const normalizedClaims = claims.map(normalizeClaim);

  return {
    generatedAt: manifest.generated_at_utc,
    sourceRepo: options.sourceRepo ?? SOURCE_REPO,
    sourceSha: manifest.automem_git_sha_at_creation,
    bundle: manifest.bundle,
    publicationBundlePath: BUNDLE_PATH,
    officialClaimSource: manifest.official_claim_source,
    judgePolicy: manifest.judge_policy,
    canonicalClaims: normalizedClaims.filter((claim) => claim.status === "canonical"),
    canaryClaims: normalizedClaims.filter((claim) => CANARY_STATUSES.has(claim.status)),
    supplementalClaims: normalizedClaims.filter(
      (claim) => claim.status !== "canonical" && !CANARY_STATUSES.has(claim.status),
    ),
    notYetRun: manifest.not_yet_run ?? [],
    links: {
      experimentLog: `https://github.com/${SOURCE_REPO}/blob/main/${manifest.official_claim_source}`,
      judgePolicy: `https://github.com/${SOURCE_REPO}/blob/main/${manifest.judge_policy}`,
      publicationBundle: `https://github.com/${SOURCE_REPO}/tree/main/${BUNDLE_PATH}`,
    },
  };
}

async function readPreservedFields(outFile) {
  try {
    const existing = JSON.parse(await readFile(outFile, "utf8"));
    const preserved = {};
    for (const key of PRESERVED_KEYS) {
      if (existing[key] !== undefined) preserved[key] = existing[key];
    }
    return preserved;
  } catch {
    // No existing file (or unparseable) — nothing to preserve.
    return {};
  }
}

function mergePreserved(data, preserved) {
  if (Object.keys(preserved).length === 0) return data;

  // Re-insert preserved keys right after the manifest header (judgePolicy) so
  // the file stays diff-stable with the hand-authored layout instead of
  // appending them at the end on every re-sync.
  const out = {};
  let inserted = false;
  for (const [key, value] of Object.entries(data)) {
    out[key] = value;
    if (key === "judgePolicy") {
      Object.assign(out, preserved);
      inserted = true;
    }
  }
  if (!inserted) Object.assign(out, preserved);
  return out;
}

export async function syncBenchmarks({ source = DEFAULT_SOURCE, outFile = DEFAULT_OUT_FILE } = {}) {
  const manifestFile = resolve(source, MANIFEST_PATH);
  const raw = await readFile(manifestFile, "utf8");
  const manifest = JSON.parse(raw);
  const data = buildBenchmarkData(manifest);
  const resolvedOutFile = resolve(outFile);

  // The neutral AMB submission block is hand-curated and not derived from the
  // source manifest. Carry preserved keys forward so a `sync-benchmarks` run
  // never silently drops the AMB dataset the site renders.
  const preserved = await readPreservedFields(resolvedOutFile);
  const merged = mergePreserved(data, preserved);

  await mkdir(dirname(resolvedOutFile), { recursive: true });
  await writeFile(resolvedOutFile, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  return merged;
}

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    outFile: DEFAULT_OUT_FILE,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") {
      args.source = argv[++i];
    } else if (arg === "--out" || arg === "--out-file") {
      args.outFile = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = await syncBenchmarks(args);
  console.log(
    `Synced ${data.canonicalClaims.length} canonical benchmark claims from ${args.source}`,
  );
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
