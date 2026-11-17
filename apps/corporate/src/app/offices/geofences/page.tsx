'use client';

import { useCallback, useEffect, useState } from 'react';
import { tenantApi } from '../../../lib/api/corporate';
import type { Office } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function GeofencesPickupPointsPage() {
  const { tenantId, status } = useSession();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffices = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view this tenant’s offices.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setOffices(await tenantApi.offices(tenantId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load offices.');
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Geofences & pickup points</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Office details are loaded from this tenant. Geofence and pickup-point records are not currently stored by the API.
        </p>
      </header>
      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <p role="status">Loading tenant offices…</p>}
      {!loading && !error && offices.length === 0 && (
        <section className="surface-card" style={{ padding: 32, textAlign: 'center' }}>
          No offices have been registered for this tenant.
        </section>
      )}
      {!loading && !error && offices.length > 0 && (
        <section className="surface-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr><th style={{ padding: 12 }}>Office</th><th style={{ padding: 12 }}>Address</th><th style={{ padding: 12 }}>Coordinates</th><th style={{ padding: 12 }}>Geofence</th></tr>
            </thead>
            <tbody>
              {offices.map((office) => (
                <tr key={office.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 12 }}><strong>{office.name}</strong><div>{office.code}</div></td>
                  <td style={{ padding: 12 }}>{office.addressText || 'Not provided'}</td>
                  <td style={{ padding: 12 }}>
                    {office.latitude && office.longitude ? `${office.latitude}, ${office.longitude}` : 'Not provided'}
                  </td>
                  <td style={{ padding: 12 }}>Not configured</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
