'use client';

import React, { useEffect, useState } from 'react';
import { Tag, Ticket, CheckCircle2, Wallet, Plus } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  CouponListItem,
  CouponMetrics,
  CouponRedemptionItem,
  CreateCouponPayload,
  UpdateCouponPayload,
} from '../../lib/api/types';
import {
  PageHeader,
  KpiStrip,
  Button,
  FilterBar,
  DataTable,
  StatusBadge,
  Drawer,
  ConfirmDialog,
  FeedbackBanner,
} from '../../components/common';

const STATUS_TABS = ['ALL', 'ACTIVE', 'EXPIRED', 'INACTIVE', 'EXHAUSTED'];

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponListItem[]>([]);
  const [metrics, setMetrics] = useState<CouponMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponListItem | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<CouponListItem | null>(null);
  const [selectedRedemptionsCoupon, setSelectedRedemptionsCoupon] = useState<CouponListItem | null>(null);
  const [redemptions, setRedemptions] = useState<CouponRedemptionItem[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateCouponPayload>({
    code: '',
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscountAmount: 500,
    minOrderAmount: 500,
    applicableTo: 'ALL',
    usageLimitTotal: 1000,
    usageLimitPerUser: 1,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    isActive: true,
  });

  const [editForm, setEditForm] = useState<UpdateCouponPayload>({});
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, scopeFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [couponData, metricData] = await Promise.all([
        adminApi.getCoupons(activeTab, searchQuery, scopeFilter).catch(() => []),
        adminApi.getCouponMetrics().catch(() => ({
          totalCoupons: 0,
          activeCoupons: 0,
          totalRedemptions: 0,
          totalDiscountDisbursed: 0,
        })),
      ]);
      setCoupons(couponData);
      setMetrics(metricData);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenRedemptions(coupon: CouponListItem) {
    setSelectedRedemptionsCoupon(coupon);
    setLoadingRedemptions(true);
    try {
      const data = await adminApi.getCouponRedemptions(coupon.id).catch(() => []);
      setRedemptions(data);
    } finally {
      setLoadingRedemptions(false);
    }
  }

  function handleOpenEdit(coupon: CouponListItem) {
    setEditingCoupon(coupon);
    setEditForm({
      title: coupon.title,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount ?? undefined,
      minOrderAmount: coupon.minOrderAmount,
      applicableTo: coupon.applicableTo,
      usageLimitTotal: coupon.usageLimitTotal ?? undefined,
      usageLimitPerUser: coupon.usageLimitPerUser,
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil.split('T')[0],
      isActive: coupon.isActive,
    });
  }

  async function handleToggleStatus(coupon: CouponListItem) {
    try {
      await adminApi.updateCoupon(coupon.id, { isActive: !coupon.isActive });
      setAlert({
        type: 'success',
        message: `Coupon "${coupon.code}" ${!coupon.isActive ? 'activated' : 'deactivated'} successfully!`,
      });
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update coupon status' });
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.code.trim()) {
      setAlert({ type: 'error', message: 'Coupon code is required.' });
      return;
    }
    if (!createForm.title.trim()) {
      setAlert({ type: 'error', message: 'Title is required.' });
      return;
    }
    if (createForm.discountValue <= 0) {
      setAlert({ type: 'error', message: 'Discount value must be greater than zero.' });
      return;
    }
    if (createForm.discountType === 'PERCENTAGE' && createForm.discountValue > 100) {
      setAlert({ type: 'error', message: 'Percentage discount cannot exceed 100%.' });
      return;
    }
    if (createForm.usageLimitTotal && createForm.usageLimitPerUser && createForm.usageLimitPerUser > createForm.usageLimitTotal) {
      setAlert({ type: 'error', message: 'Per-user limit cannot exceed total platform usage limit.' });
      return;
    }
    if (createForm.maxDiscountAmount && createForm.maxDiscountAmount > 99999999) {
      setAlert({ type: 'error', message: 'Max cap cannot exceed ₹9,99,99,999.' });
      return;
    }
    if (createForm.minOrderAmount && createForm.minOrderAmount > 99999999) {
      setAlert({ type: 'error', message: 'Min order spend cannot exceed ₹9,99,99,999.' });
      return;
    }
    if (createForm.usageLimitPerUser && createForm.usageLimitPerUser > 1000000) {
      setAlert({ type: 'error', message: 'Per-user limit cannot exceed 1,000,000.' });
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createCoupon({
        ...createForm,
        code: createForm.code.trim().toUpperCase(),
        validFrom: new Date(createForm.validFrom).toISOString(),
        validUntil: new Date(createForm.validUntil + 'T23:59:59Z').toISOString(),
      });
      setIsCreateOpen(false);
      setAlert({ type: 'success', message: `Promo coupon "${createForm.code.toUpperCase()}" created successfully!` });
      loadData();
      // Reset form
      setCreateForm({
        code: '',
        title: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountAmount: 500,
        minOrderAmount: 500,
        applicableTo: 'ALL',
        usageLimitTotal: 1000,
        usageLimitPerUser: 1,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        isActive: true,
      });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to create coupon' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCoupon) return;

    if (editForm.discountValue !== undefined && editForm.discountValue <= 0) {
      setAlert({ type: 'error', message: 'Discount value must be greater than zero.' });
      return;
    }
    if (editForm.discountType === 'PERCENTAGE' && editForm.discountValue !== undefined && editForm.discountValue > 100) {
      setAlert({ type: 'error', message: 'Percentage discount cannot exceed 100%.' });
      return;
    }
    const effTotal = editForm.usageLimitTotal !== undefined ? editForm.usageLimitTotal : editingCoupon.usageLimitTotal;
    const effUser = editForm.usageLimitPerUser !== undefined ? editForm.usageLimitPerUser : editingCoupon.usageLimitPerUser;
    if (effTotal && effUser && effUser > effTotal) {
      setAlert({ type: 'error', message: 'Per-user limit cannot exceed total platform usage limit.' });
      return;
    }
    if (editForm.maxDiscountAmount && editForm.maxDiscountAmount > 99999999) {
      setAlert({ type: 'error', message: 'Max cap cannot exceed ₹9,99,99,999.' });
      return;
    }
    if (editForm.minOrderAmount && editForm.minOrderAmount > 99999999) {
      setAlert({ type: 'error', message: 'Min order spend cannot exceed ₹9,99,99,999.' });
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.updateCoupon(editingCoupon.id, {
        ...editForm,
        validFrom: editForm.validFrom ? new Date(editForm.validFrom).toISOString() : undefined,
        validUntil: editForm.validUntil ? new Date(editForm.validUntil + 'T23:59:59Z').toISOString() : undefined,
      });
      setEditingCoupon(null);
      setAlert({ type: 'success', message: `Coupon "${editingCoupon.code}" updated successfully!` });
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update coupon' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCoupon() {
    if (!deletingCoupon) return;
    setSubmitting(true);
    try {
      const res = await adminApi.deleteCoupon(deletingCoupon.id);
      setDeletingCoupon(null);
      setAlert({ type: 'success', message: res.message || 'Coupon deleted successfully' });
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete coupon' });
    } finally {
      setSubmitting(false);
    }
  }

  function getCouponStatus(coupon: CouponListItem) {
    const now = new Date();
    const start = new Date(coupon.validFrom);
    const end = new Date(coupon.validUntil);

    if (!coupon.isActive) return { label: 'INACTIVE', variant: 'neutral' as const };
    if (now < start) return { label: 'SCHEDULED', variant: 'info' as const };
    if (now > end) return { label: 'EXPIRED', variant: 'warning' as const };
    if (coupon.usageLimitTotal && coupon.usedCount >= coupon.usageLimitTotal) {
      return { label: 'EXHAUSTED', variant: 'danger' as const };
    }
    return { label: 'ACTIVE', variant: 'success' as const };
  }

  return (
    <div className="admin-page">
      {/* Alert banner */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Coupons & Promotion Management"
        subtitle="Configure promotional codes, percentage discounts, cashbacks, and AdhocX Wallet top-up bonus rules"
        liveStatus="Campaign Engine Active"
        actions={
          <Button variant="primary" size="md" onClick={() => setIsCreateOpen(true)} leftIcon={<Plus size={16} />}>
            Create Promo Coupon
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      <KpiStrip
        columns={4}
        items={[
          {
            id: 'total',
            label: 'Total Coupons',
            value: metrics?.totalCoupons ?? 0,
            subtext: 'Configured promos',
            icon: <Ticket size={16} color="var(--brand-primary)" />,
            tone: 'indigo',
          },
          {
            id: 'active',
            label: 'Active Promos',
            value: metrics?.activeCoupons ?? 0,
            subtext: 'Claimable by users',
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            tone: 'success',
          },
          {
            id: 'redemptions',
            label: 'Total Redemptions',
            value: metrics?.totalRedemptions ?? 0,
            subtext: 'Trips & wallet topups',
            icon: <Tag size={16} color="#8b5cf6" />,
            tone: 'violet',
          },
          {
            id: 'disbursed',
            label: 'Discount Disbursed',
            value: `₹ ${(metrics?.totalDiscountDisbursed ?? 0).toLocaleString('en-IN')}`,
            subtext: 'Platform promo savings',
            icon: <Wallet size={16} color="var(--color-warning)" />,
            tone: 'warning',
          },
        ]}
      />

      {/* Toolbar / Filters */}
      <FilterBar
        tabs={STATUS_TABS.map((tab) => ({ id: tab, label: tab }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search code or title..."
        extraFilters={
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            style={{
              padding: '0.4375rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
            }}
          >
            <option value="ALL">All Contexts</option>
            <option value="WALLET_TOPUP">Wallet Top-up Only</option>
            <option value="REQUIREMENT_BOOKING">Trip Booking Only</option>
          </select>
        }
      />

      {/* Coupons Table */}
      <DataTable
        columns={[
          {
            header: 'COUPON CODE',
            accessor: (c) => (
              <div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    backgroundColor: 'rgba(91, 66, 243, 0.12)',
                    color: 'var(--brand-primary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--brand-primary)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {c.code}
                </span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.375rem', fontSize: '0.8125rem' }}>
                  {c.title}
                </div>
                {c.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', maxWidth: '240px' }}>
                    {c.description}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: 'DISCOUNT & BENEFIT',
            accessor: (c) => (
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT`}
                </div>
                {c.discountType === 'PERCENTAGE' && c.maxDiscountAmount && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    Max cap ₹{c.maxDiscountAmount}
                  </div>
                )}
              </div>
            ),
          },
          {
            header: 'MIN SPEND',
            accessor: (c) => (
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                {c.minOrderAmount > 0 ? `₹${c.minOrderAmount}` : 'No Min.'}
              </span>
            ),
          },
          {
            header: 'APPLICABLE TO',
            accessor: (c) => (
              <StatusBadge
                status={
                  c.applicableTo === 'ALL'
                    ? 'UNIVERSAL'
                    : c.applicableTo === 'WALLET_TOPUP'
                    ? 'WALLET_TOPUP'
                    : 'TRIP_BOOKING'
                }
              />
            ),
          },
          {
            header: 'USAGE & LIMITS',
            accessor: (c) => {
              const usagePercent = c.usageLimitTotal
                ? Math.min(100, Math.round((c.usedCount / c.usageLimitTotal) * 100))
                : 0;
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.usedCount}</span>
                    <span style={{ color: 'var(--text-muted)' }}>/ {c.usageLimitTotal ? c.usageLimitTotal : '∞'}</span>
                  </div>
                  {c.usageLimitTotal && (
                    <div
                      style={{
                        width: '90px',
                        height: '4px',
                        backgroundColor: 'var(--border-subtle)',
                        borderRadius: '2px',
                        marginTop: '0.375rem',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${usagePercent}%`,
                          height: '100%',
                          backgroundColor: usagePercent > 90 ? 'var(--color-danger)' : 'var(--brand-primary)',
                        }}
                      />
                    </div>
                  )}
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Limit {c.usageLimitPerUser}/user
                  </div>
                </div>
              );
            },
          },
          {
            header: 'VALIDITY',
            accessor: (c) => (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div>{new Date(c.validFrom).toLocaleDateString()}</div>
                <div style={{ color: 'var(--text-muted)' }}>to {new Date(c.validUntil).toLocaleDateString()}</div>
              </div>
            ),
          },
          {
            header: 'STATUS',
            accessor: (c) => {
              const s = getCouponStatus(c);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <StatusBadge status={s.label} />
                  <Button
                    variant={c.isActive ? 'danger' : 'success'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(c);
                    }}
                  >
                    {c.isActive ? 'Pause' : 'Enable'}
                  </Button>
                </div>
              );
            },
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (c) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenRedemptions(c);
                  }}
                >
                  Logs ({c.redemptionsCount ?? c.usedCount})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(c);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCoupon(c);
                  }}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
        data={coupons}
        keyExtractor={(c) => c.id}
        loading={loading}
        emptyTitle="No coupons found"
        emptySubtitle="No promotional coupons match your selected filter."
      />


      {/* CREATE COUPON DRAWER */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => !submitting && setIsCreateOpen(false)}
        title="Create Promotional Coupon"
        subtitle="Configure promo rules, caps, target applicability, and expiry dates"
        icon={<Ticket size={18} />}
        width="min(94vw, 620px)"
        closeOnBackdrop={!submitting}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', width: '100%' }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="create-coupon-form" variant="primary" size="md" isLoading={submitting}>
              Create Promo Code
            </Button>
          </div>
        }
      >
        <form id="create-coupon-form" onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Coupon Code * (Uppercase)
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. ADHOC100, SAVE20"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                style={{ fontWeight: 600, fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Promo Title *
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Welcome 20% Discount"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Description (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Get 20% discount on your first outstation requirement or wallet top-up"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Discount Type *
              </label>
              <select
                className="form-select"
                value={createForm.discountType}
                onChange={(e) =>
                  setCreateForm({ ...createForm, discountType: e.target.value as 'PERCENTAGE' | 'FLAT' })
                }
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                {createForm.discountType === 'PERCENTAGE' ? 'Discount Rate (%) *' : 'Flat Discount (₹) *'}
              </label>
              <input
                type="number"
                required
                className="form-input"
                min={0.01}
                max={createForm.discountType === 'PERCENTAGE' ? 100 : 100000}
                step="0.01"
                value={createForm.discountValue}
                onChange={(e) => setCreateForm({ ...createForm, discountValue: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Max Cap (₹)
              </label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={99999999}
                placeholder="No max cap"
                value={createForm.maxDiscountAmount || ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Min Order Spend (₹)
              </label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={99999999}
                value={createForm.minOrderAmount ?? 0}
                onChange={(e) => setCreateForm({ ...createForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Applicable Scope
              </label>
              <select
                className="form-select"
                value={createForm.applicableTo}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    applicableTo: e.target.value as 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL',
                  })
                }
              >
                <option value="ALL">Universal (All Operations)</option>
                <option value="WALLET_TOPUP">Wallet Top-up Only</option>
                <option value="REQUIREMENT_BOOKING">Trip Requirement Booking Only</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Total Platform Usage Limit
              </label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={10000000}
                placeholder="e.g. 1000 (empty for unlimited)"
                value={createForm.usageLimitTotal || ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    usageLimitTotal: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Per User Limit * {createForm.usageLimitTotal ? `(Max: ${createForm.usageLimitTotal})` : ''}
              </label>
              <input
                type="number"
                required
                className="form-input"
                min={1}
                max={createForm.usageLimitTotal || 1000000}
                value={createForm.usageLimitPerUser}
                onChange={(e) => setCreateForm({ ...createForm, usageLimitPerUser: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Valid From Date *
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={createForm.validFrom}
                onChange={(e) => setCreateForm({ ...createForm, validFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Valid Until (Expiry Date) *
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={createForm.validUntil}
                onChange={(e) => setCreateForm({ ...createForm, validUntil: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Drawer>

      {/* EDIT COUPON DRAWER */}
      <Drawer
        isOpen={!!editingCoupon}
        onClose={() => !submitting && setEditingCoupon(null)}
        title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Edit Coupon'}
        subtitle="Update coupon rules, discount caps, applicability, and validity dates"
        icon={<Tag size={18} />}
        width="min(94vw, 620px)"
        closeOnBackdrop={!submitting}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', width: '100%' }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setEditingCoupon(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="edit-coupon-form" variant="primary" size="md" isLoading={submitting}>
              Save Changes
            </Button>
          </div>
        }
      >
        <form id="edit-coupon-form" onSubmit={handleUpdateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Promo Title *
            </label>
            <input
              type="text"
              required
              className="form-input"
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Description
            </label>
            <input
              type="text"
              className="form-input"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Discount Type
              </label>
              <select
                className="form-select"
                value={editForm.discountType}
                onChange={(e) =>
                  setEditForm({ ...editForm, discountType: e.target.value as 'PERCENTAGE' | 'FLAT' })
                }
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Discount Value
              </label>
              <input
                type="number"
                className="form-input"
                min={0.01}
                step="0.01"
                value={editForm.discountValue || ''}
                onChange={(e) => setEditForm({ ...editForm, discountValue: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Max Cap (₹)
              </label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={99999999}
                value={editForm.maxDiscountAmount || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Min Order Spend (₹)
              </label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={99999999}
                value={editForm.minOrderAmount ?? 0}
                onChange={(e) => setEditForm({ ...editForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Applicable Scope
              </label>
              <select
                className="form-select"
                value={editForm.applicableTo}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    applicableTo: e.target.value as 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL',
                  })
                }
              >
                <option value="ALL">Universal (All Operations)</option>
                <option value="WALLET_TOPUP">Wallet Top-up Only</option>
                <option value="REQUIREMENT_BOOKING">Trip Requirement Booking Only</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.95rem' }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Valid From Date
              </label>
              <input
                type="date"
                className="form-input"
                value={editForm.validFrom || ''}
                onChange={(e) => setEditForm({ ...editForm, validFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Valid Until (Expiry Date)
              </label>
              <input
                type="date"
                className="form-input"
                value={editForm.validUntil || ''}
                onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Drawer>

      {/* REDEMPTIONS AUDIT DRAWER */}
      <Drawer
        isOpen={!!selectedRedemptionsCoupon}
        onClose={() => setSelectedRedemptionsCoupon(null)}
        title={selectedRedemptionsCoupon ? `Redemption Audit Logs: ${selectedRedemptionsCoupon.code}` : 'Redemption Audit Logs'}
        subtitle="Real-time server-side ledger of promo claims and applied discounts"
        icon={<CheckCircle2 size={18} />}
        width="min(95vw, 760px)"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setSelectedRedemptionsCoupon(null)}>
              Close
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: '0.85rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
          Real-time server-side ledger of all user claims for promo code{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{selectedRedemptionsCoupon?.code}</strong>.
        </div>

        {loadingRedemptions ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading redemption history...
          </div>
        ) : redemptions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No redemptions recorded yet for this coupon.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>CONTEXT / REF ID</th>
                  <th>ORDER VALUE</th>
                  <th>DISCOUNT APPLIED</th>
                  <th>FINAL PAID</th>
                  <th>DATE &amp; TIME</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{r.userName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 400 }}>{r.userPhone}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          padding: '0.125rem 0.4rem',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {r.referenceType}: {r.referenceId.slice(0, 14)}...
                      </span>
                    </td>
                    <td>₹{r.orderAmount.toFixed(2)}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                      - ₹{r.discountAmount.toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{r.finalAmount.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {new Date(r.redeemedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Drawer>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deletingCoupon}
        onClose={() => !submitting && setDeletingCoupon(null)}
        onConfirm={handleDeleteCoupon}
        variant="danger"
        isLoading={submitting}
        title="Confirm Coupon Deletion"
        subtitle="Promotional campaign safeguard"
        description={
          deletingCoupon ? (
            <div>
              Are you sure you want to delete coupon{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{deletingCoupon.code}</strong>?
              <div style={{ marginTop: '0.45rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Note: If this coupon has past transaction claims, it will be safely deactivated instead of deleted to protect ledger integrity.
              </div>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel="Confirm Delete"
      />
    </div>
  );
}
