'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tenantApi } from '../../../lib/api/corporate';
import type { Office, OfficeGeofenceDetails } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

function GeofencesPickupPointsContent() {
  const { tenantId, status } = useSession();
  const searchParams = useSearchParams();
  const requestedOfficeId = searchParams.get('id')?.trim() || '';
  const [showAllOffices, setShowAllOffices] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [geofenceByOffice, setGeofenceByOffice] = useState<Record<string, OfficeGeofenceDetails | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowAllOffices(false);
  }, [requestedOfficeId]);

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

  const requestedOffice = requestedOfficeId
    ? offices.find((office) => office.id === requestedOfficeId) ?? null
    : null;
  const displayedOffices =
    requestedOffice && !showAllOffices ? [requestedOffice] : offices;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Geofences &amp; pickup points</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Live office geofence radii, security gates, and pickup points configured for this tenant.
          </p>
        </div>
        {requestedOffice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                backgroundColor: 'rgba(var(--brand-primary-rgb), 0.1)',
                color: 'var(--brand-primary)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Focused office: {requestedOffice.name}
            </span>
            <button
              type="button"
              onClick={() => setShowAllOffices((current) => !current)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showAllOffices ? 'Filter to selected office' : 'Show all offices'}
            </button>
          </div>
        )}
      </header>
      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <p role="status">Loading tenant offices and geofences…</p>}
      {!loading && !error && offices.length === 0 && (
        <section className="surface-card" style={{ padding: 32, textAlign: 'center' }}>
          No offices have been registered for this tenant.
        </section>
      )}
      {!loading && !error && displayedOffices.length > 0 && (
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
              {displayedOffices.map((office) => {
                const details = geofenceByOffice[office.id];
                const isRequested = Boolean(requestedOfficeId && office.id === requestedOfficeId);
                const radiusLabel = details?.geofence
                  ? `${details.geofence.radiusMeters} m radius`
                  : office.geofenceRadiusMeters
                    ? `${office.geofenceRadiusMeters} m radius`
                    : 'Not configured';
                const gatesCount = details?.gates?.length ?? 0;
                const pickupCount = details?.pickupPoints?.length ?? 0;

                return (
                  <tr
                    key={office.id}
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      backgroundColor: isRequested ? 'rgba(var(--brand-primary-rgb), 0.06)' : undefined,
                    }}
                  >
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

export default function GeofencesPickupPointsPage() {
  return (
    <Suspense fallback={<p role="status">Loading tenant offices and geofences…</p>}>
      <GeofencesPickupPointsContent />
    </Suspense>
  );
}
