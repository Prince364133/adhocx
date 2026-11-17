"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className = "",
  style = {},
}) => {
  if (totalPages <= 1 && totalItems === undefined) {
    return null;
  }

  return (
    <div className={`pagination-container ${className}`.trim()} style={style}>
      <span className="pagination-info">
        Page <strong className="text-primary">{currentPage}</strong> of{" "}
        <strong className="text-primary">{Math.max(1, totalPages)}</strong>
        {totalItems !== undefined && ` (${totalItems} total records)`}
      </span>

      <div className="pagination-actions">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="pagination-btn"
          aria-label="Previous Page"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="pagination-btn"
          aria-label="Next Page"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
