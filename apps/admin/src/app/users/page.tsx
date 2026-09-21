'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Building2, X } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { UserListItem } from '../../lib/api/types';
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
  { id: 'ALL', label: 'All Accounts' },
  { id: 'PENDING', label: 'Pending Approval' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
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
      const data = await adminApi.getVendors(status).catch(() => [] as UserListItem[]);
      const list = Array.isArray(data) ? data : ((data as any)?.items || []);
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.companyName.toLowerCase().includes(q) ||
        u.contactPerson.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, search]);

  async function handleExecuteAction() {
    if (!selectedUser || !actionType) return;
    if (actionType === 'REJECT' && !reason.trim()) {
      setAlert({ type: 'error', message: 'Rejection reason is mandatory.' });
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === 'VERIFY') {
        await adminApi.verifyVendor(selectedUser.id, reason);
        setAlert({ type: 'success', message: `Account "${selectedUser.companyName}" verified successfully.` });
      } else if (actionType === 'REJECT') {
        await adminApi.rejectVendor(selectedUser.id, reason);
        setAlert({ type: 'success', message: `Account "${selectedUser.companyName}" rejected.` });
      }

      setSelectedUser(null);
      setActionType(null);
      loadUsers(activeTab);
    } catch (err: unknown) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  }

  const columns: Column<UserListItem>[] = [
    {
      key: 'companyName',
      label: 'Organization & Contact',
      sortable: true,
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary-subtle)',
              border: '1px solid rgba(91, 66, 243, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.companyName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {u.contactPerson} • {u.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (u) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {u.email || '—'}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      label: 'Verification',
      sortable: true,
      render: (u) => <StatusBadge status={u.verificationStatus} size="sm" />,
    },
    {
      key: 'requirementsCount',
      label: 'Demands Posted',
      sortable: true,
      render: (u) => (
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {u.requirementsCount ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Registered',
      sortable: true,
      render: (u) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (u) => (
        <Button
          variant={u.verificationStatus === 'PENDING' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setSelectedUser(u);
            setActionType(null);
            setReason('');
          }}
        >
          {u.verificationStatus === 'PENDING' ? 'Review Application →' : 'Inspect →'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Enterprise Accounts"
        subtitle="Authenticate and manage corporate clients, review business standing, and authorize requirement postings"
        liveStatus="Accounts Active"
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
        searchPlaceholder="Search by company name, contact, phone, or email..."
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyTitle="No accounts found"
        emptySubtitle={`No client accounts match the selected filter "${activeTab}".`}
      />

      {/* Slide-out Account Inspection Drawer */}
      <Drawer
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? selectedUser.companyName : ''}
        subtitle={selectedUser ? `Contact: ${selectedUser.contactPerson} • ${selectedUser.phone}` : ''}
        width="580px"
        footer={
          actionType ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setActionType(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'VERIFY' ? 'success' : 'danger'}
                size="sm"
                onClick={handleExecuteAction}
                isLoading={actionLoading}
              >
                Confirm {actionType}
              </Button>
            </div>
          ) : selectedUser ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              {selectedUser.verificationStatus === 'PENDING' && (
                <>
                  <Button variant="danger" size="sm" onClick={() => setActionType('REJECT')}>
                    Reject Account
                  </Button>
                  <Button variant="success" size="sm" onClick={() => setActionType('VERIFY')}>
                    Approve Account
                  </Button>
                </>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          ) : null
        }
      >
        {selectedUser && (
          <div>
            {actionType && (
              <Card variant="accent" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  {actionType === 'REJECT' ? 'Mandatory Reason for Rejection:' : 'Optional Approval Notes:'}
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder={actionType === 'REJECT' ? 'e.g. Incomplete corporate registration or invalid GST' : 'Enter notes...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%' }}
                />
              </Card>
            )}

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
                  <StatusBadge status={selectedUser.verificationStatus} />
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demands Created</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedUser.requirementsCount ?? 0}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Email</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedUser.email || 'None specified'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Since</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
