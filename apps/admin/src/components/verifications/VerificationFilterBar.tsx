"use client";

import React from "react";
import { Search, RotateCw, X } from "lucide-react";
import { EntityFilter, StatusFilter } from "../../hooks/useVerificationCenter";

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
  scopedContext?: string | null;
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
  scopedContext,
}) => {
  return (
    <div
      className="card mb-4 flex flex-col gap-3"
      style={{ padding: "0.9rem 1.05rem" }}
    >
      {/* Top row: Search input & Refresh */}
      <div className="flex items-center flex-wrap" style={{ gap: "0.65rem" }}>
        <div className="relative" style={{ flex: "1 1 280px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "0.78rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search by Name, Mobile (+91), License, Vehicle Plate, or GST..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input pl-8"
            style={{
              paddingRight: searchQuery ? "1.85rem" : "0.68rem",
              height: "32px",
              fontSize: "0.775rem",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear verification search"
              className="absolute top-1/2 center-y bg-transparent border-0 text-muted cursor-pointer inline-flex"
              style={{ right: "0.55rem", padding: "0.15rem" }}
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
          style={{ height: "32px" }}
        >
          <RotateCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>{isLoading ? "Syncing..." : "Refresh Queue"}</span>
        </button>
      </div>

      {/* Bottom row: Entity Filter Tabs & Status Pills */}
      <div className="flex justify-between items-center flex-wrap gap-3 border-t border-subtle pt-3">
        {!scopedContext ? (
          <div className="tabs">
            {(
              [
                { id: "ALL", label: "All Applicants" },
                { id: "DRIVER", label: "Drivers (KYC)" },
                { id: "FLEET", label: "Fleets" },
                { id: "VENDOR", label: "Vendors (Enterprise)" },
                { id: "CORPORATE", label: "Corporate" },
              ] as const
            ).map((tab) => {
              const isSelected = entityFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onEntityFilterChange(tab.id)}
                  className={`tab-item${isSelected ? " active" : ""}`}
                  style={{
                    background: isSelected
                      ? "var(--brand-primary)"
                      : "transparent",
                    color: isSelected ? "#ffffff" : "var(--text-secondary)",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-body-sm font-semibold text-brand">
            Scoped to: {scopedContext.charAt(0).toUpperCase() + scopedContext.slice(1)}
          </div>
        )}

        <div className="flex gap-compact items-center flex-wrap">
          <span className="text-label text-muted font-semibold">Status:</span>
          {(
            [
              { id: "UNDER_REVIEW", label: "Under Review" },
              { id: "PENDING", label: "Incomplete (Draft)" },
              { id: "ALL", label: "All" },
              { id: "VERIFIED", label: "Approved" },
              { id: "REJECTED", label: "Declined" },
            ] as const
          ).map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusFilterChange(pill.id)}
                className={`filter-pill-chip${isSelected ? " active" : ""}`}
              >
                {pill.label}
              </button>
            );
          })}
          <span className="ml-tight text-control-lg text-muted">
            <strong className="text-primary">{totalCount}</strong> results
          </span>
        </div>
      </div>
    </div>
  );
};
