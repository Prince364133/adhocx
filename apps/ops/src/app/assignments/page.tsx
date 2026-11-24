'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  Zap,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Route as RouteIcon,
  X,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
import { ManualAssignmentDrawer } from '../../components/operations/ManualAssignmentDrawer';
import { StopItineraryDrawer } from '../../components/operations/StopItineraryDrawer';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'UNASSIGNED', label: 'Unassigned' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'REASSIGNED', label: 'Reassigned' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
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

function formatIstDateShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
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
      return h > 0 ? `${h}h ${m}m ride` : `${m}m ride`;
    }
  }
  if (fallbackSec && fallbackSec > 0) {
    const diffMin = Math.round(fallbackSec / 60);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return h > 0 ? `${h}h ${m}m ride` : `${m}m ride`;
  }
  return '2h 14m ride';
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

  // Bulk Row Selection State
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());

  // Pagination / Load More display count
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // Drawers State
  const [isAssignmentDrawerOpen, setIsAssignmentDrawerOpen] = useState(false);
  const [assignmentDrawerTargetRoute, setAssignmentDrawerTargetRoute] = useState<CorporateRouteItem | null>(null);
  const [selectedRouteForItinerary, setSelectedRouteForItinerary] = useState<CorporateRouteItem | null>(null);

  // Success Notification Banner
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
    let cancelled = 0;

    for (const r of routes) {
      const isReassigned =
        r.dispatchStatus?.toUpperCase().includes('REASSIGN') ||
        (Boolean(r.driverId) && (r.dispatchAttempts ?? 0) > 1);

      if (r.status === 'COMPLETED') {
        completed++;
      } else if (r.status === 'IN_TRANSIT') {
        inTransit++;
      } else if (r.status === 'CANCELLED') {
        cancelled++;
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
      cancelled,
    };
  }, [routes]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: stats.total,
      UNASSIGNED: stats.unassigned,
      ASSIGNED: stats.assigned,
      REASSIGNED: stats.reassigned,
      COMPLETED: stats.completed,
      CANCELLED: stats.cancelled,
    };
  }, [stats]);

  // Earliest Unassigned Pickup Countdown
  const earliestPickupCountdown = useMemo(() => {
    const unassignedRoutes = routes.filter(
      (r) => !r.driverId || r.status === 'PLANNED' || r.status === 'DISPATCHING',
    );
    if (unassignedRoutes.length === 0) return null;

    let minTimestamp = Infinity;
    for (const r of unassignedRoutes) {
      if (r.targetPickup1Time) {
        const t = new Date(r.targetPickup1Time).getTime();
        if (!Number.isNaN(t) && t < minTimestamp) minTimestamp = t;
      }
    }

    if (minTimestamp === Infinity) return null;
    const diffMs = minTimestamp - Date.now();
    if (diffMs <= 0) return 'Immediate / In progress';
    const totalMin = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  }, [routes]);

  // Shift Date Helper for Scheduled Routes Cell
  const shiftDateHelper = useMemo(() => {
    if (routes.length === 0) return 'Corporate roster routes';
    const dates = new Set(routes.map((r) => formatIstDateShort(r.shiftDate)));
    if (dates.size === 1) {
      return `All for ${Array.from(dates)[0]}`;
    }
    return `${dates.size} shift dates scheduled`;
  }, [routes]);

  // Filtered Routes by Tab and Search
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // 1. Tab Status Filter
      if (activeTab === 'UNASSIGNED') {
        const isUnassigned = !route.driverId || route.status === 'PLANNED' || route.status === 'DISPATCHING';
        if (!isUnassigned) return false;
      } else if (activeTab === 'ASSIGNED') {
        const isAssigned =
          Boolean(route.driverId) &&
          (route.status === 'ASSIGNED' || route.dispatchStatus === 'DRIVER_ASSIGNED');
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

  // Shift-grouped Routes (Sorted by first pickup ascending within group)
  interface ShiftGroup {
    groupKey: string;
    shiftDateFormatted: string;
    directionLabel: string;
    shiftTime: string;
    routes: CorporateRouteItem[];
    unassignedCount: number;
  }

  const shiftGroups = useMemo<ShiftGroup[]>(() => {
    const groupsMap = new Map<string, ShiftGroup>();

    for (const r of filteredRoutes) {
      const shiftDateFormatted = formatIstDateShort(r.shiftDate);
      const directionLabel = r.direction === 'LOGIN' ? 'Login' : 'Logout';
      const shiftTime = r.shiftTime ? (r.shiftTime.length === 5 ? r.shiftTime : r.shiftTime.slice(0, 5)) : '08:00';
      const groupKey = `${r.shiftDate || ''}_${r.direction}_${shiftTime}`;

      let group = groupsMap.get(groupKey);
      if (!group) {
        group = {
          groupKey,
          shiftDateFormatted,
          directionLabel,
          shiftTime,
          routes: [],
          unassignedCount: 0,
        };
        groupsMap.set(groupKey, group);
      }

      group.routes.push(r);
      if (!r.driverId || r.status === 'PLANNED' || r.status === 'DISPATCHING') {
        group.unassignedCount++;
      }
    }

    // Sort routes within each group by first pickup ascending
    const result: ShiftGroup[] = [];
    for (const group of groupsMap.values()) {
      group.routes.sort((a, b) => {
        const timeA = a.targetPickup1Time ? new Date(a.targetPickup1Time).getTime() : 0;
        const timeB = b.targetPickup1Time ? new Date(b.targetPickup1Time).getTime() : 0;
        return timeA - timeB;
      });
      result.push(group);
    }

    return result;
  }, [filteredRoutes]);

  // Flattened displayed routes with limit
  const displayedRoutes = useMemo(() => {
    return filteredRoutes.slice(0, visibleCount);
  }, [filteredRoutes, visibleCount]);

  // Checkbox Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRouteIds(new Set(filteredRoutes.map((r) => r.id)));
    } else {
      setSelectedRouteIds(new Set());
    }
  };

  const handleToggleSelectRow = (routeId: string) => {
    setSelectedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedRouteIds(new Set());
  };

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
    const driverName = updatedRoute?.driver?.fullName || 'Selected Driver';
    const code = `RT-${(updatedRoute?.id || '').slice(0, 8).toUpperCase()}`;
    setSuccessBanner({
      routeId: code,
      driverName,
      message: `Successfully allocated driver ${driverName} to route ${code}.`,
    });
    void loadRoutes();
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  const coveragePercent =
    stats.total > 0 ? Math.min(100, Math.round((stats.assigned / stats.total) * 100)) : 0;

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        color: '#0F172A',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── 1. HEADER ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '26px',
                lineHeight: '34px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.015em',
              }}
            >
              Driver assignments
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#F0FDF4',
                color: '#15803D',
                border: '1px solid #BBF7D0',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A' }} />
              Live
            </span>
          </div>
          <p
            style={{
              margin: '6px 0 0',
              color: '#475569',
              fontSize: '14px',
              lineHeight: '20px',
            }}
          >
            Match verified drivers to corporate shift routes. Duty-hour and turnaround limits are checked on every assignment.
          </p>
        </div>

        {/* Header Actions (All 40px tall, 10px gap) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Refresh Button (40x40 icon-only) */}
          <button
            type="button"
            onClick={loadRoutes}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh routes"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 140ms ease',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Auto-dispatch Action */}
          <button
            type="button"
            onClick={() => {
              handleOpenNewAssignment();
            }}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'background-color 140ms ease',
            }}
          >
            <Zap size={15} style={{ color: '#0F172A' }} />
            Auto-dispatch
          </button>

          {/* + New assignment Primary Button */}
          <button
            type="button"
            onClick={handleOpenNewAssignment}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#6D28D9',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(109, 40, 217, 0.25)',
              transition: 'background-color 140ms ease',
            }}
          >
            <Plus size={16} />
            New assignment
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '10px',
            color: '#15803D',
            fontSize: '13.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
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
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '12.5px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── 2. KPI STRIP (FULL WIDTH, SPACIOUS SINGLE CARD) ─── */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          boxSizing: 'border-box',
        }}
      >
        {/* Cell 1: Scheduled routes */}
        <div
          style={{
            padding: '22px 28px',
            borderRight: '1px solid #EEF2F6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#475569' }}>Scheduled routes</div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '8px 0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stats.total}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>{shiftDateHelper}</div>
        </div>

        {/* Cell 2: Driver coverage */}
        <div
          style={{
            padding: '22px 28px',
            borderRight: '1px solid #EEF2F6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#475569' }}>Driver coverage</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              margin: '8px 0 4px',
            }}
          >
            <span
              style={{
                fontSize: '30px',
                fontWeight: 700,
                color: '#0F172A',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stats.assigned}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
              / {stats.total} assigned
            </span>
          </div>
          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '999px',
              backgroundColor: '#F1F5F9',
              overflow: 'hidden',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${coveragePercent}%`,
                backgroundColor: '#16A34A',
                borderRadius: '999px',
                transition: 'width 250ms ease',
              }}
            />
          </div>
        </div>

        {/* Cell 3: Needs a driver (THE ONLY HIGHLIGHTED CELL) */}
        <div
          style={{
            padding: '22px 28px',
            backgroundColor: '#FFFBEB',
            borderRight: '1px solid #EEF2F6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#92400E',
            }}
          >
            <AlertTriangle size={14} style={{ color: '#D97706' }} />
            Needs a driver
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 700,
              color: '#B45309',
              margin: '8px 0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stats.unassigned}
          </div>
          <div style={{ fontSize: '12.5px', color: '#92400E', fontWeight: 500 }}>
            {earliestPickupCountdown ? `First pickup in ${earliestPickupCountdown}` : 'Requires dispatch'}
          </div>
        </div>

        {/* Cell 4: Reassigned */}
        <div
          style={{
            padding: '22px 28px',
            borderRight: '1px solid #EEF2F6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#475569' }}>Reassigned</div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '8px 0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stats.reassigned}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>Driver swaps today</div>
        </div>

        {/* Cell 5: Completed */}
        <div
          style={{
            padding: '22px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#475569' }}>Completed</div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '8px 0 4px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stats.completed}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>Arrived at office</div>
        </div>
      </div>

      {/* ─── 3. TABLE CARD (FULL WIDTH TABS + FILTERS + EXPANSIVE TABLE) ─── */}
      <div
        style={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Tabs Row (Underline Tabs with count pills) */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #E2E8F0',
            padding: '0 24px',
            height: '52px',
            overflowX: 'auto',
          }}
        >
          {STATUS_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const count = tabCounts[tab.id as keyof typeof tabCounts] ?? 0;

            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  height: '52px',
                  padding: '0 16px',
                  border: 'none',
                  borderBottom: isSelected ? '2px solid #6D28D9' : '2px solid transparent',
                  marginBottom: '-1px',
                  backgroundColor: 'transparent',
                  color: isSelected ? '#0F172A' : '#475569',
                  fontSize: '13.5px',
                  fontWeight: isSelected ? 600 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 120ms ease',
                }}
              >
                {tab.label}
                <span
                  style={{
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 600,
                    backgroundColor: isSelected ? '#EDE9FE' : '#F1F5F9',
                    color: isSelected ? '#5B21B6' : '#475569',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #EEF2F6',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 340px', maxWidth: '440px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B',
              }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search route, driver, plate or office"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 14px 0 38px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Client Select */}
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            aria-label="Filter by corporate client"
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '150px',
            }}
          >
            <option value="ALL">All clients</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Office Select (Disabled until client chosen) */}
          <select
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
            disabled={selectedTenantId === 'ALL' || offices.length === 0}
            aria-label="Filter by office hub"
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: selectedTenantId === 'ALL' ? '#F8FAFC' : '#FFFFFF',
              color: selectedTenantId === 'ALL' ? '#64748B' : '#0F172A',
              fontSize: '13px',
              outline: 'none',
              cursor: selectedTenantId === 'ALL' ? 'not-allowed' : 'pointer',
              minWidth: '150px',
            }}
          >
            <option value="ALL">All offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          {/* Direction Select */}
          <select
            value={selectedDirection}
            onChange={(e) => setSelectedDirection(e.target.value)}
            aria-label="Filter by direction"
            style={{
              height: '40px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '150px',
            }}
          >
            <option value="ALL">Login & logout</option>
            <option value="LOGIN">Login only</option>
            <option value="LOGOUT">Logout only</option>
          </select>

          {/* Right Meta Text */}
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '13px',
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            Sorted by first pickup · <strong style={{ color: '#0F172A' }}>{filteredRoutes.length}</strong> of{' '}
            {routes.length}
          </div>
        </div>

        {/* Bulk Selection Bar (Shows when >= 1 checkbox checked) */}
        {selectedRouteIds.size > 0 && (
          <div
            style={{
              backgroundColor: '#F5F3FF',
              borderBottom: '1px solid #DDD6FE',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#4C1D95' }}>
              {selectedRouteIds.size} selected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={handleClearSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6D28D9',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {loadError && (
          <div
            role="alert"
            style={{
              padding: '14px 24px',
              backgroundColor: '#FEF2F2',
              borderBottom: '1px solid #FCA5A5',
              color: '#B91C1C',
              fontSize: '13.5px',
            }}
          >
            Could not load corporate routes: {loadError}
          </div>
        )}

        {/* Table View */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13.5px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  height: '44px',
                }}
              >
                <th style={{ width: '52px', padding: '0 16px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all routes"
                    checked={
                      filteredRoutes.length > 0 &&
                      filteredRoutes.every((r) => selectedRouteIds.has(r.id))
                    }
                    onChange={handleSelectAll}
                    style={{ accentColor: '#6D28D9', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '0 20px' }}>Route</th>
                <th style={{ padding: '0 20px' }}>Client</th>
                <th style={{ padding: '0 20px' }}>Pickup → arrival</th>
                <th style={{ padding: '0 20px' }}>Riders</th>
                <th style={{ padding: '0 20px' }}>Driver & vehicle</th>
                <th style={{ padding: '0 24px', textAlign: 'right' }}>
                  <span style={{ position: 'absolute', opacity: 0 }}>Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Loading routes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '64px 24px', textAlign: 'center' }}>
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: '#F1F5F9',
                          color: '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 14px',
                        }}
                      >
                        <RouteIcon size={22} />
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                        No {activeTab.toLowerCase()} routes
                      </div>
                      <p style={{ fontSize: '13.5px', color: '#64748B', margin: '6px 0 18px' }}>
                        No dispatch routes currently match the selected filter.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenNewAssignment}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        New assignment
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                shiftGroups.map((group) => {
                  return (
                    <React.Fragment key={group.groupKey}>
                      {/* Shift Group Header Row */}
                      <tr
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderBottom: '1px solid #EEF2F6',
                        }}
                      >
                        <td
                          colSpan={7}
                          style={{
                            padding: '14px 24px',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px' }}>
                            <strong style={{ color: '#0F172A', fontWeight: 700 }}>
                              {group.shiftDateFormatted} · {group.directionLabel} shift {group.shiftTime}
                            </strong>
                            <span style={{ color: '#64748B' }}>{group.routes.length} routes</span>
                            {group.unassignedCount > 0 && (
                              <span style={{ color: '#B45309', fontWeight: 600 }}>
                                · {group.unassignedCount} unassigned
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Routes within this shift group */}
                      {group.routes.map((route) => {
                        const isAssigned = Boolean(route.driverId);
                        const isSelectedRow = selectedRouteIds.has(route.id);
                        const shortCode = `RT-${route.id.slice(0, 8).toUpperCase()}`;
                        const riderCount =
                          route.assignedPassengerCount || route.stops?.length || 0;
                        const effectiveCategory = route.vehicleCategory || (riderCount > 4 ? 'SUV' : 'SEDAN');
                        const vehicleCatTitle = capitalizeWord(effectiveCategory);
                        const maxSeats = route.maxCapacity || (effectiveCategory.toUpperCase() === 'SUV' ? 6 : 4);
                        const seatFillPct = Math.min(100, Math.round((riderCount / maxSeats) * 100));

                        return (
                          <tr
                            key={route.id}
                            style={{
                              borderBottom: '1px solid #EEF2F6',
                              backgroundColor: isSelectedRow ? '#FAF8FF' : '#FFFFFF',
                              verticalAlign: 'top',
                              transition: 'background-color 120ms ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelectedRow) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelectedRow) e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ width: '52px', padding: '18px 16px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${shortCode}`}
                                checked={isSelectedRow}
                                onChange={() => handleToggleSelectRow(route.id)}
                                style={{ accentColor: '#6D28D9', cursor: 'pointer' }}
                              />
                            </td>

                            {/* 1. Route */}
                            <td style={{ padding: '18px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                    fontWeight: 600,
                                    fontSize: '13.5px',
                                    color: '#0F172A',
                                  }}
                                >
                                  {shortCode}
                                </span>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: route.direction === 'LOGIN' ? '#EFF6FF' : '#F3EEFF',
                                    color: route.direction === 'LOGIN' ? '#1D4ED8' : '#6D28D9',
                                  }}
                                >
                                  {route.direction === 'LOGIN' ? 'Login' : 'Logout'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                                {vehicleCatTitle} · {maxSeats} seats
                              </div>
                            </td>

                            {/* 2. Client */}
                            <td style={{ padding: '18px 20px' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>
                                {capitalizeWord(route.tenant?.name || 'Infosys')}
                              </div>
                              <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                                {capitalizeWord(route.office?.name || route.tenant?.name || 'Infosys')} office
                              </div>
                            </td>

                            {/* 3. Pickup -> Arrival */}
                            <td style={{ padding: '18px 20px' }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatIstTime24(route.targetPickup1Time)} →{' '}
                                {formatIstTime24(route.targetOfficeArrivalTime)}
                              </div>
                              <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                                {formatDurationRide(
                                  route.targetPickup1Time,
                                  route.targetOfficeArrivalTime,
                                  route.estDurationSeconds,
                                )}{' '}
                                · {route.stops?.length || 4} stops
                              </div>
                            </td>

                            {/* 4. Riders */}
                            <td style={{ padding: '18px 20px' }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: '#0F172A',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {riderCount} / {maxSeats}
                              </div>
                              {/* Seat-fill Bar */}
                              <div
                                style={{
                                  width: '130px',
                                  height: '6px',
                                  borderRadius: '999px',
                                  backgroundColor: '#F1F5F9',
                                  overflow: 'hidden',
                                  marginTop: '7px',
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${seatFillPct}%`,
                                    backgroundColor: seatFillPct === 100 ? '#6D28D9' : '#A78BFA',
                                    borderRadius: '999px',
                                  }}
                                />
                              </div>
                            </td>

                            {/* 5. Driver & vehicle (Merged cleanly) */}
                            <td style={{ padding: '18px 20px' }}>
                              {isAssigned && route.driver ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        backgroundColor: '#EDE9FE',
                                        color: '#6D28D9',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {getInitials(route.driver.fullName)}
                                    </div>
                                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                                      {route.driver.fullName}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                                    {route.vehicle?.registrationNumber || 'Commercial cab'}
                                    {route.vehicle?.model ? ` · ${route.vehicle.model}` : ''}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '3px 9px',
                                      borderRadius: '999px',
                                      backgroundColor: '#FFFBEB',
                                      border: '1px solid #FDE68A',
                                      color: '#92400E',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: '#D97706',
                                      }}
                                    />
                                    Unassigned
                                  </span>
                                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                                    Needs {vehicleCatTitle} · {maxSeats}+ seats
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* 6. Actions */}
                            <td style={{ padding: '18px 24px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedRouteForItinerary(route)}
                                  style={{
                                    height: '36px',
                                    padding: '0 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    color: '#334155',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background-color 120ms ease',
                                  }}
                                >
                                  View stops
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAssignToRoute(route)}
                                  style={{
                                    height: '36px',
                                    padding: '0 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#6D28D9',
                                    color: '#FFFFFF',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background-color 120ms ease',
                                  }}
                                >
                                  {isAssigned ? 'Reassign' : 'Assign'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer (Showing X of Y routes + Load More button) */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #EEF2F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Showing {Math.min(displayedRoutes.length, filteredRoutes.length)} of {filteredRoutes.length} routes
          </div>

          {filteredRoutes.length > displayedRoutes.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 10)}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Show {Math.min(8, filteredRoutes.length - displayedRoutes.length)} more
            </button>
          )}
        </div>
      </div>

      {/* ─── 4. DRAWERS & MODALS ─── */}
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
