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
  extraFilters?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  tabs,
  activeTab,
  onTabChange,
  extraFilters,
}) => {
  const currentSearch = search ?? searchQuery ?? '';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    style={{
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: isActive ? 'var(--brand-primary-subtle)' : 'var(--bg-base)',
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Right controls: Search & Extra filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flex: tabs && tabs.length > 0 ? '0 1 auto' : '1 1 auto',
          justifyContent: 'flex-end',
        }}
      >
        {onSearchChange && (
          <div
            style={{
              position: 'relative',
              width: '280px',
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Search size={15} />
            </span>
            <input
              type="text"
              value={currentSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '0.5rem 2rem 0.5rem 2.25rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--brand-primary)';
                e.target.style.boxShadow = '0 0 0 3px var(--brand-primary-subtle)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {currentSearch && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {extraFilters}
      </div>
    </div>
  );
};
