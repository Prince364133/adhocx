'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface InvoiceListItem {
  id: string;
  invoiceNo: string;
  billingPeriod: string;
  office: string;
  tripCount: number;
  amount: number;
  status: 'Paid' | 'Partially Paid' | 'Overdue' | 'Pending';
  dueDate: string;
}

const MOCK_INVOICES: InvoiceListItem[] = [
  { id: '1', invoiceNo: 'INV-2026-012', billingPeriod: '01 Dec - 07 Dec', office: 'HiTEC City', tripCount: 1248, amount: 486000, status: 'Paid', dueDate: '08 Dec 2026' },
  { id: '2', invoiceNo: 'INV-2026-011', billingPeriod: '24 Nov - 30 Nov', office: 'Kondapur', tripCount: 986, amount: 392500, status: 'Paid', dueDate: '01 Dec 2026' },
  { id: '3', invoiceNo: 'INV-2026-010', billingPeriod: '17 Nov - 23 Nov', office: 'Gachibowli', tripCount: 1102, amount: 421000, status: 'Partially Paid', dueDate: '30 Nov 2026' },
  { id: '4', invoiceNo: 'INV-2026-009', billingPeriod: '10 Nov - 16 Nov', office: 'Madhapur', tripCount: 874, amount: 348000, status: 'Overdue', dueDate: '23 Nov 2026' },
  { id: '5', invoiceNo: 'INV-2026-008', billingPeriod: '03 Nov - 09 Nov', office: 'HiTEC City', tripCount: 958, amount: 376000, status: 'Paid', dueDate: '16 Nov 2026' },
];

export default function InvoiceListPage() {
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState(MOCK_INVOICES);

  const filteredInvoices = invoices.filter((inv) => {
    if (selectedOffice !== 'All Offices' && inv.office !== selectedOffice) return false;
    if (selectedStatus !== 'All Status' && inv.status !== selectedStatus) return false;
    return (
      inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.billingPeriod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.office.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: InvoiceListItem['status']) => {
    switch (status) {
      case 'Paid':
        return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
      case 'Partially Paid':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Overdue':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      case 'Pending':
        return { bg: '#EFF6FF', color: '#5728B2', border: '#BFDBFE' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Generate Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Invoice List
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            View and manage all invoices, their status and payment details
          </p>
        </div>

        <button
          onClick={() => alert('Generating on-demand invoice')}
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
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', backgroundColor: '#F8FAFC', padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }}>
              01 Dec 2026 - 31 Dec 2026
            </div>

            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, color: '#475569' }}
            >
              <option value="All Offices">All Offices</option>
              <option value="HiTEC City">HiTEC City</option>
              <option value="Kondapur">Kondapur</option>
              <option value="Gachibowli">Gachibowli</option>
              <option value="Madhapur">Madhapur</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, color: '#475569' }}
            >
              <option value="All Status">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice no. or reference..."
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 30,
                paddingRight: 10,
                fontSize: 12,
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                outline: 'none',
                backgroundColor: '#F8FAFC',
              }}
            />
          </div>
        </div>

        {/* Invoice Data Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
                <th>Invoice No.</th>
                <th>Billing Period</th>
                <th>Office / City</th>
                <th>Trip Count</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const badge = getStatusBadge(inv.status);
                return (
                  <tr key={inv.id}>
                    <td><input type="checkbox" /></td>
                    <td style={{ fontWeight: 800, color: '#0F172A' }}>{inv.invoiceNo}</td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{inv.billingPeriod}</td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{inv.office}</td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{inv.tripCount.toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: '#0F172A' }}>₹ {inv.amount.toLocaleString()}</td>
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
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>{inv.dueDate}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <Link
                          href={`/billing/details?id=${inv.invoiceNo}`}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 4,
                            border: '1px solid #BFDBFE',
                            backgroundColor: '#EFF6FF',
                            color: '#5728B2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="View Invoice Details"
                        >
                          <Eye size={13} />
                        </Link>
                        <button
                          onClick={() => alert(`Downloading PDF for ${inv.invoiceNo}`)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 4,
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Download PDF"
                        >
                          <Download size={13} />
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

        {/* Pagination Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Showing 1 - 5 of 12 invoices
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} color="#64748B" />
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #5728B2', backgroundColor: '#5728B2', color: '#FFFFFF', fontSize: 12, fontWeight: 700 }}>
              1
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              2
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: 12, fontWeight: 600 }}>
              3
            </button>
            <button style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} color="#64748B" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

