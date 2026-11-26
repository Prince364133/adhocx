'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SkeletonBone } from '@adhocx/ui/page-loading';
import {
  Search,
  Filter,
  Download,
  Layers,
} from 'lucide-react';
import { LazyScrollSentinel } from '../../../components/common/LazyScrollSentinel';
import { TableSkeletonRows } from '../../../components/common/TableSkeletonRows';
import { billingApi } from '../../../lib/api/corporate';
import { Invoice } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';
import { useInfiniteScroll } from '../../../lib/hooks/useInfiniteScroll';

const BATCH_SIZE = 20;

function formatPaiseToRupees(paise: bigint | string | number): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function InvoiceListPage() {
  const { tenantId: activeTenantId } = useSession();
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const requestSequence = useRef(0);

  useEffect(() => {
    async function fetchInvoices() {
      if (!activeTenantId) {
        setInvoices([]);
        setTotalCount(0);
        setHasMore(false);
        setLoading(false);
        return;
      }
      const requestId = ++requestSequence.current;
      pageRef.current = 1;
      try {
        setLoading(true);
        setLoadingMore(false);
        setLoadMoreError(null);
        const res = await billingApi.invoices(activeTenantId, {
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          page: 1,
          limit: BATCH_SIZE,
        });
        if (requestId !== requestSequence.current) return;
        const items = res.items || [];
        const total = res.pagination?.total ?? items.length;
        const pages = Math.max(1, res.pagination?.totalPages ?? Math.ceil(total / BATCH_SIZE));
        setInvoices(items);
        setTotalCount(total);
        setHasMore(1 < pages);
      } catch (err) {
        if (requestId !== requestSequence.current) return;
        console.error('Failed to load corporate invoices:', err);
        setInvoices([]);
        setTotalCount(0);
        setHasMore(false);
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
        }
      }
    }
    void fetchInvoices();
  }, [activeTenantId, selectedStatus]);

  const loadMoreInvoices = useCallback(async () => {
    if (!activeTenantId || loading || loadingMore || !hasMore) return;
    const requestId = requestSequence.current;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await billingApi.invoices(activeTenantId, {
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        page: nextPage,
        limit: BATCH_SIZE,
      });
      if (requestId !== requestSequence.current) return;
      const items = res.items || [];
      const total = res.pagination?.total ?? totalCount;
      const pages = Math.max(1, res.pagination?.totalPages ?? Math.ceil(total / BATCH_SIZE));
      setInvoices((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...items.filter((item) => !seen.has(item.id))];
      });
      pageRef.current = nextPage;
      setTotalCount(total);
      setHasMore(nextPage < pages);
    } catch (err) {
      if (requestId === requestSequence.current) {
        console.error('Failed to load more corporate invoices:', err);
        setLoadMoreError('Unable to load more invoices.');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoadingMore(false);
      }
    }
  }, [activeTenantId, hasMore, loading, loadingMore, selectedStatus, totalCount]);

  const sentinelRef = useInfiniteScroll({
    enabled: !loading && !loadingMore && hasMore && !loadMoreError && !!activeTenantId,
    onLoadMore: () => {
      void loadMoreInvoices();
    },
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'PAID':
        return { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success-border)', label: 'Paid' };
      case 'ISSUED':
        return { bg: 'var(--color-blue-bg)', color: 'var(--brand-primary)', border: 'var(--color-blue-border)', label: 'Issued' };
      case 'DISPUTED':
        return { bg: 'var(--color-warning-bg)', color: '#D97706', border: 'var(--color-warning-border)', label: 'Disputed' };
      case 'OVERDUE':
        return { bg: 'var(--color-danger-bg)', color: '#DC2626', border: 'var(--color-danger-border)', label: 'Overdue' };
      default:
        return { bg: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', border: 'var(--border-color)', label: status };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Invoice List
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            View and manage all B2B tax invoices, their settlement status and PDF downloads
          </p>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div
        className="surface-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="DISPUTED">Disputed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {loading ? (
            <SkeletonBone style={{ width: 96, height: 14, borderRadius: 6 }} />
          ) : (
            `${totalCount} Total Invoices`
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="surface-card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Invoice #</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Billing Period</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Routes / Lines</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Taxable Subtotal</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>GST</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows columns={8} rows={6} />
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Layers size={32} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>No invoices found</p>
                      <p style={{ margin: 0, fontSize: 12 }}>Invoices generated for billing cycles will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const badge = getStatusBadge(inv.status);
                  const period = `${new Date(inv.billingPeriodStart).toLocaleDateString()} - ${new Date(inv.billingPeriodEnd).toLocaleDateString()}`;

                  return (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {period}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {inv._count?.lines ?? 0}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {formatPaiseToRupees(inv.subtotalPaise)}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {formatPaiseToRupees(inv.gstPaise)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatPaiseToRupees(inv.totalAmountPaise)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => billingApi.downloadPdf(inv)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--brand-primary)',
                              cursor: 'pointer',
                            }}
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <LazyScrollSentinel
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            loadingMore={loadingMore}
            error={loadMoreError}
            onRetry={() => void loadMoreInvoices()}
            label="Loading more invoices…"
          />
        )}
      </div>
    </div>
  );
}
