import type { ResourceType, ResourceCount } from './resources.js';
import type { PlayerId, VertexId, EdgeId, HexId } from './board.js';

export type GamePhase =
  | 'LOBBY'
  | 'SETUP_FORWARD'   // First settlement + road (1 -> N)
  | 'SETUP_BACKWARD'  // Second settlement + road (N -> 1)
  | 'TURN_START'      // Option to play Knight or roll dice
  | 'DISCARD_PHASE'   // If 7 rolled and players have >7 cards
  | 'ROBBER_MOVE'     // Moving robber
  | 'ROBBER_STEAL'    // Selecting player to steal from
  | 'ACTION_PHASE'    // Build, trade, dev cards
  | 'GAME_OVER';

export interface TurnState {
  activePlayerId: PlayerId;
  turnNumber: number;
  diceRoll: [number, number] | null;
  hasRolled: boolean;
  devCardPlayedThisTurn: boolean;
  pendingDiscards: Record<PlayerId, number>; // playerId -> cards needed to discard
  robberReturnPhase?: 'TURN_START' | 'ACTION_PHASE'; // where to return after robber resolves
  eligibleStealTargets?: PlayerId[];
}

export type PlayDevCardPayload =
  | { cardType: 'knight' }
  | { cardType: 'year_of_plenty'; resources: [ResourceType, ResourceType] }
  | { cardType: 'road_building'; edges: [EdgeId, EdgeId?] }
  | { cardType: 'monopoly'; targetResource: ResourceType };

export type GameAction =
  | { type: 'PLACE_INITIAL_SETTLEMENT'; vertexId: VertexId }
  | { type: 'PLACE_INITIAL_ROAD'; edgeId: EdgeId }
  | { type: 'ROLL_DICE' }
  | { type: 'DISCARD_CARDS'; cards: Partial<ResourceCount> }
  | { type: 'MOVE_ROBBER'; hexId: HexId }
  | { type: 'STEAL_RESOURCE'; targetPlayerId: PlayerId }
  | { type: 'BUILD_ROAD'; edgeId: EdgeId }
  | { type: 'BUILD_SETTLEMENT'; vertexId: VertexId }
  | { type: 'UPGRADE_CITY'; vertexId: VertexId }
  | { type: 'BUY_DEV_CARD' }
  | { type: 'PLAY_DEV_CARD'; payload: PlayDevCardPayload }
  | {
      type: 'PROPOSE_TRADE';
      offer: Partial<ResourceCount>;
      request: Partial<ResourceCount>;
      targetPlayerId?: PlayerId; // omitted for broadcast
    }
  | { type: 'ACCEPT_TRADE'; tradeId: string }
  | { type: 'REJECT_TRADE'; tradeId: string }
  | { type: 'CANCEL_TRADE'; tradeId: string }
  | {
      type: 'EXECUTE_BANK_TRADE';
      giveResource: ResourceType;
      giveCount: number; // 2, 3, or 4 based on ports
      getResource: ResourceType;
    }
  | { type: 'END_TURN' };
