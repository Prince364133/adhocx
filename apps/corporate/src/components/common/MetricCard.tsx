'use client';

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
    isAlert?: boolean;
  };
  highlightColor?: string;
  onClick?: () => void;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral' | 'warning';
  category?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  highlightColor,
  onClick,
  delta,
  deltaType,
  category,
}) => {
  const effectiveTrend = trend || (delta ? {
    value: delta,
    isPositive: deltaType === 'positive',
    isAlert: deltaType === 'negative',
  } : undefined);

  const categoryColor =
    category === 'primary' ? 'var(--corporate-blue)' :
    category === 'success' ? '#16A34A' :
    category === 'warning' ? '#F59E0B' :
    category === 'danger' ? '#DC2626' :
    category === 'info' ? '#0284C7' : highlightColor;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      className={onClick ? 'hover:shadow-md' : ''}
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                backgroundColor: highlightColor ? `${highlightColor}18` : 'var(--brand-blue-50)',
                color: highlightColor || 'var(--brand-blue-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </span>
        </div>

        {effectiveTrend && (
          <div>
            {effectiveTrend.isLive ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  border: '1px solid var(--color-success-border)',
                }}
              >
                <span className="pulse-green" />
                Live
              </span>
            ) : effectiveTrend.isAlert ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger-border)',
                }}
              >
                {effectiveTrend.value}
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: effectiveTrend.isPositive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                  color: effectiveTrend.isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                  border: `1px solid ${effectiveTrend.isPositive ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
                }}
              >
                {effectiveTrend.value}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
      </div>

      {subtext && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '6px',
            fontWeight: 500,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
