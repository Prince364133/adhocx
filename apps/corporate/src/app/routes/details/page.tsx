'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Navigation,
  ArrowLeft,
  MapPin,
  Clock,
  Car,
  Users,
  CheckCircle2,
  Phone,
  Download,
  Sliders,
  Share2,
} from 'lucide-react';
import { mockRoutes, mockDetailedTrip } from '../../../lib/mock/corporateMockData';
import MiniLiveMap from '../../../components/maps/MiniLiveMap';

export default function RouteDetailsStopsPage() {
  const [selectedRouteId, setSelectedRouteId] = useState('RT-101');
  const route = mockRoutes.find((r) => r.id === selectedRouteId) || mockRoutes[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/routes"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
            }}
          >
            <ArrowLeft size={14} /> Back to Routes
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Route Details — {route.routeCode}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#EFF6FF',
                  color: 'var(--corporate-blue)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {route.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {route.name} • Destination: {route.destinationOffice}
            </p>
          </div>
        </div>

        {/* Route Selector & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
            }}
          >
            {mockRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeCode} ({r.origin})
              </option>
            ))}
          </select>

          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Manifest PDF
          </button>
        </div>
      </div>

      {/* Corridor Summary Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          padding: 20,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Shift & Schedule
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {route.shiftName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Origin: {route.origin}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Distance & Time
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--corporate-blue)', marginTop: 4 }}>
              {route.totalDistanceKm} km (~{route.estDurationMin} min)
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Total {route.stopsCount} Waypoints
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Allocated Vehicle
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {route.assignedVehicle}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Driver: {route.assignedDriver} ({route.driverPhone})
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Seat Fill Rate
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A', marginTop: 4 }}>
              {route.capacityUtilizationPct}% Occupancy
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Optimal Fuel/Km Index
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Map + Stop Manifest */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16 }}>
        {/* Route Corridor Map */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Sequential Route Map View
          </div>
          <MiniLiveMap height={360} routeName={route.name} />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            GPS Telemetry updated every 5 seconds via AdhocX Fleet Gateway
          </div>
        </div>

        {/* Sequential Stops Breakdown */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Sequential Pickup Stops ({route.stops.length})
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Optimized boarding times and passenger pickup allocation
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Seq</th>
                  <th style={{ padding: '12px 16px' }}>Stop Name</th>
                  <th style={{ padding: '12px 16px' }}>Scheduled Time</th>
                  <th style={{ padding: '12px 16px' }}>Commuters</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {route.stops.map((stop) => (
                  <tr key={stop.seq} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            stop.status === 'Passed'
                              ? '#16A34A'
                              : stop.status === 'Current'
                              ? 'var(--corporate-blue)'
                              : '#E2E8F0',
                          color: stop.status === 'Upcoming' ? 'var(--text-secondary)' : '#FFFFFF',
                        }}
                      >
                        {stop.seq}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {stop.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {stop.time}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          backgroundColor: '#EFF6FF',
                          color: 'var(--corporate-blue)',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {stop.employeesCount} Commuters
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor:
                            stop.status === 'Passed'
                              ? '#DCFCE7'
                              : stop.status === 'Current'
                              ? '#EFF6FF'
                              : '#F1F5F9',
                          color:
                            stop.status === 'Passed'
                              ? '#15803D'
                              : stop.status === 'Current'
                              ? 'var(--corporate-blue)'
                              : 'var(--text-secondary)',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {stop.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

