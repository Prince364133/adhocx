'use client';

import React from 'react';
import { Search, RotateCw, X } from 'lucide-react';
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
      className="card"
      style={{
        padding: '0.9rem 1.05rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Top row: Search input & Refresh */}
      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '0.78rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by Name, Mobile (+91), License, Vehicle Plate, or GST..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input"
            style={{
              paddingLeft: '2rem',
              paddingRight: searchQuery ? '1.85rem' : '0.68rem',
              height: '32px',
              fontSize: '0.775rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear verification search"
              style={{
                position: 'absolute',
                right: '0.55rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                padding: '0.15rem',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="btn btn-secondary btn-sm"
          style={{ height: '32px' }}
        >
          <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
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
          gap: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.75rem',
        }}
      >
        <div className="tabs">
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
                type="button"
                onClick={() => onEntityFilterChange(tab.id)}
                className={`tab-item${isSelected ? ' active' : ''}`}
                style={{
                  background: isSelected ? 'var(--brand-primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          {(
            [
              { id: 'UNDER_REVIEW', label: 'Under Review' },
              { id: 'ALL', label: 'All' },
              { id: 'VERIFIED', label: 'Approved' },
              { id: 'REJECTED', label: 'Declined' },
            ] as const
          ).map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusFilterChange(pill.id)}
                className={`filter-pill-chip${isSelected ? ' active' : ''}`}
              >
                {pill.label}
              </button>
            );
          })}
          <span style={{ marginLeft: '0.35rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> results
          </span>
        </div>
      </div>
    </div>
  );
};
