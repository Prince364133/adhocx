'use client';

import React from 'react';
import { Badge } from '../../components/Badge';

export default function PricingPage() {
  const rateCards = [
    {
      vehicleType: 'SEDAN',
      description: 'Compact & executive 4-seater sedans (Dzire, Aura, Etios)',
      baseFare: 800,
      perKmRate: 14.5,
      platformFeePercent: 10,
      status: 'ACTIVE',
      updatedAt: '2026-08-15',
    },
    {
      vehicleType: 'SUV',
      description: '6-7 seater commercial SUVs (Innova Crysta, Ertiga, Carens)',
      baseFare: 1400,
      perKmRate: 19.0,
      platformFeePercent: 10,
      status: 'ACTIVE',
      updatedAt: '2026-08-15',
    },
    {
      vehicleType: 'TEMPO_TRAVELLER',
      description: '12-16 seater minibuses for large corporate teams',
      baseFare: 3200,
      perKmRate: 28.0,
      platformFeePercent: 12,
      status: 'ACTIVE',
      updatedAt: '2026-08-01',
    },
    {
      vehicleType: 'BUS',
      description: '24-40 seater commercial coaches',
      baseFare: 6500,
      perKmRate: 45.0,
      platformFeePercent: 12,
      status: 'ACTIVE',
      updatedAt: '2026-07-20',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Marketplace Pricing & Commission Schedules</h1>
        <p className="page-subtitle">
          Configure baseline vehicle rates, per-kilometer tariffs, and marketplace take-rates.
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Vehicle Category</th>
              <th>Description</th>
              <th>Base Fare (4 Hours / 40 km)</th>
              <th>Per Km Tariff</th>
              <th>Platform Take Rate</th>
              <th>Status</th>
              <th>Effective Since</th>
            </tr>
          </thead>
          <tbody>
            {rateCards.map((rc) => (
              <tr key={rc.vehicleType}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rc.vehicleType}</div>
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{rc.description}</td>
                <td style={{ fontWeight: 600 }}>₹{rc.baseFare.toLocaleString('en-IN')}</td>
                <td style={{ fontWeight: 600 }}>₹{rc.perKmRate.toFixed(2)}/km</td>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{rc.platformFeePercent}%</span>
                </td>
                <td>
                  <Badge status={rc.status} />
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{rc.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
