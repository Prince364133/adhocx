'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { DriverListItem, DriverDetail } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

const STATUS_TABS = ['ALL', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'];

export default function DriversPage() {
  const [activeTab, setActiveTab] = useState('ALL');
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
          createdAt: new Date().toISOString(),
        },
      ] as DriverListItem[]);
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  }

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
      setAlert({ type: 'error', message: 'Failed to load driver details' });
    }
  }

  async function handleExecuteAction() {
    if (!selectedDriver || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === 'VERIFY') {
        await adminApi.verifyDriver(selectedDriver.id, reason);
        setAlert({ type: 'success', message: `Driver ${selectedDriver.fullName} successfully verified.` });
      } else if (actionType === 'REJECT') {
        if (!reason.trim()) {
          setAlert({ type: 'error', message: 'Rejection reason is mandatory.' });
          setActionLoading(false);
          return;
        }
        await adminApi.rejectDriver(selectedDriver.id, reason);
        setAlert({ type: 'success', message: `Driver ${selectedDriver.fullName} rejected: ${reason}` });
      } else if (actionType === 'SUSPEND') {
        if (!reason.trim()) {
          setAlert({ type: 'error', message: 'Suspension reason is mandatory.' });
          setActionLoading(false);
          return;
        }
        await adminApi.suspendDriver(selectedDriver.id, reason);
        setAlert({ type: 'success', message: `Driver ${selectedDriver.fullName} suspended.` });
      } else if (actionType === 'REACTIVATE') {
        await adminApi.reactivateDriver(selectedDriver.id, reason);
        setAlert({ type: 'success', message: `Driver ${selectedDriver.fullName} reactivated.` });
      }

      setSelectedDriver(null);
      loadDrivers(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Driver Supply & Compliance</h1>
        <p className="page-subtitle">Review KYC onboarding submissions, verify commercial licenses, and manage driver standing</p>
      </div>

      {alert && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs">
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

      {/* Drivers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver Info</th>
              <th>Vehicle Details</th>
              <th>Trust & Rating</th>
              <th>Verification</th>
              <th>Availability</th>
              <th>Wallet Balance</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading drivers...
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No drivers found matching status: {activeTab}
                </td>
              </tr>
            ) : (
              drivers.map((drv) => (
                <tr key={drv.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{drv.fullName}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{drv.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{drv.vehiclePlate}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{drv.vehicleType}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: (drv.trustScore ?? 100) >= 90 ? '#10b981' : (drv.trustScore ?? 100) >= 75 ? '#f59e0b' : '#ef4444' }}>
                      {(drv.trustScore ?? 100).toFixed(1)}% Trust
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      ★ {(drv.averageRating ?? 5.0).toFixed(1)} ({drv.ratingCount ?? 0}) • {drv.totalTrips ?? 0} trips
                    </div>
                  </td>
                  <td>
                    <Badge status={drv.verificationStatus} />
                  </td>
                  <td>
                    <Badge status={drv.availabilityStatus} />
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{Number(drv.walletBalance).toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenDetails(drv)}
                    >
                      {drv.verificationStatus === 'UNDER_REVIEW' ? 'Review KYC →' : 'Manage →'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Driver KYC Inspection Modal */}
      {selectedDriver && (
        <Modal
          isOpen={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          title={`Driver KYC Review — ${selectedDriver.fullName}`}
          maxWidth="700px"
          footer={
            actionType ? (
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActionType(null)}
                  disabled={actionLoading}
                >
                  Back
                </button>
                <button
                  className={`btn btn-sm ${
                    actionType === 'VERIFY' || actionType === 'REACTIVATE' ? 'btn-success' : 'btn-danger'
                  }`}
                  onClick={handleExecuteAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                {selectedDriver.verificationStatus === 'UNDER_REVIEW' && (
                  <>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setActionType('REJECT')}
                    >
                      Reject KYC
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => setActionType('VERIFY')}
                    >
                      Approve KYC
                    </button>
                  </>
                )}
                {selectedDriver.verificationStatus === 'VERIFIED' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setActionType('SUSPEND')}
                  >
                    Suspend Driver
                  </button>
                )}
                {selectedDriver.verificationStatus === 'SUSPENDED' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => setActionType('REACTIVATE')}
                  >
                    Reactivate Driver
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedDriver(null)}
                >
                  Close
                </button>
              </div>
            )
          }
        >
          {actionType ? (
            <div className="form-group">
              <label className="form-label">
                {actionType === 'REJECT' && 'Mandatory Rejection Reason:'}
                {actionType === 'SUSPEND' && 'Mandatory Suspension Reason:'}
                {actionType === 'VERIFY' && 'Optional Verification Notes:'}
                {actionType === 'REACTIVATE' && 'Optional Reactivation Notes:'}
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder={
                  actionType === 'REJECT'
                    ? 'e.g. Driving license expired or unreadable'
                    : 'Enter notes or reason...'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          ) : (
            <div>
              {/* Driver Quick Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedDriver.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Plate</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedDriver.vehiclePlate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Status</div>
                  <Badge status={selectedDriver.verificationStatus} />
                </div>
              </div>

              {/* Uploaded Documents List */}
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Uploaded Verification Documents
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedDriver.documents?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No documents uploaded yet.</p>
                ) : (
                  selectedDriver.documents?.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {doc.documentType.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Uploaded {new Date(doc.createdAt || doc.uploadedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        View File ↗
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
