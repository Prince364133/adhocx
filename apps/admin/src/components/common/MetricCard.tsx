'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon,
  accentColor = 'var(--brand-primary)',
  onClick,
  active = false,
  style = {},
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: 'var(--bg-card)',
        border: active ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
        borderTop: `2px solid ${accentColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '0.72rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.35rem',
        boxShadow: active ? 'var(--shadow-glow-purple)' : 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
        if (onClick && !active) {
          e.currentTarget.style.borderColor = 'var(--brand-primary-border)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = active ? 'var(--shadow-glow-purple)' : 'var(--shadow-card)';
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--border)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        {icon && (
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-elevated)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>

      {(subtext || trend) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.45rem',
            flexWrap: 'wrap',
          }}
        >
          {subtext && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>{subtext}</span>
          )}
          {trend && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.22rem',
                fontSize: '0.67rem',
                fontWeight: 600,
                padding: '0.1rem 0.42rem',
                borderRadius: 'var(--radius-pill)',
                background: trend.isPositive !== false ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: trend.isPositive !== false ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {trend.isPositive !== false ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
                {trend.label ? ` ${trend.label}` : ''}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
