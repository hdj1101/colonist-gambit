import type { Server, Socket } from 'socket.io';
import type { GameAction, PlayerColor } from '@colonist-gambit/shared';
import type { RoomManager } from '../rooms/RoomManager.js';

export function registerSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    // Helper to broadcast masked state to each player in the room individually
    const broadcastGameState = (roomId: string) => {
      const room = roomManager.getRoom(roomId);
      if (!room || !room.game) return;

      for (const player of room.players.values()) {
        const maskedState = room.game.getMaskedState(player.id);
        io.to(player.socketId).emit('GAME_STATE_UPDATE', maskedState);
      }
    };

    // Helper to broadcast room lobby updates
    const broadcastLobbyState = (roomId: string) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const lobbyData = {
        roomId: room.id,
        players: Array.from(room.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          isHost: p.isHost,
          isReady: p.isReady,
        })),
        canStart: room.canStartGame(),
      };
      io.to(roomId).emit('LOBBY_STATE_UPDATE', lobbyData);
    };

    // 1. Join / Create Room
    socket.on(
      'JOIN_ROOM',
      (
        data: { roomId: string; playerId: string; name: string; color: PlayerColor },
        ack?: (res: { success: boolean; error?: string }) => void
      ) => {
        let room = roomManager.getRoom(data.roomId);
        if (!room) {
          room = roomManager.createRoom(data.roomId);
        }

        // Handle reconnection if game is in progress
        if (room.game) {
          const reconnected = room.game.handleReconnect(data.playerId, socket.id);
          if (reconnected) {
            currentRoomId = data.roomId;
            currentPlayerId = data.playerId;
            socket.join(data.roomId);
            if (ack) ack({ success: true });
            broadcastGameState(data.roomId);
            return;
          }
        }

        const addRes = room.addPlayer(data.playerId, data.name, data.color, socket.id);
        if (!addRes.success) {
          if (ack) ack({ success: false, error: addRes.error });
          return;
        }

        currentRoomId = data.roomId;
        currentPlayerId = data.playerId;
        socket.join(data.roomId);

        if (ack) ack({ success: true });
        broadcastLobbyState(data.roomId);
      }
    );

    // 2. Leave Room
    const handlePlayerLeaveOrDisconnect = (roomId: string, playerId: string) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      if (room.game) {
        room.game.handleDisconnect(socket.id);
        if (!room.hasActivePlayers()) {
          roomManager.deleteRoom(roomId);
        } else {
          broadcastGameState(roomId);
        }
      } else {
        room.removePlayer(playerId);
        if (!room.hasActivePlayers()) {
          roomManager.deleteRoom(roomId);
        } else {
          broadcastLobbyState(roomId);
        }
      }
    };

    socket.on('LEAVE_ROOM', (ack?: (res: { success: boolean }) => void) => {
      if (currentRoomId && currentPlayerId) {
        const roomId = currentRoomId;
        const playerId = currentPlayerId;
        currentRoomId = null;
        currentPlayerId = null;
        socket.leave(roomId);
        handlePlayerLeaveOrDisconnect(roomId, playerId);
      }
      if (ack) ack({ success: true });
    });

    // 3. Set Ready
    socket.on('SET_READY', (data: { isReady: boolean }) => {
      if (!currentRoomId || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;

      room.setReady(currentPlayerId, data.isReady);
      broadcastLobbyState(currentRoomId);
    });

    // 4. Start Game (Host only)
    socket.on('START_GAME', (ack?: (res: { success: boolean; error?: string }) => void) => {
      if (!currentRoomId || !currentPlayerId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;

      const player = room.players.get(currentPlayerId);
      if (!player?.isHost) {
        if (ack) ack({ success: false, error: 'Only the host can start the game' });
        return;
      }

      const startRes = room.startGame();
      if (!startRes.success) {
        if (ack) ack({ success: false, error: startRes.error });
        return;
      }

      if (ack) ack({ success: true });
      io.to(currentRoomId).emit('GAME_STARTED');
      broadcastGameState(currentRoomId);
    });

    // 5. Dispatch Game Action
    socket.on(
      'DISPATCH_ACTION',
      (
        action: GameAction,
        ack?: (res: { success: boolean; error?: string }) => void
      ) => {
        if (!currentRoomId || !currentPlayerId) {
          if (ack) ack({ success: false, error: 'Not in a room' });
          return;
        }
        const room = roomManager.getRoom(currentRoomId);
        if (!room || !room.game) {
          if (ack) ack({ success: false, error: 'No active game in room' });
          return;
        }

        const result = room.game.dispatchAction(action, currentPlayerId);
        if (!result.success) {
          if (ack) ack({ success: false, error: result.error });
          return;
        }

        if (ack) ack({ success: true });
        broadcastGameState(currentRoomId);
      }
    );

    // 6. Disconnect handling
    socket.on('disconnect', () => {
      if (currentRoomId && currentPlayerId) {
        handlePlayerLeaveOrDisconnect(currentRoomId, currentPlayerId);
      }
    });
  });
}
