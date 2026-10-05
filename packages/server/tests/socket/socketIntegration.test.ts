import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { createServer } from '../../src/index.js';
import type { MaskedGameState } from '@colonist-gambit/shared';

describe('Real-Time Socket.io Integration Tests', () => {
  let serverInstance: any;
  let roomManagerInstance: any;
  let port: number;
  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeAll(async () => {
    const { server, roomManager } = createServer();
    serverInstance = server;
    roomManagerInstance = roomManager;

    await new Promise<void>((resolve) => {
      serverInstance.listen(0, () => {
        port = (serverInstance.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    await new Promise<void>((resolve) => {
      serverInstance.close(() => resolve());
    });
  });

  let initialP1State: MaskedGameState;

  it('connects 2 clients, ready checks, starts game, and receives personalized masked state', async () => {
    const url = `http://localhost:${port}`;
    client1 = Client(url);
    client2 = Client(url);

    // Wait for connection
    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
    ]);

    // Join room
    await new Promise<void>((res) => {
      client1.emit('JOIN_ROOM', { roomId: 'game-room-1', playerId: 'p1', name: 'Alice', color: 'red' }, () => {
        res();
      });
    });

    await new Promise<void>((res) => {
      client2.emit('JOIN_ROOM', { roomId: 'game-room-1', playerId: 'p2', name: 'Bob', color: 'blue' }, () => {
        res();
      });
    });

    // P2 marks ready
    client2.emit('SET_READY', { isReady: true });

    // Host starts game
    const gameStartPromise1 = new Promise<MaskedGameState>((res) => {
      client1.on('GAME_STATE_UPDATE', (state: MaskedGameState) => res(state));
    });
    const gameStartPromise2 = new Promise<MaskedGameState>((res) => {
      client2.on('GAME_STATE_UPDATE', (state: MaskedGameState) => res(state));
    });

    await new Promise<void>((res) => {
      client1.emit('START_GAME', () => res());
    });

    const [state1, state2] = await Promise.all([gameStartPromise1, gameStartPromise2]);
    initialP1State = state1;

    // Client 1 perspective check
    expect(state1.me.id).toBe('p1');
    expect(state1.opponents[0]?.id).toBe('p2');
    expect((state1.opponents[0] as any).resources).toBeUndefined(); // strictly masked!

    // Client 2 perspective check
    expect(state2.me.id).toBe('p2');
    expect(state2.opponents[0]?.id).toBe('p1');

    // Both clients receive initial setup phase
    expect(state1.phase).toBe('SETUP_FORWARD');
    expect(state2.phase).toBe('SETUP_FORWARD');
  });

  it('dispatches setup settlement placement and broadcasts updated board state', async () => {
    let latestStateP1: MaskedGameState | null = null;
    let latestStateP2: MaskedGameState | null = null;

    client1.on('GAME_STATE_UPDATE', (st) => { latestStateP1 = st; });
    client2.on('GAME_STATE_UPDATE', (st) => { latestStateP2 = st; });

    // Pick first vertex from initialized board
    const v0 = Object.keys(initialP1State.board.vertices)[0]!;

    await new Promise<void>((resolve, reject) => {
      client1.emit(
        'DISPATCH_ACTION',
        { type: 'PLACE_INITIAL_SETTLEMENT', vertexId: v0 },
        (res: any) => {
          if (res.success) resolve();
          else reject(new Error(res.error));
        }
      );
    });

    // Give broadcast time to propagate
    await new Promise((r) => setTimeout(r, 50));

    expect(latestStateP1?.setupStep).toBe('ROAD');
    expect(latestStateP2?.setupStep).toBe('ROAD');
  });

  it('deletes lobby room when only player leaves or disconnects', async () => {
    const url = `http://localhost:${port}`;
    const soloClient = Client(url);

    await new Promise<void>((res) => soloClient.on('connect', res));

    // Join room
    await new Promise<void>((res) => {
      soloClient.emit('JOIN_ROOM', { roomId: 'solo-lobby', playerId: 'p-solo', name: 'Solo', color: 'red' }, () => {
        res();
      });
    });

    expect(roomManagerInstance.getRoom('solo-lobby')).toBeDefined();

    // Client leaves room
    await new Promise<void>((res) => {
      soloClient.emit('LEAVE_ROOM', () => res());
    });

    // Room should be deleted because 0 active players
    expect(roomManagerInstance.getRoom('solo-lobby')).toBeUndefined();

    // Disconnect
    soloClient.disconnect();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('deletes active game room when all players disconnect', async () => {
    const url = `http://localhost:${port}`;
    const cA = Client(url);
    const cB = Client(url);

    await Promise.all([
      new Promise<void>((res) => cA.on('connect', res)),
      new Promise<void>((res) => cB.on('connect', res)),
    ]);

    await new Promise<void>((res) => {
      cA.emit('JOIN_ROOM', { roomId: 'disconnect-test-room', playerId: 'pA', name: 'Alice', color: 'red' }, () => res());
    });
    await new Promise<void>((res) => {
      cB.emit('JOIN_ROOM', { roomId: 'disconnect-test-room', playerId: 'pB', name: 'Bob', color: 'blue' }, () => res());
    });

    cB.emit('SET_READY', { isReady: true });
    await new Promise<void>((res) => {
      cA.emit('START_GAME', () => res());
    });

    expect(roomManagerInstance.getRoom('disconnect-test-room')).toBeDefined();

    // Disconnect first player (Bob is still active)
    cA.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    expect(roomManagerInstance.getRoom('disconnect-test-room')).toBeDefined();

    // Disconnect second player (0 active players remain)
    cB.disconnect();
    await new Promise((r) => setTimeout(r, 50));
    expect(roomManagerInstance.getRoom('disconnect-test-room')).toBeUndefined();
  });
});
