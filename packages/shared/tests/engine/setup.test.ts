import { describe, it, expect } from 'vitest';
import { generateBoard } from '../../src/maps/generator.js';
import { applyAction } from '../../src/engine/applyAction.js';
import type { GameState } from '../../src/types/state.js';

function createInitialSetupState(): GameState {
  const board = generateBoard();
  return {
    id: 'setup-game',
    config: {
      victoryPointsTarget: 10,
      turnTimerSeconds: 60,
      discardLimit: 7,
    },
    phase: 'SETUP_FORWARD',
    setupStep: 'SETTLEMENT',
    setupPlayerIndex: 0,
    turn: {
      activePlayerId: 'p1',
      turnNumber: 0,
      diceRoll: null,
      hasRolled: false,
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
        availablePieces: { roads: 15, settlements: 5, cities: 4 },
        stats: { longestRoadLength: 0, playedKnightsCount: 0, victoryPoints: 0 },
        connected: true,
      },
      p2: {
        id: 'p2',
        name: 'Player 2',
        color: 'blue',
        resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 },
        devCards: { unplayed: [], played: [] },
        availablePieces: { roads: 15, settlements: 5, cities: 4 },
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

describe('Setup Draft State Machine (SETUP-01 to SETUP-05)', () => {
  it('executes 2-player snake draft with round 2 resource distribution', () => {
    let state = createInitialSetupState();
    const vertices = Object.keys(state.board.vertices);

    // Pick 4 disjoint vertices for p1 and p2 setup
    const v_p1_1 = vertices[0]!;
    const e_p1_1 = state.board.vertexAdjacentEdges[v_p1_1]![0]!;

    const v_p2_1 = vertices[10]!;
    const e_p2_1 = state.board.vertexAdjacentEdges[v_p2_1]![0]!;

    const v_p2_2 = vertices[20]!;
    const e_p2_2 = state.board.vertexAdjacentEdges[v_p2_2]![0]!;

    const v_p1_2 = vertices[30]!;
    const e_p1_2 = state.board.vertexAdjacentEdges[v_p1_2]![0]!;

    // 1. P1 places 1st settlement
    let res = applyAction(state, { type: 'PLACE_INITIAL_SETTLEMENT', vertexId: v_p1_1 }, 'p1');
    expect(res.success).toBe(true);
    state = (res as any).state;
    expect(state.setupStep).toBe('ROAD');
    expect(state.setupAnchorVertexId).toBe(v_p1_1);

    // 2. P1 places 1st road
    res = applyAction(state, { type: 'PLACE_INITIAL_ROAD', edgeId: e_p1_1 }, 'p1');
    expect(res.success).toBe(true);
    state = (res as any).state;
    expect(state.setupStep).toBe('SETTLEMENT');
    expect(state.setupPlayerIndex).toBe(1); // advances to p2
    expect(state.turn.activePlayerId).toBe('p2');
    expect(state.setupAnchorVertexId).toBeUndefined();

    // 3. P2 places 1st settlement
    res = applyAction(state, { type: 'PLACE_INITIAL_SETTLEMENT', vertexId: v_p2_1 }, 'p2');
    expect(res.success).toBe(true);
    state = (res as any).state;
    expect(state.setupAnchorVertexId).toBe(v_p2_1);

    // 4. P2 places 1st road (triggers snake reversal at p2)
    res = applyAction(state, { type: 'PLACE_INITIAL_ROAD', edgeId: e_p2_1 }, 'p2');
    expect(res.success).toBe(true);
    state = (res as any).state;
    expect(state.phase).toBe('SETUP_BACKWARD');
    expect(state.setupPlayerIndex).toBe(1); // p2 goes again!
    expect(state.turn.activePlayerId).toBe('p2');

    // 5. P2 places 2nd settlement -> receives starting resources
    res = applyAction(state, { type: 'PLACE_INITIAL_SETTLEMENT', vertexId: v_p2_2 }, 'p2');
    expect(res.success).toBe(true);
    state = (res as any).state;
    const p2ResCount = Object.values(state.players['p2']!.resources).reduce((a, b) => a + b, 0);
    expect(p2ResCount).toBeGreaterThan(0);

    // 6. P2 places 2nd road
    res = applyAction(state, { type: 'PLACE_INITIAL_ROAD', edgeId: e_p2_2 }, 'p2');
    expect(res.success).toBe(true);
    state = (res as any).state;
    expect(state.setupPlayerIndex).toBe(0); // advances back to p1
    expect(state.turn.activePlayerId).toBe('p1');

    // 7. P1 places 2nd settlement
    res = applyAction(state, { type: 'PLACE_INITIAL_SETTLEMENT', vertexId: v_p1_2 }, 'p1');
    expect(res.success).toBe(true);
    state = (res as any).state;

    // 8. P1 places 2nd road -> completes setup and enters TURN_START
    res = applyAction(state, { type: 'PLACE_INITIAL_ROAD', edgeId: e_p1_2 }, 'p1');
    expect(res.success).toBe(true);
    state = (res as any).state;

    expect(state.phase).toBe('TURN_START');
    expect(state.turn.activePlayerId).toBe('p1');
    expect(state.turn.turnNumber).toBe(1);
    expect(state.turn.hasRolled).toBe(false);
  });
});
