import type { CubeCoord, AxialCoord } from '../types/board.js';

/**
 * Cube coordinates invariant: q + r + s = 0
 */
export function createCube(q: number, r: number, s: number): CubeCoord {
  if (Math.round(q + r + s) !== 0) {
    throw new Error(`Invalid Cube Coordinates: ${q} + ${r} + ${s} = ${q + r + s} !== 0`);
  }
  return { q, r, s };
}

export function axialToCube(axial: AxialCoord): CubeCoord {
  return {
    q: axial.q,
    r: axial.r,
    s: -axial.q - axial.r,
  };
}

export function cubeToAxial(cube: CubeCoord): AxialCoord {
  return {
    q: cube.q,
    r: cube.r,
  };
}

export function cubeEquals(a: CubeCoord, b: CubeCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function cubeAdd(a: CubeCoord, b: CubeCoord): CubeCoord {
  return {
    q: a.q + b.q,
    r: a.r + b.r,
    s: a.s + b.s,
  };
}

export function cubeSubtract(a: CubeCoord, b: CubeCoord): CubeCoord {
  return {
    q: a.q - b.q,
    r: a.r - b.r,
    s: a.s - b.s,
  };
}

export function cubeDistance(a: CubeCoord, b: CubeCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
}

// 6 Clockwise adjacent neighbor vectors (pointy-topped)
export const CUBE_DIRECTIONS: readonly CubeCoord[] = [
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
];

export function getCubeNeighbor(cube: CubeCoord, directionIndex: number): CubeCoord {
  const dir = CUBE_DIRECTIONS[(directionIndex % 6 + 6) % 6]!;
  return cubeAdd(cube, dir);
}

export function getCubeNeighbors(cube: CubeCoord): CubeCoord[] {
  return CUBE_DIRECTIONS.map((dir) => cubeAdd(cube, dir));
}

/**
 * Screen pixel projection for Pointy-Topped hexagons
 */
export function cubeToPixel(cube: CubeCoord, radius: number): { x: number; y: number } {
  const x = radius * (Math.sqrt(3) * cube.q + (Math.sqrt(3) / 2) * cube.r);
  const y = radius * ((3 / 2) * cube.r);
  return { x, y };
}

/**
 * Generates the 6 polygon vertex pixel coordinates for a pointy-topped hex
 */
export function getHexCornerPixels(
  center: { x: number; y: number },
  radius: number
): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy topped: start at 30 degrees (pi/6) + i * 60 deg (pi/3)
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }
  return corners;
}
