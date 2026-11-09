'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  liveStatus,
}: {
  title: string;
  subtitle?: string;
  liveStatus?: string;
}) {
  return (
    <header style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {liveStatus && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-pill)',
              color: 'var(--color-success)',
              background: 'var(--color-success-bg)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
            {liveStatus}
          </span>
        )}
      </div>
      {subtitle && (
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {subtitle}
        </p>
      )}
    </header>
  );
}

export function FilterBar({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {tabs.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-pressed={selected}
              style={{
                padding: '0.45rem 0.75rem',
                border: `1px solid ${selected ? 'var(--brand-blue-500)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                color: selected ? 'var(--text-inverse)' : 'var(--text-secondary)',
                background: selected ? 'var(--brand-blue-500)' : 'var(--bg-surface)',
                font: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: selected ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <label style={{ position: 'relative', width: 'min(100%, 300px)' }}>
        <Search
          aria-hidden="true"
          size={15}
          style={{ position: 'absolute', top: '50%', left: '0.7rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem 0.55rem 2rem',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            font: 'inherit',
            fontSize: '0.875rem',
          }}
        />
      </label>
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = 'No records found',
  emptySubtitle,
}: {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAscending, setSortAscending] = useState(true);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const left = (a as Record<string, unknown>)[sortKey];
      const right = (b as Record<string, unknown>)[sortKey];
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));
      return sortAscending ? comparison : -comparison;
    });
  }, [data, sortAscending, sortKey]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortAscending((ascending) => !ascending);
    else {
      setSortKey(key);
      setSortAscending(true);
    }
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr>
            {columns.map((column) => {
              const key = String(column.key);
              return (
                <th
                  key={key}
                  scope="col"
                  onClick={() => column.sortable && toggleSort(key)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface-muted)',
                    color: 'var(--text-secondary)',
                    textAlign: column.align || 'left',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    letterSpacing: '0.04em',
                    cursor: column.sortable ? 'pointer' : 'default',
                  }}
                >
                  {column.label}
                  {sortKey === key ? (sortAscending ? ' ↑' : ' ↓') : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading…
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{emptyTitle}</div>
                {emptySubtitle && (
                  <div style={{ marginTop: '0.3rem', color: 'var(--text-secondary)' }}>{emptySubtitle}</div>
                )}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr key={keyExtractor(row)}>
                {columns.map((column, columnIndex) => (
                  <td
                    key={`${String(column.key)}-${columnIndex}`}
                    style={{
                      padding: '0.8rem 1rem',
                      borderBottom: rowIndex === sortedData.length - 1 ? undefined : '1px solid var(--border-subtle)',
                      textAlign: column.align || 'left',
                      color: 'var(--text-primary)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[String(column.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
