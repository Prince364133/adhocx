'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  badge,
  headerRight,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  children,
  style = {},
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    if (onToggle) onToggle(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
          padding: '1rem 1.05rem 0.84rem',
          background: 'var(--bg-card)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text-primary)',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-card-elevated)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
          {icon && (
            <span style={{ color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{title}</span>
              {badge}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{subtitle}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
          {headerRight && (
            <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
              {headerRight}
            </div>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <ChevronDown size={16} />
          </span>
        </div>
      </button>

      <div className={`collapsible-grid${open ? ' is-open' : ''}`}>
        <div className="collapsible-inner">
          <div
            style={{
              padding: '0.95rem 1.15rem 1.15rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-card)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
