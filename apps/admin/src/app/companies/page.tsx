'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Plus, Search } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { CorporateTenantListItem } from '../../lib/api/types';
import { Button, Card, DataTable, PageHeader, StatusBadge } from '../../components/common';
import { CompanyOnboardingDrawer } from '../../components/companies/CompanyOnboardingDrawer';
import type { Column } from '../../components/common/DataTable';

const PAGE_SIZE = 20;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.65rem 0.75rem',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  font: 'inherit',
};

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CorporateTenantListItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError('');
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
          setLoadError(error instanceof Error ? error.message : 'Could not load companies.');
          setCompanies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, status, pagination.page, refreshKey]);

  const columns = useMemo<Column<CorporateTenantListItem>[]>(
    () => [
      {
        key: 'name',
        header: 'Company',
        sortable: true,
        accessor: 'name',
        render: (company) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                color: 'var(--brand-primary)',
                background: 'var(--brand-primary-subtle)',
              }}
            >
              <Building2 size={19} />
            </span>
            <span>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{company.name}</strong>
              <small style={{ color: 'var(--text-secondary)' }}>{company.legalEntityName}</small>
            </span>
          </div>
        ),
      },
      {
        key: 'code',
        header: 'Company code',
        sortable: true,
        accessor: 'code',
        render: (company) => <span style={{ fontWeight: 700 }}>{company.code}</span>,
      },
      {
        key: 'industry',
        header: 'Industry',
        render: (company) => company.industry || '—',
      },
      {
        key: 'gstin',
        header: 'GSTIN',
        render: (company) => company.gstin || '—',
      },
      {
        key: 'offices',
        header: 'Offices',
        align: 'center',
        render: (company) => company._count?.offices ?? 0,
      },
      {
        key: 'employees',
        header: 'Employees',
        align: 'center',
        render: (company) => company._count?.employees ?? 0,
      },
      {
        key: 'status',
        header: 'Status',
        render: (company) => <StatusBadge status={company.status} size="sm" />,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (company) => (
          <Link
            href={`/companies/${company.id}`}
            onClick={(event) => event.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              fontSize: '0.8125rem',
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

  function handleCreated(companyId: string, logoUploadFailed: boolean) {
    setDrawerOpen(false);
    setPagination((current) => ({ ...current, page: 1 }));
    setRefreshKey((current) => current + 1);
    if (logoUploadFailed) {
      router.push(`/companies/${companyId}?logoUpload=failed`);
    } else {
      router.push(`/companies/${companyId}`);
    }
  }

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Manage corporate clients, review company profiles, and onboard new organizations."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Companies' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => setDrawerOpen(true)}>
            Add company
          </Button>
        }
      />

      <Card padding="md" style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flex: '1 1 280px',
              minWidth: 0,
              color: 'var(--text-muted)',
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search companies"
              placeholder="Search company name, legal entity, or code"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              style={{ ...fieldStyle, border: 'none', padding: '0.4rem 0', outline: 'none' }}
            />
          </label>
          <select
            aria-label="Filter companies by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            style={{ ...fieldStyle, width: 'auto', minWidth: 150 }}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            {pagination.total} companies
          </span>
        </div>
      </Card>

      {loadError ? (
        <Card>
          <div role="alert" style={{ color: 'var(--color-danger)' }}>{loadError}</div>
          <Button
            variant="outline"
            size="sm"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Try again
          </Button>
        </Card>
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
            onPageChange: (page) => setPagination((current) => ({ ...current, page })),
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
