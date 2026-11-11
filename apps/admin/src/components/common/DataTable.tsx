'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { EmptyState } from '../EmptyState';

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
  data?: T[];
  keyExtractor?: (row: T, index: number) => string | number;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyMessage?: string;
  pagination?: PaginationProps;
  title?: string;
  subtitle?: string;
  countLabel?: string;
  toolbar?: React.ReactNode;
  maxHeight?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data = [],
  keyExtractor,
  loading = false,
  onRowClick,
  emptyIcon,
  emptyTitle = 'No matching records',
  emptySubtitle = 'Adjust your active filters or search query to inspect entries.',
  emptyMessage,
  pagination,
  title,
  subtitle,
  countLabel,
  toolbar,
  maxHeight,
}: DataTableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  const effectiveEmptyDesc = emptyMessage || emptySubtitle;

  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (key?: string, sortable?: boolean) => {
    if (!sortable || !key) return;
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return safeData;
    return [...safeData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [safeData, sortKey, sortDir]);

  const hasTopBar = Boolean(title || subtitle || countLabel || toolbar);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {hasTopBar && (
        <div
          style={{
            padding: '1.06rem 1.1rem 0.86rem',
            borderBottom: toolbar ? 'none' : '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {(title || subtitle || countLabel) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                {title && (
                  <h3 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p style={{ margin: '0.16rem 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {subtitle}
                  </p>
                )}
              </div>
              {countLabel && (
                <span style={{ fontSize: '0.71rem', fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {countLabel}
                </span>
              )}
            </div>
          )}
          {toolbar}
        </div>
      )}

      {loading ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {columns.map((col, idx) => (
                  <th
                    key={col.key || `col-${idx}`}
                    style={{
                      padding: '0.56rem 0.82rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      textAlign: col.align || 'left',
                      width: col.width,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.header || col.label || col.title || ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} style={{ padding: '0.62rem 0.82rem' }}>
                      <div
                        className="animate-shimmer"
                        style={{
                          height: '12px',
                          borderRadius: 'var(--radius-xs)',
                          width: cIdx === 0 ? '70%' : cIdx === columns.length - 1 ? '45%' : '58%',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : sortedData.length === 0 ? (
        <EmptyState
          icon={emptyIcon || <Inbox size={26} color="var(--text-muted)" />}
          title={emptyTitle}
          description={effectiveEmptyDesc}
        />
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: maxHeight || undefined }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                }}
              >
                {columns.map((col, idx) => {
                  const colKey = col.key || (typeof col.accessor === 'string' ? col.accessor : `col-${idx}`);
                  return (
                    <th
                      key={colKey}
                      onClick={() => handleSort(colKey, col.sortable)}
                      style={{
                        padding: '0.56rem 0.82rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textAlign: col.align || 'left',
                        width: col.width,
                        whiteSpace: 'nowrap',
                        cursor: col.sortable ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        {col.header || col.label || col.title || ''}
                        {col.sortable && sortKey === colKey && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--brand-primary)' }}>
                            {sortDir === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {sortedData.map((row, idx) => {
                const key = keyExtractor ? keyExtractor(row, idx) : row.id ?? idx;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: idx === sortedData.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.14s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-elevated)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {columns.map((col, cIdx) => {
                      const colKey = col.key || (typeof col.accessor === 'string' ? col.accessor : `col-${cIdx}`);
                      let cellContent: React.ReactNode = null;
                      if (col.render) {
                        cellContent = col.render(row, idx);
                      } else if (col.accessor) {
                        cellContent =
                          typeof col.accessor === 'function'
                            ? col.accessor(row, idx)
                            : row[col.accessor as keyof T];
                      } else if (col.key) {
                        cellContent = row[col.key as keyof T];
                      }

                      return (
                        <td
                          key={colKey}
                          style={{
                            padding: '0.56rem 0.82rem',
                            fontSize: '0.775rem',
                            color: 'var(--text-primary)',
                            textAlign: col.align || 'left',
                            verticalAlign: 'middle',
                          }}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            padding: '0.58rem 0.9rem',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Page <strong style={{ color: 'var(--text-primary)' }}>{pagination.currentPage}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{pagination.totalPages}</strong>
            {pagination.totalItems !== undefined && ` (${pagination.totalItems} records)`}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="btn btn-secondary btn-sm"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
