import type { GameState } from '../types/state.js';
import type { PlayerId, VertexId, EdgeId } from '../types/board.js';
import {
  LONGEST_ROAD_MINIMUM,
  LARGEST_ARMY_MINIMUM,
} from '../constants/rules.js';

/**
 * Calculates the longest simple road path (no edge reused) for a specific player using DFS.
 * Considers branching, cycles, and interruptions by opponent settlements/cities.
 */
export function calculateLongestRoadForPlayer(
  state: GameState,
  playerId: PlayerId
): number {
  // 1. Gather all edges owned by this player
  const playerEdgeIds = Object.keys(state.board.edges).filter(
    (eId) => state.board.edges[eId]?.road?.playerId === playerId
  );

  if (playerEdgeIds.length === 0) return 0;

  // 2. Build road adjacency subgraph
  // A road can pass through a vertex V between edge E1 and E2 if:
  // - V has no building, OR
  // - V has a building owned by this player
  // (An opponent's settlement/city breaks the path through V)
  let maxPathLength = 0;

  function dfs(
    currentVertexId: VertexId,
    visitedEdges: Set<EdgeId>,
    currentLength: number
  ) {
    if (currentLength > maxPathLength) {
      maxPathLength = currentLength;
    }

    // Inspect candidate edges leading from currentVertexId
    const incidentEdgeIds = state.board.vertexAdjacentEdges[currentVertexId] ?? [];
    for (const nextEdgeId of incidentEdgeIds) {
      if (visitedEdges.has(nextEdgeId)) continue;
      if (state.board.edges[nextEdgeId]?.road?.playerId !== playerId) continue;

      // Find other vertex of this edge
      const [v1, v2] = state.board.edgeAdjacentVertices[nextEdgeId]!;
      const nextVertexId = v1 === currentVertexId ? v2 : v1;

      // Check if we can traverse through nextVertexId to future edges
      const occupant = state.board.vertices[nextVertexId]?.building;
      const isBlockedByOpponent = occupant && occupant.playerId !== playerId;

      visitedEdges.add(nextEdgeId);

      if (isBlockedByOpponent) {
        // Can reach this vertex, but cannot branch further past it
        if (currentLength + 1 > maxPathLength) {
          maxPathLength = currentLength + 1;
        }
      } else {
        dfs(nextVertexId, visitedEdges, currentLength + 1);
      }

      visitedEdges.delete(nextEdgeId);
    }
  }

  // Run DFS from both endpoints of every player road
  for (const edgeId of playerEdgeIds) {
    const [v1, v2] = state.board.edgeAdjacentVertices[edgeId]!;
    const visited = new Set<EdgeId>([edgeId]);

    // Check if v1 is blocked
    const b1 = state.board.vertices[v1]?.building;
    if (!b1 || b1.playerId === playerId) {
      dfs(v1, visited, 1);
    }

    // Check if v2 is blocked
    const b2 = state.board.vertices[v2]?.building;
    if (!b2 || b2.playerId === playerId) {
      dfs(v2, visited, 1);
    }
  }

  return maxPathLength;
}

/**
 * Updates Longest Road, Largest Army, and total Victory Points for all players.
 */
export function evaluateVictoryPoints(state: GameState): {
  winnerId: PlayerId | null;
  longestRoadOwner: PlayerId | null;
  largestArmyOwner: PlayerId | null;
} {
  // 1. Recalculate Longest Road lengths
  for (const [pId, player] of Object.entries(state.players)) {
    player.stats.longestRoadLength = calculateLongestRoadForPlayer(state, pId);
  }

  // Evaluate Longest Road Card Holder
  let currentRoadOwner = state.longestRoadPlayerId;
  let currentBestRoad = currentRoadOwner
    ? state.players[currentRoadOwner]!.stats.longestRoadLength
    : LONGEST_ROAD_MINIMUM - 1;

  for (const [pId, player] of Object.entries(state.players)) {
    if (pId === currentRoadOwner) continue;
    // To take longest road from an owner, player must strictly surpass them
    if (player.stats.longestRoadLength > currentBestRoad && player.stats.longestRoadLength >= LONGEST_ROAD_MINIMUM) {
      currentRoadOwner = pId;
      currentBestRoad = player.stats.longestRoadLength;
    }
  }

  // If previous owner had their road interrupted and now nobody has >= 5, card is revoked
  if (currentRoadOwner && state.players[currentRoadOwner]!.stats.longestRoadLength < LONGEST_ROAD_MINIMUM) {
    currentRoadOwner = null;
  }
  state.longestRoadPlayerId = currentRoadOwner;

  // 2. Evaluate Largest Army Card Holder
  let currentArmyOwner = state.largestArmyPlayerId;
  let currentBestKnights = currentArmyOwner
    ? state.players[currentArmyOwner]!.stats.playedKnightsCount
    : LARGEST_ARMY_MINIMUM - 1;

  for (const [pId, player] of Object.entries(state.players)) {
    if (pId === currentArmyOwner) continue;
    if (player.stats.playedKnightsCount > currentBestKnights && player.stats.playedKnightsCount >= LARGEST_ARMY_MINIMUM) {
      currentArmyOwner = pId;
      currentBestKnights = player.stats.playedKnightsCount;
    }
  }
  state.largestArmyPlayerId = currentArmyOwner;

  // 3. Compute Victory Points for each player
  let winnerId: PlayerId | null = null;

  for (const [pId, player] of Object.entries(state.players)) {
    let vp = 0;

    // Count settlements (1 VP) and cities (2 VP) on board
    for (const vertex of Object.values(state.board.vertices)) {
      if (vertex.building?.playerId === pId) {
        vp += vertex.building.type === 'city' ? 2 : 1;
      }
    }

    // Longest Road (+2)
    if (state.longestRoadPlayerId === pId) vp += 2;

    // Largest Army (+2)
    if (state.largestArmyPlayerId === pId) vp += 2;

    // Unplayed VP dev cards (+1 each)
    const vpCards = player.devCards.unplayed.filter((c) => c.type === 'victory_point').length;
    const totalVP = vp + vpCards;
    player.stats.victoryPoints = vp; // public VP

    if (totalVP >= state.config.victoryPointsTarget && !winnerId) {
      winnerId = pId;
    }
  }

  state.winnerPlayerId = winnerId;
  if (winnerId) {
    state.phase = 'GAME_OVER';
  }

  return {
    winnerId,
    longestRoadOwner: state.longestRoadPlayerId,
    largestArmyOwner: state.largestArmyPlayerId,
  };
}
