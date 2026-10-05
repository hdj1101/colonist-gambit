# Colonist Gambit

A modular, full-stack, browser-based implementation of the classic Settlers of Catan board game featuring real-time multiplayer, an authoritative state machine, topological graph modeling, and a reactive SVG renderer.

---

## Features

- **Authoritative Server Architecture**: Real-time multiplayer powered by Socket.IO, with room lifecycle management, host delegation, and automatic reconnection handling.
- **Fog-of-War State Privacy**: Opponent hands, dev card deck order, and unplayed dev cards are securely masked on the server before client broadcast.
- **Isomorphic Domain Core**: Pure functional reducer (`applyAction`) with zero external dependencies, shared seamlessly across server and client.
- **Topological Hex Modeling**: Pointy-topped cube coordinate mathematics ($q + r + s = 0$) with deterministic canonical vertex and edge hashing.
- **Full Rules Enforcement**: Snake draft setup, strict Distance Rule validation, harvest distribution, 7-roll discard penalties, robber movements, development cards, and the Longest Road DFS pathfinding algorithm.
- **Responsive SVG Board Renderer**: Crisp vector rendering with dynamic legal move overlays and hit-box optimizations.

---

## Quickstart

### Prerequisites
- Node.js $\ge$ 18.0.0
- npm $\ge$ 9.0.0

### Installation & Testing
```bash
# Install dependencies across all monorepo packages
npm install

# Run test suites (vitest)
npm test

# Build all packages
npm run build
```

### Running Locally
```bash
# Terminal 1: Start the authoritative server (port 4000)
cd packages/server && npm run dev

# Terminal 2: Start the frontend client (port 5173)
cd packages/client && npm run dev
```

Navigate to `http://localhost:5173` to join or create a game room.

---

## Technical Documentation

Comprehensive architectural and engineering documentation is available in the [`docs/`](./docs/README.md) directory:

- [**Documentation Index**](./docs/README.md): Central documentation hub and reading guide.
- [**System Architecture**](./docs/architecture.md): Distributed topology, monorepo boundaries, reducer model, and state masking.
- [**Hexagonal Grid & Board Topology**](./docs/hex-grid-and-board.md): Cube coordinates math, pointy-topped projection matrix, canonical hashing, and graph adjacency structures.
- [**Game Engine & Rules Enforcement**](./docs/game-engine-and-rules.md): Phase state machine, snake draft, harvest engine, placement validators, dev cards, and Longest Road DFS.
- [**Networking & Multiplayer Protocol**](./docs/networking-and-protocol.md): Socket.IO event schema, room lifecycle, reconnection semantics, and state projection.
- [**Client Architecture & SVG Rendering**](./docs/client-and-rendering.md): React client structure, `useSocket` hook, 3-layer SVG canvas pipeline, and interaction modes.
- [**Development, Testing & Extensibility**](./docs/development-and-testing.md): Developer workflows, Vitest test suites, and guides for adding custom actions, maps, and AI bots.

---

## Monorepo Layout

```
colonist-gambit/
├── packages/
│   ├── shared/   # Pure TypeScript domain models, math, validators, and reducer
│   ├── server/   # Express + Socket.IO authoritative game server
│   └── client/   # React + Vite frontend client
├── docs/         # Comprehensive technical documentation suite
└── package.json  # Root npm workspace configuration
```
