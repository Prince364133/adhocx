'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  Search,
  Plus,
} from 'lucide-react';
import { supportApi } from '../../../lib/api/corporate';
import type { SupportTicket } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';
import { RaiseTicketModal } from '../../../components/support/RaiseTicketModal';

export default function SupportTicketListPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    supportApi
      .list(activeTenantId, {})
      .then((data) => {
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Failed to load tickets list:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId]);

  const filteredTickets = tickets.filter((tkt) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      tkt.id.toLowerCase().includes(q) ||
      (tkt.ticketNumber && tkt.ticketNumber.toLowerCase().includes(q)) ||
      (tkt.subject || '').toLowerCase().includes(q) ||
      (tkt.category || '').toLowerCase().includes(q) ||
      (tkt.employee?.fullName && tkt.employee.fullName.toLowerCase().includes(q));
    const matchesTab = statusTab === 'All' || tkt.status === statusTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Support Tickets Directory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Full index of employee complaints, cab comfort issues, app bugs and operational inquiries
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> New Support Ticket
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['All', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: statusTab === tab ? '#5728B2' : '#F1F5F9',
                color: statusTab === tab ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
              }}
            >
              {tab === 'All' ? 'All Tickets' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ID, subject..."
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 30,
              paddingRight: 10,
              fontSize: 12,
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              outline: 'none',
              backgroundColor: 'var(--bg-surface-muted)',
            }}
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading tickets directory...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No tickets found matching your filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Ticket Number</th>
                  <th style={{ padding: '12px 16px' }}>Subject</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((tkt) => (
                  <tr key={tkt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, fontFamily: 'monospace', color: '#5728B2' }}>
                      #{tkt.ticketNumber || tkt.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tkt.subject}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {tkt.category ? tkt.category.replace('_', ' ') : 'General'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            tkt.priority === 'CRITICAL' || tkt.priority === 'HIGH' ? '#FEE2E2' : '#EFF6FF',
                          color:
                            tkt.priority === 'CRITICAL' || tkt.priority === 'HIGH' ? '#DC2626' : '#5728B2',
                        }}
                      >
                        {tkt.priority || 'NORMAL'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor:
                            tkt.status === 'RESOLVED'
                              ? '#DCFCE7'
                              : tkt.status === 'IN_PROGRESS'
                              ? '#E0E7FF'
                              : tkt.status === 'CLOSED'
                              ? '#F1F5F9'
                              : '#FEF3C7',
                          color:
                            tkt.status === 'RESOLVED'
                              ? '#16A34A'
                              : tkt.status === 'IN_PROGRESS'
                              ? '#4338CA'
                              : tkt.status === 'CLOSED'
                              ? '#475569'
                              : '#D97706',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {tkt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/support/tickets/details?id=${tkt.id}`}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--border-strong)',
                          backgroundColor: 'var(--bg-surface)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#5728B2',
                          textDecoration: 'none',
                        }}
                      >
                        View Thread
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RaiseTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenantId={activeTenantId}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
