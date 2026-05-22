export const benchmarkMeaningCards = [
  {
    title: "LongMemEval",
    summary:
      "Tests long-range episodic memory: can the system recover facts and updates from a large personal-memory history and answer with the right evidence?",
    detail: "Current full run: 500 questions with a separate answer model and judge.",
  },
  {
    title: "LoCoMo",
    summary:
      "Tests conversational memory: multi-session QA over long dialogues, including temporal, single-hop, and multi-hop questions.",
    detail: "Current full run: 10 conversations and 1,986 judged questions.",
  },
  {
    title: "Recall@5",
    summary:
      "Separates retrieval from answer synthesis: did the five returned memories include the evidence needed to answer correctly?",
    detail: "LongMemEval full reached recall@5 97.00%, so many remaining misses are synthesis or representation work.",
  },
];

export const benchmarkComparisonRows = [
  {
    label: "AutoMem canonical runs",
    status: "official rerun",
    note: "Generated from the main repository publication bundle with publishable artifacts, pinned judges, and reproduction links.",
  },
  {
    label: "Mem0, Zep/Graphiti, Letta, A-MEM",
    status: "external reported",
    note: "Useful research and market context when cited from their own artifacts, but not AutoMem-controlled reruns.",
  },
  {
    label: "External memory systems",
    status: "context only",
    note: "Benchmarks are not apples-to-apples unless dataset version, extraction policy, answer model, judge, context budget, and scale are aligned.",
  },
  {
    label: "BEAM, LongMemEval-V2, Memora/FAMA",
    status: "not yet canonical",
    note: "Tracked as future comparison surfaces until the main repo promotes AutoMem-controlled runs.",
  },
];

export const benchmarkTimeline = [
  {
    date: "Feb 2026",
    title: "LongMemEval harness",
    summary: "Added the ICLR 2025 LongMemEval benchmark harness and Recall Quality Lab for data-driven recall work.",
  },
  {
    date: "Mar 2026",
    title: "LoCoMo and relationship engine",
    summary: "Added LoCoMo judge coverage, optimized the relationship taxonomy, and fixed benchmark evaluator bugs.",
  },
  {
    date: "Apr 2026",
    title: "Recall quality and judge reliability",
    summary: "Improved keyword-heavy recall and hardened LoCoMo judge runs against flaky rate limits.",
  },
  {
    date: "May 2026",
    title: "Publication bundle",
    summary: "Verified full LongMemEval and LoCoMo runs in the publication bundle and promoted only publishable claims.",
  },
];

export function primaryPercent(score) {
  if (!score) return "n/a";
  const match = String(score).match(/\d+(?:\.\d+)?%/);
  return match?.[0] ?? "n/a";
}

export function formatGeneratedDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function statusTone(status) {
  if (status === "canonical") return "accent";
  if (status === "representative_canary" || status === "fresh_verification") return "secondary";
  return "muted";
}

export function sourceLabel(source) {
  if (!source) return "Source";
  if (source.includes("EXPERIMENT_LOG.md")) return "Experiment log";
  if (source.includes("fresh-verification.md")) return "Fresh verification notes";
  if (source.includes("automem-evals")) return "automem-evals";
  return source.split(";")[0];
}

export function artifactUrl(sourceRepo, path) {
  return `https://github.com/${sourceRepo}/blob/main/${path}`;
}
