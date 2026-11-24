'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCheck,
  Plus,
  RefreshCw,
  Search,
  Building2,
  MapPin,
  Route as RouteIcon,
  Users,
  Car,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Phone,
  FileText,
  Filter,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';
import { ManualAssignmentDrawer } from '../../components/operations/ManualAssignmentDrawer';
import { StopItineraryDrawer } from '../../components/operations/StopItineraryDrawer';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Routes' },
  { id: 'UNASSIGNED', label: 'Unassigned' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'REASSIGNED', label: 'Reassigned' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
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

export default function AssignmentsPage() {
  // Routes & Filter State
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('ALL');
  const [selectedDirection, setSelectedDirection] = useState<string>('ALL');

  // Hierarchy Data for Filters
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [offices, setOffices] = useState<Array<{ id: string; code: string; name: string }>>([]);

  // Drawers State
  const [isAssignmentDrawerOpen, setIsAssignmentDrawerOpen] = useState(false);
  const [assignmentDrawerTargetRoute, setAssignmentDrawerTargetRoute] = useState<CorporateRouteItem | null>(null);
  const [selectedRouteForItinerary, setSelectedRouteForItinerary] = useState<CorporateRouteItem | null>(null);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<{
    routeId: string;
    driverName: string;
    message: string;
  } | null>(null);

  // 1. Initial Load of Tenants
  useEffect(() => {
    let cancelled = false;
    void opsApi
      .getTenants({ limit: 100, minimal: true })
      .then((res) => {
        if (!cancelled) {
          setTenants(res.items || []);
        }
      })
      .catch(() => {
        if (!cancelled) setTenants([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Load Offices when selectedTenantId changes
  useEffect(() => {
    let cancelled = false;
    if (!selectedTenantId || selectedTenantId === 'ALL') {
      setOffices([]);
      setSelectedOfficeId('ALL');
      return;
    }
    void opsApi
      .getTenantOffices(selectedTenantId)
      .then((items) => {
        if (!cancelled) {
          setOffices(items || []);
          setSelectedOfficeId('ALL');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOffices([]);
          setSelectedOfficeId('ALL');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  // 3. Load Routes from Backend
  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await opsApi.getRoutes({
        tenantId: selectedTenantId !== 'ALL' ? selectedTenantId : undefined,
        officeId: selectedOfficeId !== 'ALL' ? selectedOfficeId : undefined,
        direction: selectedDirection !== 'ALL' ? (selectedDirection as 'LOGIN' | 'LOGOUT') : undefined,
        limit: 500,
        includeStops: true,
      });
      setRoutes(data || []);
    } catch (err: any) {
      setRoutes([]);
      setLoadError(err?.message || 'Failed to load corporate routes.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, selectedOfficeId, selectedDirection]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Derived KPI Stats
  const stats = useMemo(() => {
    const total = routes.length;
    let assigned = 0;
    let unassigned = 0;
    let reassigned = 0;
    let inTransit = 0;
    let completed = 0;

    for (const r of routes) {
      const isReassigned =
        r.dispatchStatus?.toUpperCase().includes('REASSIGN') ||
        (Boolean(r.driverId) && (r.dispatchAttempts ?? 0) > 1);

      if (r.status === 'COMPLETED') {
        completed++;
      } else if (r.status === 'IN_TRANSIT') {
        inTransit++;
      }

      if (isReassigned) {
        reassigned++;
      }

      if (r.driverId && (r.status === 'ASSIGNED' || r.dispatchStatus === 'DRIVER_ASSIGNED')) {
        assigned++;
      } else if (!r.driverId || r.status === 'PLANNED' || r.status === 'DISPATCHING') {
        unassigned++;
      }
    }

    return {
      total,
      assigned,
      unassigned,
      reassigned,
      inTransit,
      completed,
    };
  }, [routes]);

  // Filtered Routes by Tab and Search
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // 1. Tab Status Filter
      if (activeTab === 'UNASSIGNED') {
        const isUnassigned = !route.driverId || route.status === 'PLANNED' || route.status === 'DISPATCHING';
        if (!isUnassigned) return false;
      } else if (activeTab === 'ASSIGNED') {
        const isAssigned = Boolean(route.driverId) && (route.status === 'ASSIGNED' || route.dispatchStatus === 'DRIVER_ASSIGNED');
        if (!isAssigned) return false;
      } else if (activeTab === 'REASSIGNED') {
        const isReassigned =
          route.dispatchStatus?.toUpperCase().includes('REASSIGN') ||
          (Boolean(route.driverId) && (route.dispatchAttempts ?? 0) > 1);
        if (!isReassigned) return false;
      } else if (activeTab === 'COMPLETED') {
        if (route.status !== 'COMPLETED') return false;
      } else if (activeTab === 'CANCELLED') {
        if (route.status !== 'CANCELLED') return false;
      }

      // 2. Search Query Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const routeCode = `rt-${route.id.slice(0, 8)}`.toLowerCase();
        const tenantName = (route.tenant?.name || '').toLowerCase();
        const officeName = (route.office?.name || '').toLowerCase();
        const driverName = (route.driver?.fullName || '').toLowerCase();
        const driverPhone = (route.driver?.phone || '').toLowerCase();
        const vehiclePlate = (route.vehicle?.registrationNumber || '').toLowerCase();

        const matches =
          route.id.toLowerCase().includes(q) ||
          routeCode.includes(q) ||
          tenantName.includes(q) ||
          officeName.includes(q) ||
          driverName.includes(q) ||
          driverPhone.includes(q) ||
          vehiclePlate.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [routes, activeTab, search]);

  // Handlers for Drawer
  const handleOpenNewAssignment = () => {
    setAssignmentDrawerTargetRoute(null);
    setIsAssignmentDrawerOpen(true);
  };

  const handleAssignToRoute = (route: CorporateRouteItem) => {
    setAssignmentDrawerTargetRoute(route);
    setIsAssignmentDrawerOpen(true);
  };

  const handleAssignmentSuccess = (updatedRoute: CorporateRouteItem) => {
    setIsAssignmentDrawerOpen(false);
    setAssignmentDrawerTargetRoute(null);
    const driverName = updatedRoute.driver?.fullName || 'Selected Driver';
    const code = `RT-${updatedRoute.id.slice(0, 8).toUpperCase()}`;
    setSuccessBanner({
      routeId: code,
      driverName,
      message: `Successfully allocated driver ${driverName} to route ${code}.`,
    });
    // Refresh routes from server
    void loadRoutes();
    // Auto-dismiss banner after 6 seconds
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem' }}>
      {/* 1. Header & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '1.625rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Manual Driver Assignments
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                color: '#15803D',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22C55E' }} />
              Live Fleet Dispatch
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Allocate verified drivers to scheduled corporate employee transport routes with strict 24-hr duty and
            turnaround safety enforcement.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={loadRoutes}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenNewAssignment}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--brand-primary, #5728B2)',
              boxShadow: '0 2px 8px rgba(87, 40, 178, 0.25)',
            }}
          >
            <UserCheck size={16} />
            + New Assignment
          </Button>
        </div>
      </div>

      {/* 2. Success Banner */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            color: '#15803D',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} style={{ color: '#22C55E' }} />
            <span>
              <strong>{successBanner.routeId}</strong>: {successBanner.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#15803D',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <MetricCard
          label="Total Scheduled Routes"
          value={stats.total}
          subtext="Corporate roster routes"
          icon={<RouteIcon size={18} />}
          highlightColor="#5728B2"
        />
        <MetricCard
          label="Drivers Assigned"
          value={stats.assigned}
          subtext={`${stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0}% coverage`}
          icon={<ShieldCheck size={18} />}
          highlightColor="#22C55E"
        />
        <MetricCard
          label="Unassigned Pending"
          value={stats.unassigned}
          subtext="Requires manual or auto dispatch"
          icon={<AlertTriangle size={18} />}
          highlightColor={stats.unassigned > 0 ? '#D97706' : '#9CA3AF'}
        />
        <MetricCard
          label="Reassigned / Overrides"
          value={stats.reassigned}
          subtext="Driver replacements recorded"
          icon={<ArrowRight size={18} />}
          highlightColor="#3B82F6"
        />
        <MetricCard
          label="Fulfilled & Completed"
          value={stats.completed}
          subtext="Safely arrived at destination"
          icon={<CheckCircle2 size={18} />}
          highlightColor="#10B981"
        />
      </div>

      {/* 4. Filter Bar & Controls */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Row 1: Status Tabs & Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {STATUS_TABS.map((tab) => {
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: `1px solid ${selected ? 'var(--brand-primary, #5728B2)' : 'var(--border-subtle)'}`,
                    borderRadius: '6px',
                    color: selected ? '#FFFFFF' : 'var(--text-secondary)',
                    backgroundColor: selected ? 'var(--brand-primary, #5728B2)' : 'var(--bg-surface)',
                    font: 'inherit',
                    fontSize: '0.8125rem',
                    fontWeight: selected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                  {tab.id === 'UNASSIGNED' && stats.unassigned > 0 && (
                    <span
                      style={{
                        marginLeft: '6px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: selected ? 'rgba(255,255,255,0.3)' : '#FEF3C7',
                        color: selected ? '#FFFFFF' : '#B45309',
                      }}
                    >
                      {stats.unassigned}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: 'min(100%, 320px)' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                top: '50%',
                left: '0.75rem',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search route ID, driver, vehicle plate, office..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Company, Office, Direction) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
            <Filter size={14} />
            <span>Scope Filter:</span>
          </div>

          {/* Company Filter */}
          <div style={{ minWidth: '190px' }}>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="ALL">All Corporate Clients</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          {/* Office Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              disabled={selectedTenantId === 'ALL' || offices.length === 0}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
                opacity: selectedTenantId === 'ALL' ? 0.6 : 1,
              }}
            >
              <option value="ALL">
                {selectedTenantId === 'ALL' ? 'Select company first' : 'All Offices'}
              </option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </select>
          </div>

          {/* Direction Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-input, var(--bg-surface))',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="ALL">All Directions</option>
              <option value="LOGIN">LOGIN (Office Pickup)</option>
              <option value="LOGOUT">LOGOUT (Office Drop)</option>
            </select>
          </div>

          {(selectedTenantId !== 'ALL' || selectedOfficeId !== 'ALL' || selectedDirection !== 'ALL' || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTenantId('ALL');
                setSelectedOfficeId('ALL');
                setSelectedDirection('ALL');
                setSearch('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary, #5728B2)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              Reset Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredRoutes.length}</strong> of {routes.length} routes
          </div>
        </div>
      </div>

      {/* 5. Error Notice */}
      {loadError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#DC2626',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} />
          <span>Could not load corporate routes: {loadError}</span>
        </div>
      )}

      {/* 6. Assignments Data Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.8125rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-surface-elevated, #F8FAFC)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '0.85rem 1rem' }}>Route & Type</th>
                <th style={{ padding: '0.85rem 1rem' }}>Company & Office</th>
                <th style={{ padding: '0.85rem 1rem' }}>Shift & Schedule</th>
                <th style={{ padding: '0.85rem 1rem' }}>Commuters</th>
                <th style={{ padding: '0.85rem 1rem' }}>Assigned Driver</th>
                <th style={{ padding: '0.85rem 1rem' }}>Vehicle</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading corporate routes & driver allocation telemetry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
                    <div style={{ maxWidth: '420px', margin: '0 auto', color: 'var(--text-secondary)' }}>
                      <RouteIcon size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        No routes match filter
                      </div>
                      <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                        No routes found for tab "{activeTab}". Try choosing another company or reset filters.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenNewAssignment}
                        style={{ marginTop: '0.75rem' }}
                      >
                        + Initiate Driver Assignment
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route) => {
                  const isAssigned = Boolean(route.driverId);
                  const isReassigned =
                    route.dispatchStatus?.toUpperCase().includes('REASSIGN') ||
                    (Boolean(route.driverId) && (route.dispatchAttempts ?? 0) > 1);

                  const shortCode = `RT-${route.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <tr
                      key={route.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated, #F8FAFC)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* 1. Route & Type */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="code-tag"
                            style={{
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {shortCode}
                          </span>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor:
                                route.direction === 'LOGIN'
                                  ? 'rgba(34, 197, 94, 0.14)'
                                  : 'rgba(87, 40, 178, 0.14)',
                              color: route.direction === 'LOGIN' ? '#15803D' : '#5728B2',
                              border: `1px solid ${
                                route.direction === 'LOGIN'
                                  ? 'rgba(34, 197, 94, 0.3)'
                                  : 'rgba(87, 40, 178, 0.3)'
                              }`,
                            }}
                          >
                            {route.direction}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Car size={12} />
                          <span>{route.vehicleCategory || 'SEDAN'}</span>
                          <span>•</span>
                          <span>{route.maxCapacity || 4} Max Seats</span>
                        </div>
                      </td>

                      {/* 2. Company & Office */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {route.tenant?.name || 'Corporate Client'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <MapPin size={12} style={{ flexShrink: 0, color: 'var(--brand-primary, #5728B2)' }} />
                          <span
                            title={route.office?.name || route.office?.addressText || 'Office Hub'}
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '180px',
                            }}
                          >
                            {route.office?.name || 'Office Hub'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Shift & Schedule */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatIstDate(route.shiftDate)} • {route.shiftTime || '09:00'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          <span>
                            {formatIstTime(route.targetPickup1Time)} → {formatIstTime(route.targetOfficeArrivalTime)}
                          </span>
                        </div>
                      </td>

                      {/* 4. Commuters & Stops */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} style={{ color: 'var(--brand-primary, #5728B2)' }} />
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {route.assignedPassengerCount || route.stops?.length || 0} / {route.maxCapacity || 4}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {route.stops?.length || route._count?.stops || 0} Stops Itinerary
                        </div>
                      </td>

                      {/* 5. Assigned Driver */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        {isAssigned && route.driver ? (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {route.driver.fullName}
                            </div>
                            {route.driver.phone && (
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                  marginTop: '0.2rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Phone size={11} />
                                <span>{route.driver.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#D97706',
                                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              <AlertTriangle size={12} />
                              Unassigned
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Awaiting driver allocation
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 6. Vehicle */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        {isAssigned && route.vehicle ? (
                          <div>
                            <span className="code-tag">{route.vehicle.registrationNumber}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {route.vehicle.model || 'Verified Vehicle'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                        <StatusBadge
                          status={
                            isReassigned
                              ? 'REASSIGNED'
                              : isAssigned
                              ? 'ASSIGNED'
                              : 'UNASSIGNED'
                          }
                          size="sm"
                        />
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {route.dispatchStatus || route.status}
                        </div>
                      </td>

                      {/* 8. Actions */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedRouteForItinerary(route)}
                            title="View stops & passenger manifest"
                            style={{
                              padding: '0.35rem 0.65rem',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FileText size={13} />
                            Stops
                          </button>

                          {isAssigned ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAssignToRoute(route)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                color: '#4338CA',
                                borderColor: 'rgba(99, 102, 241, 0.4)',
                              }}
                            >
                              Reassign
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAssignToRoute(route)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                backgroundColor: 'var(--brand-primary, #5728B2)',
                              }}
                            >
                              Assign Driver →
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Manual Driver Assignment Drawer (Right-side slideout) */}
      <ManualAssignmentDrawer
        isOpen={isAssignmentDrawerOpen}
        onClose={() => {
          setIsAssignmentDrawerOpen(false);
          setAssignmentDrawerTargetRoute(null);
        }}
        onSuccess={handleAssignmentSuccess}
        initialRoute={assignmentDrawerTargetRoute}
        initialTenantId={selectedTenantId !== 'ALL' ? selectedTenantId : undefined}
        initialOfficeId={selectedOfficeId !== 'ALL' ? selectedOfficeId : undefined}
      />

      {/* 8. Commuter Stop Itinerary & Manifest Drawer */}
      <StopItineraryDrawer
        route={selectedRouteForItinerary}
        isOpen={Boolean(selectedRouteForItinerary)}
        onClose={() => setSelectedRouteForItinerary(null)}
        onRouteUpdated={() => {
          setSelectedRouteForItinerary(null);
          void loadRoutes();
        }}
      />
    </div>
  );
}
