'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Search } from 'lucide-react';
import { rosterApi } from '../../../lib/api/corporate';
import type { Roster } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function RosterCalendarPage() {
  const { tenantId } = useSession();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRosters = useCallback(async () => {
    if (!tenantId) {
      setRosters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await rosterApi.list(tenantId, {});
      setRosters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load roster calendar:', err);
      setError('Unable to load roster records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadRosters();
  }, [loadRosters]);

  const offices = useMemo(
    () => Array.from(new Map(rosters.flatMap((roster) => roster.office ? [[roster.office.id, roster.office.name] as const] : []).map(([id, name]) => [id, name])).entries()),
    [rosters],
  );

  const filteredRosters = rosters.filter((roster) => {
    const matchesOffice = selectedOffice === 'All Offices' || roster.officeId === selectedOffice;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [
      roster.office?.name,
      roster.office?.code,
      roster.direction,
      roster.shiftTime,
      roster.status,
    ].some((value) => value?.toLowerCase().includes(query));
    return matchesOffice && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Roster Calendar
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Persisted roster schedules for this company
        </p>
      </div>

      <div className="surface-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={selectedOffice}
          onChange={(event) => setSelectedOffice(event.target.value)}
          aria-label="Filter by office"
          style={{ height: 36, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600 }}
        >
          <option value="All Offices">All Offices</option>
          {offices.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search roster, office, or shift..."
            style={{ width: '100%', height: 36, padding: '0 10px 0 32px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12 }}
          />
        </div>
      </div>

      <div className="surface-card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading roster records...</div>
        ) : error ? (
          <div role="alert" style={{ padding: 32, textAlign: 'center', color: '#B91C1C' }}>{error}</div>
        ) : filteredRosters.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Calendar size={24} style={{ margin: '0 auto 8px' }} />
            No saved rosters match these filters.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roster date</th>
                  <th>Office</th>
                  <th>Shift</th>
                  <th>Direction</th>
                  <th>Requests</th>
                  <th>Passengers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRosters.map((roster) => (
                  <tr key={roster.id}>
                    <td>{roster.rosterDate.slice(0, 10)}</td>
                    <td>{roster.office?.name ?? '—'}</td>
                    <td>{roster.shiftTime}</td>
                    <td>{roster.direction}</td>
                    <td>{roster._count?.requests ?? '—'}</td>
                    <td>{roster.passengerCount}</td>
                    <td>{roster.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
