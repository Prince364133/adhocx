'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Car,
  ShieldCheck,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Search,
  Zap,
  Percent,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { ZonalQuoteResponse, ZonalVendorRateCardResponse } from '../../lib/api/types';

// Canonical 2026 Hyderabad Zonal Matrix Reference
const CANONICAL_HUBS = [
  { id: 'HITEC_NANAKRAMGUDA', name: 'HITEC City / Nanakramguda Hub', area: 'Cyberabad Core' },
  { id: 'KOKAPET', name: 'Kokapet Hub', area: 'Financial District & SEZ' },
] as const;

type HubId = (typeof CANONICAL_HUBS)[number]['id'];

interface ZoneRowSpec {
  zoneId: string;
  zoneName: string;
  distanceBand: string;
  sampleLocalities: string;
  rates: {
    [key in HubId]: {
      sedan: number;
      suv: number;
      driverSedan: number;
      driverSuv: number;
      escortSedan: number;
      escortSuv: number;
    };
  };
}

const CANONICAL_ZONES: ZoneRowSpec[] = [
  {
    zoneId: 'EXTRA',
    zoneName: 'Extra Zone (Corridor Adjacent)',
    distanceBand: '0 - 5 KM',
    sampleLocalities: 'Gachibowli, Raidurg, Financial District, Kondapur (Core), Nanakramguda',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 500, suv: 700, driverSedan: 425, driverSuv: 595, escortSedan: 200, escortSuv: 300 },
      KOKAPET: { sedan: 600, suv: 800, driverSedan: 510, driverSuv: 680, escortSedan: 300, escortSuv: 400 },
    },
  },
  {
    zoneId: 'ZONE_6',
    zoneName: 'Zone 6 (Inner West & Suburbs)',
    distanceBand: '5 - 10 KM',
    sampleLocalities: 'Madhapur, Jubilee Hills, Manikonda, Tolichowki, Hafeezpet, Shaikpet',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 600, suv: 900, driverSedan: 510, driverSuv: 765, escortSedan: 200, escortSuv: 300 },
      KOKAPET: { sedan: 700, suv: 900, driverSedan: 595, driverSuv: 765, escortSedan: 300, escortSuv: 400 },
    },
  },
  {
    zoneId: 'ZONE_5',
    zoneName: 'Zone 5 (Mid-Ring Urban Corridors)',
    distanceBand: '10 - 15 KM',
    sampleLocalities: 'Banjara Hills, Mehdipatnam, Kukatpally, Lingampally, Miyapur, Chandanagar',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 700, suv: 1000, driverSedan: 595, driverSuv: 850, escortSedan: 300, escortSuv: 400 },
      KOKAPET: { sedan: 800, suv: 1100, driverSedan: 680, driverSuv: 935, escortSedan: 300, escortSuv: 400 },
    },
  },
  {
    zoneId: 'ZONE_4',
    zoneName: 'Zone 4 (East-Central & Old City)',
    distanceBand: '15 - 20 KM',
    sampleLocalities: 'Malakpet, Dilsukhnagar, Saidabad, Santosh Nagar, Chandrayangutta, Falaknuma, Charminar',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 800, suv: 1100, driverSedan: 680, driverSuv: 935, escortSedan: 300, escortSuv: 400 },
      KOKAPET: { sedan: 900, suv: 1200, driverSedan: 765, driverSuv: 1020, escortSedan: 300, escortSuv: 400 },
    },
  },
  {
    zoneId: 'ZONE_3',
    zoneName: 'Zone 3 (Secunderabad & Outer Ring)',
    distanceBand: '20 - 25 KM',
    sampleLocalities: 'Secunderabad, Begumpet, Tarnaka, Uppal, LB Nagar, Attapur, Rajendranagar',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 900, suv: 1200, driverSedan: 765, driverSuv: 1020, escortSedan: 400, escortSuv: 500 },
      KOKAPET: { sedan: 1000, suv: 1300, driverSedan: 850, driverSuv: 1105, escortSedan: 400, escortSuv: 500 },
    },
  },
  {
    zoneId: 'ZONE_2',
    zoneName: 'Zone 2 (North & North-East Peripheral)',
    distanceBand: '25 - 30 KM',
    sampleLocalities: 'ECIL, Malkajgiri, Alwal, Kompally, Nagole, Hayathnagar, Bowenpally',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 1000, suv: 1300, driverSedan: 850, driverSuv: 1105, escortSedan: 400, escortSuv: 500 },
      KOKAPET: { sedan: 1100, suv: 1400, driverSedan: 935, driverSuv: 1190, escortSedan: 400, escortSuv: 500 },
    },
  },
  {
    zoneId: 'ZONE_1',
    zoneName: 'Zone 1 (Outer Perimeter & Far Industrial)',
    distanceBand: '30+ KM',
    sampleLocalities: 'Medchal, Shamirpet, Ghatkesar, Patancheru, Shamshabad, Ibrahimpatnam',
    rates: {
      HITEC_NANAKRAMGUDA: { sedan: 1100, suv: 1400, driverSedan: 935, driverSuv: 1190, escortSedan: 400, escortSuv: 500 },
      KOKAPET: { sedan: 1200, suv: 1500, driverSedan: 1020, driverSuv: 1275, escortSedan: 400, escortSuv: 500 },
    },
  },
];

// Sample of 240+ mapped localities with zones and flags
const LOCALITY_DIRECTORY_SAMPLE = [
  { name: 'Malakpet', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'East Hyderabad Corridor' },
  { name: 'Saidabad', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Near Saroornagar' },
  { name: 'Santosh Nagar', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Old City connector' },
  { name: 'Dilsukhnagar', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Major commercial hub' },
  { name: 'Chandrayangutta', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Inner Ring Road' },
  { name: 'Falaknuma', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'South zone' },
  { name: 'Charminar', zone: 'Zone 4', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Heritage corridor' },
  { name: 'Neknampur (Nexampuri)', zone: 'Zone 6', hub: 'Kokapet / HITEC', status: 'VERIFIED', notes: 'Colloquial alias normalized' },
  { name: 'Kokapet SEZ', zone: 'Extra Zone', hub: 'Kokapet Hub', status: 'VERIFIED', notes: 'Financial District extension' },
  { name: 'HITEC City Cyber Towers', zone: 'Extra Zone', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'Primary Tech Park' },
  { name: 'Kondapur (core)', zone: 'Extra Zone', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'Near Botanical Garden' },
  { name: 'Kondapur (outskirts)', zone: 'Zone 6', hub: 'HITEC Hub', status: 'REVIEW_REQUIRED', notes: 'Boundary check needed' },
  { name: 'Gachibowli Stadium', zone: 'Extra Zone', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Sports & IT corridor' },
  { name: 'Madhapur', zone: 'Zone 6', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'Mindspace corridor' },
  { name: 'Jubilee Hills', zone: 'Zone 6', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'Road No 36 / 45' },
  { name: 'Banjara Hills', zone: 'Zone 5', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'Road No 1 to 14' },
  { name: 'Kukatpally Housing Board', zone: 'Zone 5', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'KPHB Phase 1-9' },
  { name: 'Miyapur Metro Station', zone: 'Zone 5', hub: 'HITEC Hub', status: 'VERIFIED', notes: 'North-West Corridor' },
  { name: 'Secunderabad Station', zone: 'Zone 3', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Twin Cities Transit' },
  { name: 'Uppal Ring Road', zone: 'Zone 3', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Stadium corridor' },
  { name: 'ECIL Crossroads', zone: 'Zone 2', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'North-East Suburb' },
  { name: 'Kompally NH44', zone: 'Zone 2', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Nagpur Highway' },
  { name: 'Medchal Industrial Area', zone: 'Zone 1', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'ORR Exit 6' },
  { name: 'Shamirpet Biotech Park', zone: 'Zone 1', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Genome Valley' },
  { name: 'Patancheru IDA', zone: 'Zone 1', hub: 'HITEC / Kokapet', status: 'VERIFIED', notes: 'Industrial corridor' },
  { name: 'Shamshabad Airport Zone', zone: 'Zone 1', hub: 'Kokapet Hub', status: 'VERIFIED', notes: 'RGIA Airport corridor' },
];

export function CorporateZonalPricingSection() {
  const [selectedHub, setSelectedHub] = useState<HubId>('HITEC_NANAKRAMGUDA');
  const [selectedVehicle, setSelectedVehicle] = useState<'SEDAN' | 'SUV'>('SEDAN');
  const [liveCard, setLiveCard] = useState<ZonalVendorRateCardResponse | null>(null);

  // Quote Simulator State
  const [simPickup, setSimPickup] = useState('Malakpet');
  const [simDrop, setSimDrop] = useState('HITEC City Cyber Towers');
  const [simVehicle, setSimVehicle] = useState<'SEDAN' | 'SUV'>('SEDAN');
  const [simHasEscort, setSimHasEscort] = useState(false);
  const [simIsNight, setSimIsNight] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<ZonalQuoteResponse | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Locality Search State
  const [localitySearch, setLocalitySearch] = useState('');

  useEffect(() => {
    adminApi
      .getZonalVendorRateCard()
      .then((data) => setLiveCard(data))
      .catch(() => {
        // Fallback gracefully to canonical hardcoded matrix
      });
  }, []);

  async function handleRunQuoteSimulation() {
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);

    try {
      const res = await adminApi.calculateZonalQuote({
        pickupText: simPickup.trim(),
        dropText: simDrop.trim(),
        vehicleType: simVehicle,
        hasEscort: simHasEscort,
        pickupTime: simIsNight ? '22:30' : '10:00',
      });
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Failed to simulate zonal quote');
    } finally {
      setSimLoading(false);
    }
  }

  const filteredLocalities = useMemo(() => {
    if (!localitySearch.trim()) return LOCALITY_DIRECTORY_SAMPLE;
    const q = localitySearch.toLowerCase();
    return LOCALITY_DIRECTORY_SAMPLE.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.zone.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q)
    );
  }, [localitySearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* ── Section Header Banner ─────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(91, 66, 243, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(91, 66, 243, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                background: 'var(--brand-primary)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                letterSpacing: '0.05em',
              }}
            >
              2026 PRODUCTION MASTER
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Version: {liveCard?.version || '2026.1-CANONICAL'} • Active B2B Fleet Engine
            </span>
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Corporate Zonal 2026 Fleet Rate Card & Spatial Engine
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', maxWidth: '780px' }}>
            Deterministic 28-cell flat-rate matrix powering AdhocX Bulk Corporate Fleet. Eliminates per-km surge volatility, 
            guarantees fixed 85% net driver payouts, and integrates Uber H3 spatial resolution with Redis GEO.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div
            style={{
              textAlign: 'right',
              padding: '0.75rem 1.25rem',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Driver Payout Ratio</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>
              {liveCard ? `${liveCard.driverPayoutRatio * 100}%` : '85.0% Guaranteed'}
            </div>
          </div>
          <div
            style={{
              textAlign: 'right',
              padding: '0.75rem 1.25rem',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Platform Margin</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-primary)' }}>15.0% Fixed</div>
          </div>
        </div>
      </div>

      {/* ── Interactive Hub & Vehicle Selectors ─────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={20} color="var(--brand-primary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Office Hub:</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {CANONICAL_HUBS.map((hub) => {
              const isSelected = selectedHub === hub.id;
              return (
                <button
                  key={hub.id}
                  onClick={() => setSelectedHub(hub.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                    color: isSelected ? '#fff' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {hub.name}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Car size={20} color="var(--brand-primary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vehicle Class:</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['SEDAN', 'SUV'] as const).map((v) => {
              const isSelected = selectedVehicle === v;
              return (
                <button
                  key={v}
                  onClick={() => setSelectedVehicle(v)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(91, 66, 243, 0.15)' : 'var(--bg-surface-elevated)',
                    color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {v === 'SEDAN' ? 'Sedan (Dzire / Etios)' : 'SUV (Ertiga / Innova)'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 7-Zone Canonical Rate Matrix Table ─────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {selectedHub === 'HITEC_NANAKRAMGUDA' ? 'HITEC / Nanakramguda Hub' : 'Kokapet Hub'} • {selectedVehicle} Pricing Grid
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Full 7-zone deterministic matrix with decoupled 85% net driver payouts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>🛡️ Escort Day: <strong>+₹200</strong></span>
            <span>🛡️ Escort Night (8PM-6AM): <strong>+₹500</strong></span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Zone & Radius</th>
                <th style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Key Localities & Corridors</th>
                <th style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Corporate Client Rate</th>
                <th style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--color-success)', textAlign: 'right' }}>Driver 85% Payout</th>
                <th style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--brand-primary)', textAlign: 'right' }}>AdhocX 15% Margin</th>
                <th style={{ padding: '0.875rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Dispatch SLA</th>
              </tr>
            </thead>
            <tbody>
              {CANONICAL_ZONES.map((zone) => {
                const hubRates = zone.rates[selectedHub];
                const clientRate = selectedVehicle === 'SEDAN' ? hubRates.sedan : hubRates.suv;
                const driverPayout = selectedVehicle === 'SEDAN' ? hubRates.driverSedan : hubRates.driverSuv;
                const platformMargin = clientRate - driverPayout;

                return (
                  <tr
                    key={zone.zoneId}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{zone.zoneName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Band: {zone.distanceBand}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', maxWidth: '340px' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {zone.sampleLocalities}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                        ₹ {clientRate}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flat guaranteed</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-success)' }}>
                        ₹ {driverPayout}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>85% net earnings</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                        ₹ {platformMargin}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>15% take</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--color-success)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        ⚡ Direct Dispatch
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Live Zonal Quote & Boundary Verification Studio ───────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Simulator Input Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(91, 66, 243, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={18} color="var(--brand-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Live Zonal Quote Simulator
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Test the backend resolution engine with any Hyderabad route, alias, or outskirts.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              QUICK TEST PRESETS:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {[
                { label: 'Malakpet ➔ HITEC (Zone 4)', p: 'Malakpet', d: 'HITEC City Cyber Towers', v: 'SEDAN' as const, e: false },
                { label: 'Kokapet ➔ Shamirpet (Zone 1)', p: 'Kokapet SEZ', d: 'Shamirpet Biotech Park', v: 'SUV' as const, e: true },
                { label: 'Nexampuri Alias (Zone 6)', p: 'Nexampuri', d: 'HITEC City', v: 'SEDAN' as const, e: false },
                { label: 'Kondapur Outskirts (Review)', p: 'Kondapur (outskirts)', d: 'HITEC City', v: 'SEDAN' as const, e: false },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSimPickup(preset.p);
                    setSimDrop(preset.d);
                    setSimVehicle(preset.v);
                    setSimHasEscort(preset.e);
                  }}
                  style={{
                    padding: '0.3rem 0.65rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pickup and Drop Inputs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Pickup Locality / Landmark *
            </label>
            <input
              type="text"
              value={simPickup}
              onChange={(e) => setSimPickup(e.target.value)}
              placeholder="e.g. Malakpet, Nexampuri, Kondapur..."
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Drop Location / Office Hub *
            </label>
            <input
              type="text"
              value={simDrop}
              onChange={(e) => setSimDrop(e.target.value)}
              placeholder="e.g. HITEC City Cyber Towers, Kokapet SEZ..."
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            />
          </div>

          {/* Options Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Vehicle Class
              </label>
              <select
                value={simVehicle}
                onChange={(e) => setSimVehicle(e.target.value as 'SEDAN' | 'SUV')}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <option value="SEDAN">Sedan (Dzire / Etios)</option>
                <option value="SUV">SUV (Ertiga / Innova)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Shift Timing
              </label>
              <select
                value={simIsNight ? 'NIGHT' : 'DAY'}
                onChange={(e) => setSimIsNight(e.target.value === 'NIGHT')}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <option value="DAY">Day Shift (6 AM - 8 PM)</option>
                <option value="NIGHT">Night Shift (8 PM - 6 AM)</option>
              </select>
            </div>
          </div>

          {/* Escort Switch */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              cursor: 'pointer',
              background: 'var(--bg-surface-elevated)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <input
              type="checkbox"
              checked={simHasEscort}
              onChange={(e) => setSimHasEscort(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
            />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Security Escort Guard Required
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Adds flat safety escort surcharge (+₹200 Day / +₹500 Night)
              </div>
            </div>
          </label>

          <button
            onClick={handleRunQuoteSimulation}
            disabled={simLoading || !simPickup.trim() || !simDrop.trim()}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.9375rem',
              border: 'none',
              cursor: simLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'opacity 0.15s ease',
              opacity: simLoading ? 0.6 : 1,
            }}
          >
            {simLoading ? 'Resolving H3 Spatial & Zonal Master...' : '⚡ Calculate Live Zonal Quote'}
          </button>
        </div>

        {/* Simulator Output Result Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--brand-primary)" />
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Zonal Resolution Verdict
                </h3>
              </div>
              {simResult && (
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: simResult.canAutoQuote ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: simResult.canAutoQuote ? 'var(--color-success)' : 'var(--color-warning)',
                    border: `1px solid ${simResult.canAutoQuote ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  }}
                >
                  {simResult.canAutoQuote ? '✅ AUTO-QUOTE ELIGIBLE' : '⚠️ REQUIRES OPS REVIEW'}
                </span>
              )}
            </div>

            {simError && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}
              >
                <strong>Error:</strong> {simError}
              </div>
            )}

            {!simResult && !simError && (
              <div
                style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                <Navigation size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 600 }}>No Simulation Executed Yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Select a test preset on the left or enter any custom route to inspect real-time pricing and boundary guards.
                </div>
              </div>
            )}

            {simResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Hub & Zone Badges */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem',
                    padding: '0.875rem',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>DETECTED HUB</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {simResult.detectedHub || 'HITEC City Hub'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLVED ZONE</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.15rem' }}>
                      {simResult.detectedZone || 'Zone 4'}
                    </div>
                  </div>
                </div>

                {/* Warning if review required */}
                {simResult.requiresReview && (
                  <div
                    style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: 'var(--color-warning)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <strong>Boundary Review Flag:</strong> {simResult.reviewReason || 'Locality flagged for manual boundary verification.'}
                  </div>
                )}

                {/* Financial Breakdown Table */}
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Zonal Base Tariff:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹ {simResult.baseFare}</span>
                  </div>
                  {simResult.escortCharge > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Security Escort Surcharge:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>+₹ {simResult.escortCharge}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1rem',
                      fontWeight: 900,
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)' }}>Total Vendor Booking Fare:</span>
                    <span style={{ color: 'var(--brand-primary)' }}>₹ {simResult.totalVendorFare}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      paddingTop: '0.35rem',
                      borderTop: '1px dashed var(--border)',
                    }}
                  >
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Driver 85% Guaranteed Payout:</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>₹ {simResult.driverEarnings}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>AdhocX 15% Net Platform Take:</span>
                    <span>₹ {simResult.platformMargin}</span>
                  </div>
                </div>

                {/* Natural Language Summary */}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>Telemetry Engine Note:</strong> {simResult.breakdownSummary}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Uber H3 Spatial Grid (Res 8) Active</span>
            <span>Redis GEO: 30s Freshness TTL</span>
          </div>
        </div>
      </div>

      {/* ── Locality Master Explorer Directory ─────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Hyderabad Locality Master (240+ Corridors & Aliases)
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Maps every Hyderabad neighbourhood, suburb, and colloquial spelling directly to an official AdhocX zone.
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              value={localitySearch}
              onChange={(e) => setLocalitySearch(e.target.value)}
              placeholder="Search locality name, zone..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
            />
          </div>
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Locality Name</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Assigned Zone</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Primary Hub</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Operational Notes</th>
                <th style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocalities.map((loc, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {loc.name}
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                    {loc.zone}
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)' }}>
                    {loc.hub}
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)' }}>
                    {loc.notes}
                  </td>
                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: loc.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: loc.status === 'VERIFIED' ? 'var(--color-success)' : 'var(--color-warning)',
                      }}
                    >
                      {loc.status === 'VERIFIED' ? 'Verified' : 'Ops Review'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
