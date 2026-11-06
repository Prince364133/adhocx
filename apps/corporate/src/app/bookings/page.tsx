'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Eye,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  Calendar,
} from 'lucide-react';
import { tripsApi, tenantApi } from '../../lib/api/corporate';
import type { BookingRequestItem, Office } from '../../lib/api/types';

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function BookingsOverviewPage({ searchParams }: PageProps) {
  const tenantId = searchParams?.tenantId;
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [queue, setQueue] = useState<BookingRequestItem[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'login' | 'logout'>('all');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRequests = () => {
    setLoading(true);
    Promise.all([
      tripsApi.requests({ tenantId: activeTenantId, search: searchQuery || undefined }),
      tenantApi.offices(activeTenantId).catch(() => []),
    ])
      .then(([res, offList]) => {
        setQueue(res?.items || []);
        setOffices(offList);
      })
      .catch((err) => {
        console.warn('Failed to load booking queue:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRequests();
  }, [activeTenantId, searchQuery]);

  const filteredQueue = queue.filter((item) => {
    if (activeTab === 'login' && item.direction !== 'LOGIN') return false;
    if (activeTab === 'logout' && item.direction !== 'LOGOUT') return false;
    if (selectedStatus !== 'All Status' && item.status !== selectedStatus) return false;
    const officeName = item.roster?.office?.name;
    if (selectedOffice !== 'All Offices' && officeName !== selectedOffice) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = item.employee?.fullName || '';
    const empCode = item.employee?.employeeCode || '';
    return item.id.toLowerCase().includes(q) || empName.toLowerCase().includes(q) || empCode.toLowerCase().includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'CONFIRMED':
        return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
      case 'PENDING':
      case 'UNSERVED':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'IN_PROGRESS':
        return { bg: '#EFF6FF', color: '#5728B2', border: '#BFDBFE' };
      case 'CANCELLED':
        return { bg: 'var(--bg-surface-muted)', color: 'var(--text-muted)', border: 'var(--border-color)' };
      default:
        return { bg: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', border: 'var(--border-color)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Bookings Queue & Ad-hoc Requests
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Live status of daily commute requests, routing queue and ad-hoc booking allocations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/bookings/approvals"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
            }}
          >
            <span>Review Approvals</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Tabs and Filters Bar */}
      <div className="surface-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'all' ? '#5728B2' : 'var(--bg-surface-muted)',
                color: activeTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              All Requests ({queue.length})
            </button>
            <button
              onClick={() => setActiveTab('login')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'login' ? '#5728B2' : 'var(--bg-surface-muted)',
                color: activeTab === 'login' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              Login Commutes ({queue.filter((q) => q.direction === 'LOGIN').length})
            </button>
            <button
              onClick={() => setActiveTab('logout')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'logout' ? '#5728B2' : 'var(--bg-surface-muted)',
                color: activeTab === 'logout' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              Logout Commutes ({queue.filter((q) => q.direction === 'LOGOUT').length})
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requests..."
                style={{
                  width: '100%',
                  height: 34,
                  paddingLeft: 30,
                  paddingRight: 10,
                  fontSize: 12,
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="All Status">All Status</option>
              <option value="UNSERVED">Unserved</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none', backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="All Offices">All Offices</option>
              {offices.map((o) => (
                <option key={o.id} value={o.name}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading booking queue...
          </div>
        ) : filteredQueue.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No booking requests found. Employee commute bookings will appear here in real-time.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Request ID</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Direction</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Shift / Time</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Office Campus</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((item) => {
                  const statusBadge = getStatusBadge(item.status);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.employee?.fullName || 'Enterprise Employee'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.employee?.employeeCode || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: item.direction === 'LOGIN' ? '#EFF6FF' : '#FEF3C7',
                            color: item.direction === 'LOGIN' ? '#5728B2' : '#D97706',
                            border: '1px solid currentColor',
                          }}
                        >
                          {item.direction === 'LOGIN' ? 'Login Pickup' : 'Logout Drop'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.scheduledDate} {item.shiftTime}
                      </td>
                      <td style={{ padding: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.roster?.office?.name || 'Main Campus'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <Link
                          href={`/bookings/details?id=${item.id}`}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#5728B2',
                            textDecoration: 'none',
                          }}
                        >
                          Details
                        </Link>
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
