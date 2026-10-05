import { describe, it, expect } from 'vitest';
import { RoomManager } from '../../src/rooms/RoomManager.js';

describe('Room & Lobby Lifecycle (ROOM-01 to ROOM-03)', () => {
  it('ROOM-01 & ROOM-02: manages player joining, ready checks, and prevents starting before all are ready', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('catan-lobby-1');

    // Add Host
    const addHost = room.addPlayer('p1', 'Alice', 'red', 'sock-1');
    expect(addHost.success).toBe(true);
    expect(room.players.get('p1')?.isHost).toBe(true);

    // Cannot start with only 1 player
    expect(room.canStartGame()).toBe(false);

    // Add Player 2
    const addP2 = room.addPlayer('p2', 'Bob', 'blue', 'sock-2');
    expect(addP2.success).toBe(true);
    expect(room.players.get('p2')?.isReady).toBe(false);

    // Cannot start until Bob marks ready
    expect(room.canStartGame()).toBe(false);

    // Bob marks ready
    room.setReady('p2', true);
    expect(room.canStartGame()).toBe(true);

    // Start game
    const startRes = room.startGame();
    expect(startRes.success).toBe(true);
    expect(room.game).not.toBeNull();

    // Cannot add a 3rd player once game is in progress
    const addP3 = room.addPlayer('p3', 'Charlie', 'orange', 'sock-3');
    expect(addP3.success).toBe(false);
    expect((addP3 as any).error).toMatch(/in progress/i);
  });

  it('ROOM-03: tracks player disconnection and reconnection', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('catan-lobby-2');
    room.addPlayer('p1', 'Alice', 'red', 'sock-1');
    room.addPlayer('p2', 'Bob', 'blue', 'sock-2');
    room.setReady('p2', true);
    room.startGame();

    const game = room.game!;

    // Player 1 drops connection
    const disconnectedPlayerId = game.handleDisconnect('sock-1');
    expect(disconnectedPlayerId).toBe('p1');
    expect(game.getRawState().players['p1']!.connected).toBe(false);

    // Player 1 reconnects with a fresh socket ID
    const reconnected = game.handleReconnect('p1', 'sock-1-new');
    expect(reconnected).toBe(true);
    expect(game.getRawState().players['p1']!.connected).toBe(true);
  });

  it('ROOM-04: tracks active players and deletes rooms when no active players remain', () => {
    const manager = new RoomManager();
    const room1 = manager.createRoom('lobby-empty-test');
    expect(room1.hasActivePlayers()).toBe(false);
    expect(room1.getActivePlayerCount()).toBe(0);

    room1.addPlayer('p1', 'Alice', 'red', 'sock-1');
    room1.addPlayer('p2', 'Bob', 'blue', 'sock-2');
    expect(room1.hasActivePlayers()).toBe(true);
    expect(room1.getActivePlayerCount()).toBe(2);

    // Host Alice leaves -> Bob becomes host
    room1.removePlayer('p1');
    expect(room1.hasActivePlayers()).toBe(true);
    expect(room1.getActivePlayerCount()).toBe(1);
    expect(room1.players.get('p2')?.isHost).toBe(true);

    // Bob leaves -> 0 active players
    room1.removePlayer('p2');
    expect(room1.hasActivePlayers()).toBe(false);
    expect(room1.getActivePlayerCount()).toBe(0);

    // cleanEmptyRooms deletes room1
    const cleaned = manager.cleanEmptyRooms();
    expect(cleaned).toEqual(['lobby-empty-test']);
    expect(manager.getRoom('lobby-empty-test')).toBeUndefined();
    expect(manager.getRoomCount()).toBe(0);
  });

  it('ROOM-05: deletes room after all players in an active game disconnect', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('game-empty-test');
    room.addPlayer('p1', 'Alice', 'red', 'sock-1');
    room.addPlayer('p2', 'Bob', 'blue', 'sock-2');
    room.setReady('p2', true);
    room.startGame();

    expect(room.hasActivePlayers()).toBe(true);
    expect(room.getActivePlayerCount()).toBe(2);

    // Alice disconnects
    room.game!.handleDisconnect('sock-1');
    expect(room.hasActivePlayers()).toBe(true);
    expect(room.getActivePlayerCount()).toBe(1);

    // Bob disconnects
    room.game!.handleDisconnect('sock-2');
    expect(room.hasActivePlayers()).toBe(false);
    expect(room.getActivePlayerCount()).toBe(0);

    // Clean empty rooms
    const cleaned = manager.cleanEmptyRooms();
    expect(cleaned).toContain('game-empty-test');
    expect(manager.getRoom('game-empty-test')).toBeUndefined();
  });
});
