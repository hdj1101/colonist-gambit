import type { TerrainType, BuildingType, Harbor } from './resources.js';

export type PlayerId = string;
export type HexId = string;
export type VertexId = string;
export type EdgeId = string;

export interface CubeCoord {
  readonly q: number;
  readonly r: number;
  readonly s: number;
}

export interface AxialCoord {
  readonly q: number;
  readonly r: number;
}

export interface HexTile {
  readonly id: HexId;
  readonly coord: CubeCoord;
  readonly terrain: TerrainType;
  readonly numberToken: number | null; // null for desert
  hasRobber: boolean;
}

export interface Vertex {
  readonly id: VertexId;
  readonly hexCoords: readonly CubeCoord[]; // 1 to 3 touching hexes
  building?: {
    type: BuildingType;
    playerId: PlayerId;
  };
  harbor?: Harbor;
}

export interface Edge {
  readonly id: EdgeId;
  readonly vertexIds: readonly [VertexId, VertexId];
  road?: {
    playerId: PlayerId;
  };
}

export interface CatanBoard {
  readonly hexes: Record<HexId, HexTile>;
  readonly vertices: Record<VertexId, Vertex>;
  readonly edges: Record<EdgeId, Edge>;
  // Adjacency indices for fast graph traversal
  readonly vertexAdjacentVertices: Record<VertexId, VertexId[]>;
  readonly vertexAdjacentEdges: Record<VertexId, EdgeId[]>;
  readonly edgeAdjacentVertices: Record<EdgeId, [VertexId, VertexId]>;
  readonly hexAdjacentVertices: Record<HexId, VertexId[]>;
  readonly hexAdjacentEdges: Record<HexId, EdgeId[]>;
  readonly robberHexId: HexId;
}
