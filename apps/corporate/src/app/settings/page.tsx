'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { tenantApi } from '../../lib/api/corporate';
import type { TenantIntegrations } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

export default function HrmsIntegrationPage() {
  const { tenantId, status } = useSession();
  const [integrations, setIntegrations] = useState<TenantIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view this tenant’s integrations.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setIntegrations(await tenantApi.integrations(tenantId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load tenant integrations.');
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>HRMS integrations</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Connector status reported for the signed-in company.
          </p>
        </div>
        <button type="button" onClick={() => void loadIntegrations()} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <p role="status">Loading integration status…</p>}
      {!loading && !error && integrations && (
        <section className="surface-card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>HRMS connector</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div><dt>Provider</dt><dd>{integrations.hrms.provider ?? 'Not configured'}</dd></div>
            <div><dt>Status</dt><dd>{integrations.hrms.status}</dd></div>
            <div><dt>Last sync</dt><dd>{integrations.hrms.lastSyncAt ?? 'No sync recorded'}</dd></div>
            <div><dt>Schedule</dt><dd>{integrations.hrms.syncInterval ?? 'Not configured'}</dd></div>
          </dl>
          <p style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            HRMS synchronization is not configured for this tenant. Employee changes made through the portal use the
            tenant’s Corporate API; no external HRMS sync is claimed.
          </p>
        </section>
      )}
    </div>
  );
}
