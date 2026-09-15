import React, { useState } from 'react';

export interface Column<T> {
  key?: string;
  header?: string;
  label?: string;
  title?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  accessor?: keyof T | ((row: T, index: number) => React.ReactNode);
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyMessage?: string;
  pagination?: PaginationProps;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  onRowClick,
  emptyIcon = '📋',
  emptyTitle = 'No records found',
  emptySubtitle = 'There are no items matching the selected filters.',
  emptyMessage,
  pagination,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sortKey, sortOrder]);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        width: '100%',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              {columns.map((col, cIdx) => {
                const title = col.header || col.title || '';
                const isSortable = col.sortable && typeof col.accessor === 'string';
                const sortableKey = isSortable ? (col.accessor as string) : (col.key || '');

                return (
                  <th
                    key={sortableKey || cIdx}
                    onClick={() => isSortable && handleSort(sortableKey)}
                    style={{
                      padding: '0.875rem 1.25rem',
                      background: 'var(--bg-card-elevated)',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border-subtle)',
                      width: col.width,
                      textAlign: col.align || 'left',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        justifyContent:
                          col.align === 'right'
                            ? 'flex-end'
                            : col.align === 'center'
                            ? 'center'
                            : 'flex-start',
                      }}
                    >
                      <span>{title}</span>
                      {isSortable && (
                        <span style={{ fontSize: '0.75rem', opacity: sortKey === sortableKey ? 1 : 0.4, transition: 'transform 0.2s ease' }}>
                          {sortKey === sortableKey ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`}>
                  {columns.map((_, cIdx) => (
                    <td key={`skel-c-${cIdx}`} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div
                        className="animate-shimmer"
                        style={{
                          height: '16px',
                          width: cIdx === 0 ? '75%' : '50%',
                          borderRadius: 'var(--radius-xs)',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.8 }}>{emptyIcon}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {emptyMessage || emptyTitle}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {emptyMessage ? '' : emptySubtitle}
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, rIdx) => (
                <tr
                  key={String(keyExtractor(row, rIdx))}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((col, cIdx) => {
                    let cellContent: React.ReactNode = null;
                    if (col.render) {
                      cellContent = col.render(row, rIdx);
                    } else if (typeof col.accessor === 'function') {
                      cellContent = col.accessor(row, rIdx);
                    } else if (col.accessor && typeof col.accessor === 'string') {
                      cellContent = row[col.accessor];
                    } else if (col.key) {
                      cellContent = row[col.key];
                    }

                    return (
                      <td
                        key={col.key || cIdx}
                        style={{
                          padding: '1rem 1.25rem',
                          borderBottom: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem',
                          textAlign: col.align || 'left',
                          verticalAlign: 'middle',
                        }}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-card)',
          }}
        >
          <div>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{(pagination.currentPage - 1) * (pagination.pageSize || 10) + 1}</strong> to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {Math.min(pagination.currentPage * (pagination.pageSize || 10), pagination.totalItems || 0)}
            </strong>{' '}
            of <strong style={{ color: 'var(--text-primary)' }}>{pagination.totalItems || 0}</strong> entries
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card-elevated)',
                color: pagination.currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: pagination.currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Previous
            </button>
            <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card-elevated)',
                color: pagination.currentPage >= pagination.totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: pagination.currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
