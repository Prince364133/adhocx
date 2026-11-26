'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';

export default function SosEmergencyCockpitPage() {
  const [alerts, setAlerts] = useState<SosAlertItem[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [raiseRouteId, setRaiseRouteId] = useState('');
  const [raiseLat, setRaiseLat] = useState('17.4435');
  const [raiseLng, setRaiseLng] = useState('78.3772');
  const [raiseReason, setRaiseReason] = useState('Passenger emergency panic button pressed');
  const [raiseBattery, setRaiseBattery] = useState('85');
  const [availableRoutes, setAvailableRoutes] = useState<Array<{ id: string; label: string }>>([]);
  const [isSubmittingSos, setIsSubmittingSos] = useState(false);
  const [raiseSuccessMsg, setRaiseSuccessMsg] = useState('');
  const inFlightRef = useRef(false);
  const requestSeqRef = useRef(0);

  const loadAlerts = useCallback(async (force = false) => {
    if (!force && inFlightRef.current) return;
    inFlightRef.current = true;
    const reqId = ++requestSeqRef.current;
    try {
      const data = await opsApi.getSosAlerts({ limit: 100 });
      if (reqId !== requestSeqRef.current) return;
      setAlerts(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (error) {
      if (reqId !== requestSeqRef.current) return;
      setLoadError(error instanceof Error ? error.message : 'Failed to load SOS alerts.');
    } finally {
      if (reqId === requestSeqRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAlerts(true);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadAlerts(false);
    }, 6000); // 6s poll (paused when tab is hidden)
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        void loadAlerts(false);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [loadAlerts]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadAlerts(true);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAcknowledge(id: string) {
    setActionLoadingId(id);
    setActionError('');
    try {
      await opsApi.acknowledgeSosAlert(id);
      await loadAlerts(true);
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
      await loadAlerts(true);
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
      await loadAlerts(true);
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
      await loadAlerts(true);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            size="md"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
            isLoading={refreshing}
            onClick={handleRefresh}
          >
            Refresh Feed
          </Button>
          <button
            type="button"
            onClick={async () => {
              setIsRaiseModalOpen(true);
              try {
                const routes = await opsApi.getRoutes({});
                if (Array.isArray(routes) && routes.length > 0) {
                  const items = routes.slice(0, 15).map((r: any) => ({
                    id: r.id,
                    label: `${r.tenant?.name || 'Client'} · Route ${r.id.slice(0, 8)} (${r.direction || 'SHIFT'})`,
                  }));
                  setAvailableRoutes(items);
                  if (!raiseRouteId && items.length > 0) {
                    setRaiseRouteId(items[0].id);
                  }
                }
              } catch {
                // Keep manual input
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--color-danger, #DC2626)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
            }}
          >
            <AlertOctagon size={15} />
            Raise SOS Alert
          </button>
        </div>
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

      {/* Raise SOS Modal */}
      <Modal
        isOpen={isRaiseModalOpen}
        onClose={() => {
          setIsRaiseModalOpen(false);
          setRaiseSuccessMsg('');
        }}
        title="Raise Emergency SOS Alert"
        subtitle="Simulate or dispatch an immediate P0 emergency SOS on an active corporate route."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!raiseRouteId.trim()) {
              setActionError('Route ID is required to raise an SOS alert.');
              return;
            }
            setIsSubmittingSos(true);
            setActionError('');
            setRaiseSuccessMsg('');
            try {
              await opsApi.triggerSosAlert({
                routeId: raiseRouteId.trim(),
                latitude: parseFloat(raiseLat) || 17.4435,
                longitude: parseFloat(raiseLng) || 78.3772,
                triggerReason: raiseReason.trim() || 'Emergency SOS raised by operations dispatcher',
                batteryPct: parseInt(raiseBattery, 10) || 85,
              });
              setRaiseSuccessMsg('Emergency SOS triggered successfully! Synced across Ops & Admin Command Centres.');
              await loadAlerts(true);
              setTimeout(() => {
                setIsRaiseModalOpen(false);
                setRaiseSuccessMsg('');
              }, 1800);
            } catch (err: any) {
              setActionError(err?.message || 'Failed to trigger SOS alert');
            } finally {
              setIsSubmittingSos(false);
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {raiseSuccessMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(22, 163, 74, 0.12)',
                color: '#16A34A',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ✓ {raiseSuccessMsg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Select Route or Enter Route ID *
            </label>
            {availableRoutes.length > 0 && (
              <select
                value={raiseRouteId}
                onChange={(e) => setRaiseRouteId(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '0 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  marginBottom: '8px',
                  outline: 'none',
                }}
              >
                {availableRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="e.g. 13031ad2-854f-48cc-86d5-da2e3a1b1b43"
              value={raiseRouteId}
              onChange={(e) => setRaiseRouteId(e.target.value)}
              required
              style={{
                width: '100%',
                height: '38px',
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={raiseLat}
                onChange={(e) => setRaiseLat(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '38px',
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
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={raiseLng}
                onChange={(e) => setRaiseLng(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '38px',
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Emergency Reason
              </label>
              <input
                type="text"
                value={raiseReason}
                onChange={(e) => setRaiseReason(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
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
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Battery %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={raiseBattery}
                onChange={(e) => setRaiseBattery(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsRaiseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              isLoading={isSubmittingSos}
              leftIcon={<AlertOctagon size={15} />}
            >
              Broadcast P0 SOS
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
