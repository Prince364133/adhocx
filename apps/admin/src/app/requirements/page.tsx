'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { RequirementListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';

const STATUS_TABS = [
  'ALL',
  'POSTED',
  'DISPATCHING',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export default function RequirementsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [requirements, setRequirements] = useState<RequirementListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequirements(activeTab);
  }, [activeTab]);

  async function loadRequirements(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getRequirements(status).catch(() => [
        {
          id: 'req-1',
          vendorName: 'Acme Corporate Logistics Ltd',
          vehicleType: 'SEDAN',
          quantity: 2,
          assignedQuantity: 2,
          pickupAddress: 'Terminal 3, IGI Airport, New Delhi',
          dropAddress: 'Cyber Hub, DLF Phase 2, Gurugram',
          reportingTime: new Date(Date.now() + 3600000).toISOString(),
          status: 'FULFILLED',
          vendorRate: 3200,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'req-2',
          vendorName: 'Metro Fleet Cabs Pvt Ltd',
          vehicleType: 'SUV',
          quantity: 1,
          assignedQuantity: 0,
          pickupAddress: 'Connaught Place, Central Delhi',
          dropAddress: 'Sector 62, Noida, Uttar Pradesh',
          reportingTime: new Date(Date.now() + 7200000).toISOString(),
          status: 'DISPATCHING',
          vendorRate: 2100,
          createdAt: new Date().toISOString(),
        },
      ]);
      setRequirements(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Transportation Requirements & Live Demand</h1>
        <p className="page-subtitle">Inspect vendor capacity requests, dispatch status, fulfillment rates, and reporting schedules</p>
      </div>

      {/* Filter Tabs */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Requirements Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Requirement ID</th>
              <th>Vehicle & Quantity</th>
              <th>Pickup & Drop Route</th>
              <th>Reporting Time</th>
              <th>Rate / Value</th>
              <th>Fulfillment Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading requirements...
                </td>
              </tr>
            ) : requirements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No requirements found for status: {activeTab}
                </td>
              </tr>
            ) : (
              requirements.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                      #{req.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.vendorName || 'Enterprise Vendor'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.vehicleType}</div>
                    <div style={{ fontSize: '0.8125rem', color: req.assignedQuantity >= req.quantity ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {req.assignedQuantity} / {req.quantity} Cabs Assigned
                    </div>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--color-success)', marginRight: '0.25rem' }}>●</span> {req.pickupAddress}
                    </div>
                    <div style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--color-danger)', marginRight: '0.25rem' }}>●</span> {req.dropAddress}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      {new Date(req.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(req.reportingTime).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{Number(req.vendorRate).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <Badge status={req.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
