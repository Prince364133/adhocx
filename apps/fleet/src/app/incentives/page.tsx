'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  FleetDriverSummaryDto,
  FleetIncentiveDto,
  FleetIncentiveEligibility,
  FleetIncentiveProgressDto,
  FleetIncentiveStatus,
  FleetIncentiveType,
} from '@adhocx/contracts';
import { X } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { getStoredFleetUser } from '../../lib/auth/session';
import { DrawerSkeleton, TablePageSkeleton } from '../../components/common/Skeletons';
import { ConfirmDialog, EmptyState, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

export default function FleetIncentivesPage() {
  const user = getStoredFleetUser();
  const isOwner = user?.role === 'FLEET_OWNER';

  const [incentives, setIncentives] = useState<FleetIncentiveDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<FleetIncentiveType>('TARGET_BASED' as FleetIncentiveType);
  const [eligibilityScope, setEligibilityScope] = useState<FleetIncentiveEligibility>(
    'ALL' as FleetIncentiveEligibility,
  );
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<FleetDriverSummaryDto[]>([]);
  const [targetTrips, setTargetTrips] = useState('20');
  const [durationMins, setDurationMins] = useState('480');
  const [rewardAmount, setRewardAmount] = useState('1500');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingItem, setEditingItem] = useState<FleetIncentiveDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editRewardAmount, setEditRewardAmount] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');

  const [statusTarget, setStatusTarget] = useState<{ item: FleetIncentiveDto; next: FleetIncentiveStatus } | null>(null);
  const [progressItem, setProgressItem] = useState<FleetIncentiveDto | null>(null);
  const [progressRows, setProgressRows] = useState<FleetIncentiveProgressDto[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const loadIncentives = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fleetApi.listIncentives();
      setIncentives(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load incentives.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncentives();
  }, [loadIncentives]);

  useEffect(() => {
    if (!isOwner) return;
    fleetApi
      .listDrivers({ limit: 100 })
      .then((res) => setFleetDrivers(res.items || []))
      .catch(() => setFleetDrivers([]));
  }, [isOwner]);

  const toggleDriverSelection = (driverId: string) => {
    setSelectedDriverIds((prev) =>
      prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      eligibilityScope === ('SELECTED' as FleetIncentiveEligibility) &&
      selectedDriverIds.length === 0
    ) {
      setError('Select at least one fleet driver for SELECTED eligibility scope.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await fleetApi.createIncentive({
        name: name.trim(),
        type,
        eligibilityScope,
        eligibleDriverIds:
          eligibilityScope === ('SELECTED' as FleetIncentiveEligibility)
            ? selectedDriverIds
            : undefined,
        targetTrips: type === ('TARGET_BASED' as FleetIncentiveType) ? Number(targetTrips) : undefined,
        requiredDurationMinutes: type === ('TIME_BASED' as FleetIncentiveType) ? Number(durationMins) : undefined,
        rewardAmount: Number(rewardAmount),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setShowCreate(false);
      setName('');
      setEligibilityScope('ALL' as FleetIncentiveEligibility);
      setSelectedDriverIds([]);
      await loadIncentives();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create incentive.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (inc: FleetIncentiveDto) => {
    setEditingItem(inc);
    setEditName(inc.name);
    setEditRewardAmount(String(inc.rewardAmount));
    setEditStartsAt(new Date(inc.startsAt).toISOString().slice(0, 16));
    setEditEndsAt(new Date(inc.endsAt).toISOString().slice(0, 16));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);
    setError(null);
    try {
      await fleetApi.updateIncentive(editingItem.id, {
        name: editName.trim(),
        rewardAmount: Number(editRewardAmount),
        startsAt: new Date(editStartsAt).toISOString(),
        endsAt: new Date(editEndsAt).toISOString(),
      });
      setEditingItem(null);
      await loadIncentives();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update incentive.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) return;
    setSubmitting(true);
    try {
      await fleetApi.updateIncentive(statusTarget.item.id, { status: statusTarget.next });
      setStatusTarget(null);
      await loadIncentives();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update incentive status.');
    } finally {
      setSubmitting(false);
    }
  };

  const openProgress = async (item: FleetIncentiveDto) => {
    setProgressItem(item);
    setProgressLoading(true);
    try {
      const rows = await fleetApi.getIncentiveProgress(item.id);
      setProgressRows(rows || []);
    } catch {
      setProgressRows([]);
    } finally {
      setProgressLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="fleet-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Target & Time-Based Driver Incentives</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Track driver-wise participation and qualification across active programs.
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', border: 'none', background: 'var(--brand-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            {showCreate ? 'Close Form' : 'Create Incentive'}
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="fleet-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <input required placeholder="Incentive Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as FleetIncentiveType)}>
            <option value={'TARGET_BASED'}>Target-Based (Trips)</option>
            <option value={'TIME_BASED'}>Time-Based (Minutes)</option>
          </select>
          {type === ('TARGET_BASED' as FleetIncentiveType) ? (
            <input type="number" min={1} required value={targetTrips} onChange={(e) => setTargetTrips(e.target.value)} placeholder="Target Trips" />
          ) : (
            <input type="number" min={1} required value={durationMins} onChange={(e) => setDurationMins(e.target.value)} placeholder="Required Active Minutes" />
          )}
          <input type="number" min={1} required value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} placeholder="Reward (INR)" />
          <select
            aria-label="Eligibility Scope"
            value={eligibilityScope}
            onChange={(e) => setEligibilityScope(e.target.value as FleetIncentiveEligibility)}
          >
            <option value={'ALL'}>All Fleet Drivers</option>
            <option value={'SELECTED'}>Selected Drivers</option>
          </select>
          <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          {eligibilityScope === ('SELECTED' as FleetIncentiveEligibility) && (
            <div style={{ gridColumn: '1 / -1', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.65rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                Select Eligible Drivers ({selectedDriverIds.length} selected)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', maxHeight: '120px', overflowY: 'auto' }}>
                {fleetDrivers.map((d) => (
                  <label
                    key={d.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDriverIds.includes(d.id)}
                      onChange={() => toggleDriverSelection(d.id)}
                    />
                    {d.fullName}
                  </label>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={submitting} style={{ padding: '0.5rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700 }}>
            {submitting ? 'Creating...' : 'Save Incentive'}
          </button>
        </form>
      )}

      {error && <ErrorState message={error} onRetry={loadIncentives} />}

      {loading ? (
        <TablePageSkeleton />
      ) : incentives.length === 0 ? (
        <EmptyState
          title="No Incentives Configured"
          description="Create a target-based or time-based incentive to reward fleet drivers."
        />
      ) : (
        <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Program</th>
                <th style={{ padding: '0.75rem 1rem' }}>Requirement</th>
                <th style={{ padding: '0.75rem 1rem' }}>Reward</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incentives.map((inc) => (
                <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700 }}>{inc.name}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {new Date(inc.startsAt).toLocaleDateString()} – {new Date(inc.endsAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {inc.type === 'TARGET_BASED' ? `${inc.targetTrips} trips` : `${inc.requiredDurationMinutes} mins`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>₹{inc.rewardAmount.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={inc.status} /></td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.45rem' }}>
                    <button type="button" onClick={() => void openProgress(inc)} style={{ cursor: 'pointer' }}>Progress</button>
                    {isOwner && inc.status !== ('ENDED' as FleetIncentiveStatus) && (
                      <button type="button" onClick={() => openEditModal(inc)} style={{ cursor: 'pointer' }}>
                        Edit
                      </button>
                    )}
                    {isOwner && inc.status === ('ACTIVE' as FleetIncentiveStatus) && (
                      <button type="button" onClick={() => setStatusTarget({ item: inc, next: 'PAUSED' as FleetIncentiveStatus })} style={{ cursor: 'pointer' }}>
                        Pause
                      </button>
                    )}
                    {isOwner && inc.status === ('PAUSED' as FleetIncentiveStatus) && (
                      <button type="button" onClick={() => setStatusTarget({ item: inc, next: 'ACTIVE' as FleetIncentiveStatus })} style={{ cursor: 'pointer' }}>
                        Activate
                      </button>
                    )}
                    {isOwner && inc.status !== ('ENDED' as FleetIncentiveStatus) && (
                      <button
                        type="button"
                        onClick={() => setStatusTarget({ item: inc, next: 'ENDED' as FleetIncentiveStatus })}
                        style={{ cursor: 'pointer', color: 'var(--color-danger)' }}
                      >
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {progressItem && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', justifyContent: 'flex-end', zIndex: 90 }}>
          <div style={{ width: 'min(480px, 100%)', background: 'var(--bg-surface)', height: '100%', padding: '1.25rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0 }}>{progressItem.name} — Driver Progress</h3>
              <button type="button" onClick={() => setProgressItem(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {progressLoading ? (
              <DrawerSkeleton />
            ) : progressRows.length === 0 ? (
              <EmptyState title="No Progress Yet" description="Progress updates automatically as eligible fleet drivers complete trips." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {progressRows.map((row) => (
                  <div key={row.driverId} className="fleet-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{row.driverName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Trips: {row.completedCount} · Active mins: {row.activeMinutes}
                      </div>
                    </div>
                    <StatusBadge status={row.qualified ? 'QUALIFIED' : 'IN_PROGRESS'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        title={`Change Incentive Status to ${statusTarget?.next}?`}
        description={`Confirm updating "${statusTarget?.item.name}" status to ${statusTarget?.next}.`}
        confirmLabel="Confirm"
        isLoading={submitting}
        onConfirm={handleStatusConfirm}
        onClose={() => setStatusTarget(null)}
      />

      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Incentive"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 95,
            padding: '1rem',
          }}
        >
          <form
            onSubmit={handleEditSubmit}
            className="fleet-card"
            style={{ width: 'min(440px, 100%)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Edit Incentive</h3>
              <button
                type="button"
                aria-label="Close edit modal"
                onClick={() => setEditingItem(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Incentive Name
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </label>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Reward Amount (INR)
              <input
                type="number"
                min={1}
                required
                value={editRewardAmount}
                onChange={(e) => setEditRewardAmount(e.target.value)}
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </label>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Starts At
              <input
                type="datetime-local"
                required
                value={editStartsAt}
                onChange={(e) => setEditStartsAt(e.target.value)}
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </label>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Ends At
              <input
                type="datetime-local"
                required
                value={editEndsAt}
                onChange={(e) => setEditEndsAt(e.target.value)}
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button type="button" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '0.5rem 0.9rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700 }}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
