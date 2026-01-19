---
title: "What's Coming in v0.10.0: See Your Memory Graph"
description: "3D visualization, 11 relationship types, hand gesture controls, and real-time monitoring. Your memories are about to get visual."
date: "2026-01-19"
tags:
  - announcement
  - roadmap
  - visualization
---

You've been storing memories. But have you *seen* them?

AutoMem has been running quietly in the background — storing decisions, linking patterns, building a knowledge graph of everything your AI learns. But until now, that graph was invisible. A black box of nodes and edges that you just had to trust.

**v0.10.0 changes that.** Here's what's coming.

## 3D Interactive Graph Viewer

We built a real-time visualization of your entire memory graph. React + Three.js + D3-force-3d. It looks like something out of a sci-fi movie, except it's actually useful.

**What you get:**
- **Force-directed layout** — Memories naturally cluster based on relationships. Related memories drift together. Unconnected ones float away.
- **3D navigation** — Rotate, zoom, pan. Explore your knowledge graph from any angle.
- **Cluster boundaries** — Visual groupings by type, tags, or semantic similarity.
- **Edge particles** — Animated flows showing relationship direction. You can literally see how knowledge connects.
- **Mini map** — Because 1000+ nodes gets disorienting.

Here's a preview of navigating memories in 3D space:

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 2rem 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"
    src="https://www.youtube.com/embed/1ftrXMrHQ_I"
    title="AutoMem 3D Memory Navigation Preview"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</div>

## 11 Relationship Types, Visualized

Remember those relationship types from the memory API? Now you can see them:

| Relationship | What It Means | Visual Style |
|-------------|---------------|--------------|
| `RELATES_TO` | General connection | Thin gray line |
| `LEADS_TO` | Causal link (A caused B) | Arrow with gradient |
| `DERIVED_FROM` | Implementation of a concept | Dashed line |
| `EXEMPLIFIES` | Concrete example of a pattern | Dotted connection |
| `EVOLVED_INTO` | Updated version | Animated transition |
| `INVALIDATED_BY` | Superseded knowledge | Red fade |
| `CONTRADICTS` | Conflicting info | Red warning edge |
| `REINFORCES` | Supporting evidence | Thick green line |
| `PART_OF` | Component relationship | Hierarchical arrow |
| `PREFERS_OVER` | Chosen alternative | Decision branch |
| `OCCURRED_BEFORE` | Temporal ordering | Timeline edge |

Each type gets distinct styling. You can immediately see which memories reinforce each other versus which ones conflict.

## Obsidian-Style Navigation

We stole the best ideas from Obsidian's graph view:

- **Right-docked settings panel** — Collapsible sections for filtering nodes, adjusting physics, changing colors.
- **Focus mode** — Click a memory, and everything dims except its direct connections. Click again to expand to second-degree relationships.
- **Breadcrumb navigation** — Track your path through the graph. Click to jump back.
- **Smart clustering** — Toggle between clusters by type, by tags, or by semantic similarity.
- **Keyboard shortcuts** — `F` for focus, `R` for reset, arrow keys for navigation.

The goal: explore your knowledge graph as naturally as you explore notes.

And here's the timeline feature — scrub through your memories by date:

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 2rem 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"
    src="https://www.youtube.com/embed/rU6Rok8vKhM"
    title="AutoMem Timeline Exploration Preview"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</div>

## Hand Gesture Controls (Experimental)

Okay, this one's for fun.

We added optional webcam hand tracking via MediaPipe. Wave your hand to rotate the graph. Pinch to zoom. Point to select.

**It's experimental** — works best in Chrome, needs decent lighting, and your cat will definitely trigger false positives.

But when it works? Feels like Minority Report. We're also testing iPhone hand tracking support because why not.

## Real-Time Monitoring Endpoints

Visualization isn't just about graphs. We added observability endpoints:

```bash
# Service health + memory count
GET /health

# Enrichment queue status (depth, worker state, throughput)
GET /enrichment/status

# Background consolidation status
GET /consolidate/status

# Graph analytics (patterns, clusters, orphan nodes)
GET /analyze
```

Hook these into your monitoring stack. Know when the enrichment queue backs up. See consolidation progress. Get alerts before problems become visible.

## Performance

All this visualization runs on your hardware, but we're not shipping a slideshow:

- **UMAP-based embedding projection** — Instead of random 3D positions, memories are placed based on actual semantic similarity. Similar memories cluster spatially.
- **Projection caching** — UMAP is expensive. We cache projections in FalkorDB and only recalculate when memories change.
- **Progressive loading** — Large graphs load incrementally. You see structure immediately, details fill in.
- **WebGL fallback** — If Three.js is too heavy, we drop to a 2D canvas renderer.

Tested with 10k+ memories on a MacBook Air. Stays smooth.

## When's It Ship?

Soon. We're in testing now.

**Want early access?** [Star the repo](https://github.com/verygoodplugins/automem) and watch for the v0.10.0 release. Or [join the Discord](https://discord.gg/automem) — beta testers get it first.

Your memories aren't a black box anymore. Time to see what your AI actually knows.

– Jack
