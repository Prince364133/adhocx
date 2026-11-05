'use client';

import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Eye,
  MessageSquare,
  Search,
} from 'lucide-react';

interface DisputeItem {
  id: string;
  disputeId: string;
  invoiceNo: string;
  office: string;
  reason: string;
  amount: number;
  status: 'Open' | 'Under Review' | 'Resolved';
  raisedOn: string;
}

const MOCK_DISPUTES: DisputeItem[] = [
  { id: '1', disputeId: 'DIS-0264', invoiceNo: 'INV-2026-010', office: 'Gachibowli', reason: 'Extra trip charge mismatch', amount: 48000, status: 'Open', raisedOn: '24 Nov 2026' },
  { id: '2', disputeId: 'DIS-0263', invoiceNo: 'INV-2026-009', office: 'Madhapur', reason: 'Incorrect trip count (+12 trips)', amount: 76500, status: 'Under Review', raisedOn: '22 Nov 2026' },
  { id: '3', disputeId: 'DIS-0261', invoiceNo: 'INV-2026-007', office: 'HiTEC City', reason: 'Cancellation charge (not applicable - notified >9h)', amount: 12000, status: 'Resolved', raisedOn: '15 Nov 2026' },
  { id: '4', disputeId: 'DIS-0258', invoiceNo: 'INV-2026-005', office: 'Kondapur', reason: 'Re-route distance variance calculation error', amount: 18000, status: 'Resolved', raisedOn: '10 Nov 2026' },
  { id: '5', disputeId: 'DIS-0256', invoiceNo: 'INV-2026-004', office: 'HiTEC City', reason: 'Duplicate trip charge for login shift', amount: 26000, status: 'Resolved', raisedOn: '07 Nov 2026' },
];

export default function BillingDisputesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'review' | 'resolved'>('all');
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDisputes = disputes.filter((item) => {
    if (activeTab === 'open' && item.status !== 'Open') return false;
    if (activeTab === 'review' && item.status !== 'Under Review') return false;
    if (activeTab === 'resolved' && item.status !== 'Resolved') return false;
    return (
      item.disputeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.office.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: DisputeItem['status']) => {
    switch (status) {
      case 'Open':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Under Review':
        return { bg: '#FFEDD5', color: '#EA580C', border: '#FDBA74' };
      case 'Resolved':
        return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Raise Dispute Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Billing Disputes
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Track, review and resolve invoice or charge disputes raised by your team
          </p>
        </div>

        <button
          onClick={() => alert('Raising formal billing dispute')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#5728B2',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
          }}
        >
          <Plus size={16} />
          <span>Raise Dispute</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div
        className="surface-card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>2</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Open Disputes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFEDD5', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#EA580C' }}>3</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Under Review</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>7</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Resolved</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>₹ 1,24,500</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Disputed Amount</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>₹ 96,000</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Adjusted (Resolved)</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        {/* Tabs Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'all' ? '#5728B2' : '#F1F5F9',
                color: activeTab === 'all' ? '#FFFFFF' : '#475569',
                cursor: 'pointer',
              }}
            >
              All Disputes (12)
            </button>
            <button
              onClick={() => setActiveTab('open')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'open' ? '#D97706' : '#FEF3C7',
                color: activeTab === 'open' ? '#FFFFFF' : '#D97706',
                cursor: 'pointer',
              }}
            >
              Open (2)
            </button>
            <button
              onClick={() => setActiveTab('review')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'review' ? '#EA580C' : '#FFEDD5',
                color: activeTab === 'review' ? '#FFFFFF' : '#EA580C',
                cursor: 'pointer',
              }}
            >
              Under Review (3)
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'resolved' ? '#16A34A' : '#DCFCE7',
                color: activeTab === 'resolved' ? '#FFFFFF' : '#16A34A',
                cursor: 'pointer',
              }}
            >
              Resolved (7)
            </button>
          </div>

          <div style={{ position: 'relative', width: 260 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dispute ID, invoice..."
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 30,
                paddingRight: 10,
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                outline: 'none',
                backgroundColor: '#F8FAFC',
              }}
            />
          </div>
        </div>

        {/* Disputes Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
                <th>Dispute ID</th>
                <th>Invoice No.</th>
                <th>Office</th>
                <th>Issue / Reason</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Raised On</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisputes.map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" /></td>
                    <td style={{ fontWeight: 800, color: '#0F172A' }}>{item.disputeId}</td>
                    <td style={{ fontWeight: 600, color: '#5728B2' }}>{item.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{item.office}</td>
                    <td style={{ fontSize: '12px', color: '#0F172A' }}>{item.reason}</td>
                    <td style={{ fontWeight: 800, color: '#0F172A' }}>₹ {item.amount.toLocaleString()}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>{item.raisedOn}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => alert(`Reviewing dispute ${item.disputeId}`)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: '1px solid #BFDBFE',
                            backgroundColor: '#EFF6FF',
                            color: '#5728B2',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Review
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

