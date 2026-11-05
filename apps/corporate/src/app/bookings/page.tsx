'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface BookingRequestItem {
  id: string;
  requestId: string;
  employeeName: string;
  empId: string;
  type: 'Roster' | 'Ad-hoc' | 'Change' | 'Cancellation';
  shift: string;
  pickupLocation: string;
  office: string;
  status: 'Confirmed' | 'Pending' | 'Needs Approval' | 'Cancelled';
}

const MOCK_BOOKING_QUEUE: BookingRequestItem[] = [
  { id: '1', requestId: 'REQ-78654', employeeName: 'Priya Sharma', empId: 'EMP02467', type: 'Roster', shift: 'Day / 09:00 AM', pickupLocation: 'Kondapur', office: 'HiTEC City', status: 'Confirmed' },
  { id: '2', requestId: 'REQ-78655', employeeName: 'Amit Kumar', empId: 'EMP01893', type: 'Ad-hoc', shift: 'Shift A / 02:00 PM', pickupLocation: 'Gachibowli', office: 'HiTEC City', status: 'Pending' },
  { id: '3', requestId: 'REQ-78656', employeeName: 'Neha Verma', empId: 'EMP03124', type: 'Change', shift: 'Night / 10:00 PM', pickupLocation: 'Madhapur', office: 'HiTEC City', status: 'Needs Approval' },
  { id: '4', requestId: 'REQ-78657', employeeName: 'Rohit Singh', empId: 'EMP02911', type: 'Cancellation', shift: 'Day / 09:00 AM', pickupLocation: 'Kondapur', office: 'HiTEC City', status: 'Cancelled' },
  { id: '5', requestId: 'REQ-78658', employeeName: 'Anjali Rao', empId: 'EMP03376', type: 'Roster', shift: 'Day / 09:00 AM', pickupLocation: 'Kondapur Gate 2', office: 'HiTEC City', status: 'Confirmed' },
  { id: '6', requestId: 'REQ-78659', employeeName: 'Vikram Reddy', empId: 'EMP04011', type: 'Ad-hoc', shift: 'Night / 10:00 PM', pickupLocation: 'Botanical Garden', office: 'Gachibowli', status: 'Pending' },
];

export default function BookingQueuePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'adhoc' | 'change' | 'cancellation'>('all');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQueue = MOCK_BOOKING_QUEUE.filter((item) => {
    if (activeTab === 'adhoc' && item.type !== 'Ad-hoc') return false;
    if (activeTab === 'change' && item.type !== 'Change') return false;
    if (activeTab === 'cancellation' && item.type !== 'Cancellation') return false;
    if (selectedStatus !== 'All Status' && item.status !== selectedStatus) return false;
    if (selectedOffice !== 'All Offices' && item.office !== selectedOffice) return false;
    return (
      item.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getTypeBadge = (type: BookingRequestItem['type']) => {
    switch (type) {
      case 'Roster':
        return { bg: '#EFF6FF', color: '#1167EE', border: '#BFDBFE' };
      case 'Ad-hoc':
        return { bg: '#F3E8FF', color: '#7C3AED', border: '#D8B4FE' };
      case 'Change':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Cancellation':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
    }
  };

  const getStatusBadge = (status: BookingRequestItem['status']) => {
    switch (status) {
      case 'Confirmed':
        return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
      case 'Pending':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Needs Approval':
        return { bg: '#EFF6FF', color: '#1167EE', border: '#BFDBFE' };
      case 'Cancelled':
        return { bg: '#F1F5F9', color: '#94A3B8', border: '#CBD5E1' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Booking Queue
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            View and manage all transport requests (auto and ad-hoc)
          </p>
        </div>

        <button
          onClick={() => alert('New Ad-hoc Transport Booking Modal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1167EE',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(17,103,238,0.25)',
          }}
        >
          <Plus size={16} />
          <span>New Request</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'all' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'all' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            All Requests (2,568)
          </button>
          <button
            onClick={() => setActiveTab('adhoc')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'adhoc' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'adhoc' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Ad-hoc (292)
          </button>
          <button
            onClick={() => setActiveTab('change')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'change' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'change' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Change Requests (110)
          </button>
          <button
            onClick={() => setActiveTab('cancellation')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'cancellation' ? '#1167EE' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'cancellation' ? '#1167EE' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Cancellations (56)
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, color: '#475569' }}
            >
              <option value="All Status">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Needs Approval">Needs Approval</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, color: '#475569' }}
            >
              <option value="All Offices">All Offices</option>
              <option value="HiTEC City">HiTEC City</option>
              <option value="Gachibowli">Gachibowli</option>
              <option value="Kondapur">Kondapur</option>
            </select>
          </div>

          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 9 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request ID, name..."
              style={{
                width: '100%',
                height: 32,
                paddingLeft: 30,
                paddingRight: 10,
                fontSize: 12,
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
                <th>Request ID</th>
                <th>Employee Name</th>
                <th>Request Type</th>
                <th>Shift / Login</th>
                <th>Pickup Location</th>
                <th>Office</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((item) => {
                const typeB = getTypeBadge(item.type);
                const statusB = getStatusBadge(item.status);
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" /></td>
                    <td style={{ fontWeight: 800, color: '#0F172A' }}>{item.requestId}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{item.employeeName}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{item.empId}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: typeB.bg,
                          color: typeB.color,
                          border: `1px solid ${typeB.border}`,
                        }}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{item.shift}</td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{item.pickupLocation}</td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>{item.office}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: statusB.bg,
                          color: statusB.color,
                          border: `1px solid ${statusB.border}`,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/bookings/details?id=${item.requestId}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: 4,
                          backgroundColor: '#EFF6FF',
                          color: '#1167EE',
                          border: '1px solid #BFDBFE',
                          fontSize: '11px',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </Link>
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

