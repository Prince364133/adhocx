'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { opsApi } from '../lib/api/opsClient';
import { CorporateTenantOption } from '../lib/api/opsTypes';
import { CompanyCard } from '../components/operations/CompanyCard';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import {
  Building2,
  Car,
  Users,
  AlertTriangle,
  Search,
  RefreshCw,
  Navigation,
} from 'lucide-react';

const COMPANY_STORAGE_KEY = 'adhocx_ops_selected_tenant';

export default function CompanyHubPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    try {
      const res = await opsApi.getTenants({ limit: 100 });
      const items = res?.items ?? [];
      setTenants(items);

      let remembered = '';
      try {
        remembered = localStorage.getItem(COMPANY_STORAGE_KEY) ?? '';
      } catch {}

      const initial = items.find((t) => t.id === remembered)?.id ?? items[0]?.id ?? '';
      setSelectedTenantId(initial);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTenant(id: string) {
    setSelectedTenantId(id);
    try {
      localStorage.setItem(COMPANY_STORAGE_KEY, id);
    } catch {}
  }

  function handleOpenDeck(id: string) {
    handleSelectTenant(id);
    router.push(`/board?tenantId=${id}`);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadTenants();
    setRefreshing(false);
  }

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()),
  );

  // Aggregated operational metrics
  const totalCabs = tenants.reduce((sum, t) => sum + (t.activeCabsCount ?? 0), 0);
  const totalRiders = tenants.reduce((sum, t) => sum + (t.inTransitCount ?? 0), 0);
  const totalExceptions = tenants.reduce(
    (sum, t) => sum + ((t.delayedCount ?? 0) + (t.unassignedCount ?? 0)),
    0,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>
            Corporate Operations Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Multi-Tenant fleet command center. Select a client to monitor and command ongoing commute shifts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="outline"
            size="md"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
            isLoading={refreshing}
            onClick={handleRefresh}
          >
            Refresh Hub
          </Button>

          {selectedTenantId && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Navigation size={15} />}
              onClick={() => router.push(`/board?tenantId=${selectedTenantId}`)}
            >
              Open Live Route Deck
            </Button>
          )}
        </div>
      </div>

      {/* Real-Time Operational Fleet Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <MetricCard
          label="Enterprise Clients"
          value={tenants.length}
          subtext="Active transport contracts"
          icon={<Building2 size={20} />}
          highlightColor="var(--brand-blue-500, #5728B2)"
        />
        <MetricCard
          label="Active Fleet On Road"
          value={`${totalCabs} Cabs`}
          subtext="Yellow-plate verified"
          icon={<Car size={20} />}
          highlightColor="var(--color-success, #16A34A)"
        />
        <MetricCard
          label="Employees In Transit"
          value={`${totalRiders} Riders`}
          subtext="Scheduled shift pickups"
          icon={<Users size={20} />}
          highlightColor="var(--brand-blue-400, #733DD9)"
        />
        <MetricCard
          label="Active Exceptions"
          value={totalExceptions}
          subtext={totalExceptions > 0 ? 'Requires dispatcher attention' : 'All fleets on schedule'}
          icon={<AlertTriangle size={20} />}
          highlightColor={totalExceptions > 0 ? 'var(--color-danger, #DC2626)' : 'var(--color-success, #16A34A)'}
        />
      </div>

      {/* Company Selector & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg, 10px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search company by name or code (e.g. INFOSYS, TCS)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Showing <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{filteredTenants.length}</span> companies
        </div>
      </div>

      {/* Company Cards Grid */}
      {loading ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          Loading corporate clients...
        </div>
      ) : filteredTenants.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <Building2 size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No companies found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            No corporate client matched your search criteria.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredTenants.map((t) => (
            <CompanyCard
              key={t.id}
              tenant={t}
              isSelected={selectedTenantId === t.id}
              onSelect={handleSelectTenant}
              onOpenDeck={handleOpenDeck}
            />
          ))}
        </div>
      )}
    </div>
  );
}
