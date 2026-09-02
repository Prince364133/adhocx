'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { VendorListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

const STATUS_TABS = ['ALL', 'PENDING', 'VERIFIED', 'REJECTED'];

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<VendorListItem | null>(null);
  const [actionType, setActionType] = useState<'VERIFY' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadVendors(activeTab);
  }, [activeTab]);

  async function loadVendors(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getVendors(status).catch(() => [
        {
          id: 'vnd-1',
          companyName: 'Acme Corporate Logistics Ltd',
          contactPerson: 'Vikram Malhotra',
          phone: '+919988776655',
          email: 'vikram@acmecorp.in',
          verificationStatus: 'PENDING',
          requirementsCount: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'vnd-2',
          companyName: 'Metro Fleet Cabs Pvt Ltd',
          contactPerson: 'Ananya Sharma',
          phone: '+919123456789',
          email: 'ananya@metrofleet.com',
          verificationStatus: 'VERIFIED',
          requirementsCount: 14,
          createdAt: new Date().toISOString(),
        },
      ]);
      setVendors(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecuteAction() {
    if (!selectedVendor || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === 'VERIFY') {
        await adminApi.verifyVendor(selectedVendor.id, reason);
        setAlert({ type: 'success', message: `Vendor ${selectedVendor.companyName} verified successfully.` });
      } else if (actionType === 'REJECT') {
        if (!reason.trim()) {
          setAlert({ type: 'error', message: 'Rejection reason is mandatory.' });
          setActionLoading(false);
          return;
        }
        await adminApi.rejectVendor(selectedVendor.id, reason);
        setAlert({ type: 'success', message: `Vendor ${selectedVendor.companyName} rejected: ${reason}` });
      }

      setSelectedVendor(null);
      setActionType(null);
      loadVendors(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Enterprise Vendors & Corporate Accounts</h1>
        <p className="page-subtitle">Verify corporate transportation vendors, review business standing, and authorize requirement postings</p>
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
            {tab}
          </button>
        ))}
      </div>

      {/* Vendors Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Phone / Email</th>
              <th>Verification</th>
              <th>Requirements</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading vendors...
                </td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No vendors found matching status: {activeTab}
                </td>
              </tr>
            ) : (
              vendors.map((vnd) => (
                <tr key={vnd.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{vnd.companyName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Registered {new Date(vnd.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{vnd.contactPerson}</td>
                  <td>
                    <div>{vnd.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{vnd.email || '—'}</div>
                  </td>
                  <td>
                    <Badge status={vnd.verificationStatus} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{vnd.requirementsCount}</td>
                  <td style={{ textAlign: 'right' }}>
                    {vnd.verificationStatus === 'PENDING' ? (
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setSelectedVendor(vnd);
                            setActionType('REJECT');
                            setReason('');
                          }}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            setSelectedVendor(vnd);
                            setActionType('VERIFY');
                            setReason('');
                          }}
                        >
                          Verify Vendor
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Verified</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {selectedVendor && actionType && (
        <Modal
          isOpen={!!selectedVendor}
          onClose={() => {
            setSelectedVendor(null);
            setActionType(null);
          }}
          title={actionType === 'VERIFY' ? `Verify Vendor — ${selectedVendor.companyName}` : `Reject Vendor — ${selectedVendor.companyName}`}
          footer={
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedVendor(null);
                  setActionType(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`btn btn-sm ${actionType === 'VERIFY' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleExecuteAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
              </button>
            </div>
          }
        >
          <div className="form-group">
            <label className="form-label">
              {actionType === 'REJECT' ? 'Mandatory Rejection Reason:' : 'Optional Notes / Organization Tag:'}
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={
                actionType === 'REJECT'
                  ? 'e.g. Incomplete GST credentials or unregistered enterprise'
                  : 'Approved corporate logistics vendor'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
