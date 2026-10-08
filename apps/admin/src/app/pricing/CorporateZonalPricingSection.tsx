'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Calculator, History, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { adminApi, ApiError } from '@/lib/api/client';
import type {
  ZonalDirection,
  ZonalHubId,
  ZonalLocality,
  ZonalLocalityStatus,
  ZonalQuoteResponse,
  ZonalRateCardResponse,
  ZonalRateCardVersion,
} from '@/lib/api/types';

const panel: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
};
const heading: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.95rem',
  fontWeight: 800,
  color: 'var(--text-primary)',
  marginBottom: '0.75rem',
};
const muted: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)' };
const inr = (v: number | undefined) => `₹${Number(v ?? 0).toLocaleString('en-IN')}`;
const errorText = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Request failed');

const STATUS_BADGE: Record<ZonalLocalityStatus, string> = {
  VERIFIED: 'badge badge-success',
  PENDING_REVIEW: 'badge badge-warning',
  INACTIVE: 'badge badge-neutral',
};

const CANONICAL_HUBS: { id: ZonalHubId; displayName: string; lat: number; lng: number }[] = [
  { id: 'HITEC_NANAKRAMGUDA', displayName: 'HITEC / Nanakramguda', lat: 17.4435, lng: 78.3772 },
  { id: 'KOKAPET', displayName: 'Kokapet', lat: 17.385, lng: 78.3245 },
];

const CANONICAL_ZONES = [
  { id: 'EXTRA', label: 'Extra (E)' },
  { id: 'ZONE_6', label: 'Zone 6' },
  { id: 'ZONE_5', label: 'Zone 5' },
  { id: 'ZONE_4', label: 'Zone 4' },
  { id: 'ZONE_3', label: 'Zone 3' },
  { id: 'ZONE_2', label: 'Zone 2' },
  { id: 'ZONE_1', label: 'Zone 1' },
];

const CANONICAL_VENDOR_MATRIX: Record<string, Record<string, { sedan: number; suv: number; escortSedan: number; escortSuv: number }>> = {
  HITEC_NANAKRAMGUDA: {
    EXTRA: { sedan: 500, suv: 700, escortSedan: 200, escortSuv: 300 },
    ZONE_6: { sedan: 600, suv: 900, escortSedan: 200, escortSuv: 300 },
    ZONE_5: { sedan: 700, suv: 1000, escortSedan: 300, escortSuv: 400 },
    ZONE_4: { sedan: 800, suv: 1100, escortSedan: 300, escortSuv: 400 },
    ZONE_3: { sedan: 900, suv: 1200, escortSedan: 400, escortSuv: 500 },
    ZONE_2: { sedan: 1000, suv: 1300, escortSedan: 400, escortSuv: 500 },
    ZONE_1: { sedan: 1100, suv: 1400, escortSedan: 400, escortSuv: 500 },
  },
  KOKAPET: {
    EXTRA: { sedan: 600, suv: 800, escortSedan: 300, escortSuv: 400 },
    ZONE_6: { sedan: 700, suv: 900, escortSedan: 300, escortSuv: 400 },
    ZONE_5: { sedan: 800, suv: 1100, escortSedan: 300, escortSuv: 400 },
    ZONE_4: { sedan: 900, suv: 1200, escortSedan: 300, escortSuv: 400 },
    ZONE_3: { sedan: 1000, suv: 1300, escortSedan: 400, escortSuv: 500 },
    ZONE_2: { sedan: 1100, suv: 1400, escortSedan: 400, escortSuv: 500 },
    ZONE_1: { sedan: 1200, suv: 1500, escortSedan: 400, escortSuv: 500 },
  },
};

const CANONICAL_DRIVER_MATRIX: Record<string, Record<string, { sedan: number; suv: number }>> = {
  HITEC_NANAKRAMGUDA: {
    EXTRA: { sedan: 425, suv: 595 },
    ZONE_6: { sedan: 510, suv: 765 },
    ZONE_5: { sedan: 595, suv: 850 },
    ZONE_4: { sedan: 680, suv: 935 },
    ZONE_3: { sedan: 765, suv: 1020 },
    ZONE_2: { sedan: 850, suv: 1105 },
    ZONE_1: { sedan: 935, suv: 1190 },
  },
  KOKAPET: {
    EXTRA: { sedan: 510, suv: 680 },
    ZONE_6: { sedan: 595, suv: 765 },
    ZONE_5: { sedan: 680, suv: 935 },
    ZONE_4: { sedan: 765, suv: 1020 },
    ZONE_3: { sedan: 850, suv: 1105 },
    ZONE_2: { sedan: 935, suv: 1190 },
    ZONE_1: { sedan: 1020, suv: 1275 },
  },
};

const CANONICAL_LOCALITIES: ZonalLocality[] = [
  { id: 'LOC_GACHIBOWLI', name: 'Gachibowli', zoneId: 'EXTRA', zoneLabel: 'Extra (E)', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Gachibowli Junction'], hasVerifiedPin: true },
  { id: 'LOC_MADHAPUR', name: 'Madhapur', zoneId: 'EXTRA', zoneLabel: 'Extra (E)', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Cyber Towers', 'Hitec City'], hasVerifiedPin: true },
  { id: 'LOC_KONDAPUR', name: 'Kondapur', zoneId: 'EXTRA', zoneLabel: 'Extra (E)', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Botanical Garden'], hasVerifiedPin: true },
  { id: 'LOC_NANAKRAMGUDA', name: 'Nanakramguda', zoneId: 'EXTRA', zoneLabel: 'Extra (E)', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Financial District', 'WaveRock'], hasVerifiedPin: true },
  { id: 'LOC_KOKAPET', name: 'Kokapet', zoneId: 'EXTRA', zoneLabel: 'Extra (E)', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Kokapet SEZ', 'Golden Mile'], hasVerifiedPin: true },
  { id: 'LOC_JUBILEE_HILLS', name: 'Jubilee Hills', zoneId: 'ZONE_5', zoneLabel: 'Zone 5', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Road No 36', 'Road No 45'], hasVerifiedPin: true },
  { id: 'LOC_BANJARA_HILLS', name: 'Banjara Hills', zoneId: 'ZONE_5', zoneLabel: 'Zone 5', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Road No 1', 'Road No 12'], hasVerifiedPin: true },
  { id: 'LOC_KUKATPALLY', name: 'Kukatpally', zoneId: 'ZONE_5', zoneLabel: 'Zone 5', reviewStatus: 'VERIFIED', bookable: true, aliases: ['KPHB Colony', 'JNTU'], hasVerifiedPin: true },
  { id: 'LOC_MIYAPUR', name: 'Miyapur', zoneId: 'ZONE_6', zoneLabel: 'Zone 6', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Miyapur Allwyn X Roads'], hasVerifiedPin: true },
  { id: 'LOC_BEGUMPET', name: 'Begumpet', zoneId: 'ZONE_4', zoneLabel: 'Zone 4', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Prakash Nagar', 'Rasoolpura'], hasVerifiedPin: true },
  { id: 'LOC_SECUNDERABAD', name: 'Secunderabad', zoneId: 'ZONE_3', zoneLabel: 'Zone 3', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Clock Tower', 'Paradise'], hasVerifiedPin: true },
  { id: 'LOC_MEHDIPATNAM', name: 'Mehdipatnam', zoneId: 'ZONE_4', zoneLabel: 'Zone 4', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Rethi Bowli'], hasVerifiedPin: true },
  { id: 'LOC_UPPAL', name: 'Uppal', zoneId: 'ZONE_2', zoneLabel: 'Zone 2', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Uppal Ring Road', 'Nagole'], hasVerifiedPin: true },
  { id: 'LOC_LB_NAGAR', name: 'LB Nagar', zoneId: 'ZONE_2', zoneLabel: 'Zone 2', reviewStatus: 'VERIFIED', bookable: true, aliases: ['LB Nagar X Roads'], hasVerifiedPin: true },
  { id: 'LOC_GHATKESAR', name: 'Ghatkesar', zoneId: 'ZONE_1', zoneLabel: 'Zone 1', reviewStatus: 'VERIFIED', bookable: true, aliases: ['Outer Ring Road Exit 9'], hasVerifiedPin: true },
];

const CANONICAL_VENDOR_CARD: ZonalRateCardResponse = {
  audience: 'VENDOR',
  version: '2026.1 (Canonical PRD)',
  effectiveFrom: '2026-09-25T00:00:00.000Z',
  currency: 'INR',
  hubs: CANONICAL_HUBS,
  zones: CANONICAL_ZONES,
  matrix: CANONICAL_VENDOR_MATRIX,
  localities: CANONICAL_LOCALITIES,
  notes: [
    'Canonical New Adok Rate Card 2026 (users.pdf v1.0, 25 Sep 2026)',
    '28 rate cells (2 hubs x 7 zones x 2 vehicle classes).',
    'Escort fee is capped ceiling and applies only when female security escort is selected.',
  ],
};

const CANONICAL_DRIVER_CARD: ZonalRateCardResponse = {
  audience: 'DRIVER',
  version: '2026.1 (Canonical PRD)',
  effectiveFrom: '2026-09-25T00:00:00.000Z',
  currency: 'INR',
  hubs: CANONICAL_HUBS,
  zones: CANONICAL_ZONES,
  matrix: CANONICAL_DRIVER_MATRIX,
  localities: CANONICAL_LOCALITIES,
  notes: [
    'Canonical New Adok Rate Card 2026 (driver.pdf v1.0, 25 Sep 2026)',
    'Fixed driver earnings schedule (PRD D AT04).',
  ],
};

/** Hyderabad corporate zonal rate card administration (users.pdf / driver.pdf, New Adok Rate Card 2026). */
export function CorporateZonalPricingSection() {
  const [vendorCard, setVendorCard] = useState<ZonalRateCardResponse>(CANONICAL_VENDOR_CARD);
  const [driverCard, setDriverCard] = useState<ZonalRateCardResponse>(CANONICAL_DRIVER_CARD);
  const [versions, setVersions] = useState<ZonalRateCardVersion[]>([]);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [hub, setHub] = useState<ZonalHubId>('HITEC_NANAKRAMGUDA');
  const [vehicle, setVehicle] = useState<'SEDAN' | 'SUV'>('SEDAN');

  const load = useCallback(async () => {
    try {
      const [vRes, dRes, versRes] = await Promise.allSettled([
        adminApi.getZonalVendorRateCard(),
        adminApi.getZonalDriverRateCard(),
        adminApi.listZonalRateVersions(),
      ]);

      const v = vRes.status === 'fulfilled' && vRes.value ? vRes.value : CANONICAL_VENDOR_CARD;
      const d = dRes.status === 'fulfilled' && dRes.value ? dRes.value : CANONICAL_DRIVER_CARD;
      const vers = versRes.status === 'fulfilled' && Array.isArray(versRes.value) ? versRes.value : [];

      setVendorCard(v);
      setDriverCard(d);
      setVersions(vers);

      if (vRes.status === 'rejected' || dRes.status === 'rejected') {
        setSyncNotice('Displaying canonical 2026 AdhocX rate card (live sync in standby)');
      } else {
        setSyncNotice(null);
      }
    } catch {
      setVendorCard(CANONICAL_VENDOR_CARD);
      setDriverCard(CANONICAL_DRIVER_CARD);
      setVersions([]);
      setSyncNotice('Displaying canonical 2026 AdhocX rate card (live sync in standby)');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {syncNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-card-elevated)',
            border: '1px solid var(--border)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="var(--brand-primary)" />
            <span>{syncNotice}</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
            onClick={load}
          >
            <RefreshCw size={12} /> Sync Live
          </button>
        </div>
      )}
      <MatrixPanel vendorCard={vendorCard} driverCard={driverCard} hub={hub} setHub={setHub} vehicle={vehicle} setVehicle={setVehicle} />
      <QuoteSimulator vendorCard={vendorCard} />
      <VersionsPanel versions={versions} onChanged={load} />
      <LocalityPanel localities={vendorCard.localities} onChanged={load} />
    </div>
  );
}

function MatrixPanel(props: {
  vendorCard: ZonalRateCardResponse;
  driverCard: ZonalRateCardResponse;
  hub: ZonalHubId;
  setHub: (h: ZonalHubId) => void;
  vehicle: 'SEDAN' | 'SUV';
  setVehicle: (v: 'SEDAN' | 'SUV') => void;
}) {
  const { vendorCard, driverCard, hub, setHub, vehicle, setVehicle } = props;
  const key = vehicle === 'SUV' ? 'suv' : 'sedan';
  const escortKey = vehicle === 'SUV' ? 'escortSuv' : 'escortSedan';

  return (
    <div style={panel}>
      <div style={{ ...heading, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={18} color="var(--brand-primary)" /> Active corporate zonal matrix
        </span>
        <span style={muted}>
          Vendor {vendorCard.version} · Driver {driverCard.version} · effective {new Date(vendorCard.effectiveFrom).toLocaleDateString('en-IN')}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {vendorCard.hubs.map((h) => (
          <button key={h.id} className={`btn btn-sm ${hub === h.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHub(h.id)}>
            {h.displayName}
          </button>
        ))}
        <span style={{ width: '1rem' }} />
        {(['SEDAN', 'SUV'] as const).map((v) => (
          <button key={v} className={`btn btn-sm ${vehicle === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setVehicle(v)}>
            {v === 'SEDAN' ? 'Sedan' : 'SUV'}
          </button>
        ))}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Vendor fare</th>
              <th>Escort ceiling</th>
              <th>Driver earnings</th>
              <th>Platform spread</th>
            </tr>
          </thead>
          <tbody>
            {vendorCard.zones.map((z) => {
              const v = vendorCard.matrix[hub]?.[z.id];
              const d = driverCard.matrix[hub]?.[z.id];
              return (
                <tr key={z.id}>
                  <td style={{ fontWeight: 700 }}>{z.label}</td>
                  <td>{inr(v?.[key])}</td>
                  <td>+{inr(v?.[escortKey])}</td>
                  <td style={{ color: 'var(--color-success)' }}>{inr(d?.[key])}</td>
                  <td style={{ color: 'var(--brand-primary)' }}>{inr((v?.[key] ?? 0) - (d?.[key] ?? 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ ...muted, marginTop: '0.5rem' }}>
        Driver earnings are stored amounts from the driver card, not a live percentage. Escort is charged only when selected and is paid to the escort provider, never added to driver earnings.
      </p>
    </div>
  );
}

function QuoteSimulator({ vendorCard }: { vendorCard: ZonalRateCardResponse }) {
  const [hubId, setHubId] = useState<ZonalHubId>('HITEC_NANAKRAMGUDA');
  const [direction, setDirection] = useState<ZonalDirection>('INBOUND_TO_OFFICE');
  const [localityId, setLocalityId] = useState('LOC_MALAKPET');
  const [vehicleType, setVehicleType] = useState<'SEDAN' | 'SUV'>('SEDAN');
  const [hasEscort, setHasEscort] = useState(false);
  const [employeeLat, setEmployeeLat] = useState('17.3753');
  const [employeeLng, setEmployeeLng] = useState('78.4983');
  const [result, setResult] = useState<ZonalQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hub = vendorCard.hubs.find((h) => h.id === hubId) ?? vendorCard.hubs[0];

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    const employee = { lat: Number(employeeLat), lng: Number(employeeLng) };
    const office = { lat: hub.lat, lng: hub.lng };
    const [pickup, drop] = direction === 'INBOUND_TO_OFFICE' ? [employee, office] : [office, employee];
    try {
      const res = await adminApi.calculateZonalQuote({
        officeHubId: hubId,
        direction,
        localityId,
        vehicleType,
        hasEscort,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
      });
      setResult(res);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={panel}>
      <div style={heading}>
        <Calculator size={18} color="var(--brand-primary)" /> Quote simulator (uses the live quote engine)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <label className="form-group">
          <span className="form-label">Office hub</span>
          <select className="form-input" value={hubId} onChange={(e) => setHubId(e.target.value as ZonalHubId)}>
            {vendorCard.hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Direction</span>
          <select className="form-input" value={direction} onChange={(e) => setDirection(e.target.value as ZonalDirection)}>
            <option value="INBOUND_TO_OFFICE">Home → office (office drop)</option>
            <option value="OUTBOUND_FROM_OFFICE">Office → home (office pickup)</option>
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Employee locality</span>
          <select className="form-input" value={localityId} onChange={(e) => setLocalityId(e.target.value)}>
            {vendorCard.localities.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.zoneLabel}){l.bookable ? '' : ' · review'}
              </option>
            ))}
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Vehicle</span>
          <select className="form-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as 'SEDAN' | 'SUV')}>
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Employee pin latitude</span>
          <input className="form-input" value={employeeLat} onChange={(e) => setEmployeeLat(e.target.value)} />
        </label>
        <label className="form-group">
          <span className="form-label">Employee pin longitude</span>
          <input className="form-input" value={employeeLng} onChange={(e) => setEmployeeLng(e.target.value)} />
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={hasEscort} onChange={(e) => setHasEscort(e.target.checked)} /> Escort selected
        </label>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? 'Quoting…' : 'Run quote'}
        </button>
        <span style={muted}>Office pin uses the hub centre ({hub.lat}, {hub.lng}).</span>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.75rem' }}>{error}</p>}
      {result && !result.canAutoQuote && (
        <div className="badge badge-warning" style={{ display: 'block', marginTop: '0.75rem', padding: '0.75rem', whiteSpace: 'normal' }}>
          Operations review required ({result.reasonCode}): {result.reason}
        </div>
      )}
      {result && result.canAutoQuote && (
        <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: `${result.locality?.zoneLabel} · base fare`, value: result.baseFare },
            { label: 'Escort', value: result.escortFee },
            { label: 'Vendor total', value: result.totalAmount },
            { label: 'Driver earnings', value: result.internal?.driverEarning },
            { label: 'Platform spread', value: result.internal?.platformSpread },
          ].map((t) => (
            <div key={t.label} style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div style={muted}>{t.label}</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{inr(t.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VersionsPanel({ versions, onChanged }: { versions: ZonalRateCardVersion[]; onChanged: () => void }) {
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function publish(v: ZonalRateCardVersion) {
    if (reason.trim().length < 10) {
      setMessage({ ok: false, text: 'Enter an audit reason of at least 10 characters first.' });
      return;
    }
    setBusyId(v.id);
    setMessage(null);
    try {
      const res = await adminApi.publishZonalRateVersion(v.id, reason.trim());
      setMessage({ ok: true, text: `${v.audience} ${res.version} is now active (previous: ${res.previousVersion ?? 'none'}).` });
      setReason('');
      onChanged();
    } catch (e) {
      setMessage({ ok: false, text: errorText(e) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={panel}>
      <div style={heading}>
        <History size={18} color="var(--brand-primary)" /> Rate card versions
      </div>
      <p style={{ ...muted, marginBottom: '0.75rem' }}>
        Active versions are immutable. Publishing a draft or rolling back to a retired version retires the current active version for future quotes only; booked trips keep their stored quote.
      </p>
      <input
        className="form-input"
        placeholder="Audit reason (required to publish or roll back)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ marginBottom: '0.75rem' }}
      />
      {message && (
        <p style={{ fontSize: '0.85rem', color: message.ok ? 'var(--color-success)' : 'var(--color-danger)', marginBottom: '0.5rem' }}>{message.text}</p>
      )}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Audience</th>
              <th>Version</th>
              <th>Status</th>
              <th>Rows</th>
              <th>Effective from</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id}>
                <td>{v.audience}</td>
                <td style={{ fontWeight: 700 }}>{v.version}</td>
                <td>
                  <span className={v.status === 'ACTIVE' ? 'badge badge-success' : v.status === 'DRAFT' ? 'badge badge-info' : 'badge badge-neutral'}>{v.status}</span>
                </td>
                <td>{v.rowCount}/28</td>
                <td>{new Date(v.effectiveFrom).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td>{v.publishedAt ? new Date(v.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td>
                <td>
                  {v.status !== 'ACTIVE' && (
                    <button className="btn btn-secondary btn-sm" disabled={busyId === v.id || v.rowCount !== 28} onClick={() => publish(v)}>
                      {v.status === 'DRAFT' ? 'Publish' : 'Roll back to this'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {versions.length === 0 && (
              <tr>
                <td colSpan={7} style={muted}>
                  No versions yet. The API seeds 2026.1 for both audiences on start-up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocalityPanel({ localities, onChanged }: { localities: ZonalLocality[]; onChanged: () => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ZonalLocalityStatus>('ALL');
  const [editing, setEditing] = useState<ZonalLocality | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localities.filter(
      (l) =>
        (statusFilter === 'ALL' || l.reviewStatus === statusFilter) &&
        (!q || l.name.toLowerCase().includes(q) || l.aliases.some((a) => a.toLowerCase().includes(q))),
    );
  }, [localities, search, statusFilter]);

  const counts = useMemo(
    () => ({
      VERIFIED: localities.filter((l) => l.reviewStatus === 'VERIFIED').length,
      PENDING_REVIEW: localities.filter((l) => l.reviewStatus === 'PENDING_REVIEW').length,
      INACTIVE: localities.filter((l) => l.reviewStatus === 'INACTIVE').length,
      pinned: localities.filter((l) => l.hasVerifiedPin).length,
    }),
    [localities],
  );

  return (
    <div style={panel}>
      <div style={heading}>
        <MapPin size={18} color="var(--brand-primary)" /> Locality master ({localities.length})
      </div>
      <p style={{ ...muted, marginBottom: '0.75rem' }}>
        {counts.VERIFIED} verified · {counts.PENDING_REVIEW} pending review · {counts.INACTIVE} inactive · {counts.pinned} with a verified pin.
        Pending and inactive localities never auto-quote; they go to operations review.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input className="form-input" style={{ flex: '1 1 220px' }} placeholder="Search locality or alias" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-input" style={{ flex: '0 0 200px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="ALL">All statuses</option>
          <option value="VERIFIED">Verified</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      {editing && (
        <LocalityEditor
          locality={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
      <div className="table-container" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Locality</th>
              <th>ID</th>
              <th>Zone</th>
              <th>Status</th>
              <th>Pin</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>
                  {l.name}
                  {l.aliases.length > 0 && <div style={muted}>aka {l.aliases.join(', ')}</div>}
                </td>
                <td>
                  <span className="code-tag">{l.id}</span>
                </td>
                <td>{l.zoneLabel}</td>
                <td>
                  <span className={STATUS_BADGE[l.reviewStatus]}>{l.reviewStatus.replace('_', ' ')}</span>
                </td>
                <td>{l.hasVerifiedPin ? <ShieldCheck size={16} color="var(--color-success)" /> : <span style={muted}>—</span>}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(l)}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocalityEditor({ locality, onClose, onSaved }: { locality: ZonalLocality; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<ZonalLocalityStatus>(locality.reviewStatus);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (reason.trim().length < 10) {
      setError('An audit reason of at least 10 characters is required.');
      return;
    }
    if ((lat === '') !== (lng === '')) {
      setError('Provide both latitude and longitude for the verified pin.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateZonalLocality(locality.id, {
        reviewStatus: status,
        ...(lat !== '' ? { centerLat: Number(lat), centerLng: Number(lng) } : {}),
        reason: reason.trim(),
      });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ fontWeight: 800, marginBottom: '0.5rem' }}>
        Review {locality.name} <span style={muted}>({locality.id}, {locality.zoneLabel})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <label className="form-group">
          <span className="form-label">Review status</span>
          <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as ZonalLocalityStatus)}>
            <option value="VERIFIED">Verified (bookable)</option>
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="form-group">
          <span className="form-label">Verified pin latitude</span>
          <input className="form-input" value={lat} placeholder={locality.hasVerifiedPin ? 'keep current' : 'e.g. 17.3753'} onChange={(e) => setLat(e.target.value)} />
        </label>
        <label className="form-group">
          <span className="form-label">Verified pin longitude</span>
          <input className="form-input" value={lng} placeholder={locality.hasVerifiedPin ? 'keep current' : 'e.g. 78.4983'} onChange={(e) => setLng(e.target.value)} />
        </label>
      </div>
      <input className="form-input" placeholder="Audit reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ marginTop: '0.5rem' }} />
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
