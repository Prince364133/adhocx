import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlightColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  highlightColor,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
        border: '1px solid var(--border-subtle, #1E3060)',
        borderRadius: 'var(--radius-lg, 10px)',
        padding: 'var(--space-4, 16px) var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {highlightColor && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: highlightColor,
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #94A3B8)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              color: highlightColor || 'var(--brand-blue-400, #5290F9)',
              opacity: 0.85,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary, #F8FAFC)',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: trend.isPositive ? 'var(--color-success, #16A34A)' : 'var(--color-danger, #DC2626)',
            }}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748B)',
            marginTop: '4px',
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
};
