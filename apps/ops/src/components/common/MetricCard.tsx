import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isLive?: boolean;
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
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg, 10px)',
        padding: 'var(--space-4, 16px) var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        transition: 'background-color 0.2s, border-color 0.2s',
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
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              color: highlightColor || 'var(--brand-blue-500, #5728B2)',
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
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: trend.isLive ? '3px 8px' : 0,
              borderRadius: 'var(--radius-pill)',
              fontSize: '11px',
              fontWeight: 700,
              color: trend.isLive ? 'var(--color-success, #16A34A)' : trend.isPositive ? 'var(--color-success, #16A34A)' : 'var(--color-danger, #DC2626)',
              backgroundColor: trend.isLive ? 'var(--color-success-bg)' : 'transparent',
              border: trend.isLive ? '1px solid var(--color-success-border)' : 'none',
            }}
          >
            {trend.isLive && <span className="pulse-green" />}
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '6px',
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
};
