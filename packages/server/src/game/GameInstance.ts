import {
  generateBoard,
  STANDARD_BASE_DEV_CARD_DECK,
  INITIAL_BANK_RESOURCES,
  INITIAL_PLAYER_PIECES,
  applyAction,
  type GameState,
  type GameAction,
  type PlayerId,
  type PlayerColor,
} from '@colonist-gambit/shared';
import { maskGameStateForPlayer } from './masking.js';

export interface PlayerSession {
  playerId: PlayerId;
  name: string;
  color: PlayerColor;
  socketId: string;
}

export class GameInstance {
  private state: GameState;
  private sessions: Map<PlayerId, PlayerSession> = new Map();

  constructor(
    gameId: string,
    players: { id: PlayerId; name: string; color: PlayerColor; socketId: string }[]
  ) {
    const board = generateBoard();

    // Shuffle dev card deck
    const shuffledDeck = [...STANDARD_BASE_DEV_CARD_DECK].sort(() => Math.random() - 0.5);

    const playerMap: GameState['players'] = {};
    const turnOrder: PlayerId[] = [];

    for (const p of players) {
      turnOrder.push(p.id);
      this.sessions.set(p.id, {
        playerId: p.id,
        name: p.name,
        color: p.color,
        socketId: p.socketId,
      });
      playerMap[p.id] = {
        id: p.id,
        name: p.name,
        color: p.color,
        resources: { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 },
        devCards: { unplayed: [], played: [] },
        availablePieces: { ...INITIAL_PLAYER_PIECES },
        stats: { longestRoadLength: 0, playedKnightsCount: 0, victoryPoints: 0 },
        connected: true,
      };
    }

    this.state = {
      id: gameId,
      config: {
        victoryPointsTarget: 10,
        turnTimerSeconds: 60,
        discardLimit: 7,
      },
      phase: 'SETUP_FORWARD',
      setupStep: 'SETTLEMENT',
      setupPlayerIndex: 0,
      turn: {
        activePlayerId: turnOrder[0]!,
        turnNumber: 0,
        diceRoll: null,
        hasRolled: false,
        devCardPlayedThisTurn: false,
        pendingDiscards: {},
      },
      board,
      players: playerMap,
      turnOrder,
      bank: { ...INITIAL_BANK_RESOURCES },
      devCardDeck: shuffledDeck,
      longestRoadPlayerId: null,
      largestArmyPlayerId: null,
      winnerPlayerId: null,
      activeTrade: null,
      actionLog: [
        {
          timestamp: Date.now(),
          text: 'Game started! Round 1 setup begun.',
        },
      ],
    };
  }

  public getRawState(): GameState {
    return this.state;
  }

  public getMaskedState(playerId: PlayerId) {
    return maskGameStateForPlayer(this.state, playerId);
  }

  public dispatchAction(
    action: GameAction,
    actingPlayerId: PlayerId,
    rng?: () => number
  ): { success: true } | { success: false; error: string } {
    const result = applyAction(this.state, action, actingPlayerId, rng);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    this.state = result.state;
    return { success: true };
  }

  public handleDisconnect(socketId: string): PlayerId | null {
    for (const [pId, sess] of this.sessions.entries()) {
      if (sess.socketId === socketId) {
        if (this.state.players[pId]) {
          this.state.players[pId]!.connected = false;
        }
        return pId;
      }
    }
    return null;
  }

  public handleReconnect(playerId: PlayerId, newSocketId: string): boolean {
    const session = this.sessions.get(playerId);
    if (!session) return false;

    session.socketId = newSocketId;
    if (this.state.players[playerId]) {
      this.state.players[playerId]!.connected = true;
    }
    return true;
  }

  public hasActivePlayers(): boolean {
    return Object.values(this.state.players).some((p) => p.connected);
  }

  public getActivePlayerCount(): number {
    return Object.values(this.state.players).filter((p) => p.connected).length;
  }
}
