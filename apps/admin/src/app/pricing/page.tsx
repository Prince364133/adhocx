'use client';

import React, { useState } from 'react';
import {
  PageHeader,
  MetricCard,
  Card,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

interface RateCard {
  id: string;
  vehicleType: string;
  categoryLabel: string;
  icon: string;
  seatingCapacity: string;
  description: string;
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  driverSharePercent: number;
  platformFeePercent: number;
  surgeMultiplier: number;
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

const INITIAL_RATE_CARDS: RateCard[] = [
  {
    id: 'rc-sedan',
    vehicleType: 'SEDAN',
    categoryLabel: 'Prime Sedan',
    icon: '🚗',
    seatingCapacity: '4 + 1 Passengers',
    description: 'Compact & executive 4-seater sedans (Dzire, Aura, Etios, Tigor)',
    baseFare: 800,
    baseKm: 40,
    perKmRate: 14.5,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
    status: 'ACTIVE',
    updatedAt: '2026-08-15',
  },
  {
    id: 'rc-suv',
    vehicleType: 'SUV',
    categoryLabel: 'Fleet SUV & MUV',
    icon: '🚙',
    seatingCapacity: '6 + 1 Passengers',
    description: '6-7 seater commercial SUVs (Innova Crysta, Ertiga, Carens, Marazzo)',
    baseFare: 1400,
    baseKm: 40,
    perKmRate: 19.0,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
    status: 'ACTIVE',
    updatedAt: '2026-08-15',
  },
  {
    id: 'rc-tempo',
    vehicleType: 'TEMPO_TRAVELLER',
    categoryLabel: 'Tempo Mini Coach',
    icon: '🚐',
    seatingCapacity: '12 - 16 Passengers',
    description: '12-16 seater minibuses for corporate team transport & pilgrimages',
    baseFare: 3200,
    baseKm: 80,
    perKmRate: 28.0,
    driverSharePercent: 88,
    platformFeePercent: 12,
    surgeMultiplier: 1.0,
    status: 'ACTIVE',
    updatedAt: '2026-08-01',
  },
  {
    id: 'rc-bus',
    vehicleType: 'BUS',
    categoryLabel: 'Commercial Coach Bus',
    icon: '🚌',
    seatingCapacity: '24 - 40 Passengers',
    description: '24-40 seater commercial coaches with pushback seating & luggage hold',
    baseFare: 6500,
    baseKm: 100,
    perKmRate: 45.0,
    driverSharePercent: 88,
    platformFeePercent: 12,
    surgeMultiplier: 1.0,
    status: 'ACTIVE',
    updatedAt: '2026-07-20',
  },
];

export default function PricingPage() {
  const [rateCards, setRateCards] = useState<RateCard[]>(INITIAL_RATE_CARDS);
  const [selectedCard, setSelectedCard] = useState<RateCard | null>(null);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    setRateCards((prev) =>
      prev.map((rc) => (rc.id === editingCard.id ? editingCard : rc))
    );
    setAlert({
      type: 'success',
      message: `Tariff schedule for ${editingCard.categoryLabel} updated successfully!`,
    });
    setEditingCard(null);
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
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
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
          icon="🚗"
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Avg Take Rate"
          value="10.5%"
          subtext="Retained by AdhocX Platform"
          icon="💰"
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Dynamic Surge Multiplier"
          value="1.0x"
          subtext="Normal operational baseline"
          icon="⚡"
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Tolls & Parking"
          value="100% Actuals"
          subtext="Pass-through with receipt upload"
          icon="🧾"
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

        <DataTable<RateCard>
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
                      fontSize: '1.25rem',
                    }}
                  >
                    {rc.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {rc.categoryLabel}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {rc.seatingCapacity}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              header: 'SPECS & EXAMPLES',
              accessor: (rc) => (
                <div style={{ maxWidth: '280px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {rc.description}
                </div>
              ),
            },
            {
              header: 'BASE FARE (INCL. KM)',
              accessor: (rc) => (
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
              accessor: (rc) => (
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--brand-primary)' }}>
                  ₹ {rc.perKmRate.toFixed(2)} / km
                </div>
              ),
            },
            {
              header: 'PLATFORM TAKE-RATE',
              accessor: (rc) => (
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
                    {rc.platformFeePercent}%
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Driver: {rc.driverSharePercent}%
                  </div>
                </div>
              ),
            },
            {
              header: 'STATUS',
              accessor: (rc) => <StatusBadge status={rc.status} />,
            },
            {
              header: 'ACTIONS',
              align: 'right',
              accessor: (rc) => (
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
          keyExtractor={(rc) => rc.id}
          onRowClick={(rc) => setSelectedCard(rc)}
        />
      </Card>

      {/* Edit Rate Card Drawer */}
      <Drawer
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        title={editingCard ? `Edit Tariff: ${editingCard.categoryLabel}` : 'Edit Tariff'}
        subtitle={editingCard ? `Category Code: ${editingCard.vehicleType}` : ''}
        footer={
          editingCard ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingCard(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRate}
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
                  value={editingCard.platformFeePercent}
                  onChange={(e) => {
                    const fee = Number(e.target.value);
                    setEditingCard({
                      ...editingCard,
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
                  value={editingCard.driverSharePercent}
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
