'use client';

import React, { useEffect, useState } from 'react';
import { Download, FileText, Layers } from 'lucide-react';
import { billingApi, tenantApi } from '../../../lib/api/corporate';
import type { CostCenter, Invoice } from '../../../lib/api/types';
import MetricCard from '../../../components/common/MetricCard';
import { useSession } from '../../../lib/auth/SessionContext';

function formatPaiseToRupees(paise: string | number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(paise) / 100);
}

export default function CostDepartmentReportsPage() {
  const { tenantId } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setInvoices([]);
      setInvoiceTotal(0);
      setCostCenters([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      billingApi.invoices(tenantId, { limit: 50 }),
      tenantApi.costCenters(tenantId),
    ])
      .then(([invoiceResult, centerResult]) => {
        if (!active) return;
        setInvoices(invoiceResult.items);
        setInvoiceTotal(invoiceResult.pagination.total);
        setCostCenters(centerResult);
      })
      .catch((err) => {
        console.error('Failed to load cost report data:', err);
        if (active) setError('Unable to load invoices and cost centers. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  const invoicedPaise = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmountPaise), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Cost & Billing Records
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Tenant invoices and configured cost centers
          </p>
        </div>
        <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: 6 }}>
          <Download size={14} /> Print report
        </button>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="Invoices in current page" value={loading ? '...' : invoices.length.toLocaleString()} icon={<FileText size={20} />} category="primary" />
        <MetricCard label="Total invoice records" value={loading ? '...' : invoiceTotal.toLocaleString()} icon={<FileText size={20} />} category="info" />
        <MetricCard label="Invoiced amount (loaded records)" value={loading ? '...' : formatPaiseToRupees(invoicedPaise)} icon={<Download size={20} />} category="success" />
        <MetricCard label="Configured cost centers" value={loading ? '...' : costCenters.length.toLocaleString()} icon={<Layers size={20} />} category="warning" />
      </div>

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Invoices</h2>
        {loading ? <p>Loading invoices...</p> : invoices.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No tenant invoices are available.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Invoice</th><th>Period</th><th>Status</th><th>Lines</th><th>Total</th></tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.billingPeriodStart.slice(0, 10)} – {invoice.billingPeriodEnd.slice(0, 10)}</td>
                    <td>{invoice.status}</td>
                    <td>{invoice._count?.lines ?? '—'}</td>
                    <td>{formatPaiseToRupees(invoice.totalAmountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Configured cost centers</h2>
        {costCenters.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No cost centers are configured for this tenant.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Code</th></tr></thead>
              <tbody>
                {costCenters.map((center) => (
                  <tr key={center.id ?? center.code}><td>{center.name}</td><td>{center.code}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          The current API does not associate invoice totals with cost centers or expose budget allocations, so no departmental spend split is shown.
        </p>
      </section>
    </div>
  );
}
