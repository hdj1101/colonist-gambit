import type { ResourceCount, DevelopmentCardType } from './resources.js';
import type { PlayerId } from './board.js';

export type PlayerColor = 'red' | 'blue' | 'orange' | 'white' | 'green' | 'brown';

export interface PlayerStats {
  longestRoadLength: number;
  playedKnightsCount: number;
  victoryPoints: number; // public VP
}

export interface Player {
  readonly id: PlayerId;
  name: string;
  color: PlayerColor;
  resources: ResourceCount;
  // Dev cards separated by availability
  devCards: {
    unplayed: {
      type: DevelopmentCardType;
      turnPurchased: number;
    }[];
    played: DevelopmentCardType[];
  };
  availablePieces: {
    roads: number; // starts at 15
    settlements: number; // starts at 5
    cities: number; // starts at 4
  };
  stats: PlayerStats;
  connected: boolean;
}

export interface MaskedPlayer {
  readonly id: PlayerId;
  name: string;
  color: PlayerColor;
  resourceCardCount: number;
  devCardCount: number;
  playedDevCards: DevelopmentCardType[];
  availablePieces: {
    roads: number;
    settlements: number;
    cities: number;
  };
  stats: PlayerStats;
  connected: boolean;
}
