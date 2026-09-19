import React, { useState, useId } from 'react';

interface VehicleRate {
  id: string;
  name: string;
  category: string;
  avgPerTrip: number;
  icon: string;
}

const VEHICLES: VehicleRate[] = [
  { id: 'sedan', name: 'Dzire / Etios', category: 'Compact Sedan', avgPerTrip: 480, icon: '🚗' },
  { id: 'suv', name: 'Ertiga / XL6', category: '6-Seater MUV', avgPerTrip: 680, icon: '🚙' },
  { id: 'innova', name: 'Innova Crysta', category: 'Executive SUV', avgPerTrip: 950, icon: '✨' },

];

export default function EarningsCalculator() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('sedan');
  const [tripsPerDay, setTripsPerDay] = useState<number>(6);
  const [daysPerMonth, setDaysPerMonth] = useState<number>(26);

  const vehicleId = useId();
  const tripsId = useId();
  const daysId = useId();

  const vehicle = VEHICLES.find(v => v.id === selectedVehicle) || VEHICLES[0];
  const totalTripsMonth = tripsPerDay * daysPerMonth;
  const grossMonthlyEarnings = totalTripsMonth * vehicle.avgPerTrip;

  // Bonus applies if they hit 100+ trips in a month
  const milestoneBonus = totalTripsMonth >= 100 ? 2000 : 0;
  const netTotalEarnings = grossMonthlyEarnings + milestoneBonus;
  const weeklyEstimate = Math.round(netTotalEarnings / 4);

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
          background: '#dcfce7',
          color: '#15803d',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '4px 12px',
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          Interactive Estimator
        </span>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0' }}>
          Calculate Your Monthly Earnings
        </h3>
        <p style={{ color: 'var(--color-text-muted, #64748b)', fontSize: '0.95rem', margin: 0 }}>
          Real estimates based on active Hyderabad corporate shift rates and 0% promotional commission.
        </p>
      </div>

      {/* Vehicle Type Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor={vehicleId} style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '10px' }}>
          1. Select Commercial Vehicle Category
        </label>
        <div id={vehicleId} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {VEHICLES.map((v) => {
            const isSelected = v.id === selectedVehicle;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{v.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#1d4ed8' : '#334155' }}>
                  {v.name}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                  ~₹{v.avgPerTrip}/trip
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor={tripsId} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
              Daily Trips
            </label>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
              {tripsPerDay} trips/day
            </span>
          </div>
          <input
            id={tripsId}
            type="range"
            min="2"
            max="12"
            step="1"
            value={tripsPerDay}
            onChange={(e) => setTripsPerDay(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            <span>2 trips (Part-time)</span>
            <span>12 trips (Full-time)</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label htmlFor={daysId} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
              Working Days / Month
            </label>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
              {daysPerMonth} days
            </span>
          </div>
          <input
            id={daysId}
            type="range"
            min="15"
            max="30"
            step="1"
            value={daysPerMonth}
            onChange={(e) => setDaysPerMonth(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            <span>15 days</span>
            <span>30 days</span>
          </div>
        </div>
      </div>

      {/* Summary Box (Light Surface) */}
      <div style={{
        background: '#F6F3FF',
        color: '#0F172A',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        border: '2px solid #5A30B0'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Estimated Monthly Trips
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {totalTripsMonth} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748b' }}>trips</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Base Trip Payout
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#5A30B0', marginTop: '2px' }}>
              ₹{grossMonthlyEarnings.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Joining Bonus*
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
              +₹2,000*
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #E2E8F0',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Estimated Take-Home:</span>
            <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#16a34a' }}>
              ₹{netTotalEarnings.toLocaleString('en-IN')}
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#64748b', marginLeft: '6px' }}>/month</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              Approx. <strong>₹{weeklyEstimate.toLocaleString('en-IN')}</strong> paid out weekly to your bank.
            </div>
          </div>

          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #5A30B0 0%, #6A3FE0 100%)',
              color: '#ffffff',
              padding: '14px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.95rem',
              boxShadow: '0 4px 14px rgba(90, 48, 176, 0.4)'
            }}
          >
            Join Us & Claim ₹2,000 Bonus* →
          </a>
        </div>

        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '12px', borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
          * ₹2,000 bonus join us — terms and conditions apply. Only for verified commercial yellow-plate 4 & 7 seater cabs.
        </div>
      </div>
    </div>
  );
}
