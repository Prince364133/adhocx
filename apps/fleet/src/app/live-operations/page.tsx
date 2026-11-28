'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { FleetLiveOpsResponseDto, FleetLiveOpsRideDto } from '@adhocx/contracts';
import { RefreshCw, X } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { TablePageSkeleton } from '../../components/common/Skeletons';
import { EmptyState, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

export default function FleetLiveOperationsPage() {
  const [status, setStatus] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('');
  const [data, setData] = useState<FleetLiveOpsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<FleetLiveOpsRideDto | null>(null);
  const [showMapPanel, setShowMapPanel] = useState(false);

  const loadLiveOps = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fleetApi.getLiveOperations({ status });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to fetch live operations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    void loadLiveOps(false);
  }, [loadLiveOps]);

  const rides = (data?.rides || []).filter((r) => {
    if (!driverFilter.trim()) return true;
    const q = driverFilter.trim().toLowerCase();
    return (
      r.driverName.toLowerCase().includes(q) ||
      (r.vehiclePlate || '').toLowerCase().includes(q)
    );
  });

  const locatedRides = rides.filter((r) => r.lastLocation && !r.lastLocation.isStale);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Operational Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem' }}>
        {[
          { label: 'Drivers Available', value: data?.summary.driversAvailable ?? 0 },
          { label: 'Drivers on Trip', value: data?.summary.driversOnTrip ?? 0 },
          { label: 'Active Rides', value: data?.summary.activeRides ?? 0 },
        ].map((item) => (
          <div key={item.label} className="fleet-card">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem' }}>{item.value}</div>
          </div>
        ))}
      </section>

      {/* Filter & Refresh Controls */}
      <div className="fleet-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            placeholder="Filter by driver or plate..."
            style={{ minWidth: '210px', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
          />
          <select
            aria-label="Filter active rides by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
          >
            <option value="ALL">All Active Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ARRIVED">Arrived</option>
            <option value="IN_PROGRESS">In Progress</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {data?.lastRefreshedAt && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Last refreshed: {new Date(data.lastRefreshedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowMapPanel((v) => !v)}
            style={{ padding: '0.42rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            {showMapPanel ? 'Hide Map View' : 'Optional Map View'}
          </button>
          <button
            type="button"
            onClick={() => void loadLiveOps(true)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.42rem 0.8rem', borderRadius: '8px', border: 'none', background: 'var(--brand-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {showMapPanel && (
        <div className="fleet-card">
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', fontWeight: 700 }}>Location Feed Summary</h3>
          {locatedRides.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Fresh live coordinates are unavailable right now (stale threshold: {data?.locationStaleAfterSeconds ?? 120}s). Operational list view below remains fully active.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {locatedRides.map((r) => (
                <div key={r.tripId} style={{ fontSize: '0.825rem' }}>
                  <strong>{r.driverName}</strong> ({r.vehiclePlate || 'No plate'}):{' '}
                  {r.lastLocation?.latitude.toFixed(4)}, {r.lastLocation?.longitude.toFixed(4)}{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    (recorded {r.lastLocation?.recordedAt ? new Date(r.lastLocation.recordedAt).toLocaleTimeString() : '—'})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => void loadLiveOps(true)} />}

      {loading ? (
        <TablePageSkeleton />
      ) : rides.length === 0 ? (
        <EmptyState
          title="No Active Fleet Rides"
          description="Currently there are no active assigned or in-progress rides matching your filters."
        />
      ) : (
        <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Driver & Vehicle</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Route</th>
                <th style={{ padding: '0.75rem 1rem' }}>Last Updated</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((ride) => (
                <tr key={ride.tripId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700 }}>{ride.driverName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {[ride.vehiclePlate, ride.vehicleType].filter(Boolean).join(' · ') || 'No vehicle info'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusBadge status={ride.status} />
                    {ride.lastLocation?.isStale && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginTop: '0.2rem' }}>
                        Delayed location
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div>{ride.pickupAddress}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>→ {ride.dropAddress}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(ride.lastUpdatedAt).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedRide(ride)}
                      style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRide && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', justifyContent: 'flex-end', zIndex: 90 }}
        >
          <div style={{ width: 'min(440px, 100%)', background: 'var(--bg-surface)', height: '100%', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Active Ride Details</h3>
              <button type="button" onClick={() => setSelectedRide(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="fleet-card">
              <div><strong>Driver:</strong> {selectedRide.driverName}</div>
              <div><strong>Vehicle:</strong> {selectedRide.vehiclePlate || '—'} ({selectedRide.vehicleType || '—'})</div>
              <div><strong>Status:</strong> <StatusBadge status={selectedRide.status} /></div>
              <div style={{ marginTop: '0.5rem' }}><strong>Pickup:</strong> {selectedRide.pickupAddress}</div>
              <div><strong>Drop:</strong> {selectedRide.dropAddress}</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Started: {selectedRide.startedAt ? new Date(selectedRide.startedAt).toLocaleString() : 'Pending start'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
