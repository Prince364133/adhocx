'use client';

import React from 'react';
import Link from 'next/link';
import { Gauge, Navigation, Battery, ShieldCheck, Phone, ExternalLink } from 'lucide-react';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { FleetFix, GPS_COLORS, gpsStateOf, kindOf, TelemetryListState, vehicleLabel } from '../../lib/fleet-telemetry';

const tile: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface-muted)',
  padding: '10px',
  borderRadius: 'var(--radius-md, 8px)',
  border: '1px solid var(--border-subtle)',
};
const tileLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' };

function Row({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export interface VehicleDetailPanelProps {
  routeId: string;
  /** Corporate route from the routes list, when this cab is serving one. */
  route: CorporateRouteItem | null;
  /** Latest merged telemetry (from the 1 s UI tick); null when no GPS fix has arrived yet. */
  telemetry: FleetFix | null;
  nowMs: number;
  onClose: () => void;
}

/** Inspection drawer for one cab: corporate route details when known, else telemetry-derived info. */
export function VehicleDetailPanel({ routeId, route, telemetry, nowMs, onClose }: VehicleDetailPanelProps) {
  const kind = kindOf(telemetry ?? (route ? { kind: 'CORPORATE_ROUTE' } : undefined));
  const label = vehicleLabel({ routeId, kind });
  const gpsState: TelemetryListState = telemetry ? gpsStateOf(telemetry.recordedAt, nowMs) : 'NO_GPS';
  const ageSec = telemetry ? Math.max(0, Math.round((nowMs - telemetry.recordedAt) / 1000)) : null;
  const status = route?.status ?? telemetry?.status;
  const driverName =
    route?.driver?.fullName ||
    telemetry?.driverName ||
    (kind === 'TRIP'
      ? 'On-demand driver'
      : route?.status === 'DISPATCHING'
        ? 'Dispatching (searching driver)'
        : 'Unassigned Driver');
  const vehicleNo = route?.vehicle?.registrationNumber || telemetry?.vehicleNumber;

  return (
    <div
      style={{
        width: '340px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg, 10px)',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-card)',
        overflowY: 'auto',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
          <span className="code-tag">{label}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {kind === 'TRIP' ? 'On-demand trip' : 'Corporate route'}
          </span>
          {status && <StatusBadge status={status} size="sm" />}
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{driverName}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {route?.vehicle?.model ? `${route.vehicle.model} · ` : ''}
          <span className="code-tag">{vehicleNo || route?.vehicleCategory || 'VEHICLE'}</span>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
          <div style={tile}>
            <div style={tileLabel}>
              <Gauge size={13} />
              <span>Velocity</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {telemetry ? Math.round(telemetry.speedKph ?? 0) : '—'} <span style={{ fontSize: '11px', fontWeight: 400 }}>km/h</span>
            </div>
          </div>
          <div style={tile}>
            <div style={tileLabel}>
              <Navigation size={13} />
              <span>Bearing</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {telemetry ? `${Math.round(telemetry.heading ?? 0)}°` : '—'} <span style={{ fontSize: '11px', fontWeight: 400 }}>heading</span>
            </div>
          </div>
          <div style={tile}>
            <div style={tileLabel}>
              <ShieldCheck size={13} />
              <span>GPS Signal</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: GPS_COLORS[gpsState], marginTop: '6px' }}>
              {gpsState === 'NO_GPS' ? 'AWAITING GPS' : gpsState}
              {telemetry?.accuracyM !== undefined ? ` (±${Math.round(telemetry.accuracyM)}m)` : ''}
            </div>
            {ageSec !== null && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>last fix {ageSec}s ago</div>}
          </div>
          <div style={tile}>
            <div style={tileLabel}>
              <Battery size={13} />
              <span>Battery</span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
              {telemetry?.batteryPct !== undefined ? `${telemetry.batteryPct}%` : '—'}
            </div>
          </div>
        </div>

        <div
          style={{
            ...tile,
            padding: '10px 12px',
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          {route ? (
            <>
              {route.tenant?.name && (
                <Row
                  label="Company:"
                  value={route.tenant.code ? `${route.tenant.name} (${route.tenant.code})` : route.tenant.name}
                />
              )}
              <Row
                label="Shift:"
                value={`${String(route.shiftDate).slice(0, 10)} · ${route.shiftTime} (${route.direction})`}
              />
              <Row
                label="Occupancy:"
                value={`${route.assignedPassengerCount} / ${route.maxCapacity} seats filled`}
                color="var(--color-success, #16A34A)"
              />
              <Row label="Destination:" value={route.office?.name || 'Office Campus'} />
              {route.dispatchStatus && <Row label="Dispatch:" value={route.dispatchStatus} />}
            </>
          ) : (
            <>
              <Row label={kind === 'TRIP' ? 'Trip:' : 'Route:'} value={<span className="code-tag">{routeId.slice(0, 8).toUpperCase()}</span>} />
              {telemetry?.tripId && telemetry.tripId !== routeId && <Row label="Trip:" value={telemetry.tripId.slice(0, 8).toUpperCase()} />}
              {status && <Row label="Status:" value={status} />}
              {telemetry?.delayMinutes !== undefined && <Row label="Delay:" value={`${telemetry.delayMinutes} min`} />}
            </>
          )}
          {!telemetry && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No GPS fix received for this cab yet.</div>}
        </div>

        {route?.driver?.phone && (
          <div style={{ marginTop: '14px' }}>
            <a
              href={`tel:${route.driver.phone}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--brand-primary-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--brand-blue-500, #5728B2)',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Phone size={14} />
              <span>Call Driver ({route.driver.phone})</span>
            </a>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {kind === 'CORPORATE_ROUTE' && (
          <Link href={`/routes/${encodeURIComponent(routeId)}`} style={{ textDecoration: 'none' }}>
            <Button size="sm" variant="primary" rightIcon={<ExternalLink size={13} />} style={{ width: '100%' }}>
              View Route &amp; Directions
            </Button>
          </Link>
        )}
        <Button size="sm" variant="outline" onClick={onClose} style={{ width: '100%' }}>
          Close Telemetry
        </Button>
      </div>
    </div>
  );
}
