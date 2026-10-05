import { describe, it, expect } from 'vitest';
import {
  getCanonicalVertexId,
  getVertexIdForHexCorner,
  getCanonicalEdgeId,
  getVertexPixel,
} from '../../src/maps/canonical.js';
import { createCube } from '../../src/maps/coordinates.js';
import { generateBoard } from '../../src/maps/generator.js';

describe('Canonical Graph Indexing (GRAPH-01 to GRAPH-05)', () => {
  it('GRAPH-01 & GRAPH-02: generates identical canonical VertexId regardless of permutation', () => {
    const h1 = createCube(0, 0, 0);
    const h2 = createCube(1, -1, 0);
    const h3 = createCube(1, 0, -1);

    const vId1 = getCanonicalVertexId([h1, h2, h3]);
    const vId2 = getCanonicalVertexId([h3, h1, h2]);
    const vId3 = getCanonicalVertexId([h2, h3, h1]);

    expect(vId1).toBe(vId2);
    expect(vId2).toBe(vId3);
  });

  it('GRAPH-03: shared edge between two vertices generates identical EdgeId in either direction', () => {
    const vA = 'v:0,0,0|1,-1,0|1,0,-1';
    const vB = 'v:0,0,0|0,1,-1|1,0,-1';

    const edge1 = getCanonicalEdgeId(vA, vB);
    const edge2 = getCanonicalEdgeId(vB, vA);

    expect(edge1).toBe(edge2);
    expect(edge1.startsWith('e:')).toBe(true);
  });

  it('GRAPH-04 & GRAPH-05: standard Catan board contains exactly 19 hexes, 54 vertices, and 72 edges', () => {
    const board = generateBoard();

    const hexCount = Object.keys(board.hexes).length;
    const vertexCount = Object.keys(board.vertices).length;
    const edgeCount = Object.keys(board.edges).length;

    expect(hexCount).toBe(19);
    expect(vertexCount).toBe(54);
    expect(edgeCount).toBe(72);

    // Verify adjacency invariant consistency
    for (const [vId, adjEdges] of Object.entries(board.vertexAdjacentEdges)) {
      // Each vertex in a planar hexagonal grid has degree 2 (coastal corner) or 3 (internal/coastal joint)
      expect(adjEdges.length).toBeGreaterThanOrEqual(2);
      expect(adjEdges.length).toBeLessThanOrEqual(3);
    }
  });

  it('computes exact distinct pixel coordinates for all 54 vertices at hex corners', () => {
    const board = generateBoard();
    const radius = 56;
    const computedPositions = new Set<string>();

    for (const vertex of Object.values(board.vertices)) {
      const pos = getVertexPixel(vertex, radius);
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(Number.isNaN(pos.x)).toBe(false);
      expect(Number.isNaN(pos.y)).toBe(false);

      const key = `${Math.round(pos.x * 100)},${Math.round(pos.y * 100)}`;
      expect(computedPositions.has(key)).toBe(false);
      computedPositions.add(key);
    }

    expect(computedPositions.size).toBe(54);
  });
});

