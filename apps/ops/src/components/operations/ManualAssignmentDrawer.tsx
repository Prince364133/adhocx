'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Route as RouteIcon,
  Users,
  Car,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Truck,
  FileText,
  UserCheck,
  Phone,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import {
  CorporateRouteItem,
  CorporateTenantOption,
  EligibleDriverItem,
  EligibleDriversResponse,
} from '../../lib/api/opsTypes';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

export interface ManualAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assignedRoute: CorporateRouteItem) => void;
  initialRoute?: CorporateRouteItem | null;
  initialTenantId?: string;
  initialOfficeId?: string;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '38px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '0 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const ASSIGNMENT_REASONS = [
  'Initial shift dispatcher allocation',
  'Manual route balancing',
  'Assigned driver vehicle breakdown / puncture',
  'Assigned driver unresponsive / late for pickup',
  'Driver rejected offer / timed out',
  'Driver duty hours limit reached',
  'Emergency corporate client request',
  'Route vehicle capacity upgrade',
];

function formatIstTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function formatIstDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export const ManualAssignmentDrawer: React.FC<ManualAssignmentDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRoute,
  initialTenantId,
  initialOfficeId,
}) => {
  // Mode: Option A (Manual Cascade) vs Option B (Select from Existing Routes)
  const [activeTab, setActiveTab] = useState<'OPTION_A' | 'OPTION_B'>('OPTION_A');

  // Common data
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);

  // Option A Selection State
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId || '');
  const [offices, setOffices] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(initialOfficeId || '');

  // Routes for Option A
  const [availableRoutes, setAvailableRoutes] = useState<CorporateRouteItem[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialRoute?.id || '');

  // Option B Routes
  const [existingRoutes, setExistingRoutes] = useState<CorporateRouteItem[]>([]);
  const [existingRoutesLoading, setExistingRoutesLoading] = useState(false);
  const [existingSearch, setExistingSearch] = useState('');
  const [selectedExistingRouteId, setSelectedExistingRouteId] = useState<string>(initialRoute?.id || '');

  // Active Route Details
  const activeRoute = useMemo(() => {
    if (activeTab === 'OPTION_A') {
      return availableRoutes.find((r) => r.id === selectedRouteId) || (initialRoute?.id === selectedRouteId ? initialRoute : null);
    }
    return existingRoutes.find((r) => r.id === selectedExistingRouteId) || (initialRoute?.id === selectedExistingRouteId ? initialRoute : null);
  }, [activeTab, selectedRouteId, selectedExistingRouteId, availableRoutes, existingRoutes, initialRoute]);

  // Drivers for Active Route
  const [eligibleDriversData, setEligibleDriversData] = useState<EligibleDriversResponse | null>(null);
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [showIneligible, setShowIneligible] = useState(false);

  // Form Reason & Submission
  const [selectedReason, setSelectedReason] = useState<string>(ASSIGNMENT_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset or initialize when drawer opens
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      if (initialRoute) {
        setActiveTab('OPTION_B');
        setSelectedExistingRouteId(initialRoute.id);
        setSelectedRouteId(initialRoute.id);
        if (initialRoute.tenantId) setSelectedTenantId(initialRoute.tenantId);
        if (initialRoute.officeId) setSelectedOfficeId(initialRoute.officeId);
      } else {
        if (initialTenantId) setSelectedTenantId(initialTenantId);
        if (initialOfficeId) setSelectedOfficeId(initialOfficeId);
      }
    }
  }, [isOpen, initialRoute, initialTenantId, initialOfficeId]);

  // Load Tenants on Mount
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setTenantsLoading(true);
    void opsApi
      .getTenants({ limit: 100, minimal: true })
      .then((res) => {
        if (!cancelled) setTenants(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setTenants([]);
      })
      .finally(() => {
        if (!cancelled) setTenantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Load Offices when Tenant changes (Option A)
  useEffect(() => {
    if (!selectedTenantId) {
      setOffices([]);
      setSelectedOfficeId('');
      return;
    }
    let cancelled = false;
    setOfficesLoading(true);
    void opsApi
      .getTenantOffices(selectedTenantId)
      .then((items) => {
        if (cancelled) return;
        const validOffices = items || [];
        setOffices(validOffices);
        if (!selectedOfficeId || !validOffices.some((o) => o.id === selectedOfficeId)) {
          setSelectedOfficeId(validOffices[0]?.id || '');
        }
      })
      .catch(() => {
        if (!cancelled) setOffices([]);
      })
      .finally(() => {
        if (!cancelled) setOfficesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  // Load Routes for Option A (when Tenant and Office selected)
  useEffect(() => {
    if (activeTab !== 'OPTION_A' || !selectedTenantId) {
      setAvailableRoutes([]);
      return;
    }
    let cancelled = false;
    setRoutesLoading(true);
    void opsApi
      .getRoutes({
        tenantId: selectedTenantId,
        officeId: selectedOfficeId || undefined,
        limit: 100,
        includeStops: true,
      })
      .then((routes) => {
        if (cancelled) return;
        // Keep active or unassigned routes eligible for assignment
        const actionable = routes.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
        setAvailableRoutes(actionable);
        if (!selectedRouteId || !actionable.some((r) => r.id === selectedRouteId)) {
          setSelectedRouteId(actionable[0]?.id || '');
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedTenantId, selectedOfficeId]);

  // Load Existing Routes for Option B
  useEffect(() => {
    if (activeTab !== 'OPTION_B' || !isOpen) return;
    let cancelled = false;
    setExistingRoutesLoading(true);
    void opsApi
      .getRoutes({
        limit: 100,
        includeStops: true,
      })
      .then((routes) => {
        if (cancelled) return;
        const actionable = routes.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
        setExistingRoutes(actionable);
        if (!selectedExistingRouteId && actionable.length > 0) {
          setSelectedExistingRouteId(actionable[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setExistingRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setExistingRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, isOpen]);

  // Load Eligible Drivers when activeRoute changes
  useEffect(() => {
    const routeId = activeRoute?.id;
    if (!routeId) {
      setEligibleDriversData(null);
      setSelectedDriverId('');
      return;
    }
    let cancelled = false;
    setDriversLoading(true);
    setFormError(null);
    void opsApi
      .getEligibleDrivers(routeId)
      .then((data) => {
        if (cancelled) return;
        setEligibleDriversData(data);
        // Pre-select currently assigned driver or first eligible driver
        const currentAssigned = data.drivers.find((d) => d.isCurrentlyAssigned);
        const firstEligible = data.drivers.find((d) => d.isEligible && !d.isCurrentlyAssigned);
        if (currentAssigned) {
          setSelectedDriverId(currentAssigned.driverId);
        } else if (firstEligible) {
          setSelectedDriverId(firstEligible.driverId);
        } else {
          setSelectedDriverId('');
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setEligibleDriversData(null);
        setFormError(err?.message || 'Could not evaluate eligible drivers for this route.');
      })
      .finally(() => {
        if (!cancelled) setDriversLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRoute?.id]);

  // Filtered Existing Routes for Option B search
  const filteredExistingRoutes = useMemo(() => {
    if (!existingSearch.trim()) return existingRoutes;
    const q = existingSearch.toLowerCase().trim();
    return existingRoutes.filter((r) => {
      const code = `rt-${r.id.slice(0, 8)}`.toLowerCase();
      const comp = r.tenant?.name?.toLowerCase() || '';
      const off = r.office?.name?.toLowerCase() || '';
      const driver = r.driver?.fullName?.toLowerCase() || '';
      return code.includes(q) || comp.includes(q) || off.includes(q) || driver.includes(q);
    });
  }, [existingRoutes, existingSearch]);

  // Drivers groups
  const eligibleDrivers = useMemo(() => {
    return (eligibleDriversData?.drivers || []).filter((d) => d.isEligible);
  }, [eligibleDriversData]);

  const ineligibleDrivers = useMemo(() => {
    return (eligibleDriversData?.drivers || []).filter((d) => !d.isEligible);
  }, [eligibleDriversData]);

  const selectedDriver = useMemo(() => {
    return eligibleDriversData?.drivers.find((d) => d.driverId === selectedDriverId);
  }, [eligibleDriversData, selectedDriverId]);

  const isReassigning = Boolean(activeRoute?.driverId && activeRoute.driverId !== selectedDriverId);

  // Submit Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoute) {
      setFormError('Please select a route to assign.');
      return;
    }
    if (!selectedDriverId) {
      setFormError('Please select a verified driver from the eligible candidates.');
      return;
    }
    if (selectedDriver && !selectedDriver.isEligible) {
      setFormError(
        `Selected driver is ineligible: ${selectedDriver.rejectionReasonLabel || selectedDriver.rejectionReason || 'Conflict'}`,
      );
      return;
    }

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setFormError('Please provide an operational assignment reason for the compliance audit log.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await opsApi.assignDriver(activeRoute.id, {
        driverId: selectedDriverId,
        reason: finalReason,
      });
      onSuccess(res.route || activeRoute);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Driver assignment failed. Please inspect route and driver availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Driver Route Assignment"
      subtitle="Manual driver allocation, vehicle compatibility matching, and conflict avoidance"
      width="640px"
      icon={<Truck size={20} />}
      badge={
        activeRoute ? (
          <span className="code-tag">RT-{activeRoute.id.slice(0, 8).toUpperCase()}</span>
        ) : undefined
      }
    >
      <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Error Alert */}
        {formError && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ lineHeight: 1.4 }}>{formError}</div>
          </div>
        )}

        {/* Tab Selection: Option A vs Option B */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'var(--bg-surface-muted)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('OPTION_A')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'OPTION_A' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'OPTION_A' ? 'var(--brand-primary, #5728B2)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'OPTION_A' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Option A: Manual Assignment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPTION_B')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'OPTION_B' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'OPTION_B' ? 'var(--brand-primary, #5728B2)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'OPTION_B' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Option B: Select from Existing Routes
          </button>
        </div>

        {/* ─── OPTION A: MANUAL ASSIGNMENT CASCADE ─── */}
        {activeTab === 'OPTION_A' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Company Selector */}
              <div>
                <label style={labelStyle}>Company / Client *</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  disabled={tenantsLoading}
                  style={inputStyle}
                  required
                >
                  <option value="">Select Corporate Client...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Office Selector */}
              <div>
                <label style={labelStyle}>Office Hub *</label>
                <select
                  value={selectedOfficeId}
                  onChange={(e) => setSelectedOfficeId(e.target.value)}
                  disabled={officesLoading || !selectedTenantId}
                  style={inputStyle}
                  required
                >
                  {offices.length === 0 ? (
                    <option value="">{selectedTenantId ? 'No offices configured' : 'Select company first'}</option>
                  ) : (
                    offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Route Selector under Office */}
            <div>
              <label style={labelStyle}>Available Routes ({availableRoutes.length}) *</label>
              {routesLoading ? (
                <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Loading routes for selected office...
                </div>
              ) : availableRoutes.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    border: '1px dashed var(--border-subtle)',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}
                >
                  {selectedTenantId
                    ? 'No open routes found for this office hub. Create a route in planner first.'
                    : 'Select a company and office hub to view routes.'}
                </div>
              ) : (
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  {availableRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      RT-{r.id.slice(0, 8).toUpperCase()} · {r.direction} ({r.shiftTime}) ·{' '}
                      {r.vehicleCategory} · {r.assignedPassengerCount || r.stops?.length || 0} pax · [{r.status}]
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ─── OPTION B: SELECT FROM EXISTING ROUTES ─── */}
        {activeTab === 'OPTION_B' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Search Existing Routes</label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  value={existingSearch}
                  onChange={(e) => setExistingSearch(e.target.value)}
                  placeholder="Filter by RT code, company, office, driver..."
                  style={{ ...inputStyle, paddingLeft: '32px' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Select Route ({filteredExistingRoutes.length}) *</label>
              {existingRoutesLoading ? (
                <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Loading existing routes...
                </div>
              ) : filteredExistingRoutes.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    border: '1px dashed var(--border-subtle)',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}
                >
                  No existing routes found matching search criteria.
                </div>
              ) : (
                <select
                  value={selectedExistingRouteId}
                  onChange={(e) => setSelectedExistingRouteId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  {filteredExistingRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      RT-{r.id.slice(0, 8).toUpperCase()} · {r.tenant?.name || 'Company'} · {r.office?.name || 'Office'} ·{' '}
                      {r.direction} ({r.shiftTime}) · {r.driver ? `Assigned: ${r.driver.fullName}` : 'Unassigned'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* ─── ROUTE SPECIFICATION CARD PREVIEW ─── */}
        {activeRoute && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="code-tag">RT-{activeRoute.id.slice(0, 8).toUpperCase()}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor:
                      activeRoute.direction === 'LOGIN' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: activeRoute.direction === 'LOGIN' ? '#2563EB' : '#D97706',
                  }}
                >
                  {activeRoute.direction}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(87, 40, 178, 0.12)',
                    color: 'var(--brand-primary, #5728B2)',
                  }}
                >
                  {activeRoute.vehicleCategory} ({activeRoute.maxCapacity} seats)
                </span>
              </div>
              <StatusBadge status={activeRoute.status} size="sm" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Company: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{activeRoute.tenant?.name || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Office Hub: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{activeRoute.office?.name || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Shift Time: </span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {formatIstDate(activeRoute.shiftDate)} · {activeRoute.shiftTime}
                </strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Pickup 1 ETA: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatIstTime(activeRoute.targetPickup1Time)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Office Arrival: </span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {formatIstTime(activeRoute.targetOfficeArrivalTime)}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Driver: </span>
                <strong
                  style={{
                    color: activeRoute.driver ? 'var(--color-success, #16A34A)' : 'var(--color-warning, #D97706)',
                  }}
                >
                  {activeRoute.driver ? `${activeRoute.driver.fullName}` : 'Unassigned'}
                </strong>
              </div>
            </div>

            {/* Commuter Manifest Mini-List */}
            {activeRoute.stops && activeRoute.stops.length > 0 && (
              <div
                style={{
                  marginTop: '4px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                }}
              >
                <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                  COMMUTER MANIFEST ({activeRoute.stops.filter((s) => s.employeeName).length} RIDERS):
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {activeRoute.stops
                    .filter((s) => s.employeeName)
                    .map((s, idx) => (
                      <span
                        key={s.id || idx}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {s.employeeName} ({formatIstTime(s.plannedEta)})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ELIGIBLE DRIVER ALLOCATION LIST ─── */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Eligible Verified Drivers ({eligibleDrivers.length}) *
            </label>
            {activeRoute && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                leftIcon={<RefreshCw size={12} className={driversLoading ? 'spin' : undefined} />}
                onClick={() => {
                  if (activeRoute) {
                    setDriversLoading(true);
                    opsApi
                      .getEligibleDrivers(activeRoute.id)
                      .then((d) => setEligibleDriversData(d))
                      .finally(() => setDriversLoading(false));
                  }
                }}
              >
                Re-check Eligibility
              </Button>
            )}
          </div>

          {driversLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Evaluating driver eligibility, duty hour limits, and vehicle certificates...
            </div>
          ) : !activeRoute ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-surface-muted)',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              Select a route above to evaluate available drivers.
            </div>
          ) : eligibleDrivers.length === 0 ? (
            <div
              style={{
                padding: '18px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#B45309',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> No fully eligible drivers available right now
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                All candidate drivers either have conflicting overlapping route schedules, exceeded daily duty hours,
                or lack verified commercial vehicles in the required {activeRoute.vehicleCategory} category.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {eligibleDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.driverId;
                return (
                  <div
                    key={driver.driverId}
                    onClick={() => setSelectedDriverId(driver.driverId)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? 'var(--brand-primary, #5728B2)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.08))' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="driverSelection"
                        checked={isSelected}
                        onChange={() => setSelectedDriverId(driver.driverId)}
                        style={{ accentColor: 'var(--brand-primary, #5728B2)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{driver.fullName}</strong>
                          {driver.isCurrentlyAssigned && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(22, 163, 74, 0.15)',
                                color: '#16A34A',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              Currently Assigned
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {driver.phone || 'No phone'} · Trust Score: {driver.trustScore}%
                        </div>
                      </div>
                    </div>

                    {driver.matchedVehicle && (
                      <div style={{ textAlign: 'right', fontSize: '12px' }}>
                        <span className="code-tag">{driver.matchedVehicle.registrationNumber}</span>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                          {driver.matchedVehicle.model || driver.matchedVehicle.vehicleType} ({driver.matchedVehicle.seatingCapacity} seats)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ineligible Drivers Accordion (Shows Why Drivers Cannot Be Assigned) */}
          {ineligibleDrivers.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowIneligible(!showIneligible)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                }}
              >
                <span>{showIneligible ? 'Hide' : 'Show'} Ineligible Drivers ({ineligibleDrivers.length})</span>
              </button>

              {showIneligible && (
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {ineligibleDrivers.map((driver) => (
                    <div
                      key={driver.driverId}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-surface-muted)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>{driver.fullName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-danger, #DC2626)', fontWeight: 600 }}>
                        {driver.rejectionReasonLabel || driver.rejectionReason || 'Ineligible'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── REASON & AUDIT JUSTIFICATION ─── */}
        <div>
          <label style={labelStyle}>
            {isReassigning ? 'Reassignment Reason (§ 55 Compliance) *' : 'Operational Assignment Reason *'}
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            style={inputStyle}
            required
          >
            {ASSIGNMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other custom operational cause...</option>
          </select>
        </div>

        {selectedReason === 'Other' && (
          <div>
            <label style={labelStyle}>Custom Reason Explanation *</label>
            <textarea
              required
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="State reason for operational and audit compliance..."
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '8px 12px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={submitting}
            disabled={!activeRoute || !selectedDriverId || Boolean(selectedDriver && !selectedDriver.isEligible)}
            leftIcon={<UserCheck size={16} />}
          >
            {isReassigning ? 'Confirm Driver Reassignment' : 'Assign Driver to Route'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
