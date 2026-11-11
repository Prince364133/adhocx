'use client';

import React from 'react';

export type KpiTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'indigo'
  | 'violet'
  | 'neutral';

export interface KpiStripItem {
  id?: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  tone?: KpiTone;
  accentColor?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface KpiStripProps {
  items: KpiStripItem[];
  columns?: number;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_VALUE_COLOR: Record<KpiTone, string> = {
  default: 'var(--text-primary)',
  primary: 'var(--brand-primary)',
  indigo: 'var(--brand-primary)',
  violet: '#8B5CF6',
  neutral: 'var(--text-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
};

export const KpiStrip: React.FC<KpiStripProps> = ({ items, columns, className = '', style = {} }) => {
  return (
    <div
      className={`kpi-strip ${className}`}
      style={{
        gridTemplateColumns: columns ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(auto-fit, minmax(150px, 1fr))`,
        ...style,
      }}
    >
      {items.map((item, idx) => {
        const valueColor = item.accentColor || TONE_VALUE_COLOR[item.tone || 'default'];
        const clickable = Boolean(item.onClick);

        return (
          <div
            key={item.id || `${item.label}-${idx}`}
            className={`kpi-strip-cell${clickable ? ' is-clickable' : ''}`}
            onClick={item.onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                item.onClick?.();
              }
            }}
            style={{
              backgroundColor: item.active ? 'var(--brand-primary-subtle)' : undefined,
              boxShadow: item.active ? 'inset 0 2px 0 var(--brand-primary)' : undefined,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.7rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                minWidth: 0,
              }}
            >
              {item.icon && (
                <span style={{ color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>

            <div
              style={{
                fontSize: '1.175rem',
                fontWeight: 700,
                color: valueColor,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </div>

            {item.subtext && (
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
