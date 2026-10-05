# Client Architecture & SVG Rendering

This document details the frontend architecture, reactive socket integration, and SVG rendering pipeline implemented in `packages/client`.

---

## 1. Client Architecture Overview

The client is built with **React 18** and **Vite** in TypeScript:

```
packages/client/src/
├── canvas/
│   └── BoardRenderer.tsx     # SVG rendering pipeline for board, pieces, and legal targets
├── components/
│   ├── DiscardModal.tsx      # Modal for allocating card discards on roll of 7
│   ├── StealModal.tsx        # Modal for selecting adjacent player to rob
│   ├── ResourceBar.tsx       # Bottom HUD displaying active inventory
│   └── Lobby.tsx             # Pre-game room matchmaking and ready room
├── hooks/
│   └── useSocket.ts          # Encapsulated Socket.IO communication lifecycle
├── App.tsx                   # Master view router, interaction states, and HUD controls
└── main.tsx                  # React DOM mounting entrypoint
```

---

## 2. Networking State Hook: `useSocket`

All network communication is isolated within the custom hook `useSocket` in `packages/client/src/hooks/useSocket.ts`:

```typescript
export function useSocket(serverUrl: string = 'http://localhost:4000') {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<MaskedGameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  // ... callbacks for joinRoom, leaveRoom, setReady, startGame, dispatchAction
}
```

### Hook Responsibilities
1. **Connection Lifecycle**: Maintains the persistent WebSocket connection, tracking `connected` status.
2. **State Updates**: Listens for `LOBBY_STATE_UPDATE` and `GAME_STATE_UPDATE`, storing them in reactive React state.
3. **Promise-Wrapped Actions**: Wraps Socket.IO acknowledgement callbacks in asynchronous Promises, allowing calling components to `await dispatchAction(...)` and handle rejected intents or error banners.

---

## 3. SVG Board Rendering Pipeline: `BoardRenderer`

The board is rendered declaratively as a scalable vector graphic (`<svg>`) rather than an HTML5 Canvas bitmap, providing crisp vector edges at any resolution, declarative CSS hover styling, and native SVG event handling.

### Geometry & Coordinate Setup
- **ViewBox**: `0 0 840 720` (aspect ratio 7:6).
- **Hex Circumradius ($R$)**: `56` pixels.
- **Center Offset**: `(420, 360)` pixels, centering coordinate `(0, 0, 0)` in the viewport.

### Layered Rendering Hierarchy

```
<svg viewBox="0 0 840 720">
  <defs> ... </defs>
  
  <!-- LAYER 1: Base Terrain & Hex Tiles -->
  <g id="hex-tiles">
    <polygon />       <!-- Terrain fill & stroke -->
    <circle />        <!-- Number token chit -->
    <text />          <!-- Number value (2-12) -->
    <circle />        <!-- Robber token (if present) -->
  </g>

  <!-- LAYER 2: Roads & Legal Edge Targets -->
  <g id="edges">
    <line />          <!-- Built player road -->
    <line />          <!-- Selectable target dashed overlay -->
    <line />          <!-- Transparent fat hit area (stroke 16) -->
  </g>

  <!-- LAYER 3: Buildings & Legal Vertex Targets -->
  <g id="vertices">
    <circle />        <!-- Upgrade selection indicator -->
    <polygon />       <!-- Settlement piece (5-point roof) -->
    <polygon />       <!-- City piece (stepped skyline) -->
    <circle />        <!-- Selectable vacant vertex dot -->
  </g>
</svg>
```

---

## 4. Layer Implementations

### Layer 1: Hex Tiles (`<g id="hex-tiles">`)
- **Polygon Points**: Generated via `getHexCornerPixels({ x, y }, HEX_RADIUS)`.
- **Terrain Color Palette**:
  - Lumber: Forest Green (`#2e7d32`)
  - Brick: Terracotta Red (`#c62828`)
  - Wool: Pasture Green (`#8bc34a`)
  - Grain: Golden Wheat (`#fbc02d`)
  - Ore: Slate Mountain (`#78909c`)
  - Desert: Warm Sand (`#d7ccc8`)
- **Number Tokens**: Circular chit (`fill="#fffff0"`) centered on the hex. Tokens with numbers **6** and **8** are styled with `#e53e3e` (high-frequency roll indicators).

### Layer 2: Edges & Roads (`<g id="edges">`)
- **Road Geometry**: Drawn as a line between vertex 1 and vertex 2 with `strokeWidth = 7` and `strokeLinecap = "round"`.
- **Road Color Resolution**:
  ```typescript
  const getPlayerColor = (playerId?: string): string => {
    const mapped = playerColors[playerId];
    return PLAYER_COLORS[mapped] || mapped || '#cbd5e0';
  };
  ```
- **Hit Testing & Target Selection**: To ensure edges are easily clickable on both touchscreens and desktop mice:
  1. A dashed indicator is drawn: `stroke="#f6e05e"`, `strokeWidth=6`, `strokeDasharray="6 3"`.
  2. A transparent hit-box overlay line is rendered directly on top with `stroke="transparent"`, `strokeWidth=16`, and `cursor="pointer"`.

### Layer 3: Vertices & Buildings (`<g id="vertices">`)
- **Settlement Geometry**: A 5-point polygon representing a gabled house:
  ```typescript
  // Points: roof peak, right eave, right foundation, left foundation, left eave
  `${vx},${vy - 9} ${vx + 8},${vy - 3} ${vx + 8},${vy + 7} ${vx - 8},${vy + 7} ${vx - 8},${vy - 3}`
  ```
- **City Geometry**: An 8-point stepped polygon representing a fortress skyline:
  ```typescript
  `${vx - 10},${vy - 3} ${vx - 5},${vy - 11} ${vx},${vy - 3} ${vx + 10},${vy - 3} ${vx + 10},${vy + 8} ${vx - 10},${vy + 8}`
  ```
- **Selectable Vertices**: Rendered as glowing gold circles (`r = 9`, `fill = "#f6e05e"`, `stroke = "#ffffff"`, `opacity = 0.9`).

---

## 5. UI Interaction Flow & Modes

In `packages/client/src/App.tsx`, player interactions are governed by an `interactionMode` state machine:

```typescript
type InteractionMode =
  | 'NONE'
  | 'PLACE_SETTLEMENT'
  | 'PLACE_ROAD'
  | 'UPGRADE_CITY'
  | 'MOVE_ROBBER';
```

### Computing Legal Placement Overlays
Whenever the active player's turn begins or the interaction mode changes, legal moves are pre-computed in real-time by evaluating shared validators against the client's current view:

```typescript
if (interactionMode === 'PLACE_ROAD') {
  selectableEdges = Object.keys(gameState.board.edges).filter(
    (eId) => isValidRoadPlacement(validationState, myPlayerId, eId, false).valid
  );
} else if (interactionMode === 'PLACE_SETTLEMENT') {
  selectableVertices = Object.keys(gameState.board.vertices).filter(
    (vId) => isValidSettlementPlacement(validationState, myPlayerId, vId, false).valid
  );
} else if (interactionMode === 'UPGRADE_CITY') {
  selectableVertices = Object.keys(gameState.board.vertices).filter(
    (vId) => isValidCityUpgrade(validationState, myPlayerId, vId).valid
  );
}
```

The resulting arrays (`selectableVertices`, `selectableEdges`, `selectableHexes`) are passed down to `BoardRenderer`, which illuminates only the legal targets on screen. Clicking an illuminated target dispatches the corresponding `GameAction` and resets `interactionMode` back to `'NONE'`.
