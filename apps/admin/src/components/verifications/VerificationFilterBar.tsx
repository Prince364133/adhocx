'use client';

import React from 'react';
import { EntityFilter, StatusFilter } from '../../hooks/useVerificationCenter';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  entityFilter: EntityFilter;
  onEntityFilterChange: (filter: EntityFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
}

export const VerificationFilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  entityFilter,
  onEntityFilterChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isLoading,
  totalCount,
}) => {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Top row: Search input & Refresh */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1rem',
              color: 'var(--text-muted)',
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by Name, Mobile (+91), License, Vehicle Plate, or GST..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.5rem',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <span style={{ transform: isLoading ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>
            🔄
          </span>
          <span>{isLoading ? 'Syncing...' : 'Refresh Queue'}</span>
        </button>
      </div>

      {/* Bottom row: Entity Filter Tabs & Status Pills */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '0.875rem',
        }}
      >
        {/* Entity Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--bg-base)', padding: '0.25rem', borderRadius: '8px' }}>
          {(
            [
              { id: 'ALL', label: 'All Applicants' },
              { id: 'DRIVER', label: '🪪 Drivers (KYC)' },
              { id: 'VENDOR', label: '🏢 Vendors (B2B)' },
            ] as const
          ).map((tab) => {
            const isSelected = entityFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onEntityFilterChange(tab.id)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  background: isSelected ? 'var(--accent-primary)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Status:
          </span>
          {(
            [
              { id: 'UNDER_REVIEW', label: '⏳ Under Review', color: '#f59e0b' },
              { id: 'ALL', label: 'All', color: '#9ca3af' },
              { id: 'VERIFIED', label: '✅ Approved', color: '#10b981' },
              { id: 'REJECTED', label: '❌ Declined', color: '#f43f5e' },
            ] as const
          ).map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onStatusFilterChange(pill.id)}
                style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: `1px solid ${isSelected ? pill.color : 'var(--border-light)'}`,
                  background: isSelected ? `rgba(${pill.id === 'VERIFIED' ? '16, 185, 129' : pill.id === 'REJECTED' ? '244, 63, 94' : '245, 158, 11'}, 0.15)` : 'transparent',
                  color: isSelected ? pill.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {pill.label}
              </button>
            );
          })}

          <div style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing <strong>{totalCount}</strong> results
          </div>
        </div>
      </div>
    </div>
  );
};
