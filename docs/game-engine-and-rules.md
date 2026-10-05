# Game Engine & Rules Enforcement

This document covers the state machine lifecycle, turn structure, placement validation algorithms, production mechanics, and victory condition evaluations implemented in `@colonist-gambit/shared`.

---

## 1. Game Phase Lifecycle State Machine

The game flows through discrete operational phases defined in `packages/shared/src/types/action.ts`:

```
               [ LOBBY ]
                   │
                   ▼ (START_GAME)
           [ SETUP_FORWARD ]
                   │
                   ▼ (Snake Draft Pivot at Player N)
           [ SETUP_BACKWARD ]
                   │
                   ▼ (Setup Complete)
┌──────────► [ TURN_START ] ◄──────────────────────────────┐
│                  │                                       │
│                  ├────────────► [ ROBBER_MOVE ]          │
│                  │            (Pre-Roll Knight)          │
│                  │                                       │
│                  ▼ (ROLL_DICE)                           │
│        ┌─────────┴─────────┐                             │
│        ▼ (Roll 7)          ▼ (Roll 2-6, 8-12)            │
│  [ DISCARD_PHASE ]   (Distribute Harvest)                │
│        │                   │                             │
│        ▼ (All Discarded)   │                             │
│  [ ROBBER_MOVE ]           │                             │
│        │                   │                             │
│        ▼ (Steal from adj)  │                             │
│  [ ROBBER_STEAL ]          │                             │
│        │                   │                             │
│        └─────────┬─────────┘                             │
│                  │                                       │
│                  ▼                                       │
│          [ ACTION_PHASE ] ───────────────────────────────┤ (END_TURN)
│            - Build Road / Settlement / City              │
│            - Buy / Play Dev Card                         │
│            - Bank / Maritime Trade                       │
│                  │                                       │
│                  ▼ (Player VP >= 10)                     │
└──────────► [ GAME_OVER ]                                 │
```

---

## 2. Initial Setup: Snake Draft Mechanics

Catan uses a snake draft sequence ($1 \to N$, then $N \to 1$) to balance turn order advantage:

### Phase 1: `SETUP_FORWARD`
- Forward iteration over `turnOrder` indices: $0, 1, \dots, N-1$.
- Active player performs two sub-steps:
  1. `PLACE_INITIAL_SETTLEMENT`: Validated against the Distance Rule. The vertex ID is recorded in `state.setupAnchorVertexId`.
  2. `PLACE_INITIAL_ROAD`: Must attach directly to the settlement just placed:
     ```typescript
     const incidentVertices = board.edgeAdjacentVertices[edgeId];
     if (!incidentVertices.includes(setupAnchorVertexId)) {
       return { valid: false, reason: 'Initial road must connect to initial settlement' };
     }
     ```
- When player $N-1$ finishes placing their road, the state reverses direction: `phase = 'SETUP_BACKWARD'`, and player $N-1$ immediately takes their turn again.

### Phase 2: `SETUP_BACKWARD` & Starting Resource Payout
- Backward iteration over `turnOrder` indices: $N-1, N-2, \dots, 0$.
- Active player places their second settlement and road.
- **Immediate Starting Payout**: When the second settlement is placed, the player is automatically awarded 1 resource card for every non-desert terrain touching that settlement's vertex:
  ```typescript
  const touchingHexCoords = state.board.vertices[action.vertexId]!.hexCoords;
  for (const coord of touchingHexCoords) {
    const hex = Object.values(state.board.hexes).find(
      (h) => h.coord.q === coord.q && h.coord.r === coord.r && h.coord.s === coord.s
    );
    if (hex && hex.terrain !== 'desert') {
      const res = hex.terrain as ResourceType;
      if (state.bank[res] > 0) {
        state.bank[res] -= 1;
        state.players[actingPlayerId]!.resources[res] += 1;
      }
    }
  }
  ```
- When player $0$ finishes placing their second road, setup completes: `phase = 'TURN_START'`, `turnNumber = 1`, and active player is reset to player $0$.

---

## 3. Production Engine & The Robber

### Harvesting (`distributeHarvest`)
When dice are rolled (`ROLL_DICE`) yielding a sum between 2 and 12 (excluding 7):
1. The engine scans all hexes where `hex.numberToken === roll`.
2. If `hex.hasRobber === true`, the tile is blocked and produces nothing.
3. For unblocked producing tiles, touching vertices are evaluated:
   - Settlement: receives **1** resource card.
   - City: receives **2** resource cards.
4. Cards are deducted from `state.bank` and credited to player inventories up to available bank stock.

### The 7 Roll & Discard Penalty (`calculatePendingDiscards`)
If the roll sum is 7:
1. Every player's hand count is checked against `discardLimit` (standard: 7):
   $$\text{totalHand} = \sum_{r \in \text{Resources}} \text{resources}[r]$$
2. If $\text{totalHand} > 7$, the player must discard half their cards rounded down:
   $$\text{cardsToDiscard} = \left\lfloor \frac{\text{totalHand}}{2} \right\rfloor$$
3. If any player exceeds the limit:
   - State enters `DISCARD_PHASE`.
   - `turn.pendingDiscards` maps `playerId -> cardsToDiscard`.
   - Players asynchronously submit `DISCARD_CARDS` actions.
4. When all pending discards are resolved, state transitions to `ROBBER_MOVE`.

### Robber Placement & Stealing
1. **`MOVE_ROBBER`**: Active player selects any new hex (`hexId !== robberHexId`).
   - The engine searches adjacent vertices of the new hex for opponent settlements or cities with $>0$ resource cards.
   - If eligible victims exist, phase becomes `ROBBER_STEAL`.
   - If no victims exist, phase transitions directly to `ACTION_PHASE` (or returns to `TURN_START` if Knight was played pre-roll).
2. **`STEAL_RESOURCE`**: Active player picks a target player. The engine randomly transfers 1 resource card from the victim to the active player.

---

## 4. Building Placement Validation

Validation rules are enforced in `packages/shared/src/validators/placement.ts`:

### The Distance Rule
A settlement or city may only be built on a vertex if **all adjacent vertices** are completely unoccupied by any building:

$$\forall v_{\text{adj}} \in \text{vertexAdjacentVertices}[v], \quad \text{board.vertices}[v_{\text{adj}}].\text{building} = \text{null}$$

### Settlement Placement (`isValidSettlementPlacement`)
1. Vertex must exist and be unoccupied.
2. Must satisfy the **Distance Rule**.
3. If not initial setup:
   - Player must have available settlements ($>0$).
   - Player must possess sufficient resources: `{ lumber: 1, brick: 1, wool: 1, grain: 1 }`.
   - Must connect to at least one of the player's existing roads:
     $$\exists e \in \text{vertexAdjacentEdges}[v] \text{ s.t. } \text{board.edges}[e].\text{road}.\text{playerId} = \text{playerId}$$

### Road Placement (`isValidRoadPlacement`)
1. Edge must exist and be unoccupied.
2. Player must have available roads ($>0$).
3. Player must possess `{ lumber: 1, brick: 1 }`.
4. Must connect to the player's existing road or building network without being blocked by an opponent's settlement/city:
   ```typescript
   const [v1, v2] = state.board.edgeAdjacentVertices[edgeId];
   const connectsToBuilding =
     state.board.vertices[v1]?.building?.playerId === playerId ||
     state.board.vertices[v2]?.building?.playerId === playerId;
   
   // Or connects via an adjacent road where the junction vertex is unblocked
   const connectsViaV1Road =
     canConnectViaV1 &&
     adjacentEdges(v1).some((eId) => isPlayerRoad(eId));
   ```

### City Upgrade (`isValidCityUpgrade`)
1. Target vertex must currently hold a `settlement` owned by the acting player.
2. Player must have available cities in inventory ($>0$).
3. Player must possess `{ grain: 2, ore: 3 }`.
4. Upgrading returns 1 settlement piece back to the player's available piece inventory.

---

## 5. Development Card Mechanics

### Deck Composition (25 Cards)
- 14 $\times$ Knight
- 5 $\times$ Victory Point (`victory_point`)
- 2 $\times$ Road Building (`road_building`)
- 2 $\times$ Year of Plenty (`year_of_plenty`)
- 2 $\times$ Monopoly (`monopoly`)

### Purchasing & Play Restrictions
- Cost: `{ wool: 1, grain: 1, ore: 1 }`.
- **Holding Rule**: A card purchased on turn $T$ cannot be played on turn $T$ (`turnPurchased < state.turn.turnNumber`).
- **Turn Limit**: Maximum of 1 development card may be played per turn (`turn.devCardPlayedThisTurn`).
- **Pre-Roll Knight**: Knights can uniquely be played in `TURN_START` before rolling the dice.

---

## 6. Longest Road: Depth-First Search Algorithm

The longest continuous road is computed using a recursive DFS with back-tracking in `packages/shared/src/engine/victory.ts`.

### Graph Traversal Rules
1. A path is a sequence of connected player road edges where **no edge is visited more than once** (simple path).
2. Road paths can branch; the algorithm searches all branches to find the maximal path length.
3. **Opponent Settlement Interruption**: If an opponent owns a settlement or city at vertex $V$, a player's road may connect *into* $V$, but cannot pass *through* $V$ to continue along subsequent edges.

### DFS Implementation

```typescript
function dfs(
  currentVertexId: VertexId,
  visitedEdges: Set<EdgeId>,
  currentLength: number
) {
  if (currentLength > maxPathLength) {
    maxPathLength = currentLength;
  }

  const incidentEdgeIds = state.board.vertexAdjacentEdges[currentVertexId] ?? [];
  for (const nextEdgeId of incidentEdgeIds) {
    if (visitedEdges.has(nextEdgeId)) continue;
    if (state.board.edges[nextEdgeId]?.road?.playerId !== playerId) continue;

    const [v1, v2] = state.board.edgeAdjacentVertices[nextEdgeId]!;
    const nextVertexId = v1 === currentVertexId ? v2 : v1;

    // Check if path can pass through nextVertexId
    const occupant = state.board.vertices[nextVertexId]?.building;
    const isBlockedByOpponent = occupant && occupant.playerId !== playerId;

    visitedEdges.add(nextEdgeId);

    if (isBlockedByOpponent) {
      // Endpoint reached; cannot branch further through this vertex
      if (currentLength + 1 > maxPathLength) {
        maxPathLength = currentLength + 1;
      }
    } else {
      dfs(nextVertexId, visitedEdges, currentLength + 1);
    }

    visitedEdges.delete(nextEdgeId); // Backtrack
  }
}
```

### Usurping Special Cards
- **Longest Road Card (+2 VP)**: Requires a minimum road length of **5**. To take the card from an existing holder, a player must **strictly exceed** the holder's road length:
  $$\text{length}_{\text{challenger}} > \text{length}_{\text{holder}}$$
- **Largest Army Card (+2 VP)**: Requires a minimum of **3** played knights. To usurp, a player must strictly exceed the holder's played knight count.

---

## 7. Victory Condition Evaluation

At the conclusion of every action, `evaluateVictoryPoints(state)` calculates public and hidden points:

$$\text{VP}_{\text{total}} = \text{Settlements} \times 1 + \text{Cities} \times 2 + \text{LongestRoad} (2) + \text{LargestArmy} (2) + \text{HiddenVPCards} \times 1$$

When $\text{VP}_{\text{total}} \ge 10$ on the active player's turn, `state.winnerPlayerId` is recorded and `state.phase` transitions to `'GAME_OVER'`.
