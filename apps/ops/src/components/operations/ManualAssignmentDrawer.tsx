'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import {
  CorporateRouteItem,
  CorporateTenantOption,
  EligibleDriverItem,
  EligibleDriversResponse,
} from '../../lib/api/opsTypes';
import { Drawer } from '../common/Drawer';

export interface ManualAssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (assignedRoute: CorporateRouteItem) => void;
  initialRoute?: CorporateRouteItem | null;
  initialTenantId?: string;
  initialOfficeId?: string;
}

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

function formatIstTime24(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    if (typeof iso === 'string' && /^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
    return String(iso);
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function formatIstDateFull(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function formatDurationRide(startIso?: string | null, endIso?: string | null, fallbackSec?: number): string {
  if (startIso && endIso) {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e) && e > s) {
      const diffMin = Math.round((e - s) / 60000);
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
  }
  if (fallbackSec && fallbackSec > 0) {
    const diffMin = Math.round(fallbackSec / 60);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return '2h 14m';
}

function capitalizeWord(str?: string | null): string {
  if (!str) return '—';
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const stepBadgeStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#6D28D9',
  color: '#FFFFFF',
  fontSize: '11px',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export const ManualAssignmentDrawer: React.FC<ManualAssignmentDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRoute,
  initialTenantId,
  initialOfficeId,
}) => {
  // Mode: Option A (Manual assignment) vs Option B (From existing routes)
  const [activeTab, setActiveTab] = useState<'OPTION_A' | 'OPTION_B'>('OPTION_B');

  // Common tenant data
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

  // UI State
  const [isChangingRoute, setIsChangingRoute] = useState(false);
  const [showIneligible, setShowIneligible] = useState(true);

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

  // Form Reason & Submission
  const [selectedReason, setSelectedReason] = useState<string>(ASSIGNMENT_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset or initialize when drawer opens
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setIsChangingRoute(false);
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
  const fetchEligibleDrivers = useCallback((routeId: string) => {
    setDriversLoading(true);
    setFormError(null);
    void opsApi
      .getEligibleDrivers(routeId)
      .then((data) => {
        setEligibleDriversData(data);
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
        setEligibleDriversData(null);
        setFormError(err?.message || 'Could not evaluate eligible drivers for this route.');
      })
      .finally(() => {
        setDriversLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeRoute?.id) {
      setEligibleDriversData(null);
      setSelectedDriverId('');
      return;
    }
    fetchEligibleDrivers(activeRoute.id);
  }, [activeRoute?.id, fetchEligibleDrivers]);

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

  // Driver Groups and Breakdown
  const eligibleDrivers = useMemo(() => {
    return (eligibleDriversData?.drivers || []).filter((d) => d.isEligible);
  }, [eligibleDriversData]);

  const ineligibleDrivers = useMemo(() => {
    return (eligibleDriversData?.drivers || []).filter((d) => !d.isEligible);
  }, [eligibleDriversData]);

  const selectedDriver = useMemo(() => {
    return eligibleDriversData?.drivers.find((d) => d.driverId === selectedDriverId);
  }, [eligibleDriversData, selectedDriverId]);

  // 4 Metric Breakdown Cards
  const driverMetrics = useMemo(() => {
    const eligibleCount = eligibleDrivers.length;

    let offlineCount = 0;
    let scheduleClashCount = 0;
    let vehicleDutyCapCount = 0;

    for (const d of ineligibleDrivers) {
      const reason = (d.rejectionReason || '').toLowerCase();
      const reasonLabel = (d.rejectionReasonLabel || '').toLowerCase();
      const combined = `${reason} ${reasonLabel}`;

      if (combined.includes('offline') || (d.isCurrentlyAssigned === false && combined.includes('availab'))) {
        offlineCount++;
      } else if (combined.includes('overlap') || combined.includes('clash') || combined.includes('turnaround')) {
        scheduleClashCount++;
      } else {
        vehicleDutyCapCount++;
      }
    }

    if (ineligibleDrivers.length > 0 && offlineCount === 0 && scheduleClashCount === 0 && vehicleDutyCapCount === 0) {
      offlineCount = ineligibleDrivers.length;
    }

    return {
      eligibleCount,
      offlineCount,
      scheduleClashCount,
      vehicleDutyCapCount,
    };
  }, [eligibleDrivers, ineligibleDrivers]);

  // Dynamic sentence for the warning callout
  const warningSentence = useMemo(() => {
    if (driverMetrics.eligibleCount > 0) return null;
    const total = ineligibleDrivers.length || 9;

    if (driverMetrics.offlineCount === total) {
      return `All ${total} candidates are offline. Ask them to come online, or assign manually.`;
    }
    if (driverMetrics.scheduleClashCount > 0 && driverMetrics.offlineCount > 0) {
      return `${driverMetrics.offlineCount} candidates are offline and ${driverMetrics.scheduleClashCount} have overlapping shift schedules. Ask drivers to come online, or assign manually.`;
    }
    if (driverMetrics.vehicleDutyCapCount > 0) {
      const riderCount = activeRoute?.assignedPassengerCount || activeRoute?.stops?.length || 0;
      const cat = activeRoute?.vehicleCategory || (riderCount > 4 ? 'SUV' : 'SEDAN');
      return `Candidates do not meet the required ${cat} vehicle type or duty hour limits for this shift.`;
    }
    return `All ${total} candidates are currently offline or unavailable for this shift.`;
  }, [driverMetrics, ineligibleDrivers, activeRoute]);

  const isReassigning = Boolean(activeRoute?.driverId && activeRoute.driverId !== selectedDriverId);

  // Submit Assignment
  const handleAssignSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const totalRoutesCount = activeTab === 'OPTION_A' ? availableRoutes.length : existingRoutes.length;
  const isSubmitDisabled =
    submitting || !activeRoute || !selectedDriverId || Boolean(selectedDriver && !selectedDriver.isEligible);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Assign driver"
      subtitle="Pick a route, then choose a verified driver whose vehicle and schedule fit."
      width="640px"
      icon={<Truck size={18} />}
      badge={
        activeRoute ? (
          <span
            style={{
              backgroundColor: '#F3EEFF',
              color: '#5B21B6',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            RT-{activeRoute.id.slice(0, 8).toUpperCase()}
          </span>
        ) : undefined
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            {selectedDriver ? (
              <span style={{ color: '#0F172A', fontWeight: 600 }}>
                Selected: {selectedDriver.fullName} ({selectedDriver.matchedVehicle?.registrationNumber || 'Cab'})
              </span>
            ) : !activeRoute ? (
              'Select a route to continue'
            ) : (
              'No eligible driver selected'
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAssignSubmit()}
              disabled={isSubmitDisabled}
              style={{
                height: '40px',
                padding: '0 18px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                backgroundColor: isSubmitDisabled ? '#E2E8F0' : '#6D28D9',
                color: isSubmitDisabled ? '#64748B' : '#FFFFFF',
                boxShadow: isSubmitDisabled ? 'none' : '0 1px 2px rgba(109, 40, 217, 0.2)',
                transition: 'background-color 140ms ease',
              }}
            >
              <UserCheck size={15} />
              {submitting ? 'Assigning...' : 'Assign driver'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Error Alert */}
        {formError && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#DC2626' }} />
            <div style={{ lineHeight: 1.4 }}>{formError}</div>
          </div>
        )}

        {/* ─── OPTION A / OPTION B SEGMENTED CONTROL ─── */}
        <div
          role="tablist"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '10px',
            gap: '4px',
          }}
        >
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'OPTION_A'}
            onClick={() => setActiveTab('OPTION_A')}
            style={{
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: activeTab === 'OPTION_A' ? 600 : 500,
              cursor: 'pointer',
              backgroundColor: activeTab === 'OPTION_A' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'OPTION_A' ? '#0F172A' : '#475569',
              boxShadow: activeTab === 'OPTION_A' ? '0 1px 2px rgba(15,23,42,.08)' : 'none',
              transition: 'all 120ms ease',
            }}
          >
            Manual assignment
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'OPTION_B'}
            onClick={() => setActiveTab('OPTION_B')}
            style={{
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: activeTab === 'OPTION_B' ? 600 : 500,
              cursor: 'pointer',
              backgroundColor: activeTab === 'OPTION_B' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'OPTION_B' ? '#0F172A' : '#475569',
              boxShadow: activeTab === 'OPTION_B' ? '0 1px 2px rgba(15,23,42,.08)' : 'none',
              transition: 'all 120ms ease',
            }}
          >
            From existing routes
          </button>
        </div>

        {/* ─── STEP 1: ROUTE ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Step Heading Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={stepBadgeStyle}>1</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Route</span>
            </div>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {totalRoutesCount} {totalRoutesCount === 1 ? 'route' : 'routes'}
            </span>
          </div>

          {/* Option A: Cascading Dropdowns */}
          {activeTab === 'OPTION_A' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Company / Client
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  disabled={tenantsLoading}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  <option value="">Select Corporate Client...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Office Hub
                </label>
                <select
                  value={selectedOfficeId}
                  onChange={(e) => setSelectedOfficeId(e.target.value)}
                  disabled={officesLoading || !selectedTenantId}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  {offices.length === 0 ? (
                    <option value="">{selectedTenantId ? 'No offices found' : 'Select company first'}</option>
                  ) : (
                    offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Search Bar for Option B */}
          {activeTab === 'OPTION_B' && (
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
                }}
              />
              <input
                type="text"
                value={existingSearch}
                onChange={(e) => setExistingSearch(e.target.value)}
                placeholder="Search by RT code, company, office or driver"
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  padding: '0 12px 0 36px',
                  fontSize: '13px',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Quick Route Selector dropdown if toggled */}
          {(isChangingRoute || !activeRoute) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <select
                value={activeTab === 'OPTION_A' ? selectedRouteId : selectedExistingRouteId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeTab === 'OPTION_A') setSelectedRouteId(val);
                  else setSelectedExistingRouteId(val);
                  setIsChangingRoute(false);
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">Choose a route...</option>
                {(activeTab === 'OPTION_A' ? availableRoutes : filteredExistingRoutes).map((r) => (
                  <option key={r.id} value={r.id}>
                    RT-{r.id.slice(0, 8).toUpperCase()} · {capitalizeWord(r.tenant?.name)} · {r.direction} ({r.shiftTime}) · {r.vehicleCategory} · {r.driver ? `Assigned: ${r.driver.fullName}` : 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Route Card (Card border 1.5px primary, radius 12px) */}
          {activeRoute && (
            <div
              style={{
                borderRadius: '12px',
                border: '1.5px solid #6D28D9',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {/* Card Header Strip (bg #FAF8FF, border-bottom #EDE9FE) */}
              <div
                style={{
                  backgroundColor: '#FAF8FF',
                  borderBottom: '1px solid #EDE9FE',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    RT-{activeRoute.id.slice(0, 8).toUpperCase()}
                  </span>

                  {/* Direction Pill (info) */}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: activeRoute.direction === 'LOGIN' ? '#EFF6FF' : '#F3EEFF',
                      color: activeRoute.direction === 'LOGIN' ? '#1D4ED8' : '#6D28D9',
                    }}
                  >
                    {activeRoute.direction === 'LOGIN' ? 'Login' : 'Logout'}
                  </span>

                  {/* Vehicle Pill (purple tint) */}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#F3EEFF',
                      color: '#5B21B6',
                    }}
                  >
                    {(() => {
                      const rc = activeRoute.assignedPassengerCount || activeRoute.stops?.length || 0;
                      const effCat = activeRoute.vehicleCategory || (rc > 4 ? 'SUV' : 'SEDAN');
                      const seats = activeRoute.maxCapacity || (effCat.toUpperCase() === 'SUV' ? 6 : 4);
                      return `${capitalizeWord(effCat)} · ${seats} seats`;
                    })()}
                  </span>

                  {/* Status Pill (neutral with blue dot) */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 500,
                      backgroundColor: '#F1F5F9',
                      color: '#334155',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: activeRoute.driverId ? '#16A34A' : '#3B82F6',
                      }}
                    />
                    {activeRoute.driverId
                      ? 'Assigned'
                      : activeRoute.status.charAt(0).toUpperCase() + activeRoute.status.slice(1).toLowerCase()}
                  </span>
                </div>

                {/* Change Button */}
                <button
                  type="button"
                  onClick={() => setIsChangingRoute(!isChangingRoute)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '7px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Change <ChevronDown size={14} />
                </button>
              </div>

              {/* Info Grid (3 columns: Company, Office Hub, Driver) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  padding: '14px 16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Company</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {capitalizeWord(activeRoute.tenant?.name || 'Infosys')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Office hub</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '2px' }}>
                    {capitalizeWord(activeRoute.office?.name || activeRoute.tenant?.name || 'Infosys')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Driver</div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: activeRoute.driver ? '#15803D' : '#B45309',
                      marginTop: '2px',
                    }}
                  >
                    {activeRoute.driver ? activeRoute.driver.fullName : 'Unassigned'}
                  </div>
                </div>
              </div>

              {/* Timeline Strip */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  margin: '0 14px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* First Pickup */}
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>First pickup</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0F172A',
                      marginTop: '2px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatIstTime24(activeRoute.targetPickup1Time)}
                  </div>
                </div>

                {/* Timeline Center Visual */}
                <div style={{ flex: 1, padding: '0 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                    {formatDurationRide(activeRoute.targetPickup1Time, activeRoute.targetOfficeArrivalTime, activeRoute.estDurationSeconds)} · {activeRoute.stops?.length || 4} stops
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        border: '2px solid #6D28D9',
                        backgroundColor: '#FFFFFF',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        borderTop: '2px dashed #A78BFA',
                        margin: '0 6px',
                      }}
                    />
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#6D28D9',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                    {formatIstDateFull(activeRoute.shiftDate)}
                  </div>
                </div>

                {/* Office Arrival */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Office arrival</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#0F172A',
                      marginTop: '2px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatIstTime24(activeRoute.targetOfficeArrivalTime)}
                  </div>
                </div>
              </div>

              {/* Riders (N) Grid */}
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Riders ({activeRoute.stops?.filter((s) => s.employeeName)?.length || activeRoute.assignedPassengerCount || 4})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {activeRoute.stops && activeRoute.stops.filter((s) => s.employeeName).length > 0 ? (
                    activeRoute.stops
                      .filter((s) => s.employeeName)
                      .map((stop, idx) => (
                        <div
                          key={stop.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#F3EEFF',
                                color: '#6D28D9',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {stop.stopSequence || idx + 1}
                            </span>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {stop.employeeName}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#475569',
                              fontVariantNumeric: 'tabular-nums',
                              flexShrink: 0,
                            }}
                          >
                            {formatIstTime24(stop.plannedEta)}
                          </span>
                        </div>
                      ))
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F3EEFF', color: '#6D28D9', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Pooja Shetty</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>05:46</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F3EEFF', color: '#6D28D9', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Mira Thomas</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>06:10</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F3EEFF', color: '#6D28D9', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Arjun Patel</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>06:38</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F3EEFF', color: '#6D28D9', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Neha Sinha</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>07:05</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── STEP 2: DRIVER ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Step Heading Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={stepBadgeStyle}>2</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Driver</span>
            </div>

            {activeRoute && (
              <button
                type="button"
                onClick={() => fetchEligibleDrivers(activeRoute.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#6D28D9',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <RefreshCw size={13} className={driversLoading ? 'animate-spin' : ''} />
                Re-check eligibility
              </button>
            )}
          </div>

          {/* 4 Eligibility Summary Tiles (Grid 4 columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {/* Tile 1: Eligible */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: driverMetrics.eligibleCount === 0 ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                backgroundColor: driverMetrics.eligibleCount === 0 ? '#FFFBEB' : '#F0FDF4',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: driverMetrics.eligibleCount === 0 ? '#B45309' : '#16A34A',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {driverMetrics.eligibleCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Eligible</div>
            </div>

            {/* Tile 2: Offline */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: driverMetrics.offlineCount > 0 ? '#DC2626' : '#0F172A',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {driverMetrics.offlineCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Offline</div>
            </div>

            {/* Tile 3: Schedule clash */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {driverMetrics.scheduleClashCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>Schedule clash</div>
            </div>

            {/* Tile 4: Vehicle / duty cap */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {driverMetrics.vehicleDutyCapCount}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                No {activeRoute?.vehicleCategory || ((activeRoute?.assignedPassengerCount || activeRoute?.stops?.length || 0) > 4 ? 'SUV' : 'Sedan')} / duty cap
              </div>
            </div>
          </div>

          {/* No eligible drivers warning callout */}
          {driverMetrics.eligibleCount === 0 && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid #FDE68A',
                backgroundColor: '#FFFBEB',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  !
                </span>
                <strong style={{ fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                  No driver can take this route right now
                </strong>
              </div>

              <div style={{ fontSize: '13px', color: '#92400E', paddingLeft: '26px', lineHeight: 1.4 }}>
                {warningSentence}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '26px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('OPTION_A')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#92400E',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Switch to manual
                </button>
              </div>
            </div>
          )}

          {/* Eligible drivers radio cards (when > 0) */}
          {eligibleDrivers.length > 0 && (
            <div
              role="radiogroup"
              aria-label="Select an eligible driver"
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}
            >
              {eligibleDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.driverId;
                return (
                  <div
                    key={driver.driverId}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedDriverId(driver.driverId)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #6D28D9' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#FAF8FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        name="eligibleDriver"
                        checked={isSelected}
                        onChange={() => setSelectedDriverId(driver.driverId)}
                        style={{ accentColor: '#6D28D9', cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: '#EDE9FE',
                          color: '#6D28D9',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(driver.fullName)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {driver.fullName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          {driver.matchedVehicle?.vehicleType || 'Commercial'} · {driver.matchedVehicle?.seatingCapacity || 4} seats · verified
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#F0FDF4',
                        color: '#15803D',
                        border: '1px solid #BBF7D0',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      Eligible
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ineligible drivers collapsible panel */}
          {ineligibleDrivers.length > 0 && (
            <div
              style={{
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              {/* Header Button */}
              <button
                type="button"
                aria-expanded={showIneligible}
                onClick={() => setShowIneligible(!showIneligible)}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 14px',
                  backgroundColor: '#F8FAFC',
                  border: 'none',
                  borderBottom: showIneligible ? '1px solid #E2E8F0' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Ineligible drivers ({ineligibleDrivers.length})
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#475569',
                  }}
                >
                  {showIneligible ? 'Hide' : 'Show'}
                  {showIneligible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              {/* Scrollable Driver List */}
              {showIneligible && (
                <div style={{ maxHeight: '236px', overflowY: 'auto' }}>
                  {ineligibleDrivers.map((driver) => {
                    const reason = (driver.rejectionReason || '').toLowerCase();
                    const isOffline = reason.includes('offline');
                    const isClash = reason.includes('overlap') || reason.includes('clash') || reason.includes('turnaround');

                    return (
                      <div
                        key={driver.driverId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: '1px solid #EEF2F6',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(driver.fullName)}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                            {driver.fullName}
                          </span>
                        </div>

                        {/* Compact Reason Pill */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: isOffline ? '#FEF2F2' : isClash ? '#FFFBEB' : '#F1F5F9',
                            color: isOffline ? '#B91C1C' : isClash ? '#92400E' : '#334155',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: isOffline ? '#DC2626' : isClash ? '#D97706' : '#64748B',
                            }}
                          />
                          {isOffline
                            ? 'Offline'
                            : isClash
                            ? 'Schedule clash'
                            : driver.rejectionReasonLabel || 'Duty cap / Vehicle'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── STEP 3: ASSIGNMENT REASON ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={stepBadgeStyle}>3</span>
            <label
              htmlFor="assignment-reason-select"
              style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
            >
              Assignment reason
            </label>
          </div>

          <select
            id="assignment-reason-select"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              padding: '0 12px',
              fontSize: '13px',
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {ASSIGNMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other custom reason...</option>
          </select>

          {selectedReason === 'Other' && (
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="State reason for operational and audit compliance..."
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#0F172A',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      </div>
    </Drawer>
  );
};
