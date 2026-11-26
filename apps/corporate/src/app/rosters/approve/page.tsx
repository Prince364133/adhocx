'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  Send,
} from 'lucide-react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { rosterApi } from '../../../lib/api/corporate';
import type { Roster } from '../../../lib/api/types';
import LazyScrollSentinel from '../../../components/common/LazyScrollSentinel';
import { useLazySlice } from '../../../lib/hooks/useInfiniteScroll';
import { useSession } from '../../../lib/auth/SessionContext';

export default function RosterApprovalPublishingPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId;

  const [rosters, setRosters] = useState<Roster[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'history'>('pending');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedRoster, setReviewedRoster] = useState<Awaited<ReturnType<typeof rosterApi.get>> | null>(null);
  const [reviewingRosterId, setReviewingRosterId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRosters = useCallback(() => {
    if (!activeTenantId) {
      setRosters([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    rosterApi
      .list(activeTenantId, {})
      .then((data) => {
        setRosters(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Failed to fetch rosters:', err);
        setRosters([]);
        setLoadError(err instanceof Error ? err.message : 'Failed to load rosters.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  useEffect(() => {
    loadRosters();
  }, [loadRosters]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleReview = async (rosterId: string) => {
    setReviewingRosterId(rosterId);
    setReviewError(null);
    setReviewedRoster(null);
    try {
      setReviewedRoster(await rosterApi.get(rosterId));
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to load roster details.');
    } finally {
      setReviewingRosterId(null);
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
  const { visibleItems: visibleRosters, hasMore, sentinelRef } = useLazySlice(displayRosters, activeTab, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {loadError && <div role="alert" className="surface-card" style={{ padding: 16, color: '#B91C1C' }}>{loadError}</div>}
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
            backgroundColor: selectedIds.length > 0 ? 'var(--brand-action)' : '#94A3B8',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedIds.length > 0 ? '0 2px 4px rgba(var(--brand-primary-rgb), 0.25)' : 'none',
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
              color: activeTab === 'pending' ? 'var(--brand-primary)' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'pending' ? 'var(--brand-primary)' : 'transparent'}`,
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
              color: activeTab === 'published' ? 'var(--brand-primary)' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'published' ? 'var(--brand-primary)' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Published Rosters ({publishedRosters.length})
          </button>
        </div>

        {/* Approval Table */}
        {loading ? (
          <ContentLoadingSkeleton kind="table" count={5} label="Loading roster batches…" />
        ) : displayRosters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No {activeTab === 'published' ? 'published' : 'pending'} rosters found. Upload a roster spreadsheet to create a new batch.
          </div>
        ) : (
          <>
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
                  {visibleRosters.map((v) => {
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
                          {v.id.slice(0, 8)} · {v.office?.name ?? '—'}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {new Date(v.rosterDate).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: isPublished ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                              color: isPublished ? 'var(--color-success)' : '#D97706',
                              border: `1px solid ${isPublished ? 'var(--color-success-border)' : 'var(--color-warning-border)'}`,
                            }}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => void handleReview(v.id)}
                            disabled={reviewingRosterId === v.id}
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
                            {reviewingRosterId === v.id ? 'Opening…' : 'Review'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <LazyScrollSentinel sentinelRef={sentinelRef} hasMore={hasMore} label="Loading more rosters…" />
          </>
        )}
      </div>
      {reviewError && <div role="alert" className="surface-card" style={{ padding: 16, color: '#B91C1C' }}>{reviewError}</div>}
      {reviewingRosterId && !reviewedRoster && (
        <section className="surface-card" style={{ padding: 20 }}>
          <ContentLoadingSkeleton kind="table" count={4} label="Loading roster details…" />
        </section>
      )}
      {reviewedRoster && (
        <section className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
              Roster {reviewedRoster.id.slice(0, 8)} · {reviewedRoster.office?.name ?? '—'}
            </h2>
            <button type="button" onClick={() => setReviewedRoster(null)}>Close</button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {new Date(reviewedRoster.rosterDate).toLocaleDateString()} · {reviewedRoster.shiftTime} · {reviewedRoster.direction} · {reviewedRoster.status}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Employee</th><th>Direction</th><th>Shift</th><th>Status</th></tr>
              </thead>
              <tbody>
                {reviewedRoster.requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.employee?.fullName ?? request.employeeId}</td>
                    <td>{request.direction}</td>
                    <td>{request.shiftTime}</td>
                    <td>{request.status}</td>
                  </tr>
                ))}
                {reviewedRoster.requests.length === 0 && (
                  <tr><td colSpan={4}>No saved requests in this roster.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
