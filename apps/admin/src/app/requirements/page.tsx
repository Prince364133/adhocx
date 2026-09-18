'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { RequirementListItem } from '../../lib/api/types';
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Demands' },
  { id: 'DISPATCHING', label: 'Dispatching' },
  { id: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
  { id: 'FULFILLED', label: 'Fulfilled' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function RequirementsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [requirements, setRequirements] = useState<RequirementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<RequirementListItem | null>(null);

  useEffect(() => {
    loadRequirements(activeTab);
  }, [activeTab]);

  async function loadRequirements(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getRequirements(status).catch(() => [] as RequirementListItem[]);
      setRequirements(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return requirements;
    const q = search.toLowerCase();
    return requirements.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        (r.vendorName && r.vendorName.toLowerCase().includes(q)) ||
        r.pickupAddress.toLowerCase().includes(q) ||
        r.dropAddress.toLowerCase().includes(q) ||
        r.vehicleType.toLowerCase().includes(q)
    );
  }, [requirements, search]);

  const columns: Column<RequirementListItem>[] = [
    {
      key: 'id',
      label: 'Requirement ID & Client',
      sortable: true,
      render: (r) => (
        <div>
          <span className="code-tag">REQ-{r.id.slice(0, 8).toUpperCase()}</span>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {r.vendorName || 'Corporate Client'}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      label: 'Vehicle & Supply',
      render: (r) => {
        const pct = Math.round(((r.assignedQuantity || 0) / (r.quantity || 1)) * 100);
        return (
          <div style={{ minWidth: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.vehicleType}</span>
              <span style={{ fontWeight: 600, color: pct >= 100 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                {r.assignedQuantity ?? 0} / {r.quantity}
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 100 ? 'var(--color-success)' : 'var(--brand-primary)',
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'route',
      label: 'Route & Schedule',
      render: (r) => (
        <div style={{ maxWidth: '300px' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: 'var(--color-success)' }}>●</span> {r.pickupAddress}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' }}>
            <span style={{ color: 'var(--color-danger)' }}>▼</span> {r.dropAddress}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Reporting: {new Date(r.reportingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'vendorRate',
      label: 'Rate per Cab',
      sortable: true,
      render: (r) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          ₹{Number(r.vendorRate || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Fulfillment Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} size="sm" showPulse />,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (r) => (
        <Button variant="secondary" size="sm" onClick={() => setSelectedReq(r)}>
          Inspect →
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Requirements & Live Demand"
        subtitle="Monitor B2B sourcing sprints, dispatch progress, vehicle fulfillment rates, and reporting schedules"
        liveStatus="Telemetry Connected"
      />

      <FilterBar
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search requirement ID, corporate client, route..."
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(r) => r.id}
        loading={loading}
        emptyTitle="No requirements found"
        emptySubtitle={`No live demand requests match the selected filter "${activeTab}".`}
      />

      {/* Requirement Details Drawer */}
      <Drawer
        isOpen={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={selectedReq ? `Requirement REQ-${selectedReq.id.slice(0, 8).toUpperCase()}` : ''}
        subtitle={selectedReq ? `Client: ${selectedReq.vendorName}` : ''}
        width="580px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setSelectedReq(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedReq && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '0.35rem' }}>
                  <StatusBadge status={selectedReq.status} showPulse />
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fulfillment</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedReq.assignedQuantity ?? 0} / {selectedReq.quantity} Vehicles
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Type</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedReq.vehicleType}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate per Vehicle</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  ₹{Number(selectedReq.vendorRate || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Route Locations
              </h4>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 700 }}>● PICKUP LOCATION</div>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedReq.pickupAddress}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 700 }}>▼ DESTINATION / DROP LOCATION</div>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedReq.dropAddress}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Reporting Time & Schedule
              </h4>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                ⏰ {new Date(selectedReq.reportingTime).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
