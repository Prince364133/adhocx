'use client';

import React, { useState } from 'react';
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
import { mockDetailedTrip } from '../../../lib/mock/corporateMockData';

export default function LiveTripDetailsPage() {
  const [activeTab, setActiveTab] = useState<'info' | 'employees' | 'timeline'>('info');
  const [trip, setTrip] = useState(mockDetailedTrip);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Trip Details â€” {trip.cabNumber}
            </h1>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                border: '1px solid #86EFAC',
              }}
            >
              {trip.status}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Complete trip information, route, employees and real-time status
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert(`Opening action menu for ${trip.cabNumber}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
            }}
          >
            <span>Actions</span>
            <ChevronDown size={15} />
          </button>
        </div>
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
                {trip.stops.length} Stops Active
              </span>
            </div>

            <MiniLiveMap
              height={360}
              activeVehiclePlate={trip.cabNumber}
              activeEta="ETA 8:35 AM"
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
                <span>{trip.driver.name}</span>
                <span style={{ fontSize: '11px', color: '#D97706', display: 'flex', alignItems: 'center' }}>
                  â˜… {trip.driver.rating}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {trip.vehicle.model}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Capacity</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>
                {trip.vehicle.seatsOccupied} / {trip.vehicle.totalSeats} Seats
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Stops</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {trip.stops.length} Stops
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Distance</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {trip.tripDistanceKm} km
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
              Employees ({trip.employees.length})
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
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Trip Type</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{trip.tripType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{trip.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Corridor</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>{trip.route}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Planned Pickup</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{trip.plannedPickup}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Actual Pickup</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#D97706' }}>{trip.actualPickup}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ETA (Drop)</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>{trip.etaDrop}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Trip Distance</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{trip.tripDistanceKm} km</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
                  {trip.status}
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Employees */}
          {activeTab === 'employees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Passenger</th>
                      <th>Stop #</th>
                      <th>Time</th>
                      <th>Boarding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trip.employees.map((emp) => (
                      <tr key={emp.empId}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.empId} Â· {emp.department}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>Stop {emp.stopNumber}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.pickupTime}</td>
                        <td>
                          {emp.boarded ? (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                              âœ“ Boarded
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>
                              In Transit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Timeline */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {trip.stops.map((stop) => (
                <div key={stop.stopNumber} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: stop.status === 'Completed' ? '#DCFCE7' : '#EFF6FF',
                      color: stop.status === 'Completed' ? '#16A34A' : '#5728B2',
                      border: `2px solid ${stop.status === 'Completed' ? '#16A34A' : '#5728B2'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {stop.stopNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stop.locationName}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {stop.actualTime}
                      </span>
                    </div>
                    {stop.passengers.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Boarding: {stop.passengers.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

