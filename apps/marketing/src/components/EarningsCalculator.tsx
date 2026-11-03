import React, { useState, useId } from 'react';

interface VehicleRate {
  id: string;
  name: string;
  category: string;
  avgPerTrip: number;
}

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  sedan: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3 3 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  suv: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="7" rx="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 10l2-5h10l2 5"/><line x1="12" y1="5" x2="12" y2="10"/>
    </svg>
  ),
  innova: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

const VEHICLES: VehicleRate[] = [
  { id: 'sedan', name: 'Dzire / Etios', category: 'Compact Sedan', avgPerTrip: 480 },
  { id: 'suv', name: 'Ertiga / XL6', category: '6-Seater MUV', avgPerTrip: 680 },
  { id: 'innova', name: 'Innova Crysta', category: 'Executive SUV', avgPerTrip: 950 },
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
      border: '1px solid var(--color-border, #C2C9CC)',
      borderRadius: '1rem',
      padding: '2rem',
      boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(25, 27, 28, 0.08))',
      color: 'var(--color-text-primary, #191B1C)'
    }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          background: '#DCFCE7',
          color: '#15803D',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem'
        }}>
          Interactive Estimator
        </span>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#191B1C' }}>
          Calculate Your Monthly Earnings
        </h3>
        <p style={{ color: '#595F61', fontSize: '0.9375rem', margin: 0 }}>
          Real estimates based on active Telangana & Hyderabad corporate shift rates and 0% promotional commission.
        </p>
      </div>

      {/* Vehicle Type Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor={vehicleId} style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.625rem', color: '#191B1C' }}>
          1. Select Commercial Vehicle Category
        </label>
        <div id={vehicleId} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.625rem' }}>
          {VEHICLES.map((v) => {
            const isSelected = v.id === selectedVehicle;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v.id)}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderRadius: '0.625rem',
                  border: isSelected ? '2px solid #1167EE' : '1px solid #C2C9CC',
                  background: isSelected ? '#CEE0FD' : '#F8F9FA',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ color: isSelected ? '#0948AC' : '#595F61', display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                  {VEHICLE_ICONS[v.id]}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#0948AC' : '#191B1C' }}>
                  {v.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#595F61', marginTop: '0.125rem' }}>
                  ~₹{v.avgPerTrip}/trip
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label htmlFor={tripsId} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#191B1C' }}>
              2. Trips Per Day
            </label>
            <span style={{ fontWeight: 800, color: '#1167EE', fontSize: '1.1rem' }}>
              {tripsPerDay} trips
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
            style={{ width: '100%', accentColor: '#1167EE', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9BA3A8', marginTop: '0.25rem' }}>
            <span>2 trips</span>
            <span>12 trips</span>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label htmlFor={daysId} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#191B1C' }}>
              3. Working Days / Month
            </label>
            <span style={{ fontWeight: 800, color: '#1167EE', fontSize: '1.1rem' }}>
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
            style={{ width: '100%', accentColor: '#1167EE', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9BA3A8', marginTop: '0.25rem' }}>
            <span>15 days</span>
            <span>30 days</span>
          </div>
        </div>
      </div>

      {/* Summary Box (Warm Accent Highlight) */}
      <div style={{
        background: '#FFFBF7',
        color: '#191B1C',
        borderRadius: '1rem',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #C2C9CC',
        borderTop: '3px solid #EE9811'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#595F61', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Estimated Monthly Trips
            </div>
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#191B1C', marginTop: '0.125rem' }}>
              {totalTripsMonth} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#595F61' }}>trips</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#595F61', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Base Trip Payout
            </div>
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#1167EE', marginTop: '0.125rem' }}>
              ₹{grossMonthlyEarnings.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#595F61', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Joining Bonus*
            </div>
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#EE9811', marginTop: '0.125rem' }}>
              +₹2,000*
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #C2C9CC',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#595F61', fontWeight: 600 }}>Total Estimated Take-Home:</span>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#16A34A' }}>
              ₹{netTotalEarnings.toLocaleString('en-IN')}
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#595F61', marginLeft: '0.375rem' }}>/month</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#595F61' }}>
              Approx. <strong>₹{weeklyEstimate.toLocaleString('en-IN')}</strong> paid out weekly directly to your bank.
            </div>
          </div>

          <a
            href="https://play.google.com/store/apps/details?id=com.adhocx.app&pcampaignid=web_share"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #FF6B00 0%, #EE9811 100%)',
              color: '#ffffff',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.625rem',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '0.95rem',
              boxShadow: '0 4px 14px rgba(255, 95, 9, 0.28)'
            }}
          >
            Join Us & Claim ₹2,000 Bonus* →
          </a>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#9BA3A8', marginTop: '0.75rem', borderTop: '1px dashed #C2C9CC', paddingTop: '0.5rem' }}>
          * ₹2,000 bonus join us — terms and conditions apply. Only for verified commercial yellow-plate 4 & 7 seater cabs.
        </div>
      </div>
    </div>
  );
}
