'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Star, X, Mail } from 'lucide-react';
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
      const data = await adminApi.getDrivers(status).catch(() => [] as DriverListItem[]);
      const list = Array.isArray(data) ? data : ((data as any)?.items || []);
      setDrivers(list);
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
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(q))
    );
  }, [drivers, search]);

  async function handleOpenDetails(driver: DriverListItem) {
    try {
      const detail: any = await adminApi.getDriverDetails(driver.id).catch(() => ({
        ...driver,
        documents: [],
      } as unknown as DriverDetail));

      let docs: any[] = [];
      if (Array.isArray(detail.kycDocuments) && detail.kycDocuments.length > 0) {
        docs = detail.kycDocuments.map((doc: any, idx: number) => ({
          id: `${detail.id}_doc_${idx}`,
          documentType: doc.type || 'DOCUMENT',
          title: doc.title || doc.type?.replace(/_/g, ' ') || `Document ${idx + 1}`,
          fileUrl: doc.url || doc.fileUrl,
          verified: detail.verificationStatus === 'VERIFIED',
          createdAt: detail.updatedAt || detail.createdAt,
        }));
      } else if (Array.isArray(detail.documents) && detail.documents.length > 0) {
        docs = detail.documents;
      } else {
        docs = [
          ...(detail.dlFrontUrl ? [{ id: `${detail.id}_dl_front`, documentType: 'DRIVING_LICENSE_FRONT', title: 'Driving License (Front)', fileUrl: detail.dlFrontUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.dlBackUrl ? [{ id: `${detail.id}_dl_back`, documentType: 'DRIVING_LICENSE_BACK', title: 'Driving License (Back)', fileUrl: detail.dlBackUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.rcFrontUrl ? [{ id: `${detail.id}_rc_front`, documentType: 'RC_FRONT', title: 'Vehicle RC (Front)', fileUrl: detail.rcFrontUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : (detail.rcDocUrl ? [{ id: `${detail.id}_rc`, documentType: 'RC_BOOK', title: 'Vehicle RC Book', fileUrl: detail.rcDocUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : [])),
          ...(detail.rcBackUrl ? [{ id: `${detail.id}_rc_back`, documentType: 'RC_BACK', title: 'Vehicle RC (Back)', fileUrl: detail.rcBackUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.insuranceDocUrl ? [{ id: `${detail.id}_ins`, documentType: 'INSURANCE', title: 'Vehicle Insurance', fileUrl: detail.insuranceDocUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.vehiclePhotoUrl ? [{ id: `${detail.id}_veh`, documentType: 'VEHICLE_PHOTO', title: 'Vehicle Photo', fileUrl: detail.vehiclePhotoUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.aadharFrontUrl ? [{ id: `${detail.id}_aadhar_front`, documentType: 'AADHAR_FRONT', title: 'Aadhar Card (Front)', fileUrl: detail.aadharFrontUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.aadharBackUrl ? [{ id: `${detail.id}_aadhar_back`, documentType: 'AADHAR_BACK', title: 'Aadhar Card (Back)', fileUrl: detail.aadharBackUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
          ...(detail.panDocUrl ? [{ id: `${detail.id}_pan`, documentType: 'PAN_CARD', title: 'PAN Card', fileUrl: detail.panDocUrl, verified: detail.verificationStatus === 'VERIFIED', createdAt: detail.createdAt }] : []),
        ];
      }

      setSelectedDriver({
        ...detail,
        documents: docs,
      });
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
              flexShrink: 0,
            }}
          >
            {drv.fullName ? drv.fullName.slice(0, 2).toUpperCase() : 'DR'}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{drv.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.15rem' }}>
              <span>{drv.phone}</span>
              {drv.email ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  <Mail size={11} style={{ flexShrink: 0 }} />
                  <span style={{ wordBreak: 'break-all' }}>{drv.email}</span>
                </div>
              ) : null}
            </div>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <span>{(drv.averageRating ?? 5.0).toFixed(1)} ({drv.ratingCount ?? 0}) • {drv.totalTrips ?? 0} trips</span>
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
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <FilterBar
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by driver name, phone, email, plate..."
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
        subtitle={
          selectedDriver
            ? `ID: ${selectedDriver.id} • ${selectedDriver.phone}${selectedDriver.email ? ` • ${selectedDriver.email}` : ''}`
            : ''
        }
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

            {/* Contact Details Card */}
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  {selectedDriver.phone || '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                  {selectedDriver.email || '—'}
                </div>
              </div>
            </div>

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
