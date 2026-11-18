"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Plus, Search } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { CorporateTenantListItem } from "../../lib/api/types";
import {
  Button,
  Card,
  DataTable,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "../../components/common";
import {
  CompanyOnboardingDrawer,
  CompanyOnboardingResult,
} from "../../components/companies/CompanyOnboardingDrawer";
import type { Column } from "../../components/common/DataTable";

const PAGE_SIZE = 20;

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CorporateTenantListItem[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setLoadError("");
        try {
          const result = await adminApi.getCorporateTenants({
            search: search.trim() || undefined,
            status,
            page: pagination.page,
            limit: PAGE_SIZE,
          });
          if (!cancelled) {
            setCompanies(result.items);
            setPagination(result.pagination);
          }
        } catch (error) {
          if (!cancelled) {
            setLoadError(
              error instanceof Error
                ? error.message
                : "Could not load companies.",
            );
            setCompanies([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      search ? 250 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, status, pagination.page, refreshKey]);

  const columns = useMemo<Column<CorporateTenantListItem>[]>(
    () => [
      {
        key: "name",
        header: "Company",
        sortable: true,
        accessor: "name",
        render: (company) => (
          <div className="flex items-center gap-3">
            <span
              className="grid rounded-md text-brand bg-brand-subtle"
              style={{ placeItems: "center", width: 38, height: 38 }}
            >
              <Building2 size={19} />
            </span>
            <span>
              <strong className="block text-primary">{company.name}</strong>
              <small className="text-secondary">
                {company.legalEntityName}
              </small>
            </span>
          </div>
        ),
      },
      {
        key: "code",
        header: "Company code",
        sortable: true,
        accessor: "code",
        render: (company) => <span className="font-bold">{company.code}</span>,
      },
      {
        key: "industry",
        header: "Industry",
        render: (company) => company.industry || "—",
      },
      {
        key: "gstin",
        header: "GSTIN",
        render: (company) => company.gstin || "—",
      },
      {
        key: "offices",
        header: "Offices",
        align: "center",
        render: (company) => company._count?.offices ?? 0,
      },
      {
        key: "employees",
        header: "Employees",
        align: "center",
        render: (company) => company._count?.employees ?? 0,
      },
      {
        key: "status",
        header: "Status",
        render: (company) => <StatusBadge status={company.status} size="sm" />,
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (company) => (
          <Link
            href={`/companies/${company.id}`}
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-brand)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: 700,
            }}
          >
            View profile <ArrowRight size={14} />
          </Link>
        ),
      },
    ],
    [],
  );

  function handleCreated(
    result: CompanyOnboardingResult,
    options?: { navigate?: boolean },
  ) {
    setDrawerOpen(false);
    setPagination((current) => ({ ...current, page: 1 }));
    setRefreshKey((current) => current + 1);
    if (options?.navigate === false) return;
    const params = new URLSearchParams();
    if (result.logoUploadFailed) params.set("logoUpload", "failed");
    params.set(
      "portalAccess",
      result.portalAccessCreated ? "created" : "not-confirmed",
    );
    if (result.hqOfficeWarning) {
      params.set("hqOfficeWarning", result.hqOfficeWarning);
    }
    router.push(`/companies/${result.companyId}?${params.toString()}`);
  }

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Manage corporate clients, review company profiles, and onboard new organizations."
        breadcrumbs={[{ label: "Admin" }, { label: "Companies" }]}
        actions={
          <Button
            leftIcon={<Plus size={16} />}
            onClick={() => setDrawerOpen(true)}
          >
            Add company
          </Button>
        }
      />

      <Card padding="md" style={{ marginBottom: "1rem" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0" style={{ flex: "1 1 280px" }}>
            <Input
              aria-label="Search companies"
              placeholder="Search company name, legal entity, or code"
              value={search}
              leftIcon={<Search size={16} />}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              wrapperClassName="!mb-0"
            />
          </div>
          <div style={{ width: "auto", minWidth: 150 }}>
            <Select
              aria-label="Filter companies by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              options={[
                { value: "ALL", label: "All statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
              wrapperClassName="!mb-0"
            />
          </div>
          <span className="text-secondary text-base">
            {pagination.total} companies
          </span>
        </div>
      </Card>

      {loadError ? (
        <ErrorState
          title="Could not load companies"
          message={loadError}
          onRetry={() => setRefreshKey((current) => current + 1)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={companies}
          keyExtractor={(company) => company.id}
          loading={loading}
          onRowClick={(company) => router.push(`/companies/${company.id}`)}
          emptyTitle="No companies found"
          emptySubtitle="Try another search or add your first company."
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            pageSize: PAGE_SIZE,
            onPageChange: (page) =>
              setPagination((current) => ({ ...current, page })),
          }}
        />
      )}

      <CompanyOnboardingDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
