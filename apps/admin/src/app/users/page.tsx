'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { UserListItem, VendorListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

const STATUS_TABS = ['ALL', 'PENDING', 'VERIFIED', 'REJECTED'];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('ALL');
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
          contactPerson: 'Vikram Malhotra',
          phone: '+919988776655',
          email: 'vikram@acmecorp.in',
          verificationStatus: 'PENDING',
          requirementsCount: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'usr-2',
          companyName: 'Metro Fleet Cabs Pvt Ltd',
          contactPerson: 'Ananya Sharma',
          phone: '+919123456789',
          email: 'ananya@metrofleet.com',
          verificationStatus: 'VERIFIED',
          requirementsCount: 14,
          createdAt: new Date().toISOString(),
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
        setAlert({ type: 'success', message: `User / Enterprise account ${selectedUser.companyName} verified successfully.` });
      } else if (actionType === 'REJECT') {
        if (!reason.trim()) {
          setAlert({ type: 'error', message: 'Rejection reason is mandatory.' });
          setActionLoading(false);
          return;
        }
        await adminApi.rejectVendor(selectedUser.id, reason);
        setAlert({ type: 'success', message: `User / Enterprise account ${selectedUser.companyName} rejected: ${reason}` });
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

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Users & Enterprise Accounts</h1>
        <p className="page-subtitle">Verify user and corporate accounts, review business standing, and authorize requirement postings</p>
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

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company / User Name</th>
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
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No users found matching status: {activeTab}
                </td>
              </tr>
            ) : (
              users.map((usr) => (
                <tr key={usr.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{usr.companyName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Registered {new Date(usr.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{usr.contactPerson}</td>
                  <td>
                    <div>{usr.phone}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{usr.email || '—'}</div>
                  </td>
                  <td>
                    <Badge status={usr.verificationStatus} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{usr.requirementsCount}</td>
                  <td style={{ textAlign: 'right' }}>
                    {usr.verificationStatus === 'PENDING' ? (
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            setSelectedUser(usr);
                            setActionType('REJECT');
                            setReason('');
                          }}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            setSelectedUser(usr);
                            setActionType('VERIFY');
                            setReason('');
                          }}
                        >
                          Verify User
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
      {selectedUser && actionType && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => {
            setSelectedUser(null);
            setActionType(null);
          }}
          title={actionType === 'VERIFY' ? `Verify User — ${selectedUser.companyName}` : `Reject User — ${selectedUser.companyName}`}
          footer={
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedUser(null);
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
                  : 'Approved corporate logistics user'
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
