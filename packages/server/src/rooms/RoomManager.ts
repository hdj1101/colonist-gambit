import type { PlayerColor, PlayerId } from '@colonist-gambit/shared';
import { GameInstance } from '../game/GameInstance.js';

export interface RoomPlayer {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  socketId: string;
  isHost: boolean;
  isReady: boolean;
}

export class Room {
  public readonly id: string;
  public players: Map<PlayerId, RoomPlayer> = new Map();
  public game: GameInstance | null = null;
  public readonly maxPlayers: number = 4;

  constructor(id: string) {
    this.id = id;
  }

  public addPlayer(
    id: PlayerId,
    name: string,
    color: PlayerColor,
    socketId: string
  ): { success: true } | { success: false; error: string } {
    if (this.game) {
      return { success: false, error: 'Game is already in progress' };
    }
    if (this.players.size >= this.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }
    const colorTaken = Array.from(this.players.values()).some((p) => p.color === color);
    if (colorTaken) {
      return { success: false, error: `Color ${color} is already chosen` };
    }

    const isHost = this.players.size === 0;
    this.players.set(id, {
      id,
      name,
      color,
      socketId,
      isHost,
      isReady: isHost, // Host is ready by default
    });

    return { success: true };
  }

  public removePlayer(playerId: PlayerId) {
    const wasHost = this.players.get(playerId)?.isHost;
    this.players.delete(playerId);
    if (wasHost && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        nextHost.isReady = true;
      }
    }
  }

  public hasActivePlayers(): boolean {
    if (this.game) {
      return this.game.hasActivePlayers();
    }
    return this.players.size > 0;
  }

  public getActivePlayerCount(): number {
    if (this.game) {
      return this.game.getActivePlayerCount();
    }
    return this.players.size;
  }

  public setReady(playerId: PlayerId, ready: boolean) {
    const p = this.players.get(playerId);
    if (p) p.isReady = ready;
  }

  public canStartGame(): boolean {
    if (this.game) return false;
    if (this.players.size < 2) return false;
    return Array.from(this.players.values()).every((p) => p.isReady);
  }

  public startGame(): { success: true; game: GameInstance } | { success: false; error: string } {
    if (!this.canStartGame()) {
      return { success: false, error: 'Cannot start game: players not ready or insufficient players' };
    }

    const playerList = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      socketId: p.socketId,
    }));

    this.game = new GameInstance(this.id, playerList);
    return { success: true, game: this.game };
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public createRoom(roomId: string): Room {
    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  public getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * Deletes any room that has no active players.
   * Returns the array of deleted room IDs.
   */
  public cleanEmptyRooms(): string[] {
    const deletedRoomIds: string[] = [];
    for (const [roomId, room] of this.rooms.entries()) {
      if (!room.hasActivePlayers()) {
        this.rooms.delete(roomId);
        deletedRoomIds.push(roomId);
      }
    }
    return deletedRoomIds;
  }
}
