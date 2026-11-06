'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  UserX,
  Radio,
  Navigation,
  ShieldAlert,
  Search,
  CheckCircle,
} from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { analyticsApi } from '../../../lib/api/corporate';
import type { ExceptionItem, ExceptionsResponse } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function ExceptionsDashboardPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [data, setData] = useState<ExceptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setLoading(true);
    analyticsApi
      .exceptions({ tenantId: activeTenantId })
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.warn('Exceptions fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId]);

  const exceptions = data?.items ?? [];
  const summary = data?.summary ?? {
    delayedPickups: 0,
    unassignedTrips: 0,
    gpsStaleCount: 0,
    routeDeviations: 0,
    safetyAlerts: 0,
  };
  const trend = data?.trend ?? [];

  const filteredExceptions = exceptions.filter((exc) => {
    const matchesFilter = activeFilter === 'ALL' || exc.type.toUpperCase().includes(activeFilter);
    const matchesSearch =
      exc.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exc.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exc.office.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAction = (item: ExceptionItem) => {
    alert(`Initiating action: ${item.action} for ${item.target} (${item.type})`);
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'Delayed':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Unassigned':
        return { bg: '#FFEDD5', color: '#EA580C', border: '#FDBA74' };
      case 'GPS Stale':
        return { bg: '#FEF9C3', color: '#CA8A04', border: '#FDE047' };
      case 'Route Deviation':
        return { bg: '#F3E8FF', color: '#7C3AED', border: '#D8B4FE' };
      case 'Safety Alert':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      default:
        return { bg: '#F1F5F9', color: 'var(--text-secondary)', border: '#CBD5E1' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Exceptions Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Trips, vehicles and operations that need attention
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="Today's Shift"
          showExceptionTypes={true}
          onRefresh={loadData}
        />
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Delayed Pickups"
          value={summary.delayedPickups}
          subtext="Needs Attention"
          icon={<Clock size={18} />}
          highlightColor="#D97706"
          onClick={() => setActiveFilter('DELAYED')}
        />
        <MetricCard
          label="Unassigned Trips"
          value={summary.unassignedTrips}
          subtext="Requires Allocation"
          icon={<UserX size={18} />}
          highlightColor="#EA580C"
          onClick={() => setActiveFilter('UNASSIGNED')}
        />
        <MetricCard
          label="GPS Stale"
          value={summary.gpsStaleCount}
          subtext="> 5 mins"
          icon={<Radio size={18} />}
          highlightColor="#CA8A04"
          onClick={() => setActiveFilter('GPS')}
        />
        <MetricCard
          label="Route Deviations"
          value={summary.routeDeviations}
          subtext="Check Route"
          icon={<Navigation size={18} />}
          highlightColor="#7C3AED"
          onClick={() => setActiveFilter('DEVIATION')}
        />
        <MetricCard
          label="Safety Alerts"
          value={summary.safetyAlerts}
          subtext="Immediate Review"
          icon={<ShieldAlert size={18} />}
          highlightColor="#DC2626"
          onClick={() => setActiveFilter('SAFETY')}
        />
      </div>

      {/* Main Grid: Exception List (Table) + Trend Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Exception List Table */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 60%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Exception List ({filteredExceptions.length})
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Operational triage queue requiring dispatcher intervention
              </p>
            </div>

            {/* Quick search input */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search
                size={14}
                color="#94A3B8"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by plate, ID..."
                style={{
                  width: '100%',
                  height: 32,
                  paddingLeft: 30,
                  paddingRight: 10,
                  fontSize: 12,
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-surface-muted)',
                }}
              />
            </div>
          </div>

          <div className="table-scroll">
            {filteredExceptions.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <CheckCircle size={32} color="#16A34A" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Zero Exceptions Detected</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  All scheduled and active commutes are adhering to SLA standards.
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Trip / Employee</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptions.map((item) => {
                    const badge = getBadgeStyle(item.type);
                    return (
                      <tr key={item.id}>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {item.target}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {item.details}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: item.status === 'Escalated' ? '#DC2626' : item.status === 'In Review' ? '#D97706' : '#5728B2',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleAction(item)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#EFF6FF',
                              color: '#5728B2',
                              border: '1px solid #BFDBFE',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {item.action}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Exceptions Trend (Last 7 Days) */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Exceptions Trend
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                7-day operational exception volume
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#5728B2',
                backgroundColor: '#EFF6FF',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #BFDBFE',
              }}
            >
              Daily Tally
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {trend.map((t, idx) => {
              const dayTotal = t.delayed + t.unassigned + t.gpsStale + t.deviation + t.safety;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-muted)',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.day}</span>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                    <span style={{ color: '#D97706' }}>{t.delayed} delay</span>
                    <span style={{ color: '#EA580C' }}>{t.unassigned} unassign</span>
                    <span style={{ color: '#DC2626' }}>{t.safety} safety</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#5728B2' }}>{dayTotal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
