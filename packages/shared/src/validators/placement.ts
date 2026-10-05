import type { GameState } from '../types/state.js';
import type { PlayerId, VertexId, EdgeId } from '../types/board.js';
import { BUILDING_COSTS } from '../constants/rules.js';
import type { ResourceCount } from '../types/resources.js';

export function hasResources(playerResources: ResourceCount, cost: ResourceCount): boolean {
  return (
    playerResources.lumber >= cost.lumber &&
    playerResources.brick >= cost.brick &&
    playerResources.wool >= cost.wool &&
    playerResources.grain >= cost.grain &&
    playerResources.ore >= cost.ore
  );
}

/**
 * Distance Rule: All adjacent vertices must be vacant of any settlement or city.
 */
export function isValidSettlementPlacement(
  state: GameState,
  playerId: PlayerId,
  vertexId: VertexId,
  isInitialSetup: boolean = false
): { valid: boolean; reason?: string } {
  const vertex = state.board.vertices[vertexId];
  if (!vertex) return { valid: false, reason: 'Vertex does not exist' };
  if (vertex.building) return { valid: false, reason: 'Vertex already occupied' };

  // Check Distance Rule on adjacent vertices
  const adjacentVertexIds = state.board.vertexAdjacentVertices[vertexId] ?? [];
  for (const adjId of adjacentVertexIds) {
    const adjVertex = state.board.vertices[adjId];
    if (adjVertex?.building) {
      return { valid: false, reason: 'Violates distance rule (adjacent building exists)' };
    }
  }

  // Check resource cost & inventory if not setup
  if (!isInitialSetup) {
    const player = state.players[playerId];
    if (!player) return { valid: false, reason: 'Player not found' };
    if (player.availablePieces.settlements <= 0) {
      return { valid: false, reason: 'No settlements remaining in inventory' };
    }
    if (!hasResources(player.resources, BUILDING_COSTS.settlement)) {
      return { valid: false, reason: 'Insufficient resources to build settlement' };
    }

    // Must connect to at least one of the player's own roads
    const adjacentEdgeIds = state.board.vertexAdjacentEdges[vertexId] ?? [];
    const hasConnectingRoad = adjacentEdgeIds.some((eId) => {
      const edge = state.board.edges[eId];
      return edge?.road?.playerId === playerId;
    });

    if (!hasConnectingRoad) {
      return { valid: false, reason: 'Settlement must connect to player road' };
    }
  }

  return { valid: true };
}

/**
 * Road Placement Validation
 */
export function isValidRoadPlacement(
  state: GameState,
  playerId: PlayerId,
  edgeId: EdgeId,
  isInitialSetup: boolean = false,
  setupAnchorVertexId?: VertexId
): { valid: boolean; reason?: string } {
  const edge = state.board.edges[edgeId];
  if (!edge) return { valid: false, reason: 'Edge does not exist' };
  if (edge.road) return { valid: false, reason: 'Edge already occupied by a road' };

  const player = state.players[playerId];
  if (!player) return { valid: false, reason: 'Player not found' };

  if (isInitialSetup) {
    // In setup, road must connect directly to the just-placed setup settlement
    if (!setupAnchorVertexId) {
      return { valid: false, reason: 'Missing anchor settlement for initial road' };
    }
    const incidentVertices: VertexId[] = state.board.edgeAdjacentVertices[edgeId] ?? [];
    if (!incidentVertices.includes(setupAnchorVertexId)) {
      return { valid: false, reason: 'Initial road must connect to initial settlement' };
    }
    return { valid: true };
  }

  if (player.availablePieces.roads <= 0) {
    return { valid: false, reason: 'No roads remaining in inventory' };
  }
  if (!hasResources(player.resources, BUILDING_COSTS.road)) {
    return { valid: false, reason: 'Insufficient resources to build road' };
  }

  // Must connect to player's existing road, settlement, or city
  const [v1, v2] = state.board.edgeAdjacentVertices[edgeId] ?? [];
  if (!v1 || !v2) return { valid: false, reason: 'Malformed edge vertices' };

  const connectsToBuilding =
    state.board.vertices[v1]?.building?.playerId === playerId ||
    state.board.vertices[v2]?.building?.playerId === playerId;

  if (connectsToBuilding) return { valid: true };

  // Or connects to an existing road at v1 or v2 (provided that vertex isn't blocked by an opponent)
  const canConnectViaV1 =
    !state.board.vertices[v1]?.building ||
    state.board.vertices[v1]?.building?.playerId === playerId;
  const canConnectViaV2 =
    !state.board.vertices[v2]?.building ||
    state.board.vertices[v2]?.building?.playerId === playerId;

  const connectsViaV1Road =
    canConnectViaV1 &&
    (state.board.vertexAdjacentEdges[v1] ?? []).some(
      (adjEId) => adjEId !== edgeId && state.board.edges[adjEId]?.road?.playerId === playerId
    );

  const connectsViaV2Road =
    canConnectViaV2 &&
    (state.board.vertexAdjacentEdges[v2] ?? []).some(
      (adjEId) => adjEId !== edgeId && state.board.edges[adjEId]?.road?.playerId === playerId
    );

  if (connectsViaV1Road || connectsViaV2Road) {
    return { valid: true };
  }

  return { valid: false, reason: 'Road must connect to your existing network' };
}

/**
 * City Upgrade Validation
 */
export function isValidCityUpgrade(
  state: GameState,
  playerId: PlayerId,
  vertexId: VertexId
): { valid: boolean; reason?: string } {
  const vertex = state.board.vertices[vertexId];
  if (!vertex) return { valid: false, reason: 'Vertex does not exist' };
  if (!vertex.building || vertex.building.type !== 'settlement') {
    return { valid: false, reason: 'Target vertex must contain a settlement' };
  }
  if (vertex.building.playerId !== playerId) {
    return { valid: false, reason: 'You do not own this settlement' };
  }

  const player = state.players[playerId];
  if (!player) return { valid: false, reason: 'Player not found' };
  if (player.availablePieces.cities <= 0) {
    return { valid: false, reason: 'No cities remaining in inventory' };
  }
  if (!hasResources(player.resources, BUILDING_COSTS.city)) {
    return { valid: false, reason: 'Insufficient resources to upgrade to city' };
  }

  return { valid: true };
}
