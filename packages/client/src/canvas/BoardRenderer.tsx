import React from 'react';
import {
  cubeToPixel,
  getHexCornerPixels,
  getVertexPixel,
  type CatanBoard,
  type TerrainType,
  type VertexId,
  type EdgeId,
  type HexId,
} from '@colonist-gambit/shared';

export interface BoardRendererProps {
  board: CatanBoard;
  playerColors?: Record<string, string>;
  selectableVertices?: VertexId[];
  selectableEdges?: EdgeId[];
  selectableHexes?: HexId[];
  onSelectVertex?: (vId: VertexId) => void;
  onSelectEdge?: (eId: EdgeId) => void;
  onSelectHex?: (hId: HexId) => void;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
  lumber: '#2e7d32', // Forest green
  brick: '#c62828',  // Terracotta red
  wool: '#8bc34a',   // Light pasture green
  grain: '#fbc02d',  // Golden wheat
  ore: '#78909c',    // Mountain slate
  desert: '#d7ccc8', // Sand
};

export const PLAYER_COLORS: Record<string, string> = {
  red: '#e53e3e',
  blue: '#3182ce',
  orange: '#dd6b20',
  white: '#edf2f7',
  green: '#38a169',
  brown: '#8c5938',
};

const HEX_RADIUS = 56;
const CENTER_OFFSET = { x: 420, y: 360 };

export const BoardRenderer: React.FC<BoardRendererProps> = ({
  board,
  playerColors = {},
  selectableVertices = [],
  selectableEdges = [],
  selectableHexes = [],
  onSelectVertex,
  onSelectEdge,
  onSelectHex,
}) => {
  console.log('[BoardRenderer Debug]', { playerColors, hexCount: Object.keys(board.hexes).length });

  const getPlayerColor = (playerId?: string): string => {
    if (!playerId) return '#cbd5e0';
    // 1. Check playerColors map passed from parent (playerId -> colorName/hex)
    const mapped = playerColors[playerId] || playerColors[playerId.toLowerCase()];
    if (mapped) {
      return PLAYER_COLORS[mapped.toLowerCase()] || mapped;
    }
    // 2. Check if playerId is itself a known color name ('red', 'blue', etc.)
    if (PLAYER_COLORS[playerId.toLowerCase()]) {
      return PLAYER_COLORS[playerId.toLowerCase()]!;
    }
    // 3. Raw CSS color (hex, rgb)
    if (playerId.startsWith('#') || playerId.startsWith('rgb')) {
      return playerId;
    }
    return '#cbd5e0';
  };

  return (
    <svg
      viewBox="0 0 840 720"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '80vh',
        background: '#1a365d', // Deep ocean blue
        borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      }}
    >
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* 1. Hex Tiles Layer */}
      <g id="hex-tiles">
        {Object.values(board.hexes).map((hex) => {
          const center = cubeToPixel(hex.coord, HEX_RADIUS);
          const px = center.x + CENTER_OFFSET.x;
          const py = center.y + CENTER_OFFSET.y;
          const corners = getHexCornerPixels({ x: px, y: py }, HEX_RADIUS);
          const pointsStr = corners.map((c) => `${c.x},${c.y}`).join(' ');

          const isSelectable = selectableHexes.includes(hex.id);

          return (
            <g
              key={hex.id}
              onClick={() => isSelectable && onSelectHex?.(hex.id)}
              style={{ cursor: isSelectable ? 'pointer' : 'default' }}
            >
              <polygon
                points={pointsStr}
                fill={TERRAIN_COLORS[hex.terrain]}
                stroke={isSelectable ? '#ecc94b' : '#3d3d3d'}
                strokeWidth={isSelectable ? 4 : 2}
                filter="url(#shadow)"
              />

              {/* Number Token Chit */}
              {hex.numberToken && (
                <g>
                  <circle cx={px} cy={py} r={18} fill="#fffff0" stroke="#4a5568" strokeWidth={1.5} />
                  <text
                    x={px}
                    y={py + 5}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight="bold"
                    fill={hex.numberToken === 6 || hex.numberToken === 8 ? '#e53e3e' : '#1a202c'}
                  >
                    {hex.numberToken}
                  </text>
                </g>
              )}

              {/* Robber */}
              {hex.hasRobber && (
                <circle cx={px} cy={py} r={12} fill="#2d3748" stroke="#ecc94b" strokeWidth={2} />
              )}
            </g>
          );
        })}
      </g>

      {/* 2. Edges & Roads Layer */}
      <g id="edges">
        {Object.values(board.edges).map((edge) => {
          const [v1Id, v2Id] = edge.vertexIds;
          const v1 = board.vertices[v1Id];
          const v2 = board.vertices[v2Id];
          if (!v1 || !v2) return null;

          const p1 = getVertexPixel(v1, HEX_RADIUS);
          const p2 = getVertexPixel(v2, HEX_RADIUS);

          const startX = p1.x + CENTER_OFFSET.x;
          const startY = p1.y + CENTER_OFFSET.y;
          const endX = p2.x + CENTER_OFFSET.x;
          const endY = p2.y + CENTER_OFFSET.y;

          const isSelectable = selectableEdges.includes(edge.id);
          const road = edge.road;

          if (!road && !isSelectable) return null;

          return (
            <g key={edge.id}>
              {road && (
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={getPlayerColor(road.playerId)}
                  strokeWidth={7}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
                />
              )}

              {isSelectable && !road && (
                <>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="#f6e05e"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray="6 3"
                    opacity={0.9}
                  />
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectEdge?.(edge.id)}
                  />
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* 3. Vertices & Buildings Layer */}
      <g id="vertices">
        {Object.values(board.vertices).map((vertex) => {
          const p = getVertexPixel(vertex, HEX_RADIUS);
          const vx = p.x + CENTER_OFFSET.x;
          const vy = p.y + CENTER_OFFSET.y;

          const building = vertex.building;
          const isSelectable = selectableVertices.includes(vertex.id);

          if (!building && !isSelectable) return null;

          const playerColor = building ? getPlayerColor(building.playerId) : undefined;
          const strokeColor =
            playerColor === PLAYER_COLORS.white || playerColor === '#edf2f7' || playerColor === 'white'
              ? '#2d3748'
              : '#ffffff';

          return (
            <g
              key={vertex.id}
              onClick={() => isSelectable && onSelectVertex?.(vertex.id)}
              style={{ cursor: isSelectable ? 'pointer' : 'default' }}
            >
              {/* Selectable Ring around existing building (e.g. for city upgrade) */}
              {isSelectable && building && (
                <circle
                  cx={vx}
                  cy={vy}
                  r={14}
                  fill="none"
                  stroke="#f6e05e"
                  strokeWidth={3}
                  strokeDasharray="4 2"
                />
              )}

              {/* Settlement Piece */}
              {building && building.type === 'settlement' && (
                <polygon
                  points={`${vx},${vy - 9} ${vx + 8},${vy - 3} ${vx + 8},${vy + 7} ${vx - 8},${vy + 7} ${vx - 8},${vy - 3}`}
                  fill={playerColor}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  filter="url(#shadow)"
                />
              )}

              {/* City Piece */}
              {building && building.type === 'city' && (
                <polygon
                  points={`${vx - 10},${vy - 3} ${vx - 5},${vy - 11} ${vx},${vy - 3} ${vx + 10},${vy - 3} ${vx + 10},${vy + 8} ${vx - 10},${vy + 8}`}
                  fill={playerColor}
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  filter="url(#shadow)"
                />
              )}

              {/* Selectable Unoccupied Vertex */}
              {isSelectable && !building && (
                <circle
                  cx={vx}
                  cy={vy}
                  r={9}
                  fill="#f6e05e"
                  stroke="#ffffff"
                  strokeWidth={2}
                  filter="url(#shadow)"
                  opacity={0.9}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
