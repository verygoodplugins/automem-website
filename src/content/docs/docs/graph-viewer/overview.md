---
title: Graph Viewer
description: Interactive 3D visualization of your AutoMem memory graph — explore nodes, relationships, clusters, and temporal patterns.
sidebar:
  order: 1
---

:::note[Source repository]
[verygoodplugins/automem-graph-viewer](https://github.com/verygoodplugins/automem-graph-viewer) — standalone React/Vite frontend that connects to any AutoMem API instance.
:::

The AutoMem Graph Viewer is a standalone web application that renders your memory graph as an interactive 3D force-directed layout. It connects to the AutoMem API to fetch graph snapshots and lets you visually explore memories, relationships, clusters, and temporal patterns.

The `automem` API exposes `/viewer` compatibility routes that redirect into the graph viewer, so users can access it directly from a running AutoMem instance.

---

## Key Features

### 3D Force-Directed Graph

The core visualization uses [3d-force-graph](https://github.com/vasturiano/3d-force-graph) to render memory nodes and relationship edges in a physics-based 3D layout. Nodes are colored and sized by memory type, importance, or custom attributes. Edges reflect relationship types (`RELATES_TO`, `LEADS_TO`, `EVOLVED_INTO`, etc.) with distinct visual styles.

Configuration options include:

| Parameter | Description |
|-----------|-------------|
| Charge strength | Repulsion between nodes |
| Link distance | Preferred edge length |
| Center gravity | Pull toward origin |
| Collision radius | Minimum node spacing |

### Inspector Panel

Click any node to open the Inspector, which shows full memory details: content, type, confidence, tags, importance, timestamps, metadata, and all connected relationships. The panel is resizable via drag handles.

### Search & Filtering

- **SearchBar** — Debounced search box; client-side filtering over the loaded graph for tag-only queries, plus whole-store semantic search via the `/recall` API endpoint when a text query is active
- **SearchResultsList** — Ranked results from `/recall`, with client-side filtering by type and sorting by relevance, recency, or importance; clicking a result navigates to an in-graph node or loads an off-graph one
- **TagCloud** — Visual tag frequency display; click tags to filter

### Timeline & Time Travel

The **TimelineBar** lets you scrub through your memory graph's history. The `useTimeTravel` hook maintains temporal state so you can see how the graph evolved over time.

### Pathfinding

Select two nodes and the **PathfindingOverlay** computes and highlights the shortest path between them through the relationship graph, using the `usePathfinding` hook.

### Cluster Detection

The `useClusterDetection` hook identifies densely connected subgraphs and renders **ClusterBoundaries** around them. Useful for spotting topic groupings in your memory graph.

### Keyboard Navigation

Full keyboard navigation support via `useKeyboardNavigation`:

- Arrow keys to traverse nodes
- Enter to select/inspect
- `/` to focus search
- `?` to show the keyboard shortcuts help overlay

### Experimental: Hand Tracking Controls

When `VITE_ENABLE_HAND_CONTROLS=true`, the viewer enables gesture-based interaction via webcam hand tracking:

- Pinch to select nodes
- Grab to pan/rotate the view
- Two-hand gestures for zoom and rotation
- iPhone hand tracking support via `useIPhoneHandTracking`

This feature is opt-in and experimental.

---

## Architecture

```
src/
├── App.tsx                    # Main app shell, state orchestration
├── api/
│   └── client.ts              # AutoMem API client (auth, fetch)
├── components/                # UI components
│   ├── GraphCanvas.tsx        # 3D force graph renderer
│   ├── Inspector.tsx          # Node detail panel
│   ├── SearchBar.tsx          # Search box (in-graph filter + /recall search)
│   ├── SearchResultsList.tsx  # Ranked /recall results
│   ├── TimelineBar.tsx        # Temporal scrubber
│   ├── PathfindingOverlay.tsx # Shortest-path visualization
│   ├── ClusterBoundaries.tsx  # Cluster boundary rendering
│   ├── StatsBar.tsx           # Graph statistics
│   ├── MiniMap.tsx            # Overview minimap
│   ├── TokenPrompt.tsx        # API token entry UI
│   └── settings/              # Force/display/cluster config
├── hooks/                     # React hooks (data, navigation, gestures)
│   ├── useGraphData.ts        # Fetches graph snapshots from API
│   ├── useAuth.ts             # Token management
│   ├── useForceLayout.ts      # Physics simulation config
│   ├── useTimeTravel.ts       # Temporal navigation
│   ├── usePathfinding.ts      # Shortest-path algorithm
│   └── ...
└── lib/
    ├── types.ts               # TypeScript type definitions
    ├── edgeStyles.ts          # Relationship visual styles
    └── sounds.ts              # UI sound effects
```

The app is a single-page React application built with Vite. All state lives in React hooks — there's no external state management library. The API client handles authentication and communicates with the AutoMem REST API.
