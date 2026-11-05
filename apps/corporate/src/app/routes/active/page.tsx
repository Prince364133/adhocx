'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Route,
  Radio,
  Clock,
  MapPin,
  Car,
  Phone,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { mockRoutes } from '../../../lib/mock/corporateMockData';

export default function ActiveRoutesListPage() {
  const activeRoutes = mockRoutes.filter((r) => r.status === 'In Progress' || r.status === 'Delayed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Active Routes Live Progress
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Radio size={12} /> {activeRoutes.length} Routes Live Now
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time multi-stop progression, current stop telemetry, and delay monitoring
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Refresh Feed
          </button>
          <Link
            href="/live"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'var(--corporate-blue)',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View on Live Map <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Active Route Progress Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activeRoutes.map((route) => {
          const isDelayed = route.status === 'Delayed';
          const completedStops = route.stops.filter((s) => s.status === 'Passed').length;
          const progressPct = Math.round((completedStops / route.stops.length) * 100);

          return (
            <div
              key={route.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 8,
                border: `1px solid ${isDelayed ? '#FCD34D' : 'var(--border-color)'}`,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              {/* Header inside card */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#EFF6FF',
                        color: 'var(--corporate-blue)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}
                    >
                      {route.routeCode}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: isDelayed ? '#FEF3C7' : '#DCFCE7',
                        color: isDelayed ? '#B45309' : '#15803D',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {route.status}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Shift: {route.shiftName}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
                    {route.name}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Destination: <strong>{route.destinationOffice}</strong> â€¢ Total {route.totalDistanceKm} km
                  </div>
                </div>

                {/* Driver / Cab Information Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 14px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Car size={18} style={{ color: 'var(--corporate-blue)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {route.assignedVehicle}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Driver: {route.assignedDriver} ({route.driverPhone})
                    </div>
                  </div>
                </div>
              </div>

              {/* Sequential Multi-Stop Progress Indicator */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Route Progression: {completedStops} of {route.stops.length} Stops Completed ({progressPct}%)
                  </span>
                  <span style={{ color: isDelayed ? '#DC2626' : '#15803D', fontWeight: 600 }}>
                    {isDelayed ? 'Delayed by +12 min' : 'Running On-Time'}
                  </span>
                </div>

                {/* Visual Stops Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${route.stops.length}, 1fr)`,
                    gap: 8,
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {route.stops.map((stop) => (
                    <div key={stop.seq} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor:
                              stop.status === 'Passed'
                                ? '#16A34A'
                                : stop.status === 'Current'
                                ? 'var(--corporate-blue)'
                                : '#CBD5E1',
                            color: '#FFFFFF',
                          }}
                        >
                          {stop.seq}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color:
                              stop.status === 'Current'
                                ? 'var(--corporate-blue)'
                                : stop.status === 'Passed'
                                ? '#16A34A'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {stop.time}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: stop.status === 'Current' ? 700 : 500,
                          color: stop.status === 'Current' ? 'var(--text-primary)' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {stop.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {stop.employeesCount} Commuters
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Card Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Capacity Fill: <strong>{route.capacityUtilizationPct}%</strong> â€¢ GPS Signal: Excellent
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link
                    href="/routes/details"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--corporate-blue)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View Stop Breakdown <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

