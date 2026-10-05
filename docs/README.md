# Colonist Gambit Documentation

Welcome to the technical documentation for **Colonist Gambit**, a modular, full-stack, browser-based implementation of the classic Settlers of Catan board game featuring real-time multiplayer, an authoritative state engine, topological graph modeling, and a reactive SVG renderer.

---

## Documentation Index

The documentation is organized into modular guides covering each facet of the system:

| Document | Description |
|---|---|
| [**System Architecture**](./architecture.md) | High-level distributed system design, monorepo boundaries, authoritative server model, pure reducer architecture, and privacy-preserving state masking. |
| [**Hexagonal Grid & Board Topology**](./hex-grid-and-board.md) | Cube coordinate mathematics, pointy-topped screen projections, canonical topological hashing, dual-adjacency graph indices, and procedural map generation. |
| [**Game Engine & Rules Enforcement**](./game-engine-and-rules.md) | Phase lifecycle state machine, snake draft setup, building placement validation, harvest engine, robber mechanics, and the Longest Road DFS algorithm. |
| [**Networking & Multiplayer Protocol**](./networking-and-protocol.md) | Socket.IO event contracts, room lifecycle, host delegation, connection resilience, and client-specific view projection (`GameState` $\to$ `MaskedGameState`). |
| [**Client Architecture & SVG Rendering**](./client-and-rendering.md) | React frontend architecture, `useSocket` state synchronization hook, 3-layer SVG canvas pipeline, hit testing, and interactive HUD controls. |
| [**Development, Testing & Extensibility**](./development-and-testing.md) | Workspace setup, dev commands, Vitest test suites, and step-by-step guides for adding custom actions, boards, and automated AI players. |

---

## Repository Layout

Colonist Gambit is structured as an npm workspaces monorepo:

```
colonist-gambit/
├── packages/
│   ├── shared/            # Pure TypeScript domain models, math, validators, and reducer
│   │   ├── src/
│   │   │   ├── constants/ # Game constants (building costs, piece limits, card decks)
│   │   │   ├── engine/    # applyAction reducer, harvest production, victory point evaluator
│   │   │   ├── maps/      # Cube coordinates math, canonical hashing, spiral board generator
│   │   │   ├── types/     # Core domain types (GameState, Action, Board, Player, Resources)
│   │   │   └── validators/# Placement validators (Distance Rule, road connectivity)
│   │   └── tests/         # Unit test suites (vitest)
│   ├── server/            # Express + Socket.IO authoritative game server
│   │   ├── src/
│   │   │   ├── game/      # GameInstance wrapper, privacy masking logic
│   │   │   ├── rooms/     # Room and RoomManager lifecycle classes
│   │   │   ├── socket/    # Socket.IO connection and event dispatch handlers
│   │   │   └── index.ts   # Server bootstrap and HTTP health endpoints
│   │   └── tests/         # Integration test suites for rooms, masking, and sockets
│   └── client/            # React + Vite frontend client
│       ├── src/
│       │   ├── canvas/    # BoardRenderer SVG canvas component
│       │   ├── components/# UI components (Lobby, ResourceBar, DiscardModal, StealModal)
│       │   ├── hooks/     # useSocket networking hook
│       │   ├── App.tsx    # Root game loop and UI orchestration
│       │   └── main.tsx   # React root entrypoint
├── docs/                  # Technical documentation suite
└── package.json           # Root workspace configuration
```

---

## Architectural Highlights

- **Pure Functional Reducer Engine (`@colonist-gambit/shared`)**: All state mutations are handled by `applyAction(prevState, action, actingPlayerId, rng)`. The engine contains zero network, DOM, or framework dependencies, enabling identical logic to run on the server, client (for optimistic prediction), or headless simulations (for AI bots).
- **Coordinate Space Invariance**: Utilizes 3D Cube coordinates $(q, r, s)$ with the invariant $q + r + s = 0$. This eliminates coordinate asymmetry and simplifies vector math, neighbor lookups, and distance calculations.
- **Topological Canonical Hashing**: Vertices and edges are identified by deterministic string hashes derived from sorted adjacent hex coordinates, preventing spatial floating-point rounding errors and duplicate representations at tile boundaries.
- **Authoritative Server with Fog-of-War Masking**: Raw game state is kept private on the server. Opponent hands and unplayed development cards are masked into count aggregates before broadcast over Socket.IO, preventing client-side inspection or cheating.
- **Layered SVG Rendering**: A performant, dependency-free SVG rendering pipeline projects mathematical cube coordinates to screen pixels with custom hit-test areas, interactive dashed paths, and drop-shadow aesthetics.

---

## Recommended Reading Paths

- **If you are building new game features or rules**: Start with [System Architecture](./architecture.md), read [Hexagonal Grid & Board Topology](./hex-grid-and-board.md), and follow [Game Engine & Rules Enforcement](./game-engine-and-rules.md).
- **If you are working on UI or rendering**: Read [Hexagonal Grid & Board Topology](./hex-grid-and-board.md) (specifically screen projection) and [Client Architecture & SVG Rendering](./client-and-rendering.md).
- **If you are working on multiplayer or backend services**: Read [System Architecture](./architecture.md) and [Networking & Multiplayer Protocol](./networking-and-protocol.md).
- **If you are setting up tests or preparing a PR**: Check [Development, Testing & Extensibility](./development-and-testing.md).
