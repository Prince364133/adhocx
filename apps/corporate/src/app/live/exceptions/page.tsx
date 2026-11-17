'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  UserX,
  Radio,
  Navigation,
  ShieldAlert,
  Search,
  List,
  Map,
} from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { analyticsApi } from '../../../lib/api/corporate';
import type { ExceptionsResponse } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function TrackingExceptionsPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId;

  const [data, setData] = useState<ExceptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  useEffect(() => {
    if (!activeTenantId) {
      setData(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    analyticsApi
      .exceptions({ tenantId: activeTenantId })
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.warn('Exceptions fetch error:', err);
        setData(null);
        setLoadError(err instanceof Error ? err.message : 'Failed to load tracking exceptions.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  const exceptions = data?.items ?? [];
  const summary = data?.summary;

  const filteredExceptions = exceptions.filter((exc) => {
    const matchesType = selectedType === 'ALL' || exc.type.toUpperCase().includes(selectedType);
    const matchesSearch =
      exc.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exc.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exc.office.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Tracking Exceptions
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Trips and vehicles that need immediate attention
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="Today"
          showExceptionTypes={true}
        />
      </div>

      {/* 5 Metric Summary Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Delayed Trips"
          value={summary?.delayedPickups ?? '—'}
          icon={<Clock size={18} />}
          highlightColor="#D97706"
          onClick={() => setSelectedType(selectedType === 'DELAYED' ? 'ALL' : 'DELAYED')}
        />
        <MetricCard
          label="Unassigned Trips"
          value={summary?.unassignedTrips ?? '—'}
          icon={<UserX size={18} />}
          highlightColor="#EA580C"
          onClick={() => setSelectedType(selectedType === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
        />
        <MetricCard
          label="GPS Stale"
          value={summary?.gpsStaleCount ?? '—'}
          subtext="> 5 mins"
          icon={<Radio size={18} />}
          highlightColor="#CA8A04"
          onClick={() => setSelectedType(selectedType === 'GPS' ? 'ALL' : 'GPS')}
        />
        <MetricCard
          label="Route Deviations"
          value={summary?.routeDeviations ?? '—'}
          icon={<Navigation size={18} />}
          highlightColor="#7C3AED"
          onClick={() => setSelectedType(selectedType === 'DEVIATION' ? 'ALL' : 'DEVIATION')}
        />
        <MetricCard
          label="Safety Alerts"
          value={summary?.safetyAlerts ?? '—'}
          icon={<ShieldAlert size={18} />}
          highlightColor="#DC2626"
          onClick={() => setSelectedType(selectedType === 'SAFETY' ? 'ALL' : 'SAFETY')}
        />
      </div>

      {loadError && <div role="alert" className="surface-card" style={{ padding: 16, color: '#B91C1C' }}>{loadError}</div>}

      {/* Content Section: View Tabs (List / Map) */}
      <div className="surface-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          {/* List vs Map Switcher */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'list' ? '#5728B2' : '#F1F5F9',
                color: activeTab === 'list' ? '#FFFFFF' : '#475569',
              }}
            >
              <List size={14} />
              <span>Exception List ({filteredExceptions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'map' ? '#5728B2' : '#F1F5F9',
                color: activeTab === 'map' ? '#FFFFFF' : '#475569',
              }}
            >
              <Map size={14} />
              <span>Exception Map</span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by trip, employee, driver..."
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 32,
                paddingRight: 10,
                fontSize: 12,
                border: '1px solid var(--border-strong)',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: 'var(--bg-surface-muted)',
              }}
            />
          </div>
        </div>

        {/* Tab 1: List View */}
        {activeTab === 'list' && (
          loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading tracking exceptions...
            </div>
          ) : filteredExceptions.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No active tracking exceptions match this filter.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trip / Vehicle</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Office</th>
                    <th>Since</th>
                    <th>Status</th>
                    <th>Suggested action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptions.map((item) => {
                    const badge = getBadgeStyle(item.type);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {item.target}
                        </td>
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
                        <td style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                          {item.details}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.office}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {item.duration}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: item.status === 'Escalated' ? '#DC2626' : item.status === 'In Review' ? '#D97706' : '#5728B2',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {item.action || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tab 2: Map View */}
        {activeTab === 'map' && (
          <div className="surface-card" style={{ marginTop: 10, padding: 24, color: 'var(--text-secondary)' }}>
            Exception records do not include GPS coordinates, so a map cannot be shown for these items.
          </div>
        )}
      </div>
    </div>
  );
}
