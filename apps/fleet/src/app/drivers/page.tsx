'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { FleetDriverDetailDto, FleetDriverSummaryDto } from '@adhocx/contracts';
import { X } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { getStoredFleetUser } from '../../lib/auth/session';
import { DrawerSkeleton, TablePageSkeleton } from '../../components/common/Skeletons';
import { ConfirmDialog, EmptyState, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

export default function FleetDriversPage() {
  const storedUser = getStoredFleetUser();
  const isOwner = storedUser?.role === 'FLEET_OWNER';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [drivers, setDrivers] = useState<FleetDriverSummaryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FleetDriverDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'trips' | 'earnings'>('profile');

  const [showReassign, setShowReassign] = useState(false);
  const [plateInput, setPlateInput] = useState('');
  const [vehicleTypeInput, setVehicleTypeInput] = useState('');
  const [vehicleModelInput, setVehicleModelInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fleetApi.listDrivers({
        search: search.trim() || undefined,
        status,
        vehiclePlate: vehicleFilter.trim() || undefined,
        page,
        limit: 20,
      });
      setDrivers(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load fleet drivers.');
    } finally {
      setLoading(false);
    }
  }, [search, status, vehicleFilter, page]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const openDriverDrawer = async (driverId: string) => {
    setSelectedDriverId(driverId);
    setDetailTab('profile');
    setActionError(null);
    setDetailLoading(true);
    try {
      const res = await fleetApi.getDriverDetail(driverId);
      setDetail(res);
      setPlateInput(res.vehiclePlate || '');
      setVehicleTypeInput(res.vehicleType || '');
      setVehicleModelInput(res.vehicleModel || '');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Unable to load driver profile.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReassignVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId || !plateInput.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await fleetApi.reassignVehicle(selectedDriverId, {
        vehiclePlate: plateInput.trim(),
        vehicleType: vehicleTypeInput.trim() || undefined,
        vehicleModel: vehicleModelInput.trim() || undefined,
      });
      setShowReassign(false);
      await openDriverDrawer(selectedDriverId);
      await loadDrivers();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update vehicle assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDriver = async () => {
    if (!selectedDriverId) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await fleetApi.removeDriver(selectedDriverId);
      setConfirmRemove(false);
      setSelectedDriverId(null);
      setDetail(null);
      await loadDrivers();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove driver.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search & Filters */}
      <div className="fleet-card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search driver name, ID, or phone..."
          style={{ flex: '1 1 240px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
        />
        <input
          type="text"
          value={vehicleFilter}
          onChange={(e) => { setPage(1); setVehicleFilter(e.target.value); }}
          placeholder="Filter by vehicle plate..."
          style={{ flex: '0 1 190px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
        />
        <select
          aria-label="Filter by driver status"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="BUSY">On Trip</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      {error && <ErrorState message={error} onRetry={loadDrivers} />}

      {loading ? (
        <TablePageSkeleton />
      ) : drivers.length === 0 ? (
        <EmptyState
          title="No Fleet Drivers Found"
          description="Share your Fleet Code from the Dashboard so drivers can join your fleet during registration or onboarding."
        />
      ) : (
        <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Driver</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Assigned Vehicle (1:1)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Trips</th>
                <th style={{ padding: '0.75rem 1rem' }}>Earnings</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((drv) => (
                <tr key={drv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700 }}>{drv.fullName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {drv.phone} · {drv.id.slice(0, 8).toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusBadge status={drv.availabilityStatus} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{drv.vehiclePlate || 'Unassigned'}</div>
                    {(drv.vehicleType || drv.vehicleModel) && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {[drv.vehicleType, drv.vehicleModel].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{drv.tripsInPeriod}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    ₹{Math.round(drv.earningsInPeriod || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => void openDriverDrawer(drv.id)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-strong)',
                        background: 'var(--bg-surface)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Total drivers: {total}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <span>Page {page}</span>
              <button type="button" disabled={drivers.length < 20} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Profile Drawer */}
      {selectedDriverId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 90,
          }}
        >
          <div
            style={{
              width: 'min(560px, 100%)',
              background: 'var(--bg-surface)',
              height: '100%',
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {detail?.fullName || 'Driver Profile'}
              </h2>
              <button
                type="button"
                aria-label="Close driver drawer"
                onClick={() => { setSelectedDriverId(null); setDetail(null); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {actionError && <ErrorState message={actionError} />}

            {detailLoading || !detail ? (
              <DrawerSkeleton />
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  {(['profile', 'trips', 'earnings'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDetailTab(t)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        background: detailTab === t ? 'var(--brand-primary)' : 'var(--bg-surface-muted)',
                        color: detailTab === t ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {t === 'profile' ? 'Profile & Vehicle' : t === 'trips' ? 'Trip History' : 'Earnings & Payouts'}
                    </button>
                  ))}
                </div>

                {detailTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="fleet-card">
                      <div><strong>Phone:</strong> {detail.phone}</div>
                      {detail.email && <div><strong>Email:</strong> {detail.email}</div>}
                      <div><strong>Verification:</strong> <StatusBadge status={detail.verificationStatus} /></div>
                      <div><strong>Availability:</strong> <StatusBadge status={detail.availabilityStatus} /></div>
                    </div>

                    <div className="fleet-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Assigned Vehicle (1:1)</strong>
                        {isOwner && (
                          <button type="button" onClick={() => setShowReassign((v) => !v)} style={{ cursor: 'pointer' }}>
                            {showReassign ? 'Cancel' : 'Reassign Vehicle'}
                          </button>
                        )}
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>
                        Plate: <strong>{detail.vehiclePlate || 'Unassigned'}</strong> ·{' '}
                        {[detail.vehicleType, detail.vehicleModel].filter(Boolean).join(' ') || '—'}
                      </div>

                      {showReassign && (
                        <form onSubmit={handleReassignVehicle} style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            type="text"
                            required
                            value={plateInput}
                            onChange={(e) => setPlateInput(e.target.value)}
                            placeholder="Vehicle Plate (e.g. KA01AB1234)"
                            style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-strong)' }}
                          />
                          <input
                            type="text"
                            value={vehicleTypeInput}
                            onChange={(e) => setVehicleTypeInput(e.target.value)}
                            placeholder="Vehicle Type (e.g. SEDAN)"
                            style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-strong)' }}
                          />
                          <input
                            type="text"
                            value={vehicleModelInput}
                            onChange={(e) => setVehicleModelInput(e.target.value)}
                            placeholder="Vehicle Model"
                            style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-strong)' }}
                          />
                          <button type="submit" disabled={submitting} style={{ padding: '0.5rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                            {submitting ? 'Saving...' : 'Save Vehicle'}
                          </button>
                        </form>
                      )}
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(true)}
                        style={{
                          padding: '0.55rem 0.9rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-danger)',
                          background: 'transparent',
                          color: 'var(--color-danger)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove Driver from Fleet
                      </button>
                    )}
                  </div>
                )}

                {detailTab === 'trips' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {detail.trips.length === 0 ? (
                      <EmptyState title="No Trips Yet" description="Trips completed by this driver will appear here." />
                    ) : (
                      detail.trips.map((t) => (
                        <div key={t.id} className="fleet-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <StatusBadge status={t.status} />
                            {t.earnings != null && <strong>₹{Math.round(t.earnings)}</strong>}
                          </div>
                          <div style={{ fontSize: '0.825rem', marginTop: '0.35rem' }}>
                            {t.pickupAddress} → {t.dropAddress}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {detailTab === 'earnings' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="fleet-card">
                      <strong>Monthly Activity</strong>
                      {detail.monthlyActivity.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>No monthly records yet.</div>
                      ) : (
                        detail.monthlyActivity.map((m) => (
                          <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                            <span>{m.month} ({m.trips} trips)</span>
                            <strong>₹{Math.round(m.earnings || 0)}</strong>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="fleet-card">
                      <strong>Payout Records</strong>
                      {detail.payouts.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>No payout records yet.</div>
                      ) : (
                        detail.payouts.map((p) => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                            <StatusBadge status={p.status} />
                            <strong>₹{Math.round(p.amount)}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmRemove}
        title="Remove Driver from Fleet?"
        description="The driver will be dissociated from your fleet and their assigned vehicle will become available for reassignment."
        confirmLabel="Remove Driver"
        isLoading={submitting}
        onConfirm={handleRemoveDriver}
        onClose={() => setConfirmRemove(false)}
      />
    </div>
  );
}
