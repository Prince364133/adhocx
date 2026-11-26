'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { tenantApi } from '../../../lib/api/corporate';
import type { TenantIntegrations } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

function metricValue(value: number | null, suffix = '') {
  return value === null ? '—' : `${value}${suffix}`;
}

export default function IntegrationHealthWebhooksPage() {
  const { tenantId, status } = useSession();
  const [integrations, setIntegrations] = useState<TenantIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view this tenant’s integration health.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setIntegrations(await tenantApi.integrations(tenantId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load integration health.');
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Integration health</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Only persisted connector and webhook telemetry is shown.
        </p>
      </header>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <ContentLoadingSkeleton kind="metrics" count={4} label="Loading integration health…" />}
      {!loading && !error && integrations && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            {[
              ['HRMS status', integrations.hrms.status],
              ['Uptime', metricValue(integrations.webhookHealth.uptimePct, '%')],
              ['Events today', metricValue(integrations.webhookHealth.totalEventsToday)],
              ['Failed events', metricValue(integrations.webhookHealth.failedEventsToday)],
            ].map(([label, value]) => (
              <article key={label} className="surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                <strong style={{ display: 'block', marginTop: 6, color: 'var(--text-primary)' }}>{value}</strong>
              </article>
            ))}
          </section>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Webhook telemetry</h2>
            <p style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
              No webhook telemetry is available for this tenant. A connector or event log has not been configured.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
