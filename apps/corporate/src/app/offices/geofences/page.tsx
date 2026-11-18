'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { tenantApi } from '../../../lib/api/corporate';
import type { Office, OfficeGeofenceDetails } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function GeofencesPickupPointsPage() {
  const { tenantId, status } = useSession();
  const [offices, setOffices] = useState<Office[]>([]);
  const [geofenceByOffice, setGeofenceByOffice] = useState<Record<string, OfficeGeofenceDetails | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOfficesAndGeofences = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view this tenant’s offices and geofences.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const officeList = await tenantApi.offices(tenantId);
      setOffices(officeList);

      const results = await Promise.allSettled(
        officeList.map((office) => tenantApi.geofences(tenantId, office.id)),
      );
      const nextMap: Record<string, OfficeGeofenceDetails | null> = {};
      officeList.forEach((office, idx) => {
        const res = results[idx];
        nextMap[office.id] = res && res.status === 'fulfilled' ? res.value : null;
      });
      setGeofenceByOffice(nextMap);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load office geofences.');
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadOfficesAndGeofences();
  }, [loadOfficesAndGeofences]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Geofences &amp; pickup points</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          Live office geofence radii, security gates, and pickup points configured for this tenant.
        </p>
      </header>
      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <p role="status">Loading tenant offices and geofences…</p>}
      {!loading && !error && offices.length === 0 && (
        <section className="surface-card" style={{ padding: 32, textAlign: 'center' }}>
          No offices have been registered for this tenant.
        </section>
      )}
      {!loading && !error && offices.length > 0 && (
        <section className="surface-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 12 }}>Office</th>
                <th style={{ padding: 12 }}>Address</th>
                <th style={{ padding: 12 }}>Coordinates</th>
                <th style={{ padding: 12 }}>Geofence</th>
                <th style={{ padding: 12 }}>Gates</th>
                <th style={{ padding: 12 }}>Pickup Points</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {offices.map((office) => {
                const details = geofenceByOffice[office.id];
                const radiusLabel = details?.geofence
                  ? `${details.geofence.radiusMeters} m radius`
                  : office.geofenceRadiusMeters
                    ? `${office.geofenceRadiusMeters} m radius`
                    : 'Not configured';
                const gatesCount = details?.gates?.length ?? 0;
                const pickupCount = details?.pickupPoints?.length ?? 0;

                return (
                  <tr key={office.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 12 }}>
                      <strong>{office.name}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{office.code}</div>
                    </td>
                    <td style={{ padding: 12 }}>{office.addressText || 'Not provided'}</td>
                    <td style={{ padding: 12 }}>
                      {office.latitude && office.longitude ? `${office.latitude}, ${office.longitude}` : 'Not provided'}
                    </td>
                    <td style={{ padding: 12 }}>{radiusLabel}</td>
                    <td style={{ padding: 12 }}>
                      {gatesCount > 0
                        ? details?.gates.map((g) => g.name).join(', ')
                        : 'None'}
                    </td>
                    <td style={{ padding: 12 }}>
                      {pickupCount > 0
                        ? details?.pickupPoints.map((p) => p.name).join(', ')
                        : 'None'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <Link
                        href={`/offices/${office.id}`}
                        style={{ color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
