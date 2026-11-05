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
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Live Operations — Map View
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
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
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>96</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Active Trips</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>2,846</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>126</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Vehicles (Cabs)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>84</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Routes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>12</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Delayed</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>372</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Completed Today</div>
          </div>
        </div>
      </div>

      {/* Main Map + Trips Feed Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left: Large Interactive Map Canvas */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 65%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Corridor: {selectedTrip.route}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Driver: <strong>{selectedTrip.driverName}</strong> ({selectedTrip.driverPhone}) · Vehicle: <strong>{selectedTrip.cabNumber}</strong>
              </p>
            </div>

            <Link
              href={`/live/trips?id=${selectedTrip.id}`}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1167EE',
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
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
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
                  backgroundColor: filterType === 'ALL' ? '#1167EE' : '#F1F5F9',
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
                  backgroundColor: filterType === 'LOGIN' ? '#1167EE' : '#F1F5F9',
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
                  backgroundColor: filterType === 'LOGOUT' ? '#1167EE' : '#F1F5F9',
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
                    border: `1px solid ${isSelected ? '#1167EE' : '#E2E8F0'}`,
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Car size={15} color={isSelected ? '#1167EE' : '#64748B'} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
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

                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    {trip.type} · {trip.stopsCount} stops · <strong>{trip.occupiedSeats}/{trip.totalSeats} seats</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
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

