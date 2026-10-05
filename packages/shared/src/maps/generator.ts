import type {
  CubeCoord,
  HexId,
  VertexId,
  EdgeId,
  HexTile,
  Vertex,
  Edge,
  CatanBoard,
} from '../types/board.js';
import type { TerrainType, Harbor } from '../types/resources.js';
import {
  hexIdFromCoord,
  getVertexIdForHexCorner,
  getCanonicalEdgeId,
} from './canonical.js';

export interface MapConfig {
  radius: number; // 2 for standard 19-tile board
  terrainCounts: Record<TerrainType, number>;
  numberTokens: number[];
  harbors?: {
    vertexA: VertexId;
    vertexB: VertexId;
    harbor: Harbor;
  }[];
}

/**
 * Standard 19-tile Catan board layout constants
 */
export const STANDARD_TERRAIN_COUNTS: Record<TerrainType, number> = {
  lumber: 4,
  wool: 4,
  grain: 4,
  brick: 3,
  ore: 3,
  desert: 1,
};

export const STANDARD_NUMBER_TOKENS: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

/**
 * Generates all hex cube coordinates within distance `radius` of the origin (0, 0, 0)
 */
export function generateSpiralCoords(radius: number): CubeCoord[] {
  const coords: CubeCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      coords.push({ q, r, s });
    }
  }
  return coords;
}

/**
 * Builds the complete deduplicated graph (Hexes, Vertices, Edges, Adjacencies)
 */
export function generateBoard(
  terrains?: TerrainType[],
  tokens?: number[]
): CatanBoard {
  const coords = generateSpiralCoords(2); // 19 hexes
  const hexes: Record<HexId, HexTile> = {};
  const vertices: Record<VertexId, Vertex> = {};
  const edges: Record<EdgeId, Edge> = {};

  const vertexAdjacentVertices: Record<VertexId, VertexId[]> = {};
  const vertexAdjacentEdges: Record<VertexId, EdgeId[]> = {};
  const edgeAdjacentVertices: Record<EdgeId, [VertexId, VertexId]> = {};
  const hexAdjacentVertices: Record<HexId, VertexId[]> = {};
  const hexAdjacentEdges: Record<HexId, EdgeId[]> = {};

  // Default balanced terrain distribution if none provided
  const terrainList = terrains ?? [
    'ore', 'wool', 'lumber',
    'grain', 'brick', 'wool', 'brick',
    'grain', 'lumber', 'desert', 'lumber', 'ore',
    'lumber', 'ore', 'grain', 'wool',
    'brick', 'grain', 'wool',
  ];

  const tokenList = tokens ?? [
    10, 2, 9,
    12, 6, 4, 10,
    9, 11, null, 3, 8,
    8, 3, 4, 5,
    5, 6, 11,
  ];

  let robberHexId = '';

  coords.forEach((coord, index) => {
    const hId = hexIdFromCoord(coord);
    const terrain = terrainList[index] ?? 'desert';
    const rawToken = tokenList[index];
    const numberToken = terrain === 'desert' ? null : (rawToken as number);
    const hasRobber = terrain === 'desert';

    if (hasRobber) {
      robberHexId = hId;
    }

    hexes[hId] = {
      id: hId,
      coord,
      terrain,
      numberToken,
      hasRobber,
    };

    hexAdjacentVertices[hId] = [];
    hexAdjacentEdges[hId] = [];

    // Construct 6 corner vertices and 6 boundary edges
    const cornerVertexIds: VertexId[] = [];
    for (let corner = 0; corner < 6; corner++) {
      const vId = getVertexIdForHexCorner(coord, corner);
      cornerVertexIds.push(vId);

      if (!vertices[vId]) {
        vertices[vId] = {
          id: vId,
          hexCoords: [coord],
        };
        vertexAdjacentVertices[vId] = [];
        vertexAdjacentEdges[vId] = [];
      } else {
        // Add touching hex if not already added
        const existing = vertices[vId]!.hexCoords;
        if (!existing.some((c) => c.q === coord.q && c.r === coord.r && c.s === coord.s)) {
          vertices[vId] = {
            ...vertices[vId]!,
            hexCoords: [...existing, coord],
          };
        }
      }
      hexAdjacentVertices[hId]!.push(vId);
    }

    // Connect adjacent corner vertices with edges
    for (let i = 0; i < 6; i++) {
      const v1 = cornerVertexIds[i]!;
      const v2 = cornerVertexIds[(i + 1) % 6]!;
      const eId = getCanonicalEdgeId(v1, v2);

      if (!edges[eId]) {
        edges[eId] = {
          id: eId,
          vertexIds: [v1, v2],
        };
        edgeAdjacentVertices[eId] = [v1, v2];

        // Link vertex <-> vertex and vertex <-> edge
        if (!vertexAdjacentVertices[v1]!.includes(v2)) {
          vertexAdjacentVertices[v1]!.push(v2);
        }
        if (!vertexAdjacentVertices[v2]!.includes(v1)) {
          vertexAdjacentVertices[v2]!.push(v1);
        }
        if (!vertexAdjacentEdges[v1]!.includes(eId)) {
          vertexAdjacentEdges[v1]!.push(eId);
        }
        if (!vertexAdjacentEdges[v2]!.includes(eId)) {
          vertexAdjacentEdges[v2]!.push(eId);
        }
      }

      if (!hexAdjacentEdges[hId]!.includes(eId)) {
        hexAdjacentEdges[hId]!.push(eId);
      }
    }
  });

  return {
    hexes,
    vertices,
    edges,
    vertexAdjacentVertices,
    vertexAdjacentEdges,
    edgeAdjacentVertices,
    hexAdjacentVertices,
    hexAdjacentEdges,
    robberHexId,
  };
}
