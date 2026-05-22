---
title: "We Found Bugs in Our Own Benchmarks (The Real Numbers Are Better)"
description: "How we built rigorous evaluation infrastructure, found critical scoring bugs, and established honest benchmark baselines."
date: "2026-03-11"
tags:
  - benchmarking
  - technical
  - open-source
---

> **Editor note, May 2026:** This post documents a March benchmark postmortem. Current benchmark claims now live on the generated [Benchmarks](/benchmarks/) page, sourced from the main `automem` repository publication bundle. Treat the figures below as historical methodology context, not current marketing claims.

Last month I told you we had a higher LoCoMo score than our corrected evaluator supported. That number was wrong.

Not in the direction you'd expect, though. Let me explain.

## Why Benchmark a Memory System at All

Most AI memory tools ship with zero evaluation. "It works" means "I tried it and it seemed fine." That's vibes-based engineering.

The problem: memory systems fail in ways that are invisible until they're catastrophic. Your AI confidently remembers the wrong date. It conflates two people. It loses context from three weeks ago because the retrieval missed it. You don't notice until it matters.

**LoCoMo** (ACL 2024) is the academic benchmark for this. 10 real conversations, nearly 2,000 questions across 5 categories:

1. **Single-hop Recall** — "What's my favorite restaurant?" Direct memory lookup.
2. **Temporal Understanding** — "What did we discuss last Tuesday?" Time-based retrieval.
3. **Multi-hop Reasoning** — "Based on my job change and new commute, what gym should I use?" Connecting multiple memories.
4. **Open Domain** — General knowledge questions with conversational context.
5. **Complex Reasoning** — Nuanced questions requiring inference across the full conversation.

The public academic leaderboard was our comparison target, but we now avoid using external leaderboard language unless we have apples-to-apples reruns under the same current harness.

## What We Found When We Looked Harder

We'd been running LoCoMo since October 2025 and iterating on the results. But in March, we decided to build serious benchmark infrastructure — reproducible snapshots, automated branch comparisons, the whole thing. That's when we actually looked at our evaluator code carefully.

Two bugs. Both critical. Both hiding in plain sight.

### Bug #1: Temporal Matching Was Backwards

Our evaluator was comparing dates extracted from the **question** against dates in the **memory store**. But temporal questions don't contain dates — they contain relative references like "last week" or "in January."

The dates we needed to match were in the **answers**.

This bug made our temporal score look terrible: **22.2%**. We thought temporal understanding was our weakest category. We were wrong. When we fixed the evaluator to compare answer dates correctly, temporal jumped to **92.06%**.

The system was actually great at temporal reasoning. Our test was broken.

### Bug #2: Category 5 Was Scoring Itself 100%

The LoCoMo dataset doesn't include a ground-truth `answer` field for Category 5 questions. Our evaluator was matching the model's response against an empty string. Empty string contains... nothing. So it always "matched."

**We were giving ourselves a perfect score on questions we weren't even evaluating.**

Once we caught this, we added an optional GPT-4o judge for Category 5. When there's no ground truth, you need an LLM to assess whether the response is actually reasonable. With the judge enabled, Category 5 scores **95.74%** — genuinely strong, but now actually measured.

A note on reproducibility: LLM judges aren't deterministic. We use `gpt-4o` as the default judge model — note that this is a rolling alias, not a dated snapshot, so results may shift as OpenAI updates the underlying model. For exact reproducibility, pin `BENCH_JUDGE_MODEL` to a dated snapshot like `gpt-4o-2024-11-20`. We set temperature 0 and enforce a 90-second request timeout to prevent stalled runs. The judge is opt-in (`BENCH_JUDGE_MODEL` env var) precisely because of this tradeoff. Categories 1-4 use deterministic string/date matching and are fully reproducible.

Without the judge, we skip Category 5 entirely and report N/A. No more fake 100%.

## The Honest Numbers

Here's where we actually stand, with a corrected evaluator and honest methodology.

**locomo-mini** (2 conversations, 233 questions — our rapid iteration benchmark):

| Category | Score | Count |
|---|---|---|
| **Overall (cats 1-4)** | **89.27%** | 208/233 |
| Single-hop Recall | 79.07% | 34/43 |
| Temporal Understanding | 92.06% | 58/63 |
| Multi-hop Reasoning | 46.15% | 6/13 |
| Open Domain | 96.49% | 110/114 |

**Full locomo** (10 conversations, 1,986 questions — the complete benchmark with GPT-4o judge for Category 5):

| Category | Score | Count |
|---|---|---|
| **Overall (all cats, w/ judge)** | **historical March full-run score** | 1739/1986 |
| Complex Reasoning (w/ judge) | 95.74% | 427/446 |

The full run includes all five categories across all 10 conversations. The mini subset gives us fast iteration; the full run is the official number.

The earlier inflated number came from the fake Category 5 score. The corrected number was lower, but it was *real*. And the temporal score going from 22% to 92% means the system was dramatically better at time-based recall than we thought.

I'd rather publish an honest 89% than a bullshit 91%.

## The Infrastructure That Caught It

We didn't find these bugs by accident. We found them because we built benchmarking infrastructure that forced us to look at results category by category, run by run.

Here's what the system looks like now:

**Tiered benchmarks:**

| Tier | What | Runtime | When |
|---|---|---|---|
| 0 | `make test` (unit tests) | 30 seconds | Every change |
| 1 | `locomo-mini` (2 convos, 233 questions) | 2-3 minutes | Rapid iteration |
| 2 | `locomo` full (10 convos, 1,986 questions) | 5-10 minutes | Before merge |

**Reproducibility:**
- Docker volume snapshots — same memory state for every run
- Baseline JSON files — deterministic comparison points
- `make bench-compare-branch BRANCH=main` — A/B test any change against main
- Experiment log tracking every run with before/after metrics

When we merged the relationship taxonomy refactor last week, the bench showed **89.36% — zero regression** across all categories. That's not a gut check, that's a measured result with a paper trail.

Every PR that touches recall, scoring, or entity extraction gets a benchmark run. No exceptions.

## Where We're Still Weak

I'm not going to pretend the numbers are all great.

**Multi-hop reasoning: 46.15%.** That's bad. Here's why.

Multi-hop questions require connecting multiple memories to reach an answer. "Given that I changed jobs and my new office is downtown, and I mentioned wanting to try CrossFit, what gym would you recommend?" That requires finding the job change memory, the office location memory, the CrossFit preference memory, and synthesizing them.

Our current recall does a single pass — find relevant memories, return them. If the first pass doesn't surface all the evidence, the answer is incomplete.

We're working on three specific fixes:

1. **Multi-pass recall** — first pass finds seed memories, second pass follows graph edges to find supporting evidence. The relationship graph already connects these memories with `RELATES_TO` and `DERIVED_FROM` edges. We just need to traverse them during recall, not just during storage.

2. **Evidence chaining** — following `LEADS_TO` and `DERIVED_FROM` paths to surface memories that are logically connected but semantically distant. The graph is the whole point — time to use it for retrieval, not just organization.

3. **Adaptive recall depth** — simple questions get a fast single pass. Complex questions get deeper graph traversal with higher memory limits. We partially built this during the October optimization sprint (adaptive limits of 50-100 memories based on question complexity) but haven't wired it into the benchmark path yet.

Multi-hop is the next frontier. When we crack it, the overall score jumps significantly.

## What This Means For You

If you're running AutoMem in production, none of this changes your day-to-day. The memory system itself didn't change — just how we measure it.

But it means you can trust the numbers we publish. When we say 89.27%, that's a real score from a real benchmark with a corrected evaluator, reproducible snapshots, and an experiment log you can audit.

The benchmark infrastructure is [in the repo](https://github.com/verygoodplugins/automem). The experiment log, the baseline snapshots, the comparison scripts — all of it. Run it yourself if you want.

We didn't optimize for the benchmark. We optimized for actual usefulness. The benchmark result is a side effect of getting the architecture right.

Now we go fix multi-hop.

– Jack
