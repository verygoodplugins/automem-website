---
title: Graph Viewer
description: Interactive 3D visualization of your AutoMem memory graph — explore nodes, relationships, clusters, and temporal patterns.
sidebar:
  order: 1
---

:::note[Source repository]
[verygoodplugins/automem-graph-viewer](https://github.com/verygoodplugins/automem-graph-viewer) — standalone React/Vite frontend that connects to any AutoMem API instance.
:::

The AutoMem Graph Viewer is a standalone web application that renders your memory graph as an interactive 3D layout. It connects to the AutoMem API to fetch a bounded graph overview and lets you visually explore memories, relationships, clusters, and temporal patterns.

The `automem` API exposes `/viewer` compatibility routes that redirect into the graph viewer, so users can access it directly from a running AutoMem instance.

![AutoMem Graph Viewer overview with 3D memory graph, search bar, stats, minimap, and timeline controls](/img/docs/graph-viewer-overview.png)

| Whole-store search | Memory inspector |
|---|---|
| ![Search results sidebar with relevance sorting and off-graph load affordances](/img/docs/graph-viewer-search.png) | ![Selected memory inspector with tags, metadata, relationships, and expand-into-graph controls](/img/docs/graph-viewer-inspector.png) |

![Graph settings drawer showing clustering mode controls and display options](/img/docs/graph-viewer-settings-clustering.png)

---

## Key Features

### 3D Graph Canvas

The core visualization uses [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) with [d3-force-3d](https://github.com/vasturiano/d3-force-3d) to render memory nodes and relationship edges in a physics-based 3D layout. Nodes are colored and sized by memory type, importance, or custom attributes. Edges reflect relationship types (`RELATES_TO`, `LEADS_TO`, `EVOLVED_INTO`, etc.) with distinct visual styles from the canonical palette.

The **StatsBar** uses honest scope language throughout the app:

| Label | Meaning |
|-------|---------|
| **In view** | Memories loaded into the 3D scene (bounded overview + any expansions) |
| **In store** | Total memories on the server |

The overview loads the most important memories first (default 2,000 nodes). Completeness comes from exploration, not loading the entire corpus at once.

Force layout configuration options include:

| Parameter | Description |
|-----------|-------------|
| Charge strength | Repulsion between nodes |
| Link distance | Preferred edge length |
| Center gravity | Pull toward origin |
| Collision radius | Minimum node spacing |

### Expandable Graph

The `useExpandableGraph` hook maintains a live, growing graph on top of the immutable snapshot. Click **Expand into graph** in the Inspector to fetch a node's neighborhood via `/graph/neighbors` and merge it into the scene. New nodes get a transient arrival glow and frontier ring on the selected node; the most recent expansion can be undone with a single-level undo.

### Inspector Panel

Click any node to open the Inspector, which shows full memory details: content, type, confidence, tags, importance, timestamps, metadata, and connected relationships. You can edit importance, delete memories, expand neighborhoods, and start pathfinding from here. The panel is resizable via drag handles.

### Search & Triage

- **SearchBar** — Debounced search box with recent-search history. Tag-only queries filter the loaded graph client-side; text queries call whole-store semantic search via `/recall`.
- **SearchResultsList** — A triage surface over `/recall` results: sort by relevance, recency, or importance; filter by memory type; load off-graph matches into the scene with a **+ load** affordance. Clicking a result flies to an in-graph node or injects an off-graph one.

### Timeline & Time Travel

The **TimelineBar** lets you scrub through your memory graph's history. The `useTimeTravel` hook maintains temporal state so you can see how the graph evolved over time.

### Pathfinding

Select two nodes and the **PathfindingOverlay** computes and highlights the shortest path between them through the relationship graph, using the `usePathfinding` hook.

### Cluster Detection

Clustering modes group the graph spatially for legibility:

| Mode | Groups by |
|------|-----------|
| **By Type** | Memory type (Decision, Pattern, Insight, etc.) |
| **Tags** | Primary tag |
| **Semantic** | Strongly-connected relationship clusters |
| **By Entity** | Referenced entities (people, places, etc.) |

The `useClusterDetection` hook drives **ClusterBoundaries** and **ClusterLabels** around grouped subgraphs.

### Navigation

- **Breadcrumbs** — Back/forward through your node selection history (`useBreadcrumbs`)
- **MiniMap** — Viewport overview with zoom indicator
- **Keyboard navigation** via `useKeyboardNavigation`: arrow keys to traverse nodes, Enter to select, `/` to focus search, `?` for shortcuts help

### Hand Tracking Controls

Hand gesture controls are available from the hand icon in the toolbar (no environment variable required). When enabled:

- Pinch to select nodes
- Grab to pan/rotate the view
- Two-hand gestures for zoom and rotation
- Optional iPhone LiDAR hand-tracking bridge for local dev (`npm run dev:all`)

This feature is experimental and requires camera permission.

---

## Architecture

```
src/
├── App.tsx                    # Main app shell, state orchestration
├── api/
│   └── client.ts              # AutoMem API client (auth, fetch)
├── components/                # UI components
│   ├── GraphCanvas.tsx        # React Three Fiber 3D renderer
│   ├── Inspector.tsx          # Node detail panel + expand/delete
│   ├── SearchBar.tsx          # Search box (in-graph filter + /recall)
│   ├── SearchResultsList.tsx  # /recall triage surface
│   ├── TimelineBar.tsx        # Temporal scrubber
│   ├── PathfindingOverlay.tsx # Shortest-path visualization
│   ├── ClusterBoundaries.tsx  # Cluster boundary rendering
│   ├── ClusterLabels.tsx      # Cluster name labels
│   ├── StatsBar.tsx           # In-view vs in-store statistics
│   ├── MiniMap.tsx            # Overview minimap
│   ├── Breadcrumbs.tsx        # Selection history navigation
│   ├── TokenPrompt.tsx        # API token entry UI
│   └── settings/              # Force/display/cluster config
├── hooks/                     # React hooks (data, navigation, gestures)
│   ├── useGraphData.ts        # TanStack Query graph/recall fetches
│   ├── useExpandableGraph.ts  # Merge-on-expand graph model
│   ├── useAuth.ts             # Token management
│   ├── useForceLayout.ts      # Physics simulation config
│   ├── useTimeTravel.ts       # Temporal navigation
│   ├── usePathfinding.ts      # Shortest-path algorithm
│   ├── useClusterDetection.ts # Spatial clustering
│   ├── usePersistentState.ts  # Settings persisted to localStorage
│   └── ...
└── lib/
    ├── types.ts               # TypeScript type definitions
    ├── edgeStyles.ts          # Relationship visual styles
    ├── palette.ts             # Canonical type/edge colors
    └── sounds.ts              # UI sound effects
```

The app is a single-page React application built with Vite and TanStack Query. Settings (forces, display, clustering, relationships) persist via `usePersistentState`. The API client handles authentication and communicates with the AutoMem REST API.
