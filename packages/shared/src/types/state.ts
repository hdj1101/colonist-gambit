import type { ResourceCount, DevelopmentCardType } from './resources.js';
import type { PlayerId, CatanBoard } from './board.js';
import type { Player, MaskedPlayer } from './player.js';
import type { GamePhase, TurnState } from './action.js';

export interface ActiveTradeProposal {
  id: string;
  senderId: PlayerId;
  targetPlayerId?: PlayerId;
  offer: Partial<ResourceCount>;
  request: Partial<ResourceCount>;
  createdAt: number;
}

export interface GameConfig {
  victoryPointsTarget: number;
  turnTimerSeconds: number;
  discardLimit: number; // standard: 7
}

export interface GameState {
  readonly id: string;
  readonly config: GameConfig;
  phase: GamePhase;
  turn: TurnState;
  board: CatanBoard;
  players: Record<PlayerId, Player>;
  turnOrder: PlayerId[];
  setupStep?: 'SETTLEMENT' | 'ROAD';
  setupPlayerIndex?: number;
  setupAnchorVertexId?: string;
  bank: ResourceCount;
  devCardDeck: DevelopmentCardType[];
  longestRoadPlayerId: PlayerId | null;
  largestArmyPlayerId: PlayerId | null;
  winnerPlayerId: PlayerId | null;
  activeTrade: ActiveTradeProposal | null;
  actionLog: {
    timestamp: number;
    text: string;
  }[];
}

export interface MaskedGameState {
  readonly id: string;
  readonly config: GameConfig;
  phase: GamePhase;
  turn: TurnState;
  setupStep?: 'SETTLEMENT' | 'ROAD';
  setupPlayerIndex?: number;
  setupAnchorVertexId?: string;
  board: CatanBoard;
  me: Player;
  opponents: MaskedPlayer[];
  turnOrder: PlayerId[];
  bankResourceCount: ResourceCount;
  devCardDeckRemaining: number;
  longestRoadPlayerId: PlayerId | null;
  largestArmyPlayerId: PlayerId | null;
  winnerPlayerId: PlayerId | null;
  activeTrade: ActiveTradeProposal | null;
  actionLog: {
    timestamp: number;
    text: string;
  }[];
}
