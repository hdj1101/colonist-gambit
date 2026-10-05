import type { ResourceCount, DevelopmentCardType } from '../types/resources.js';

export const BUILDING_COSTS: {
  road: ResourceCount;
  settlement: ResourceCount;
  city: ResourceCount;
  devCard: ResourceCount;
} = {
  road: {
    lumber: 1,
    brick: 1,
    wool: 0,
    grain: 0,
    ore: 0,
  },
  settlement: {
    lumber: 1,
    brick: 1,
    wool: 1,
    grain: 1,
    ore: 0,
  },
  city: {
    lumber: 0,
    brick: 0,
    wool: 0,
    grain: 2,
    ore: 3,
  },
  devCard: {
    lumber: 0,
    brick: 0,
    wool: 1,
    grain: 1,
    ore: 1,
  },
};

export const STANDARD_BASE_DEV_CARD_DECK: DevelopmentCardType[] = [
  ...Array<DevelopmentCardType>(14).fill('knight'),
  ...Array<DevelopmentCardType>(5).fill('victory_point'),
  ...Array<DevelopmentCardType>(2).fill('road_building'),
  ...Array<DevelopmentCardType>(2).fill('year_of_plenty'),
  ...Array<DevelopmentCardType>(2).fill('monopoly'),
]; // total 25 cards

export const INITIAL_BANK_RESOURCES: ResourceCount = {
  lumber: 19,
  brick: 19,
  wool: 19,
  grain: 19,
  ore: 19,
};

export const INITIAL_PLAYER_PIECES = {
  roads: 15,
  settlements: 5,
  cities: 4,
};

export const WINNING_VICTORY_POINTS = 10;
export const LONGEST_ROAD_MINIMUM = 5;
export const LARGEST_ARMY_MINIMUM = 3;
export const DISCARD_HAND_LIMIT = 7;
