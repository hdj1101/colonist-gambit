import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket.js';
import { BoardRenderer } from './canvas/BoardRenderer.js';
import { ResourceBar } from './components/ResourceBar.js';
import { Lobby } from './components/Lobby.js';
import type { PlayerColor, VertexId, EdgeId, HexId } from '@colonist-gambit/shared';
import {
  isValidSettlementPlacement,
  isValidRoadPlacement,
  isValidCityUpgrade,
} from '@colonist-gambit/shared';

export const App: React.FC = () => {
  const [myPlayerId] = useState(() => 'player-' + Math.random().toString(36).substring(2, 7));
  const {
    lobbyState,
    gameState,
    lastError,
    clearError,
    joinRoom,
    setReady,
    startGame,
    dispatchAction,
  } = useSocket('http://localhost:4000');

  const [interactionMode, setInteractionMode] = useState<
    'NONE' | 'PLACE_SETTLEMENT' | 'PLACE_ROAD' | 'UPGRADE_CITY' | 'MOVE_ROBBER'
  >('NONE');

  const handleJoin = async (roomId: string, name: string, color: PlayerColor) => {
    await joinRoom(roomId, myPlayerId, name, color);
  };

  // If in game
  if (gameState) {
    const isSetup = gameState.phase === 'SETUP_FORWARD' || gameState.phase === 'SETUP_BACKWARD';
    const activePlayerId = isSetup
      ? (gameState.turnOrder[gameState.setupPlayerIndex ?? 0] ?? gameState.turn.activePlayerId)
      : gameState.turn.activePlayerId;
    const isMyTurn = activePlayerId === myPlayerId;
    const activePlayerName =
      activePlayerId === myPlayerId
        ? 'YOU'
        : (gameState.opponents.find((o) => o.id === activePlayerId)?.name ?? 'Opponent');

    // Calculate selectable board entities
    let selectableVertices: VertexId[] = [];
    let selectableEdges: EdgeId[] = [];
    let selectableHexes: HexId[] = [];

    const validationState: any = {
      ...gameState,
      players: {
        [myPlayerId]: gameState.me,
      },
    };

    if (isMyTurn) {
      if (isSetup) {
        if (gameState.setupStep === 'SETTLEMENT') {
          selectableVertices = Object.keys(gameState.board.vertices).filter(
            (vId) => isValidSettlementPlacement(validationState, myPlayerId, vId, true).valid
          );
        } else if (gameState.setupStep === 'ROAD') {
          const anchor = gameState.setupAnchorVertexId;
          if (anchor) {
            const adjEdges = gameState.board.vertexAdjacentEdges[anchor] ?? [];
            selectableEdges = adjEdges.filter((eId) => !gameState.board.edges[eId]?.road);
          } else {
            const mySettlements = Object.keys(gameState.board.vertices).filter(
              (vId) => gameState.board.vertices[vId]?.building?.playerId === myPlayerId
            );
            const latestSettlement = mySettlements[mySettlements.length - 1];
            if (latestSettlement) {
              const adjEdges = gameState.board.vertexAdjacentEdges[latestSettlement] ?? [];
              selectableEdges = adjEdges.filter((eId) => !gameState.board.edges[eId]?.road);
            }
          }
        }
      } else if (gameState.phase === 'ROBBER_MOVE') {
        selectableHexes = Object.keys(gameState.board.hexes).filter(
          (hId) => hId !== gameState.board.robberHexId
        );
      } else if (gameState.phase === 'ACTION_PHASE') {
        if (interactionMode === 'PLACE_ROAD') {
          selectableEdges = Object.keys(gameState.board.edges).filter(
            (eId) => isValidRoadPlacement(validationState, myPlayerId, eId, false).valid
          );
        } else if (interactionMode === 'PLACE_SETTLEMENT') {
          selectableVertices = Object.keys(gameState.board.vertices).filter(
            (vId) => isValidSettlementPlacement(validationState, myPlayerId, vId, false).valid
          );
        } else if (interactionMode === 'UPGRADE_CITY') {
          selectableVertices = Object.keys(gameState.board.vertices).filter(
            (vId) => isValidCityUpgrade(validationState, myPlayerId, vId).valid
          );
        }
      }
    }

    const onSelectVertex = (vId: VertexId) => {
      if (isSetup && gameState.setupStep === 'SETTLEMENT') {
        dispatchAction({ type: 'PLACE_INITIAL_SETTLEMENT', vertexId: vId });
      } else if (interactionMode === 'PLACE_SETTLEMENT') {
        dispatchAction({ type: 'BUILD_SETTLEMENT', vertexId: vId });
        setInteractionMode('NONE');
      } else if (interactionMode === 'UPGRADE_CITY') {
        dispatchAction({ type: 'UPGRADE_CITY', vertexId: vId });
        setInteractionMode('NONE');
      }
    };

    const onSelectEdge = (eId: EdgeId) => {
      if (isSetup && gameState.setupStep === 'ROAD') {
        dispatchAction({ type: 'PLACE_INITIAL_ROAD', edgeId: eId });
      } else if (interactionMode === 'PLACE_ROAD') {
        dispatchAction({ type: 'BUILD_ROAD', edgeId: eId });
        setInteractionMode('NONE');
      }
    };

    const onSelectHex = (hId: HexId) => {
      if (gameState.phase === 'ROBBER_MOVE') {
        dispatchAction({ type: 'MOVE_ROBBER', hexId: hId });
      }
    };

    const playerColors: Record<string, string> = {
      ...(lobbyState?.players
        ? Object.fromEntries(lobbyState.players.map((p) => [p.id, p.color]))
        : {}),
      ...((gameState as any).players
        ? Object.fromEntries(
            Object.values((gameState as any).players).map((p: any) => [p.id, p.color])
          )
        : {}),
      ...(gameState.me ? { [gameState.me.id]: gameState.me.color } : {}),
      ...(Array.isArray(gameState.opponents)
        ? Object.fromEntries(gameState.opponents.map((o) => [o.id, o.color]))
        : {}),
    };

    console.log('[Colonist Gambit Debug]', {
      myPlayerId,
      me: gameState.me,
      opponents: gameState.opponents,
      playerColors,
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#171923' }}>
        {/* Top Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            background: '#1a202c',
            borderBottom: '1px solid #2d3748',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', color: '#ecc94b' }}>Colonist Gambit</h2>
            <div style={{ fontSize: '12px', color: '#a0aec0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>Phase: {gameState.phase} | Active: {activePlayerName}</span>
              <span style={{ color: '#63b3ed' }}>You: {myPlayerId}</span>
              <span style={{ color: gameState.me?.color === 'white' ? '#edf2f7' : gameState.me?.color, fontWeight: 'bold' }}>
                Color: {gameState.me?.color}
              </span>
              <span style={{ color: '#ecc94b' }}>
                Colors Map: {JSON.stringify(playerColors)}
              </span>
            </div>
          </div>

          {/* Dice & Turn Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {gameState.phase === 'TURN_START' && isMyTurn && (
              <>
                {/* Pre-Roll Knight (if owned) */}
                {gameState.me.devCards.unplayed.some((c) => c.type === 'knight') && (
                  <button
                    onClick={() => dispatchAction({ type: 'PLAY_DEV_CARD', payload: { cardType: 'knight' } })}
                    style={{
                      padding: '8px 14px',
                      background: '#9b2c2c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Play Knight (Pre-Roll)
                  </button>
                )}
                <button
                  onClick={() => dispatchAction({ type: 'ROLL_DICE' })}
                  style={{
                    padding: '8px 16px',
                    background: '#ecc94b',
                    color: '#1a202c',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  🎲 Roll Dice
                </button>
              </>
            )}

            {gameState.phase === 'ACTION_PHASE' && isMyTurn && (
              <button
                onClick={() => dispatchAction({ type: 'END_TURN' })}
                style={{
                  padding: '8px 16px',
                  background: '#e53e3e',
                  color: '#fff',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                End Turn
              </button>
            )}
          </div>
        </header>

        {/* Error Notification */}
        {lastError && (
          <div
            onClick={clearError}
            style={{
              padding: '8px 16px',
              background: '#e53e3e',
              color: '#fff',
              textAlign: 'center',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {lastError} (click to dismiss)
          </div>
        )}

        {/* Main Board View */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          {/* Debug Panel on Left Hand Side */}
          <div
            style={{
              position: 'absolute',
              left: '16px',
              top: '16px',
              zIndex: 10,
              background: 'rgba(26, 32, 44, 0.92)',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '13px',
              maxWidth: '260px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#ecc94b', borderBottom: '1px solid #4a5568', paddingBottom: '4px' }}>
              🛠️ Player Info (Debug)
            </div>
            <div>
              <span style={{ color: '#a0aec0' }}>My ID: </span>
              <code style={{ color: '#63b3ed' }}>{myPlayerId}</code>
            </div>
            <div>
              <span style={{ color: '#a0aec0' }}>State ID: </span>
              <code style={{ color: '#63b3ed' }}>{gameState.me?.id ?? 'N/A'}</code>
            </div>
            <div>
              <span style={{ color: '#a0aec0' }}>My Color: </span>
              <span style={{ fontWeight: 'bold', color: gameState.me?.color === 'white' ? '#edf2f7' : gameState.me?.color }}>
                {gameState.me?.color ?? 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: '#a0aec0' }}>playerColors: </span>
              <pre style={{ margin: '4px 0 0 0', fontSize: '11px', background: '#171923', padding: '6px', borderRadius: '4px', overflowX: 'auto' }}>
                {JSON.stringify(playerColors, null, 2)}
              </pre>
            </div>
          </div>

          <BoardRenderer
            board={gameState.board}
            playerColors={playerColors}
            selectableVertices={selectableVertices}
            selectableEdges={selectableEdges}
            selectableHexes={selectableHexes}
            onSelectVertex={onSelectVertex}
            onSelectEdge={onSelectEdge}
            onSelectHex={onSelectHex}
          />
        </div>

        {/* Bottom Action Tray & Resource Bar */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            background: '#1a202c',
            borderTop: '1px solid #2d3748',
          }}
        >
          <ResourceBar resources={gameState.me.resources} />

          {gameState.phase === 'ACTION_PHASE' && isMyTurn && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setInteractionMode(interactionMode === 'PLACE_ROAD' ? 'NONE' : 'PLACE_ROAD')}
                style={{
                  padding: '8px 12px',
                  background: interactionMode === 'PLACE_ROAD' ? '#ecc94b' : '#2d3748',
                  color: interactionMode === 'PLACE_ROAD' ? '#1a202c' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                + Road
              </button>
              <button
                onClick={() => setInteractionMode(interactionMode === 'PLACE_SETTLEMENT' ? 'NONE' : 'PLACE_SETTLEMENT')}
                style={{
                  padding: '8px 12px',
                  background: interactionMode === 'PLACE_SETTLEMENT' ? '#ecc94b' : '#2d3748',
                  color: interactionMode === 'PLACE_SETTLEMENT' ? '#1a202c' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                + Settlement
              </button>
              <button
                onClick={() => setInteractionMode(interactionMode === 'UPGRADE_CITY' ? 'NONE' : 'UPGRADE_CITY')}
                style={{
                  padding: '8px 12px',
                  background: interactionMode === 'UPGRADE_CITY' ? '#ecc94b' : '#2d3748',
                  color: interactionMode === 'UPGRADE_CITY' ? '#1a202c' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                + City
              </button>
              <button
                onClick={() => dispatchAction({ type: 'BUY_DEV_CARD' })}
                style={{
                  padding: '8px 12px',
                  background: '#2d3748',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Buy Dev Card
              </button>
            </div>
          )}
        </footer>
      </div>
    );
  }

  // Otherwise render Lobby
  return (
    <Lobby
      lobbyState={lobbyState}
      onJoin={handleJoin}
      onSetReady={setReady}
      onStartGame={startGame}
      playerId={myPlayerId}
    />
  );
};
