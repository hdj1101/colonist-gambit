export type ResourceType = 'lumber' | 'brick' | 'wool' | 'grain' | 'ore';

export type TerrainType = ResourceType | 'desert';

export interface ResourceCount {
  lumber: number;
  brick: number;
  wool: number;
  grain: number;
  ore: number;
}

export type DevelopmentCardType =
  | 'knight'
  | 'victory_point'
  | 'road_building'
  | 'year_of_plenty'
  | 'monopoly';

export type BuildingType = 'settlement' | 'city';

export type HarborType = 'generic' | ResourceType;

export interface Harbor {
  type: HarborType;
  ratio: number; // 3 for generic, 2 for specific
}
