'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Route as RouteIcon,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from 'lucide-react';
import { CorporateRouteItem, CorporateTenantOption, RouteStop } from '../../lib/api/opsTypes';
import { isOfficeHubStop } from '../../lib/opsHelpers';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

export interface RouteSearchMatchInfo {
  route: CorporateRouteItem;
  employeeStops: RouteStop[];
  matchedStopIds: Set<string>;
  matchReasons: string[];
}

interface CompanyRouteSearchPanelProps {
  tenants: CorporateTenantOption[];
  selectedTenantId: string;
  onSelectCompany: (tenantId: string) => void;
  routes: CorporateRouteItem[];
  loading: boolean;
  errorMsg: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  directionFilter: 'ALL' | 'LOGIN' | 'LOGOUT';
  onDirectionFilterChange: (dir: 'ALL' | 'LOGIN' | 'LOGOUT') => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  officeFilter: string;
  onOfficeFilterChange: (officeId: string) => void;
  shiftDateFilter: string;
  onShiftDateFilterChange: (date: string) => void;
  matches: RouteSearchMatchInfo[];
  selectedRouteId: string | null;
  selectedRouteDetail: CorporateRouteItem | null;
  detailLoading: boolean;
  highlightedStopSequence: number | null;
  onSelectRoute: (route: CorporateRouteItem) => void;
  onSelectStop: (stopSequence: number | null) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
}

function formatIstTime(iso?: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
}

function getStopBadgeColors(status?: string): { bg: string; color: string; border: string } {
  switch (String(status || '').toUpperCase()) {
    case 'BOARDED':
    case 'COMPLETED':
      return {
        bg: 'var(--color-success-bg, #DCFCE7)',
        color: 'var(--color-success, #16A34A)',
        border: 'var(--color-success-border, #86EFAC)',
      };
    case 'ARRIVED':
      return {
        bg: 'var(--brand-primary-subtle)',
        color: 'var(--brand-blue-500, #5728B2)',
        border: 'var(--color-info-border, #B794F4)',
      };
    case 'NO_SHOW':
    case 'CANCELLED':
      return {
        bg: 'var(--color-danger-bg, #FEE2E2)',
        color: 'var(--color-danger, #DC2626)',
        border: 'var(--color-danger-border, #FCA5A5)',
      };
    default:
      return {
        bg: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        border: 'var(--border-subtle)',
      };
  }
}

export function getRouteEmployeeStops(route: CorporateRouteItem): RouteStop[] {
  return [...(route.stops ?? [])]
    .filter((stop) => !isOfficeHubStop(stop))
    .sort((a, b) => a.stopSequence - b.stopSequence);
}

export function matchRoutesWithQuery(
  routes: CorporateRouteItem[],
  query: string,
  directionFilter: 'ALL' | 'LOGIN' | 'LOGOUT',
  statusFilter: string,
  officeFilter: string,
  shiftDateFilter: string,
): RouteSearchMatchInfo[] {
  const q = query.trim().toLowerCase();

  return routes
    .map((route) => {
      if (directionFilter !== 'ALL' && route.direction !== directionFilter) return null;
      if (statusFilter !== 'ALL' && route.status !== statusFilter) return null;
      if (officeFilter !== 'ALL' && (route.officeId || route.office?.id) !== officeFilter) return null;
      if (shiftDateFilter && String(route.shiftDate).slice(0, 10) !== shiftDateFilter) return null;

      const employeeStops = getRouteEmployeeStops(route);
      const matchedStopIds = new Set<string>();
      const matchReasons: string[] = [];

      if (!q) {
        return { route, employeeStops, matchedStopIds, matchReasons };
      }

      const routeCode = `rt-${route.id.slice(0, 8)}`.toLowerCase();
      const routeMatchesDirect =
        route.id.toLowerCase().includes(q) ||
        routeCode.includes(q) ||
        route.shiftTime.toLowerCase().includes(q) ||
        String(route.shiftDate).slice(0, 10).toLowerCase().includes(q) ||
        route.direction.toLowerCase().includes(q) ||
        route.vehicleCategory.toLowerCase().includes(q) ||
        (route.status || '').toLowerCase().includes(q) ||
        (route.dispatchStatus || '').toLowerCase().includes(q) ||
        (route.office?.name || '').toLowerCase().includes(q) ||
        (route.office?.code || '').toLowerCase().includes(q) ||
        (route.office?.addressText || '').toLowerCase().includes(q);

      if (routeMatchesDirect) {
        matchReasons.push('Route / Shift');
      }

      const driverOrVehicleMatch =
        (route.driver?.fullName || '').toLowerCase().includes(q) ||
        (route.driver?.phone || '').toLowerCase().includes(q) ||
        (route.vehicle?.registrationNumber || '').toLowerCase().includes(q) ||
        (route.vehicle?.model || '').toLowerCase().includes(q);

      if (driverOrVehicleMatch) {
        matchReasons.push('Driver / Cab');
      }

      let matchedEmployees = 0;
      for (const stop of employeeStops) {
        const name = (stop.employee?.fullName || stop.employeeName || '').toLowerCase();
        const code = (stop.employee?.employeeCode || '').toLowerCase();
        const phone = (stop.employee?.phoneNumber || stop.employeePhone || '').toLowerCase();
        const dept = (stop.employee?.department || '').toLowerCase();
        const addr = (stop.addressText || '').toLowerCase();

        if (
          name.includes(q) ||
          code.includes(q) ||
          phone.includes(q) ||
          dept.includes(q) ||
          addr.includes(q)
        ) {
          matchedStopIds.add(stop.id);
          matchedEmployees += 1;
        }
      }

      if (matchedEmployees > 0) {
        matchReasons.push(`${matchedEmployees} Employee${matchedEmployees === 1 ? '' : 's'}`);
      }

      if (!routeMatchesDirect && !driverOrVehicleMatch && matchedEmployees === 0) {
        return null;
      }

      return { route, employeeStops, matchedStopIds, matchReasons };
    })
    .filter((item): item is RouteSearchMatchInfo => item !== null);
}

export const CompanyRouteSearchPanel: React.FC<CompanyRouteSearchPanelProps> = ({
  tenants,
  selectedTenantId,
  onSelectCompany,
  routes,
  loading,
  errorMsg,
  searchQuery,
  onSearchQueryChange,
  directionFilter,
  onDirectionFilterChange,
  statusFilter,
  onStatusFilterChange,
  officeFilter,
  onOfficeFilterChange,
  shiftDateFilter,
  onShiftDateFilterChange,
  matches,
  selectedRouteId,
  selectedRouteDetail,
  detailLoading,
  highlightedStopSequence,
  onSelectRoute,
  onSelectStop,
  onRefresh,
  onResetFilters,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const stopCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  useEffect(() => {
    if (!selectedRouteId || highlightedStopSequence == null) return;
    const el = stopCardRefs.current.get(`${selectedRouteId}:${highlightedStopSequence}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedRouteId, highlightedStopSequence]);

  const officeOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const off of selectedTenant?.offices ?? []) {
      map.set(off.id, { id: off.id, label: `${off.name} (${off.code})` });
    }
    for (const r of routes) {
      const id = r.officeId || r.office?.id;
      if (id && !map.has(id) && r.office?.name) {
        map.set(id, { id, label: r.office.code ? `${r.office.name} (${r.office.code})` : r.office.name });
      }
    }
    return Array.from(map.values());
  }, [selectedTenant, routes]);

  const totalMatchedEmployees = useMemo(
    () => matches.reduce((sum, item) => sum + item.employeeStops.length, 0),
    [matches],
  );

  const activeFilterCount =
    (directionFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (officeFilter !== 'ALL' ? 1 : 0) +
    (shiftDateFilter ? 1 : 0);

  const hasActiveFilters = Boolean(searchQuery.trim() || activeFilterCount > 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Compact Search Engine Header (Fixed, never shrinks) */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 14px 10px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        {/* Company Selector + Sync Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Building2
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brand-blue-500, #5728B2)',
                pointerEvents: 'none',
              }}
            />
            <select
              aria-label="Select company for route search"
              value={selectedTenantId}
              onChange={(e) => onSelectCompany(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 30px',
                backgroundColor: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {tenants.length === 0 && <option value="">No companies onboarded</option>}
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 10px',
              borderRadius: '8px',
              border: `1px solid ${showFilters || activeFilterCount > 0 ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`,
              backgroundColor:
                showFilters || activeFilterCount > 0 ? 'var(--brand-primary-subtle)' : 'var(--bg-surface-muted)',
              color:
                showFilters || activeFilterCount > 0 ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-secondary)',
              fontFamily: 'inherit',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--brand-blue-500, #5728B2)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || !selectedTenantId}
            title="Sync company routes"
            aria-label="Sync company routes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-secondary)',
              cursor: loading ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : undefined} />
          </button>
        </div>

        {/* Omnibox Search Input */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              color: 'var(--brand-blue-500, #5728B2)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            aria-label="Search company routes, employees, stops, or drivers"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search route ID, employee, phone, stop, driver, plate..."
            style={{
              width: '100%',
              padding: '8px 32px 8px 34px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: '9px',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 500,
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              aria-label="Clear search query"
              style={{
                position: 'absolute',
                right: '7px',
                background: 'var(--bg-surface-muted)',
                border: 'none',
                borderRadius: '6px',
                width: '22px',
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Collapsible Faceted Filters */}
        {showFilters && (
          <div
            style={{
              padding: '10px',
              borderRadius: '9px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '7px',
                  padding: '2px',
                  gap: '2px',
                  flex: 1,
                }}
              >
                {(['ALL', 'LOGIN', 'LOGOUT'] as const).map((dir) => {
                  const active = directionFilter === dir;
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onDirectionFilterChange(dir)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        borderRadius: '5px',
                        border: 'none',
                        fontFamily: 'inherit',
                        fontSize: '11px',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: active ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
                        color: active ? '#FFFFFF' : 'var(--text-secondary)',
                      }}
                    >
                      {dir === 'ALL' ? 'All' : dir}
                    </button>
                  );
                })}
              </div>

              <select
                aria-label="Filter by route status"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                style={{
                  padding: '5px 8px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '7px',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  outline: 'none',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="DISPATCHING">Dispatching</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: officeOptions.length > 1 ? '1fr 1fr' : '1fr', gap: '6px' }}>
              {officeOptions.length > 1 && (
                <select
                  aria-label="Filter by office hub"
                  value={officeFilter}
                  onChange={(e) => onOfficeFilterChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '7px',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">All Offices ({officeOptions.length})</option>
                  {officeOptions.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.label}
                    </option>
                  ))}
                </select>
              )}

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  aria-label="Filter by shift date"
                  value={shiftDateFilter}
                  onChange={(e) => onShiftDateFilterChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 26px 4px 8px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '7px',
                    color: shiftDateFilter ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '11.5px',
                    outline: 'none',
                  }}
                />
                {shiftDateFilter && (
                  <button
                    type="button"
                    onClick={() => onShiftDateFilterChange('')}
                    aria-label="Clear shift date filter"
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      padding: '2px',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compact Summary & Quick Active Filter Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text-primary)' }}>{matches.length}</strong> of {routes.length} routes ·{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalMatchedEmployees}</strong> employees
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-blue-500, #5728B2)',
                fontFamily: 'inherit',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '1px 4px',
              }}
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Results & Employees Column */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'var(--bg-surface-muted)',
        }}
      >
        {errorMsg && (
          <div
            role="alert"
            style={{
              flexShrink: 0,
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '12px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div
            style={{
              flexShrink: 0,
              padding: '36px 16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '12.5px',
            }}
          >
            <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px', color: 'var(--brand-blue-500, #5728B2)' }} />
            <div>Searching company routes &amp; employee manifests...</div>
          </div>
        ) : matches.length === 0 ? (
          <div
            style={{
              flexShrink: 0,
              padding: '32px 18px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <RouteIcon size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No matching routes found
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
              {hasActiveFilters
                ? 'Try searching a different employee name, route code, stop address, or reset the active filters.'
                : 'This company has no planned routes yet. Use Roster Ingest or Live Shift to plan routes.'}
            </p>
            {hasActiveFilters && (
              <div style={{ marginTop: '12px' }}>
                <Button type="button" size="sm" variant="outline" onClick={onResetFilters}>
                  Clear Search &amp; Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          matches.map(({ route, employeeStops, matchedStopIds, matchReasons }) => {
            const isSelected = selectedRouteId === route.id;
            const activeDetail = isSelected && selectedRouteDetail?.id === route.id ? selectedRouteDetail : route;
            const detailStops = isSelected ? getRouteEmployeeStops(activeDetail) : employeeStops;
            const legByFromSeq = new Map(
              (activeDetail.directions?.legs ?? []).map((leg) => [leg.fromSequence, leg]),
            );
            const distanceKm = activeDetail.directions?.totalDistanceKm
              ? activeDetail.directions.totalDistanceKm.toFixed(1)
              : activeDetail.estDistanceMeters
                ? (activeDetail.estDistanceMeters / 1000).toFixed(1)
                : null;
            const durationMin = activeDetail.directions?.totalDurationMinutes
              ? Math.round(activeDetail.directions.totalDurationMinutes)
              : activeDetail.estDurationSeconds
                ? Math.round(activeDetail.estDurationSeconds / 60)
                : null;
            const occupancyPct =
              route.maxCapacity > 0
                ? Math.min(100, Math.round((detailStops.length / route.maxCapacity) * 100))
                : 0;

            return (
              <div
                key={route.id}
                style={{
                  flexShrink: 0,
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  border: isSelected
                    ? '1.5px solid var(--brand-blue-500, #5728B2)'
                    : '1px solid var(--border-subtle)',
                  boxShadow: isSelected ? 'var(--shadow-glow-blue)' : 'var(--shadow-sm)',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Clickable Route Card Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRoute(route)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRoute(route);
                    }
                  }}
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    borderTopLeftRadius: '11px',
                    borderTopRightRadius: '11px',
                    borderBottomLeftRadius: isSelected ? '0' : '11px',
                    borderBottomRightRadius: isSelected ? '0' : '11px',
                    backgroundColor: isSelected ? 'var(--brand-primary-subtle)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="code-tag">RT-{route.id.slice(0, 8).toUpperCase()}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor:
                            route.direction === 'LOGIN'
                              ? 'rgba(87, 40, 178, 0.12)'
                              : 'rgba(238, 152, 17, 0.16)',
                          color:
                            route.direction === 'LOGIN'
                              ? 'var(--brand-blue-500, #5728B2)'
                              : 'var(--brand-amber-700, #915B06)',
                        }}
                      >
                        {route.direction}
                      </span>
                      <StatusBadge status={route.status} size="sm" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {route.shiftTime}
                      </span>
                      {isSelected ? (
                        <ChevronUp size={15} style={{ color: 'var(--brand-blue-500, #5728B2)' }} />
                      ) : (
                        <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  </div>

                  {/* Office & Seat Occupancy */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Building2 size={12} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {route.office?.name || 'Office Hub'}
                      </span>
                      <span style={{ flexShrink: 0 }}>· {String(route.shiftDate).slice(0, 10)}</span>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '5px',
                          borderRadius: '999px',
                          backgroundColor: 'var(--border-subtle)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${occupancyPct}%`,
                            height: '100%',
                            backgroundColor: 'var(--brand-blue-500, #5728B2)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Users size={11} style={{ color: 'var(--brand-blue-500, #5728B2)' }} />
                        {detailStops.length}/{route.maxCapacity}
                      </span>
                    </div>
                  </div>

                  {/* Driver / Vehicle + Match Indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Car size={12} />
                      <span>
                        {route.driver?.fullName || 'Unassigned driver'}
                        {route.vehicle?.registrationNumber ? ` · ${route.vehicle.registrationNumber}` : ` · ${route.vehicleCategory}`}
                      </span>
                    </div>

                    {matchReasons.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {matchReasons.map((reason) => (
                          <span
                            key={reason}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(87, 40, 178, 0.14)',
                              color: 'var(--brand-blue-500, #5728B2)',
                            }}
                          >
                            Match: {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Collapsed Employee Chips Preview */}
                  {!isSelected && employeeStops.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', paddingTop: '2px' }}>
                      {employeeStops.slice(0, 4).map((stop) => {
                        const isEmpMatch = matchedStopIds.has(stop.id);
                        const empLabel = stop.employee?.fullName || stop.employeeName || `Stop #${stop.stopSequence}`;
                        return (
                          <span
                            key={stop.id}
                            style={{
                              fontSize: '10.5px',
                              fontWeight: isEmpMatch ? 700 : 500,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              backgroundColor: isEmpMatch
                                ? 'var(--brand-blue-500, #5728B2)'
                                : 'var(--bg-surface-muted)',
                              color: isEmpMatch ? '#FFFFFF' : 'var(--text-secondary)',
                              border: `1px solid ${isEmpMatch ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`,
                            }}
                          >
                            {empLabel}
                          </span>
                        );
                      })}
                      {employeeStops.length > 4 && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', padding: '2px 4px' }}>
                          +{employeeStops.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Selected Route & Connected Employees Inspector */}
                {isSelected && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Route Telemetry Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px',
                        borderRadius: '9px',
                        backgroundColor: 'var(--bg-surface-muted)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11.5px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Driver &amp; Vehicle
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {activeDetail.driver?.fullName || 'Not assigned yet'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '1px' }}>
                          {activeDetail.vehicle?.registrationNumber
                            ? `${activeDetail.vehicle.registrationNumber} · ${activeDetail.vehicle.model}`
                            : activeDetail.vehicleCategory}
                        </div>
                        {activeDetail.driver?.phone && (
                          <a
                            href={`tel:${activeDetail.driver.phone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '3px',
                              color: 'var(--brand-blue-500, #5728B2)',
                              fontSize: '11px',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <Phone size={10} /> {activeDetail.driver.phone}
                          </a>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Route Telemetry
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Navigation size={11} style={{ color: 'var(--brand-blue-500, #5728B2)' }} />
                          <span>
                            {detailLoading
                              ? 'Loading path...'
                              : distanceKm
                                ? `${distanceKm} km${durationMin ? ` · ${durationMin} min` : ''}`
                                : `${detailStops.length} employee stops`}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                          Pickup #1: {formatIstTime(activeDetail.targetPickup1Time)} · Office:{' '}
                          {formatIstTime(activeDetail.targetOfficeArrivalTime)}
                        </div>
                        {activeDetail.dispatchStatus && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Dispatch: {activeDetail.dispatchStatus.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connected Employees Timeline */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Connected Employees ({detailStops.length})
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          Tap employee to focus pin
                        </span>
                      </div>

                      {detailStops.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
                          No employee stops recorded on this route.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {detailStops.map((stop, stopIdx) => {
                            const isStopHighlighted = highlightedStopSequence === stop.stopSequence;
                            const isEmpMatch = matchedStopIds.has(stop.id);
                            const empName = stop.employee?.fullName || stop.employeeName || 'Employee';
                            const empCode = stop.employee?.employeeCode;
                            const empPhone = stop.employee?.phoneNumber || stop.employeePhone;
                            const empDept = stop.employee?.department;
                            const empGender = stop.employee?.gender;
                            const stopColors = getStopBadgeColors(stop.status);
                            const leg = legByFromSeq.get(stop.stopSequence);
                            const dwellMin = Math.round((stop.dwellBufferSeconds ?? 600) / 60);

                            return (
                              <div
                                key={stop.id}
                                ref={(el) => {
                                  const key = `${route.id}:${stop.stopSequence}`;
                                  if (el) stopCardRefs.current.set(key, el);
                                  else stopCardRefs.current.delete(key);
                                }}
                                role="button"
                                tabIndex={0}
                                onClick={() =>
                                  onSelectStop(isStopHighlighted ? null : stop.stopSequence)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectStop(isStopHighlighted ? null : stop.stopSequence);
                                  }
                                }}
                                style={{
                                  padding: '10px 11px',
                                  borderRadius: '9px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  backgroundColor: isStopHighlighted
                                    ? 'rgba(87, 40, 178, 0.11)'
                                    : isEmpMatch
                                      ? 'var(--brand-primary-subtle)'
                                      : 'var(--bg-surface-muted)',
                                  border: isStopHighlighted
                                    ? '1.5px solid var(--brand-blue-500, #5728B2)'
                                    : isEmpMatch
                                      ? '1px solid var(--brand-blue-400, #733DD9)'
                                      : '1px solid var(--border-subtle)',
                                  boxShadow: isStopHighlighted
                                    ? '0 0 0 3px rgba(87, 40, 178, 0.14)'
                                    : 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <span
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '999px',
                                        backgroundColor: isStopHighlighted
                                          ? 'var(--brand-blue-700, #431E8E)'
                                          : 'var(--brand-blue-500, #5728B2)',
                                        boxShadow: isStopHighlighted
                                          ? '0 0 0 3px rgba(87, 40, 178, 0.22)'
                                          : 'none',
                                        color: '#FFFFFF',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                                      }}
                                    >
                                      {stop.stopSequence || stopIdx + 1}
                                    </span>
                                    <div style={{ minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontSize: '12.5px',
                                          fontWeight: 700,
                                          color: 'var(--text-primary)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        <span>{empName}</span>
                                        {empCode && (
                                          <span className="code-tag" style={{ fontSize: '10px', padding: '0 5px' }}>
                                            {empCode}
                                          </span>
                                        )}
                                        {isEmpMatch && (
                                          <span
                                            style={{
                                              fontSize: '9.5px',
                                              fontWeight: 700,
                                              padding: '1px 5px',
                                              borderRadius: '4px',
                                              backgroundColor: 'var(--brand-blue-500, #5728B2)',
                                              color: '#FFFFFF',
                                            }}
                                          >
                                            MATCH
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '999px',
                                      backgroundColor: stopColors.bg,
                                      color: stopColors.color,
                                      border: `1px solid ${stopColors.border}`,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {stop.status}
                                  </span>
                                </div>

                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                                  <MapPin size={12} style={{ marginTop: '2px', flexShrink: 0, color: 'var(--text-muted)' }} />
                                  <span style={{ lineHeight: 1.4 }}>{stop.addressText || 'Address not recorded'}</span>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <Clock size={11} />
                                      {formatIstTime(stop.plannedEta)} · {dwellMin}m wait
                                    </span>
                                    {empDept && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <User size={11} /> {empDept}
                                      </span>
                                    )}
                                    {empGender && (
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        {empGender}
                                      </span>
                                    )}
                                    {stop.boardingOtp && (
                                      <span className="code-tag" style={{ fontSize: '10px', padding: '0 5px' }}>
                                        OTP {stop.boardingOtp}
                                      </span>
                                    )}
                                  </div>

                                  {empPhone && (
                                    <a
                                      href={`tel:${empPhone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        color: 'var(--brand-blue-500, #5728B2)',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                      }}
                                    >
                                      <Phone size={10} /> {empPhone}
                                    </a>
                                  )}
                                </div>

                                {leg && (
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                    Next leg: {(leg.distanceKm ?? leg.distanceMeters / 1000).toFixed(1)} km ·{' '}
                                    {Math.round(
                                      leg.trafficDurationMinutes ??
                                        (leg.trafficDurationSeconds ?? leg.durationSeconds ?? 0) / 60,
                                    )}{' '}
                                    min
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Action */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        paddingTop: '8px',
                        borderTop: '1px dashed var(--border-subtle)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {activeDetail.office?.addressText || activeDetail.office?.name || 'Office destination linked'}
                      </span>
                      <Link href={`/routes/${route.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                        <Button type="button" size="sm" variant="primary" rightIcon={<ExternalLink size={12} />}>
                          Inspect Route
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
