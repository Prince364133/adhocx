'use client';

import React from 'react';
import { Search, RotateCw, RefreshCw } from 'lucide-react';
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
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: 'var(--shadow-card)',
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
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by Name, Mobile (+91), License, Vehicle Plate, or GST..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.5rem',
              background: 'var(--bg-card-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
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
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.18s ease',
          }}
        >
          <RotateCw size={15} className={isLoading ? 'animate-spin' : ''} />
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
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.875rem',
        }}
      >
        {/* Entity Tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--bg-card-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          {(
            [
              { id: 'ALL', label: 'All Applicants' },
              { id: 'DRIVER', label: 'Drivers (KYC)' },
              { id: 'VENDOR', label: 'Vendors (Enterprise)' },
            ] as const
          ).map((tab) => {
            const isSelected = entityFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onEntityFilterChange(tab.id)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  background: isSelected ? 'var(--brand-primary)' : 'transparent',
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
              { id: 'UNDER_REVIEW', label: 'Under Review', color: 'var(--color-warning)' },
              { id: 'ALL', label: 'All', color: 'var(--text-secondary)' },
              { id: 'VERIFIED', label: 'Approved', color: 'var(--color-success)' },
              { id: 'REJECTED', label: 'Declined', color: 'var(--color-danger)' },
            ] as const
          ).map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onStatusFilterChange(pill.id)}
                style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isSelected ? pill.color : 'var(--bg-card-elevated)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  border: isSelected ? `1px solid ${pill.color}` : '1px solid var(--border-subtle)',
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
