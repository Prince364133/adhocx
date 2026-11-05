'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  Search,
  Filter,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { mockSupportTickets } from '../../../lib/mock/corporateMockData';

export default function SupportTicketListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'Open' | 'In Progress' | 'Resolved' | 'Overdue'>('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const filteredTickets = mockSupportTickets.filter((tkt) => {
    const matchesSearch =
      tkt.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tkt.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tkt.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tkt.office.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = statusTab === 'All' || tkt.status === statusTab;
    const matchesPriority = priorityFilter === 'All' || tkt.priority === priorityFilter;
    return matchesSearch && matchesTab && matchesPriority;
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'var(--corporate-blue)',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> New Ticket
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {(['All', 'Open', 'In Progress', 'Resolved', 'Overdue'] as const).map((tab) => {
          const isActive = statusTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--corporate-blue)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 1px 3px rgba(17, 103, 238, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', minWidth: 280, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ID, employee or subject..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: '#F8FAFC',
            }}
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            fontSize: 13,
            backgroundColor: '#FFFFFF',
            color: 'var(--text-primary)',
          }}
        >
          <option value="All">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Tickets Master Table */}
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
                <th style={{ padding: '12px 16px' }}>Ticket ID</th>
                <th style={{ padding: '12px 16px' }}>Priority</th>
                <th style={{ padding: '12px 16px' }}>Subject & Category</th>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Office</th>
                <th style={{ padding: '12px 16px' }}>SLA Timer</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((tkt) => (
                <tr key={tkt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                      {tkt.ticketId}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor:
                          tkt.priority === 'Critical'
                            ? '#FEE2E2'
                            : tkt.priority === 'High'
                            ? '#FFEDD5'
                            : '#EFF6FF',
                        color:
                          tkt.priority === 'Critical'
                            ? '#DC2626'
                            : tkt.priority === 'High'
                            ? '#C2410C'
                            : 'var(--corporate-blue)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {tkt.priority}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tkt.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {tkt.category} • Ref: {tkt.tripReference || 'Commute'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tkt.employeeName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tkt.employeeId}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {tkt.office}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tkt.slaBreached ? '#DC2626' : 'var(--text-primary)' }}>
                      {tkt.elapsedTimeHours} / {tkt.slaTargetHours}h target
                    </div>
                    {tkt.slaBreached && (
                      <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Breached</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor:
                          tkt.status === 'Resolved'
                            ? '#DCFCE7'
                            : tkt.status === 'In Progress'
                            ? '#EFF6FF'
                            : tkt.status === 'Overdue'
                            ? '#FEE2E2'
                            : '#FEF3C7',
                        color:
                          tkt.status === 'Resolved'
                            ? '#15803D'
                            : tkt.status === 'In Progress'
                            ? 'var(--corporate-blue)'
                            : tkt.status === 'Overdue'
                            ? '#DC2626'
                            : '#B45309',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {tkt.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href="/support/tickets/details"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--corporate-blue)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      View Details <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

