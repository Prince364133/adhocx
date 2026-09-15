'use client';

import React, { useState } from 'react';
import {
  PageHeader,
  MetricCard,
  Card,
  Button,
  DataTable,
  StatusBadge,
} from '../../components/common';

interface CorridorData {
  route: string;
  vehicleClass: string;
  demands: number;
  fulfilled: number;
  avgFare: number;
  fulfillmentRate: number;
}

const CORRIDOR_METRICS: CorridorData[] = [
  {
    route: 'Bangalore ⇄ Mysore Highway',
    vehicleClass: 'Sedan & SUV',
    demands: 342,
    fulfilled: 320,
    avgFare: 3250,
    fulfillmentRate: 93.5,
  },
  {
    route: 'Mumbai ⇄ Pune Expressway',
    vehicleClass: 'All Classes',
    demands: 480,
    fulfilled: 445,
    avgFare: 2800,
    fulfillmentRate: 92.7,
  },
  {
    route: 'Delhi NCR ⇄ Agra Taj Corridor',
    vehicleClass: 'SUV / Tempo',
    demands: 215,
    fulfilled: 198,
    avgFare: 4600,
    fulfillmentRate: 92.1,
  },
  {
    route: 'Hyderabad ⇄ Vijayawada',
    vehicleClass: 'Sedan / SUV',
    demands: 178,
    fulfilled: 154,
    avgFare: 5200,
    fulfillmentRate: 86.5,
  },
  {
    route: 'Chennai ⇄ Pondicherry Coastway',
    vehicleClass: 'Sedan / Premium',
    demands: 140,
    fulfilled: 122,
    avgFare: 3100,
    fulfillmentRate: 87.1,
  },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('30D');

  function handleExportCsv() {
    const headers = ['Route Corridor', 'Vehicle Class', 'Demands', 'Fulfilled', 'Avg Fare (INR)', 'Fulfillment Rate (%)'];
    const rows = CORRIDOR_METRICS.map((c) => [
      `"${c.route}"`,
      `"${c.vehicleClass}"`,
      c.demands,
      c.fulfilled,
      c.avgFare,
      `${c.fulfillmentRate}%`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `adhocx_operational_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <PageHeader
        title="Operational Analytics & SLA Telemetry"
        subtitle="Marketplace operational performance, SLA fulfillment metrics, corridor utilization, and GMV breakdown"
        liveStatus="Analytics Pipeline Active (30m Batch)"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            >
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days (Current Month)</option>
              <option value="90D">Q3 2026 Quarterly</option>
              <option value="YTD">Year-to-Date 2026</option>
            </select>
            <Button variant="primary" size="md" onClick={handleExportCsv} leftIcon="📥">
              Export CSV Report
            </Button>
          </div>
        }
      />

      {/* Top Level Executive KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Fulfillment Rate"
          value="88.4%"
          trend={{ value: '+3.2% vs last month', positive: true }}
          subtext="Target SLA benchmark > 85%"
          icon="🎯"
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Avg Driver Response"
          value="42s"
          trend={{ value: '18s faster than SLA', positive: true }}
          subtext="Optimal target < 60s"
          icon="⚡"
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Platform GMV"
          value="₹ 14,20,500"
          trend={{ value: '+18.4% MoM growth', positive: true }}
          subtext="Escrow processed transactions"
          icon="📈"
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Trip Cancellation Rate"
          value="2.1%"
          trend={{ value: '-0.8% cancellation drop', positive: true }}
          subtext="Safely within threshold < 4%"
          icon="🛡️"
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Mid Level Analytics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Fulfillment by Vehicle Class */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Fulfillment by Vehicle Category
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Ratio of commercial driver assignments fulfilled vs. posted requests
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--brand-primary)' }}>
              LIVE BATCH
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {[
              { category: 'Sedan (Dzire, Etios, Aura)', rate: 92, demands: 540 },
              { category: 'SUV (Innova Crysta, Ertiga, Carens)', rate: 86, demands: 420 },
              { category: 'Tempo Traveller (12-16 Seater Mini Bus)', rate: 78, demands: 180 },
              { category: 'Hatchback (WagonR, Tiago City Cabs)', rate: 95, demands: 310 },
              { category: 'Luxury (Fortuner, Camry VIP Transfers)', rate: 81, demands: 85 },
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.category}</span>
                  <div>
                    <strong style={{ color: item.rate >= 90 ? 'var(--color-success)' : item.rate >= 80 ? 'var(--brand-primary)' : 'var(--color-warning)' }}>
                      {item.rate}%
                    </strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.375rem' }}>
                      ({item.demands} trips)
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--bg-card-elevated)',
                    borderRadius: 'var(--radius-pill)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${item.rate}%`,
                      height: '100%',
                      backgroundColor:
                        item.rate >= 90
                          ? 'var(--color-success)'
                          : item.rate >= 80
                          ? 'var(--brand-primary)'
                          : 'var(--color-warning)',
                      borderRadius: 'var(--radius-pill)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Operational SLA Health Index */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Platform SLA Compliance Index
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Real-time operational thresholds across supply and customer commitments
              </p>
            </div>
            <StatusBadge status="OPERATIONAL" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              {
                metric: 'On-Time Pickup Reliability',
                value: '96.4%',
                sla: 'Threshold: 92.0%',
                status: 'HEALTHY',
                desc: 'Vehicle arrives within ±10 mins of scheduled time',
              },
              {
                metric: 'Driver No-Show Guarantee',
                value: '0.6%',
                sla: 'Threshold: < 1.5%',
                status: 'HEALTHY',
                desc: 'Cases where backup driver reassignment was auto-triggered',
              },
              {
                metric: 'KYC Document Verification SLA',
                value: '3.2 Hours',
                sla: 'Threshold: < 6.0 Hours',
                status: 'HEALTHY',
                desc: 'Average turnaround from driver doc upload to approval',
              },
              {
                metric: 'Bank Settlement Payout Cycle',
                value: '4.8 Hours',
                sla: 'Threshold: < 24.0 Hours',
                status: 'HEALTHY',
                desc: 'Average time from withdrawal request to UTR dispatch',
              },
            ].map((sla, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    {sla.metric}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {sla.desc}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-success)' }}>
                    {sla.value}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    {sla.sla}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Corridor Demand Density DataTable */}
      <Card>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            High-Density Travel Corridors (Outstation & Airport Routes)
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Aggregated volume, average transaction sizes, and supply fulfillment rates across major interstate routes
          </p>
        </div>

        <DataTable<CorridorData>
          columns={[
            {
              header: 'CORRIDOR ROUTE',
              accessor: (c) => (
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {c.route}
                </div>
              ),
            },
            {
              header: 'VEHICLE CLASS',
              accessor: (c) => (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {c.vehicleClass}
                </span>
              ),
            },
            {
              header: 'POSTED DEMANDS',
              accessor: (c) => (
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {c.demands}
                </span>
              ),
            },
            {
              header: 'FULFILLED TRIPS',
              accessor: (c) => (
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                  {c.fulfilled}
                </span>
              ),
            },
            {
              header: 'AVG TRIP FARE',
              accessor: (c) => (
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  ₹ {c.avgFare.toLocaleString('en-IN')}
                </span>
              ),
            },
            {
              header: 'FULFILLMENT %',
              align: 'right',
              accessor: (c) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: c.fulfillmentRate >= 90 ? 'var(--color-success)' : 'var(--brand-primary)',
                    }}
                  >
                    {c.fulfillmentRate}%
                  </span>
                  <StatusBadge status={c.fulfillmentRate >= 90 ? 'OPTIMAL' : 'ACTIVE'} />
                </div>
              ),
            },
          ]}
          data={CORRIDOR_METRICS}
          keyExtractor={(c) => c.route}
        />
      </Card>
    </div>
  );
}
