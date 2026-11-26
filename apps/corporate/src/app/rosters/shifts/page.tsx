'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, RefreshCw } from 'lucide-react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { schedulingApi, tenantApi } from '../../../lib/api/corporate';
import type { Office, ShiftTemplate } from '../../../lib/api/types';
import LazyScrollSentinel from '../../../components/common/LazyScrollSentinel';
import { useLazySlice } from '../../../lib/hooks/useInfiniteScroll';
import { useSession } from '../../../lib/auth/SessionContext';

const weekdays = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 7, label: 'Sun' },
];

export default function ShiftManagementPage() {
  const { tenantId } = useSession();
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    officeId: '',
    name: '',
    loginTime: '',
    logoutTime: '',
    weekdays: [] as number[],
  });

  const loadShifts = useCallback(async () => {
    if (!tenantId) {
      setShifts([]);
      setOffices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [shiftTemplates, officeList] = await Promise.all([
        schedulingApi.shiftTemplates(tenantId),
        tenantApi.offices(tenantId),
      ]);
      setShifts(shiftTemplates);
      setOffices(officeList);
    } catch (err) {
      console.error('Failed to load shift templates:', err);
      setError('Unable to load tenant shift templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  const createShift = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tenantId) return;
    if (!form.officeId || !form.name.trim() || !form.loginTime || !form.logoutTime || form.weekdays.length === 0) {
      setFormError('Complete the fields and select at least one weekday.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await schedulingApi.createShiftTemplate(tenantId, {
        officeId: form.officeId,
        name: form.name.trim(),
        loginTime: form.loginTime,
        logoutTime: form.logoutTime,
        weekdays: form.weekdays,
      });
      setShowCreateForm(false);
      setForm({ officeId: '', name: '', loginTime: '', logoutTime: '', weekdays: [] });
      await loadShifts();
    } catch (err) {
      console.error('Failed to create shift template:', err);
      setFormError('Unable to create the shift template. Check the details and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((value) => value !== day)
        : [...current.weekdays, day].sort((a, b) => a - b),
    }));
  };

  const { visibleItems: visibleShifts, hasMore, sentinelRef } = useLazySlice(shifts, shifts.length, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Shift Management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Saved tenant shift templates and working days
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => void loadShifts()} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" onClick={() => setShowCreateForm((shown) => !shown)} disabled={!tenantId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: 0, borderRadius: 6, background: '#5728B2', color: '#fff' }}>
            <Plus size={16} /> Create template
          </button>
        </div>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      {showCreateForm && (
        <form onSubmit={createShift} className="surface-card" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Office
            <select required value={form.officeId} onChange={(event) => setForm((current) => ({ ...current, officeId: event.target.value }))} style={{ height: 36, padding: '0 8px' }}>
              <option value="">Select office</option>
              {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Template name
            <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={{ height: 36, padding: '0 8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Login time
            <input required type="time" value={form.loginTime} onChange={(event) => setForm((current) => ({ ...current, loginTime: event.target.value }))} style={{ height: 36, padding: '0 8px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            Logout time
            <input required type="time" value={form.logoutTime} onChange={(event) => setForm((current) => ({ ...current, logoutTime: event.target.value }))} style={{ height: 36, padding: '0 8px' }} />
          </label>
          <fieldset style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <legend>Working days</legend>
            {weekdays.map(({ day, label }) => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={form.weekdays.includes(day)} onChange={() => toggleWeekday(day)} />
                {label}
              </label>
            ))}
          </fieldset>
          {formError && <div role="alert" style={{ gridColumn: '1 / -1', color: '#B91C1C' }}>{formError}</div>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => setShowCreateForm(false)} disabled={isSaving}>Cancel</button>
            <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save template'}</button>
          </div>
        </form>
      )}

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 0 }}>
          Shift templates ({shifts.length})
        </h2>
        {isLoading ? (
          <ContentLoadingSkeleton kind="table" count={5} label="Loading tenant shift templates…" />
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <CalendarClock size={32} style={{ marginBottom: 8 }} />
            <p>No shift templates are configured for this tenant.</p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Template</th><th>Office</th><th>Login</th><th>Logout</th><th>Working days</th><th>Status</th></tr></thead>
                <tbody>
                  {visibleShifts.map((shift) => (
                    <tr key={shift.id}>
                      <td>{shift.name}</td>
                      <td>{offices.find((office) => office.id === shift.officeId)?.name ?? '—'}</td>
                      <td>{shift.loginTime}</td>
                      <td>{shift.logoutTime}</td>
                      <td>{shift.weekdays?.map((day) => weekdays.find((item) => item.day === day)?.label ?? day).join(', ') || '—'}</td>
                      <td>{shift.isActive ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LazyScrollSentinel sentinelRef={sentinelRef} hasMore={hasMore} label="Loading more shift templates…" />
          </>
        )}
      </section>
    </div>
  );
}
