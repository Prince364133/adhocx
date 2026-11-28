'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { FleetDriverSummaryDto, FleetShiftDto } from '@adhocx/contracts';
import { fleetApi } from '../../lib/api/client';
import { TablePageSkeleton } from '../../components/common/Skeletons';
import { EmptyState, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

const SHIFTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FLEET_SHIFTS === 'true';

export default function FleetShiftsPage() {
  const [shifts, setShifts] = useState<FleetShiftDto[]>([]);
  const [drivers, setDrivers] = useState<FleetDriverSummaryDto[]>([]);
  const [loading, setLoading] = useState(SHIFTS_ENABLED);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [title, setTitle] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadShifts = useCallback(async () => {
    if (!SHIFTS_ENABLED) return;
    setLoading(true);
    setError(null);
    try {
      const [list, driverRes] = await Promise.all([
        fleetApi.listShifts(),
        fleetApi.listDrivers({ limit: 100 }),
      ]);
      setShifts(list || []);
      setDrivers(driverRes.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load shifts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictWarning(null);
    setSubmitting(true);
    try {
      await fleetApi.createShift({
        driverId,
        title: title.trim(),
        shiftStart: new Date(shiftStart).toISOString(),
        shiftEnd: new Date(shiftEnd).toISOString(),
        notes: notes.trim() || undefined,
      });
      setShowCreate(false);
      setTitle('');
      setNotes('');
      await loadShifts();
    } catch (err: unknown) {
      setConflictWarning(
        err instanceof Error ? err.message : 'Unable to schedule shift (possible conflict).',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!SHIFTS_ENABLED) {
    return (
      <EmptyState
        title="Shift & Ride Management Disabled"
        description="This optional module is disabled by default (NEXT_PUBLIC_ENABLE_FLEET_SHIFTS=false)."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Manage scheduled driver shift windows with overlap conflict protection.
        </p>
        <button
          type="button"
          className="fleet-btn fleet-btn-primary"
          onClick={() => {
            setConflictWarning(null);
            setShowCreate((prev) => !prev);
          }}
        >
          {showCreate ? 'Cancel' : 'Schedule Shift'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreateShift}
          className="fleet-card"
          style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}
        >
          {conflictWarning && (
            <div
              role="alert"
              style={{
                gridColumn: '1 / -1',
                padding: '0.625rem 0.75rem',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {conflictWarning}
            </div>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
            Driver
            <select
              className="fleet-input"
              required
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Select fleet driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} {d.vehiclePlate ? `(${d.vehiclePlate})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
            Shift Title
            <input
              className="fleet-input"
              required
              placeholder="Morning Airport Shift"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
            Start
            <input
              type="datetime-local"
              className="fleet-input"
              required
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem' }}>
            End
            <input
              type="datetime-local"
              className="fleet-input"
              required
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
            />
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="fleet-btn fleet-btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Shift'}
            </button>
          </div>
        </form>
      )}

      {error && <ErrorState message={error} onRetry={loadShifts} />}
      {loading ? (
        <TablePageSkeleton />
      ) : shifts.length === 0 ? (
        <EmptyState title="No Shifts Scheduled" description="Shift assignments for your fleet will appear here." />
      ) : (
        <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Shift</th>
                <th style={{ padding: '0.75rem 1rem' }}>Driver</th>
                <th style={{ padding: '0.75rem 1rem' }}>Window</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{s.title}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.driverName || s.driverId}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {new Date(s.shiftStart).toLocaleString()} – {new Date(s.shiftEnd).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
