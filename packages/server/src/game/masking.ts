import type { GameState, MaskedGameState } from '@colonist-gambit/shared';
import type { MaskedPlayer, PlayerId } from '@colonist-gambit/shared';

/**
 * Creates a privacy-preserving state view customized for a specific player (viewerId).
 * - Reveals full resource cards and unplayed dev cards ONLY for viewerId.
 * - Masks opponent hands into card counts (resourceCardCount, devCardCount).
 * - Masks the server dev card deck into remaining count only.
 */
export function maskGameStateForPlayer(state: GameState, viewerId: PlayerId): MaskedGameState {
  const me = state.players[viewerId];
  if (!me) {
    throw new Error(`Viewer player ${viewerId} does not exist in game state`);
  }

  const opponents: MaskedPlayer[] = [];

  for (const [pId, player] of Object.entries(state.players)) {
    if (pId === viewerId) continue;

    const resourceCardCount =
      player.resources.lumber +
      player.resources.brick +
      player.resources.wool +
      player.resources.grain +
      player.resources.ore;

    opponents.push({
      id: player.id,
      name: player.name,
      color: player.color,
      resourceCardCount,
      devCardCount: player.devCards.unplayed.length,
      playedDevCards: [...player.devCards.played],
      availablePieces: { ...player.availablePieces },
      stats: { ...player.stats },
      connected: player.connected,
    });
  }

  return {
    id: state.id,
    config: state.config,
    phase: state.phase,
    turn: state.turn,
    setupStep: state.setupStep,
    setupPlayerIndex: state.setupPlayerIndex,
    setupAnchorVertexId: state.setupAnchorVertexId,
    board: state.board,
    me,
    opponents,
    turnOrder: state.turnOrder,
    bankResourceCount: state.bank,
    devCardDeckRemaining: state.devCardDeck.length,
    longestRoadPlayerId: state.longestRoadPlayerId,
    largestArmyPlayerId: state.largestArmyPlayerId,
    winnerPlayerId: state.winnerPlayerId,
    activeTrade: state.activeTrade,
    actionLog: state.actionLog,
  };
}
