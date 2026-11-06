'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';
import { tripsApi, tenantApi } from '../../../lib/api/corporate';
import { BookingRequestItem, Office } from '../../../lib/api/types';

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function ApprovalsPage({ searchParams }: PageProps) {
  const tenantId = searchParams?.tenantId;
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [items, setItems] = useState<BookingRequestItem[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'login' | 'logout'>('all');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [loading, setLoading] = useState(true);

  const loadPending = () => {
    setLoading(true);
    Promise.all([
      tripsApi.requests({ tenantId: activeTenantId, status: 'UNSERVED' }),
      tenantApi.offices(activeTenantId).catch(() => []),
    ])
      .then(([res, offList]) => {
        setItems(res?.items || []);
        setOffices(offList);
      })
      .catch((err) => {
        console.warn('Failed to load pending approvals:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPending();
  }, [activeTenantId]);

  const handleApprove = async (id: string, reqId: string) => {
    try {
      await tripsApi.reviewRequest(id, { decision: 'APPROVE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
      alert(`Approved request ${reqId}`);
    } catch (err) {
      console.warn('Approve error:', err);
    }
  };

  const handleReject = async (id: string, reqId: string) => {
    try {
      await tripsApi.reviewRequest(id, { decision: 'REJECT' });
      setItems((prev) => prev.filter((item) => item.id !== id));
      alert(`Rejected request ${reqId}`);
    } catch (err) {
      console.warn('Reject error:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'login' && item.direction !== 'LOGIN') return false;
    if (activeTab === 'logout' && item.direction !== 'LOGOUT') return false;
    const officeName = item.roster?.office?.name;
    if (selectedOffice !== 'All Offices' && officeName !== selectedOffice) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Approval Inbox
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Review and approve pending employee commute requests and ad-hoc allocations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
            style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', backgroundColor: 'var(--bg-surface)' }}
          >
            <option value="All Offices">All Offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Inbox Card */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'all' ? '#5728B2' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'all' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            All Pending ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('login')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'login' ? '#5728B2' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'login' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Login Commutes ({items.filter((i) => i.direction === 'LOGIN').length})
          </button>
          <button
            onClick={() => setActiveTab('logout')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'logout' ? '#5728B2' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'logout' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Logout Commutes ({items.filter((i) => i.direction === 'LOGOUT').length})
          </button>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading pending approvals...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Inbox clean! No pending requests awaiting review or approval.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Request ID</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Direction</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Office Campus</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Shift / Date</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {req.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {req.employee?.fullName || 'Enterprise Employee'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {req.employee?.employeeCode || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: req.direction === 'LOGIN' ? '#EFF6FF' : '#FEF3C7',
                          color: req.direction === 'LOGIN' ? '#5728B2' : '#D97706',
                          border: '1px solid currentColor',
                        }}
                      >
                        {req.direction === 'LOGIN' ? 'Login Pickup' : 'Logout Drop'}
                      </span>
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {req.roster?.office?.name || 'Main Campus'}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {req.scheduledDate} {req.shiftTime}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(req.id, req.id.slice(0, 8))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: 4,
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleReject(req.id, req.id.slice(0, 8))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: 4,
                            backgroundColor: 'var(--bg-surface)',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
