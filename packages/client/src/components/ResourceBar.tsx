import React from 'react';
import type { ResourceCount } from '@colonist-gambit/shared';

interface ResourceBarProps {
  resources: ResourceCount;
}

const RESOURCE_LABELS: Record<keyof ResourceCount, { label: string; color: string; emoji: string }> = {
  lumber: { label: 'Lumber', color: '#2e7d32', emoji: '🌲' },
  brick: { label: 'Brick', color: '#c62828', emoji: '🧱' },
  wool: { label: 'Wool', color: '#689f38', emoji: '🐑' },
  grain: { label: 'Grain', color: '#fbc02d', emoji: '🌾' },
  ore: { label: 'Ore', color: '#546e7a', emoji: '⛰️' },
};

export const ResourceBar: React.FC<ResourceBarProps> = ({ resources }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '10px 16px',
        background: '#2d3748',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}
    >
      {(Object.keys(resources) as (keyof ResourceCount)[]).map((res) => {
        const meta = RESOURCE_LABELS[res];
        const count = resources[res];
        return (
          <div
            key={res}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#1a202c',
              borderLeft: `4px solid ${meta.color}`,
              borderRadius: '4px',
              minWidth: '80px',
              justifyContent: 'space-between',
            }}
          >
            <span>{meta.emoji}</span>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{meta.label}</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ecc94b' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
};
