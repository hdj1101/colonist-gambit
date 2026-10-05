import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { MaskedGameState, GameAction, PlayerColor } from '@colonist-gambit/shared';

export interface LobbyPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  isHost: boolean;
  isReady: boolean;
}

export interface LobbyState {
  roomId: string;
  players: LobbyPlayer[];
  canStart: boolean;
}

export function useSocket(serverUrl: string = 'http://localhost:4000') {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<MaskedGameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setLastError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('LOBBY_STATE_UPDATE', (lobby: LobbyState) => {
      setLobbyState(lobby);
    });

    socket.on('GAME_STATE_UPDATE', (state: MaskedGameState) => {
      setGameState(state);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  const joinRoom = useCallback(
    (roomId: string, playerId: string, name: string, color: PlayerColor) => {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });
        socketRef.current.emit(
          'JOIN_ROOM',
          { roomId, playerId, name, color },
          (res: { success: boolean; error?: string }) => {
            if (!res.success && res.error) setLastError(res.error);
            resolve(res);
          }
        );
      });
    },
    []
  );

  const setReady = useCallback((isReady: boolean) => {
    socketRef.current?.emit('SET_READY', { isReady });
  }, []);

  const startGame = useCallback(() => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });
      socketRef.current.emit('START_GAME', (res: { success: boolean; error?: string }) => {
        if (!res.success && res.error) setLastError(res.error);
        resolve(res);
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    return new Promise<{ success: boolean }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false });
      socketRef.current.emit('LEAVE_ROOM', (res: { success: boolean }) => {
        setLobbyState(null);
        setGameState(null);
        resolve(res ?? { success: true });
      });
    });
  }, []);

  const dispatchAction = useCallback((action: GameAction) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });
      socketRef.current.emit('DISPATCH_ACTION', action, (res: { success: boolean; error?: string }) => {
        if (!res.success && res.error) setLastError(res.error);
        resolve(res);
      });
    });
  }, []);

  return {
    connected,
    lobbyState,
    gameState,
    lastError,
    clearError: () => setLastError(null),
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    dispatchAction,
  };
}
