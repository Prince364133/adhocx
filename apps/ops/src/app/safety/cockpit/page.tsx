'use client';

import React, { useState, useEffect } from 'react';
import { opsApi } from '../../../lib/api/opsClient';
import { SosAlertItem } from '../../../lib/api/opsTypes';
import {
  getSosAlertDisplay,
  isActiveSosStatus,
  isTerminalSosStatus,
} from '../../../lib/opsHelpers';
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
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    void loadAlerts();
    const interval = setInterval(() => void loadAlerts(), 6000); // 6s poll
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    try {
      const data = await opsApi.getSosAlerts();
      setAlerts(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load SOS alerts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadAlerts();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAcknowledge(id: string) {
    setActionLoadingId(id);
    setActionError('');
    try {
      await opsApi.acknowledgeSosAlert(id);
      await loadAlerts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to acknowledge SOS alert.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleInvestigate(id: string) {
    setActionLoadingId(id);
    setActionError('');
    try {
      await opsApi.investigateSosAlert(id);
      await loadAlerts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to mark SOS alert as investigating.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleResolve(id: string) {
    const notes = resolveNotes[id] || 'Incident investigated and resolved by operations dispatcher.';
    setActionLoadingId(id);
    setActionError('');
    try {
      await opsApi.resolveSosAlert(id, notes);
      await loadAlerts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to resolve SOS alert.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleEscalate(id: string) {
    setActionLoadingId(id);
    setActionError('');
    try {
      await opsApi.escalateSosAlert(id);
      await loadAlerts();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to escalate SOS alert.');
    } finally {
      setActionLoadingId(null);
    }
  }

  const activeAlerts = alerts.filter((a) => isActiveSosStatus(a.status));
  const resolvedAlerts = alerts.filter((a) => isTerminalSosStatus(a.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {(loadError || actionError) && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger, #DC2626)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {actionError || loadError}
        </div>
      )}
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
              const display = getSosAlertDisplay(alert);
              const status = String(alert.status || '').toUpperCase();
              const isUrgent = status === 'NEW' || status === 'ACTIVE' || status === 'ESCALATED';
              const canAck = status === 'NEW' || status === 'ACTIVE' || (status === 'ESCALATED' && !alert.acknowledgedAt);
              const canInvestigate = status === 'ACKNOWLEDGED' || status === 'ESCALATED' || status === 'RESPONDED';
              const canEscalate = status !== 'ESCALATED';
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
                  className={isUrgent ? 'pulse-critical' : ''}
                >
                  {/* Alert Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                        {display.severity}
                      </span>
                      <span className="code-tag">INC-{alert.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {display.triggerLabel}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        · {display.tenantName}
                      </span>
                    </div>

                    <StatusBadge status={alert.status} size="md" pulse={isUrgent} />
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REPORTING PARTY &amp; CLIENT</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginTop: '2px' }}>
                        {display.reporterLabel}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--brand-blue-500, #5728B2)' }}>
                        {display.riderPhone || display.tenantName}
                        {display.officeName ? ` · ${display.officeName}` : ''}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ASSIGNED CAB &amp; DRIVER</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginTop: '2px' }}>
                        {display.driverName || 'Assigned Driver'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {display.driverPhone || 'No phone'} · <span className="code-tag">{display.vehiclePlate || 'VEHICLE'}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>INCIDENT GPS LOCATION</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px', marginTop: '2px' }}>
                        {display.coordinatesLabel}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Triggered: {new Date(alert.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    </div>
                  </div>

                  {display.notes && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-surface)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-primary)' }}>Notes:</strong> {display.notes}
                    </div>
                  )}

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
                      {display.riderPhone && (
                        <a
                          href={`tel:${display.riderPhone}`}
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

                      {display.driverPhone && (
                        <a
                          href={`tel:${display.driverPhone}`}
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

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {canAck && (
                        <Button
                          size="sm"
                          variant="primary"
                          isLoading={actionLoadingId === alert.id}
                          onClick={() => void handleAcknowledge(alert.id)}
                        >
                          1. Acknowledge (Assign Owner)
                        </Button>
                      )}

                      {canInvestigate && (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={actionLoadingId === alert.id}
                          onClick={() => void handleInvestigate(alert.id)}
                        >
                          2. Mark Investigating
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="success"
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => void handleResolve(alert.id)}
                      >
                        Resolve Incident
                      </Button>

                      {canEscalate && (
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={actionLoadingId === alert.id}
                          onClick={() => void handleEscalate(alert.id)}
                        >
                          Escalate to Police / Safety Head
                        </Button>
                      )}
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
            {resolvedAlerts.slice(0, 10).map((alert) => {
              const display = getSosAlertDisplay(alert);
              return (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="code-tag">INC-{alert.id.slice(0, 8).toUpperCase()}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{display.tenantName}</span>
                    <span style={{ color: 'var(--text-muted)' }}>· {display.coordinatesLabel}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Notes: {display.notes || 'Resolved'}
                    </span>
                    <StatusBadge status={alert.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
