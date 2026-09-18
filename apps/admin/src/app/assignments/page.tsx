'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { AssignmentItem } from '../../lib/api/types';
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
  { id: 'ALL', label: 'All Assignments' },
  { id: 'OFFERED', label: 'Offered' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsg, setSelectedAsg] = useState<AssignmentItem | null>(null);

  useEffect(() => {
    loadAssignments(activeTab);
  }, [activeTab]);

  async function loadAssignments(status: string) {
    setLoading(true);
    try {
      const res = await adminApi.getAssignments({
        status: status !== 'ALL' ? status : undefined,
        limit: 100,
      }).catch(() => []);
      setAssignments(Array.isArray(res) ? res : []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const q = search.toLowerCase().trim();
    return assignments.filter((asg) => {
      return (
        asg.id.toLowerCase().includes(q) ||
        asg.requirementId.toLowerCase().includes(q) ||
        (asg.driverName && asg.driverName.toLowerCase().includes(q)) ||
        (asg.driverPhone && asg.driverPhone.toLowerCase().includes(q)) ||
        (asg.vehiclePlate && asg.vehiclePlate.toLowerCase().includes(q))
      );
    });
  }, [assignments, search]);

  const columns: Column<AssignmentItem>[] = [
    {
      key: 'id',
      label: 'Assignment ID & Requirement',
      sortable: true,
      render: (asg) => (
        <div>
          <span className="code-tag">{asg.id.toUpperCase()}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Ref: {asg.requirementId.toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      key: 'driverName',
      label: 'Assigned Driver',
      sortable: true,
      render: (asg) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{asg.driverName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{asg.driverPhone}</div>
        </div>
      ),
    },
    {
      key: 'vehiclePlate',
      label: 'Vehicle Assigned',
      render: (asg) => (
        <div>
          <span className="code-tag">{asg.vehiclePlate}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {asg.vehicleType}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Assignment Status',
      sortable: true,
      render: (asg) => <StatusBadge status={asg.status} size="sm" />,
    },
    {
      key: 'assignedAt',
      label: 'Matched At',
      sortable: true,
      render: (asg) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {asg.assignedAt || asg.offeredAt || asg.createdAt ? new Date(asg.assignedAt || asg.offeredAt || asg.createdAt).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (asg) => (
        <Button variant="secondary" size="sm" onClick={() => setSelectedAsg(asg)}>
          Inspect →
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Driver Assignments & Dispatch Telemetry"
        subtitle="Monitor requirement-to-driver dispatch assignments, accepted slots, and vehicle pairing"
        liveStatus="Matching Engine Active"
      />

      <FilterBar
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search assignment ID, requirement, driver, plate..."
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(a) => a.id}
        loading={loading}
        emptyTitle="No assignments found"
        emptySubtitle={`No dispatch assignments match the filter: "${activeTab}".`}
      />

      {/* Slide-out Assignment Details Drawer */}
      <Drawer
        isOpen={!!selectedAsg}
        onClose={() => setSelectedAsg(null)}
        title={selectedAsg ? `Assignment ${selectedAsg.id.toUpperCase()}` : ''}
        subtitle={selectedAsg ? `Requirement: ${selectedAsg.requirementId.toUpperCase()}` : ''}
        width="540px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setSelectedAsg(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedAsg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
              }}
            >
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '0.35rem' }}>
                  <StatusBadge status={selectedAsg.status} />
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Type</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedAsg.vehicleType}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                ASSIGNED DRIVER & VEHICLE
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {selectedAsg.driverName}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Contact: {selectedAsg.driverPhone}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <span className="code-tag">{selectedAsg.vehiclePlate}</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                ASSIGNMENT TIMELINE
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Matched at: {selectedAsg.assignedAt || selectedAsg.offeredAt || selectedAsg.createdAt ? new Date(selectedAsg.assignedAt || selectedAsg.offeredAt || selectedAsg.createdAt).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
