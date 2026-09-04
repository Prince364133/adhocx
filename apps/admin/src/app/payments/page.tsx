'use client';

import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const payments = [
    {
      id: 'pay-801',
      vendorName: 'Acme Corporate Logistics Ltd',
      requirementId: 'req-201',
      amount: 64000,
      status: 'CAPTURED',
      paymentMethod: 'CORPORATE_NETBANKING',
      transactionRef: 'TXN_ACME_982341',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'pay-802',
      vendorName: 'Metro Fleet Cabs Pvt Ltd',
      requirementId: 'req-202',
      amount: 38400,
      status: 'CAPTURED',
      paymentMethod: 'UPI_COLLECT',
      transactionRef: 'UPI2026090388912',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'pay-803',
      vendorName: 'TechCorp Transport Services',
      requirementId: 'req-204',
      amount: 14000,
      status: 'AUTHORIZED',
      paymentMethod: 'CORPORATE_CARD',
      transactionRef: 'AUTH_991823',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  const filtered = payments.filter((p) => {
    if (activeTab !== 'ALL' && p.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        p.id.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q) ||
        p.requirementId.toLowerCase().includes(q) ||
        p.transactionRef.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Customer Payments & Escrow Ledger</h1>
        <p className="page-subtitle">
          Monitor enterprise client invoices, pre-authorized escrow payments, and captured ride receipts.
        </p>
      </div>

      <div className="tabs">
        {['ALL', 'CAPTURED', 'AUTHORIZED', 'PENDING', 'FAILED', 'REFUNDED'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search payments by vendor, transaction reference, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filtered.length}</strong> payment transactions
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Enterprise Vendor</th>
              <th>Requirement Ref</th>
              <th>Transaction Amount</th>
              <th>Method & Reference</th>
              <th>Status</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="💳"
                    title="No payments found"
                    description="No payment transactions match your query."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-600)' }}>
                      #{p.id}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.vendorName}</td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      #{p.requirementId}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{p.paymentMethod.replace('_', ' ')}</div>
                    <div style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {p.transactionRef}
                    </div>
                  </td>
                  <td>
                    <Badge status={p.status} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
