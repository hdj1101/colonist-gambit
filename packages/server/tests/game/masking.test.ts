import { describe, it, expect } from 'vitest';
import { GameInstance } from '../../src/game/GameInstance.js';
import { maskGameStateForPlayer } from '../../src/game/masking.js';

describe('Server Masking & Information Hiding (SEC-01 to SEC-04)', () => {
  it('SEC-01 to SEC-04: hides opponent resource hands and dev cards while preserving own cards', () => {
    const game = new GameInstance('test-game', [
      { id: 'p1', name: 'Player 1', color: 'red', socketId: 'sock-1' },
      { id: 'p2', name: 'Player 2', color: 'blue', socketId: 'sock-2' },
    ]);

    const rawState = game.getRawState();

    // Give P1 secret resources & an unplayed knight
    rawState.players['p1']!.resources = { lumber: 2, brick: 1, wool: 0, grain: 0, ore: 0 };
    rawState.players['p1']!.devCards.unplayed = [{ type: 'knight', turnPurchased: 1 }];

    // Give P2 secret resources & an unplayed monopoly
    rawState.players['p2']!.resources = { lumber: 0, brick: 0, wool: 3, grain: 1, ore: 0 };
    rawState.players['p2']!.devCards.unplayed = [{ type: 'monopoly', turnPurchased: 1 }];

    // Mask state from P1's perspective
    const p1View = maskGameStateForPlayer(rawState, 'p1');

    // 1. P1 sees own exact resources and dev card
    expect(p1View.me.resources.lumber).toBe(2);
    expect(p1View.me.resources.brick).toBe(1);
    expect(p1View.me.devCards.unplayed[0]?.type).toBe('knight');

    // 2. P1 sees P2 as an opponent with masked counts only
    const p2Opponent = p1View.opponents.find((o) => o.id === 'p2')!;
    expect(p2Opponent).toBeDefined();
    expect(p2Opponent.resourceCardCount).toBe(4); // 3 wool + 1 grain
    expect(p2Opponent.devCardCount).toBe(1);

    // Assert opponent object has NO resource dictionary to prevent client inspection
    expect((p2Opponent as any).resources).toBeUndefined();

    // 3. Dev card deck reveals only remaining count
    expect(p1View.devCardDeckRemaining).toBe(rawState.devCardDeck.length);
    expect((p1View as any).devCardDeck).toBeUndefined();
  });
});
