"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Search, X } from "lucide-react";
import { FinancialCompanyOption } from "../../lib/api/types";

interface CompanyFilterDropdownProps {
  companies: FinancialCompanyOption[];
  selectedCompanyId: string | null;
  onChange: (company: FinancialCompanyOption | null) => void;
  loading?: boolean;
}

export const CompanyFilterDropdown: React.FC<CompanyFilterDropdownProps> = ({
  companies,
  selectedCompanyId,
  onChange,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
  }, [companies]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const company of sortedCompanies) {
      const key = company.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const duplicates = new Set<string>();
    for (const [key, count] of counts.entries()) {
      if (count > 1) duplicates.add(key);
    }
    return duplicates;
  }, [sortedCompanies]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCompanies = useMemo(() => {
    if (!normalizedQuery) return sortedCompanies;
    return sortedCompanies.filter((company) =>
      company.name.toLowerCase().includes(normalizedQuery),
    );
  }, [sortedCompanies, normalizedQuery]);

  const selectedCompany = useMemo(
    () =>
      sortedCompanies.find((company) => company.id === selectedCompanyId) ??
      null,
    [sortedCompanies, selectedCompanyId],
  );

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (company: FinancialCompanyOption | null) => {
    onChange(company);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter financial metrics by company"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) setSearchQuery("");
            return next;
          });
        }}
        className="form-input inline-flex items-center justify-between gap-snug text-compact font-medium cursor-pointer bg-surface text-primary"
        style={{
          width: "auto",
          minWidth: "175px",
          maxWidth: "235px",
          padding: "0.36rem 0.65rem",
          borderColor: isOpen ? "var(--border-focus)" : "var(--border)",
          boxShadow: isOpen ? "0 0 0 3px var(--brand-primary-subtle)" : "none",
        }}
      >
        <span className="inline-flex items-center gap-compact min-w-0 flex-1">
          <Building2
            size={13}
            color="var(--text-muted)"
            style={{ flexShrink: 0 }}
          />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {selectedCompany ? selectedCompany.name : "All Companies"}
          </span>
        </span>
        <ChevronDown
          size={13}
          color="var(--text-muted)"
          style={{
            flexShrink: 0,
            transition: "transform 0.15s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 bg-card border rounded-lg shadow-elevated overflow-hidden"
          style={{
            top: "calc(100% + 0.35rem)",
            width: "270px",
            maxWidth: "min(90vw, 300px)",
            zIndex: 60,
          }}
        >
          {/* Search box inside dropdown */}
          <div className="p-2 border-b bg-surface">
            <div className="relative flex items-center">
              <Search
                size={13}
                color="var(--text-muted)"
                style={{
                  position: "absolute",
                  left: "0.55rem",
                  pointerEvents: "none",
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                aria-label="Search companies"
                className="form-input text-control-lg"
                style={{ padding: "0.34rem 1.75rem 0.34rem 1.85rem" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear company search"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inline-flex items-center justify-center rounded-sm border-0 bg-transparent text-muted cursor-pointer"
                  style={{ right: "0.4rem", width: "18px", height: "18px" }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div
            role="listbox"
            aria-label="Companies"
            className="overflow-y-auto flex flex-col"
            style={{ maxHeight: "240px", padding: "0.35rem", gap: "0.12rem" }}
          >
            {!normalizedQuery && (
              <>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedCompanyId === null}
                  onClick={() => handleSelect(null)}
                  className="flex items-center justify-between gap-2 w-full text-left rounded-md border-0 text-compact cursor-pointer"
                  style={{
                    padding: "0.42rem 0.58rem",
                    backgroundColor:
                      selectedCompanyId === null
                        ? "var(--brand-primary-subtle)"
                        : "transparent",
                    color:
                      selectedCompanyId === null
                        ? "var(--text-brand)"
                        : "var(--text-primary)",
                    fontWeight: selectedCompanyId === null ? 600 : 500,
                    transition: "background-color 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCompanyId !== null) {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-surface-elevated)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCompanyId !== null) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span>All Companies</span>
                  {selectedCompanyId === null && (
                    <Check size={13} style={{ flexShrink: 0 }} />
                  )}
                </button>
                {sortedCompanies.length > 0 && (
                  <div
                    style={{
                      height: "1px",
                      backgroundColor: "var(--border)",
                      margin: "0.2rem 0.25rem",
                    }}
                  />
                )}
              </>
            )}

            {loading && sortedCompanies.length === 0 ? (
              <div
                className="text-center text-sm text-muted"
                style={{ padding: "0.85rem 0.6rem" }}
              >
                Loading companies...
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div
                className="text-center text-sm text-muted"
                style={{ padding: "0.85rem 0.6rem" }}
              >
                No matching companies
              </div>
            ) : (
              filteredCompanies.map((company) => {
                const isSelected = selectedCompanyId === company.id;
                const isDuplicateName = duplicateNames.has(
                  company.name.trim().toLowerCase(),
                );
                return (
                  <button
                    key={company.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(company)}
                    className="flex items-center justify-between gap-2 w-full text-left rounded-md border-0 text-compact cursor-pointer"
                    style={{
                      padding: "0.42rem 0.58rem",
                      backgroundColor: isSelected
                        ? "var(--brand-primary-subtle)"
                        : "transparent",
                      color: isSelected
                        ? "var(--text-brand)"
                        : "var(--text-primary)",
                      fontWeight: isSelected ? 600 : 400,
                      transition: "background-color 0.12s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-surface-elevated)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span className="flex items-center gap-compact min-w-0 flex-1">
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {company.name}
                      </span>
                      {isDuplicateName && (
                        <span
                          className="text-muted bg-surface-elevated rounded-sm flex-shrink-0"
                          style={{
                            fontSize: "0.64rem",
                            padding: "0.06rem 0.34rem",
                          }}
                        >
                          {company.companyType === "CORPORATE_TENANT"
                            ? company.code || "Corporate"
                            : "Vendor"}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check size={13} style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
