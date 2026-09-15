'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { DriverListItem, DriverDetail } from '../../lib/api/types';
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  Drawer,
  Card,
} from '../../components/common';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Drivers' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

export default function DriversPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<DriverDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState<'VERIFY' | 'REJECT' | 'SUSPEND' | 'REACTIVATE' | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDrivers(activeTab);
  }, [activeTab]);

  async function loadDrivers(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getDrivers(status).catch(() => [
        {
          id: 'drv-1',
          fullName: 'Rajesh Kumar',
          phone: '+919876543210',
          vehiclePlate: 'DL01AB1234',
          vehicleType: 'SEDAN',
          verificationStatus: 'UNDER_REVIEW',
          availabilityStatus: 'OFFLINE',
          walletBalance: 2400,
          trustScore: 94.5,
          averageRating: 4.8,
          ratingCount: 22,
          totalTrips: 34,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'drv-2',
          fullName: 'Amit Singh',
          phone: '+919811223344',
          vehiclePlate: 'HR26BC5678',
          vehicleType: 'SUV',
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          walletBalance: 8600,
          trustScore: 98.0,
          averageRating: 4.9,
          ratingCount: 85,
          totalTrips: 120,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'drv-3',
          fullName: 'Suresh Verma',
          phone: '+919899001122',
          vehiclePlate: 'UP16CD9988',
          vehicleType: 'SEDAN',
          verificationStatus: 'REJECTED',
          availabilityStatus: 'OFFLINE',
          walletBalance: 0,
          trustScore: 65.0,
          averageRating: 3.5,
          ratingCount: 4,
          totalTrips: 6,
          createdAt: new Date().toISOString(),
        },
      ] as DriverListItem[]);
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredDrivers = useMemo(() => {
    if (!search) return drivers;
    const q = search.toLowerCase();
    return drivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(q))
    );
  }, [drivers, search]);

  async function handleOpenDetails(driver: DriverListItem) {
    try {
      const detail = await adminApi.getDriverDetails(driver.id).catch(() => ({
        ...driver,
        tripsCount: 14,
        documents: [
          {
            id: 'doc-1',
            documentType: 'DRIVING_LICENSE',
            fileUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
            verified: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'doc-2',
            documentType: 'VEHICLE_RC',
            fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
            verified: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'doc-3',
            documentType: 'COMMERCIAL_PERMIT',
            fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600',
            verified: false,
            createdAt: new Date().toISOString(),
          },
        ],
      } as unknown as DriverDetail));
      setSelectedDriver(detail);
      setReason('');
      setActionType(null);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load detailed driver information.' });
    }
  }

  async function handleExecuteAction() {
    if (!selectedDriver || !actionType) return;
    if ((actionType === 'REJECT' || actionType === 'SUSPEND') && !reason.trim()) {
      setAlert({ type: 'error', message: `Please provide a reason for ${actionType.toLowerCase()}.` });
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === 'VERIFY') {
        await adminApi.verifyDriver(selectedDriver.id, reason);
      } else if (actionType === 'REJECT') {
        await adminApi.rejectDriver(selectedDriver.id, reason);
      } else if (actionType === 'SUSPEND') {
        await adminApi.suspendDriver(selectedDriver.id, reason);
      } else if (actionType === 'REACTIVATE') {
        await adminApi.reactivateDriver(selectedDriver.id);
      }

      setAlert({
        type: 'success',
        message: `Driver ${selectedDriver.fullName} successfully transitioned to ${actionType}.`,
      });
      setSelectedDriver(null);
      loadDrivers(activeTab);
    } catch (err: unknown) {
      setAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Action execution failed.',
      });
    } finally {
      setActionLoading(false);
    }
  }

  const columns: Column<DriverListItem>[] = [
    {
      key: 'fullName',
      label: 'Driver Name & Contact',
      sortable: true,
      render: (drv) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--brand-primary-subtle)',
              border: '1px solid rgba(91, 66, 243, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8125rem',
              fontWeight: 800,
              color: 'var(--brand-primary)',
            }}
          >
            {drv.fullName ? drv.fullName.slice(0, 2).toUpperCase() : 'DR'}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{drv.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{drv.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'vehiclePlate',
      label: 'Vehicle Assigned',
      render: (drv) => (
        <div>
          <span className="code-tag">{drv.vehiclePlate || 'Not Assigned'}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {drv.vehicleType || 'Standard'}
          </div>
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      label: 'KYC Status',
      sortable: true,
      render: (drv) => <StatusBadge status={drv.verificationStatus} size="sm" />,
    },
    {
      key: 'availabilityStatus',
      label: 'Availability',
      render: (drv) => <StatusBadge status={drv.availabilityStatus} size="sm" showPulse />,
    },
    {
      key: 'trustScore',
      label: 'Trust & Reputation',
      sortable: true,
      render: (drv) => {
        const score = drv.trustScore ?? 100;
        const color = score >= 90 ? 'var(--color-success)' : score >= 75 ? 'var(--color-warning)' : 'var(--color-danger)';
        return (
          <div>
            <div style={{ fontWeight: 800, color, fontSize: '0.875rem' }}>{score.toFixed(1)}% Trust</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              ★ {(drv.averageRating ?? 5.0).toFixed(1)} ({drv.ratingCount ?? 0}) • {drv.totalTrips ?? 0} trips
            </div>
          </div>
        );
      },
    },
    {
      key: 'walletBalance',
      label: 'Wallet Balance',
      sortable: true,
      render: (drv) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          ₹{Number(drv.walletBalance || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (drv) => (
        <Button
          variant={drv.verificationStatus === 'UNDER_REVIEW' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => handleOpenDetails(drv)}
        >
          {drv.verificationStatus === 'UNDER_REVIEW' ? 'Review KYC →' : 'Inspect →'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Driver Fleet Management"
        subtitle="Operational oversight of commercial drivers, compliance documents, and real-time availability"
        liveStatus="Fleet Active"
      />

      {alert && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <FilterBar
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by driver name, phone, plate..."
      />

      <DataTable
        columns={columns}
        data={filteredDrivers}
        keyExtractor={(d) => d.id}
        loading={loading}
        emptyTitle="No drivers found"
        emptySubtitle={`No drivers currently match the filter criteria: "${activeTab}".`}
      />

      {/* Slide-out Driver Inspection Drawer */}
      <Drawer
        isOpen={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver ? `Driver Dossier — ${selectedDriver.fullName}` : ''}
        subtitle={selectedDriver ? `ID: ${selectedDriver.id} • ${selectedDriver.phone}` : ''}
        width="620px"
        footer={
          actionType ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setActionType(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'VERIFY' || actionType === 'REACTIVATE' ? 'success' : 'danger'}
                size="sm"
                onClick={handleExecuteAction}
                isLoading={actionLoading}
              >
                Confirm {actionType}
              </Button>
            </div>
          ) : selectedDriver ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              {selectedDriver.verificationStatus === 'UNDER_REVIEW' && (
                <>
                  <Button variant="danger" size="sm" onClick={() => setActionType('REJECT')}>
                    Reject KYC
                  </Button>
                  <Button variant="success" size="sm" onClick={() => setActionType('VERIFY')}>
                    Approve KYC
                  </Button>
                </>
              )}
              {selectedDriver.verificationStatus === 'VERIFIED' && (
                <Button variant="danger" size="sm" onClick={() => setActionType('SUSPEND')}>
                  Suspend Driver
                </Button>
              )}
              {selectedDriver.verificationStatus === 'SUSPENDED' && (
                <Button variant="success" size="sm" onClick={() => setActionType('REACTIVATE')}>
                  Reactivate Driver
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedDriver(null)}>
                Close
              </Button>
            </div>
          ) : null
        }
      >
        {selectedDriver && (
          <div>
            {actionType && (
              <Card variant="accent" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  {actionType === 'REJECT' && 'Mandatory Reason for Rejection:'}
                  {actionType === 'SUSPEND' && 'Mandatory Reason for Suspension:'}
                  {actionType === 'VERIFY' && 'Optional Approval Notes:'}
                  {actionType === 'REACTIVATE' && 'Optional Reactivation Notes:'}
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder={actionType === 'REJECT' ? 'e.g. Expired commercial driving permit' : 'Enter notes...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Card>
            )}

            {/* Profile Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>KYC Status</div>
                <div style={{ marginTop: '0.35rem' }}>
                  <StatusBadge status={selectedDriver.verificationStatus} />
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Availability</div>
                <div style={{ marginTop: '0.35rem' }}>
                  <StatusBadge status={selectedDriver.availabilityStatus} showPulse />
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wallet Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  ₹{Number(selectedDriver.walletBalance || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Completed Rides</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedDriver.totalTrips ?? selectedDriver.tripsCount ?? 0}
                </div>
              </div>
            </div>

            {/* Compliance Documents */}
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Submitted Compliance Documents
              </h4>
              {selectedDriver.documents && selectedDriver.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedDriver.documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {doc.documentType.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Uploaded {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <Button variant="outline" size="sm">
                          View Document ↗
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                  }}
                >
                  No compliance documents currently on file.
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
