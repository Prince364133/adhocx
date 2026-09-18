'use client';

import React, { useState, useEffect } from 'react';
import { Car, Truck, Bus, Percent, Zap, Receipt, X } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { RateCard } from '../../lib/api/types';
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
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<RateCard | null>(null);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadRateCards();
  }, []);

  async function loadRateCards() {
    setLoading(true);
    try {
      const data = await adminApi.getPricingTiers().catch(() => [] as RateCard[]);
      setRateCards(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    setSaving(true);
    try {
      await adminApi.updatePricingTier(editingCard.vehicleType, {
        baseFare: Number(editingCard.baseFare),
        baseKm: Number(editingCard.baseKm),
        perKmRate: Number(editingCard.perKmRate),
        perMinuteRate: Number(editingCard.perMinuteRate),
        minimumFare: Number(editingCard.minimumFare),
        platformFeePercentage: Number(editingCard.platformFeePercentage),
        driverSharePercentage: Number(editingCard.driverSharePercentage),
        surgeMultiplier: Number(editingCard.surgeMultiplier),
      });

      setAlert({
        type: 'success',
        message: `Tariff schedule for ${editingCard.displayName || editingCard.vehicleType} updated successfully!`,
      });
      setEditingCard(null);
      loadRateCards();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update pricing tier' });
    } finally {
      setSaving(false);
    }
  }

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
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--color-success)',
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
        title="Marketplace Pricing & Commission Schedules"
        subtitle="Configure baseline vehicle rates, per-kilometer tariffs, peak surge algorithms, and platform take-rates"
        liveStatus="Dynamic Tariff Engine Active"
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
          label="Active Vehicle Tariffs"
          value={rateCards.length}
          subtext="Sedan, SUV, Tempo, Bus"
          icon={<Car size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Avg Take Rate"
          value="10.5%"
          subtext="Retained by AdhocX Platform"
          icon={<Percent size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Dynamic Surge Multiplier"
          value="1.0x"
          subtext="Normal operational baseline"
          icon={<Zap size={18} color="#8B5CF6" />}
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Tolls & Parking"
          value="100% Actuals"
          subtext="Pass-through with receipt upload"
          icon={<Receipt size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Vehicle Rate Cards DataTable */}
      <Card>
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Commercial Vehicle Rate Cards
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Base fares include first tier mileage and driver waiting time allowance
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Last revised: August 15, 2026
          </span>
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
                    {rc.vehicleType === 'BUS' ? (
                      <Bus size={20} color="#10B981" />
                    ) : rc.vehicleType === 'TEMPO_TRAVELLER' ? (
                      <Truck size={20} color="#8B5CF6" />
                    ) : rc.vehicleType === 'SUV' ? (
                      <Car size={20} color="#2563EB" />
                    ) : (
                      <Car size={20} color="var(--brand-primary)" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {rc.displayName || rc.vehicleType}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {rc.vehicleType}
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
                    ₹ {rc.baseFare.toLocaleString('en-IN')}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    First {rc.baseKm} km included
                  </div>
                </div>
              ),
            },
            {
              header: 'PER KM TARIFF',
              accessor: (rc: RateCard) => (
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--brand-primary)' }}>
                  ₹ {rc.perKmRate.toFixed(2)} / km
                </div>
              ),
            },
            {
              header: 'PER MINUTE RATE',
              accessor: (rc: RateCard) => (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  ₹ {rc.perMinuteRate ? rc.perMinuteRate.toFixed(2) : '0.00'} / min
                </div>
              ),
            },
            {
              header: 'PLATFORM TAKE-RATE',
              accessor: (rc: RateCard) => (
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
                    {rc.platformFeePercentage}%
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Driver: {rc.driverSharePercentage}%
                  </div>
                </div>
              ),
            },
            {
              header: 'ACTIONS',
              align: 'right',
              accessor: (rc: RateCard) => (
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
        subtitle={editingCard ? `Category Code: ${editingCard.vehicleType}` : ''}
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
                  value={editingCard.platformFeePercentage}
                  onChange={(e) => {
                    const fee = Number(e.target.value);
                    setEditingCard({
                      ...editingCard,
                      platformFeePercentage: fee,
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
                  value={editingCard.driverSharePercentage}
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
    </div>
  );
}
