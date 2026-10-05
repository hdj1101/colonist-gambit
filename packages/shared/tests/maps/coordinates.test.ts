import { describe, it, expect } from 'vitest';
import {
  createCube,
  axialToCube,
  cubeToAxial,
  cubeDistance,
  cubeAdd,
  getCubeNeighbors,
  cubeToPixel,
} from '../../src/maps/coordinates.js';

describe('Hex Coordinates & Math (MATH-01 to MATH-05)', () => {
  it('MATH-01: enforces cube coordinate invariant q + r + s = 0', () => {
    expect(() => createCube(1, -1, 0)).not.toThrow();
    expect(() => createCube(2, -3, 1)).not.toThrow();
    expect(() => createCube(1, 1, 1)).toThrow(/Invalid Cube Coordinates/);
  });

  it('MATH-02: generates exactly 6 neighbors at distance 1', () => {
    const origin = createCube(0, 0, 0);
    const neighbors = getCubeNeighbors(origin);
    expect(neighbors).toHaveLength(6);
    for (const neighbor of neighbors) {
      expect(cubeDistance(origin, neighbor)).toBe(1);
      expect(neighbor.q + neighbor.r + neighbor.s).toBe(0);
    }
  });

  it('MATH-03: performs round-trip conversion between axial and cube coordinates', () => {
    const axial = { q: 2, r: -3 };
    const cube = axialToCube(axial);
    expect(cube).toEqual({ q: 2, r: -3, s: 1 });
    const backToAxial = cubeToAxial(cube);
    expect(backToAxial).toEqual(axial);
  });

  it('MATH-04: projects pixel centers with expected geometric symmetry', () => {
    const radius = 50;
    const origin = createCube(0, 0, 0);
    const neighbor = createCube(1, 0, -1);

    const pos0 = cubeToPixel(origin, radius);
    const pos1 = cubeToPixel(neighbor, radius);

    const dist = Math.hypot(pos1.x - pos0.x, pos1.y - pos0.y);
    const expectedDist = Math.sqrt(3) * radius;
    expect(dist).toBeCloseTo(expectedDist, 5);
  });

  it('MATH-05: correctly computes cube distance between arbitrary points', () => {
    const a = createCube(0, 0, 0);
    const b = createCube(2, -1, -1);
    expect(cubeDistance(a, b)).toBe(2);

    const c = createCube(-2, 3, -1);
    expect(cubeDistance(b, c)).toBe(4);
  });
});
