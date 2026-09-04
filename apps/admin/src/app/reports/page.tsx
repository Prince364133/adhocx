'use client';

import React from 'react';

export default function ReportsPage() {
  const metrics = [
    { label: 'Demand Fulfillment Rate', value: '88.4%', sub: '+3.2% vs last month', positive: true },
    { label: 'Average Driver Acceptance Time', value: '42s', sub: 'Optimal target < 60s', positive: true },
    { label: 'Platform Gross Merchandise Value', value: '₹14,20,500', sub: 'August 2026', positive: true },
    { label: 'Total Trip Cancellations', value: '2.1%', sub: 'Within threshold < 4%', positive: true },
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Operational Analytics & Reports</h1>
        <p className="page-subtitle">
          Marketplace operational performance, SLA fulfillment metrics, driver utilization, and GMV breakdown.
        </p>
      </div>

      <div className="stat-grid">
        {metrics.map((m, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-label">{m.label}</div>
            <div className="stat-value" style={{ color: m.positive ? 'var(--color-success)' : 'var(--color-error)' }}>
              {m.value}
            </div>
            <div className="stat-footer">{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Fulfillment Efficiency by Vehicle Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                <span>Sedan (Dzire / Etios)</span>
                <strong>92% fulfilled</strong>
              </div>
              <div className="fulfillment-bar">
                <div className="fulfillment-fill" style={{ width: '92%' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                <span>SUV (Innova Crysta / Ertiga)</span>
                <strong>86% fulfilled</strong>
              </div>
              <div className="fulfillment-bar">
                <div className="fulfillment-fill" style={{ width: '86%' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                <span>Tempo Traveller (12-16 seater)</span>
                <strong>78% fulfilled</strong>
              </div>
              <div className="fulfillment-bar">
                <div className="fulfillment-fill" style={{ width: '78%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Operational SLA Summary</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.84rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>On-Time Pickup Rate</span>
              <strong style={{ color: 'var(--color-success)' }}>96.4%</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Driver No-Show Incident Rate</span>
              <strong style={{ color: 'var(--color-success)' }}>0.6%</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>KYC Verification Turnaround</span>
              <strong>3.2 Hours</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Settlement Processing Time</span>
              <strong>Within 24 Hours</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
