'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { UserListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { TableLoadingSkeleton } from '../../components/LoadingSkeleton';

const VENDOR_TABS = [
  { key: 'ALL', label: 'All Users' },
  { key: 'PENDING', label: 'Pending Verification' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'VERIFIED', label: 'Verified Corporate' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [actionType, setActionType] = useState<'VERIFY' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadUsers(activeTab);
  }, [activeTab]);

  async function loadUsers(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getVendors(status).catch(() => [
        {
          id: 'usr-1',
          companyName: 'Acme Corporate Logistics Ltd',
          organizationName: 'Acme Corporate Logistics Ltd',
          contactPerson: 'Vikram Malhotra',
          fullName: 'Vikram Malhotra',
          phone: '+919988776655',
          email: 'vikram@acmecorp.in',
          gstNumber: '07AAAAA0000A1Z5',
          address: 'Building 10, DLF Cyber City, Gurugram, Haryana',
          verificationStatus: 'PENDING',
          requirementsCount: 2,
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: 'usr-2',
          companyName: 'Metro Fleet Cabs Pvt Ltd',
          organizationName: 'Metro Fleet Cabs Pvt Ltd',
          contactPerson: 'Ananya Sharma',
          fullName: 'Ananya Sharma',
          phone: '+919123456789',
          email: 'ananya@metrofleet.com',
          gstNumber: '09BBBBB1111B2Z8',
          address: 'Sector 62, Electronic City, Noida, UP',
          verificationStatus: 'VERIFIED',
          requirementsCount: 18,
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        },
        {
          id: 'usr-3',
          companyName: 'Apex Transport Partners',
          organizationName: 'Apex Transport Partners',
          contactPerson: 'Rajiv Mehra',
          fullName: 'Rajiv Mehra',
          phone: '+919811002233',
          email: 'rajiv@apextransport.com',
          gstNumber: '06CCCCC2222C3Z1',
          address: 'Udyog Vihar Phase 4, Gurugram, Haryana',
          verificationStatus: 'REJECTED',
          rejectionReason: 'Invalid GSTIN certificate provided.',
          requirementsCount: 0,
          createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        },
      ] as UserListItem[]);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleExecuteAction() {
    if (!selectedUser || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === 'VERIFY') {
        await adminApi.verifyVendor(selectedUser.id, reason);
        setAlert({ type: 'success', message: `User account ${selectedUser.companyName} verified successfully.` });
      } else if (actionType === 'REJECT') {
        if (!reason.trim()) {
          setAlert({ type: 'error', message: 'Rejection reason is mandatory.' });
          setActionLoading(false);
          return;
        }
        await adminApi.rejectVendor(selectedUser.id, reason);
        setAlert({ type: 'success', message: `User account ${selectedUser.companyName} rejected: ${reason}` });
      }

      setSelectedUser(null);
      setActionType(null);
      loadUsers(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    let result = users;
    if (activeTab !== 'ALL') {
      result = result.filter((v) => v.verificationStatus === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          (v.companyName && v.companyName.toLowerCase().includes(q)) ||
          (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
          (v.phone && v.phone.toLowerCase().includes(q)) ||
          (v.gstNumber && v.gstNumber.toLowerCase().includes(q))
      );
    }
    return result;
  }, [users, activeTab, searchQuery]);

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Users & Corporate Accounts</h1>
        <p className="page-subtitle">
          Verify corporate logistics clients, inspect GST compliance, and manage user onboarding status.
        </p>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`alert-banner ${alert.type === 'success' ? 'success' : 'danger'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{alert.type === 'success' ? '✓' : '⚠️'}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs">
        {VENDOR_TABS.map((tab) => (
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

      {/* Search and Filters Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search users by company, contact person, phone, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredUsers.length}</strong> records
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization & ID</th>
              <th>Contact Person</th>
              <th>Phone & Email</th>
              <th>GSTIN Registration</th>
              <th>Requirements</th>
              <th>Verification</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingSkeleton rows={4} columns={7} />
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="🏢"
                    title="No users found"
                    description={
                      searchQuery
                        ? 'No users match your search criteria.'
                        : 'No users in this verification status.'
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
              filteredUsers.map((usr) => (
                <tr key={usr.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{usr.companyName}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {usr.id}
                    </div>
                  </td>
                  <td>{usr.contactPerson}</td>
                  <td>
                    <div>{usr.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{usr.email || '—'}</div>
                  </td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {usr.gstNumber || 'Not Provided'}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{usr.requirementsCount || 0}</td>
                  <td>
                    <Badge status={usr.verificationStatus} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(usr);
                        setActionType(null);
                        setReason('');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Review User →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details & Approval Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`User Account — ${selectedUser.companyName}`}
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedUser(null)}
                disabled={actionLoading}
              >
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(selectedUser.verificationStatus === 'PENDING' || selectedUser.verificationStatus === 'UNDER_REVIEW') && (
                  <>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setActionType('REJECT')}
                      disabled={actionLoading}
                    >
                      Reject User
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        setActionType('VERIFY');
                        handleExecuteAction();
                      }}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Verifying...' : 'Approve & Verify'}
                    </button>
                  </>
                )}
              </div>
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
                  <Badge status={selectedUser.verificationStatus} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Person</div>
                <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{selectedUser.contactPerson}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Demand Volume</div>
                <div style={{ fontWeight: 700, marginTop: '0.25rem', fontSize: '1rem' }}>
                  {selectedUser.requirementsCount || 0} Requirements
                </div>
              </div>
            </div>

            {selectedUser.address && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED OFFICE ADDRESS</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                  {selectedUser.address}
                </div>
              </div>
            )}

            {actionType === 'REJECT' && (
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--color-error-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-error-bg)',
                }}
              >
                <label className="form-label" style={{ color: 'var(--color-error)' }}>
                  Mandatory Reason for Rejection:
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Enter reason (e.g. GSTIN mismatch, business verification failed)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%', marginTop: '0.375rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActionType(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleExecuteAction}
                    disabled={actionLoading || !reason.trim()}
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
