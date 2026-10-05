import type { GameState } from '../types/state.js';
import type { GameAction } from '../types/action.js';
import type { ResourceCount, ResourceType } from '../types/resources.js';
import type { PlayerId } from '../types/board.js';
import { BUILDING_COSTS } from '../constants/rules.js';
import {
  isValidSettlementPlacement,
  isValidRoadPlacement,
  isValidCityUpgrade,
  hasResources,
} from '../validators/placement.js';
import { distributeHarvest, calculatePendingDiscards } from './production.js';
import { evaluateVictoryPoints } from './victory.js';

export type ActionResult =
  | { success: true; state: GameState }
  | { success: false; error: string };

function deductResources(playerRes: ResourceCount, cost: ResourceCount, bankRes: ResourceCount) {
  playerRes.lumber -= cost.lumber;
  playerRes.brick -= cost.brick;
  playerRes.wool -= cost.wool;
  playerRes.grain -= cost.grain;
  playerRes.ore -= cost.ore;

  bankRes.lumber += cost.lumber;
  bankRes.brick += cost.brick;
  bankRes.wool += cost.wool;
  bankRes.grain += cost.grain;
  bankRes.ore += cost.ore;
}

/**
 * Pure state machine reducer: applies a validated action intent to GameState.
 */
export function applyAction(
  prevState: GameState,
  action: GameAction,
  actingPlayerId: string,
  rng: () => number = Math.random
): ActionResult {
  // Deep clone state for immutability
  const state: GameState = JSON.parse(JSON.stringify(prevState));

  if (state.phase === 'GAME_OVER') {
    return { success: false, error: 'Game is already over' };
  }

  switch (action.type) {
    // -------------------------------------------------------------
    // SETUP PHASE: Initial Settlements & Roads (Snake draft 1->N, N->1)
    // -------------------------------------------------------------
    case 'PLACE_INITIAL_SETTLEMENT': {
      if (state.phase !== 'SETUP_FORWARD' && state.phase !== 'SETUP_BACKWARD') {
        return { success: false, error: 'Not in initial setup phase' };
      }
      if (state.setupStep !== 'SETTLEMENT') {
        return { success: false, error: 'Must place road next' };
      }
      const expectedPlayerId = state.turnOrder[state.setupPlayerIndex ?? 0];
      if (actingPlayerId !== expectedPlayerId) {
        return { success: false, error: 'Not your turn in setup' };
      }

      const check = isValidSettlementPlacement(state, actingPlayerId, action.vertexId, true);
      if (!check.valid) return { success: false, error: check.reason ?? 'Invalid settlement' };

      // Place settlement
      state.board.vertices[action.vertexId]!.building = {
        type: 'settlement',
        playerId: actingPlayerId,
      };
      state.players[actingPlayerId]!.availablePieces.settlements -= 1;

      // If round 2 (SETUP_BACKWARD), award starting resources from adjacent terrain
      if (state.phase === 'SETUP_BACKWARD') {
        const touchingHexCoords = state.board.vertices[action.vertexId]!.hexCoords;
        for (const coord of touchingHexCoords) {
          const hex = Object.values(state.board.hexes).find(
            (h) => h.coord.q === coord.q && h.coord.r === coord.r && h.coord.s === coord.s
          );
          if (hex && hex.terrain !== 'desert') {
            const res = hex.terrain as ResourceType;
            if (state.bank[res] > 0) {
              state.bank[res] -= 1;
              state.players[actingPlayerId]!.resources[res] += 1;
            }
          }
        }
      }

      state.setupStep = 'ROAD';
      state.setupAnchorVertexId = action.vertexId;
      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'PLACE_INITIAL_ROAD': {
      if (state.phase !== 'SETUP_FORWARD' && state.phase !== 'SETUP_BACKWARD') {
        return { success: false, error: 'Not in initial setup phase' };
      }
      if (state.setupStep !== 'ROAD') {
        return { success: false, error: 'Must place settlement first' };
      }
      const expectedPlayerId = state.turnOrder[state.setupPlayerIndex ?? 0];
      if (actingPlayerId !== expectedPlayerId) {
        return { success: false, error: 'Not your turn in setup' };
      }

      // Initial road must connect to the settlement just placed
      const playerSettlementVertexIds = Object.keys(state.board.vertices).filter(
        (vId) => state.board.vertices[vId]?.building?.playerId === actingPlayerId
      );
      // Anchor is the setup anchor vertex if recorded, or latest placed settlement
      const anchorVertexId =
        state.setupAnchorVertexId ??
        playerSettlementVertexIds[playerSettlementVertexIds.length - 1];

      const check = isValidRoadPlacement(state, actingPlayerId, action.edgeId, true, anchorVertexId);
      if (!check.valid) return { success: false, error: check.reason ?? 'Invalid initial road' };

      state.board.edges[action.edgeId]!.road = { playerId: actingPlayerId };
      state.players[actingPlayerId]!.availablePieces.roads -= 1;
      delete state.setupAnchorVertexId;

      // Advance Snake draft order
      const currentIndex = state.setupPlayerIndex ?? 0;
      const totalPlayers = state.turnOrder.length;

      if (state.phase === 'SETUP_FORWARD') {
        if (currentIndex === totalPlayers - 1) {
          // Reversal at last player: immediately starts round 2 backward
          state.phase = 'SETUP_BACKWARD';
          state.setupStep = 'SETTLEMENT';
          // currentIndex remains unchanged (player N goes again)
          state.turn.activePlayerId = state.turnOrder[currentIndex]!;
        } else {
          state.setupPlayerIndex = currentIndex + 1;
          state.setupStep = 'SETTLEMENT';
          state.turn.activePlayerId = state.turnOrder[currentIndex + 1]!;
        }
      } else {
        // SETUP_BACKWARD
        if (currentIndex === 0) {
          // Setup complete! Transition to normal game start
          state.phase = 'TURN_START';
          state.setupStep = undefined;
          state.setupPlayerIndex = undefined;
          state.turn = {
            activePlayerId: state.turnOrder[0]!,
            turnNumber: 1,
            diceRoll: null,
            hasRolled: false,
            devCardPlayedThisTurn: false,
            pendingDiscards: {},
          };
        } else {
          state.setupPlayerIndex = currentIndex - 1;
          state.setupStep = 'SETTLEMENT';
          state.turn.activePlayerId = state.turnOrder[currentIndex - 1]!;
        }
      }

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    // -------------------------------------------------------------
    // DICE ROLL & PRE-ROLL / POST-ROLL ROBBER FLOW
    // -------------------------------------------------------------
    case 'ROLL_DICE': {
      if (state.phase !== 'TURN_START') {
        return { success: false, error: 'Dice can only be rolled in TURN_START phase' };
      }
      if (actingPlayerId !== state.turn.activePlayerId) {
        return { success: false, error: 'Not your turn to roll' };
      }

      const d1 = Math.floor(rng() * 6) + 1;
      const d2 = Math.floor(rng() * 6) + 1;
      const roll = d1 + d2;
      state.turn.diceRoll = [d1, d2];
      state.turn.hasRolled = true;

      if (roll === 7) {
        const pending = calculatePendingDiscards(state);
        if (Object.keys(pending).length > 0) {
          state.phase = 'DISCARD_PHASE';
          state.turn.pendingDiscards = pending;
        } else {
          state.phase = 'ROBBER_MOVE';
          state.turn.robberReturnPhase = 'ACTION_PHASE';
        }
      } else {
        distributeHarvest(state, roll);
        state.phase = 'ACTION_PHASE';
      }

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'DISCARD_CARDS': {
      if (state.phase !== 'DISCARD_PHASE') {
        return { success: false, error: 'Not currently in discard phase' };
      }
      const requiredCount = state.turn.pendingDiscards[actingPlayerId];
      if (!requiredCount || requiredCount <= 0) {
        return { success: false, error: 'You do not need to discard cards' };
      }

      const cards = action.cards;
      const totalDiscarded =
        (cards.lumber ?? 0) +
        (cards.brick ?? 0) +
        (cards.wool ?? 0) +
        (cards.grain ?? 0) +
        (cards.ore ?? 0);

      if (totalDiscarded !== requiredCount) {
        return { success: false, error: `Must discard exactly ${requiredCount} cards` };
      }

      const player = state.players[actingPlayerId]!;
      for (const res of ['lumber', 'brick', 'wool', 'grain', 'ore'] as const) {
        const count = cards[res] ?? 0;
        if (player.resources[res] < count) {
          return { success: false, error: `Not enough ${res} to discard` };
        }
        player.resources[res] -= count;
        state.bank[res] += count;
      }

      delete state.turn.pendingDiscards[actingPlayerId];

      // If all pending discards resolved, transition to Robber Move
      if (Object.keys(state.turn.pendingDiscards).length === 0) {
        state.phase = 'ROBBER_MOVE';
        state.turn.robberReturnPhase = 'ACTION_PHASE';
      }

      return { success: true, state };
    }

    case 'MOVE_ROBBER': {
      if (state.phase !== 'ROBBER_MOVE') {
        return { success: false, error: 'Not in robber move phase' };
      }
      if (actingPlayerId !== state.turn.activePlayerId) {
        return { success: false, error: 'Only active player can move the robber' };
      }
      if (action.hexId === state.board.robberHexId) {
        return { success: false, error: 'Robber must be moved to a different hex' };
      }

      const hex = state.board.hexes[action.hexId];
      if (!hex) return { success: false, error: 'Target hex does not exist' };

      // Update robber position
      state.board.hexes[state.board.robberHexId]!.hasRobber = false;
      hex.hasRobber = true;
      (state.board as { robberHexId: string }).robberHexId = action.hexId;

      // Find eligible steal targets on the new hex
      const adjacentVertexIds = state.board.hexAdjacentVertices[action.hexId] ?? [];
      const eligibleVictims = new Set<PlayerId>();

      for (const vId of adjacentVertexIds) {
        const building = state.board.vertices[vId]?.building;
        if (building && building.playerId !== actingPlayerId) {
          const victim = state.players[building.playerId]!;
          const victimCardCount =
            victim.resources.lumber +
            victim.resources.brick +
            victim.resources.wool +
            victim.resources.grain +
            victim.resources.ore;
          if (victimCardCount > 0) {
            eligibleVictims.add(building.playerId);
          }
        }
      }

      if (eligibleVictims.size > 0) {
        state.phase = 'ROBBER_STEAL';
        state.turn.eligibleStealTargets = Array.from(eligibleVictims);
      } else {
        // Return to designated phase (TURN_START if pre-roll knight, ACTION_PHASE if roll 7 or post-roll knight)
        state.phase = state.turn.robberReturnPhase ?? 'ACTION_PHASE';
        state.turn.robberReturnPhase = undefined;
      }

      return { success: true, state };
    }

    case 'STEAL_RESOURCE': {
      if (state.phase !== 'ROBBER_STEAL') {
        return { success: false, error: 'Not in robber steal phase' };
      }
      if (actingPlayerId !== state.turn.activePlayerId) {
        return { success: false, error: 'Only active player can steal' };
      }
      if (!state.turn.eligibleStealTargets?.includes(action.targetPlayerId)) {
        return { success: false, error: 'Target player is not eligible to be stolen from' };
      }

      const victim = state.players[action.targetPlayerId]!;
      const thief = state.players[actingPlayerId]!;

      // Gather victim's cards
      const availableResources: ResourceType[] = [];
      for (const res of ['lumber', 'brick', 'wool', 'grain', 'ore'] as const) {
        for (let i = 0; i < victim.resources[res]; i++) {
          availableResources.push(res);
        }
      }

      if (availableResources.length > 0) {
        const stolenIndex = Math.floor(rng() * availableResources.length);
        const stolenRes = availableResources[stolenIndex]!;
        victim.resources[stolenRes] -= 1;
        thief.resources[stolenRes] += 1;
      }

      state.phase = state.turn.robberReturnPhase ?? 'ACTION_PHASE';
      state.turn.robberReturnPhase = undefined;
      state.turn.eligibleStealTargets = undefined;

      return { success: true, state };
    }

    // -------------------------------------------------------------
    // ACTION PHASE: Build, Trade, Dev Cards, End Turn
    // -------------------------------------------------------------
    case 'BUILD_ROAD': {
      if (state.phase !== 'ACTION_PHASE') return { success: false, error: 'Not in action phase' };
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };

      const check = isValidRoadPlacement(state, actingPlayerId, action.edgeId);
      if (!check.valid) return { success: false, error: check.reason ?? 'Invalid road placement' };

      deductResources(state.players[actingPlayerId]!.resources, BUILDING_COSTS.road, state.bank);
      state.board.edges[action.edgeId]!.road = { playerId: actingPlayerId };
      state.players[actingPlayerId]!.availablePieces.roads -= 1;

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'BUILD_SETTLEMENT': {
      if (state.phase !== 'ACTION_PHASE') return { success: false, error: 'Not in action phase' };
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };

      const check = isValidSettlementPlacement(state, actingPlayerId, action.vertexId);
      if (!check.valid) return { success: false, error: check.reason ?? 'Invalid settlement placement' };

      deductResources(state.players[actingPlayerId]!.resources, BUILDING_COSTS.settlement, state.bank);
      state.board.vertices[action.vertexId]!.building = { type: 'settlement', playerId: actingPlayerId };
      state.players[actingPlayerId]!.availablePieces.settlements -= 1;

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'UPGRADE_CITY': {
      if (state.phase !== 'ACTION_PHASE') return { success: false, error: 'Not in action phase' };
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };

      const check = isValidCityUpgrade(state, actingPlayerId, action.vertexId);
      if (!check.valid) return { success: false, error: check.reason ?? 'Invalid city upgrade' };

      deductResources(state.players[actingPlayerId]!.resources, BUILDING_COSTS.city, state.bank);
      state.board.vertices[action.vertexId]!.building = { type: 'city', playerId: actingPlayerId };
      state.players[actingPlayerId]!.availablePieces.settlements += 1;
      state.players[actingPlayerId]!.availablePieces.cities -= 1;

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'BUY_DEV_CARD': {
      if (state.phase !== 'ACTION_PHASE') return { success: false, error: 'Not in action phase' };
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };
      if (state.devCardDeck.length === 0) return { success: false, error: 'No development cards left in deck' };

      const player = state.players[actingPlayerId]!;
      if (!hasResources(player.resources, BUILDING_COSTS.devCard)) {
        return { success: false, error: 'Insufficient resources to purchase dev card' };
      }

      deductResources(player.resources, BUILDING_COSTS.devCard, state.bank);
      const cardType = state.devCardDeck.pop()!;
      player.devCards.unplayed.push({
        type: cardType,
        turnPurchased: state.turn.turnNumber,
      });

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'PLAY_DEV_CARD': {
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };
      if (state.turn.devCardPlayedThisTurn) {
        return { success: false, error: 'You have already played a development card this turn' };
      }

      const { payload } = action;
      const player = state.players[actingPlayerId]!;

      // Only Knight can be played in TURN_START
      if (state.phase === 'TURN_START') {
        if (payload.cardType !== 'knight') {
          return { success: false, error: 'Only Knight card can be played before rolling' };
        }
      } else if (state.phase !== 'ACTION_PHASE') {
        return { success: false, error: 'Cannot play dev card in this phase' };
      }

      // Check player owns an unplayed card not purchased this turn
      const cardIndex = player.devCards.unplayed.findIndex(
        (c) => c.type === payload.cardType && c.turnPurchased < state.turn.turnNumber
      );
      if (cardIndex === -1) {
        return { success: false, error: 'No eligible card of this type available to play' };
      }

      // Remove card from unplayed and mark played
      player.devCards.unplayed.splice(cardIndex, 1);
      player.devCards.played.push(payload.cardType);
      state.turn.devCardPlayedThisTurn = true;

      if (payload.cardType === 'knight') {
        player.stats.playedKnightsCount += 1;
        state.turn.robberReturnPhase = state.phase === 'TURN_START' ? 'TURN_START' : 'ACTION_PHASE';
        state.phase = 'ROBBER_MOVE';
      } else if (payload.cardType === 'year_of_plenty') {
        const [r1, r2] = payload.resources;
        if (state.bank[r1] > 0) {
          state.bank[r1] -= 1;
          player.resources[r1] += 1;
        }
        if (state.bank[r2] > 0) {
          state.bank[r2] -= 1;
          player.resources[r2] += 1;
        }
      } else if (payload.cardType === 'monopoly') {
        const targetRes = payload.targetResource;
        for (const [pId, otherPlayer] of Object.entries(state.players)) {
          if (pId !== actingPlayerId) {
            const count = otherPlayer.resources[targetRes];
            otherPlayer.resources[targetRes] = 0;
            player.resources[targetRes] += count;
          }
        }
      } else if (payload.cardType === 'road_building') {
        for (const eId of payload.edges) {
          if (eId && player.availablePieces.roads > 0 && !state.board.edges[eId]?.road) {
            state.board.edges[eId]!.road = { playerId: actingPlayerId };
            player.availablePieces.roads -= 1;
          }
        }
      }

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    case 'EXECUTE_BANK_TRADE': {
      if (state.phase !== 'ACTION_PHASE') return { success: false, error: 'Not in action phase' };
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };

      const player = state.players[actingPlayerId]!;
      if (player.resources[action.giveResource] < action.giveCount) {
        return { success: false, error: `Insufficient ${action.giveResource} for bank trade` };
      }
      if (state.bank[action.getResource] <= 0) {
        return { success: false, error: `Bank has no remaining ${action.getResource}` };
      }

      player.resources[action.giveResource] -= action.giveCount;
      state.bank[action.giveResource] += action.giveCount;

      state.bank[action.getResource] -= 1;
      player.resources[action.getResource] += 1;

      return { success: true, state };
    }

    case 'END_TURN': {
      if (state.phase !== 'ACTION_PHASE') return { success: false, error: 'Not in action phase' };
      if (actingPlayerId !== state.turn.activePlayerId) return { success: false, error: 'Not your turn' };

      const currentOrderIdx = state.turnOrder.indexOf(actingPlayerId);
      const nextPlayerId = state.turnOrder[(currentOrderIdx + 1) % state.turnOrder.length]!;

      state.phase = 'TURN_START';
      state.turn = {
        activePlayerId: nextPlayerId,
        turnNumber: state.turn.turnNumber + 1,
        diceRoll: null,
        hasRolled: false,
        devCardPlayedThisTurn: false,
        pendingDiscards: {},
      };

      evaluateVictoryPoints(state);
      return { success: true, state };
    }

    default:
      return { success: false, error: 'Unhandled action type' };
  }
}
