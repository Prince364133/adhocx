'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Car,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { DistancePricingPlan, VehicleCategory } from '../../lib/api/types';
import { Card, PageHeader, FeedbackBanner, StatusBadge } from '../../components/common';

const inr = (value: number | undefined) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`;

export default function PricingOverviewPage() {
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, tierData] = await Promise.all([
        adminApi.getDistancePricingPlans(),
        adminApi.getPricingTiers().catch(() => [] as VehicleCategory[]),
      ]);
      setPlans(plansData);
      setCategories(tierData);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to load pricing configuration.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activePlan = plans.find((p) => p.status === 'ACTIVE' && p.vehicleCategory !== 'ALL') || plans.find((p) => p.status === 'ACTIVE') || null;
  const cfg = (activePlan as any)?.rateConfigJson || activePlan?.config || null;

  const hasConfig = Boolean(activePlan && cfg);
  const baseKm = cfg?.baseKm ?? 10;
  const stepKm = cfg?.stepKm ?? 10;
  const baseVendor = cfg?.baseVendorRupees ?? null;
  const stepVendor = cfg?.stepVendorRupees ?? null;
  const baseDriver = cfg?.baseDriverRupees ?? null;
  const stepDriver = cfg?.stepDriverRupees ?? null;
  const escortVendor = cfg?.escortBaseVendorRupees ?? null;

  const baseMargin = baseVendor !== null && baseDriver !== null ? baseVendor - baseDriver : 0;
  const baseMarginPct = baseVendor && baseVendor > 0 ? ((baseMargin / baseVendor) * 100).toFixed(1) : '0';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {alert && <FeedbackBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <PageHeader
            title="Pricing Studio"
            subtitle="Authoritative distance pricing and payout matrices. Select a rate card below to customize distance slabs, peak surcharges, and security escort fees."
          />
        </div>
      </div>

      {loading ? (
        <Card style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Sparkles size={24} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 0.75rem auto', color: 'var(--brand-primary)' }} />
          <div>Loading Pricing Studio from live database...</div>
        </Card>
      ) : (
        <>
          {/* Two Clean Primary Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.75rem' }}>
            {/* Box 1: Vendor Rate Card */}
            <Link href="/pricing/matrix?role=vendor" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card
                variant="interactive"
                style={{
                  height: '100%',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '20px',
                  border: '1.5px solid var(--border)',
                  background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(91, 66, 243, 0.04) 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '16px',
                        background: 'rgba(91, 66, 243, 0.12)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building2 size={26} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '0.3rem 0.7rem',
                          borderRadius: '999px',
                          background: 'rgba(91, 66, 243, 0.12)',
                          color: 'var(--brand-primary)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        CLIENT BILLING
                      </span>
                      <StatusBadge status={hasConfig ? 'APPROVED' : 'PENDING'} label={hasConfig ? 'LIVE' : 'NOT CONFIGURED'} />
                    </div>
                  </div>

                  <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Vendor Rate Card
                  </h2>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    What enterprise clients are billed for trips. Customize base starting fare, step kilometer pricing, peak window add-ons, and security escort charges.
                  </p>

                  {/* Highlights Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Starting Base Fare</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.2rem' }}>
                        {baseVendor !== null ? inr(baseVendor) : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hasConfig ? `0 to ${baseKm} km` : 'Setup required'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Step Pricing</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.2rem' }}>
                        {stepVendor !== null ? `+${inr(stepVendor)}` : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hasConfig ? `per +${stepKm} km step` : 'Setup required'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={15} color="#3B82F6" />
                    <span>Security Escort Add-on: <strong>{escortVendor !== null ? inr(escortVendor) : '—'}</strong> base</span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '2rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'var(--brand-primary)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  <span>Configure Vendor Rates</span>
                  <ChevronRight size={18} />
                </div>
              </Card>
            </Link>

            {/* Box 2: Driver Rate Card */}
            <Link href="/pricing/matrix?role=driver" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card
                variant="interactive"
                style={{
                  height: '100%',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '20px',
                  border: '1.5px solid var(--border)',
                  background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(16, 185, 129, 0.04) 100%)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div>
                  {/* Top Badge & Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '16px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--color-success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Car size={26} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '0.3rem 0.7rem',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--color-success)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        DRIVER PAYOUT
                      </span>
                      <StatusBadge status={hasConfig ? 'APPROVED' : 'PENDING'} label={hasConfig ? 'LIVE' : 'NOT CONFIGURED'} />
                    </div>
                  </div>

                  <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Driver Rate Card
                  </h2>
                  <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Guaranteed trip earnings credited to verified fleet driver partners. Fully synced to driver app with unrounded meter calculation and peak slot bonuses.
                  </p>

                  {/* Highlights Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Starting Base Payout</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                        {baseDriver !== null ? inr(baseDriver) : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hasConfig ? `0 to ${baseKm} km` : 'Setup required'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Step Increment</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                        {stepDriver !== null ? `+${inr(stepDriver)}` : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hasConfig ? `per +${stepKm} km step` : 'Setup required'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={15} color="#10B981" />
                    <span>Pure distance-based trip earnings (100% credited to driver)</span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '2rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'var(--color-success)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  <span>Configure Driver Payouts</span>
                  <ChevronRight size={18} />
                </div>
              </Card>
            </Link>
          </div>

          {/* Platform Health & Margin Strip */}
          <Card
            style={{
              padding: '1.25rem 1.75rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Platform Net Spread (Base Fare)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>+{inr(baseMargin)}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 700 }}>
                    ({baseMarginPct}% margin)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={15} color="#F59E0B" />
                <span>Active Categories: <strong>{categories.length || 'All'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} color="#10B981" />
                <span>100% Live Database Synced</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
