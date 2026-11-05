'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { mockOrganizationSettings, mockAuditLogs } from '../../../lib/mock/corporateMockData';

export default function OrganizationSettingsAuditPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'rbac' | 'audit'>('profile');
  const [auditSearch, setAuditSearch] = useState('');

  const filteredLogs = mockAuditLogs.filter((log) => {
    return (
      log.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase())
    );
  });

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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Download Audit CSV
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
            backgroundColor: activeTab === 'profile' ? 'var(--corporate-blue)' : '#FFFFFF',
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
            backgroundColor: activeTab === 'rbac' ? 'var(--corporate-blue)' : '#FFFFFF',
            color: activeTab === 'rbac' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          Access Roles & Permissions ({mockOrganizationSettings.roles.length})
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
            backgroundColor: activeTab === 'audit' ? 'var(--corporate-blue)' : '#FFFFFF',
            color: activeTab === 'audit' ? '#FFFFFF' : 'var(--text-secondary)',
          }}
        >
          Immutable Audit Logs ({mockAuditLogs.length})
        </button>
      </div>

      {/* TAB 1: Company Profile & Policies */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Profile Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Corporate Organization Profile
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Company Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mockOrganizationSettings.companyName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Corporate Client ID:</span>
                <span style={{ fontWeight: 600, color: 'var(--corporate-blue)' }}>
                  {mockOrganizationSettings.corporateCode}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Emergency Hotline:</span>
                <span style={{ fontWeight: 600, color: '#DC2626' }}>
                  {mockOrganizationSettings.emergencyDeskPhone}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Contact Email:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mockOrganizationSettings.contactEmail}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Headquarters Address:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {mockOrganizationSettings.headquartersAddress}
                </span>
              </div>
            </div>
          </div>

          {/* Transport Policies Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Enforced Commute Policies
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Female Commuter Night Escort:</span>
                <span style={{ fontWeight: 600, color: '#15803D' }}>
                  Enforced ({mockOrganizationSettings.femaleEscortNightHours})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Boarding OTP Verification:</span>
                <span style={{ fontWeight: 600, color: '#15803D' }}>
                  Mandatory at Driver Door
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Auto-Approval Cap / Month:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mockOrganizationSettings.maxAutoApprovalPerMonth} Ad-hoc Requests
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Campus Geofence Radius:</span>
                <span style={{ fontWeight: 600, color: 'var(--corporate-blue)' }}>
                  {mockOrganizationSettings.defaultGeofenceRadiusMeters} Meters
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Operational Timezone:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {mockOrganizationSettings.timezone}
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
            backgroundColor: '#FFFFFF',
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
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Role Name</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Users</th>
                  <th style={{ padding: '12px 16px' }}>Permissions Scope</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockOrganizationSettings.roles.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {r.roleName}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--corporate-blue)' }}>
                      {r.usersCount} Active Users
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {r.permissions}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-color)',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--corporate-blue)',
                          cursor: 'pointer',
                        }}
                      >
                        Edit Policy
                      </button>
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
              backgroundColor: '#FFFFFF',
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
              }}
            />
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
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
                            backgroundColor: '#F1F5F9',
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
                                : 'var(--corporate-blue)',
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

