'use client';

import React from 'react';
import { Clock, Hourglass, Percent, Route, IndianRupee } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { BarComparisonChart } from '../../../components/charts/BarComparisonChart';
import { DonutChart } from '../../../components/charts/DonutChart';
import {
  mockTransportAnalytics,
  mock7DayTripsTrend,
} from '../../../lib/mock/corporateMockData';

export default function TransportAnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Transport Analytics
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Operational performance, utilization and cost insights
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="Last 30 Days"
          showShifts={true}
        />
      </div>

      {/* 5 KPI Analytics Cards */}
      <div className="metric-grid">
        <MetricCard
          label="On-time Pickup"
          value={`${mockTransportAnalytics.onTimePickupPct}%`}
          icon={<Clock size={18} />}
          trend={{ value: mockTransportAnalytics.onTimeDelta, isPositive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Avg. Pickup Delay"
          value={`${mockTransportAnalytics.avgPickupDelayMin} min`}
          icon={<Hourglass size={18} />}
          trend={{ value: mockTransportAnalytics.avgDelayDelta, isPositive: true }}
          highlightColor="#3B82F6"
        />
        <MetricCard
          label="Seat Utilization"
          value={`${mockTransportAnalytics.seatUtilizationPct}%`}
          icon={<Percent size={18} />}
          trend={{ value: mockTransportAnalytics.seatUtilDelta, isPositive: true }}
          highlightColor="#10B981"
        />
        <MetricCard
          label="Avg. Trip Distance"
          value={`${mockTransportAnalytics.avgTripDistanceKm} km`}
          icon={<Route size={18} />}
          trend={{ value: mockTransportAnalytics.distanceDelta, isPositive: true }}
          highlightColor="#6366F1"
        />
        <MetricCard
          label="Total Transport Cost"
          value={`₹ ${mockTransportAnalytics.totalTransportCostLakhs} L`}
          icon={<IndianRupee size={18} />}
          trend={{ value: mockTransportAnalytics.costDelta, isPositive: true }}
          highlightColor="#EE9811"
        />
      </div>

      {/* Middle Analytics Grid: Dual Bar Volume Chart + Donut Type Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Trip Volume & Completion Bar Chart */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Trip Volume & Completion
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Scheduled demand vs successfully completed fleet commutes
              </p>
            </div>
          </div>

          <BarComparisonChart
            data={mock7DayTripsTrend}
            height={230}
          />
        </div>

        {/* Right: Trip Distribution by Type Donut */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Trip Distribution by Type
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Ratio of regular roster logins, logout drops and on-demand ad-hoc rides
              </p>
            </div>
          </div>

          <DonutChart
            totalLabel="Total Trips"
            totalValue="412"
            segments={mockTransportAnalytics.tripDistribution}
            size={185}
            thickness={22}
          />
        </div>
      </div>
    </div>
  );
}

