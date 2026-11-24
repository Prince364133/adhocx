'use client';

import React, { useState } from 'react';
import { OptimizedCabCluster } from '../types';
import { Route3Selector } from './Route3Selector';
import {
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Building,
} from 'lucide-react';
import { estimateRoadDistanceKm, isCoLocatedPickup } from '../lib/fleetOptimizer';

interface EmployeeClusterCardProps {
  cluster: OptimizedCabCluster;
  isFocused: boolean;
  onFocus: () => void;
  onSelectRoute: (routeIndex: number) => void;
  onOpenAudit?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  color?: string;
}

export const EmployeeClusterCard: React.FC<EmployeeClusterCardProps> = ({
  cluster,
  isFocused,
  onFocus,
  onSelectRoute,
  onOpenAudit,
  isExpanded: controlledExpanded,
  onToggleExpand: controlledToggle,
  color = '#5728B2',
}) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = controlledToggle || (() => setInternalExpanded(!internalExpanded));

  const activeOpt = cluster.routeOptions?.[cluster.selectedRouteIndex] || cluster.routeOptions?.[0];
  const occupancyPct = Math.round((cluster.passengerCount / cluster.capacity) * 100);

  return (
    <div
      onClick={onFocus}
      style={{
        flexShrink: 0,
        minHeight: 'fit-content',
        borderRadius: 'var(--radius-lg, 10px)',
        border: isFocused ? '2px solid var(--brand-blue-500, #5728B2)' : '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        boxShadow: isFocused ? 'var(--shadow-card)' : 'var(--shadow-sm)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ─── CAB TOP HEADER ─── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Color Accent Indicator & Cab Badge */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: color,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              #{cluster.cabIndex}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Route #{cluster.cabIndex} · {cluster.vehicleCategory}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {cluster.passengerCount}/{cluster.capacity} Seats ({occupancyPct}%)
                </span>
                {cluster.isNightShift && (
                  cluster.safetyCompliant ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        color: '#16A34A',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ShieldCheck size={11} /> Night Safety Verified
                    </span>
                  ) : cluster.escortRequired ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(217, 119, 6, 0.1)',
                        color: '#D97706',
                        border: '1px solid rgba(217, 119, 6, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ShieldAlert size={11} /> Security Escort Assigned
                    </span>
                  ) : null
                )}
              </div>

              {/* Schedule and Destination */}
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '3px',
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  Departs:{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {cluster.departure}
                  </strong>
                </span>
                <span style={{ color: 'var(--border-strong)' }}>•</span>
                <span>
                  Arrival:{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {cluster.arrival || '08:00 AM'}
                  </strong>
                </span>
                <span style={{ color: 'var(--border-strong)' }}>•</span>
                <span>
                  Destination: <strong>{cluster.officeAddress.split(',')[0]}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions: Audit Log, Accordion Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenAudit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAudit();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                title="View algorithmic audit and scoring breakdown"
              >
                <FileText size={12} />
                Audit Log
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isExpanded ? 'Collapse Stop Sequence' : 'Expand Stop Sequence'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Occupancy Progress Bar */}
        <div
          style={{
            marginTop: '8px',
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--bg-surface-muted)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: '2px',
              width: `${Math.min(100, occupancyPct)}%`,
              backgroundColor:
                occupancyPct >= 100
                  ? '#16A34A'
                  : occupancyPct >= 75
                  ? 'var(--brand-blue-500, #5728B2)'
                  : '#D97706',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* ─── FINANCIAL & SAVINGS STRIP ─── */}
      <div
        style={{
          padding: '8px 14px',
          backgroundColor: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Driver Payout:{' '}
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              ₹{cluster.driverPayout}
            </strong>
          </span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Projected Margin:{' '}
            <strong style={{ color: '#16A34A', fontFamily: 'monospace' }}>
              ₹{cluster.projectedMargin}
            </strong>
          </span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#16A34A',
            fontWeight: 600,
          }}
        >
          <TrendingDown size={13} />
          <span>
            Saved {cluster.savedDistanceKm} km ({cluster.savingsPercentage}%) vs solo trips
          </span>
        </div>
      </div>

      {/* ─── CORRIDOR SELECTOR ─── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
        }}
      >
        <Route3Selector
          routeOptions={cluster.routeOptions}
          selectedIndex={cluster.selectedRouteIndex}
          onSelectRoute={onSelectRoute}
        />
      </div>

      {/* ─── ACCORDION: PASSENGER PICKUP TIMELINE ─── */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
              }}
            >
              Passenger Stops Sequence ({cluster.passengers.length} Employees)
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Ordered by pickup schedule
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(() => {
              const displayPassengers =
                activeOpt?.orderedPassengers && activeOpt.orderedPassengers.length > 0
                  ? activeOpt.orderedPassengers
                  : cluster.passengers;

              return (
                <>
                  {displayPassengers.map((p, idx) => {
                    const prevP = idx > 0 ? displayPassengers[idx - 1] : null;
                    const isCoLocated = Boolean(prevP && isCoLocatedPickup(prevP, p));

                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: isCoLocated
                            ? 'rgba(22, 163, 74, 0.05)'
                            : 'var(--bg-surface-muted)',
                          border: isCoLocated
                            ? '1px dashed rgba(22, 163, 74, 0.3)'
                            : '1px solid var(--border-subtle)',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: idx === 0 ? color : '#059669',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {p.pickupSequence || idx + 1}
                          </span>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{p.name}</span>
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  backgroundColor:
                                    p.gender?.toUpperCase() === 'FEMALE'
                                      ? 'rgba(236, 72, 153, 0.1)'
                                      : 'var(--bg-surface)',
                                  color:
                                    p.gender?.toUpperCase() === 'FEMALE'
                                      ? '#DB2777'
                                      : 'var(--text-secondary)',
                                  border: `1px solid ${
                                    p.gender?.toUpperCase() === 'FEMALE'
                                      ? 'rgba(236, 72, 153, 0.25)'
                                      : 'var(--border-subtle)'
                                  }`,
                                }}
                              >
                                {p.gender}
                              </span>
                              {isCoLocated && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 600,
                                    color: '#16A34A',
                                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    border: '1px solid rgba(22, 163, 74, 0.2)',
                                  }}
                                >
                                  Shared Stop
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                color: 'var(--text-secondary)',
                                fontSize: '10px',
                                maxWidth: '280px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.pickupAddress}
                            </div>
                            {p.phone && (
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-muted)',
                                  fontFamily: 'monospace',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginTop: '1px',
                                }}
                              >
                                <Phone size={9} /> {p.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {p.estimatedPickupTime || '07:15 AM'}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              color: isCoLocated ? '#16A34A' : 'var(--text-muted)',
                              fontWeight: isCoLocated ? 600 : 400,
                            }}
                          >
                            {idx === 0
                              ? 'Origin Stop (#1)'
                              : isCoLocated
                              ? '0.0 km (Shared Stop)'
                              : `+${
                                  activeOpt?.legs?.[idx - 1]?.distanceKm ??
                                  (prevP
                                    ? Number(
                                        estimateRoadDistanceKm(
                                          prevP.lat,
                                          prevP.lng,
                                          p.lat,
                                          p.lng,
                                        ).toFixed(1),
                                      )
                                    : 0)
                                } km`}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Office Drop Node */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(220, 38, 38, 0.08)',
                      border: '1px solid rgba(220, 38, 38, 0.2)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px' }}>🏢</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#DC2626' }}>
                          Office Destination Drop
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                          {cluster.officeAddress}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#DC2626',
                          fontFamily: 'monospace',
                        }}
                      >
                        {cluster.arrival || '08:00 AM'}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#DC2626',
                          opacity: 0.85,
                          fontFamily: 'monospace',
                        }}
                      >
                        +{
                          activeOpt?.legs?.[cluster.passengers.length - 1]?.distanceKm ??
                          (cluster.passengers.length > 0
                            ? Number(
                                estimateRoadDistanceKm(
                                  cluster.passengers[cluster.passengers.length - 1].lat,
                                  cluster.passengers[cluster.passengers.length - 1].lng,
                                  cluster.officeLat,
                                  cluster.officeLng,
                                ).toFixed(1),
                              )
                            : 0)
                        } km to Office
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
