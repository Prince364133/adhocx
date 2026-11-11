'use client';

import React from 'react';

export interface SegmentedTabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  title?: string;
  subtitle?: string;
  tabs: SegmentedTabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  rightSlot?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SegmentedTabs<T extends string = string>({
  title,
  subtitle,
  tabs,
  activeTab,
  onChange,
  rightSlot,
  style = {},
}: SegmentedTabsProps<T>) {
  return (
    <div className="module-bar" style={style}>
      {(title || subtitle) && (
        <div style={{ minWidth: 0 }}>
          {title && <div className="module-bar-title">{title}</div>}
          {subtitle && (
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {subtitle}
            </div>
          )}
        </div>
      )}

      <div
        className="module-bar-tabs"
        style={{ marginLeft: !title && !subtitle ? 0 : 'auto', flex: !title && !subtitle ? 1 : undefined }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={isActive}
              className={`module-tab-btn${isActive ? ' active' : ''}`}
            >
              {tab.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.05rem 0.42rem',
                    borderRadius: 'var(--radius-pill)',
                    background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'var(--bg-surface-elevated)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.05rem 0.35rem',
                    borderRadius: 'var(--radius-pill)',
                    background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'var(--brand-primary-subtle)',
                    color: isActive ? '#ffffff' : 'var(--brand-primary)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
        {rightSlot}
      </div>
    </div>
  );
}

