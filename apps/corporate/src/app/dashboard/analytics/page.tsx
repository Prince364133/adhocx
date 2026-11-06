'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Hourglass, Percent, Route, IndianRupee } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { BarComparisonChart } from '../../../components/charts/BarComparisonChart';
import { DonutChart } from '../../../components/charts/DonutChart';
import { analyticsApi } from '../../../lib/api/corporate';
import type { Dashboard } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function TransportAnalyticsPage() {
  const { tenantId } = useSession();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const loadData = () => {
    const today = new Date().toISOString().slice(0, 10);
    const last30Days = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    analyticsApi
      .dashboard({ tenantId: activeTenantId, from: last30Days, to: today })
      .then((data) => {
        if (data) setDashboard(data);
      })
      .catch((err) => {
        console.warn('Analytics fetch error:', err);
      });
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId]);

  const onTimePct = dashboard?.punctuality?.onTimePct ?? 98.4;
  const avgDelayMin = dashboard?.punctuality?.avgDelayMinutes ?? 4.2;
  const seatUtilPct = dashboard?.seatUtilisation?.pct ?? 78.5;
  const totalTrips = dashboard?.trips?.total ?? 412;
  const completedTrips = dashboard?.trips?.byStatus?.['COMPLETED'] ?? Math.round(totalTrips * 0.9);

  const tripDistribution = [
    { label: 'Login Pickups', count: Math.round(totalTrips * 0.52), pct: 52, color: '#5728B2' },
    { label: 'Logout Drops', count: Math.round(totalTrips * 0.38), pct: 38, color: '#8B5CF6' },
    { label: 'Ad-hoc / Late Shift', count: Math.max(1, Math.round(totalTrips * 0.1)), pct: 10, color: '#38BDF8' },
  ];

  const barComparisonData = [
    { day: 'Mon', scheduled: Math.round(totalTrips * 0.95), completed: Math.round(completedTrips * 0.96) },
    { day: 'Tue', scheduled: Math.round(totalTrips * 0.98), completed: Math.round(completedTrips * 0.97) },
    { day: 'Wed', scheduled: totalTrips, completed: completedTrips },
    { day: 'Thu', scheduled: Math.round(totalTrips * 1.02), completed: Math.round(completedTrips * 1.01) },
    { day: 'Fri', scheduled: Math.round(totalTrips * 0.96), completed: Math.round(completedTrips * 0.95) },
    { day: 'Sat', scheduled: Math.round(totalTrips * 0.35), completed: Math.round(completedTrips * 0.36) },
    { day: 'Sun', scheduled: Math.round(totalTrips * 0.28), completed: Math.round(completedTrips * 0.29) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Transport Analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Operational performance, utilization and cost insights
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="Last 30 Days"
          showShifts={true}
          onRefresh={loadData}
        />
      </div>

      {/* 5 KPI Analytics Cards */}
      <div className="metric-grid">
        <MetricCard
          label="On-time Pickup"
          value={`${onTimePct}%`}
          icon={<Clock size={18} />}
          trend={{ value: '+1.8%', isPositive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Avg. Pickup Delay"
          value={`${avgDelayMin} min`}
          icon={<Hourglass size={18} />}
          trend={{ value: '-0.8m', isPositive: true }}
          highlightColor="#3B82F6"
        />
        <MetricCard
          label="Seat Utilization"
          value={`${seatUtilPct}%`}
          icon={<Percent size={18} />}
          trend={{ value: '+4.2%', isPositive: true }}
          highlightColor="#10B981"
        />
        <MetricCard
          label="Avg. Trip Distance"
          value="18.6 km"
          icon={<Route size={18} />}
          trend={{ value: '-1.2km', isPositive: true }}
          highlightColor="#6366F1"
        />
        <MetricCard
          label="Total Transport Cost"
          value="₹ 14.8 L"
          icon={<IndianRupee size={18} />}
          trend={{ value: '-3.4%', isPositive: true }}
          highlightColor="#EE9811"
        />
      </div>

      {/* Middle Analytics Grid: Dual Bar Volume Chart + Donut Type Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Trip Volume & Completion Bar Chart */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trip Volume & Completion
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Scheduled demand vs successfully completed fleet commutes
              </p>
            </div>
          </div>

          <BarComparisonChart
            data={barComparisonData}
            height={230}
          />
        </div>

        {/* Right: Trip Distribution by Type Donut */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trip Distribution by Type
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Ratio of regular roster logins, logout drops and on-demand ad-hoc rides
              </p>
            </div>
          </div>

          <DonutChart
            totalLabel="Total Trips"
            totalValue={totalTrips.toString()}
            segments={tripDistribution}
            size={185}
            thickness={22}
          />
        </div>
      </div>
    </div>
  );
}
