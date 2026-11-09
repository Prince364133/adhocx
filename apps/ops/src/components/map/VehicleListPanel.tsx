'use client';

import React, { useMemo, useState } from 'react';
import { Search, Car, Briefcase } from 'lucide-react';
import {
  countByState,
  filterVehicles,
  GPS_COLORS,
  GpsFilter,
  KindFilter,
  VehicleListItem,
} from '../../lib/fleet-telemetry';

const MAX_ROWS = 200;

function chipStyle(active: boolean, color?: string): React.CSSProperties {
  return {
    padding: '3px 8px',
    borderRadius: 'var(--radius-pill)',
    border: `1px solid ${active ? color ?? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`,
    backgroundColor: active ? 'var(--brand-primary-subtle)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

function ageText(recordedAt: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - recordedAt) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export interface VehicleListPanelProps {
  /** Snapshot taken on the page's 1 s UI tick (never per fix). */
  items: VehicleListItem[];
  nowMs: number;
  onSelect: (routeId: string) => void;
}

/** Compact searchable/filterable list of every cab on the map. */
export function VehicleListPanel({ items, nowMs, onSelect }: VehicleListPanelProps) {
  const [query, setQuery] = useState('');
  const [gps, setGps] = useState<GpsFilter>('ALL');
  const [kind, setKind] = useState<KindFilter>('ALL');

  const counts = useMemo(() => countByState(items), [items]);
  const { rows, total } = useMemo(() => filterVehicles(items, { gps, kind, query }, MAX_ROWS), [items, gps, kind, query]);

  return (
    <div
      style={{
        width: '320px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg, 10px)',
        border: '1px solid var(--border-subtle)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Fleet ({items.length})</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click a cab to inspect</span>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Driver, route/trip id, vehicle no."
          style={{
            width: '100%',
            height: '30px',
            padding: '0 8px 0 26px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md, 8px)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button type="button" style={chipStyle(gps === 'ALL')} onClick={() => setGps('ALL')}>
          All {items.length}
        </button>
        {(['LIVE', 'STALE', 'OFFLINE'] as const).map((s) => (
          <button key={s} type="button" style={chipStyle(gps === s, GPS_COLORS[s])} onClick={() => setGps(s)}>
            <span style={{ color: GPS_COLORS[s] }}>●</span> {s} {counts[s]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button type="button" style={chipStyle(kind === 'ALL')} onClick={() => setKind('ALL')}>
          All types
        </button>
        <button type="button" style={chipStyle(kind === 'CORPORATE_ROUTE')} onClick={() => setKind('CORPORATE_ROUTE')}>
          Corporate
        </button>
        <button type="button" style={chipStyle(kind === 'TRIP')} onClick={() => setKind('TRIP')}>
          On-demand
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {rows.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
            {items.length === 0 ? 'No cabs reporting GPS yet.' : 'No cabs match these filters.'}
          </div>
        )}
        {rows.map((v) => (
          <button
            key={v.routeId}
            type="button"
            onClick={() => onSelect(v.routeId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 8px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            {v.kind === 'TRIP' ? (
              <Car size={14} color="#2563EB" style={{ flexShrink: 0 }} />
            ) : (
              <Briefcase size={14} color="var(--brand-blue-500, #5728B2)" style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {v.driverName || 'Unknown driver'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                {v.label}
                {v.vehicleNumber ? ` · ${v.vehicleNumber}` : ''} · {Math.round(v.speedKph)} km/h
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: GPS_COLORS[v.gpsState] }}>{v.gpsState}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ageText(v.recordedAt, nowMs)}</div>
            </div>
          </button>
        ))}
        {total > rows.length && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '6px' }}>
            Showing {rows.length} of {total}. Refine the search to see more.
          </div>
        )}
      </div>
    </div>
  );
}
