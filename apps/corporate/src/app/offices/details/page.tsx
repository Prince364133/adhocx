'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { PageLoadingSkeleton } from '@adhocx/ui/page-loading';
import { tenantApi } from '../../../lib/api/corporate';
import type { Office, OfficeGeofenceDetails } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

function OfficeDetailsContent() {
  const { tenantId, status } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const officeIdParam = (Array.isArray(params?.id) ? params.id[0] : params?.id) || searchParams.get('id');
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [geofenceDetails, setGeofenceDetails] = useState<OfficeGeofenceDetails | null>(null);
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
      const result = await tenantApi.offices(tenantId);
      setOffices(result);
      const initialOffice = result.find((office) => office.id === officeIdParam) ?? result[0];
      setSelectedOfficeId(initialOffice?.id ?? '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load office details.');
    } finally {
      setLoading(false);
    }
  }, [officeIdParam, status, tenantId]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  useEffect(() => {
    if (!tenantId || !selectedOfficeId) {
      setGeofenceDetails(null);
      return;
    }
    let active = true;
    tenantApi.geofences(tenantId, selectedOfficeId)
      .then((result) => {
        if (active) setGeofenceDetails(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load office configuration.');
      });
    return () => {
      active = false;
    };
  }, [selectedOfficeId, tenantId]);

  const office = offices.find((item) => item.id === selectedOfficeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>Office details & security configuration</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Only saved office, geofence, gate and pickup-point data is displayed.
          </p>
        </div>
        <Link href="/offices">Back to offices</Link>
      </header>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <PageLoadingSkeleton variant="detail" />}
      {!loading && !error && offices.length === 0 && (
        <section className="surface-card" style={{ padding: 32, textAlign: 'center' }}>
          No offices have been registered for this tenant.
        </section>
      )}
      {!loading && !error && office && (
        <>
          {offices.length > 1 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Office
              <select value={selectedOfficeId} onChange={(event) => setSelectedOfficeId(event.target.value)}>
                {offices.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
              </select>
            </label>
          )}
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>{office.name}</h2>
            <p>{office.addressText || 'Address not provided'}{office.city ? `, ${office.city}` : ''}</p>
            <p>Coordinates: {office.latitude && office.longitude ? `${office.latitude}, ${office.longitude}` : 'Not provided'}</p>
          </section>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Geofence</h2>
            <p>{geofenceDetails?.geofence ? `${geofenceDetails.geofence.radiusMeters} m radius` : 'No geofence is configured for this office.'}</p>
          </section>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Security gates</h2>
            {geofenceDetails?.gates.length ? (
              <ul>{geofenceDetails.gates.map((gate) => <li key={gate.id}>{gate.name} ({gate.type})</li>)}</ul>
            ) : <p>No security gates are configured for this office.</p>}
          </section>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Pickup points</h2>
            {geofenceDetails?.pickupPoints.length ? (
              <ul>{geofenceDetails.pickupPoints.map((point) => <li key={point.id}>{point.name}</li>)}</ul>
            ) : <p>No pickup points are configured for this office.</p>}
          </section>
        </>
      )}
    </div>
  );
}

export default function OfficeDetailsGatesPage() {
  return <Suspense fallback={<PageLoadingSkeleton variant="detail" />}><OfficeDetailsContent /></Suspense>;
}
