'use client';

import React, { useEffect, useState } from 'react';
import { Tag, Ticket, CheckCircle2, Wallet, Plus, X, AlertTriangle, Check } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  CouponListItem,
  CouponMetrics,
  CouponRedemptionItem,
  CreateCouponPayload,
  UpdateCouponPayload,
} from '../../lib/api/types';
import { Modal } from '../../components/Modal';
import { PageHeader, MetricCard, Button, FilterBar, DataTable, StatusBadge } from '../../components/common';

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadData();
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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Alert banner */}
      {alert && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}>
            {alert.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <MetricCard
          label="Total Coupons"
          value={metrics?.totalCoupons ?? 0}
          subtext="Configured promos"
          icon={<Ticket size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Active Promos"
          value={metrics?.activeCoupons ?? 0}
          subtext="Claimable by users"
          icon={<CheckCircle2 size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Total Redemptions"
          value={metrics?.totalRedemptions ?? 0}
          subtext="Trips & wallet topups"
          icon={<Tag size={18} color="#8B5CF6" />}
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Discount Disbursed"
          value={`₹ ${(metrics?.totalDiscountDisbursed ?? 0).toLocaleString('en-IN')}`}
          subtext="Platform promo savings"
          icon={<Wallet size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
      </div>

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


      {/* CREATE COUPON MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Promotional Coupon"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Coupon Code * (Uppercase)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ADHOC100, SAVE20"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Promo Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Welcome 20% Discount"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Get 20% discount on your first outstation requirement or wallet top-up"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Discount Type *
              </label>
              <select
                value={createForm.discountType}
                onChange={(e) =>
                  setCreateForm({ ...createForm, discountType: e.target.value as 'PERCENTAGE' | 'FLAT' })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Amount (₹)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                {createForm.discountType === 'PERCENTAGE' ? 'Discount Rate (%) *' : 'Flat Discount (₹) *'}
              </label>
              <input
                type="number"
                required
                min={0.01}
                max={createForm.discountType === 'PERCENTAGE' ? 100 : 100000}
                step="0.01"
                value={createForm.discountValue}
                onChange={(e) => setCreateForm({ ...createForm, discountValue: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Max Cap (₹)
              </label>
              <input
                type="number"
                min={1}
                placeholder="No max cap"
                value={createForm.maxDiscountAmount || ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Min Order Spend (₹)
              </label>
              <input
                type="number"
                min={0}
                value={createForm.minOrderAmount ?? 0}
                onChange={(e) => setCreateForm({ ...createForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Applicable Scope
              </label>
              <select
                value={createForm.applicableTo}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    applicableTo: e.target.value as 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL',
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">Universal (All Operations)</option>
                <option value="WALLET_TOPUP">Wallet Top-up Only</option>
                <option value="REQUIREMENT_BOOKING">Trip Requirement Booking Only</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Total Platform Usage Limit
              </label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 1000 (empty for unlimited)"
                value={createForm.usageLimitTotal || ''}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    usageLimitTotal: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Per User Limit *
              </label>
              <input
                type="number"
                required
                min={1}
                value={createForm.usageLimitPerUser}
                onChange={(e) => setCreateForm({ ...createForm, usageLimitPerUser: parseInt(e.target.value, 10) || 1 })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Valid From Date *
              </label>
              <input
                type="date"
                required
                value={createForm.validFrom}
                onChange={(e) => setCreateForm({ ...createForm, validFrom: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Valid Until (Expiry Date) *
              </label>
              <input
                type="date"
                required
                value={createForm.validUntil}
                onChange={(e) => setCreateForm({ ...createForm, validUntil: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT COUPON MODAL */}
      <Modal
        isOpen={!!editingCoupon}
        onClose={() => setEditingCoupon(null)}
        title={`Edit Coupon: ${editingCoupon?.code}`}
        maxWidth="680px"
      >
        <form onSubmit={handleUpdateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Promo Title *
            </label>
            <input
              type="text"
              required
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Description
            </label>
            <input
              type="text"
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Discount Type
              </label>
              <select
                value={editForm.discountType}
                onChange={(e) =>
                  setEditForm({ ...editForm, discountType: e.target.value as 'PERCENTAGE' | 'FLAT' })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Discount Value
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={editForm.discountValue || ''}
                onChange={(e) => setEditForm({ ...editForm, discountValue: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Max Cap (₹)
              </label>
              <input
                type="number"
                min={1}
                value={editForm.maxDiscountAmount || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Min Order Spend (₹)
              </label>
              <input
                type="number"
                min={0}
                value={editForm.minOrderAmount ?? 0}
                onChange={(e) => setEditForm({ ...editForm, minOrderAmount: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Applicable Scope
              </label>
              <select
                value={editForm.applicableTo}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    applicableTo: e.target.value as 'WALLET_TOPUP' | 'REQUIREMENT_BOOKING' | 'ALL',
                  })
                }
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ALL">Universal (All Operations)</option>
                <option value="WALLET_TOPUP">Wallet Top-up Only</option>
                <option value="REQUIREMENT_BOOKING">Trip Requirement Booking Only</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Valid From Date
              </label>
              <input
                type="date"
                value={editForm.validFrom || ''}
                onChange={(e) => setEditForm({ ...editForm, validFrom: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Valid Until (Expiry Date)
              </label>
              <input
                type="date"
                value={editForm.validUntil || ''}
                onChange={(e) => setEditForm({ ...editForm, validUntil: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setEditingCoupon(null)}
              style={{
                padding: '0.625rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REDEMPTIONS AUDIT MODAL */}
      <Modal
        isOpen={!!selectedRedemptionsCoupon}
        onClose={() => setSelectedRedemptionsCoupon(null)}
        title={`Redemption Audit Logs: ${selectedRedemptionsCoupon?.code}`}
        maxWidth="850px"
      >
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
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
          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>USER</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>CONTEXT / REF ID</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>ORDER VALUE</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>DISCOUNT APPLIED</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>FINAL PAID</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>DATE & TIME</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{r.userName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{r.userPhone}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          padding: '0.125rem 0.375rem',
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderRadius: '4px',
                        }}
                      >
                        {r.referenceType}: {r.referenceId.slice(0, 14)}...
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>₹{r.orderAmount.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-success)', fontWeight: 700 }}>
                      - ₹{r.discountAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>₹{r.finalAmount.toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {new Date(r.redeemedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingCoupon}
        onClose={() => setDeletingCoupon(null)}
        title="Confirm Coupon Deletion"
        maxWidth="480px"
      >
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Are you sure you want to delete coupon <strong style={{ color: 'var(--text-primary)' }}>{deletingCoupon?.code}</strong>?
          <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Note: If this coupon has past transaction claims, it will be safely deactivated instead of deleted to protect ledger integrity.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setDeletingCoupon(null)}
            style={{
              padding: '0.625rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDeleteCoupon}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--danger)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
