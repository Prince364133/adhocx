'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Radio, CheckSquare, Clock, AlertOctagon, CheckCircle2, Car, ArrowRight } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';
import { mockActiveTrips } from '../../../lib/mock/corporateMockData';

export default function LiveOperationsSummaryPage() {
  const [selectedTrip, setSelectedTrip] = useState(mockActiveTrips[0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Live Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Live Operations
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Real-time status of all trips, vehicles and employees
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showTripTypes={true}
          showDateRange={false}
          liveStatusText="Live (Updated 10:24 AM)"
        />
      </div>

      {/* 5 KPI Operational Metrics */}
      <div className="metric-grid">
        <MetricCard
          label="Active Trips"
          value="96"
          icon={<Radio size={18} />}
          trend={{ value: 'Live', isLive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Assigned Trips"
          value="284"
          icon={<CheckSquare size={18} />}
          trend={{ value: '+5.6%', isPositive: true }}
          highlightColor="#6366F1"
        />
        <MetricCard
          label="Delayed Trips"
          value="12"
          icon={<Clock size={18} />}
          trend={{ value: '-42.9%', isPositive: true }}
          highlightColor="#EE9811"
        />
        <MetricCard
          label="Unserved Trips"
          value="28"
          icon={<AlertOctagon size={18} />}
          trend={{ value: '-12.5%', isAlert: true }}
          highlightColor="#DC2626"
        />
        <MetricCard
          label="Completed Today"
          value="372"
          icon={<CheckCircle2 size={18} />}
          trend={{ value: '+6.8%', isPositive: true }}
          highlightColor="#059669"
        />
      </div>

      {/* Split Content: 65% Interactive Live Map + 35% Active Trips Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Interactive Map */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 60%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Active Fleet Live Telemetry
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Real-time tracking of route corridors across Hyderabad
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-green" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                Streaming GPS
              </span>
            </div>
          </div>

          <MiniLiveMap
            height={360}
            activeVehiclePlate={selectedTrip.cabNumber}
            activeEta={`${selectedTrip.etaMinutes} min`}
          />
        </div>

        {/* Right: Active Trips (Live) List */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Active Trips (Live)
            </h2>
            <Link
              href="/live"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1167EE',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockActiveTrips.map((trip) => {
              const isSelected = selectedTrip.id === trip.id;
              return (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${isSelected ? '#1167EE' : '#E2E8F0'}`,
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Car size={16} color={isSelected ? '#1167EE' : '#64748B'} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        {trip.cabNumber}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                        border: '1px solid #86EFAC',
                      }}
                    >
                      ETA {trip.etaMinutes} min
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
                    {trip.type} · <strong>{trip.driverName}</strong> · {trip.stopsCount} stops
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8' }}>
                    <span>Occupancy: {trip.occupiedSeats}/{trip.totalSeats} seats</span>
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

