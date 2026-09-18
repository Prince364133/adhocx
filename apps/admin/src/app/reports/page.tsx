'use client';

import React, { useState, useEffect } from 'react';
import { Download, Target, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { OperationalReportData, CorridorAnalytics } from '../../lib/api/types';
import {
  PageHeader,
  MetricCard,
  Card,
  Button,
  DataTable,
  StatusBadge,
} from '../../components/common';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('30D');
  const [reportData, setReportData] = useState<OperationalReportData | null>(null);
  const [corridors, setCorridors] = useState<CorridorAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const [rep, corr] = await Promise.all([
        adminApi.getOperationalReports().catch(() => null),
        adminApi.getCorridorAnalytics().catch(() => [] as CorridorAnalytics[]),
      ]);
      setReportData(rep);
      setCorridors(corr || []);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    const headers = ['Route Corridor', 'Pickup City', 'Drop City', 'Total Trips', 'Avg Driver Fare (INR)', 'Total Revenue (INR)', 'Top Vehicle'];
    const rows = corridors.map((c) => [
      `"${c.corridor}"`,
      `"${c.pickupCity}"`,
      `"${c.dropCity}"`,
      c.totalTrips,
      c.avgDriverRate,
      c.totalRevenue,
      `"${c.topVehicleType}"`,
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
            <Button variant="primary" size="md" onClick={handleExportCsv} leftIcon={<Download size={16} />}>
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
          value={loading ? '...' : `${reportData ? reportData.fulfillmentRatePercent : 0}%`}
          subtext={`${reportData ? reportData.fulfilledRequirements : 0} of ${reportData ? reportData.totalRequirements : 0} demand lots fulfilled`}
          icon={<Target size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Gross Booking Value (GMV)"
          value={loading ? '...' : `₹ ${Number(reportData ? reportData.totalGrossBookingValue : 0).toLocaleString('en-IN')}`}
          subtext="Total marketplace transaction volume"
          icon={<TrendingUp size={18} color="#8B5CF6" />}
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Platform Revenue"
          value={loading ? '...' : `₹ ${Number(reportData ? reportData.platformRevenue : 0).toLocaleString('en-IN')}`}
          subtext="Net commission & fee retained"
          icon={<Zap size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Active Marketplace Base"
          value={loading ? '...' : `${reportData ? reportData.activeDrivers : 0} Drv / ${reportData ? reportData.activeVendors : 0} Cli`}
          subtext={`Avg rating: ${reportData ? reportData.averageTripRating : 5.0} ★`}
          icon={<ShieldCheck size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Corridor Demand Density DataTable */}
      <Card>
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            High-Density Travel Corridors & Route Analytics
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Aggregated trip volume, average transaction sizes, and top vehicle types across active routes
          </p>
        </div>

        <DataTable
          columns={[
            {
              header: 'CORRIDOR ROUTE',
              accessor: (c: CorridorAnalytics) => (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {c.corridor}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {c.pickupCity} ➔ {c.dropCity}
                  </div>
                </div>
              ),
            },
            {
              header: 'PRIMARY VEHICLE',
              accessor: (c: CorridorAnalytics) => (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {c.topVehicleType}
                </span>
              ),
            },
            {
              header: 'TOTAL TRIPS',
              accessor: (c: CorridorAnalytics) => (
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {c.totalTrips}
                </span>
              ),
            },
            {
              header: 'AVG TRIP FARE',
              accessor: (c: CorridorAnalytics) => (
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  ₹ {Number(c.avgDriverRate || 0).toLocaleString('en-IN')}
                </span>
              ),
            },
            {
              header: 'TOTAL REVENUE',
              accessor: (c: CorridorAnalytics) => (
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-success)' }}>
                  ₹ {Number(c.totalRevenue || 0).toLocaleString('en-IN')}
                </span>
              ),
            },
            {
              header: 'AVG DISPATCH MATCH',
              align: 'right',
              accessor: (c: CorridorAnalytics) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                    {c.avgFulfillmentTimeMinutes} mins
                  </span>
                  <StatusBadge status="ACTIVE" />
                </div>
              ),
            },
          ]}
          data={corridors}
          keyExtractor={(c) => c.corridor}
          loading={loading}
          emptyTitle="No corridor data available"
          emptySubtitle="Corridor intelligence will accumulate automatically as trips execute across city routes."
        />
      </Card>
    </div>
  );
}
