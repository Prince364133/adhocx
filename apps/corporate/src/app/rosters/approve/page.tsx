'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  History,
  Check,
  Eye,
  MoreVertical,
  Plus,
  Send,
  Calendar,
} from 'lucide-react';
import { rosterApi } from '../../../lib/api/corporate';
import type { Roster } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function RosterApprovalPublishingPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [rosters, setRosters] = useState<Roster[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'history'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRosters = () => {
    setLoading(true);
    rosterApi
      .list(activeTenantId, {})
      .then((data) => {
        setRosters(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Failed to fetch rosters:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRosters();
  }, [activeTenantId]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePublish = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => rosterApi.publish(id)));
      alert(`Published ${selectedIds.length} approved roster version(s) to Route Solver!`);
      setSelectedIds([]);
      loadRosters();
    } catch (err) {
      console.warn('Publishing error:', err);
      alert('Failed to publish selected rosters.');
    }
  };

  const pendingRosters = rosters.filter((r) => r.status !== 'PUBLISHED');
  const publishedRosters = rosters.filter((r) => r.status === 'PUBLISHED');
  const displayRosters = activeTab === 'published' ? publishedRosters : pendingRosters;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Publish Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Roster Approval & Publishing
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
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
            backgroundColor: selectedIds.length > 0 ? '#5728B2' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedIds.length > 0 ? '0 2px 4px rgba(87, 40, 178,0.25)' : 'none',
          }}
        >
          <Send size={15} />
          <span>Publish Selected ({selectedIds.length})</span>
        </button>
      </div>

      {/* Tabs Header */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'pending' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'pending' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Pending Approval ({pendingRosters.length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'published' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'published' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Published Rosters ({publishedRosters.length})
          </button>
        </div>

        {/* Approval Table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading roster batches...
          </div>
        ) : displayRosters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No {activeTab === 'published' ? 'published' : 'pending'} rosters found. Upload a roster spreadsheet to create a new batch.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={displayRosters.length > 0 && selectedIds.length === displayRosters.length}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? displayRosters.map((v) => v.id) : [])
                      }
                    />
                  </th>
                  <th>Roster Identifier</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRosters.map((v) => {
                  const isSelected = selectedIds.includes(v.id);
                  const isPublished = v.status === 'PUBLISHED';
                  return (
                    <tr key={v.id} style={{ backgroundColor: isSelected ? '#F8FAFC' : 'transparent' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(v.id)}
                        />
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {v.id.slice(0, 8)} (Office {v.officeId?.slice(0, 6) || 'Main'})
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {v.rosterDate ? new Date(v.rosterDate).toLocaleDateString() : 'Current Period'}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: isPublished ? '#DCFCE7' : '#FEF3C7',
                            color: isPublished ? '#16A34A' : '#D97706',
                            border: `1px solid ${isPublished ? '#86EFAC' : '#FCD34D'}`,
                          }}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => alert(`Reviewing details for roster ${v.id.slice(0, 8)}`)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: '1px solid var(--border-strong)',
                            backgroundColor: 'var(--bg-surface)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
