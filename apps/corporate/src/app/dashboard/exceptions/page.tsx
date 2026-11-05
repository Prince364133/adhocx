'use client';

import React, { useState } from 'react';
import {
  Clock,
  UserX,
  Radio,
  Navigation,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Eye,
  CheckCircle,
  Search,
} from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import {
  mockExceptions,
  mockExceptionsSummary,
  mockExceptionsTrend,
  ExceptionItem,
} from '../../../lib/mock/corporateMockData';

export default function ExceptionsDashboardPage() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>(mockExceptions);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Exceptions Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Trips, vehicles and operations that need attention
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="Today, 14 Dec 2026"
          showExceptionTypes={true}
        />
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Delayed Pickups"
          value={mockExceptionsSummary.delayedPickups}
          subtext="Needs Attention"
          icon={<Clock size={18} />}
          highlightColor="#D97706"
          onClick={() => setActiveFilter('DELAYED')}
        />
        <MetricCard
          label="Unassigned Trips"
          value={mockExceptionsSummary.unassignedTrips}
          subtext="Requires Allocation"
          icon={<UserX size={18} />}
          highlightColor="#EA580C"
          onClick={() => setActiveFilter('UNASSIGNED')}
        />
        <MetricCard
          label="GPS Stale"
          value={mockExceptionsSummary.gpsStaleCount}
          subtext="> 5 mins"
          icon={<Radio size={18} />}
          highlightColor="#CA8A04"
          onClick={() => setActiveFilter('GPS')}
        />
        <MetricCard
          label="Route Deviations"
          value={mockExceptionsSummary.routeDeviations}
          subtext="Check Route"
          icon={<Navigation size={18} />}
          highlightColor="#7C3AED"
          onClick={() => setActiveFilter('DEVIATION')}
        />
        <MetricCard
          label="Safety Alerts"
          value={mockExceptionsSummary.safetyAlerts}
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
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Exception List ({filteredExceptions.length})
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
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
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>
          </div>

          <div className="table-scroll">
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
                      <td style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {item.target}
                      </td>
                      <td style={{ color: '#475569', fontSize: '12px' }}>
                        {item.details}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: item.status === 'Escalated' ? '#DC2626' : item.status === 'In Review' ? '#D97706' : '#1167EE',
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
                            color: '#1167EE',
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
          </div>
        </div>

        {/* Right: Exceptions Trend (Last 7 Days) */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 38%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Exceptions Trend (Last 7 Days)
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Incident recurrence by category over time
              </p>
            </div>
          </div>

          {/* Trend Multi-Line Chart Legend */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '11px', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#D97706' }} />
              <span style={{ color: '#64748B' }}>Delayed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EA580C' }} />
              <span style={{ color: '#64748B' }}>Unassigned</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#CA8A04' }} />
              <span style={{ color: '#64748B' }}>GPS Stale</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7C3AED' }} />
              <span style={{ color: '#64748B' }}>Deviation</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#DC2626' }} />
              <span style={{ color: '#64748B' }}>Safety</span>
            </div>
          </div>

          {/* SVG Trend Multi-Line Visualizer */}
          <svg viewBox="0 0 460 220" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            {/* Grid */}
            {[0, 10, 20, 30, 40].map((v) => {
              const y = 180 - (v / 40) * 150;
              return (
                <g key={v}>
                  <line x1="30" y1={y} x2="440" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <text x="24" y={y + 4} textAnchor="end" fontSize="10" fill="#94A3B8">
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Render lines for Unassigned (highest) and Delayed */}
            {/* Unassigned curve: red-orange */}
            <path
              d="M 50 60 Q 110 65, 170 68 T 290 55 T 410 70"
              fill="none"
              stroke="#EA580C"
              strokeWidth="2.5"
            />
            {/* Delayed curve: amber */}
            <path
              d="M 50 115 Q 110 125, 170 128 T 290 135 T 410 138"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
            />
            {/* GPS Stale curve: yellow */}
            <path
              d="M 50 150 Q 110 148, 170 155 T 290 160 T 410 158"
              fill="none"
              stroke="#CA8A04"
              strokeWidth="2"
            />
            {/* Safety curve: red */}
            <path
              d="M 50 175 Q 110 172, 170 180 T 290 172 T 410 170"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
            />

            {/* X Labels */}
            {mockExceptionsTrend.map((t, idx) => {
              const x = 50 + idx * 60;
              return (
                <text key={t.day} x={x} y="205" textAnchor="middle" fontSize="10" fill="#94A3B8">
                  {t.day}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

