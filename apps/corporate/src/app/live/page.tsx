'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Users,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { FilterBar } from '../../components/common/FilterBar';
import { MiniLiveMap } from '../../components/maps/MiniLiveMap';
import { mockActiveTrips, mockExecutiveMetrics } from '../../lib/mock/corporateMockData';

export default function LiveOperationsMapPage() {
  const [selectedTrip, setSelectedTrip] = useState(mockActiveTrips[0]);
  const [filterType, setFilterType] = useState('ALL');

  const filteredTrips = mockActiveTrips.filter((trip) => {
    if (filterType === 'LOGIN') return trip.type.includes('Login');
    if (filterType === 'LOGOUT') return trip.type.includes('Logout');
    if (filterType === 'DELAYED') return trip.status === 'Delayed';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Live Operations â€” Map View
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Track all active trips, vehicles and employee pickups in real time
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showTripTypes={true}
          showDateRange={false}
          liveStatusText="Live Telemetry"
        />
      </div>

      {/* Fleet Stat Strip */}
      <div
        className="surface-card"
        style={{
          padding: '14px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>96</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Trips</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>2,846</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>126</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Vehicles (Cabs)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>84</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Routes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>12</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Delayed</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>372</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Completed Today</div>
          </div>
        </div>
      </div>

      {/* Main Map + Trips Feed Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left: Large Interactive Map Canvas */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 65%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Corridor: {selectedTrip.route}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Driver: <strong>{selectedTrip.driverName}</strong> ({selectedTrip.driverPhone}) Â· Vehicle: <strong>{selectedTrip.cabNumber}</strong>
              </p>
            </div>

            <Link
              href={`/live/trips?id=${selectedTrip.id}`}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#5728B2',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Inspect Trip Details</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <MiniLiveMap
            height={440}
            activeVehiclePlate={selectedTrip.cabNumber}
            activeEta={`${selectedTrip.etaMinutes} min`}
          />
        </div>

        {/* Right: Active Trips (96) Feed */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Active Trips (96)
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setFilterType('ALL')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'ALL' ? '#5728B2' : '#F1F5F9',
                  color: filterType === 'ALL' ? '#FFFFFF' : '#475569',
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('LOGIN')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'LOGIN' ? '#5728B2' : '#F1F5F9',
                  color: filterType === 'LOGIN' ? '#FFFFFF' : '#475569',
                }}
              >
                Login
              </button>
              <button
                onClick={() => setFilterType('LOGOUT')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'LOGOUT' ? '#5728B2' : '#F1F5F9',
                  color: filterType === 'LOGOUT' ? '#FFFFFF' : '#475569',
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '430px', overflowY: 'auto' }}>
            {filteredTrips.map((trip) => {
              const isSelected = selectedTrip.id === trip.id;
              return (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${isSelected ? '#5728B2' : '#E2E8F0'}`,
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Car size={15} color={isSelected ? '#5728B2' : '#64748B'} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {trip.cabNumber}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: trip.status === 'Delayed' ? '#FEF3C7' : '#DCFCE7',
                        color: trip.status === 'Delayed' ? '#D97706' : '#16A34A',
                        border: `1px solid ${trip.status === 'Delayed' ? '#FCD34D' : '#86EFAC'}`,
                      }}
                    >
                      ETA {trip.etaMinutes} min
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {trip.type} Â· {trip.stopsCount} stops Â· <strong>{trip.occupiedSeats}/{trip.totalSeats} seats</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{trip.route}</span>
                    <span>GPS: {trip.lastGpsUpdateSecondsAgo}s ago</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

