import { describe, it, expect } from 'vitest';
import { generateBoard } from '../../src/maps/generator.js';
import { applyAction } from '../../src/engine/applyAction.js';
import type { GameState } from '../../src/types/state.js';

function createActiveTurnState(): GameState {
  const board = generateBoard();
  return {
    id: 'turn-game',
    config: {
      victoryPointsTarget: 10,
      turnTimerSeconds: 60,
      discardLimit: 7,
    },
    phase: 'TURN_START',
    turn: {
      activePlayerId: 'p1',
      turnNumber: 2,
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
        resources: { lumber: 2, brick: 2, wool: 2, grain: 2, ore: 2 }, // 10 cards total (> 7)
        devCards: {
          unplayed: [{ type: 'knight', turnPurchased: 1 }],
          played: [],
        },
        availablePieces: { roads: 15, settlements: 5, cities: 4 },
        stats: { longestRoadLength: 0, playedKnightsCount: 0, victoryPoints: 0 },
        connected: true,
      },
      p2: {
        id: 'p2',
        name: 'Player 2',
        color: 'blue',
        resources: { lumber: 8, brick: 0, wool: 0, grain: 0, ore: 0 }, // 8 cards total (> 7)
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

describe('Dice Roll, Discards & Robber (ROB-01 to ROB-07)', () => {
  it('ROB-02 & ROB-03: roll 7 triggers DISCARD_PHASE with floor(N/2) requirement', () => {
    let state = createActiveTurnState();

    // Force dice roll to 7 (3 + 4)
    let rollCall = 0;
    const res = applyAction(state, { type: 'ROLL_DICE' }, 'p1', () => {
      rollCall++;
      return rollCall === 1 ? 0.4 : 0.6; // die 1: floor(0.4*6)+1 = 3; die 2: floor(0.6*6)+1 = 4 -> roll = 7
    });
    expect(res.success).toBe(true);
    state = (res as any).state;

    expect(state.phase).toBe('DISCARD_PHASE');
    // P1 had 10 cards -> must discard floor(10/2) = 5
    expect(state.turn.pendingDiscards['p1']).toBe(5);
    // P2 had 8 cards -> must discard floor(8/2) = 4
    expect(state.turn.pendingDiscards['p2']).toBe(4);

    // P1 discards 5 cards
    const d1 = applyAction(
      state,
      {
        type: 'DISCARD_CARDS',
        cards: { lumber: 1, brick: 1, wool: 1, grain: 1, ore: 1 },
      },
      'p1'
    );
    expect(d1.success).toBe(true);
    state = (d1 as any).state;
    expect(state.turn.pendingDiscards['p1']).toBeUndefined();
    expect(state.phase).toBe('DISCARD_PHASE'); // still waiting for P2

    // P2 discards 4 lumber
    const d2 = applyAction(
      state,
      {
        type: 'DISCARD_CARDS',
        cards: { lumber: 4 },
      },
      'p2'
    );
    expect(d2.success).toBe(true);
    state = (d2 as any).state;

    // Both done -> transitions to ROBBER_MOVE
    expect(state.phase).toBe('ROBBER_MOVE');
  });
});

describe('Pre-Roll vs Post-Roll Knight (KNG-01 to KNG-05)', () => {
  it('KNG-01 & KNG-02: playing Knight in TURN_START resolves robber and returns to TURN_START', () => {
    let state = createActiveTurnState();
    expect(state.phase).toBe('TURN_START');

    // 1. P1 plays Knight prior to roll
    const playRes = applyAction(
      state,
      {
        type: 'PLAY_DEV_CARD',
        payload: { cardType: 'knight' },
      },
      'p1'
    );
    expect(playRes.success).toBe(true);
    state = (playRes as any).state;

    expect(state.phase).toBe('ROBBER_MOVE');
    expect(state.turn.robberReturnPhase).toBe('TURN_START');
    expect(state.turn.devCardPlayedThisTurn).toBe(true);
    expect(state.players['p1']!.stats.playedKnightsCount).toBe(1);

    // 2. Move robber to an unoccupied hex
    const targetHex = Object.keys(state.board.hexes).find(
      (hId) => hId !== state.board.robberHexId
    )!;

    const moveRes = applyAction(state, { type: 'MOVE_ROBBER', hexId: targetHex }, 'p1');
    expect(moveRes.success).toBe(true);
    state = (moveRes as any).state;

    // Should return to TURN_START awaiting the dice roll!
    expect(state.phase).toBe('TURN_START');
    expect(state.turn.hasRolled).toBe(false);
  });
});
