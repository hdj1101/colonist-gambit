# Development, Testing & Extensibility

This guide covers local development setup, the Vitest test architecture, and step-by-step instructions for extending **Colonist Gambit** with custom rules, actions, and bot integrations.

---

## 1. Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation
Clone the repository and install all dependencies across monorepo workspaces:

```bash
git clone https://github.com/your-username/colonist-gambit.git
cd colonist-gambit
npm install
```

### Running Locally

To run the full stack locally in development mode:

1. **Start the Authoritative Server** (runs on port 4000):
   ```bash
   cd packages/server
   npm run dev
   ```

2. **Start the React Frontend Client** (runs on port 5173 by default):
   ```bash
   cd packages/client
   npm run dev
   ```

Open your browser at `http://localhost:5173` to join a game room.

---

## 2. Test Architecture

The project uses [Vitest](https://vitest.dev/) for unit and integration testing across `@colonist-gambit/shared` and `@colonist-gambit/server`.

### Running Tests

Execute all test suites across all workspaces:

```bash
npm test
```

To run tests in a specific package:

```bash
npm test -w @colonist-gambit/shared
npm test -w @colonist-gambit/server
```

### Test Suite Directory

#### `@colonist-gambit/shared` Tests
- **`coordinates.test.ts`**: Verifies cube invariant ($q + r + s = 0$), conversions to/from axial, 6 direction vectors, and screen pixel projection formulas.
- **`canonical.test.ts`**: Tests deterministic vertex string hashing (`getCanonicalVertexId`) across varying orderings, and edge ID canonical sorting.
- **`placement.test.ts`**: Tests the Distance Rule for settlement placements, road connectivity checks, and city upgrade requirements.
- **`setup.test.ts`**: Verifies the snake draft state machine (1 $\to$ $N$, $N \to 1$) and initial starting resource distribution upon placing the second settlement.
- **`robber_knight.test.ts`**: Verifies dice roll 7 behavior, `calculatePendingDiscards` for hands $>7$, robber movements, resource stealing, and pre-roll/post-roll Knight plays.
- **`victory.test.ts`**: Verifies the Longest Road DFS pathfinding algorithm against cyclic graphs, branching roads, and opponent settlement interruptions, as well as victory point thresholds.

#### `@colonist-gambit/server` Tests
- **`rooms.test.ts`**: Verifies room creation, player slot limits ($\le 4$), color uniqueness enforcement, host assignment, and ready state logic.
- **`masking.test.ts`**: Asserts that `maskGameStateForPlayer` strictly redacts opponent hands into counts, hides the dev card deck order, and exposes private unplayed cards only to the owning player.
- **`socketIntegration.test.ts`**: Spins up an in-memory Socket.IO client and server to verify real-time event dispatching, room joins, game starts, and state updates end-to-end.

---

## 3. Extensibility Guide

### Recipe A: Adding a New Game Action

To add a new action (e.g. `OFFER_TRADE` or `BUY_ROAD`):

1. **Define the Action Type**:
   In `packages/shared/src/types/action.ts`, append the new action to the `GameAction` discriminated union:
   ```typescript
   export type GameAction =
     | ...
     | { type: 'SPECIAL_ACTION'; param: string };
   ```

2. **Handle the Action in the State Reducer**:
   In `packages/shared/src/engine/applyAction.ts`, add a new case to the `applyAction` switch block:
   ```typescript
   case 'SPECIAL_ACTION': {
     if (state.phase !== 'ACTION_PHASE') {
       return { success: false, error: 'Cannot perform special action in this phase' };
     }
     // Validate preconditions
     // Mutate cloned state
     return { success: true, state };
   }
   ```

3. **Add Unit Tests**:
   Create a test case in `packages/shared/tests/engine/` asserting both successful transitions and rejection of invalid intents.

4. **Integrate into the Client**:
   In `packages/client/src/App.tsx`, wire up a button or interaction handler that calls:
   ```typescript
   dispatchAction({ type: 'SPECIAL_ACTION', param: 'example' });
   ```

---

### Recipe B: Creating Custom Maps and Layouts

Board generation is decoupled from the game loop. To create custom board configurations (e.g. 5–6 player expansion or custom scenarios):

1. Inspect `MapConfig` in `packages/shared/src/maps/generator.ts`:
   ```typescript
   export interface MapConfig {
     radius: number; // 2 for standard (19 hexes), 3 for 5-6 player (37 hexes)
     terrainCounts: Record<TerrainType, number>;
     numberTokens: number[];
     harbors?: { vertexA: VertexId; vertexB: VertexId; harbor: Harbor }[];
   }
   ```
2. Pass custom `terrains` and `tokens` arrays into `generateBoard(customTerrains, customTokens)`.
3. The graph indexing algorithms (`getVertexIdForHexCorner`, `getCanonicalEdgeId`, adjacency maps) will automatically construct the corresponding topological graph regardless of radius or terrain arrangement.

---

### Recipe C: Implementing Headless AI / Bot Players

Because `@colonist-gambit/shared` has zero dependencies on Node.js or browser DOM APIs:
1. An AI bot can run directly inside the server process or in a worker thread.
2. The bot can clone the current `GameState` and evaluate candidate moves by running `applyAction` in simulation mode:
   ```typescript
   const candidateMoves: GameAction[] = [...];
   for (const action of candidateMoves) {
     const result = applyAction(state, action, botPlayerId);
     if (result.success) {
       const score = heuristicEvaluate(result.state, botPlayerId);
       // Select highest-scoring action
     }
   }
   ```
3. Once decided, the bot simply calls `gameInstance.dispatchAction(bestAction, botPlayerId)`.
