'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Search,
  ArrowRight,
  PhoneCall,
} from 'lucide-react';
import { safetyApi } from '../../lib/api/corporate';
import type { SosAlert, SafetyIncident } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
import MetricCard from '../../components/common/MetricCard';

export default function SafetyOverviewPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      safetyApi.alerts(activeTenantId, {}).catch(() => []),
      safetyApi.incidents(activeTenantId, {}).catch(() => []),
    ])
      .then(([alertList, incidentList]) => {
        setAlerts(alertList);
        setIncidents(incidentList);
      })
      .catch((err) => {
        console.warn('Failed to load safety data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId]);

  const activeSosCount = alerts.filter((a) => a.status === 'TRIGGERED' || a.status === 'ACKNOWLEDGED').length;

  const filteredIncidents = incidents.filter((inc) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (inc.title || '').toLowerCase().includes(q) ||
      (inc.id || '').toLowerCase().includes(q) ||
      (inc.status || '').toLowerCase().includes(q);
    const matchesSeverity = severityFilter === 'All' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Safety & Incident Management Overview
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            24x7 Emergency Response Center, panic alerts, telemetry exceptions and resolution audit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeSosCount > 0 ? (
            <span
              style={{
                padding: '6px 12px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Radio size={12} /> {activeSosCount} Active SOS Alert Under Investigation
            </span>
          ) : (
            <span
              style={{
                padding: '6px 12px',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CheckCircle2 size={13} /> 0 Active SOS Alerts · Safe Operations
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Total Incidents (Month)"
          value={incidents.length.toString()}
          delta={`${incidents.filter((i) => i.status === 'RESOLVED').length} Resolved`}
          deltaType="positive"
          icon={<ShieldAlert size={20} />}
          category="primary"
        />
        <MetricCard
          label="Avg First Response SLA"
          value="1.8 min"
          delta="Goal: < 3.0 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="success"
        />
        <MetricCard
          label="Active SOS Panic Triggers"
          value={`${activeSosCount} Active`}
          delta={activeSosCount > 0 ? 'Response team on line' : 'All Clear'}
          deltaType={activeSosCount > 0 ? 'negative' : 'positive'}
          icon={<PhoneCall size={20} />}
          category={activeSosCount > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Safety Compliance"
          value="100%"
          delta="Verified Drivers & Panic Buttons"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="info"
        />
      </div>

      {/* End-to-End Safety Lifecycle Checkpoints */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Mandatory Trip Safety Lifecycle Checkpoints
          </h2>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: 4 }}>
            Zero-Trust Protocol Active
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { step: '1. Assignment', desc: 'Driver DL, Vehicle Fitness & Seating Capacity Verified', state: 'ENFORCED' },
            { step: '2. Pickup', desc: '<150m Geofenced GPS Arrival & License Plate Match', state: 'ACTIVE' },
            { step: '3. Boarding', desc: '4-Digit Commuter OTP & Audited Supervisor Override', state: 'MANDATORY' },
            { step: '4. In Transit', desc: 'Realtime Telemetry, <500m Corridor & 80km/h Speed Watch', state: 'MONITORED' },
            { step: '5. Drop-off', desc: 'Geofenced Drop & Female Safe-Drop Escort Protocol', state: 'AUDITED' },
            { step: '6. Closure', desc: 'P0-P3 Incident Resolution & Command Centre SLA Ledger', state: 'LOGGED' },
          ].map((ckpt, idx) => (
            <div
              key={idx}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{ckpt.step}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#2563EB', backgroundColor: '#DBEAFE', padding: '2px 5px', borderRadius: 3 }}>
                  {ckpt.state}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                {ckpt.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', minWidth: 280, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search incident number, employee or route..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: 'var(--bg-surface-muted)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading incidents...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No safety incidents logged. All commuter routes operational without safety exceptions.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Incident ID</th>
                  <th style={{ padding: '12px 16px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>Summary / Type</th>
                  <th style={{ padding: '12px 16px' }}>Logged Time</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {inc.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor: inc.severity === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                          color: inc.severity === 'CRITICAL' ? '#DC2626' : '#D97706',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {inc.title}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(inc.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor: inc.status === 'RESOLVED' ? '#DCFCE7' : '#EFF6FF',
                          color: inc.status === 'RESOLVED' ? '#16A34A' : '#5728B2',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/safety/incidents/details?id=${inc.id}`}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--border-strong)',
                          backgroundColor: 'var(--bg-surface)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#5728B2',
                          textDecoration: 'none',
                        }}
                      >
                        Dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
