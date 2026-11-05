'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Check,
  X,
  Search,
  ChevronDown,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  requestId: string;
  employeeName: string;
  empId: string;
  requestType: 'Pickup Change' | 'Ad-hoc' | 'Cancellation' | 'Policy Exception';
  details: string;
  office: string;
  requestedOn: string;
}

const MOCK_APPROVALS: ApprovalItem[] = [
  { id: '1', requestId: 'REQ-78670', employeeName: 'Anjali Rao', empId: 'EMP03376', requestType: 'Pickup Change', details: 'Kondapur Gate 2 → Kondapur Gate 3', office: 'HiTEC City', requestedOn: '08 Dec, 09:12 AM' },
  { id: '2', requestId: 'REQ-78671', employeeName: 'Vikram Reddy', empId: 'EMP04011', requestType: 'Pickup Change', details: 'Gachibowli Circle → Botanical Garden', office: 'Gachibowli', requestedOn: '08 Dec, 08:44 AM' },
  { id: '3', requestId: 'REQ-78672', employeeName: 'Neha Verma', empId: 'EMP03124', requestType: 'Pickup Change', details: 'Madhapur HUDA → Inorbit Mall', office: 'HiTEC City', requestedOn: '08 Dec, 08:18 AM' },
  { id: '4', requestId: 'REQ-78673', employeeName: 'Amit Kumar', empId: 'EMP01893', requestType: 'Ad-hoc', details: 'Late flight arrival pickup from Airport at 11:30 PM', office: 'HiTEC City', requestedOn: '08 Dec, 07:55 AM' },
  { id: '5', requestId: 'REQ-78674', employeeName: 'Rohit Singh', empId: 'EMP02911', requestType: 'Cancellation', details: 'Medical emergency leave cancellation for Night shift', office: 'HiTEC City', requestedOn: '08 Dec, 07:12 AM' },
];

export default function ApprovalInboxPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pickup' | 'adhoc' | 'cancellation' | 'policy'>('all');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [items, setItems] = useState(MOCK_APPROVALS);

  const handleApprove = (id: string, reqId: string) => {
    alert(`Approved ${reqId}`);
    setItems(items.filter((item) => item.id !== id));
  };

  const handleReject = (id: string, reqId: string) => {
    alert(`Rejected ${reqId}`);
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Approval Inbox
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Review and approve employee requests (pickup change, ad-hoc, cancellation, policy exceptions)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
            style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
          >
            <option value="All Offices">All Offices</option>
            <option value="HiTEC City">HiTEC City</option>
            <option value="Gachibowli">Gachibowli</option>
          </select>

          <select
            defaultValue="Newest First"
            style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
          >
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
            <option value="Urgent First">Urgent First</option>
          </select>
        </div>
      </div>

      {/* Main Inbox Card */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'all' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'all' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            All (28)
          </button>
          <button
            onClick={() => setActiveTab('pickup')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'pickup' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'pickup' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Pickup Change (12)
          </button>
          <button
            onClick={() => setActiveTab('adhoc')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'adhoc' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'adhoc' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Ad-hoc Requests (9)
          </button>
          <button
            onClick={() => setActiveTab('cancellation')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'cancellation' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'cancellation' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Cancellations (5)
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'policy' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'policy' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Policy Exceptions (2)
          </button>
        </div>

        {/* Requests Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" /></th>
                <th>Request ID</th>
                <th>Employee</th>
                <th>Request Type</th>
                <th>Details</th>
                <th>Office</th>
                <th>Requested On</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((req) => (
                <tr key={req.id}>
                  <td><input type="checkbox" /></td>
                  <td style={{ fontWeight: 800, color: '#0F172A' }}>{req.requestId}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{req.employeeName}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{req.empId}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: '#EFF6FF',
                        color: '#5728B2',
                        border: '1px solid #BFDBFE',
                      }}
                    >
                      {req.requestType}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    {req.details}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>{req.office}</td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>{req.requestedOn}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleApprove(req.id, req.requestId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
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
                        onClick={() => handleReject(req.id, req.requestId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 12px',
                          borderRadius: 4,
                          backgroundColor: '#FFFFFF',
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
      </div>
    </div>
  );
}

