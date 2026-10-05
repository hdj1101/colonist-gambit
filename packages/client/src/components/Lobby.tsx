import React, { useState } from 'react';
import type { PlayerColor } from '@colonist-gambit/shared';
import type { LobbyState } from '../hooks/useSocket.js';
import { PLAYER_COLORS } from '../canvas/BoardRenderer.js';

interface LobbyProps {
  lobbyState: LobbyState | null;
  onJoin: (roomId: string, name: string, color: PlayerColor) => void;
  onSetReady: (isReady: boolean) => void;
  onStartGame: () => void;
  playerId: string;
}

const AVAILABLE_COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'white', 'green', 'brown'];

export const Lobby: React.FC<LobbyProps> = ({
  lobbyState,
  onJoin,
  onSetReady,
  onStartGame,
  playerId,
}) => {
  const [roomIdInput, setRoomIdInput] = useState('catan-match-1');
  const [nameInput, setNameInput] = useState('Player ' + Math.floor(Math.random() * 100));
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');

  const inRoom = !!lobbyState;
  const currentPlayer = lobbyState?.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#1a202c',
        gap: '24px',
      }}
    >
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ecc94b' }}>Colonist Gambit</h1>
      <p style={{ color: '#a0aec0' }}>Modular Multiplayer Catan</p>

      {!inRoom ? (
        <div
          style={{
            background: '#2d3748',
            padding: '28px',
            borderRadius: '12px',
            width: '360px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div>
            <label style={{ fontSize: '13px', color: '#cbd5e0' }}>Room ID</label>
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#1a202c',
                color: '#fff',
                border: '1px solid #4a5568',
                marginTop: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#cbd5e0' }}>Display Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#1a202c',
                color: '#fff',
                border: '1px solid #4a5568',
                marginTop: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#cbd5e0' }}>Pick Color</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              {AVAILABLE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: PLAYER_COLORS[color] ?? color,
                    border: selectedColor === color ? '3px solid #ecc94b' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => onJoin(roomIdInput, nameInput, selectedColor)}
            style={{
              padding: '10px',
              background: '#3182ce',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Enter Game Lobby
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#2d3748',
            padding: '28px',
            borderRadius: '12px',
            width: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h2 style={{ fontSize: '20px' }}>Room: {lobbyState.roomId}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lobbyState.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#1a202c',
                  borderRadius: '6px',
                  borderLeft: `5px solid ${PLAYER_COLORS[p.color] ?? p.color}`,
                }}
              >
                <span>
                  {p.name} {p.isHost ? '👑' : ''} {p.id === playerId ? '(You)' : ''}
                </span>
                <span style={{ color: p.isReady ? '#48bb78' : '#e53e3e', fontWeight: 'bold' }}>
                  {p.isReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {!isHost && (
              <button
                onClick={() => onSetReady(!currentPlayer?.isReady)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: currentPlayer?.isReady ? '#e53e3e' : '#48bb78',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {currentPlayer?.isReady ? 'Unready' : 'Ready Up'}
              </button>
            )}

            {isHost && (
              <button
                disabled={!lobbyState.canStart}
                onClick={onStartGame}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: lobbyState.canStart ? '#ecc94b' : '#718096',
                  color: '#1a202c',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: lobbyState.canStart ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                }}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
