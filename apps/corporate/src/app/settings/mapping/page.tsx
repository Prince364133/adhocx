'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantApi } from '../../../lib/api/corporate';
import type { TenantIntegrations } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function ImportMappingEnginePage() {
  const { tenantId, status } = useSession();
  const [integrations, setIntegrations] = useState<TenantIntegrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMappings = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view this tenant’s mappings.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setIntegrations(await tenantApi.integrations(tenantId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load field mappings.');
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadMappings();
  }, [loadMappings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Import field mappings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Mappings are shown only when they are configured for this tenant.
        </p>
      </header>
      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <p role="status">Loading field mappings…</p>}
      {!loading && !error && integrations && (
        integrations.fieldMappings.length > 0 ? (
          <section className="surface-card" style={{ padding: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr><th>System field</th><th>External field</th><th>Required</th><th>Status</th></tr></thead>
              <tbody>
                {integrations.fieldMappings.map((mapping) => (
                  <tr key={mapping.systemField}>
                    <td>{mapping.systemField}</td>
                    <td>{mapping.hrmsField}</td>
                    <td>{mapping.isRequired ? 'Yes' : 'No'}</td>
                    <td>{mapping.mapped ? 'Mapped' : 'Unmapped'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="surface-card" style={{ padding: 32, textAlign: 'center' }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>No field mappings configured</h2>
            <p style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
              This tenant has no persisted HRMS or import field mappings.
            </p>
          </section>
        )
      )}
    </div>
  );
}
