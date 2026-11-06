'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  ArrowLeft,
  Settings,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { tenantApi } from '../../../lib/api/corporate';
import type { Office, OfficeGeofenceDetails } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

function OfficeDetailsGatesContent() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const searchParams = useSearchParams();
  const officeIdParam = searchParams.get('id');

  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [geofenceDetails, setGeofenceDetails] = useState<OfficeGeofenceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tenantApi
      .offices(activeTenantId)
      .then((data) => {
        setOffices(data);
        if (data.length > 0) {
          const match = officeIdParam ? data.find((o) => o.id === officeIdParam) : null;
          const initial = match ? match.id : data[0].id;
          setSelectedOfficeId(initial);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch offices:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId, officeIdParam]);

  useEffect(() => {
    if (!selectedOfficeId) return;
    tenantApi
      .geofences(activeTenantId, selectedOfficeId)
      .then((res) => {
        setGeofenceDetails(res);
      })
      .catch((err) => {
        console.warn('Failed to fetch geofence details:', err);
      });
  }, [activeTenantId, selectedOfficeId]);

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading campus facility details...
      </div>
    );
  }

  const office = offices.find((o) => o.id === selectedOfficeId) || offices[0];

  if (!office) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        No offices found. Please register an office campus first.
      </div>
    );
  }

  const gates = [
    {
      id: 'GATE-01',
      gateName: 'Main Entrance & Visitor Gate',
      type: 'Entry / Exit',
      rfidEnabled: true,
      operationalHours: '24 / 7',
      boomBarrierStatus: 'Online',
    },
    {
      id: 'GATE-02',
      gateName: 'Fleet & Commuter Bay Terminal',
      type: 'Entry Only',
      rfidEnabled: true,
      operationalHours: '06:00 - 23:00',
      boomBarrierStatus: 'Online',
    },
    {
      id: 'GATE-03',
      gateName: 'Emergency & Service Exit',
      type: 'Exit Only',
      rfidEnabled: false,
      operationalHours: '24 / 7',
      boomBarrierStatus: 'Online',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/offices"
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
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <ArrowLeft size={14} /> Back to Campuses
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Office Details & Security Gates
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Campus infrastructure, RFID boom barrier telemetry and access control
            </p>
          </div>
        </div>

        {/* Campus Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {offices.length > 1 && (
            <select
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              {offices.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({off.code || 'CAMPUS'})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => alert(`Add security gate for ${office.name}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add Gate
          </button>
        </div>
      </div>

      {/* Campus Summary Box */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          padding: 20,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Campus Location
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {office.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {office.address || 'Campus Address'}, {office.city || 'Hyderabad'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Daily Commuters
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#5728B2', marginTop: 4 }}>
              {office.employeeCount ? `${office.employeeCount.toLocaleString()} Employees` : 'Active Campus'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Dedicated pickup & drop staging bays
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Geofence Radius
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A', marginTop: 4 }}>
              {office.geofenceRadiusMeters || 500} Meters Buffer
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Auto Checkout on Gate Exit
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Coordinates (Lat / Lng)
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {office.latitude ? `${Number(office.latitude).toFixed(4)}, ${Number(office.longitude).toFixed(4)}` : '17.4485, 78.3741'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              GPS Central Node
            </div>
          </div>
        </div>
      </div>

      {/* Security Gates Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
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
              Configured Security Gates & RFID Boom Barriers ({gates.length})
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Live telemetry, optical plate reader and RFID validation checkpoints
            </p>
          </div>
          <button
            type="button"
            onClick={() => alert('Syncing RFID boom barrier gate status')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} /> Sync Gate Telemetry
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Gate ID</th>
                <th style={{ padding: '12px 16px' }}>Gate Name</th>
                <th style={{ padding: '12px 16px' }}>Traffic Direction</th>
                <th style={{ padding: '12px 16px' }}>RFID Reader</th>
                <th style={{ padding: '12px 16px' }}>Hours of Operation</th>
                <th style={{ padding: '12px 16px' }}>Boom Barrier Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((gate) => (
                <tr key={gate.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {gate.id}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {gate.gateName}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: 'var(--bg-surface-hover)',
                        color: 'var(--text-secondary)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {gate.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {gate.rfidEnabled ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Enabled (FastTag)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Manual Guard Check</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} /> {gate.operationalHours}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 8px',
                        backgroundColor: gate.boomBarrierStatus === 'Online' ? '#DCFCE7' : '#FEE2E2',
                        color: gate.boomBarrierStatus === 'Online' ? '#15803D' : '#DC2626',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <Radio size={12} /> {gate.boomBarrierStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => alert(`Configuring ${gate.gateName}`)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#5728B2',
                        cursor: 'pointer',
                      }}
                    >
                      Configure
                    </button>
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

export default function OfficeDetailsGatesPage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
      <OfficeDetailsGatesContent />
    </Suspense>
  );
}
