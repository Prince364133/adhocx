'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
import { RouteCard } from '../../components/operations/RouteCard';
import { StopItineraryDrawer } from '../../components/operations/StopItineraryDrawer';
import { ReassignDriverModal } from '../../components/operations/ReassignDriverModal';
import { CancelRouteModal } from '../../components/operations/CancelRouteModal';
import { Button } from '../../components/common/Button';
import {
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Routes' },
  { id: 'AT_RISK', label: 'At Risk / Delayed' },
  { id: 'DISPATCHING', label: 'Dispatching' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

function LiveRouteDeckContent() {
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get('tenantId') || '';

  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(initialTenantId);
  const [selectedDate, setSelectedDate] = useState<string>(todayIst());
  const [selectedShift, setSelectedShift] = useState<string>('08:00');
  const [selectedDirection, setSelectedDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispatchingRouteId, setDispatchingRouteId] = useState<string | null>(null);

  // Modal / Drawer state
  const [itineraryRoute, setItineraryRoute] = useState<CorporateRouteItem | null>(null);
  const [reassignRoute, setReassignRoute] = useState<CorporateRouteItem | null>(null);
  const [cancelRoute, setCancelRoute] = useState<CorporateRouteItem | null>(null);

  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial load: tenants
  useEffect(() => {
    (async () => {
      try {
        const res = await opsApi.getTenants({ limit: 100 });
        const items = res?.items ?? [];
        setTenants(items);
        if (!selectedTenantId && items.length > 0) {
          const remembered = localStorage.getItem('adhocx_ops_selected_tenant') || items[0].id;
          setSelectedTenantId(remembered);
        }
      } catch (err) {
        console.error('Failed to load tenants:', err);
      }
    })();
  }, []);

  // Load routes when filters change
  useEffect(() => {
    if (selectedTenantId) {
      loadRoutes();
    }
  }, [selectedTenantId, selectedDate, selectedShift, selectedDirection]);

  async function loadRoutes() {
    if (!selectedTenantId) return;
    setLoading(true);
    setAlertMsg(null);
    try {
      const data = await opsApi.getRoutes({
        tenantId: selectedTenantId,
        shiftDate: selectedDate,
        shiftTime: selectedShift,
        direction: selectedDirection,
      });
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Failed to load routes: ${err.message}` });
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  }

  async function handleForceDispatch(routeId: string) {
    setDispatchingRouteId(routeId);
    setAlertMsg(null);
    try {
      const result = await opsApi.forceDispatchRoute(routeId);
      setAlertMsg({
        type: result.status === 'OFFERED' || result.status === 'ALREADY_ASSIGNED' ? 'success' : 'error',
        text: `Route RT-${routeId.slice(0, 8).toUpperCase()}: Offer sent to nearby verified driver (10 km radius).`,
      });
      await loadRoutes();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: `Dispatch failed: ${err.message}` });
    } finally {
      setDispatchingRouteId(null);
    }
  }

  async function handleBulkDispatch() {
    const unassigned = routes.filter((r) => !r.driverId && r.status !== 'CANCELLED');
    if (unassigned.length === 0) return;
    setRefreshing(true);
    try {
      for (const r of unassigned) {
        await opsApi.forceDispatchRoute(r.id).catch(() => {});
      }
      setAlertMsg({
        type: 'success',
        text: `Bulk dispatch completed: Sent offers for ${unassigned.length} routes.`,
      });
      await loadRoutes();
    } finally {
      setRefreshing(false);
    }
  }

  // Filter routes by Tab and Search
  const filteredRoutes = useMemo(() => {
    let list = routes;

    // Filter by tab
    if (activeTab === 'AT_RISK') {
      list = list.filter((r) => r.isAtRisk || (r.delayMinutes && r.delayMinutes > 10) || (!r.driverId && r.status === 'DISPATCHING'));
    } else if (activeTab !== 'ALL') {
      list = list.filter((r) => r.status === activeTab);
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          (r.driver?.fullName && r.driver.fullName.toLowerCase().includes(q)) ||
          (r.vehicle?.registrationNumber && r.vehicle.registrationNumber.toLowerCase().includes(q)) ||
          (r.office?.name && r.office.name.toLowerCase().includes(q)),
      );
    }

    // Prioritize exceptions (§ 74): at-risk and delayed routes float to top
    return [...list].sort((a, b) => {
      const aRisk = a.isAtRisk || (a.delayMinutes && a.delayMinutes > 10) || (!a.driverId && a.status === 'DISPATCHING');
      const bRisk = b.isAtRisk || (b.delayMinutes && b.delayMinutes > 10) || (!b.driverId && b.status === 'DISPATCHING');
      if (aRisk && !bRisk) return -1;
      if (!aRisk && bRisk) return 1;
      return 0;
    });
  }, [routes, activeTab, search]);

  const unassignedCount = routes.filter((r) => !r.driverId && r.status !== 'CANCELLED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title & Bulk Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="h1-text" style={{ color: '#F8FAFC' }}>
            Live Shift Route Deck
          </h1>
          <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', marginTop: '4px' }}>
            Real-time route command & telemetry. Intervene directly with manual dispatch, driver reassignment, and boarding verification.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="outline"
            size="md"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
            isLoading={refreshing}
            onClick={handleRefresh}
          >
            Refresh
          </Button>

          {unassignedCount > 0 && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Send size={15} />}
              onClick={handleBulkDispatch}
            >
              Bulk Dispatch ({unassignedCount} Unassigned)
            </Button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {alertMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: alertMsg.type === 'success' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
            border: `1px solid ${alertMsg.type === 'success' ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
            color: alertMsg.type === 'success' ? '#4ADE80' : '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {alertMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Primary Filter Bar: Client, Date, Shift Time, Direction */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg, 10px)',
          border: '1px solid var(--border-subtle, #1E3060)',
        }}
      >
        {/* Company Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', marginBottom: '5px' }}>
            ENTERPRISE CLIENT
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedTenantId}
              onChange={(e) => {
                setSelectedTenantId(e.target.value);
                localStorage.setItem('adhocx_ops_selected_tenant', e.target.value);
              }}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', marginBottom: '5px' }}>
            SHIFT DATE (IST)
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: 'var(--bg-canvas, #010D2D)',
              border: '1px solid var(--border-strong, #2D4685)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 12px',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Shift Time */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', marginBottom: '5px' }}>
            SHIFT TIME
          </label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: 'var(--bg-canvas, #010D2D)',
              border: '1px solid var(--border-strong, #2D4685)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 12px',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="08:00">08:00 AM (Morning Shift)</option>
            <option value="09:00">09:00 AM (Standard Shift)</option>
            <option value="17:00">05:00 PM (Evening Return)</option>
            <option value="18:00">06:00 PM (Late Return)</option>
            <option value="20:00">08:00 PM (Night Inbound)</option>
            <option value="05:00">05:00 AM (Dawn Outbound)</option>
          </select>
        </div>

        {/* Direction Toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748B)', marginBottom: '5px' }}>
            COMMUTE DIRECTION
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setSelectedDirection('LOGIN')}
              style={{
                flex: 1,
                height: '38px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid',
                borderColor: selectedDirection === 'LOGIN' ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-strong, #2D4685)',
                backgroundColor: selectedDirection === 'LOGIN' ? 'rgba(87, 40, 178, 0.2)' : 'var(--bg-canvas, #010D2D)',
                color: selectedDirection === 'LOGIN' ? 'var(--brand-blue-400, #5290F9)' : 'var(--text-secondary, #94A3B8)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              LOGIN (To Office)
            </button>
            <button
              onClick={() => setSelectedDirection('LOGOUT')}
              style={{
                flex: 1,
                height: '38px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid',
                borderColor: selectedDirection === 'LOGOUT' ? 'var(--brand-amber-500, #EE9811)' : 'var(--border-strong, #2D4685)',
                backgroundColor: selectedDirection === 'LOGOUT' ? 'rgba(238, 152, 17, 0.2)' : 'var(--bg-canvas, #010D2D)',
                color: selectedDirection === 'LOGOUT' ? 'var(--brand-amber-500, #EE9811)' : 'var(--text-secondary, #94A3B8)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              LOGOUT (To Home)
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Bar: Status Tabs & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  border: '1px solid',
                  borderColor: isActive ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle, #1E3060)',
                  backgroundColor: isActive ? 'var(--brand-blue-500, #5728B2)' : 'var(--bg-surface-elevated, #111D3D)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary, #94A3B8)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
            border: '1px solid var(--border-subtle, #1E3060)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '6px 12px',
            width: '260px',
          }}
        >
          <Search size={14} color="var(--text-muted, #64748B)" />
          <input
            type="text"
            placeholder="Search driver, cab, office..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '12px',
            }}
          />
        </div>
      </div>

      {/* Routes List */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
          Loading shift routes...
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle, #1E3060)',
          }}
        >
          <AlertTriangle size={36} color="var(--text-muted, #64748B)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>No routes for this shift</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', marginTop: '4px' }}>
            No routes match the selected filters. Use the Route Optimizer to plan and cluster employee rosters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              isDispatching={dispatchingRouteId === route.id}
              onOpenItinerary={async (r) => {
                setItineraryRoute(r);
                try {
                  const detail = await opsApi.getRouteDetail(r.id);
                  if (detail) setItineraryRoute(detail);
                } catch {}
              }}
              onForceDispatch={handleForceDispatch}
              onReassignDriver={(r) => setReassignRoute(r)}
              onCancelRoute={(r) => setCancelRoute(r)}
            />
          ))}
        </div>
      )}

      {/* Context-Preserving Drawers & Modals (§ 72) */}
      <StopItineraryDrawer
        route={itineraryRoute}
        isOpen={Boolean(itineraryRoute)}
        onClose={() => setItineraryRoute(null)}
        onRouteUpdated={loadRoutes}
      />

      <ReassignDriverModal
        route={reassignRoute}
        isOpen={Boolean(reassignRoute)}
        onClose={() => setReassignRoute(null)}
        onSuccess={loadRoutes}
      />

      <CancelRouteModal
        route={cancelRoute}
        isOpen={Boolean(cancelRoute)}
        onClose={() => setCancelRoute(null)}
        onSuccess={loadRoutes}
      />
    </div>
  );
}

export default function LiveRouteDeckPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
          Loading Flight Route Deck...
        </div>
      }
    >
      <LiveRouteDeckContent />
    </Suspense>
  );
}
