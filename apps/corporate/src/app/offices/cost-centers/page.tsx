'use client';

import React, { useEffect, useState } from 'react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { Network } from 'lucide-react';
import { LazyScrollSentinel } from '../../../components/common/LazyScrollSentinel';
import { tenantApi } from '../../../lib/api/corporate';
import { useSession } from '../../../lib/auth/SessionContext';
import { useLazySlice } from '../../../lib/hooks/useInfiniteScroll';
import MetricCard from '../../../components/common/MetricCard';

interface TenantCostCenter {
  id: string;
  code: string;
  name: string;
  department?: string | null;
}

export default function CostCentersOrgPage() {
  const { tenantId } = useSession();
  const [costCenters, setCostCenters] = useState<TenantCostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { visibleItems: visibleCostCenters, hasMore, sentinelRef } = useLazySlice(
    costCenters,
    costCenters.length,
    20,
  );

  useEffect(() => {
    if (!tenantId) {
      setCostCenters([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    tenantApi.costCenters(tenantId)
      .then((data) => {
        if (active) setCostCenters(data);
      })
      .catch((err) => {
        console.error('Failed to fetch cost centers:', err);
        if (active) setError('Unable to load tenant cost centers. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Cost Centers
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Configured organizational cost-center records for this tenant
        </p>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      <MetricCard label="Configured cost centers" value={costCenters.length.toLocaleString()} loading={loading} icon={<Network size={20} />} category="primary" />

      <section className="surface-card" style={{ padding: 20 }}>
        {loading ? (
          <ContentLoadingSkeleton kind="table" count={5} label="Loading cost centers…" />
        ) : costCenters.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No cost centers are configured for this tenant.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Name</th><th>Department</th></tr></thead>
              <tbody>
                {visibleCostCenters.map((center) => (
                  <tr key={center.id}>
                    <td>{center.code}</td>
                    <td>{center.name}</td>
                    <td>{center.department ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <LazyScrollSentinel
              sentinelRef={sentinelRef}
              hasMore={hasMore}
              label="Loading more cost centers…"
            />
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          Budget, per-trip cost, and manager details are not part of the current cost-center API response.
        </p>
      </section>
    </div>
  );
}
