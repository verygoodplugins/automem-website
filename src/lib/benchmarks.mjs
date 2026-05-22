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
    note: "Generated from the main repository benchmark artifacts with publishable flags, pinned judges, and reproduction links.",
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
    title: "Full-run verification",
    summary: "Verified full LongMemEval and LoCoMo runs and promoted only publishable claims.",
  },
];

export const publishedBenchmarkRows = [
  {
    system: "AutoMem",
    locomo: "84.74%",
    longMemEval: "87.00%",
    other: "recall@5 97.00%",
    status: "official AutoMem rerun",
    note: "Same canonical results shown above; included here so readers can scan against external reported rows.",
    sourceLabel: "AutoMem experiment log",
    sourceUrl: "https://github.com/verygoodplugins/automem/blob/main/benchmarks/EXPERIMENT_LOG.md",
  },
  {
    system: "Mem0 Cloud",
    locomo: "92.5%",
    longMemEval: "94.4%",
    other: "BEAM 64.1 / 48.6",
    status: "external reported",
    note: "Mem0 reports managed-platform results for LoCoMo, LongMemEval, and BEAM; their docs caution the cloud stack includes proprietary optimizations.",
    sourceLabel: "Mem0 research",
    sourceUrl: "https://mem0.ai/research",
  },
  {
    system: "Zep / Graphiti",
    locomo: "not reported here",
    longMemEval: "71.2% (gpt-4o)",
    other: "63.8% (gpt-4o-mini)",
    status: "external reported",
    note: "Zep's paper reports LongMemEval accuracy and latency versus full-context baselines with GPT-4o-family models.",
    sourceLabel: "Zep paper",
    sourceUrl:
      "https://blog.getzep.com/content/files/2025/01/ZEP__USING_KNOWLEDGE_GRAPHS_TO_POWER_LLM_AGENT_MEMORY_2025011700.pdf",
  },
  {
    system: "Supermemory",
    locomo: "not reported here",
    longMemEval: "81.6% (gpt-4o)",
    other: "LongMemEval-S",
    status: "external reported",
    note: "Supermemory reports LongMemEval-S category scores and compares against Zep and full-context baselines.",
    sourceLabel: "Supermemory research",
    sourceUrl: "https://supermemory.ai/research/",
  },
  {
    system: "Hindsight",
    locomo: "up to 89.61%",
    longMemEval: "91.4%",
    other: "scaled backbone",
    status: "research preprint",
    note: "The Hindsight preprint reports LongMemEval and LoCoMo improvements for a structured memory architecture.",
    sourceLabel: "Hindsight arXiv",
    sourceUrl: "https://arxiv.org/abs/2512.12818",
  },
  {
    system: "Mastra Observational Memory",
    locomo: "not reported here",
    longMemEval: "84.23% (gpt-4o); 94.87% (gpt-5-mini)",
    other: "LongMemEval-S",
    status: "external reported",
    note: "Mastra reports an open-source LongMemEval-S runner and shows model-dependent scores for Observational Memory.",
    sourceLabel: "Mastra research",
    sourceUrl: "https://mastra.ai/research/observational-memory",
  },
  {
    system: "Honcho",
    locomo: "89.9%",
    longMemEval: "90.4%; 92.6% (Gemini 3 Pro)",
    other: "LongMemEval-S / BEAM",
    status: "external reported",
    note: "Honcho reports LongMemEval-S, LoCoMo, and BEAM results while cautioning that some LongMemEval-S setups now fit in frontier context windows.",
    sourceLabel: "Honcho benchmark",
    sourceUrl: "https://plasticlabs.ai/blog/research/Benchmarking-Honcho",
  },
  {
    system: "Letta / MemGPT",
    locomo: "not published",
    longMemEval: "not published",
    other: "benchmark issue open",
    status: "no official standardized score found",
    note: "Letta has an open request for LOCOMO / MemBench / LongMemEval benchmark coverage; no official standardized score was found.",
    sourceLabel: "Letta benchmark issue",
    sourceUrl: "https://github.com/letta-ai/letta/issues/3115",
  },
  {
    system: "MemMachine",
    locomo: "91.69%",
    longMemEval: "93.0%",
    other: "gpt4.1-mini / LongMemEvalS",
    status: "research preprint",
    note: "A 2026 arXiv preprint reports LoCoMo and LongMemEvalS accuracy-efficiency results under its own optimized setup.",
    sourceLabel: "MemMachine arXiv",
    sourceUrl: "https://arxiv.org/abs/2604.04853",
  },
  {
    system: "HydraDB",
    locomo: "not reported here",
    longMemEval: "90.23%",
    other: "LongMemEval-S / Gemini 3 Pro",
    status: "external reported",
    note: "HydraDB reports LongMemEval-S category results against Supermemory, Zep, full-context, and memory-layer baselines.",
    sourceLabel: "HydraDB benchmark",
    sourceUrl: "https://benchmarks.hydradb.com/HydraDB.pdf",
  },
  {
    system: "Exabase M-1",
    locomo: "not reported here",
    longMemEval: "96.4% top-50",
    other: "Gemini 3 Flash",
    status: "external reported",
    note: "Exabase reports a May 2026 LongMemEval run focused on retrieval quality with a smaller answer model and no question-specific prompt tuning.",
    sourceLabel: "Exabase research",
    sourceUrl: "https://exabase.io/research/exabase-achieves-state-of-the-art-on-longmemeval-benchmark",
  },
  {
    system: "Memora / FAMA",
    locomo: "benchmark/metric, not AutoMem run",
    longMemEval: "not directly comparable",
    other: "FAMA metric",
    status: "new benchmark surface",
    note: "Memora introduces weeks-to-months personalized-agent evaluation and FAMA; useful future context, but AutoMem has not run it canonically.",
    sourceLabel: "Memora/FAMA arXiv",
    sourceUrl: "https://arxiv.org/abs/2604.20006",
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
