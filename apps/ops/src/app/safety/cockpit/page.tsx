'use client';

import React, { useState, useEffect } from 'react';
import { opsApi } from '../../../lib/api/opsClient';
import { SosAlertItem } from '../../../lib/api/opsTypes';
import { Button } from '../../../components/common/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import {
  ShieldAlert,
  Phone,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export default function SosEmergencyCockpitPage() {
  const [alerts, setAlerts] = useState<SosAlertItem[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 6000); // 6s poll
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    try {
      const data = await opsApi.getSosAlerts();
      setAlerts(data);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load SOS alerts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }

  async function handleAcknowledge(id: string) {
    setActionLoadingId(id);
    try {
      await opsApi.acknowledgeSosAlert(id);
      await loadAlerts();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleInvestigate(id: string) {
    setActionLoadingId(id);
    try {
      await opsApi.investigateSosAlert(id);
      await loadAlerts();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResolve(id: string) {
    const notes = resolveNotes[id] || 'Incident investigated and resolved by operations dispatcher.';
    setActionLoadingId(id);
    try {
      await opsApi.resolveSosAlert(id, notes);
      await loadAlerts();
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleEscalate(id: string) {
    setActionLoadingId(id);
    try {
      await opsApi.escalateSosAlert(id);
      await loadAlerts();
    } finally {
      setActionLoadingId(null);
    }
  }

  const activeAlerts = alerts.filter(
    (a) => a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'INVESTIGATING',
  );
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED' || a.status === 'ESCALATED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {loadError && <div role="alert" style={{ color: 'var(--color-danger, #DC2626)', fontSize: 13 }}>{loadError}</div>}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>
            SOS Emergency Response Cockpit
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Zero-delay crisis response center. 5-stage FSM workflow with 120-second automated escalation countdown.
          </p>
        </div>

        <Button
          size="md"
          variant="outline"
          leftIcon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
          isLoading={refreshing}
          onClick={handleRefresh}
        >
          Refresh Feed
        </Button>
      </div>

      {/* P0 Active Crisis Alerts Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <ShieldAlert size={18} color="var(--color-danger, #DC2626)" />
          <h2 className="h3-text" style={{ color: 'var(--text-primary)' }}>
            Active Emergencies ({activeAlerts.length})
          </h2>
        </div>

        {activeAlerts.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg, 10px)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <CheckCircle size={36} color="var(--color-success, #16A34A)" style={{ marginBottom: '10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No active safety emergencies</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              All running passenger trips are within normal parameters. Emergency transponders armed.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeAlerts.map((alert) => {
              const isNew = alert.status === 'NEW';
              return (
                <div
                  key={alert.id}
                  style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger-border)',
                    borderRadius: 'var(--radius-lg, 10px)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: 'var(--shadow-glow-sos)',
                  }}
                  className={isNew ? 'pulse-critical' : ''}
                >
                  {/* Alert Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          backgroundColor: 'var(--color-danger, #DC2626)',
                          color: '#FFFFFF',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-pill)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {alert.severity || 'CRITICAL P0'}
                      </span>
                      <span className="code-tag">INC-{alert.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {alert.triggerType || 'PANIC_BUTTON'}
                      </span>
                    </div>

                    <StatusBadge status={alert.status} size="md" pulse={isNew} />
                  </div>

                  {/* Rider & Driver Telemetry Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REPORTING PASSENGER</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginTop: '2px' }}>
                        {alert.riderName || 'Employee Rider'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--brand-blue-500, #5728B2)' }}>
                        {alert.riderPhone || 'No phone'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ASSIGNED CAB & DRIVER</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginTop: '2px' }}>
                        {alert.driverName || 'Assigned Driver'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {alert.driverPhone || 'No phone'} · <span className="code-tag">{alert.vehiclePlate || 'VEHICLE'}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INCIDENT GPS LOCATION</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', marginTop: '2px' }}>
                        {alert.addressText || `${alert.locationLat?.toFixed(4)}, ${alert.locationLng?.toFixed(4)}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Triggered: {new Date(alert.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Enter dispatcher investigation / resolution notes..."
                      value={resolveNotes[alert.id] || ''}
                      onChange={(e) =>
                        setResolveNotes({ ...resolveNotes, [alert.id]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        height: '36px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md, 8px)',
                        padding: '0 12px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* 5-Stage FSM Operational Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      borderTop: '1px solid var(--color-danger-border)',
                      paddingTop: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {alert.riderPhone && (
                        <a
                          href={`tel:${alert.riderPhone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md, 8px)',
                            backgroundColor: 'var(--brand-primary-subtle)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--brand-blue-500, #5728B2)',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Phone size={13} />
                          <span>Call Rider</span>
                        </a>
                      )}

                      {alert.driverPhone && (
                        <a
                          href={`tel:${alert.driverPhone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md, 8px)',
                            backgroundColor: 'var(--color-warning-bg)',
                            border: '1px solid var(--color-warning-border)',
                            color: 'var(--brand-amber-600, #C17A0B)',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Phone size={13} />
                          <span>Call Driver</span>
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {alert.status === 'NEW' && (
                        <Button
                          size="sm"
                          variant="primary"
                          isLoading={actionLoadingId === alert.id}
                          onClick={() => handleAcknowledge(alert.id)}
                        >
                          1. Acknowledge (Assign Owner)
                        </Button>
                      )}

                      {alert.status === 'ACKNOWLEDGED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={actionLoadingId === alert.id}
                          onClick={() => handleInvestigate(alert.id)}
                        >
                          2. Mark Investigating
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="success"
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => handleResolve(alert.id)}
                      >
                        Resolve Incident
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => handleEscalate(alert.id)}
                      >
                        Escalate to Police / Safety Head
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Resolved Incidents */}
      {resolvedAlerts.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h3 className="h4-text" style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Resolved Crisis Archive ({resolvedAlerts.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {resolvedAlerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="code-tag">INC-{alert.id.slice(0, 8).toUpperCase()}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{alert.riderName || 'Rider'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>· {alert.addressText || 'Corridor'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Notes: {alert.responderNotes || 'Resolved'}
                  </span>
                  <StatusBadge status={alert.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
