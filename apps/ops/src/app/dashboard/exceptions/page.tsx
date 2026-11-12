'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Clock3, MapPin, Phone, RefreshCw, ShieldAlert } from 'lucide-react';
import { getStoredOpsUser } from '../../../lib/api/opsClient';
import type { CorporateRouteItem, SosAlertItem } from '../../../lib/api/opsTypes';
import { Button } from '../../../components/common/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { claimMockException, readMockDashboard, refreshMockDatabase, updateMockAlert, updateMockRoute, type MockDashboardSnapshot } from '../../../lib/mock-ops-db';

type ExceptionRow =
  | { id: string; type: 'SOS'; severity: string; client: string; age: number; status: string; alert: SosAlertItem; route?: never }
  | { id: string; type: 'Unassigned' | 'Delayed route' | 'Stale GPS'; severity: string; client: string; age: number; status: string; route: CorporateRouteItem; alert?: never };

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg, 10px)',
  boxShadow: 'var(--shadow-card)',
};

function ageMinutes(date?: string | null, seconds?: number | null): number {
  if (seconds !== undefined && seconds !== null) return Math.max(0, Math.floor(seconds / 60));
  if (!date) return 0;
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 60_000)) : 0;
}

function ageLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function ExceptionsDashboardPage() {
  const [snapshot, setSnapshot] = useState<MockDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState('');
  const [notice, setNotice] = useState('');
  const ownerName = getStoredOpsUser()?.fullName ?? 'Me';

  function loadData(refresh = false) {
    setError('');
    try {
      if (refresh) refreshMockDatabase();
      setSnapshot(readMockDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load current exceptions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    try {
      setSnapshot(readMockDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load current exceptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const board = snapshot?.board;
  const alerts = useMemo(() => snapshot?.alerts ?? [], [snapshot]);
  const claims = snapshot?.database.owners ?? {};
  const rows = useMemo<ExceptionRow[]>(() => {
    if (!board) return [];
    const result: ExceptionRow[] = [];
    for (const alert of alerts) {
      if (alert.status === 'RESOLVED') continue;
      result.push({
        id: `sos:${alert.id}`,
        type: 'SOS',
        severity: alert.severity,
        client: alert.tenantName ?? 'Client unavailable',
        age: ageMinutes(alert.createdAt),
        status: alert.status,
        alert,
      });
    }
    const known = new Set<string>();
    for (const route of board.atRisk.items) {
      known.add(route.id);
      const unassigned = !route.driverId;
      result.push({
        id: `${unassigned ? 'unassigned' : 'delayed'}:${route.id}`,
        type: unassigned ? 'Unassigned' : 'Delayed route',
        severity: unassigned ? 'HIGH' : 'MEDIUM',
        client: route.tenant?.name ?? 'Client unavailable',
        age: ageMinutes(route.targetPickup1Time),
        status: route.status,
        route,
      });
    }
    for (const route of board.staleGps.items) {
      if (known.has(route.id)) continue;
      result.push({
        id: `gps:${route.id}`,
        type: 'Stale GPS',
        severity: 'MEDIUM',
        client: route.tenant?.name ?? 'Client unavailable',
        age: ageMinutes(null, route.gps?.ageSeconds),
        status: route.gps?.freshness ?? 'OFFLINE',
        route,
      });
    }
    const priority = (row: ExceptionRow) => row.type === 'SOS' ? 0 : row.type === 'Unassigned' ? 1 : row.type === 'Delayed route' ? 2 : 3;
    return result.sort((a, b) => priority(a) - priority(b) || b.age - a.age);
  }, [alerts, board]);

  function claim(rowId: string) {
    try {
      claimMockException(rowId, ownerName);
      setSnapshot(readMockDashboard());
    } catch (err) {
      setError(err instanceof Error ? `Could not save claim on this device: ${err.message}` : 'Could not save claim on this device.');
    }
  }

  async function runSosAction(alert: SosAlertItem) {
    setActionId(alert.id);
    setError('');
    setNotice('');
    try {
      const action = alert.status === 'NEW' ? 'acknowledge' : 'escalate';
      updateMockAlert(alert.id, action);
      setSnapshot(readMockDashboard());
      setNotice(action === 'acknowledge' ? 'SOS acknowledged.' : 'SOS escalated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the SOS alert.');
    } finally {
      setActionId('');
    }
  }

  function assignMockDriver(route: CorporateRouteItem) {
    setActionId(route.id);
    setError('');
    try {
      updateMockRoute(route.id, 'assign');
      setSnapshot(readMockDashboard());
      setNotice('Driver assigned to route.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update route.');
    } finally {
      setActionId('');
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    loadData(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>Exceptions &amp; Safety</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Prioritized live queue for safety alerts, dispatch gaps, delays, and missing GPS.</p>
        </div>
        <Button size="md" variant="outline" leftIcon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />} onClick={() => void handleRefresh()} isLoading={refreshing}>Refresh queue</Button>
      </div>

      {error && <div role="alert" style={{ ...panelStyle, padding: 12, color: 'var(--color-danger, #DC2626)', fontSize: 13 }}>{error}</div>}
      {notice && <div role="status" style={{ ...panelStyle, padding: 12, color: 'var(--color-success, #16A34A)', fontSize: 13 }}>{notice}</div>}

      <section className="ops-exceptions-scroll" style={{ ...panelStyle }}>
        <div className="ops-exceptions-table" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .75fr) minmax(150px, 1fr) minmax(150px, 1fr) 70px 110px minmax(140px, 1fr) 150px', gap: 12, padding: '12px 16px', background: 'var(--bg-surface-muted)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
          <span>Severity / Type</span><span>Client / Route</span><span>Details</span><span>Age</span><span>Status</span><span>Owner</span><span>Next action</span>
        </div>
        {loading && !board ? (
          <p style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading prioritized exception queue…</p>
        ) : !rows.length ? (
          <div style={{ padding: 34, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShieldAlert size={28} color="#16A34A" />
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>No active exceptions or safety alerts.</p>
          </div>
        ) : rows.map((row) => {
          const owner = claims[row.id];
          const isSos = row.type === 'SOS';
          const driverPhone = row.type === 'SOS' ? row.alert.driverPhone : row.route.driver?.phone;
          return (
            <div key={row.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, .75fr) minmax(150px, 1fr) minmax(150px, 1fr) 70px 110px minmax(140px, 1fr) 150px', gap: 12, alignItems: 'center', padding: '13px 16px', borderTop: '1px solid var(--border-subtle)', background: isSos ? 'var(--color-danger-bg, #FEF2F2)' : 'var(--bg-surface)' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: isSos ? '#DC2626' : row.type === 'Unassigned' ? '#EA580C' : '#B45309', fontWeight: 800, fontSize: 11 }}>
                  {isSos ? <ShieldAlert size={14} /> : row.type === 'Stale GPS' ? <MapPin size={14} /> : <AlertTriangle size={14} />}
                  {row.severity}
                </span>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{row.type}</div>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 12, color: 'var(--text-primary)' }}>{row.client}</strong>
                <span className="code-tag">{row.type === 'SOS' ? `INC-${row.alert.id.slice(0, 8).toUpperCase()}` : `RT-${row.route.id.slice(0, 8).toUpperCase()}`}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {row.type === 'SOS'
                  ? `${row.alert.triggerType.replaceAll('_', ' ')} · ${row.alert.driverName ?? 'Driver'}`
                  : row.type === 'Stale GPS'
                    ? `${row.route.vehicle?.registrationNumber ?? 'Vehicle'} · ${row.route.driver?.fullName ?? 'Driver unavailable'}`
                    : `${row.route.driver?.fullName ?? 'No driver assigned'} · ${row.route.vehicle?.registrationNumber ?? 'No vehicle'}`}
              </div>
              <span style={{ fontSize: 12, color: row.age > 15 ? '#DC2626' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock3 size={12} />{ageLabel(row.age)}</span>
              <StatusBadge status={row.status} size="sm" pulse={isSos && row.status === 'NEW'} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 11, color: owner ? 'var(--text-primary)' : 'var(--text-muted)' }}>{owner ?? 'Unclaimed'}</span>
                {!owner && <button type="button" onClick={() => claim(row.id)} title="Claim on this browser" style={{ border: 0, background: 'transparent', color: 'var(--brand-blue-500, #5728B2)', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: 0 }}>Claim</button>}
              </div>
              <div>
                {row.type === 'SOS' ? (
                  <Button size="sm" variant={row.status === 'NEW' ? 'danger' : 'outline'} isLoading={actionId === row.alert.id} onClick={() => void runSosAction(row.alert)}>
                    {row.status === 'NEW' ? 'Acknowledge' : 'Escalate'}
                  </Button>
                ) : row.type === 'Unassigned' ? (
                  <Button size="sm" variant="primary" isLoading={actionId === row.route.id} leftIcon={<BellRing size={13} />} onClick={() => assignMockDriver(row.route)}>Assign driver</Button>
                ) : driverPhone ? (
                  <a href={`tel:${driverPhone}`} style={actionLink}><Phone size={13} /> Call driver</a>
                ) : (
                  <span style={{ ...actionLink, cursor: 'default' }}>No driver contact</span>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </section>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
        Queue refreshes every 15 seconds. SOS alerts are pinned first; route priority then follows unassigned, delayed, and stale GPS.
      </p>
    </div>
  );
}

const actionLink: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 9px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 7,
  color: 'var(--brand-blue-500, #5728B2)',
  textDecoration: 'none',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};
