"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { Pagination, type PaginationProps } from "./Pagination";

export type { PaginationProps };

export interface Column<T> {
  key?: string;
  header?: string;
  label?: string;
  title?: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  accessor?: keyof T | ((row: T, index: number) => React.ReactNode);
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
  emptyTitle = "No matching records",
  emptySubtitle = "Adjust your active filters or search query to inspect entries.",
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
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const handleSort = (key?: string, sortable?: boolean) => {
    if (!sortable || !key) return;
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return safeData;
    return [...safeData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [safeData, sortKey, sortDir]);

  const hasTopBar = Boolean(title || subtitle || countLabel || toolbar);

  return (
    <div className="table-container bg-card border rounded-xl overflow-hidden shadow-card">
      {hasTopBar && (
        <div
          className="flex flex-col gap-3"
          style={{
            padding: "1.06rem 1.1rem 0.86rem",
            borderBottom: toolbar ? "none" : "1px solid var(--border)",
          }}
        >
          {(title || subtitle || countLabel) && (
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                {title && (
                  <h3
                    className="m-0 font-bold text-primary"
                    style={{ fontSize: "1.06rem", lineHeight: 1.3 }}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p
                    className="text-control-lg text-muted"
                    style={{ margin: "0.16rem 0 0" }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
              {countLabel && (
                <span
                  className="font-medium text-muted whitespace-nowrap"
                  style={{ fontSize: "0.71rem" }}
                >
                  {countLabel}
                </span>
              )}
            </div>
          )}
          {toolbar}
        </div>
      )}

      {loading ? (
        <div className="overflow-x-auto">
          <table
            className="data-table w-full text-left"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr className="border-b bg-card">
                {columns.map((col, idx) => (
                  <th
                    key={col.key || `col-${idx}`}
                    className="text-caption font-semibold text-secondary whitespace-nowrap"
                    style={{
                      padding: "0.56rem 0.82rem",
                      textAlign: col.align || "left",
                      width: col.width,
                    }}
                  >
                    {col.header || col.label || col.title || ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-subtle">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} style={{ padding: "0.62rem 0.82rem" }}>
                      <div
                        className="animate-shimmer rounded-xs"
                        style={{
                          height: "12px",
                          width:
                            cIdx === 0
                              ? "70%"
                              : cIdx === columns.length - 1
                                ? "45%"
                                : "58%",
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
        <div
          className="overflow-x-auto"
          style={{ maxHeight: maxHeight || undefined }}
        >
          <table
            className="data-table w-full text-left"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr className="border-b bg-card">
                {columns.map((col, idx) => {
                  const colKey =
                    col.key ||
                    (typeof col.accessor === "string"
                      ? col.accessor
                      : `col-${idx}`);
                  return (
                    <th
                      key={colKey}
                      onClick={() => handleSort(colKey, col.sortable)}
                      className="text-caption font-semibold text-secondary whitespace-nowrap"
                      style={{
                        padding: "0.56rem 0.82rem",
                        textAlign: col.align || "left",
                        width: col.width,
                        cursor: col.sortable ? "pointer" : "default",
                        userSelect: "none",
                      }}
                    >
                      <span
                        className="inline-flex items-center"
                        style={{ gap: "0.3rem" }}
                      >
                        {col.header || col.label || col.title || ""}
                        {col.sortable && sortKey === colKey && (
                          <span
                            className="text-brand"
                            style={{ fontSize: "0.65rem" }}
                          >
                            {sortDir === "asc" ? "↑" : "↓"}
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
                const key = keyExtractor
                  ? keyExtractor(row, idx)
                  : (row.id ?? idx);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom:
                        idx === sortedData.length - 1
                          ? "none"
                          : "1px solid var(--border-subtle)",
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background-color 0.14s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-card-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {columns.map((col, cIdx) => {
                      const colKey =
                        col.key ||
                        (typeof col.accessor === "string"
                          ? col.accessor
                          : `col-${cIdx}`);
                      let cellContent: React.ReactNode = null;
                      if (col.render) {
                        cellContent = col.render(row, idx);
                      } else if (col.accessor) {
                        cellContent =
                          typeof col.accessor === "function"
                            ? col.accessor(row, idx)
                            : row[col.accessor as keyof T];
                      } else if (col.key) {
                        cellContent = row[col.key as keyof T];
                      }

                      return (
                        <td
                          key={colKey}
                          className="text-primary"
                          style={{
                            padding: "0.56rem 0.82rem",
                            fontSize: "0.775rem",
                            textAlign: col.align || "left",
                            verticalAlign: "middle",
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

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
