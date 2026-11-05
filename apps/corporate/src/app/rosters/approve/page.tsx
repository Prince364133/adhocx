'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  History,
  Check,
  Eye,
  MoreVertical,
  Plus,
  Send,
} from 'lucide-react';

interface RosterVersionItem {
  id: string;
  version: string;
  period: string;
  changes: string;
  uploadedBy: string;
  status: 'Pending Approval' | 'Published';
}

const MOCK_ROSTER_VERSIONS: RosterVersionItem[] = [
  { id: '1', version: 'Roster_V2.1', period: '08 Dec - 14 Dec 2026', changes: '56 updates (shift, add, remove)', uploadedBy: 'Priya Rao', status: 'Pending Approval' },
  { id: '2', version: 'Roster_V2.0', period: '01 Dec - 07 Dec 2026', changes: '12 updates (shift change)', uploadedBy: 'Rohit Singh', status: 'Pending Approval' },
  { id: '3', version: 'Roster_V1.9', period: '24 Nov - 30 Nov 2026', changes: '4 updates (leave, reassignment)', uploadedBy: 'Neha Verma', status: 'Pending Approval' },
];

export default function RosterApprovalPublishingPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'history'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>(['1']);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePublish = () => {
    alert(`Publishing ${selectedIds.length} approved roster version(s) to Autonomous Route Solver!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Publish Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Roster Approval & Publishing
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Review roster changes, approve and publish to make them live for transport operations
          </p>
        </div>

        <button
          onClick={handlePublish}
          disabled={selectedIds.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: selectedIds.length > 0 ? '#1167EE' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: '0 2px 4px rgba(17,103,238,0.25)',
          }}
        >
          <Send size={15} />
          <span>+ Publish Selected ({selectedIds.length})</span>
        </button>
      </div>

      {/* Tabs Header */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '18px' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'pending' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'pending' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Pending Approval (3)
          </button>
          <button
            onClick={() => setActiveTab('published')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'published' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'published' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Published Rosters
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'history' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'history' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Version History
          </button>
        </div>

        {/* Approval Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === MOCK_ROSTER_VERSIONS.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? MOCK_ROSTER_VERSIONS.map((v) => v.id) : [])
                    }
                  />
                </th>
                <th>Roster Version</th>
                <th>Period</th>
                <th>Changes</th>
                <th>Uploaded By</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ROSTER_VERSIONS.map((v) => {
                const isSelected = selectedIds.includes(v.id);
                return (
                  <tr key={v.id} style={{ backgroundColor: isSelected ? '#F8FAFC' : 'transparent' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(v.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 800, color: '#0F172A' }}>{v.version}</td>
                    <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{v.period}</td>
                    <td style={{ fontSize: '12px', color: '#0F172A' }}>{v.changes}</td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>{v.uploadedBy}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#FEF3C7',
                          color: '#D97706',
                          border: '1px solid #FCD34D',
                        }}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => alert(`Reviewing diff for ${v.version}`)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          Review Diff
                        </button>
                        <button
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 4,
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <MoreVertical size={13} color="#64748B" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

