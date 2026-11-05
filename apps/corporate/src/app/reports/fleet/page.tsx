'use client';

import React from 'react';
import {
  Route,
  Car,
  BatteryCharging,
  Gauge,
  TrendingUp,
  AlertTriangle,
  Download,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { mockVehicleRouteAnalytics } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';

export default function VehicleRouteAnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Vehicle & Route Telemetry Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Dead-mileage optimization, EV fleet efficiency, corridor transit speeds and bottleneck diagnosis
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export Telemetry PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Active Fleet Size"
          value={`${mockVehicleRouteAnalytics.activeFleetSize} Cabs`}
          delta="100% OBD-II GPS Tracked"
          deltaType="positive"
          icon={<Car size={20} />}
          category="primary"
        />
        <MetricCard
          label="Fleet Capacity Utilization"
          value={`${mockVehicleRouteAnalytics.avgFleetUtilizationPct}%`}
          delta="+3.2 pp vs previous quarter"
          deltaType="positive"
          icon={<Gauge size={20} />}
          category="success"
        />
        <MetricCard
          label="Dead Mileage Ratio"
          value={`${mockVehicleRouteAnalytics.deadMileagePct}%`}
          delta="Well below 8.0% industry ceiling"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
        <MetricCard
          label="Electric EV Commute Share"
          value={`${mockVehicleRouteAnalytics.fuelEvSharePct}% EV`}
          delta="44 Electric Cabs Active"
          deltaType="positive"
          icon={<Zap size={20} />}
          category="info"
        />
      </div>

      {/* Two-Column Section: Fastest vs Congested Corridors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Fastest High-Efficiency Corridors */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <TrendingUp size={18} style={{ color: '#16A34A' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Top High-Velocity Corridors
            </h2>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mockVehicleRouteAnalytics.fastestCorridors.map((c, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 6,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.corridor}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Avg Duration: ~{c.avgDurationMin} min
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>
                    {c.avgSpeedKmh} km/h
                  </div>
                  <div style={{ fontSize: 10, color: '#15803D' }}>Punctual</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Congested Bottlenecks Requiring Buffer */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={18} style={{ color: '#D97706' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Traffic Bottlenecks (Recommended Buffer)
            </h2>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mockVehicleRouteAnalytics.congestedCorridors.map((c, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#FEF3C7',
                  borderRadius: 6,
                  border: '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.corridor}
                  </div>
                  <div style={{ fontSize: 11, color: '#92400E' }}>
                    Delay Probability: {c.delayFreqPct}% during peak hours
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#B45309' }}>
                    {c.avgSpeedKmh} km/h
                  </div>
                  <div style={{ fontSize: 10, color: '#B45309' }}>+10 min buffer auto-added</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

