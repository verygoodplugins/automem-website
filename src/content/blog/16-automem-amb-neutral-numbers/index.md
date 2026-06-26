---
title: "AutoMem on the Neutral Benchmark: The Numbers I'll Stand Behind"
description: "I promised in 0.16 to submit AutoMem to the neutral Agent Memory Benchmark and quote those numbers, not my own. Here's what came back — graceful BEAM scaling to 10M, ~3.9k context tokens, and the conversational-recall gap I'm not hiding."
date: "2026-06-26"
draft: false
tags:
  - release
  - benchmarking
  - technical
---

Last week I ended the 0.16 post with a promise: stop quoting my own-harness, own-judge numbers, submit AutoMem to the neutral Agent Memory Benchmark, and stand behind *those* results — same answerer, same judge, same grader as everyone else. That run is done. This is me keeping the promise, win and loss both.

## The short version

- **AutoMem ran on the neutral AMB** — Gemini answerer, Gemini judge, single-query RAG mode. Same harness everyone else gets graded by. The judge confound from the 0.16 post is gone.
- **On BEAM — the one apples-to-apples axis — AutoMem beats Honcho at every tier**, and the margin *grows* with scale: +4.5pp at 100k, +0.7 at 500k and 1M, **+16.8pp at 10M**.
- **It degrades gracefully.** ~67.5% at 100k down to ~57.4% at 10M — a 10-point slide across a 100x bigger haystack. Honcho holds flat then falls off a cliff: 63.0% → 40.6%.
- **It feeds the answerer ~3.9k context tokens at every scale.** The board's leader feeds 17–27k on BEAM. That's architectural, not a hardware accident.
- **The honest other half: on conversational recall, AutoMem trails.** Hindsight beats it on all three Core-3 splits. The strength here is large-context scaling, not verbatim chat recall.
- **You can run the whole thing yourself.** One command per split, no embedding API keys, outputs committed. The provider PR is up at vectorize-io and under review.

## What the neutral harness actually fixes

The 0.16 post had one number that reframed everything for me: the *same* AutoMem answers scored 82.0% under a gpt-5-mini judge and 70.25% under a gpt-5 judge. A ~12-point swing from grader strictness alone — no memory change, no retrieval change. That's the reason I couldn't put my internal numbers on a leaderboard and expect them to mean anything against someone else's leaderboard. Every published score is entangled with whatever judge produced it.

The neutral [Agent Memory Benchmark](https://automem.ai/benchmarks) (AMB, from vectorize-io) removes that confound by fixing the parts I was free to vary. One answerer — `gemini-3.1-pro-preview`. One judge — `gemini-2.5-flash-lite`. Single-query RAG mode. Every provider feeds its retrieved context into the *same* answerer and gets graded by the *same* judge. The only thing that changes between runs is the memory system. That's the whole point: hold the grader constant, and the score finally measures retrieval architecture instead of judge mood.

My provider config was deliberately lean, because I wanted the result to reflect AutoMem's *defaults*, not a tuned demo. Self-spinning Docker stack — FalkorDB plus Qdrant — booted by the harness. FastEmbed-local `bge-base-en-v1.5`, 768 dimensions, **no embedding API keys**. Enrichment off (`ENRICHMENT_ENABLED=false`). Run name `automem-sub`. Nothing on the answer side is mine to tweak; I bring retrieval and the harness brings the rest.

One caveat I want stated before any number, not buried under it: the competitor scores I name below come from AMB's `external_results.json` — published or self-reported, with source attribution — **not** re-run through this Gemini harness. That matters per-benchmark, and I'll flag where it changes how much weight a comparison carries.

## The result: BEAM scaling, and the 10M centerpiece

BEAM is the axis I actually trust for comparison. It's the one benchmark where AutoMem and the published competitors ran *the same benchmark under the same neutral harness* — apples-to-apples, not directional. (BEAM scores are rubric-mean: each item graded 0 / 0.5 / 1 and averaged, so it's a different scale than the pass/fail Core-3 benchmarks. Don't cross-compare the raw percentages between the two families.)

Here's the curve, AutoMem versus Honcho, across the four BEAM tiers:

- **100k** (averaged over 3 reproduction runs, spread 1.8pp): AutoMem **67.5%** vs Honcho 63.0% — **+4.5pp**
- **500k** (±2.8, n=700): AutoMem **65.6%** vs Honcho 64.9% — **+0.7pp**
- **1M** (±2.7, n=700): AutoMem **63.8%** vs Honcho 63.1% — **+0.7pp**
- **10M** (±5.5, n=200): AutoMem **57.4%** vs Honcho 40.6% — **+16.8pp**

![BEAM scaling: AutoMem holds 67.5% at 100k and degrades gracefully to 57.4% at 10M, while Honcho stays flat near 63% through 1M then collapses to 40.6% at 10M; Hindsight holds a ~73–64% band across the curve.](/img/blog/automem-amb-beam-scaling.svg)

Read the shape, not just the points. AutoMem beats Honcho at **every** tier, and the lead widens exactly where it's hardest to fake. From 100k to 10M — a 100x increase in haystack size — AutoMem slides from 67.5% to 57.4%. **That's a 10-point cost for a hundredfold harder problem.** Honcho holds flat through 1M and then drops off a cliff at 10M: 63.0% down to 40.6%, a 22-point collapse over the same range.

The 10M tier is the one I'd defend in a fight. At ten million tokens of context, stuffing the window is *physically impossible* — no model in this harness has a 10M context to dump the haystack into. So whatever score comes out at that tier is a measurement of retrieval architecture and nothing else. AutoMem lands ~57% where the well-marketed competitor (Honcho) breaks to ~41%. That gap isn't a context-window advantage. There is no context window big enough to be an advantage here. It's the retrieval doing the work.

I want to be precise about the standings, because precision is the entire reason I ran this. AutoMem is **not** the BEAM leader. Vectorize's own Hindsight holds a ~73–64% band across the full curve and sits above AutoMem at every tier (~73% at 100k, ~64% at 10M). AutoMem is a clear **#2 on BEAM** — decisively above Honcho, consistently below Hindsight. That's the honest placement: second, and second by a comfortable margin over third.

## The honest other half: conversational recall

Now the part I'm not going to slide past. BEAM is large-context scaling. The other half of AMB is Core-3 — `locomo`, `longmemeval`, `personamem` — and those measure conversational, verbatim recall. There, AutoMem trails.

The right yardstick for Core-3 is Hindsight, because Hindsight also ran the neutral harness — a clean comparison, same answerer and judge. AutoMem trails it on all three:

- **locomo/locomo10**: AutoMem 85.1% (±1.8, n=1540) vs Hindsight 92%
- **longmemeval/s**: AutoMem 74.4% (±3.8, n=500) vs Hindsight 94.6%
- **personamem/32k**: AutoMem 76.1% (±3.4, n=589) vs Hindsight 86.6%

That longmemeval gap — 74.4 against 94.6 — is the one that stings, and I'm leaving it in the post in plain sight. (Honcho self-reports higher on locomo and longmemeval too, but those come from *Honcho's own harness*, so they carry exactly the answerer-and-judge confound AMB exists to remove. I'm treating them as directional only and not as a clean head-to-head. Hindsight is the comparison that holds.)

Here's the read I actually believe: **AutoMem's strength is large-context retrieval at scale, not verbatim conversational recall.** Could be the architecture — graph plus vector tuned for finding the needle in a huge haystack rather than reconstructing a chat transcript line by line. Could be the lean config — FastEmbed 768d with enrichment off is a deliberately modest retrieval surface for a conversation-heavy split. Probably some of both. What I won't do is wave the BEAM win around and pretend it's a general win. It isn't. It's a *scaling* win with a real conversational-recall gap attached.

## Efficiency: ~3.9k tokens, every scale

This is the part that holds up regardless of which benchmark you care about, and it's my favorite number in the whole run. AutoMem feeds the answerer **~2.6–4.8k context tokens at every scale** — reported as the mean, matching the board's `avg_context_tokens` metric. Concretely, across BEAM: 3,842 tokens at 100k, 3,929 at 500k, 3,900 at 1M, 3,932 at 10M. The haystack grows by 100x; the context handed to the answerer stays flat around 3.9k.

The board's leader feeds **17–27k** context tokens on BEAM to get its scores.

![Context-token efficiency: AutoMem feeds the answerer a flat ~3.9k context tokens across BEAM tiers while the board leader feeds 17–27k for its scores.](/img/blog/automem-amb-efficiency.svg)

That's a 4–7x difference in what the answerer has to read, and it's **architectural, not hardware-dependent**. It doesn't matter what box you run this on — AutoMem's retrieval narrows the candidate set hard before the answerer ever sees it. Every token the answerer doesn't have to read is latency you don't pay and budget you don't spend, on any model, on any host. For a system that's going to sit in the hot path of an agent loop, the tokens-per-answer number is the one I'd optimize for first, and AutoMem already wins it by a wide margin.

(A note on speed, since someone always asks: my runs were sub-second P50 on most tiers — 127–451 ms — and ~1.7s P50 at 10M. That's *my* hardware, and I'm reporting it only for my own runs. It is **not** a cross-system axis. Different providers ran on different boxes, so "Nx faster than X" is a claim I can't make and won't. The 10M *mean* is roughly 2.2x its median because an unrelated local process was hammering the host CPU during that run — prefer the P50. Accuracy is unaffected: retrieval is deterministic; only the timing is load-sensitive.)

## Run it yourself

The reason this post exists instead of a screenshot is that you can reproduce all of it.

- The `outputs/` are committed and public — the raw per-item results, not just summary numbers.
- `AUTOMEM_REPRODUCE.md` gives you **one command per split.**
- The provider self-spins its full stack — FalkorDB, Qdrant, FastEmbed — with **no embedding API keys.** You don't need an OpenAI or Voyage key to reproduce a single number above.

As part of this launch I'm publishing the public image (`ghcr.io/verygoodplugins/automem:amb-v1`) and the provider PR to vectorize-io's AMB repo. Correct framing, because I said I'd be precise about status: **submitted to the neutral board, PR under review.** Not "live on the leaderboard." When the PR merges, that sentence changes — until then, the honest word is *submitted*. What you *can* do today is clone it and run the harness yourself, which is the part that actually matters to me.

Start at the [benchmarks page](https://automem.ai/benchmarks) for the full head-to-head table — every system, every tier, with source attribution on the external numbers. I'm narrating the comparison here on purpose and pointing you there for the grid, rather than pasting a competitor table into a blog post.

## What's next

The Core-3 gap is the roadmap. The 0.16 post already found that AutoMem's failures were mostly *reasoning over a retrieved memory*, not failing to retrieve it — and longmemeval is exactly the split where that bites hardest. So 0.17 aims at conversational and temporal recall: closing the distance to Hindsight on the splits where AutoMem currently trails, without giving back the BEAM scaling or the token efficiency. That's the needle to thread.

And once the vectorize-io PR merges, I get to change "submitted" to "on the board" — and re-run the whole curve under the same neutral harness to confirm the numbers held. Same grader, every release. That's the bar now.

## Caveats, up front

- **BEAM is the only apples-to-apples axis.** Same benchmark, same neutral harness, versus published competitors. Trust those comparisons most.
- **Core-3 competitor numbers split two ways.** Hindsight ran the neutral harness (clean). Honcho's Core-3 figures are self-reported on its own harness (directional only — they carry the judge confound AMB removes).
- **AutoMem is #2 on BEAM, not #1.** Hindsight leads the curve; AutoMem sits clearly above Honcho and clearly below Hindsight.
- **AutoMem trails on conversational recall.** locomo 85.1 vs 92, longmemeval 74.4 vs 94.6, personamem 76.1 vs 86.6. The win is scaling, not chat recall.
- **Latency is my-runs-only.** Never read it as a head-to-head; different hardware per provider.
- **Status is "submitted, PR under review,"** not live on the leaderboard, until the PR merges.

I said in the 0.16 post that the neutral-harness numbers were the ones I'd actually stand behind. These are them — a real #2 on large-context scaling, a genuine gap on conversational recall, and a token-efficiency story that holds on any hardware. Win and loss, same page. That's the honest version, which is the only one worth shipping.

— Jack
