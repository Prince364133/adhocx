'use client';

import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const tickets = [
    {
      id: 'sup-901',
      reporterName: 'Vikram Malhotra',
      reporterRole: 'VENDOR',
      reporterPhone: '+919988776655',
      relatedTripId: 'trip-301',
      issueType: 'ROUTE_DEVIATION',
      description: 'Driver took alternative toll route due to traffic on NH-48. Clarification requested on toll adjustment.',
      status: 'UNDER_REVIEW',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'sup-902',
      reporterName: 'Suresh Verma',
      reporterRole: 'DRIVER',
      reporterPhone: '+919899001122',
      issueType: 'KYC_RESUBMISSION',
      description: 'Driver renewed commercial driving license and uploaded new certificate for re-verification.',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  const filtered = tickets.filter((t) => {
    if (activeTab !== 'ALL' && t.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        t.id.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.issueType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Support & Operational Interventions</h1>
        <p className="page-subtitle">
          Resolve driver and vendor operational issues, dispute inquiries, and manual ride interventions.
        </p>
      </div>

      <div className="tabs">
        {['ALL', 'PENDING', 'UNDER_REVIEW', 'RESOLVED'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search tickets by user, issue, description, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filtered.length}</strong> support cases
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Reporter & Role</th>
              <th>Issue Type</th>
              <th>Description</th>
              <th>Related Entity</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="🎧"
                    title="No support tickets"
                    description="No pending operational support cases."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-600)' }}>
                      #{t.id}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.reporterName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {t.reporterRole} • {t.reporterPhone}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{t.issueType.replace('_', ' ')}</span>
                  </td>
                  <td style={{ maxWidth: '300px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {t.description}
                  </td>
                  <td>
                    {t.relatedTripId ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>Trip #{t.relatedTripId}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <Badge status={t.status} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
