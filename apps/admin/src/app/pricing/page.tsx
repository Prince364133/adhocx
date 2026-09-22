'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Truck,
  Bus,
  Percent,
  Zap,
  Receipt,
  X,
  Sliders,
  Calculator,
  ShieldAlert,
  Save,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Wallet,
  Award,
  Plus,
  Trash2,
  Bike,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { RateCard, SystemPolicyConfig } from '../../lib/api/types';
import {
  PageHeader,
  MetricCard,
  Card,
  DataTable,
  Button,
  Drawer,
} from '../../components/common';

export default function PricingPage() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [policyConfig, setPolicyConfig] = useState<SystemPolicyConfig>({
    driverMonthlyFee: 499,
    driverTrialDays: 15,
    minWithdrawalAmount: 1000,
    convenienceFeePercent: 2.5,
    gstPercent: 5.0,
  });
  const [loading, setLoading] = useState(true);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<RateCard | null>(null);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Category State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    vehicleType: '',
    categoryLabel: '',
    seatingCapacity: '4 + 1 Passengers',
    description: '',
    iconKey: 'car',
    baseFare: 400,
    baseKm: 10,
    perKmRate: 15,
    perMinuteRate: 0,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
  });

  // Rate Simulator State
  const [simVehicleType, setSimVehicleType] = useState<string>('SEDAN');
  const [simDistanceKm, setSimDistanceKm] = useState<number>(35);
  const [simQuantity, setSimQuantity] = useState<number>(1);

  useEffect(() => {
    loadAllData();
  }, []);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.vehicleType.trim() || !newCategory.categoryLabel.trim()) {
      setAlert({ type: 'error', message: 'Vehicle type identifier and display label are required' });
      return;
    }

    setCreatingCategory(true);
    try {
      const created = await adminApi.createPricingTier({
        vehicleType: newCategory.vehicleType.trim().toUpperCase().replace(/\s+/g, '_'),
        categoryLabel: newCategory.categoryLabel.trim(),
        seatingCapacity: newCategory.seatingCapacity.trim(),
        description: newCategory.description.trim() || `${newCategory.categoryLabel} service`,
        iconKey: newCategory.iconKey,
        baseFare: Number(newCategory.baseFare),
        baseKm: Number(newCategory.baseKm),
        perKmRate: Number(newCategory.perKmRate),
        perMinuteRate: Number(newCategory.perMinuteRate || 0),
        driverSharePercent: Number(newCategory.driverSharePercent || 90),
        platformFeePercent: Number(newCategory.platformFeePercent || 10),
        surgeMultiplier: Number(newCategory.surgeMultiplier || 1.0),
      });

      setAlert({
        type: 'success',
        message: `Vehicle category '${created.categoryLabel || created.vehicleType}' registered and active in PostgreSQL!`,
      });
      setIsAddCategoryOpen(false);
      setNewCategory({
        vehicleType: '',
        categoryLabel: '',
        seatingCapacity: '4 + 1 Passengers',
        description: '',
        iconKey: 'car',
        baseFare: 400,
        baseKm: 10,
        perKmRate: 15,
        perMinuteRate: 0,
        driverSharePercent: 90,
        platformFeePercent: 10,
        surgeMultiplier: 1.0,
      });
      loadAllData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to create vehicle category' });
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleDeleteCategory(vehicleType: string) {
    if (!confirm(`Are you sure you want to delete vehicle category '${vehicleType}'? This will remove it from the authoritative database.`)) {
      return;
    }

    try {
      await adminApi.deletePricingTier(vehicleType);
      setAlert({
        type: 'success',
        message: `Vehicle category '${vehicleType}' was deleted successfully from the database.`,
      });
      loadAllData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete vehicle category' });
    }
  }

  async function loadAllData() {
    setLoading(true);
    try {
      const [tiers, policy] = await Promise.all([
        adminApi.getPricingTiers().catch(() => [] as RateCard[]),
        adminApi.getPolicyConfig().catch(() => null),
      ]);
      setRateCards(Array.isArray(tiers) ? tiers : []);
      if (policy) {
        setPolicyConfig({
          driverMonthlyFee: Number(policy.driverMonthlyFee ?? 499),
          driverTrialDays: Number(policy.driverTrialDays ?? 15),
          minWithdrawalAmount: Number(policy.minWithdrawalAmount ?? 1000),
          convenienceFeePercent: Number(policy.convenienceFeePercent ?? 2.5),
          gstPercent: Number(policy.gstPercent ?? 5.0),
          updatedAt: policy.updatedAt,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const updated = await adminApi.updatePolicyConfig({
        driverMonthlyFee: Number(policyConfig.driverMonthlyFee),
        driverTrialDays: Number(policyConfig.driverTrialDays),
        minWithdrawalAmount: Number(policyConfig.minWithdrawalAmount),
        convenienceFeePercent: Number(policyConfig.convenienceFeePercent),
        gstPercent: Number(policyConfig.gstPercent),
      });
      setPolicyConfig(updated);
      setAlert({
        type: 'success',
        message: 'System policy configuration & driver subscription rates updated successfully in database!',
      });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update system policy configuration' });
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    setSaving(true);
    try {
      const platformFee = Number(editingCard.platformFeePercent ?? editingCard.platformFeePercentage ?? 10);
      const driverShare = Number(editingCard.driverSharePercent ?? editingCard.driverSharePercentage ?? 100 - platformFee);

      await adminApi.updatePricingTier(editingCard.vehicleType, {
        baseFare: Number(editingCard.baseFare),
        baseKm: Number(editingCard.baseKm),
        perKmRate: Number(editingCard.perKmRate),
        perMinuteRate: Number(editingCard.perMinuteRate || 0),
        minimumFare: Number(editingCard.minimumFare || editingCard.baseFare),
        platformFeePercent: platformFee,
        platformFeePercentage: platformFee,
        driverSharePercent: driverShare,
        driverSharePercentage: driverShare,
        surgeMultiplier: Number(editingCard.surgeMultiplier || 1.0),
      });

      setAlert({
        type: 'success',
        message: `Tariff schedule for ${editingCard.displayName || editingCard.categoryLabel || editingCard.vehicleType} updated successfully!`,
      });
      setEditingCard(null);
      loadAllData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update pricing tier' });
    } finally {
      setSaving(false);
    }
  }

  // Simulation calculation helper
  const selectedTier = rateCards.find((r) => r.vehicleType === simVehicleType) || rateCards[0];
  const simCalc = React.useMemo(() => {
    if (!selectedTier) return null;
    const baseFare = Number(selectedTier.baseFare || 0);
    const baseKm = Number(selectedTier.baseKm || 0);
    const perKmRate = Number(selectedTier.perKmRate || 0);
    const surge = Number(selectedTier.surgeMultiplier || 1.0);
    const platformFeePercent = Number(selectedTier.platformFeePercent ?? selectedTier.platformFeePercentage ?? 10);

    const extraKm = Math.max(0, simDistanceKm - baseKm);
    const singleVehicleFare = Math.round((baseFare + extraKm * perKmRate) * surge);
    const totalGrossFare = singleVehicleFare * simQuantity;
    const platformTake = Math.round((totalGrossFare * platformFeePercent) / 100);
    const driverPayout = totalGrossFare - platformTake;
    const driverPayoutPerUnit = Math.round(driverPayout / simQuantity);

    return {
      baseKm,
      extraKm,
      singleVehicleFare,
      totalGrossFare,
      platformTake,
      driverPayout,
      driverPayoutPerUnit,
      perKmRate,
      surge,
      platformFeePercent,
    };
  }, [selectedTier, simDistanceKm, simQuantity]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Authoritative Database Rates & Platform Policy"
        subtitle="Manage single-source-of-truth per-km tariffs, driver monthly subscriptions, 15-day free trials, and minimum withdrawal thresholds"
        liveStatus="Database Dynamic Engine Active"
      />

      {/* Pricing Top Level Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Database Rate Cards"
          value={rateCards.length}
          subtext="Authoritative single source of truth"
          icon={<Car size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Driver Subscription"
          value={`₹ ${policyConfig.driverMonthlyFee}/mo`}
          subtext={`${policyConfig.driverTrialDays}-day free trial included`}
          icon={<Award size={18} color="#8B5CF6" />}
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Min Withdrawal Threshold"
          value={`₹ ${policyConfig.minWithdrawalAmount}`}
          subtext="Enforced on driver payouts"
          icon={<Wallet size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Avg Take Rate"
          value="10.0%"
          subtext="Platform commission share"
          icon={<Percent size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Policy Settings & Rate Simulator Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Policy Settings Card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(91, 66, 243, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sliders size={18} color="var(--brand-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Platform Policy & Driver Subscriptions
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                Globally enforced business rules for driver onboarding, paywalls, and settlements
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  Driver Monthly Fee (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={policyConfig.driverMonthlyFee}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, driverMonthlyFee: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Debited monthly from wallet</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  Free Trial Duration (Days) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={policyConfig.driverTrialDays}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, driverTrialDays: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>New driver grace period</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  Minimum Withdrawal (₹) *
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={policyConfig.minWithdrawalAmount}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, minWithdrawalAmount: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Min wallet threshold (₹1,000)</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  Convenience Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={policyConfig.convenienceFeePercent}
                  onChange={(e) => setPolicyConfig({ ...policyConfig, convenienceFeePercent: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payment gateway markup</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {policyConfig.updatedAt ? `Last saved: ${new Date(policyConfig.updatedAt).toLocaleString()}` : 'Default policy loaded'}
              </span>
              <Button variant="primary" size="sm" type="submit" isLoading={savingPolicy}>
                Save Policy Settings
              </Button>
            </div>
          </form>
        </Card>

        {/* Real-time Rate Simulation Calculator Card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calculator size={18} color="var(--color-success)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Live Database Tariff Simulator
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                Test real-time mathematical fare generation against the active database rate card
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  Vehicle Class
                </label>
                <select
                  value={simVehicleType}
                  onChange={(e) => setSimVehicleType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                  }}
                >
                  {rateCards.map((r) => (
                    <option key={r.vehicleType} value={r.vehicleType}>
                      {r.displayName || r.categoryLabel || r.vehicleType} (₹{r.perKmRate}/km)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  Trip Distance (KM)
                </label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={simDistanceKm}
                  onChange={(e) => setSimDistanceKm(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>
            </div>

            {/* Live Calculation Output Box */}
            {simCalc && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(91, 66, 243, 0.05)',
                  border: '1px solid rgba(91, 66, 243, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Formula Breakdown:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Base (₹{selectedTier?.baseFare} / {simCalc.baseKm}km) + {simCalc.extraKm}km × ₹{simCalc.perKmRate}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Customer Booking Price:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                    ₹ {simCalc.totalGrossFare.toLocaleString('en-IN')} {simQuantity > 1 ? `(${simQuantity}x @ ₹${simCalc.singleVehicleFare})` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Platform Commission ({simCalc.platformFeePercent}%):</span>
                  <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
                    ₹ {simCalc.platformTake.toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(91, 66, 243, 0.3)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Net Driver Earnings Payout:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '1.0625rem' }}>
                    ₹ {simCalc.driverPayout.toLocaleString('en-IN')} {simQuantity > 1 ? `(₹${simCalc.driverPayoutPerUnit} / driver)` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Vehicle Rate Cards DataTable */}
      <Card>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Commercial Vehicle Rate Cards (PostgreSQL Authoritative Source)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              All requirement fare estimations, driver matching cards, and completion payouts compute from these database records
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
              ● Dynamic DB Sync Active
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddCategoryOpen(true)}
            >
              <Plus size={15} style={{ marginRight: '0.375rem' }} />
              Add Vehicle Category
            </Button>
          </div>
        </div>

        <DataTable
          columns={[
            {
              header: 'VEHICLE CLASS',
              accessor: (rc) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(91, 66, 243, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {rc.vehicleType === 'BIKE' || rc.iconKey === 'bike' ? (
                      <Bike size={20} color="#F59E0B" />
                    ) : rc.vehicleType === 'BUS' || rc.iconKey === 'bus' ? (
                      <Bus size={20} color="#10B981" />
                    ) : rc.vehicleType === 'TEMPO_TRAVELLER' || rc.vehicleType === 'TATA_ACE' || rc.vehicleType === 'PICKUP_TRUCK' || rc.iconKey === 'truck' ? (
                      <Truck size={20} color="#8B5CF6" />
                    ) : rc.vehicleType === 'SUV' ? (
                      <Car size={20} color="#2563EB" />
                    ) : (
                      <Car size={20} color="var(--brand-primary)" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {rc.displayName || rc.categoryLabel || rc.vehicleType}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {rc.description || rc.vehicleType}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              header: 'BASE FARE (INCL. KM)',
              accessor: (rc: RateCard) => (
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    ₹ {(rc.baseFare || 0).toLocaleString('en-IN')}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    First {rc.baseKm || 0} km included
                  </div>
                </div>
              ),
            },
            {
              header: 'PER KM TARIFF',
              accessor: (rc: RateCard) => (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--brand-primary)' }}>
                    ₹ {typeof rc.perKmRate === 'number' ? rc.perKmRate.toFixed(2) : (rc.perKmRate || '0.00')} / km
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Min fare: ₹ {rc.minimumFare || rc.baseFare}
                  </div>
                </div>
              ),
            },
            {
              header: 'PER MINUTE RATE',
              accessor: (rc: RateCard) => (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  ₹ {typeof rc.perMinuteRate === 'number' ? rc.perMinuteRate.toFixed(2) : '0.00'} / min
                </div>
              ),
            },
            {
              header: 'PLATFORM TAKE-RATE',
              accessor: (rc: RateCard) => {
                const platformFee = rc.platformFeePercent ?? rc.platformFeePercentage ?? 10;
                const driverShare = rc.driverSharePercent ?? rc.driverSharePercentage ?? (100 - platformFee);
                return (
                  <div>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(91, 66, 243, 0.12)',
                        color: 'var(--brand-primary)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {platformFee}%
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Driver: {driverShare}%
                    </div>
                  </div>
                );
              },
            },
            {
              header: 'ACTIONS',
              align: 'right',
              accessor: (rc: RateCard) => (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCard({ ...rc });
                    }}
                  >
                    Edit Tariff
                  </Button>
                  {!['SEDAN', 'SUV', 'HATCHBACK'].includes(rc.vehicleType) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(rc.vehicleType);
                      }}
                      style={{
                        padding: '0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Delete ${rc.vehicleType} category`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={rateCards}
          keyExtractor={(rc) => rc.vehicleType}
          loading={loading}
          onRowClick={(rc) => setSelectedCard(rc)}
          emptyTitle="No pricing rate cards found"
          emptySubtitle="System default rate cards will load here."
        />
      </Card>

      {/* Edit Rate Card Drawer */}
      <Drawer
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        title={editingCard ? `Edit Tariff: ${editingCard.displayName || editingCard.vehicleType}` : 'Edit Tariff'}
        subtitle={editingCard ? `Database Vehicle Tier: ${editingCard.vehicleType}` : ''}
        footer={
          editingCard ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCard(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRate}
                isLoading={saving}
              >
                Save Rate Schedule
              </Button>
            </div>
          ) : null
        }
      >
        {editingCard && (
          <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Base Fare (INR) *
              </label>
              <input
                type="number"
                value={editingCard.baseFare}
                onChange={(e) => setEditingCard({ ...editingCard, baseFare: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Included Base Kilometers *
              </label>
              <input
                type="number"
                value={editingCard.baseKm}
                onChange={(e) => setEditingCard({ ...editingCard, baseKm: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Per Kilometer Rate (INR/km) *
              </label>
              <input
                type="number"
                step="0.5"
                value={editingCard.perKmRate}
                onChange={(e) => setEditingCard({ ...editingCard, perKmRate: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  Platform Take Rate (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editingCard.platformFeePercent ?? editingCard.platformFeePercentage ?? 10}
                  onChange={(e) => {
                    const fee = Number(e.target.value);
                    setEditingCard({
                      ...editingCard,
                      platformFeePercent: fee,
                      platformFeePercentage: fee,
                      driverSharePercent: 100 - fee,
                      driverSharePercentage: 100 - fee,
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                  Driver Share (%)
                </label>
                <input
                  type="number"
                  disabled
                  value={editingCard.driverSharePercent ?? editingCard.driverSharePercentage ?? 90}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>
          </form>
        )}
      </Drawer>

      {/* Add New Vehicle Category Drawer */}
      <Drawer
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        title="Add Vehicle Category & Tariff Schedule"
        subtitle="Register a new commercial vehicle class in PostgreSQL"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddCategoryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCategory}
              isLoading={creatingCategory}
            >
              Register Category
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
              Vehicle Class Identifier (Slug / Code) *
            </label>
            <input
              type="text"
              placeholder="e.g. BIKE, AUTO, ELECTRIC_SEDAN"
              value={newCategory.vehicleType}
              onChange={(e) => setNewCategory({ ...newCategory, vehicleType: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unique system key (auto uppercase)</span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
              Category Display Label *
            </label>
            <input
              type="text"
              placeholder="e.g. Moto Bike Express, Auto Rickshaw"
              value={newCategory.categoryLabel}
              onChange={(e) => setNewCategory({ ...newCategory, categoryLabel: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Seating / Capacity *
              </label>
              <input
                type="text"
                placeholder="e.g. 1 Rider, 3 Passengers"
                value={newCategory.seatingCapacity}
                onChange={(e) => setNewCategory({ ...newCategory, seatingCapacity: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Icon Badge
              </label>
              <select
                value={newCategory.iconKey}
                onChange={(e) => setNewCategory({ ...newCategory, iconKey: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="bike">Bike / Two-Wheeler (🏍️)</option>
                <option value="car">Car / Sedan (🚗)</option>
                <option value="truck">Truck / Logistics (🚚)</option>
                <option value="bus">Bus / Coach (🚌)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
              Description & Sample Models
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Rapid two-wheeler city transit (Splendor, Activa, Pulsar)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Base Fare (₹) *
              </label>
              <input
                type="number"
                min="0"
                value={newCategory.baseFare}
                onChange={(e) => setNewCategory({ ...newCategory, baseFare: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Included Base KM *
              </label>
              <input
                type="number"
                min="0"
                value={newCategory.baseKm}
                onChange={(e) => setNewCategory({ ...newCategory, baseKm: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Per KM Tariff (₹/km) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={newCategory.perKmRate}
                onChange={(e) => setNewCategory({ ...newCategory, perKmRate: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--brand-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                Platform Take-Rate (%) *
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={newCategory.platformFeePercent}
                onChange={(e) => {
                  const fee = Number(e.target.value);
                  setNewCategory({
                    ...newCategory,
                    platformFeePercent: fee,
                    driverSharePercent: 100 - fee,
                  });
                }}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
                required
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>
                Driver payout: {newCategory.driverSharePercent}%
              </span>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
