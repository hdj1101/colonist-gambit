import React, { useState, useEffect } from 'react';
import type { ResourceCount, ResourceType, MaskedPlayer } from '@colonist-gambit/shared';

interface DiscardModalProps {
  isOpen: boolean;
  requiredCount: number;
  currentResources: ResourceCount;
  pendingDiscards: Record<string, number>;
  opponents: MaskedPlayer[];
  playerColors: Record<string, string>;
  getPlayerName: (playerId: string) => string;
  onDiscard: (cards: Partial<ResourceCount>) => void;
  onClose?: () => void;
}

const RESOURCE_CONFIG: Record<
  ResourceType,
  { label: string; color: string; emoji: string }
> = {
  lumber: { label: 'Lumber', color: '#2e7d32', emoji: '🌲' },
  brick: { label: 'Brick', color: '#c62828', emoji: '🧱' },
  wool: { label: 'Wool', color: '#689f38', emoji: '🐑' },
  grain: { label: 'Grain', color: '#fbc02d', emoji: '🌾' },
  ore: { label: 'Ore', color: '#546e7a', emoji: '⛰️' },
};

const RESOURCE_KEYS: ResourceType[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];

export const DiscardModal: React.FC<DiscardModalProps> = ({
  isOpen,
  requiredCount,
  currentResources,
  pendingDiscards,
  playerColors,
  getPlayerName,
  onDiscard,
  onClose,
}) => {
  const [selected, setSelected] = useState<ResourceCount>({
    lumber: 0,
    brick: 0,
    wool: 0,
    grain: 0,
    ore: 0,
  });

  // Reset selection when requiredCount changes
  useEffect(() => {
    setSelected({
      lumber: 0,
      brick: 0,
      wool: 0,
      grain: 0,
      ore: 0,
    });
  }, [requiredCount]);

  if (!isOpen) return null;

  const totalHand = RESOURCE_KEYS.reduce((sum, res) => sum + (currentResources[res] ?? 0), 0);
  const totalSelected = RESOURCE_KEYS.reduce((sum, res) => sum + selected[res], 0);
  const remainingNeeded = Math.max(0, requiredCount - totalSelected);
  const isSatisfied = totalSelected === requiredCount;

  const handleIncrement = (res: ResourceType) => {
    if (totalSelected >= requiredCount) return;
    if (selected[res] >= (currentResources[res] ?? 0)) return;
    setSelected((prev) => ({
      ...prev,
      [res]: prev[res] + 1,
    }));
  };

  const handleDecrement = (res: ResourceType) => {
    if (selected[res] <= 0) return;
    setSelected((prev) => ({
      ...prev,
      [res]: prev[res] - 1,
    }));
  };

  const handleReset = () => {
    setSelected({
      lumber: 0,
      brick: 0,
      wool: 0,
      grain: 0,
      ore: 0,
    });
  };

  const handleSubmit = () => {
    if (!isSatisfied) return;
    onDiscard(selected);
  };

  const pendingEntries = Object.entries(pendingDiscards);

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
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#2d3748',
            borderBottom: '1px solid #4a5568',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎲</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#ecc94b' }}>
              Discard Phase
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a0aec0',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                lineHeight: 1,
              }}
              title="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requiredCount > 0 ? (
            <>
              <div>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5 }}>
                  A <strong style={{ color: '#ecc94b' }}>7 was rolled</strong>! You have{' '}
                  <strong style={{ color: '#fc8181' }}>{totalHand} cards</strong>, which exceeds the limit of 7.
                </p>
                <p style={{ margin: '6px 0 0 0', color: '#a0aec0', fontSize: '13px' }}>
                  You must choose exactly{' '}
                  <strong style={{ color: '#ecc94b', fontSize: '14px' }}>{requiredCount} cards</strong> to discard back to the bank.
                </p>
              </div>

              {/* Progress Tracker */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isSatisfied ? 'rgba(72, 187, 120, 0.15)' : '#2d3748',
                  border: isSatisfied ? '1px solid #48bb78' : '1px solid #4a5568',
                  borderRadius: '8px',
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: '13px', color: '#cbd5e0' }}>
                  {isSatisfied ? '✅ Ready to discard' : `⚠️ Cards remaining to select:`}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 'bold',
                    color: isSatisfied ? '#48bb78' : '#ecc94b',
                  }}
                >
                  {totalSelected} / {requiredCount} selected
                </span>
              </div>

              {/* Resource Stepper List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {RESOURCE_KEYS.map((res) => {
                  const meta = RESOURCE_CONFIG[res];
                  const owned = currentResources[res] ?? 0;
                  const countSelected = selected[res];
                  const canAdd = owned > countSelected && totalSelected < requiredCount;
                  const canSub = countSelected > 0;

                  return (
                    <div
                      key={res}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#242d3d',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${meta.color}`,
                        opacity: owned === 0 ? 0.45 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{meta.emoji}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f7fafc' }}>
                            {meta.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>
                            In hand: <span style={{ color: '#edf2f7', fontWeight: 600 }}>{owned}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleDecrement(res)}
                          disabled={!canSub}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #4a5568',
                            background: canSub ? '#2d3748' : '#1a202c',
                            color: canSub ? '#fff' : '#718096',
                            cursor: canSub ? 'pointer' : 'not-allowed',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            minWidth: '20px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            color: countSelected > 0 ? '#ecc94b' : '#a0aec0',
                          }}
                        >
                          {countSelected}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(res)}
                          disabled={!canAdd}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #4a5568',
                            background: canAdd ? '#2d3748' : '#1a202c',
                            color: canAdd ? '#fff' : '#718096',
                            cursor: canAdd ? 'pointer' : 'not-allowed',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={totalSelected === 0}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    background: '#2d3748',
                    color: totalSelected > 0 ? '#cbd5e0' : '#718096',
                    border: '1px solid #4a5568',
                    cursor: totalSelected > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isSatisfied}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '6px',
                    background: isSatisfied ? '#ecc94b' : '#4a5568',
                    color: isSatisfied ? '#1a202c' : '#a0aec0',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: isSatisfied ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSatisfied
                    ? `Confirm Discard (${requiredCount} Cards)`
                    : `Select ${remainingNeeded} More Card${remainingNeeded > 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏳</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#ecc94b', fontSize: '16px' }}>
                Waiting For Other Players
              </h4>
              <p style={{ margin: 0, color: '#a0aec0', fontSize: '13px', lineHeight: 1.5 }}>
                You do not have to discard cards (or you have already submitted your cards).
              </p>

              {pendingEntries.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    background: '#242d3d',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#cbd5e0',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                    }}
                  >
                    Players still discarding ({pendingEntries.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pendingEntries.map(([pId, count]) => {
                      const color = playerColors[pId] ?? 'white';
                      const name = getPlayerName(pId);
                      return (
                        <div
                          key={pId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: color === 'white' ? '#edf2f7' : color,
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ color: '#edf2f7', fontWeight: 500 }}>{name}</span>
                          </div>
                          <span style={{ color: '#ecc94b', fontSize: '12px' }}>
                            Needs to discard {count} card{count > 1 ? 's' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
