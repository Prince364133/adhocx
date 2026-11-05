'use client';

import React, { useState, useEffect } from 'react';
import { Users, Calendar, Radio, CheckCircle2, AlertOctagon, Car, Navigation, Building2, Eye, Clock } from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { FilterBar } from '../../components/common/FilterBar';
import { DonutChart } from '../../components/charts/DonutChart';
import { AreaTrendChart } from '../../components/charts/AreaTrendChart';
import { analyticsApi } from '../../lib/api/corporate';
import type { Dashboard } from '../../lib/api/types';
import { getStoredToken, decodeToken } from '../../lib/auth/session';
import {
  mockExecutiveMetrics,
  mockTripStatusBreakdown,
  mock7DayTripsTrend,
} from '../../lib/mock/corporateMockData';

export default function CompanyOverviewPage() {
  const [liveDashboard, setLiveDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    let isMounted = true;
    const today = new Date().toISOString().slice(0, 10);
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const token = getStoredToken();
    const tenantId = decodeToken(token)?.corporateTenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

    analyticsApi
      .dashboard({ tenantId, from: lastWeek, to: today })
      .then((data) => {
        if (isMounted && data) {
          setLiveDashboard(data);
        }
      })
      .catch((err) => {
        console.warn('Dashboard live metrics fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalEmployeesVal = liveDashboard?.employeesServed
    ? liveDashboard.employeesServed.toLocaleString()
    : mockExecutiveMetrics.totalEmployees.toLocaleString();

  const scheduledTripsVal = liveDashboard?.trips?.total
    ? liveDashboard.trips.total.toLocaleString()
    : mockExecutiveMetrics.scheduledTrips.toLocaleString();

  const activeTripsVal = liveDashboard?.trips?.byStatus?.['IN_PROGRESS'] !== undefined
    ? liveDashboard.trips.byStatus['IN_PROGRESS'].toLocaleString()
    : mockExecutiveMetrics.activeTrips.toLocaleString();

  const completedTripsVal = liveDashboard?.trips?.byStatus?.['COMPLETED'] !== undefined
    ? liveDashboard.trips.byStatus['COMPLETED'].toLocaleString()
    : mockExecutiveMetrics.completedTrips.toLocaleString();

  const unservedTripsVal = liveDashboard?.requests?.unserved !== undefined
    ? liveDashboard.requests.unserved.toLocaleString()
    : mockExecutiveMetrics.unservedTrips.toLocaleString();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Company Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time view of your employee transportation operations
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="08 - 14 Dec 2026"
        />
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Employees"
          value={totalEmployeesVal}
          icon={<Users size={18} />}
          trend={{ value: mockExecutiveMetrics.employeesDelta, isPositive: true }}
          highlightColor="#5728B2"
        />
        <MetricCard
          label="Scheduled Trips"
          value={scheduledTripsVal}
          icon={<Calendar size={18} />}
          trend={{ value: mockExecutiveMetrics.scheduledTripsDelta, isPositive: true }}
          highlightColor="#8B5CF6"
        />
        <MetricCard
          label="Active Trips"
          value={activeTripsVal}
          icon={<Car size={18} />}
          trend={{ value: 'Live', isLive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Completed Trips"
          value={completedTripsVal}
          icon={<CheckCircle2 size={18} />}
          trend={{ value: mockExecutiveMetrics.completedTripsDelta, isPositive: true }}
          highlightColor="#059669"
        />
        <MetricCard
          label="Unserved Trips"
          value={unservedTripsVal}
          icon={<AlertOctagon size={18} />}
          trend={{ value: mockExecutiveMetrics.unservedTripsDelta, isAlert: true }}
          highlightColor="#DC2626"
        />
      </div>

      {/* Middle Grid: Trip Status Donut + Trips Trend Area Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Trip Status (Today) */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trip Status (Today)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Breakdown across completed, live, unserved and cancelled commutes
              </p>
            </div>
          </div>

          <DonutChart
            totalLabel="Total Trips"
            totalValue="412"
            segments={mockTripStatusBreakdown}
            size={180}
            thickness={22}
          />
        </div>

        {/* Right: Trips Trend (Last 7 Days) */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trips Trend (Last 7 Days)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Daily trip volume trajectory across all shifts
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
              Trips ▾
            </span>
          </div>

          <AreaTrendChart
            data={mock7DayTripsTrend}
            height={200}
            lineColor="#6366F1"
            metricLabel="Trips"
          />
        </div>
      </div>

      {/* Bottom Mini-Stat Bar / Fleet Stat Ribbon */}
      <div
        className="surface-card"
        style={{
          padding: '16px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              color: '#5728B2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Car size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {mockExecutiveMetrics.vehiclesCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Vehicles (Cabs)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#F3E8FF',
              color: '#7C3AED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Navigation size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {mockExecutiveMetrics.routesCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Routes
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {mockExecutiveMetrics.officesCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Offices
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Eye size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {mockExecutiveMetrics.seatUtilizationPct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Seat Utilization
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '8px',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {mockExecutiveMetrics.onTimePickupPct}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              On-time Pickup
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

