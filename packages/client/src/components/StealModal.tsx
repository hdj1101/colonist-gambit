import React from 'react';
import type { PlayerId, MaskedPlayer } from '@colonist-gambit/shared';

interface StealModalProps {
  isOpen: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  eligibleTargets: PlayerId[];
  opponents: MaskedPlayer[];
  playerColors: Record<string, string>;
  getPlayerName: (playerId: string) => string;
  onSteal: (targetPlayerId: PlayerId) => void;
}

export const StealModal: React.FC<StealModalProps> = ({
  isOpen,
  isMyTurn,
  activePlayerName,
  eligibleTargets,
  opponents,
  playerColors,
  getPlayerName,
  onSteal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 14, 23, 0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#1a202c',
          border: '1px solid #4a5568',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            background: '#2d3748',
            borderBottom: '1px solid #4a5568',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>🥷</span>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#ecc94b' }}>
            Robber Steal
          </h3>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isMyTurn ? (
            <>
              <div>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5 }}>
                  Choose an adjacent player to steal <strong style={{ color: '#ecc94b' }}>1 random resource card</strong> from:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eligibleTargets.map((targetId) => {
                  const opp = opponents.find((o) => o.id === targetId);
                  const color = playerColors[targetId] ?? opp?.color ?? 'white';
                  const name = getPlayerName(targetId);
                  const cardCount = opp?.resourceCardCount ?? 0;

                  return (
                    <button
                      key={targetId}
                      type="button"
                      onClick={() => onSteal(targetId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#242d3d',
                        border: '1px solid #4a5568',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#ecc94b';
                        e.currentTarget.style.background = '#2d3748';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#4a5568';
                        e.currentTarget.style.background = '#242d3d';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: color === 'white' ? '#edf2f7' : color,
                            display: 'inline-block',
                          }}
                        />
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                            {name}
                          </div>
                          <div style={{ color: '#a0aec0', fontSize: '12px' }}>
                            {cardCount} card{cardCount !== 1 ? 's' : ''} in hand
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ecc94b',
                          background: 'rgba(236, 201, 75, 0.1)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(236, 201, 75, 0.3)',
                        }}
                      >
                        Steal
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
              <h4 style={{ margin: '0 0 4px 0', color: '#ecc94b', fontSize: '16px' }}>
                Robber in Action
              </h4>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '13px' }}>
                Waiting for <strong style={{ color: '#edf2f7' }}>{activePlayerName}</strong> to steal a resource card...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
