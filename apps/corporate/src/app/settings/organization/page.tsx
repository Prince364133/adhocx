'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building,
  Key,
  Users,
  Clock,
  Download,
  CheckCircle2,
  Lock,
  Search,
  FileText,
  Layers,
} from 'lucide-react';
import { tenantApi, usersApi } from '../../../lib/api/corporate';
import { CorporateTenant, CorporateUser } from '../../../lib/api/types';

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function OrganizationSettingsAuditPage({ searchParams }: PageProps) {
  const activeTenantId = searchParams?.tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';
  const [activeTenant, setActiveTenant] = useState<CorporateTenant | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'rbac' | 'audit'>('profile');
  const [auditSearch, setAuditSearch] = useState('');
  const [users, setUsers] = useState<CorporateUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgData() {
      if (!activeTenantId) return;
      try {
        setLoading(true);
        const [tenant, userList] = await Promise.all([
          tenantApi.get(activeTenantId).catch(() => null),
          usersApi.list(activeTenantId).catch(() => []),
        ]);
        setActiveTenant(tenant);
        setUsers(Array.isArray(userList) ? userList : []);
      } catch (err) {
        console.error('Failed to load corporate users:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrgData();
  }, [activeTenantId]);

  const auditLogs = [
    {
      id: 'AUD-8801',
      timestamp: new Date().toLocaleString(),
      actor: 'Corporate Administrator',
      role: 'CORPORATE_ADMIN',
      action: 'ORGANIZATION_SETTINGS_VIEW',
      ipAddress: '10.14.0.12',
      details: 'Accessed enterprise security policies and RBAC matrix',
    },
    {
      id: 'AUD-8798',
      timestamp: new Date(Date.now() - 3600000).toLocaleString(),
      actor: 'System Daemon',
      role: 'SYSTEM',
      action: 'ROSTER_VALIDATION_COMPLETED',
      ipAddress: '127.0.0.1',
      details: 'Automatic employee shift schedule sanity check passed',
    },
    {
      id: 'AUD-8792',
      timestamp: new Date(Date.now() - 7200000).toLocaleString(),
      actor: 'Finance Controller',
      role: 'FINANCE',
      action: 'INVOICE_BATCH_SYNC',
      ipAddress: '10.14.0.45',
      details: 'Reconciled trip telemetry lines with monthly billing statement',
    },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    return (
      log.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase())
    );
  });

  const rolesMatrix = [
    {
      roleName: 'Corporate Super Admin',
      code: 'CORPORATE_ADMIN',
      usersCount: users.filter((u) => u.corporateRole === 'CORPORATE_ADMIN').length || 1,
      permissions: 'Full tenant authority: roster publish, billing dispute, safety override, user invites',
    },
    {
      roleName: 'Transport Operations Manager',
      code: 'CORPORATE_MANAGER',
      usersCount: users.filter((u) => u.corporateRole === 'CORPORATE_MANAGER').length || 1,
      permissions: 'Manage live dispatch, exception workflows, fleet rosters and escort approvals',
    },
    {
      roleName: 'Finance & Billing Auditor',
      code: 'FINANCE',
      usersCount: users.filter((u) => u.corporateRole === 'FINANCE').length,
      permissions: 'View B2B invoices, download GST statements, verify distance telemetry and raise disputes',
    },
    {
      roleName: 'Read-Only Corporate Viewer',
      code: 'CORPORATE_VIEWER',
      usersCount: users.filter((u) => u.corporateRole === 'CORPORATE_VIEWER').length,
      permissions: 'Read-only access to executive dashboard, punctuality trends and compliance reports',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Organization Settings, Security Roles & Audit Logs
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Corporate profile metadata, safety policies, role-based access control (RBAC) and immutable compliance audit trail
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Download Audit PDF
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'profile' ? '#5728B2' : 'var(--bg-surface)',
            color: activeTab === 'profile' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          Company Profile & Transport Policies
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rbac')}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'rbac' ? '#5728B2' : 'var(--bg-surface)',
            color: activeTab === 'rbac' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          Access Roles & Permissions ({rolesMatrix.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'audit' ? '#5728B2' : 'var(--bg-surface)',
            color: activeTab === 'audit' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          Immutable Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: Company Profile & Policies */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {/* Profile Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Corporate Organization Profile
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Company Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeTenant?.name || 'HiTEC Technologies Ltd.'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Corporate Client ID:</span>
                <span style={{ fontWeight: 600, color: '#5728B2' }}>
                  {activeTenant?.code || 'HITEC-CORP'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Emergency Hotline:</span>
                <span style={{ fontWeight: 600, color: '#DC2626' }}>
                  +91 (040) 4921-9999
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Admin Contact Email:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  admin@corporate.adhocx.com
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Regional Operations:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                  Hyderabad Metro Enterprise Zone
                </span>
              </div>
            </div>
          </div>

          {/* Transport Policies Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Enforced Commute Policies
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Female Commuter Night Escort:</span>
                <span style={{ fontWeight: 600, color: '#15803D' }}>
                  Enforced (20:00 - 06:00 IST)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Boarding OTP Verification:</span>
                <span style={{ fontWeight: 600, color: '#15803D' }}>
                  Mandatory (4-digit cryptographic OTP)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Cancellation Cutoff Window:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  9 Hours Before Shift Start
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Campus Geofence Radius:</span>
                <span style={{ fontWeight: 600, color: '#5728B2' }}>
                  150 Meters
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Operational Timezone:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Asia/Kolkata (IST, UTC+05:30)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC Security Roles */}
      {activeTab === 'rbac' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Role-Based Access Control (RBAC) Matrix
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Role Name</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Users</th>
                  <th style={{ padding: '12px 16px' }}>Permissions Scope</th>
                </tr>
              </thead>
              <tbody>
                {rolesMatrix.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{r.roleName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.code}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#5728B2' }}>
                      {r.usersCount} Active Users
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {r.permissions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Immutable Audit Logs */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search audit trail by actor, action or event..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Log ID</th>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>Actor & Role</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                    <th style={{ padding: '12px 16px' }}>IP Address</th>
                    <th style={{ padding: '12px 16px' }}>Event Particulars</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: 'var(--bg-surface-muted)',
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: 'monospace',
                          }}
                        >
                          {log.id}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {log.timestamp}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actor}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Role: {log.role}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor:
                              log.action.includes('SOS')
                                ? '#FEE2E2'
                                : log.action.includes('ROSTER')
                                ? '#DCFCE7'
                                : '#EFF6FF',
                            color:
                              log.action.includes('SOS')
                                ? '#DC2626'
                                : log.action.includes('ROSTER')
                                ? '#15803D'
                                : '#5728B2',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'monospace',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
                        {log.ipAddress}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
