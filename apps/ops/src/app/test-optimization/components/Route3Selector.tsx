'use client';

import React from 'react';
import { RouteOption } from '../types';
import { ShieldCheck, Clock, Check, TrendingUp } from 'lucide-react';

interface Route3SelectorProps {
  routeOptions: RouteOption[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
}

export const Route3Selector: React.FC<Route3SelectorProps> = ({
  routeOptions,
  selectedIndex,
  onSelectRoute,
}) => {
  if (!routeOptions || routeOptions.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
            }}
          >
            Dispatch Corridors
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-muted)',
            }}
          >
            {routeOptions.length} Evaluated Corridors
          </span>
        </div>
      </div>

      {/* Corridor Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            routeOptions.length <= 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '8px',
        }}
      >
        {routeOptions.map((route, idx) => {
          const isSelected = selectedIndex === idx;
          const hasDelta =
            !route.isRecommended &&
            ((route.deltaVsBest?.kmDelta !== undefined && route.deltaVsBest.kmDelta > 0) ||
              (route.deltaVsBest?.minDelta !== undefined && route.deltaVsBest.minDelta > 0));

          return (
            <div
              key={route.index}
              onClick={() => onSelectRoute(idx)}
              style={{
                borderRadius: '8px',
                border: isSelected
                  ? '2px solid var(--brand-blue-500, #5728B2)'
                  : '1px solid var(--border-subtle)',
                backgroundColor: isSelected
                  ? 'var(--brand-primary-subtle)'
                  : 'var(--bg-surface)',
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                minWidth: 0,
              }}
            >
              <div>
                {/* Header: Option Tag and Status Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: isSelected
                          ? 'var(--brand-blue-500, #5728B2)'
                          : 'var(--bg-surface-muted)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {route.title}
                    </span>
                  </div>

                  {route.isRecommended && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        color: '#16A34A',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Check size={10} /> Primary
                    </span>
                  )}
                </div>

                {/* Primary Metrics: Distance & ETA */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {route.formattedDistance}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                    {route.formattedEta}
                  </span>
                </div>

                {/* Comparative Variance / Delta (Only when there is a difference) */}
                {hasDelta && (
                  <div style={{ marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-muted)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <TrendingUp size={10} style={{ color: 'var(--text-muted)' }} />
                      {route.deltaVsBest?.kmDelta && route.deltaVsBest.kmDelta > 0
                        ? `+${route.deltaVsBest.kmDelta} km`
                        : ''}
                      {route.deltaVsBest?.kmDelta &&
                      route.deltaVsBest.kmDelta > 0 &&
                      route.deltaVsBest?.minDelta &&
                      route.deltaVsBest.minDelta > 0
                        ? ' · '
                        : ''}
                      {route.deltaVsBest?.minDelta && route.deltaVsBest.minDelta > 0
                        ? `+${route.deltaVsBest.minDelta} min`
                        : ''}
                    </span>
                  </div>
                )}

                {/* Arterial Road Summary */}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginBottom: '6px',
                  }}
                >
                  via{' '}
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {route.summary}
                  </span>
                </div>
              </div>

              {/* Card Footer: Toll flag only if toll-free route */}
              {route.avoidTolls && (
                <div
                  style={{
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '10px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#16A34A',
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={11} /> Toll-Free
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
