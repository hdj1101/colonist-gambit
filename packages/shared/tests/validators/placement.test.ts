import { describe, it, expect } from 'vitest';
import { generateBoard } from '../../src/maps/generator.js';
import {
  isValidSettlementPlacement,
  isValidRoadPlacement,
  isValidCityUpgrade,
} from '../../src/validators/placement.js';
import type { GameState } from '../../src/types/state.js';

function createMockGameState(): GameState {
  const board = generateBoard();
  return {
    id: 'test-game',
    config: {
      victoryPointsTarget: 10,
      turnTimerSeconds: 60,
      discardLimit: 7,
    },
    phase: 'ACTION_PHASE',
    turn: {
      activePlayerId: 'p1',
      turnNumber: 1,
      diceRoll: [3, 4],
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
        resources: { lumber: 5, brick: 5, wool: 5, grain: 5, ore: 5 },
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

describe('Rule Placement Validators (VAL-01 to VAL-05)', () => {
  it('VAL-01 & VAL-02: enforces Distance Rule for settlement placement', () => {
    const state = createMockGameState();
    const v1 = Object.keys(state.board.vertices)[0]!;
    const adjV = state.board.vertexAdjacentVertices[v1]![0]!;
    const farV = Object.keys(state.board.vertices).find(
      (v) => v !== v1 && !state.board.vertexAdjacentVertices[v1]!.includes(v)
    )!;

    // Place settlement on v1
    state.board.vertices[v1]!.building = { type: 'settlement', playerId: 'p1' };

    // Placing on adjacent vertex must fail distance rule
    const adjCheck = isValidSettlementPlacement(state, 'p2', adjV, true);
    expect(adjCheck.valid).toBe(false);
    expect(adjCheck.reason).toMatch(/distance rule/i);

    // Placing on distant vertex satisfies distance rule
    const farCheck = isValidSettlementPlacement(state, 'p2', farV, true);
    expect(farCheck.valid).toBe(true);
  });

  it('VAL-03: road placement requires network connectivity', () => {
    const state = createMockGameState();
    const v1 = Object.keys(state.board.vertices)[0]!;
    const edgeConnectedToV1 = state.board.vertexAdjacentEdges[v1]![0]!;
    const distantEdge = Object.keys(state.board.edges).find(
      (e) => !state.board.vertexAdjacentEdges[v1]!.includes(e)
    )!;

    // Place initial settlement for p1 on v1
    state.board.vertices[v1]!.building = { type: 'settlement', playerId: 'p1' };

    // Road connected to v1 should be valid
    const validRoad = isValidRoadPlacement(state, 'p1', edgeConnectedToV1);
    expect(validRoad.valid).toBe(true);

    // Distant unconnected edge should be invalid
    const invalidRoad = isValidRoadPlacement(state, 'p1', distantEdge);
    expect(invalidRoad.valid).toBe(false);
    expect(invalidRoad.reason).toMatch(/connect/i);
  });

  it('VAL-05: city upgrade succeeds only on owned settlements', () => {
    const state = createMockGameState();
    const v1 = Object.keys(state.board.vertices)[0]!;

    // Empty vertex fails
    expect(isValidCityUpgrade(state, 'p1', v1).valid).toBe(false);

    // Opponent settlement fails
    state.board.vertices[v1]!.building = { type: 'settlement', playerId: 'p2' };
    expect(isValidCityUpgrade(state, 'p1', v1).valid).toBe(false);

    // Player settlement succeeds
    state.board.vertices[v1]!.building = { type: 'settlement', playerId: 'p1' };
    expect(isValidCityUpgrade(state, 'p1', v1).valid).toBe(true);
  });
});
