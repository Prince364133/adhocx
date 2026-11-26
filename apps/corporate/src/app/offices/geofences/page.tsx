'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ContentLoadingSkeleton, PageLoadingSkeleton, SkeletonBone } from '@adhocx/ui/page-loading';
import { LazyScrollSentinel } from '../../../components/common/LazyScrollSentinel';
import { tenantApi } from '../../../lib/api/corporate';
import type { Office, OfficeGeofenceDetails } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';
import { useLazySlice } from '../../../lib/hooks/useInfiniteScroll';

function GeofencesPickupPointsContent() {
  const { tenantId, status } = useSession();
  const searchParams = useSearchParams();
  const requestedOfficeId = searchParams.get('id')?.trim() || '';
  const [showAllOffices, setShowAllOffices] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [geofenceByOffice, setGeofenceByOffice] = useState<Record<string, OfficeGeofenceDetails | null>>({});
  const [loadingOffices, setLoadingOffices] = useState(true);
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedOfficeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setShowAllOffices(false);
  }, [requestedOfficeId]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!tenantId) {
      setOffices([]);
      setGeofenceByOffice({});
      fetchedOfficeIdsRef.current.clear();
      setLoadingOffices(false);
      setError('Sign in with a corporate account to view this tenant’s offices and geofences.');
      return;
    }

    let cancelled = false;
    setLoadingOffices(true);
    setError(null);
    setGeofenceByOffice({});
    fetchedOfficeIdsRef.current.clear();

    tenantApi
      .offices(tenantId)
      .then((officeList) => {
        if (!cancelled) setOffices(officeList);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : 'Unable to load office geofences.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOffices(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, tenantId]);

  const requestedOffice = useMemo(
    () => (requestedOfficeId ? offices.find((office) => office.id === requestedOfficeId) ?? null : null),
    [offices, requestedOfficeId],
  );
  const displayedOffices = useMemo(
    () => (requestedOffice && !showAllOffices ? [requestedOffice] : offices),
    [offices, requestedOffice, showAllOffices],
  );
  const { visibleItems: visibleOffices, hasMore, sentinelRef } = useLazySlice(
    displayedOffices,
    `${requestedOfficeId}|${showAllOffices}`,
    20,
  );

  useEffect(() => {
    if (!tenantId || displayedOffices.length === 0) return;

    const officesToFetch = displayedOffices.filter(
      (office) => !fetchedOfficeIdsRef.current.has(office.id),
    );
    if (officesToFetch.length === 0) return;

    let cancelled = false;
    setLoadingGeofences(true);

    Promise.allSettled(
      officesToFetch.map((office) => tenantApi.geofences(tenantId, office.id)),
    )
      .then((results) => {
        if (cancelled) return;
        setGeofenceByOffice((current) => {
          const next = { ...current };
          officesToFetch.forEach((office, idx) => {
            const res = results[idx];
            next[office.id] = res && res.status === 'fulfilled' ? res.value : null;
            fetchedOfficeIdsRef.current.add(office.id);
          });
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingGeofences(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, displayedOffices]);

  const hasUnloadedDisplayed = displayedOffices.some((office) => !(office.id in geofenceByOffice));
  const loading = loadingOffices || (loadingGeofences && hasUnloadedDisplayed && Object.keys(geofenceByOffice).length === 0);

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
      {loading && (
        <section className="surface-card" style={{ padding: 20 }}>
          <ContentLoadingSkeleton
            kind="table"
            count={6}
            label="Loading tenant offices and geofences…"
          />
        </section>
      )}
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
              {visibleOffices.map((office) => {
                const isRowLoading = loadingGeofences && !(office.id in geofenceByOffice);
                const details = geofenceByOffice[office.id];
                const isRequested = Boolean(requestedOfficeId && office.id === requestedOfficeId);
                const radiusLabel = details?.geofence
                  ? `${details.geofence.radiusMeters} m radius`
                  : office.geofenceRadiusMeters
                    ? `${office.geofenceRadiusMeters} m radius`
                    : 'Not configured';
                const showRadiusSkeleton =
                  isRowLoading && !details?.geofence && !office.geofenceRadiusMeters;
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
                    <td style={{ padding: 12 }}>
                      {showRadiusSkeleton ? (
                        <SkeletonBone style={{ width: 96, height: 14, borderRadius: 6 }} />
                      ) : (
                        radiusLabel
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {isRowLoading ? (
                        <SkeletonBone style={{ width: 90, height: 14, borderRadius: 6 }} />
                      ) : gatesCount > 0 ? (
                        details?.gates.map((g) => g.name).join(', ')
                      ) : (
                        'None'
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {isRowLoading ? (
                        <SkeletonBone style={{ width: 90, height: 14, borderRadius: 6 }} />
                      ) : pickupCount > 0 ? (
                        details?.pickupPoints.map((p) => p.name).join(', ')
                      ) : (
                        'None'
                      )}
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
          <LazyScrollSentinel
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            label="Loading more offices…"
          />
        </section>
      )}
    </div>
  );
}

export default function GeofencesPickupPointsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="table" />}>
      <GeofencesPickupPointsContent />
    </Suspense>
  );
}
