import type { GameState } from '../types/state.js';
import type { ResourceCount, ResourceType } from '../types/resources.js';
import type { PlayerId } from '../types/board.js';

/**
 * Distributes resources produced by a dice roll to adjacent settlements and cities.
 * If a hex holds the robber, it produces nothing.
 */
export function distributeHarvest(
  state: GameState,
  roll: number
): {
  payouts: Record<PlayerId, Partial<ResourceCount>>;
  blockedHexes: string[];
} {
  const payouts: Record<PlayerId, Partial<ResourceCount>> = {};
  const blockedHexes: string[] = [];

  for (const playerId of Object.keys(state.players)) {
    payouts[playerId] = {
      lumber: 0,
      brick: 0,
      wool: 0,
      grain: 0,
      ore: 0,
    };
  }

  if (roll === 7) {
    return { payouts, blockedHexes };
  }

  // Find all hexes matching this roll
  for (const hex of Object.values(state.board.hexes)) {
    if (hex.numberToken !== roll) continue;

    if (hex.hasRobber) {
      blockedHexes.push(hex.id);
      continue;
    }

    if (hex.terrain === 'desert') continue;
    const resourceType = hex.terrain as ResourceType;

    // Inspect adjacent vertices
    const touchingVertexIds = state.board.hexAdjacentVertices[hex.id] ?? [];
    for (const vId of touchingVertexIds) {
      const vertex = state.board.vertices[vId];
      if (!vertex?.building) continue;

      const { playerId, type } = vertex.building;
      const amount = type === 'city' ? 2 : 1;

      // Check if bank has enough
      const availableInBank = state.bank[resourceType];
      const payoutAmount = Math.min(amount, availableInBank);

      if (payoutAmount > 0) {
        state.bank[resourceType] -= payoutAmount;
        state.players[playerId]!.resources[resourceType] += payoutAmount;
        payouts[playerId]![resourceType] = (payouts[playerId]![resourceType] ?? 0) + payoutAmount;
      }
    }
  }

  return { payouts, blockedHexes };
}

/**
 * Calculates players who must discard on a roll of 7 (holding > discardLimit cards)
 */
export function calculatePendingDiscards(
  state: GameState
): Record<PlayerId, number> {
  const pending: Record<PlayerId, number> = {};
  const limit = state.config.discardLimit;

  for (const [pId, player] of Object.entries(state.players)) {
    const totalCards =
      player.resources.lumber +
      player.resources.brick +
      player.resources.wool +
      player.resources.grain +
      player.resources.ore;

    if (totalCards > limit) {
      // Must discard half, rounded down
      pending[pId] = Math.floor(totalCards / 2);
    }
  }

  return pending;
}
