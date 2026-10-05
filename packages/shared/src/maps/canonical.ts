import type { CubeCoord, VertexId, EdgeId, HexId, Vertex } from '../types/board.js';
import { getCubeNeighbor, cubeToPixel, getHexCornerPixels } from './coordinates.js';

export function hexIdFromCoord(coord: CubeCoord): HexId {
  return `hex:${coord.q},${coord.r},${coord.s}`;
}

export function coordFromHexId(id: HexId): CubeCoord {
  const parts = id.replace('hex:', '').split(',').map(Number);
  return { q: parts[0]!, r: parts[1]!, s: parts[2]! };
}

/**
 * Normalizes a list of touching cube coordinates into a deterministic string.
 * Coordinates are sorted lexicographically by q, then r, then s.
 */
function sortCoords(coords: readonly CubeCoord[]): CubeCoord[] {
  return [...coords].sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.s - b.s;
  });
}

/**
 * In pointy-topped hexes, each corner touches up to 3 hexes:
 * The current hex, neighbor at direction i, and neighbor at direction (i + 1) % 6.
 * We identify the canonical VertexId by sorting those 3 hex coordinates.
 */
export function getCanonicalVertexId(touchingCoords: readonly CubeCoord[]): VertexId {
  const sorted = sortCoords(touchingCoords);
  const coordStrings = sorted.map((c) => `${c.q},${c.r},${c.s}`);
  return `v:${coordStrings.join('|')}`;
}

/**
 * For a hex corner at index `cornerIndex` (0 to 5), computes the canonical VertexId
 * by finding the 3 touching hex coordinates in infinite hex space.
 */
export function getVertexIdForHexCorner(center: CubeCoord, cornerIndex: number): VertexId {
  const n1 = getCubeNeighbor(center, cornerIndex);
  const n2 = getCubeNeighbor(center, (cornerIndex + 1) % 6);
  return getCanonicalVertexId([center, n1, n2]);
}

/**
 * An edge connects two adjacent vertices.
 * The canonical EdgeId is formed by sorting the two canonical Vertex IDs.
 */
export function getCanonicalEdgeId(vertexIdA: VertexId, vertexIdB: VertexId): EdgeId {
  const [first, second] = vertexIdA < vertexIdB ? [vertexIdA, vertexIdB] : [vertexIdB, vertexIdA];
  return `e:${first}--${second}`;
}

/**
 * Computes exact 2D pixel coordinate for a vertex at hexagon corners.
 */
export function getVertexPixel(
  vertex: Vertex,
  radius: number
): { x: number; y: number } {
  const coord = vertex.hexCoords[0];
  if (!coord) return { x: 0, y: 0 };
  const center = cubeToPixel(coord, radius);
  const corners = getHexCornerPixels(center, radius);
  for (let i = 0; i < 6; i++) {
    if (getVertexIdForHexCorner(coord, i) === vertex.id) {
      return corners[i]!;
    }
  }
  return center;
}

