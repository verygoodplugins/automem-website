---
title: "Why We Chose Graph-Based Memory Over Pure Vector Search"
description: "A deep dive into AutoMem's FalkorDB + Qdrant architecture and why relationships matter"
date: "2025-09-20"
tags:
  - architecture
  - technical
  - ai
---

When I started building AutoMem, the obvious choice was "just use vectors."

Vector databases are hot. Pinecone, Weaviate, Chroma — everyone's using them for RAG. Embed your text, store the vectors, do similarity search. Done.

**But I kept hitting a wall.**

## The Problem With Pure Vector Search

Vector similarity is great for "find things like this." But memory isn't just about similarity.

Here's what I mean:

**Query:** "What's my preferred auth pattern?"

**Vector search returns:**
1. "Uses JWT tokens" (similarity: 0.89)
2. "Prefers middleware for auth" (similarity: 0.85)
3. "Mentioned OAuth in last project" (similarity: 0.82)

Okay, but... **how do these relate to each other?** Did I switch from OAuth to JWT? Is the middleware preference connected to JWT? What was the actual decision flow?

Vector search gives you a bag of similar memories. It doesn't tell you the *story*.

## Enter the Knowledge Graph

Graphs are all about relationships. Node A connects to Node B with relationship type R.

In AutoMem:
- **Nodes** = Individual memories
- **Edges** = Relationships between memories (11 types)
- **Properties** = Metadata like importance, timestamps, tags

**The same query with graph traversal:**

```
Memory: "Prefers JWT for auth"
  ├─ EVOLVED_INTO ─→ "Switched from OAuth to JWT"
  │     └─ REASON: "Simpler token validation"
  └─ RELATES_TO ─→ "Uses middleware for auth checks"
        └─ DERIVED_FROM ─→ "Next.js middleware pattern"
```

Now I can see the actual context. The AI doesn't just know *what* I prefer — it knows *why* and *how* that preference developed.

## The Hybrid Approach: FalkorDB + Qdrant

Pure graphs have their own problem: they're bad at "find similar things."

So we use both:

### Qdrant (Vector DB)
- Fast semantic search
- "What memories are relevant to this query?"
- Returns candidate memories based on embedding similarity

### FalkorDB (Graph DB)
- Relationship traversal
- "How do these memories connect?"
- Expands context through graph edges

**The flow:**
1. Query comes in
2. Qdrant finds semantically similar memories
3. FalkorDB expands those with related memories
4. Combined results ranked by importance + recency + relevance

## The 11 Relationship Types

We found that most memory relationships fall into these categories:

| Type | Meaning | Example |
|------|---------|---------|
| RELATES_TO | General connection | "TypeScript" ↔ "Strict mode" |
| LEADS_TO | Causation | "Bug in auth" → "Refactored middleware" |
| EVOLVED_INTO | Updated version | "Used REST" → "Switched to GraphQL" |
| DERIVED_FROM | Implementation | "Pattern" → "Specific code" |
| EXEMPLIFIES | Concrete example | "Design pattern" → "Auth implementation" |
| CONTRADICTS | Conflict | "Prefers tabs" ↔ "Team uses spaces" |
| REINFORCES | Strengthens | Multiple memories confirming same preference |
| INVALIDATED_BY | Superseded | Old decision invalidated by new one |
| PART_OF | Component | "Auth module" ⊂ "Backend architecture" |
| PREFERS_OVER | Choice | "TypeScript" > "JavaScript" |
| OCCURRED_BEFORE | Temporal | Ordering of events |

This lets the AI understand nuance. When I ask about my auth preferences, it knows that some old memories are invalidated, some are reinforced, and some evolved over time.

## Performance

The hybrid approach is fast:
- Simple queries: **20-50ms**
- Complex graph traversals: **under 200ms**
- Memory storage: **~15ms**

FalkorDB is Redis-based, so it's in-memory and screaming fast. Qdrant handles the vector heavy lifting efficiently.

## Try It Yourself

The graph-based approach is what makes AutoMem different from "just another vector store."

```javascript
// Store with relationships
await automem.store({
  content: "Switched to Vite for builds",
  type: "Decision",
  importance: 0.8
});

await automem.associate({
  memory1_id: newMemory.id,
  memory2_id: webpackMemory.id,
  type: "EVOLVED_INTO",
  strength: 0.9
});
```

Full API docs: [AutoMem API Reference](/docs/reference/api/memory-operations/)

The code is open source. If you want to understand exactly how the graph traversal works, [read the source](https://github.com/verygoodplugins/automem).

Build something cool with it.

– Jack


