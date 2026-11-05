'use client';

import React from 'react';
import {
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { DonutChart } from '../../../components/charts/DonutChart';
import { AreaTrendChart } from '../../../components/charts/AreaTrendChart';

const MOCK_REQUEST_TYPES_DONUT = [
  { label: 'Roster (Auto)', count: 2108, pct: 82.1, color: '#5728B2' },
  { label: 'Ad-hoc', count: 292, pct: 11.4, color: '#8B5CF6' },
  { label: 'Change Request', count: 110, pct: 4.3, color: '#F59E0B' },
  { label: 'Cancellation', count: 58, pct: 2.2, color: '#DC2626' },
];

const MOCK_BOOKING_TREND = [
  { day: '02 Dec', trips: 2150 },
  { day: '03 Dec', trips: 2280 },
  { day: '04 Dec', trips: 2420 },
  { day: '05 Dec', trips: 2360 },
  { day: '06 Dec', trips: 2480 },
  { day: '07 Dec', trips: 2510 },
  { day: '08 Dec', trips: 2568 },
];

export default function BookingOverviewPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Booking Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time view of employee transport requests and bookings
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="08 Dec 2026"
          showShifts={true}
        />
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Requests"
          value="2,568"
          icon={<Ticket size={18} />}
          highlightColor="#5728B2"
        />
        <MetricCard
          label="Confirmed"
          value="2,372"
          subtext="92.4% Confirmed"
          icon={<CheckCircle2 size={18} />}
          trend={{ value: '92.4%', isPositive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Pending"
          value="84"
          subtext="3.3% Allocation Pending"
          icon={<Clock size={18} />}
          highlightColor="#F59E0B"
        />
        <MetricCard
          label="Cancelled"
          value="56"
          subtext="2.2% Cancelled"
          icon={<XCircle size={18} />}
          highlightColor="#94A3B8"
        />
        <MetricCard
          label="Exception / Approval"
          value="28"
          subtext="1.1% Policy Exceptions"
          icon={<AlertTriangle size={18} />}
          highlightColor="#DC2626"
        />
      </div>

      {/* 2 Visualizers Grid: Trend Line + Donut by Type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Booking Trend Area Chart */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Booking Trend (Last 7 Days)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Daily transport request demand trajectory
              </p>
            </div>
          </div>

          <AreaTrendChart
            data={MOCK_BOOKING_TREND}
            height={210}
            lineColor="#3B82F6"
            metricLabel="Bookings"
          />
        </div>

        {/* Right: Requests by Type Donut */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Requests by Type
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Breakdown between scheduled roster and ad-hoc employee rides
              </p>
            </div>
          </div>

          <DonutChart
            totalLabel="Requests"
            totalValue="2,568"
            segments={MOCK_REQUEST_TYPES_DONUT}
            size={180}
            thickness={22}
          />
        </div>
      </div>
    </div>
  );
}

