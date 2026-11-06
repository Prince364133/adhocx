'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Car,
  User,
  Star,
  MapPin,
  Calendar,
  Clock,
  Route,
  CheckCircle2,
  AlertCircle,
  Phone,
  ChevronDown,
  Navigation,
} from 'lucide-react';
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';
import { routesApi } from '../../../lib/api/corporate';
import type { CorporateRoute, CorporateRouteStop } from '../../../lib/api/types';

function LiveTripDetailsContent() {
  const searchParams = useSearchParams();
  const routeIdParam = searchParams.get('id');

  const [routes, setRoutes] = useState<CorporateRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<CorporateRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'employees' | 'timeline'>('info');

  useEffect(() => {
    setLoading(true);
    routesApi
      .list()
      .then((data) => {
        setRoutes(data);
        if (data.length > 0) {
          const match = routeIdParam ? data.find((r) => r.id === routeIdParam) : null;
          setSelectedRoute(match || data[0]);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch routes:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [routeIdParam]);

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading live trip details...
      </div>
    );
  }

  if (!selectedRoute) {
    return (
      <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No active trips found. When routes are dispatched, their live telemetry and waypoints will appear here.
      </div>
    );
  }

  const cabNumber = selectedRoute.vehicle?.licensePlate || selectedRoute.vehicle?.registrationNumber || selectedRoute.routeCode || 'CAB-LIVE';
  const driverName = selectedRoute.driver?.fullName || selectedRoute.driver?.name || 'Assigned Driver';
  const driverRating = selectedRoute.driver?.rating ? selectedRoute.driver.rating.toFixed(1) : '4.8';
  const vehicleModel = selectedRoute.vehicle?.model || 'Commercial EV / Fleet Cab';
  const seatsOccupied = selectedRoute.stops?.length || selectedRoute._count?.stops || selectedRoute.assignedPassengerCount || 4;
  const totalSeats = selectedRoute.vehicle?.capacity || selectedRoute.maxCapacity || 6;
  const distanceKm = selectedRoute.totalDistanceMeters
    ? (selectedRoute.totalDistanceMeters / 1000).toFixed(1)
    : selectedRoute.estDistanceMeters
    ? (selectedRoute.estDistanceMeters / 1000).toFixed(1)
    : '28.5';
  const stops = selectedRoute.stops || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Trip Details — {cabNumber}
            </h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: selectedRoute.status === 'IN_PROGRESS' ? '#DCFCE7' : '#F1F5F9',
                color: selectedRoute.status === 'IN_PROGRESS' ? '#16A34A' : '#64748B',
                border: `1px solid ${selectedRoute.status === 'IN_PROGRESS' ? '#86EFAC' : '#CBD5E1'}`,
              }}
            >
              {selectedRoute.status}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Route {selectedRoute.routeCode} · Real-time status, waypoints, and passenger manifests
          </p>
        </div>

        {routes.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Trip:</span>
            <select
              value={selectedRoute.id}
              onChange={(e) => {
                const target = routes.find((r) => r.id === e.target.value);
                if (target) setSelectedRoute(target);
              }}
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeCode} - {r.vehicle?.licensePlate || 'Fleet Cab'} ({r.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main 2-Column Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left Side: Route Map + Fleet Stats Strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 55%' }}>
          <div className="surface-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={15} color="#5728B2" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sequential Waypoint Route
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {stops.length} Stops Configured
              </span>
            </div>

            <MiniLiveMap
              height={360}
              activeVehiclePlate={cabNumber}
              activeEta="Live Telemetry"
            />
          </div>

          {/* Bottom Driver & Vehicle Summary Card */}
          <div
            className="surface-card"
            style={{
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '14px',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Driver</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{driverName}</span>
                <span style={{ fontSize: '11px', color: '#D97706', display: 'flex', alignItems: 'center' }}>
                  ★ {driverRating}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {vehicleModel}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Capacity</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>
                {seatsOccupied} / {totalSeats} Seats
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Stops</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stops.length} Stops
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Distance</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {distanceKm} km
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Details (Trip Info / Employees / Timeline) */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 45%' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
            <button
              onClick={() => setActiveTab('info')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'info' ? '#5728B2' : '#64748B',
                borderBottom: `2px solid ${activeTab === 'info' ? '#5728B2' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              Trip Info
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'employees' ? '#5728B2' : '#64748B',
                borderBottom: `2px solid ${activeTab === 'employees' ? '#5728B2' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              Waypoints & Passengers ({stops.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'timeline' ? '#5728B2' : '#64748B',
                borderBottom: `2px solid ${activeTab === 'timeline' ? '#5728B2' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              Timeline
            </button>
          </div>

          {/* Tab 1: Trip Info */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Route Identifier</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedRoute.routeCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Planned Start</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedRoute.plannedStartTime ? new Date(selectedRoute.plannedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:30 AM'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Actual / Dispatched Start</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#D97706' }}>
                  {selectedRoute.actualStartTime ? new Date(selectedRoute.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:34 AM'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Planned End</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                  {selectedRoute.plannedEndTime ? new Date(selectedRoute.plannedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:45 AM'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Trip Distance</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{distanceKm} km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                  {selectedRoute.status}
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Employees / Stops */}
          {activeTab === 'employees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stops.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No stops configured for this route yet.
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Stop #</th>
                        <th>Location</th>
                        <th>Scheduled</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stops.map((stop, idx) => (
                        <tr key={stop.id || idx}>
                          <td style={{ fontWeight: 700 }}>Stop {stop.sequence || idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {stop.locationName || `Waypoint ${stop.sequence || idx + 1}`}
                            </div>
                            {stop.address && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {stop.address}
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {stop.plannedTime ? new Date(stop.plannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: stop.status === 'COMPLETED' ? '#16A34A' : '#D97706',
                                backgroundColor: stop.status === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {stop.status || 'SCHEDULED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Timeline */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {stops.map((stop, idx) => {
                const isCompleted = stop.status === 'COMPLETED';
                return (
                  <div key={stop.id || idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: isCompleted ? '#DCFCE7' : '#EFF6FF',
                        color: isCompleted ? '#16A34A' : '#5728B2',
                        border: `2px solid ${isCompleted ? '#16A34A' : '#5728B2'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {stop.sequence || idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {stop.locationName || `Stop ${stop.sequence || idx + 1}`}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {stop.plannedTime ? new Date(stop.plannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {stop.address || 'Designated Employee Boarding Point'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LiveTripDetailsPage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: '40px', textAlign: 'center' }}>Loading trip...</div>}>
      <LiveTripDetailsContent />
    </Suspense>
  );
}
