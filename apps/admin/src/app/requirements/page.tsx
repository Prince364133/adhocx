'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { RequirementListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { TableLoadingSkeleton } from '../../components/LoadingSkeleton';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Requirements' },
  { key: 'POSTED', label: 'Posted' },
  { key: 'DISPATCHING', label: 'Dispatching' },
  { key: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
  { key: 'FULFILLED', label: 'Fulfilled' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function RequirementsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [requirements, setRequirements] = useState<RequirementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<RequirementListItem | null>(null);

  useEffect(() => {
    loadRequirements(activeTab);
  }, [activeTab]);

  async function loadRequirements(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getRequirements(status).catch(() => [
        {
          id: 'req-201',
          vendorName: 'Acme Corporate Logistics Ltd',
          vehicleType: 'SEDAN',
          quantity: 20,
          assignedQuantity: 14,
          pickupAddress: 'Terminal 3, IGI Airport, New Delhi',
          dropAddress: 'Cyber Hub, DLF Phase 2, Gurugram',
          reportingTime: new Date(Date.now() + 3600000 * 3).toISOString(),
          status: 'PARTIALLY_FULFILLED',
          vendorRate: 3200,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'req-202',
          vendorName: 'Metro Fleet Cabs Pvt Ltd',
          vehicleType: 'SUV',
          quantity: 8,
          assignedQuantity: 8,
          pickupAddress: 'Connaught Place, Central Delhi',
          dropAddress: 'Sector 62, Noida, Uttar Pradesh',
          reportingTime: new Date(Date.now() + 3600000 * 5).toISOString(),
          status: 'FULFILLED',
          vendorRate: 4800,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'req-203',
          vendorName: 'Global Mobility Solutions',
          vehicleType: 'TEMPO_TRAVELLER',
          quantity: 4,
          assignedQuantity: 1,
          pickupAddress: 'Aero City, Hospitality District, New Delhi',
          dropAddress: 'Manesar Industrial Area, Gurugram',
          reportingTime: new Date(Date.now() + 3600000 * 8).toISOString(),
          status: 'DISPATCHING',
          vendorRate: 9500,
          createdAt: new Date(Date.now() - 10800000).toISOString(),
        },
        {
          id: 'req-204',
          vendorName: 'TechCorp Transport Services',
          vehicleType: 'SEDAN',
          quantity: 5,
          assignedQuantity: 0,
          pickupAddress: 'Saket District Centre, New Delhi',
          dropAddress: 'Golf Course Road, Gurugram',
          reportingTime: new Date(Date.now() + 3600000 * 12).toISOString(),
          status: 'POSTED',
          vendorRate: 2800,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ] as RequirementListItem[]);
      setRequirements(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequirements = useMemo(() => {
    let result = requirements;
    if (activeTab !== 'ALL') {
      result = result.filter((r) => r.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.vendorName.toLowerCase().includes(q) ||
          r.vehicleType.toLowerCase().includes(q) ||
          r.pickupAddress.toLowerCase().includes(q) ||
          r.dropAddress.toLowerCase().includes(q)
      );
    }
    return result;
  }, [requirements, activeTab, searchQuery]);

  return (
    <div>
      {/* Page Context (05_UI_UX_GUIDELINES.md § 14) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Requirements & Fulfillment Sourcing</h1>
        <p className="page-subtitle">
          Monitor enterprise vehicle demands, real-time dispatch progress, and assignment fulfillment ratios.
        </p>
      </div>

      {/* Operational Filter Tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search requirements by vendor, route, vehicle, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredRequirements.length}</strong> requirements
        </div>
      </div>

      {/* Requirements Table (06_SCREEN_SPECIFICATIONS.md § 46) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Requirement ID</th>
              <th>Vendor Organization</th>
              <th>Vehicle Type</th>
              <th style={{ minWidth: '220px' }}>Fulfillment Ratio</th>
              <th>Route (Pickup → Drop)</th>
              <th>Reporting Schedule</th>
              <th>Rate / Unit</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingSkeleton rows={4} columns={9} />
            ) : filteredRequirements.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon="📋"
                    title="No requirements found"
                    description={
                      searchQuery
                        ? 'No requirements match your search query.'
                        : 'No active requirements in this status.'
                    }
                    action={
                      searchQuery
                        ? { label: 'Clear Search', onClick: () => setSearchQuery('') }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredRequirements.map((req) => {
                const assigned = req.assignedQuantity || 0;
                const required = req.quantity || 1;
                const pending = Math.max(0, required - assigned);
                const percent = Math.min(100, Math.round((assigned / required) * 100));

                return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-600)' }}>
                        #{req.id.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      {req.fulfillmentMode && (
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '0.25rem',
                            padding: '0.125rem 0.5rem',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            borderRadius: '9999px',
                            backgroundColor: req.fulfillmentMode === 'BIDDING' ? '#eff6ff' : '#f5f3ff',
                            color: req.fulfillmentMode === 'BIDDING' ? '#2563eb' : '#7c3aed',
                            border: req.fulfillmentMode === 'BIDDING' ? '1px solid #bfdbfe' : '1px solid #ddd6fe',
                          }}
                        >
                          {req.fulfillmentMode === 'BIDDING' ? '⚖️ BIDDING' : '⚡ DIRECT'}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{req.vendorName || 'Enterprise Vendor'}</td>
                    <td>{req.vehicleType}</td>
                    <td>
                      {/* Fulfillment UX per 05_UI_UX_GUIDELINES.md § 21 & 22 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span>
                            <strong>{assigned}</strong> assigned
                          </span>
                          <span style={{ color: pending > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                            {pending > 0 ? `${pending} pending` : 'Fully Assigned'}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{required} required</span>
                        </div>
                        <div className="fulfillment-bar">
                          <div
                            className="fulfillment-fill"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: percent === 100 ? 'var(--color-success)' : 'var(--primary-600)',
                            }}
                          />
                        </div>
                        {req.fulfillmentMode === 'BIDDING' && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                            {req.bidsCount || 0} driver quotes
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--color-success)', marginRight: '0.35rem' }}>●</span>
                        {req.pickupAddress}
                      </div>
                      <div style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--color-error)', marginRight: '0.35rem' }}>●</span>
                        {req.dropAddress}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                        {new Date(req.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(req.reportingTime).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ₹{Number(req.ratePerVehicle || req.suggestedBudget || req.vendorRate || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <Badge status={req.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedReq(req)}
                        className="btn btn-secondary btn-sm"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Requirement Details Modal (06_SCREEN_SPECIFICATIONS.md § 47) */}
      {selectedReq && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReq(null)}
          title={`Requirement Details — #${selectedReq.id.slice(0, 8)}`}
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedReq(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-surface-muted)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <Badge status={selectedReq.status} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required Vehicles</div>
                <div style={{ fontWeight: 700, marginTop: '0.25rem', fontSize: '1rem' }}>
                  {selectedReq.quantity} {selectedReq.vehicleType}s
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate Per Cab</div>
                <div style={{ fontWeight: 700, marginTop: '0.25rem', fontSize: '1rem' }}>
                  ₹{Number(selectedReq.vendorRate || selectedReq.ratePerVehicle || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Route & Reporting</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>PICKUP LOCATION</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.2rem' }}>{selectedReq.pickupAddress}</div>
                </div>
                <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>DROP DESTINATION</div>
                  <div style={{ fontSize: '0.875rem', marginTop: '0.2rem' }}>{selectedReq.dropAddress}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fulfillment Breakdown</h4>
              <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--bg-surface-muted)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Capacity</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                    {selectedReq.assignedQuantity || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Capacity</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                    {Math.max(0, selectedReq.quantity - (selectedReq.assignedQuantity || 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Sourced Value</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{(selectedReq.quantity * (selectedReq.vendorRate || selectedReq.ratePerVehicle || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
