'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Sliders,
} from 'lucide-react';
import { mockOffices } from '../../../lib/mock/corporateMockData';

export default function OfficeDetailsGatesPage() {
  const [selectedOfficeId, setSelectedOfficeId] = useState('OFF-HYD-01');
  const office = mockOffices.find((o) => o.id === selectedOfficeId) || mockOffices[0];

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
            {mockOffices.map((off) => (
              <option key={off.id} value={off.id}>
                {off.name} ({off.code})
              </option>
            ))}
          </select>

          <button
            type="button"
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
              {office.address}, Hyderabad - {office.pincode}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Daily Commuters
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--corporate-blue)', marginTop: 4 }}>
              {office.headcount.toLocaleString()} Employees
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {office.activeCabsDaily} Commuter Cabs Allocated
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Geofence Radius
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A', marginTop: 4 }}>
              {office.geofenceRadiusMeters} Meters Buffer
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Auto Checkout on Gate Exit
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Facility Desk Contact
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {office.leadContact}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Phone: {office.leadPhone}
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
              Configured Security Gates & RFID Boom Barriers ({office.gates.length})
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Live telemetry, optical plate reader and RFID validation checkpoints
            </p>
          </div>
          <button
            type="button"
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
              {office.gates.map((gate) => (
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
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--corporate-blue)',
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

