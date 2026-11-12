'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface TabOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  search?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  tabs?: TabOption[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabVariant?: 'pills' | 'segments';
  extraFilters?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onReset?: () => void;
  style?: React.CSSProperties;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  tabs,
  activeTab,
  onTabChange,
  tabVariant = 'pills',
  extraFilters,
  rightSlot,
  onReset,
  style = {},
}) => {
  const effectiveSearch = search !== undefined ? search : searchQuery || '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.52rem',
        marginBottom: '0.65rem',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
        }}
      >
        {onSearchChange && (
          <div style={{ position: 'relative', flex: '1 1 230px', maxWidth: '300px' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={effectiveSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="form-input"
              style={{
                paddingLeft: '1.95rem',
                paddingRight: effectiveSearch ? '1.85rem' : '0.65rem',
                height: '32px',
                fontSize: '0.775rem',
              }}
            />
            {effectiveSearch && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.15rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexWrap: 'wrap',
            marginLeft: onSearchChange ? 'auto' : 0,
          }}
        >
          {tabs && tabs.length > 0 && (
            tabVariant === 'segments' ? (
              <div className="tabs" style={{ flexWrap: 'wrap' }}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange?.(tab.id)}
                      aria-pressed={isActive}
                      className={`tab-item${isActive ? ' active' : ''}`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          style={{
                            padding: '0.05rem 0.4rem',
                            borderRadius: 'var(--radius-pill)',
                            background: isActive ? 'var(--brand-primary-subtle)' : 'var(--bg-card)',
                            color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange?.(tab.id)}
                      aria-pressed={isActive}
                      className={`filter-pill-chip${isActive ? ' active' : ''}`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          style={{
                            padding: '0.02rem 0.38rem',
                            borderRadius: 'var(--radius-pill)',
                            background: isActive ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                            color: isActive ? '#ffffff' : 'var(--text-muted)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                          }}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}

          {extraFilters}
          {rightSlot}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="filter-pill-chip"
              title="Reset active filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
