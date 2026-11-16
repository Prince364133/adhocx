'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarX, RefreshCw, Search } from 'lucide-react';
import { cancellationsApi } from '../../lib/api/cancellations';
import type { BookingRequestItem } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function CancellationRequestsPage() {
  const { tenantId, status } = useSession();
  const [requests, setRequests] = useState<BookingRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRequests = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setRequests([]);
      setTotal(0);
      setError('Sign in with a corporate account to view cancelled requests.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await cancellationsApi.list(tenantId, {
        page,
        limit: pageSize,
        search: search.trim() || undefined,
      });
      setRequests(result.items);
      setTotal(result.total);
      setTotalPages(Math.max(1, result.totalPages));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load cancelled requests.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, tenantId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests, refreshKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarX size={24} aria-hidden="true" />
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: 'var(--text-primary)' }}>Cancelled transport requests</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Request records returned by the signed-in tenant’s Corporate API.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      <section className="surface-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <strong>{total} cancelled requests</strong>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search cancelled requests"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search employee or employee ID"
          />
        </label>
      </section>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <section className="surface-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-muted)' }}>
              <th style={{ padding: 12 }}>Employee</th>
              <th style={{ padding: 12 }}>Request ID</th>
              <th style={{ padding: 12 }}>Office</th>
              <th style={{ padding: 12 }}>Scheduled date</th>
              <th style={{ padding: 12 }}>Shift</th>
              <th style={{ padding: 12 }}>Direction</th>
              <th style={{ padding: 12 }}>Last updated</th>
              <th style={{ padding: 12 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center' }}>Loading cancelled requests…</td></tr>}
            {!loading && !error && requests.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center' }}>No cancelled requests found.</td></tr>
            )}
            {!loading && requests.map((request) => (
              <tr key={request.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: 12 }}>
                  <strong>{request.employee?.fullName ?? 'Employee unavailable'}</strong>
                  <div style={{ color: 'var(--text-muted)' }}>{request.employee?.employeeCode ?? 'ID unavailable'}</div>
                </td>
                <td style={{ padding: 12, fontFamily: 'monospace' }}>{request.id}</td>
                <td style={{ padding: 12 }}>{request.roster?.office?.name ?? 'Not recorded'}</td>
                <td style={{ padding: 12 }}>{formatDate(request.scheduledDate)}</td>
                <td style={{ padding: 12 }}>{request.shiftTime}</td>
                <td style={{ padding: 12 }}>{request.direction}</td>
                <td style={{ padding: 12 }}>{formatDateTime(request.updatedAt)}</td>
                <td style={{ padding: 12 }}>{request.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        <label>Rows
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            {[10, 30, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
      </footer>
    </div>
  );
}
