import { describe, it, expect } from 'vitest';
import { generateBoard } from '../../src/maps/generator.js';
import { calculateLongestRoadForPlayer, evaluateVictoryPoints } from '../../src/engine/victory.js';
import type { GameState } from '../../src/types/state.js';

function createRoadGraphState(): GameState {
  const board = generateBoard();
  return {
    id: 'road-game',
    config: {
      victoryPointsTarget: 10,
      turnTimerSeconds: 60,
      discardLimit: 7,
    },
    phase: 'ACTION_PHASE',
    turn: {
      activePlayerId: 'p1',
      turnNumber: 1,
      diceRoll: [2, 3],
      hasRolled: true,
      devCardPlayedThisTurn: false,
      pendingDiscards: {},
    },
    board,
    players: {
      p1: {
        id: 'p1',
        name: 'Player 1',
        color: 'red',
        resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 },
        devCards: { unplayed: [], played: [] },
        availablePieces: { roads: 10, settlements: 5, cities: 4 },
        stats: { longestRoadLength: 0, playedKnightsCount: 0, victoryPoints: 0 },
        connected: true,
      },
      p2: {
        id: 'p2',
        name: 'Player 2',
        color: 'blue',
        resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 },
        devCards: { unplayed: [], played: [] },
        availablePieces: { roads: 10, settlements: 5, cities: 4 },
        stats: { longestRoadLength: 0, playedKnightsCount: 0, victoryPoints: 0 },
        connected: true,
      },
    },
    turnOrder: ['p1', 'p2'],
    bank: { lumber: 19, brick: 19, wool: 19, grain: 19, ore: 19 },
    devCardDeck: [],
    longestRoadPlayerId: null,
    largestArmyPlayerId: null,
    winnerPlayerId: null,
    activeTrade: null,
    actionLog: [],
  };
}

describe('Longest Road & Victory Invariants (LR-01 to LR-05)', () => {
  it('LR-01 & LR-05: calculates continuous simple road length along connected edges', () => {
    const state = createRoadGraphState();

    // Pick 5 consecutive connected edges on board
    const v0 = Object.keys(state.board.vertices)[0]!;
    const e0 = state.board.vertexAdjacentEdges[v0]![0]!;
    const [v0_a, v0_b] = state.board.edgeAdjacentVertices[e0]!;
    const v1 = v0_a === v0 ? v0_b : v0_a;

    const e1 = state.board.vertexAdjacentEdges[v1]!.find((e) => e !== e0)!;
    const [v1_a, v1_b] = state.board.edgeAdjacentVertices[e1]!;
    const v2 = v1_a === v1 ? v1_b : v1_a;

    const e2 = state.board.vertexAdjacentEdges[v2]!.find((e) => e !== e1)!;
    const [v2_a, v2_b] = state.board.edgeAdjacentVertices[e2]!;
    const v3 = v2_a === v2 ? v2_b : v2_a;

    const e3 = state.board.vertexAdjacentEdges[v3]!.find((e) => e !== e2)!;
    const [v3_a, v3_b] = state.board.edgeAdjacentVertices[e3]!;
    const v4 = v3_a === v3 ? v3_b : v3_a;

    const e4 = state.board.vertexAdjacentEdges[v4]!.find((e) => e !== e3)!;

    // Assign 5 consecutive roads to p1
    for (const e of [e0, e1, e2, e3, e4]) {
      state.board.edges[e]!.road = { playerId: 'p1' };
    }

    const roadLength = calculateLongestRoadForPlayer(state, 'p1');
    expect(roadLength).toBe(5);

    // Evaluate victory points: p1 should claim Longest Road card (+2 VP)
    evaluateVictoryPoints(state);
    expect(state.longestRoadPlayerId).toBe('p1');
    expect(state.players['p1']!.stats.victoryPoints).toBe(2);

    // LR-04: If an opponent places a settlement in the middle (v2), the road is broken
    state.board.vertices[v2]!.building = { type: 'settlement', playerId: 'p2' };
    const brokenLength = calculateLongestRoadForPlayer(state, 'p1');
    expect(brokenLength).toBeLessThan(5);

    evaluateVictoryPoints(state);
    // Longest road card is revoked because nobody has >= 5 anymore
    expect(state.longestRoadPlayerId).toBeNull();
  });
});
