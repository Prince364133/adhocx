import React, { useState } from 'react';

interface VehicleTier {
  id: string;
  name: string;
  category: string;
  models: string;
  useCase: string;
  features: string[];
  specs: { label: string; value: string }[];
}

function VehicleIcon({ type, isSelected }: { type: string; isSelected: boolean }) {
  const stroke = isSelected ? '#5A30B0' : '#64748b';
  if (type === 'suv' || type.includes('muv') || type.includes('6') || type.includes('7')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block' }}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2 10.9 2 11 2 11.2V16c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    );
  }
  if (type === 'innova' || type.includes('executive')) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block' }}>
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
        <circle cx="6.5" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block' }}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

const VEHICLE_TIERS: VehicleTier[] = [
  {
    id: 'sedan',
    name: 'Compact Sedan',
    category: 'Commercial 4-Seater',
    models: 'Maruti Dzire • Toyota Etios • Hyundai Aura',
    useCase: 'Daily corporate tech park shift transit, manager duties, and airport transfers',
    features: [
      'Pre-scheduled confirmed corporate pickup & drop rosters',
      'Direct in-app route dispatch with transparent drop details',
      'Instant settlement to registered bank account or UPI on demand',
      'Milestone program with unlocked performance rewards in app'
    ],
    specs: [
      { label: 'Passenger Capacity', value: '4 Passengers' },
      { label: 'Vehicle Compliance', value: 'Yellow-Plate Commercial' },
      { label: 'Permit Scope', value: 'Hyderabad & Telangana' },
      { label: 'Settlement Speed', value: 'Direct Bank / UPI' }
    ]
  },
  {
    id: 'muv',
    name: '6/7-Seater MUV',
    category: 'Commercial 6 & 7-Seater',
    models: 'Maruti Ertiga • Maruti XL6 • Kia Carens',
    useCase: 'Shared corporate team clusters, executive office runs, and airport transit',
    features: [
      'High-demand shared employee shift clusters across IT corridors',
      'Consistent multi-passenger duty schedules',
      'Real-time automated digital duty slips and passenger OTP verification',
      'Dedicated driver helpline in Telugu, Hindi, and English'
    ],
    specs: [
      { label: 'Passenger Capacity', value: '6-7 Passengers' },
      { label: 'Vehicle Compliance', value: 'Yellow-Plate Commercial' },
      { label: 'Air Conditioning', value: 'Rear Roof-Mounted Vents' },
      { label: 'Settlement Speed', value: 'Direct Bank / UPI' }
    ]
  },
  {
    id: 'innova',
    name: 'Executive SUV',
    category: 'Executive 7-Seater',
    models: 'Toyota Innova Crysta • Toyota Hycross',
    useCase: 'VIP corporate delegations, business roadshows, and premium airport duties',
    features: [
      'Executive corporate reservations and dedicated client itineraries',
      'Priority assignment for top-rated commercial chauffeurs',
      'Group accidental insurance coverage while on duty',
      'Automated digital trip logging and fast bank transfers'
    ],
    specs: [
      { label: 'Passenger Capacity', value: '7 Passengers' },
      { label: 'Vehicle Compliance', value: 'Executive Yellow-Plate' },
      { label: 'Comfort Class', value: 'Climate Control & Captain Seats' },
      { label: 'Settlement Speed', value: 'Direct Bank / UPI' }
    ]
  }
];

export default function EarningsCalculator() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('sedan');
  const activeTier = VEHICLE_TIERS.find((v) => v.id === selectedVehicle) || VEHICLE_TIERS[0];

  return (
    <div style={{
      background: 'var(--color-surface, #ffffff)',
      border: '1px solid var(--color-border, #e2e8f0)',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1))',
      color: 'var(--color-text, #0f172a)'
    }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          background: 'var(--color-primary-50, #F6F3FF)',
          color: 'var(--color-primary-700, #5A30B0)',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '4px 12px',
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          Commercial Fleet & Driver Features
        </span>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--color-primary-900, #1B0E38)' }}>
          Commercial Vehicles & In-App Benefits
        </h3>
        <p style={{ color: 'var(--color-text-secondary, #64748b)', fontSize: '0.95rem', margin: 0 }}>
          Explore dedicated vehicle categories, transparent direct bank payouts, and operational support built into the AdhocX Driver App.
        </p>
      </div>

      {/* Vehicle Type Selection */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {VEHICLE_TIERS.map((v) => {
            const isSelected = v.id === selectedVehicle;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                style={{
                  padding: '14px 12px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #5A30B0' : '1px solid var(--color-border, #e2e8f0)',
                  background: isSelected ? 'var(--color-primary-50, #F6F3FF)' : 'var(--color-surface, #ffffff)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
                  <VehicleIcon type={v.id} isSelected={isSelected} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#5A30B0' : '#1e293b' }}>
                  {v.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {v.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Vehicle Details Card */}
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        border: '1px solid var(--color-border, #e2e8f0)',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          <div>
            <span style={{
              display: 'inline-block',
              background: '#dcfce7',
              color: '#15803d',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              marginBottom: '4px'
            }}>
              Active Commercial Category
            </span>
            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-900, #1B0E38)' }}>
              {activeTier.name} — {activeTier.category}
            </h4>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              {activeTier.models}
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: '0 0 16px 0' }}>
          <strong>Primary Operational Duties:</strong> {activeTier.useCase}
        </p>

        {/* Feature Checkpoints */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          {activeTier.features.map((feat, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
              <span style={{ color: '#16a34a', fontWeight: 800, flexShrink: 0 }}>✓</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Spec Pill Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          {activeTier.specs.map((spec, i) => (
            <div key={i} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{spec.label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{spec.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver App Download & Benefits Card */}
      <div style={{
        background: '#F6F3FF',
        color: '#0F172A',
        borderRadius: '16px',
        padding: '24px',
        border: '2px solid #5A30B0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#5A30B0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Official Android Driver Application
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1B0E38', marginTop: '2px' }}>
              Get the AdhocX Driver App on Google Play
            </div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
              Upload documents, track corporate assignments, and unlock Century Milestone bonuses.
            </div>
          </div>

          <a
            href="https://play.google.com/store/apps/details?id=com.adhocx.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #5A30B0 0%, #6A3FE0 100%)',
              color: '#ffffff',
              padding: '12px 22px',
              borderRadius: '10px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.95rem',
              boxShadow: '0 4px 14px rgba(90, 48, 176, 0.4)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a1.94 1.94 0 0 1-.22-.919V2.733c0-.334.08-.65.22-.92zm11.3 11.303l2.25 2.25-11.83 6.83 9.58-9.08zm0-2.234l-9.58-9.08 11.83 6.83-2.25 2.25zm1.414 1.117l2.828-1.633a1.94 1.94 0 0 1 0 3.266l-2.828-1.633z" />
            </svg>
            Download on Google Play →
          </a>
        </div>

        <div style={{ fontSize: '0.725rem', color: '#64748b', borderTop: '1px dashed #CBD5E1', paddingTop: '8px' }}>
          * Commercial yellow-plate taxi drivers only. Valid DL badge and RTO fitness required. Terms and conditions apply.
        </div>
      </div>
    </div>
  );
}
