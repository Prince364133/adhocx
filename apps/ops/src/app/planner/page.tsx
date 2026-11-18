'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { opsApi, ShiftOptimizationResponse } from '../../lib/api/opsClient';
import { isValidIndianMobile } from '../../lib/opsHelpers';
import {
  CorporateRouteItem,
  CorporateTenantOption,
  RoutePlanningResult,
  RoutePlanningDirectionOutcome,
  RoutePlanningResponse,
  VehicleCategoryOption,
} from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/ToastProvider';
import { OfficeHubRequiredModal } from '../../components/operations/OfficeHubRequiredModal';
import { OfficeLocationMismatchModal } from '../../components/operations/OfficeLocationMismatchModal';
import { SpatialTopologyCanvas } from '../../components/operations/SpatialTopologyCanvas';
import {
  Cpu,
  CheckCircle,
  AlertTriangle,
  Play,
  UploadCloud,
  FileSpreadsheet,
  Download,
  Compass,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Radar,
  Map as MapIcon,
  Database,
  Plus,
  Trash2,
  Route as RouteIcon,
} from 'lucide-react';

const COMPANY_STORAGE_KEY = 'adhocx_ops_selected_tenant';

const ROUTE_COLORS = [
  '#5728B2', // Electric Indigo
  '#047857', // Emerald Green
  '#EE9811', // Amber Gold
  '#A21CAF', // Purple
  '#EF4444', // Red
  '#0E7490', // Cyan
  '#4D7C0F', // Lime
  '#7C2D12', // Rust
];

type RoutingPreference = 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
const PICKUP_DETAILS_ZOOM = 13;
const ROSTER_FILE_EXTENSIONS = ['csv', 'xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'xltm', 'xml', 'ods'];

function isSupportedRosterFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && ROSTER_FILE_EXTENSIONS.includes(extension));
}

function isRoutePlanningBatchResult(result: RoutePlanningResponse): result is Extract<RoutePlanningResponse, { direction: 'BOTH' }> {
  return 'direction' in result && result.direction === 'BOTH' && Array.isArray(result.plans);
}

function tomorrowIst(hhmm: string): string {
  const d = new Date(Date.now() + 24 * 3600_000 + 330 * 60_000);
  return `${d.toISOString().slice(0, 10)}T${hhmm}`;
}

const tomorrowMorningIst = () => tomorrowIst('08:00');
const tomorrowEveningIst = () => tomorrowIst('17:00');

/** `YYYY-MM-DDTHH:mm` from a datetime-local input, interpreted as IST; undefined when blank/invalid. */
function istLocalToIso(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Settings a roster plan was calculated with; commit reuses them so persisted routes match the plan. */
interface RosterPlanSettings {
  vehicleCategory: string;
  stopDwellMinutes: number;
}

function stripApiErrorPrefix(message: string): string {
  return message.replace(/^API Error\s*\[\d+\]:\s*/i, '').trim();
}

function parseOfficeLocationMismatch(
  message: string,
): { distanceKm?: string; savedOfficeName?: string } | null {
  const cleaned = stripApiErrorPrefix(message);
  const commitMatch = cleaned.match(
    /optimized to an office location\s+([\d.]+)\s*km away from the saved office\s+"([^"]+)"/i,
  );
  if (commitMatch) {
    return { distanceKm: commitMatch[1], savedOfficeName: commitMatch[2] };
  }
  const planWarnMatch = cleaned.match(
    /saved office pin for\s+"([^"]+)"\s+differs from the geocoded address by\s+([\d.]+)\s*km/i,
  );
  if (planWarnMatch) {
    return { distanceKm: planWarnMatch[2], savedOfficeName: planWarnMatch[1] };
  }
  if (/office location.*away from the saved office|saved office pin.*differs/i.test(cleaned)) {
    return {};
  }
  return null;
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocationShortcut(address: string, fallback: string): string {
  const location = address
    .split(',')
    .map((part) => part.trim())
    .find((part) => part && !/^(flat|plot|house|h\.?\s*no\.?|door|unit|floor|near)\b/i.test(part));
  const words = (location || fallback).trim().split(/\s+/).filter(Boolean);
  const shortcut = words.slice(0, 2).join(' ');
  return shortcut.length > 10
    ? `${words[0].slice(0, 9)}…`
    : shortcut;
}

export default function RouteOptimizerPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'FILE_UPLOAD' | 'DB_SHIFT' | 'MANUAL'>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab')?.toUpperCase();
      if (tabParam === 'MANUAL') return 'MANUAL';
      if (tabParam === 'DB_SHIFT') return 'DB_SHIFT';
    }
    return 'FILE_UPLOAD';
  });

  // Manual Route Builder State
  const [manualDirection, setManualDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [manualShiftDate, setManualShiftDate] = useState<string>(
    () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10),
  );
  const [manualShiftTime, setManualShiftTime] = useState<string>('09:00');
  const [manualVehicleCategory, setManualVehicleCategory] = useState<string>('SEDAN');
  const [manualMaxCapacity, setManualMaxCapacity] = useState<number>(4);
  const [manualStops, setManualStops] = useState<
    Array<{ id: string; name: string; phoneNumber: string; email: string; address: string }>
  >([{ id: 'stop-1', name: '', phoneNumber: '', email: '', address: '' }]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualCreatedRoute, setManualCreatedRoute] = useState<CorporateRouteItem | null>(null);

  // File Upload Form State
  const [officeAddress, setOfficeAddress] = useState('');
  const [loginDeadline, setLoginDeadline] = useState(tomorrowMorningIst);
  const [logoutDeadline, setLogoutDeadline] = useState(tomorrowEveningIst);
  const [officeRadiusKm, setOfficeRadiusKm] = useState(50);
  const [maxTripKm, setMaxTripKm] = useState(50);
  const [uploadVehicleCategory, setUploadVehicleCategory] = useState('ALL');
  const [stopDwellMinutes, setStopDwellMinutes] = useState(10);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [routingPreference, setRoutingPreference] = useState<RoutingPreference>('TRAFFIC_AWARE');
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // DB Shift State
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategoryOption[]>([]);
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedUploadTenantId, setSelectedUploadTenantId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [uploadCompanyLoading, setUploadCompanyLoading] = useState(false);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [missingOfficeModal, setMissingOfficeModal] = useState<{
    open: boolean;
    context: 'import' | 'post';
    companyName?: string;
    hasCompanies: boolean;
  }>({
    open: false,
    context: 'post',
    hasCompanies: true,
  });
  const [refreshingOffices, setRefreshingOffices] = useState(false);
  const [refreshOfficesNotice, setRefreshOfficesNotice] = useState<string | null>(null);
  const [officeMismatchModal, setOfficeMismatchModal] = useState<{
    open: boolean;
    distanceKm?: string;
    savedOfficeName?: string;
    savedOfficeAddress?: string;
    plannedOfficeName?: string;
  }>({ open: false });
  const [shiftDate, setShiftDate] = useState<string>(new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10));
  const [loginShiftTime, setLoginShiftTime] = useState<string>('08:00');
  const [logoutShiftTime, setLogoutShiftTime] = useState<string>('17:00');
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT' | 'BOTH'>('LOGIN');
  const [dbVehicleCategory, setDbVehicleCategory] = useState('ALL');

  // Solver & UI State
  const [viewMode, setViewMode] = useState<'MAP' | 'TOPOLOGY'>('MAP');
  const [mapLoadError, setMapLoadError] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<'csv' | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<RoutePlanningResult | null>(null);
  const [selectedCab, setSelectedCab] = useState<number | null>(null);
  const [expandedCabs, setExpandedCabs] = useState<Set<number>>(new Set());
  const [selectedCabsForCommit, setSelectedCabsForCommit] = useState<Set<number>>(new Set());
  const [committedRouteCabs, setCommittedRouteCabs] = useState<Set<number>>(new Set());
  const [commitFailures, setCommitFailures] = useState<Array<{ direction: 'LOGIN' | 'LOGOUT'; error: string }>>([]);
  const [committedSuccess, setCommittedSuccess] = useState<{
    routesCreated: number;
    stopsCreated: number;
    routeIds?: string[];
  } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [dbOptimizing, setDbOptimizing] = useState(false);
  const [dbOptimizeResult, setDbOptimizeResult] = useState<ShiftOptimizationResponse | null>(null);
  const [rosterDirectionResults, setRosterDirectionResults] = useState<Array<RoutePlanningDirectionOutcome>>([]);
  const [planSettings, setPlanSettings] = useState<RosterPlanSettings | null>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceContainerRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const mapZoomListenerRef = useRef<any>(null);
  const officeCircleRefs = useRef<any[]>([]);
  const officeMarkerRefs = useRef<any[]>([]);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const useTopologyFallback = !googleMapsApiKey || mapLoadError;
  const isMultiOfficePlan = Boolean(
    planResult &&
      new Set(
        planResult.routes.map((route) => {
          const office = route.office ?? planResult.office;
          return `${office.name.trim().toLowerCase()}|${office.lat}|${office.lng}`;
        }),
      ).size > 1,
  );
  const dbDirectionResults =
    dbOptimizeResult && 'plans' in dbOptimizeResult ? dbOptimizeResult.plans : [];

  useEffect(() => {
    let cancelled = false;
    opsApi.getVehicleCategories()
      .then((categories) => {
        if (cancelled) return;
        setVehicleCategories(categories);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(`Could not load active vehicle categories: ${err instanceof Error ? err.message : String(err)}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await opsApi.getTenants({ limit: 100 });
        const items = res?.items ?? [];
        if (cancelled) return;
        setTenants(items);
        const requestedTenantId =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenantId')?.trim() : null;
        let rememberedTenantId = '';
        if (typeof window !== 'undefined') {
          try {
            rememberedTenantId = window.localStorage.getItem(COMPANY_STORAGE_KEY)?.trim() || '';
          } catch {}
        }
        const preferredTenantId = requestedTenantId || rememberedTenantId;
        let tenant: CorporateTenantOption | undefined;
        if (preferredTenantId) {
          tenant =
            items.find((item) => item.id === preferredTenantId) ??
            (await opsApi.getTenant(preferredTenantId).catch(() => undefined));
        }
        if (!tenant) {
          tenant = items[0];
        }
        if (tenant) {
          setUploadCompanyLoading(true);
          setSelectedTenantId(tenant.id);
          setSelectedUploadTenantId(tenant.id);
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(COMPANY_STORAGE_KEY, tenant.id);
              window.dispatchEvent(new Event('adhocx:ops-tenant-changed'));
            } catch {}
          }
          if (!tenant.offices?.length) {
            tenant = await opsApi.getTenant(tenant.id);
            if (cancelled) return;
          }
          const selectedTenant = tenant;
          setTenants((current) => [
            selectedTenant,
            ...current.filter((item) => item.id !== selectedTenant.id),
          ]);
          const office = selectedTenant.offices?.[0];
          setSelectedOfficeId(office?.id ?? '');
          if (office?.addressText || office?.name) setOfficeAddress(office.addressText || office.name);
          const policyDwell = tenant.policies?.[0]?.stopDwellMinutes;
          if (typeof policyDwell === 'number') {
            setStopDwellMinutes(Math.min(Math.max(policyDwell, 1), 10));
          }
          setUploadCompanyLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load tenants:', err);
          setErrorMsg(`Could not load companies or office details: ${err instanceof Error ? err.message : String(err)}`);
          setUploadCompanyLoading(false);
        }
      } finally {
        if (!cancelled) {
          setTenantsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelectCompany(nextTenantId: string) {
    setSelectedTenantId(nextTenantId);
    setSelectedUploadTenantId(nextTenantId);
    setSelectedOfficeId('');
    setOfficeAddress('');
    setErrorMsg(null);
    setManualCreatedRoute(null);

    if (typeof window !== 'undefined' && nextTenantId) {
      try {
        window.localStorage.setItem(COMPANY_STORAGE_KEY, nextTenantId);
        window.dispatchEvent(new Event('adhocx:ops-tenant-changed'));
        const url = new URL(window.location.href);
        url.searchParams.set('tenantId', nextTenantId);
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }

    if (!nextTenantId) return;

    const cached = tenants.find((item) => item.id === nextTenantId);
    if (cached?.offices?.length) {
      const office = cached.offices[0];
      setSelectedOfficeId(office.id);
      setOfficeAddress(office.addressText || office.name || '');
      const policyDwell = cached.policies?.[0]?.stopDwellMinutes;
      if (typeof policyDwell === 'number') {
        setStopDwellMinutes(Math.min(Math.max(policyDwell, 1), 10));
      }
      return;
    }

    setUploadCompanyLoading(true);
    try {
      const detailed = await opsApi.getTenant(nextTenantId);
      setTenants((current) => {
        const exists = current.some((item) => item.id === detailed.id);
        return exists
          ? current.map((item) => (item.id === detailed.id ? detailed : item))
          : [detailed, ...current];
      });
      const office = detailed.offices?.[0];
      setSelectedOfficeId(office?.id ?? '');
      setOfficeAddress(office?.addressText || office?.name || '');
      const policyDwell = detailed.policies?.[0]?.stopDwellMinutes;
      if (typeof policyDwell === 'number') {
        setStopDwellMinutes(Math.min(Math.max(policyDwell, 1), 10));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? `Could not load company offices: ${err.message}` : 'Could not load company offices.');
    } finally {
      setUploadCompanyLoading(false);
    }
  }

  async function handleCreateManualRoute(e: React.FormEvent) {
    e.preventDefault();
    const targetTenantId = selectedUploadTenantId || selectedTenantId;
    if (!targetTenantId || !selectedOfficeId) {
      setErrorMsg('Please select a corporate company and office hub first.');
      return;
    }
    const cleanedStops = manualStops
      .map((s) => ({
        name: s.name.trim(),
        phoneNumber: s.phoneNumber.trim(),
        email: s.email.trim() || undefined,
        address: s.address.trim(),
      }))
      .filter((s) => s.name || s.phoneNumber || s.address);

    if (cleanedStops.length === 0) {
      setErrorMsg('Add at least one employee stop with name, phone number, and address.');
      return;
    }
    for (let i = 0; i < cleanedStops.length; i++) {
      const s = cleanedStops[i];
      if (!s.name || !s.phoneNumber || !s.address) {
        setErrorMsg(`Stop #${i + 1}: Name, Phone Number, and Address are all required.`);
        return;
      }
      if (!isValidIndianMobile(s.phoneNumber)) {
        setErrorMsg(`Stop #${i + 1}: Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +919876543210).`);
        return;
      }
    }

    setManualSaving(true);
    setErrorMsg(null);
    setManualCreatedRoute(null);
    try {
      const created = await opsApi.createManualRoute({
        tenantId: targetTenantId,
        officeId: selectedOfficeId,
        shiftDate: manualShiftDate,
        shiftTime: manualShiftTime,
        direction: manualDirection,
        vehicleCategory: manualVehicleCategory || 'SEDAN',
        maxCapacity: Math.max(cleanedStops.length, Number(manualMaxCapacity) || 4),
        stops: cleanedStops,
      });
      setManualCreatedRoute(created);
      toast.success(
        `Created manual route with ${cleanedStops.length} employee stop${cleanedStops.length === 1 ? '' : 's'} (all employees auto-registered).`,
        'Manual Route Created',
      );
      setManualStops([{ id: `stop-${Date.now()}`, name: '', phoneNumber: '', email: '', address: '' }]);
    } catch (err: any) {
      setErrorMsg(stripApiErrorPrefix(err?.message || 'Could not create manual route.'));
    } finally {
      setManualSaving(false);
    }
  }

  const selectedUploadTenant = tenants.find((tenant) => tenant.id === selectedUploadTenantId);
  const hasConfiguredOffices = Boolean(selectedUploadTenant?.offices?.length);
  const isMissingOffices = tenantsLoaded && !uploadCompanyLoading && !hasConfiguredOffices;

  function notifyMissingOffices(
    tenantForContext?: CorporateTenantOption,
    context: 'import' | 'post' = 'import',
  ) {
    setRefreshOfficesNotice(null);
    setMissingOfficeModal({
      open: true,
      context,
      companyName: tenantForContext?.name,
      hasCompanies: tenants.length > 0,
    });
  }

  async function handleRefreshOffices() {
    setRefreshingOffices(true);
    setRefreshOfficesNotice(null);
    try {
      const res = await opsApi.getTenants({ limit: 100 });
      const items = res?.items ?? [];
      setTenants(items);
      const preferredId = selectedUploadTenantId || selectedTenantId;
      let tenant = (preferredId ? items.find((item) => item.id === preferredId) : undefined) ?? items[0];
      if (tenant && !tenant.offices?.length) {
        tenant = await opsApi.getTenant(tenant.id);
      }
      if (tenant) {
        setTenants((current) => [tenant!, ...current.filter((item) => item.id !== tenant!.id)]);
        setSelectedTenantId(tenant.id);
        setSelectedUploadTenantId(tenant.id);
        const office =
          tenant.offices?.find((item) => item.id === selectedOfficeId) ?? tenant.offices?.[0];
        if (office) {
          setSelectedOfficeId(office.id);
          if (office.addressText || office.name) setOfficeAddress(office.addressText || office.name);
          if (missingOfficeModal.open) {
            setMissingOfficeModal((prev) => ({ ...prev, open: false }));
            toast.success(
              `Loaded office hub "${office.name}" for ${tenant.name}. You can now post your routes.`,
              'Office Hub Ready',
              'ops-planner-offices-loaded',
            );
          } else if (officeMismatchModal.open) {
            setOfficeMismatchModal((prev) => ({
              ...prev,
              savedOfficeName: office.name,
              savedOfficeAddress: office.addressText || office.name,
            }));
            setRefreshOfficesNotice(
              `Updated office details loaded for "${office.name}". Click Edit Params and re-run Calculate Routes to apply the updated coordinates.`,
            );
          }
          return;
        }
        setRefreshOfficesNotice(
          `No office hubs found for ${tenant.name} yet. Please add and save an office in the Admin Dashboard, then click Refresh Offices again.`,
        );
      } else {
        setRefreshOfficesNotice(
          'No companies or office hubs found yet. Please add a company and office in the Admin Dashboard, then try again.',
        );
      }
    } catch (err) {
      setRefreshOfficesNotice(
        err instanceof Error ? `Could not refresh offices: ${err.message}` : 'Could not refresh offices. Please try again.',
      );
    } finally {
      setRefreshingOffices(false);
    }
  }
  const uncommittedSelectedRoutes = planResult?.routes.filter(
    (route) => selectedCabsForCommit.has(route.cab) && !committedRouteCabs.has(route.cab),
  ) ?? [];
  const canCommitUploadPlan = Boolean(
    selectedUploadTenant && selectedOfficeId && uncommittedSelectedRoutes.length > 0,
  );

  // Initialize or update Google Map when planResult changes
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!(window as any).google || !(window as any).google.maps) {
      loadGoogleMapsScript(() => initMap(planResult ?? undefined));
    } else {
      initMap(planResult ?? undefined);
    }
  }, [planResult, viewMode, useTopologyFallback]);

  function loadGoogleMapsScript(callback: () => void) {
    if (!googleMapsApiKey) {
      setMapLoadError(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).google?.maps) {
        callback();
      } else {
        existingScript.addEventListener('load', callback, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&callback=initOpsMap&loading=async&v=weekly`;
    (window as any).initOpsMap = callback;
    script.onerror = () => setMapLoadError(true);
    document.head.appendChild(script);
  }

  function retryGoogleMaps() {
    if (!googleMapsApiKey) return;
    const maps = (window as any).google?.maps;
    if (typeof maps?.Map !== 'function' && typeof maps?.importLibrary !== 'function') {
      document.getElementById('google-maps-script')?.remove();
    }
    setMapLoadError(false);
    setViewMode('MAP');
  }

  async function initMap(plan?: RoutePlanningResult) {
    const container = mapContainerRef.current;
    if (!container || !(window as any).google?.maps) return;
    const google = (window as any).google;
    let MapConstructor = google.maps.Map;
    try {
      if (typeof MapConstructor !== 'function' && typeof google.maps.importLibrary === 'function') {
        const mapsLibrary = await google.maps.importLibrary('maps');
        MapConstructor = mapsLibrary.Map;
      }
    } catch (error) {
      console.error('Failed to load Google Maps JavaScript API map library:', error);
      setMapLoadError(true);
      return;
    }

    if (typeof MapConstructor !== 'function') {
      console.error('Google Maps JavaScript API loaded without the Maps library.');
      setMapLoadError(true);
      return;
    }
    if (mapContainerRef.current !== container) return;

    const center = plan ? { lat: plan.office.lat, lng: plan.office.lng } : { lat: 17.4435, lng: 78.3772 };

    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

    if (googleMapRef.current && mapInstanceContainerRef.current !== container) {
      clearMapObjects();
      google.maps.event.clearInstanceListeners(googleMapRef.current);
      googleMapRef.current = null;
      mapInstanceContainerRef.current = null;
    }

    if (!googleMapRef.current) {
      googleMapRef.current = new MapConstructor(container, {
        center,
        zoom: plan ? 12 : 11,
        styles: isDark
          ? [
              { elementType: 'geometry', stylers: [{ color: '#171717' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#A3A3A3' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262626' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1F1F1F' }] },
            ]
          : [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
            ],
      });
      mapInstanceContainerRef.current = container;
    } else {
      googleMapRef.current.setCenter(center);
      if (plan) googleMapRef.current.setZoom(12);
    }
    setMapLoadError(false);

    if (plan) renderMapObjects(plan);
    requestAnimationFrame(() => {
      if (googleMapRef.current && mapInstanceContainerRef.current === mapContainerRef.current) {
        google.maps.event.trigger(googleMapRef.current, 'resize');
        if (plan) renderMapObjects(plan);
      }
    });
  }

  function clearMapObjects() {
    mapZoomListenerRef.current?.remove();
    mapZoomListenerRef.current = null;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    officeCircleRefs.current.forEach((circle) => circle.setMap(null));
    officeCircleRefs.current = [];
    officeMarkerRefs.current.forEach((marker) => marker.setMap(null));
    officeMarkerRefs.current = [];
  }

  function renderMapObjects(plan: RoutePlanningResult, filterCab?: number) {
    clearMapObjects();
    const google = (window as any).google;
    if (!google || !googleMapRef.current) return;

    const bounds = new google.maps.LatLngBounds();

    // Plot every CSV-provided office instead of implying a single shared hub.
    const offices = plan.offices?.length ? plan.offices : [plan.office];
    offices.forEach((office, index) => {
      officeMarkerRefs.current.push(new google.maps.Marker({
        map: googleMapRef.current,
        position: { lat: office.lat, lng: office.lng },
        label: { text: `H${index + 1}`, color: '#FFFFFF', fontWeight: 'bold' },
        title: office.name,
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#16A34A',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      }));
      officeCircleRefs.current.push(new google.maps.Circle({
        map: googleMapRef.current,
        center: { lat: office.lat, lng: office.lng },
        radius: plan.officeRadiusKm * 1000,
        strokeColor: '#5728B2',
        strokeWeight: 1,
        strokeOpacity: 0.35,
        fillColor: '#5728B2',
        fillOpacity: 0.025,
      }));
      bounds.extend({ lat: office.lat, lng: office.lng });
    });
    // Render routes
    const displayedRoutes = filterCab ? plan.routes.filter((r) => r.cab === filterCab) : plan.routes;

    displayedRoutes.forEach((route) => {
      const color = ROUTE_COLORS[(route.cab - 1) % ROUTE_COLORS.length];

      // Draw Path Polyline
      if (route.path && route.path.length > 0) {
        const polylineCoords = route.path.map(([lat, lng]) => ({ lat, lng }));
        const polyline = new google.maps.Polyline({
          map: googleMapRef.current,
          path: polylineCoords,
          strokeColor: color,
          strokeWeight: filterCab ? 4 : 2,
          strokeOpacity: filterCab ? 0.9 : 0.52,
          geodesic: true,
        });
        polylinesRef.current.push(polyline);
        polylineCoords.forEach((p) => bounds.extend(p));
      }

      // Draw Pickup Stop Pins
      route.stops.forEach((stop, stopIndex) => {
        const locationShortcut = getLocationShortcut(stop.matchedAddress || stop.address, stop.name);
        const marker = new google.maps.Marker({
          map: googleMapRef.current,
          position: { lat: stop.lat, lng: stop.lng },
          visible: stopIndex === 0 || googleMapRef.current.getZoom() >= PICKUP_DETAILS_ZOOM,
          title: `Route ${route.cab} - ${locationShortcut}: ${stop.name} (${stop.eta})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: filterCab ? 8 : 6,
            fillColor: stop.outOfRadius ? '#EF4444' : color,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: filterCab ? 2 : 1.5,
          },
        });
        marker.isRouteStart = stopIndex === 0;
        marker.locationShortcut = locationShortcut;
        marker.showLocationLabel = Boolean(filterCab);

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="color: #191B1C; padding: 4px; font-family: Inter, sans-serif; font-size: 13px;">
              <strong style="color: #5728B2; font-size: 14px;">${locationShortcut}: ${stop.name}</strong><br/>
              <span style="color: #595F61;">${stop.matchedAddress}</span><br/>
              ${stop.outOfRadius ? '<span style="color: #DC2626; font-weight: bold;">⚠️ Outside Catchment Radius</span><br/>' : ''}
              <strong>Pickup ETA:</strong> ${stop.eta} (Dwell until ${stop.dwellUntil})<br/>
              <strong>Distance to office:</strong> ${stop.officeDistanceKm} km
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open({ anchor: marker, map: googleMapRef.current });
        });

        markersRef.current.push(marker);
        bounds.extend({ lat: stop.lat, lng: stop.lng });
      });
    });

    const updatePickupVisibility = () => {
      const showAllPickups = googleMapRef.current.getZoom() >= PICKUP_DETAILS_ZOOM;
      markersRef.current.forEach((marker) => {
        marker.setVisible(marker.isRouteStart || showAllPickups);
        marker.setLabel(
          showAllPickups && marker.showLocationLabel
            ? { text: marker.locationShortcut, color: '#FFFFFF', fontWeight: 'bold', fontSize: '10px' }
            : null,
        );
      });
    };
    mapZoomListenerRef.current = google.maps.event.addListener(
      googleMapRef.current,
      'zoom_changed',
      updatePickupVisibility,
    );
    googleMapRef.current.fitBounds(bounds, 40);
    updatePickupVisibility();
  }

  function handleSelectCab(cabNumber: number) {
    if (selectedCab === cabNumber) {
      setSelectedCab(null);
      if (planResult) renderMapObjects(planResult);
    } else {
      setSelectedCab(cabNumber);
      if (planResult) renderMapObjects(planResult, cabNumber);
    }
  }

  function toggleAccordion(cabNumber: number) {
    setExpandedCabs((prev) => {
      const next = new Set(prev);
      if (next.has(cabNumber)) {
        next.delete(cabNumber);
      } else {
        next.add(cabNumber);
      }
      return next;
    });
  }

  function handleRosterFileSelected(file: File | null) {
    if (file && !isSupportedRosterFile(file)) {
      setSelectedFile(null);
      setErrorMsg('Upload a CSV, Excel workbook/template (.xls, .xlsx, .xlsm, .xlsb), or OpenDocument (.ods) file.');
      return;
    }
    if (file && isMissingOffices) {
      notifyMissingOffices(selectedUploadTenant);
    }
    setSelectedFile(file);
    setPlanResult(null);
    setCommittedSuccess(null);
    setCommittedRouteCabs(new Set());
    setCommitFailures([]);
    setErrorMsg(null);
  }

  async function handleCalculateRoutes(e: React.FormEvent) {
    e.preventDefault();
    if (vehicleCategories.length === 0) {
      setErrorMsg('Add an active vehicle category in Pricing before planning routes.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Please select a roster spreadsheet with employee, pickup, phone, office, and login time columns.');
      return;
    }
    if (!selectedUploadTenantId || !selectedUploadTenant) {
      notifyMissingOffices();
      setErrorMsg('Please select an onboarded company before importing the roster.');
      return;
    }
    if (!selectedUploadTenant.offices?.length) {
      notifyMissingOffices(selectedUploadTenant);
    }

    const loginIso = direction === 'LOGIN' || direction === 'BOTH' ? istLocalToIso(loginDeadline) : undefined;
    const logoutIso = direction === 'LOGOUT' || direction === 'BOTH' ? istLocalToIso(logoutDeadline) : undefined;
    if ((direction === 'LOGIN' || direction === 'BOTH') && !loginIso) {
      setErrorMsg('Enter a valid Login shift date and time.');
      return;
    }
    if ((direction === 'LOGOUT' || direction === 'BOTH') && !logoutIso) {
      setErrorMsg('Enter a valid Logout shift date and time.');
      return;
    }
    const dwell = Number(stopDwellMinutes);
    if (!Number.isInteger(dwell) || dwell < 1 || dwell > 10) {
      setErrorMsg('Wait per stop must be a whole number of minutes between 1 and 10.');
      return;
    }
    const settingsForPlan: RosterPlanSettings = {
      vehicleCategory: uploadVehicleCategory,
      stopDwellMinutes: dwell,
    };

    setCalculating(true);
    setProgressPct(0);
    setProgressMsg('Uploading roster to route optimizer...');
    setErrorMsg(null);
    setPlanResult(null);
    setPlanSettings(null);
    setRosterDirectionResults([]);
    setCommittedSuccess(null);
    setCommittedRouteCabs(new Set());
    setCommitFailures([]);

    try {
      const selectedOffice =
        selectedUploadTenant.offices?.find((item) => item.id === selectedOfficeId) ??
        selectedUploadTenant.offices?.[0];
      const normalizedOfficeText = officeAddress.trim();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tenantId', selectedUploadTenant.id);
      if (selectedOfficeId) formData.append('officeId', selectedOfficeId);
      if (normalizedOfficeText) formData.append('office', normalizedOfficeText);
      if (
        selectedOffice &&
        typeof selectedOffice.latitude === 'number' &&
        typeof selectedOffice.longitude === 'number' &&
        (!normalizedOfficeText ||
          normalizedOfficeText === (selectedOffice.addressText || selectedOffice.name || '').trim())
      ) {
        formData.append('officeLat', String(selectedOffice.latitude));
        formData.append('officeLng', String(selectedOffice.longitude));
      }
      if (loginIso) formData.append('loginTime', loginIso);
      if (logoutIso) formData.append('logoutTime', logoutIso);
      formData.append('direction', direction);
      formData.append('officeRadiusKm', String(officeRadiusKm));
      formData.append('maxTripKm', String(maxTripKm));
      formData.append('pickupWaitMinutes', String(dwell));
      formData.append('bufferMinutes', String(bufferMinutes));
      formData.append('vehicleCategory', uploadVehicleCategory);
      formData.append('routingPreference', routingPreference);
      formData.append('avoidTolls', String(avoidTolls));
      formData.append('avoidHighways', String(avoidHighways));

      const result = await opsApi.planRoutesStream(formData, (update) => {
        setProgressPct(update.percent || 0);
        setProgressMsg(update.message || 'Processing roster...');
      });
      const collectedPlans: Array<{ direction: 'LOGIN' | 'LOGOUT'; plan: RoutePlanningResult }> = [];
      const directionFailures: Array<{ direction: 'LOGIN' | 'LOGOUT'; error: string }> = [];
      if (isRoutePlanningBatchResult(result)) {
        for (const outcome of result.plans) {
          if (outcome.success && outcome.plan) {
            collectedPlans.push({ direction: outcome.direction, plan: outcome.plan });
          } else {
            directionFailures.push({
              direction: outcome.direction,
              error: outcome.error || 'Planning failed without an error message.',
            });
          }
        }
      } else {
        collectedPlans.push({ direction: direction as 'LOGIN' | 'LOGOUT', plan: result });
      }

      if (collectedPlans.length === 0) {
        throw new Error(
          directionFailures.map(({ direction: failedDirection, error }) => `${failedDirection}: ${error}`).join('; ') ||
            'No route plans were returned.',
        );
      }

      let nextCabNumber = 1;
      const mergedPlan: RoutePlanningResult = {
        ...collectedPlans[0].plan,
        employeeCount: collectedPlans.reduce((sum, entry) => sum + (entry.plan.employeeCount || 0), 0),
        cabCount: collectedPlans.reduce((sum, entry) => sum + (entry.plan.cabCount || 0), 0),
        vehicleCategoryCounts: collectedPlans.reduce<Record<string, number>>((counts, entry) => {
          for (const [category, count] of Object.entries(entry.plan.vehicleCategoryCounts ?? {})) {
            counts[category] = (counts[category] || 0) + count;
          }
          return counts;
        }, {}),
        outOfRadiusCount: collectedPlans.reduce((sum, entry) => sum + (entry.plan.outOfRadiusCount || 0), 0),
        excludedByDistanceCount: collectedPlans.reduce(
          (sum, entry) => sum + (entry.plan.excludedByDistanceCount || 0),
          0,
        ),
        excludedByDistance: collectedPlans.flatMap((entry) =>
          (entry.plan.excludedByDistance || []).map((exclusion) => ({ ...exclusion, direction: entry.direction })),
        ),
        autoExcludedEmployees: Array.from(
          new Set(collectedPlans.flatMap((entry) => entry.plan.autoExcludedEmployees || [])),
        ),
        // LOGIN and LOGOUT plans share offices; dedupe so each hub is drawn once.
        offices: Array.from(
          new Map(
            collectedPlans
              .flatMap((entry) => entry.plan.offices || [entry.plan.office])
              .map((office) => [`${office.name.trim().toLowerCase()}|${office.lat}|${office.lng}`, office] as const),
          ).values(),
        ),
        warnings: collectedPlans.flatMap(({ plan }) => plan.warnings ?? []),
        routes: collectedPlans.flatMap(({ direction: routeDirection, plan }) =>
          plan.routes.map((route) => ({ ...route, direction: routeDirection, cab: nextCabNumber++ })),
        ),
        totalKm: Number(collectedPlans.reduce((sum, entry) => sum + (entry.plan.totalKm || 0), 0).toFixed(2)),
        totalDriverPayout: Number(
          collectedPlans.reduce((sum, entry) => sum + (entry.plan.totalDriverPayout || 0), 0).toFixed(2),
        ),
        expectedCorporateRevenue: Number(
          collectedPlans.reduce((sum, entry) => sum + (entry.plan.expectedCorporateRevenue || 0), 0).toFixed(2),
        ),
        projectedMargin: Number(
          collectedPlans.reduce((sum, entry) => sum + (entry.plan.projectedMargin || 0), 0).toFixed(2),
        ),
      };
      const finalRoutes = [...mergedPlan.routes].sort((a, b) => {
        const tA = new Date(a.departureDateTime || 0).getTime();
        const tB = new Date(b.departureDateTime || 0).getTime();
        if (tA !== tB) return tA - tB;
        return a.cab - b.cab;
      });
      const sortedPlan: RoutePlanningResult = { ...mergedPlan, routes: finalRoutes };

      setPlanResult(sortedPlan);
      setPlanSettings(settingsForPlan);
      setRosterDirectionResults(
        isRoutePlanningBatchResult(result)
          ? result.plans
          : [{ direction: direction as 'LOGIN' | 'LOGOUT', success: true, plan: result }],
      );
      setSelectedCabsForCommit(new Set(finalRoutes.map((route) => route.cab)));
      setExpandedCabs(new Set(finalRoutes[0] ? [finalRoutes[0].cab] : []));
      if (!selectedUploadTenant || !selectedOfficeId) {
        notifyMissingOffices(selectedUploadTenant, 'post');
      } else {
        const matchedOffice = selectedUploadTenant.offices?.find((item) => item.id === selectedOfficeId);
        const plannedOffice = sortedPlan.routes[0]?.office ?? sortedPlan.office;
        const warnMismatch = (sortedPlan.warnings ?? [])
          .map((warning) => parseOfficeLocationMismatch(warning))
          .find((item) => Boolean(item));
        const computedDriftKm =
          matchedOffice &&
          typeof matchedOffice.latitude === 'number' &&
          typeof matchedOffice.longitude === 'number' &&
          plannedOffice &&
          typeof plannedOffice.lat === 'number' &&
          typeof plannedOffice.lng === 'number'
            ? haversineDistanceKm(matchedOffice.latitude, matchedOffice.longitude, plannedOffice.lat, plannedOffice.lng)
            : null;
        if (warnMismatch || (computedDriftKm !== null && computedDriftKm > 2)) {
          setRefreshOfficesNotice(null);
          setOfficeMismatchModal({
            open: true,
            distanceKm: warnMismatch?.distanceKm ?? (computedDriftKm !== null ? computedDriftKm.toFixed(1) : undefined),
            savedOfficeName: matchedOffice?.name || warnMismatch?.savedOfficeName,
            savedOfficeAddress: matchedOffice?.addressText || matchedOffice?.name,
            plannedOfficeName: plannedOffice?.name,
          });
        }
      }
      if (directionFailures.length > 0) {
        setErrorMsg(
          `Partial planning result: ${directionFailures
            .map(({ direction: failedDirection, error }) => `${failedDirection} failed: ${error}`)
            .join('; ')}`,
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to solve CVRPTW routes.');
    } finally {
      setCalculating(false);
    }
  }

  async function handleOptimizeDbShift(e: React.FormEvent) {
    e.preventDefault();
    if (vehicleCategories.length === 0) {
      setErrorMsg('Add an active vehicle category in Pricing before planning routes.');
      return;
    }
    if (!selectedTenantId || !selectedOfficeId) {
      notifyMissingOffices(tenants.find((item) => item.id === selectedTenantId));
      setErrorMsg('Please select a tenant and office hub');
      return;
    }

    const liveDwell = Number(stopDwellMinutes);
    if (!Number.isInteger(liveDwell) || liveDwell < 1 || liveDwell > 10) {
      setErrorMsg('Wait per stop must be a whole number of minutes between 1 and 10.');
      return;
    }
    if ((direction === 'LOGIN' || direction === 'BOTH') && !/^\d{2}:\d{2}$/.test(loginShiftTime)) {
      setErrorMsg('Enter a valid Login shift time.');
      return;
    }
    if ((direction === 'LOGOUT' || direction === 'BOTH') && !/^\d{2}:\d{2}$/.test(logoutShiftTime)) {
      setErrorMsg('Enter a valid Logout shift time.');
      return;
    }

    setDbOptimizing(true);
    setErrorMsg(null);
    setDbOptimizeResult(null);

    try {
      const result = await opsApi.optimizeShiftRoutes({
        tenantId: selectedTenantId,
        officeId: selectedOfficeId,
        shiftDate,
        ...(direction === 'LOGIN' || direction === 'BOTH' ? { loginTime: loginShiftTime } : {}),
        ...(direction === 'LOGOUT' || direction === 'BOTH' ? { logoutTime: logoutShiftTime } : {}),
        direction,
        vehicleCategory: dbVehicleCategory,
        stopDwellMinutes: liveDwell,
        routingPreference,
        avoidTolls,
        avoidHighways,
      });
      setDbOptimizeResult(result);
      if ('plans' in result) {
        const failures = result.plans.filter((plan) => !plan.success);
        if (failures.length > 0) {
          setErrorMsg(
            `Partial optimization result: ${failures
              .map((plan) => `${plan.direction} (${plan.shiftTime}) failed: ${plan.error}`)
              .join('; ')}`,
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to auto-optimize database shift.');
    } finally {
      setDbOptimizing(false);
    }
  }

  async function handleCommitToDatabase() {
    if (!planResult || !planSettings || isMultiOfficePlan) return;
    if (!selectedUploadTenant || !selectedOfficeId) {
      notifyMissingOffices(selectedUploadTenant, 'post');
      setErrorMsg('Select a real company with an office hub before committing routes.');
      return;
    }

    const routesToCommit = uncommittedSelectedRoutes;
    if (routesToCommit.length === 0) {
      setErrorMsg('Select at least one uncommitted optimized route to add to the Routes page.');
      return;
    }

    const directionByRoute = routesToCommit.map((route) => ({
      route,
      direction: route.direction ?? (direction === 'LOGIN' || direction === 'LOGOUT' ? direction : undefined),
    }));
    if (directionByRoute.some(({ direction: routeDirection }) => !routeDirection)) {
      setErrorMsg('A route is missing its LOGIN/LOGOUT direction; calculate the plan again before committing.');
      return;
    }

    setCommitting(true);
    setErrorMsg(null);
    setCommitFailures([]);

    try {
      const failures: Array<{ direction: 'LOGIN' | 'LOGOUT'; error: string }> = [];
      const successes: Array<{
        direction: 'LOGIN' | 'LOGOUT';
        result: { routesCreated: number; stopsCreated: number; routeIds?: string[] };
      }> = [];
      const selectedDirections = Array.from(
        new Set(directionByRoute.map(({ direction: routeDirection }) => routeDirection as 'LOGIN' | 'LOGOUT')),
      );

      for (const routeDirection of selectedDirections) {
        const directionRoutes = directionByRoute
          .filter(({ direction: itemDirection }) => itemDirection === routeDirection)
          .map(({ route }) => route);
        if (directionRoutes.length === 0) continue;

        try {
          const directionPlan: RoutePlanningResult = {
            ...planResult,
            routes: directionRoutes,
            cabCount: directionRoutes.length,
            employeeCount: directionRoutes.reduce((sum, route) => sum + route.stops.length, 0),
          };
          const firstRouteArrival = directionRoutes[0]?.requiredArrivalDateTime;
          const arrivalParts = firstRouteArrival
            ? Object.fromEntries(
                new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hourCycle: 'h23',
                })
                  .formatToParts(new Date(firstRouteArrival))
                  .map(({ type, value }) => [type, value]),
              )
            : null;
          const result = await opsApi.commitRoutePlan({
            tenantId: selectedUploadTenant.id,
            officeId: selectedOfficeId,
            plan: directionPlan,
            shiftDate: arrivalParts
              ? `${arrivalParts.year}-${arrivalParts.month}-${arrivalParts.day}`
              : shiftDate,
            shiftTime: arrivalParts
              ? `${arrivalParts.hour}:${arrivalParts.minute}`
              : routeDirection === 'LOGIN'
                ? loginShiftTime
                : logoutShiftTime,
            direction: routeDirection,
            // Commit with the settings the plan was calculated with, not later form edits.
            vehicleCategory: planSettings.vehicleCategory,
            stopDwellMinutes: planSettings.stopDwellMinutes,
            ...({ includeMetadata: true } as any),
          });
          successes.push({ direction: routeDirection, result });
        } catch (error) {
          failures.push({
            direction: routeDirection,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (successes.length > 0) {
        const successfulDirections = new Set(successes.map(({ direction: d }) => d));
        const nextCommittedRouteCabs = new Set([
          ...committedRouteCabs,
          ...directionByRoute
            .filter(({ direction: routeDirection }) => successfulDirections.has(routeDirection as 'LOGIN' | 'LOGOUT'))
            .map(({ route }) => route.cab),
        ]);
        setCommittedRouteCabs(nextCommittedRouteCabs);
        setCommittedSuccess((current) => ({
          routesCreated: (current?.routesCreated ?? 0) + successes.reduce((sum, item) => sum + item.result.routesCreated, 0),
          stopsCreated: (current?.stopsCreated ?? 0) + successes.reduce((sum, item) => sum + item.result.stopsCreated, 0),
          routeIds: [...(current?.routeIds ?? []), ...successes.flatMap((item) => item.result.routeIds ?? [])],
        }));
      }
      setCommitFailures(failures);
      if (failures.length > 0) {
        const mismatchEntry = failures
          .map((entry) => ({ entry, parsed: parseOfficeLocationMismatch(entry.error) }))
          .find((item) => Boolean(item.parsed));

        if (mismatchEntry?.parsed) {
          const matchedOffice = selectedUploadTenant.offices?.find((item) => item.id === selectedOfficeId);
          const plannedOffice = planResult.routes[0]?.office ?? planResult.office;
          setRefreshOfficesNotice(null);
          setOfficeMismatchModal({
            open: true,
            distanceKm: mismatchEntry.parsed.distanceKm,
            savedOfficeName: mismatchEntry.parsed.savedOfficeName || matchedOffice?.name,
            savedOfficeAddress: matchedOffice?.addressText || matchedOffice?.name,
            plannedOfficeName: plannedOffice?.name,
          });
        }

        const allFailuresAreOfficeMismatch = failures.every((entry) =>
          Boolean(parseOfficeLocationMismatch(entry.error)),
        );
        if (successes.length > 0) {
          setErrorMsg(
            `Some shifts could not be posted: ${failures
              .map(({ direction: failedDirection, error }) => `${failedDirection} — ${stripApiErrorPrefix(error)}`)
              .join('; ')}. Already posted shifts remain saved.`,
          );
        } else if (!allFailuresAreOfficeMismatch) {
          setErrorMsg(
            failures
              .map(({ direction: failedDirection, error }) =>
                failures.length > 1
                  ? `${failedDirection}: ${stripApiErrorPrefix(error)}`
                  : stripApiErrorPrefix(error),
              )
              .join(' '),
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(stripApiErrorPrefix(err.message || 'Could not post routes. Please try again.'));
    } finally {
      setCommitting(false);
    }
  }

  function handleExportExcel() {
    if (!planResult) return;
    const rows = [
      ['Cab Number', 'Office Destination', 'Required Arrival DateTime', 'Stop Letter', 'Employee Name', 'Matched Address', 'Pickup ETA', 'Dwell Until', 'Distance to Office (km)', 'Out of Radius'],
    ];

    planResult.routes.forEach((r) => {
      r.stops.forEach((s, idx) => {
        rows.push([
          String(r.cab),
          r.office?.name || planResult.office.name,
          r.requiredArrivalDateTime || r.requiredArrival || '',
          String.fromCharCode(65 + idx),
          s.name,
          s.matchedAddress,
          s.eta,
          s.dwellUntil,
          String(s.officeDistanceKm),
          s.outOfRadius ? 'YES' : 'NO',
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cvrptw-optimized-routes-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDownloadSample(format: 'csv') {
    setDownloadingTemplate(format);
    setErrorMsg(null);
    try {
      const blob = await opsApi.downloadSampleTemplate(format);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `sample-employee-pickups.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to download the sample CSV.');
    } finally {
      setDownloadingTemplate(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)', width: '100%', minWidth: 0 }}>
      {/* Header & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%', minWidth: 0 }}>
        <div style={{ flex: '1 1 560px', minWidth: 0 }}>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: 'clamp(22px, 2.4vw, 32px)' }}>
            <Cpu size={24} style={{ color: 'var(--brand-blue-500, #5728B2)', flexShrink: 0 }} />
            CVRPTW Route Optimization Engine & Fleet Planner
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Calculates pickup ETAs from each employee&apos;s login time, destination, and route
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flex: '0 1 auto', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', maxWidth: '100%', minWidth: 0 }}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => handleDownloadSample('csv')}
            disabled={downloadingTemplate !== null}
            style={{ whiteSpace: 'normal', textAlign: 'left' }}
          >
            {downloadingTemplate === 'csv' ? 'Downloading CSV...' : 'Download CSV Template'}
          </Button>
        </div>
      </div>

      {planResult?.warnings?.map((warning) => (
        <div
          key={warning}
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-warning-bg, #FFF7ED)',
            border: '1px solid var(--color-warning-border, #FDBA74)',
            color: 'var(--color-warning, #9A3412)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{warning}</span>
        </div>
      ))}

      {/* KPI HUD Strip (Appears when plan is calculated) */}
      {planResult && !useTopologyFallback && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Cabs Planned</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-blue-500, #5728B2)', marginTop: '2px' }}>{planResult.cabCount} Vehicles</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Employees</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{planResult.employeeCount} Riders</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Fleet Total Distance</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {(planResult.totalKm ?? planResult.routes.reduce((acc, r) => acc + (r.distanceKm || 0), 0)).toFixed(1)} km
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Driver Payout</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              ₹{(planResult.totalDriverPayout ?? planResult.routes.reduce((acc, r) => acc + (r.driverPayout || 0), 0)).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Corporate Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1167EE', marginTop: '2px' }}>
              ₹{(planResult.expectedCorporateRevenue ?? planResult.routes.reduce((acc, r) => acc + (r.corporateRevenue || 0), 0)).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Projected Margin</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success, #16A34A)', marginTop: '2px' }}>
              ₹{(planResult.projectedMargin ?? ((planResult.expectedCorporateRevenue || 0) - (planResult.totalDriverPayout || 0))).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Catchment Alerts</div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: planResult.outOfRadiusCount > 0 ? 'var(--color-danger, #DC2626)' : 'var(--color-success, #16A34A)',
                marginTop: '2px',
              }}
            >
              {planResult.outOfRadiusCount > 0 ? `${planResult.outOfRadiusCount} Outside >${planResult.officeRadiusKm}km` : 'All Within Radius'}
            </div>
          </div>
          {Boolean(planResult.excludedByDistanceCount && planResult.excludedByDistanceCount > 0) && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Distance Excluded</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-danger, #DC2626)', marginTop: '2px' }}>
                {planResult.excludedByDistanceCount} Outside catchment / max trip
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Committed Success Banner */}
      {committedSuccess && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} />
            <span>
              <strong>{commitFailures.length > 0 ? 'Partial commit:' : 'Added to Routes:'}</strong> Created {committedSuccess.routesCreated} active dispatch routes ({committedSuccess.stopsCreated} stops) for {selectedUploadTenant?.name}. {commitFailures.length > 0 ? 'Retry the failed direction after resolving the error.' : 'Cron auto-dispatch will search 10km within the 30m window prior to approach.'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {committedSuccess.routeIds?.[0] && (
              <Link href={`/routes/${committedSuccess.routeIds[0]}`} style={{ textDecoration: 'none' }}>
                <Button size="sm" variant="secondary" rightIcon={<ExternalLink size={12} />}>
                  Inspect Route #1
                </Button>
              </Link>
            )}
            <Link
              href={selectedUploadTenant ? `/routes?tenantId=${encodeURIComponent(selectedUploadTenant.id)}` : '/routes'}
              style={{ textDecoration: 'none' }}
            >
              <Button size="sm" variant="success" rightIcon={<ExternalLink size={12} />}>
                Open Routes Page
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)',
          gap: '16px',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 'max(520px, calc(100vh - 240px))',
        }}
      >
        {/* LEFT PANEL */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            height: 'max(520px, calc(100vh - 240px))',
            overflow: 'hidden',
            minHeight: 0,
            transition: 'background-color 0.2s, border-color 0.2s',
          }}
        >
          {!planResult ? (
            /* PARAMETER CONFIGURATION & DUAL INGEST TABS */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Segmented Mode Selector */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-muted)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('FILE_UPLOAD')}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: activeTab === 'FILE_UPLOAD' ? 'var(--brand-primary-subtle)' : 'transparent',
                    color: activeTab === 'FILE_UPLOAD' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: activeTab === 'FILE_UPLOAD' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Roster Ingest</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('DB_SHIFT')}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: activeTab === 'DB_SHIFT' ? 'var(--brand-primary-subtle)' : 'transparent',
                    color: activeTab === 'DB_SHIFT' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: activeTab === 'DB_SHIFT' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Database size={14} />
                  <span>Live Shift</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('MANUAL')}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: activeTab === 'MANUAL' ? 'var(--brand-primary-subtle)' : 'transparent',
                    color: activeTab === 'MANUAL' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: activeTab === 'MANUAL' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <RouteIcon size={14} />
                  <span>Manual Route</span>
                </button>
              </div>

              {activeTab === 'FILE_UPLOAD' ? (
                /* FILE UPLOADER & HEURISTIC SOLVER */
                <form onSubmit={handleCalculateRoutes} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Corporate Client (Company) *
                      </label>
                      <select
                        value={selectedUploadTenantId}
                        onChange={(e) => void handleSelectCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
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

                    {selectedUploadTenant && (
                      <div
                        onClick={() => {
                          if (isMissingOffices) notifyMissingOffices(selectedUploadTenant);
                        }}
                      >
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Company Office Hub *
                        </label>
                        <select
                          value={selectedOfficeId}
                          disabled={uploadCompanyLoading || !selectedUploadTenant.offices?.length}
                          onChange={(e) => {
                            setSelectedOfficeId(e.target.value);
                            const office = selectedUploadTenant.offices?.find((item) => item.id === e.target.value);
                            if (office?.addressText || office?.name) setOfficeAddress(office.addressText || office.name);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                            pointerEvents: !selectedUploadTenant.offices?.length ? 'none' : undefined,
                          }}
                        >
                          {!selectedUploadTenant.offices?.length && <option value="">No office hubs configured</option>}
                          {selectedUploadTenant.offices?.map((office) => (
                            <option key={office.id} value={office.id}>{office.name} ({office.code})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Office Location Address & Default Shift Deadline */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Office Location Address *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Building 9, Mindspace IT Park, Madhapur, Hyderabad"
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Shift Direction
                        </label>
                        <select
                          value={direction}
                          onChange={(e) => setDirection(e.target.value as 'LOGIN' | 'LOGOUT' | 'BOTH')}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        >
                          <option value="LOGIN">LOGIN (Home → Office)</option>
                          <option value="LOGOUT">LOGOUT (Office → Home)</option>
                          <option value="BOTH">BOTH (Login + Logout)</option>
                        </select>
                      </div>
                      {(direction === 'LOGIN' || direction === 'BOTH') && (
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Login Shift Time (IST)
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={loginDeadline}
                            onChange={(e) => setLoginDeadline(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}
                      {(direction === 'LOGOUT' || direction === 'BOTH') && (
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Logout Shift Time (IST)
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={logoutDeadline}
                            onChange={(e) => setLogoutDeadline(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 3-Column Grid for Radius, Max Trip, and Capacity */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Catchment Radius (max 50 km)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={officeRadiusKm}
                          onChange={(e) => setOfficeRadiusKm(Math.min(50, Math.max(1, Number(e.target.value) || 50)))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Max Trip Distance (max 50 km)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={maxTripKm}
                          onChange={(e) => setMaxTripKm(Math.min(50, Math.max(1, Number(e.target.value) || 50)))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Automatic Cab Assignment
                        </label>
                        <select
                          value={uploadVehicleCategory}
                          onChange={(e) => setUploadVehicleCategory(e.target.value)}
                          disabled={vehicleCategories.length === 0}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        >
                          <option value="ALL">Auto-assign across all active categories</option>
                          {vehicleCategories.map((category) => (
                            <option key={category.vehicleType} value={category.vehicleType}>
                              {category.categoryLabel} ({category.maxSeats} seats)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dwell and Buffer */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Wait Time / Stop (max 10m)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={stopDwellMinutes}
                          onChange={(e) => setStopDwellMinutes(Math.min(10, Math.max(1, Number(e.target.value) || 10)))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Safety Buffer (min)
                        </label>
                        <input
                          type="number"
                          min={0}
                            max={30}
                          value={bufferMinutes}
                            onChange={(e) => setBufferMinutes(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* File Drag and Drop */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Upload Employee Route Spreadsheet *
                      </label>
                      <label
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleRosterFileSelected(event.dataTransfer.files[0] || null);
                        }}
                        style={{
                          border: `2px dashed ${selectedFile ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-strong)'}`,
                          borderRadius: '8px',
                          padding: '18px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          backgroundColor: selectedFile ? 'var(--brand-primary-subtle)' : 'var(--bg-surface-muted)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <UploadCloud size={24} style={{ color: selectedFile ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)', marginBottom: '6px' }} />
                        <span style={{ fontSize: '12px', color: selectedFile ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                          {selectedFile ? selectedFile.name : 'Click or Drag & Drop CSV or Excel Workbook'}
                        </span>
                        <input
                          type="file"
                          accept=".csv,.xls,.xlsx,.xlsm,.xlsb,.xlt,.xltx,.xltm,.xml,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.ms-excel.sheet.binary.macroEnabled.12,application/vnd.oasis.opendocument.spreadsheet"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleRosterFileSelected(file);
                            if (file && !isSupportedRosterFile(file)) e.currentTarget.value = '';
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        CSV, Excel workbooks/templates, and ODS supported. Row-level times are used on the selected shift date; the selected direction time fills missing row times.
                      </p>
                    </div>

                    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Routing strategy (choose one)
                      </legend>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        {([
                          ['TRAFFIC_UNAWARE', 'Traffic-unaware'],
                          ['TRAFFIC_AWARE', 'Traffic-aware'],
                          ['TRAFFIC_AWARE_OPTIMAL', 'Traffic-aware optimal'],
                        ] as const).map(([value, label]) => (
                          <label
                            key={value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: `1px solid ${routingPreference === value ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`,
                              borderRadius: '6px',
                              padding: '8px',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="roster-routing-strategy"
                              value={value}
                              checked={routingPreference === value}
                              onChange={() => setRoutingPreference(value)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Traffic-unaware is not a guarantee of the shortest route.
                      </div>
                    </fieldset>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                      <input
                        type="checkbox"
                        checked={avoidTolls}
                        onChange={(e) => setAvoidTolls(e.target.checked)}
                      />
                      Avoid toll roads
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={avoidHighways}
                        onChange={(e) => setAvoidHighways(e.target.checked)}
                      />
                      Avoid highways
                    </label>
                  </div>

                  {/* Progress indicator during calculation */}
                  {calculating && (
                    <div style={{ padding: '12px 20px', backgroundColor: 'var(--bg-surface-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>{progressMsg}</span>
                        <span style={{ fontWeight: 600, color: 'var(--brand-blue-500, #5728B2)' }}>{progressPct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: 'var(--brand-blue-500, #5728B2)', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      style={{ width: '100%' }}
                      disabled={calculating || !selectedFile || vehicleCategories.length === 0}
                      leftIcon={calculating ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
                    >
                      {calculating ? 'Solving CVRPTW Routes...' : 'Calculate Routes'}
                    </Button>
                  </div>
                </form>
              ) : activeTab === 'DB_SHIFT' ? (
                /* DATABASE SHIFT AUTO-OPTIMIZER FORM */
                <form onSubmit={handleOptimizeDbShift} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
                    {/* Tenant Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Corporate Client (Tenant) *
                      </label>
                      <select
                        value={selectedTenantId}
                        onChange={(e) => void handleSelectCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
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

                    {/* Office Site Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Office / Hub Location *
                      </label>
                      <select
                        value={selectedOfficeId}
                        onChange={(e) => setSelectedOfficeId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        {tenants
                          .find((t) => t.id === selectedTenantId)
                          ?.offices?.map((off) => (
                            <option key={off.id} value={off.id}>
                              {off.name} ({off.code})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Shift date */}
                    <div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Shift Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={shiftDate}
                          onChange={(e) => setShiftDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Direction-specific shift times */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {(direction === 'LOGIN' || direction === 'BOTH') && (
                        <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Login Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={loginShiftTime}
                          onChange={(e) => setLoginShiftTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        </div>
                      )}
                      {(direction === 'LOGOUT' || direction === 'BOTH') && (
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Logout Time *
                          </label>
                          <input
                            type="time"
                            required
                            value={logoutShiftTime}
                            onChange={(e) => setLogoutShiftTime(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Direction & Vehicle Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Trip Direction
                        </label>
                        <select
                          value={direction}
                          onChange={(e) => setDirection(e.target.value as 'LOGIN' | 'LOGOUT' | 'BOTH')}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        >
                          <option value="LOGIN">LOGIN (Pickup to Office)</option>
                          <option value="LOGOUT">LOGOUT (Office to Drop)</option>
                          <option value="BOTH">BOTH (Login + Logout)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Vehicle Category
                        </label>
                        <select
                          value={dbVehicleCategory}
                          onChange={(e) => setDbVehicleCategory(e.target.value)}
                          disabled={vehicleCategories.length === 0}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        >
                          <option value="ALL">Auto-assign across all active categories</option>
                          {vehicleCategories.map((category) => (
                            <option key={category.vehicleType} value={category.vehicleType}>
                              {category.categoryLabel} ({category.maxSeats} seats)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Routing strategy (choose one)
                      </legend>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        {([
                          ['TRAFFIC_UNAWARE', 'Traffic-unaware'],
                          ['TRAFFIC_AWARE', 'Traffic-aware'],
                          ['TRAFFIC_AWARE_OPTIMAL', 'Traffic-aware optimal'],
                        ] as const).map(([value, label]) => (
                          <label
                            key={`live-${value}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: `1px solid ${routingPreference === value ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`,
                              borderRadius: '6px',
                              padding: '8px',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="live-routing-strategy"
                              value={value}
                              checked={routingPreference === value}
                              onChange={() => setRoutingPreference(value)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Traffic-unaware is not a guarantee of the shortest route.
                      </div>
                    </fieldset>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} />
                      Avoid toll roads
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={avoidHighways} onChange={(e) => setAvoidHighways(e.target.checked)} />
                      Avoid highways
                    </label>

                    {/* DB Shift Optimization Summary if run */}
                    {dbOptimizeResult && (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-success-bg)',
                          border: '1px solid var(--color-success-border)',
                          fontSize: '12px',
                          color: 'var(--color-success)',
                        }}
                      >
                        <strong>{dbDirectionResults.some((plan) => !plan.success) ? 'Partial Optimization:' : 'Optimization Result:'}</strong>
                        <div style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                          • Created {dbOptimizeResult.routesCreated ?? 0} active routes<br />
                          • Categories: {Object.entries(dbOptimizeResult.vehicleCategoryCounts ?? {})
                            .map(([category, count]) => `${category} ${count}`)
                            .join(' / ') || 'none'}<br />
                          • Assigned {dbOptimizeResult.passengersAssigned ?? 0} employee bookings<br />
                          • Unassigned {dbOptimizeResult.unassignedRequests ?? 0} requests<br />
                          {!('plans' in dbOptimizeResult) &&
                            dbOptimizeResult.warnings?.map((warning) => (
                              <span key={warning} style={{ color: 'var(--color-warning)' }}>• {warning}<br /></span>
                            ))}
                          {dbDirectionResults.map((plan) => (
                            <span key={plan.direction} style={{ color: plan.success ? 'var(--text-secondary)' : 'var(--color-danger)' }}>
                              • {plan.direction} ({plan.shiftTime}): {plan.success
                                ? `${plan.summary?.routesCreated ?? 0} routes, ${plan.summary?.passengersAssigned ?? 0} assigned, ${plan.summary?.unassignedRequests ?? 0} unassigned`
                                : `failed: ${plan.error}`}<br />
                              {plan.summary?.warnings?.map((warning) => (
                                <span key={warning} style={{ color: 'var(--color-warning)' }}>  • {warning}<br /></span>
                              ))}
                            </span>
                          ))}
                          • Visible immediately on the Live Dispatch Board
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      style={{ width: '100%' }}
                      disabled={dbOptimizing || vehicleCategories.length === 0}
                      leftIcon={dbOptimizing ? <RefreshCw className="spin" size={16} /> : <Cpu size={16} />}
                    >
                      {dbOptimizing ? 'Optimizing Fleet...' : 'Auto-Optimize Shift Routes'}
                    </Button>
                  </div>
                </form>
              ) : (
                /* MANUAL ROUTE BUILDER FORM */
                <form onSubmit={handleCreateManualRoute} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Corporate Client (Company) *
                      </label>
                      <select
                        value={selectedUploadTenantId}
                        onChange={(e) => void handleSelectCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
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

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Company Office Hub *
                      </label>
                      <select
                        value={selectedOfficeId}
                        disabled={uploadCompanyLoading || !selectedUploadTenant?.offices?.length}
                        onChange={(e) => setSelectedOfficeId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      >
                        {!selectedUploadTenant?.offices?.length && <option value="">No office hubs configured</option>}
                        {selectedUploadTenant?.offices?.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} ({off.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Shift Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={manualShiftDate}
                          onChange={(e) => setManualShiftDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Shift Time (IST) *
                        </label>
                        <input
                          type="time"
                          required
                          value={manualShiftTime}
                          onChange={(e) => setManualShiftTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Direction *
                        </label>
                        <select
                          value={manualDirection}
                          onChange={(e) => setManualDirection(e.target.value as 'LOGIN' | 'LOGOUT')}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          <option value="LOGIN">LOGIN</option>
                          <option value="LOGOUT">LOGOUT</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Vehicle *
                        </label>
                        <select
                          value={manualVehicleCategory}
                          onChange={(e) => setManualVehicleCategory(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        >
                          {vehicleCategories.length > 0 ? (
                            vehicleCategories.map((cat) => (
                              <option key={cat.vehicleType} value={cat.vehicleType}>
                                {cat.categoryLabel}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="SEDAN">Sedan</option>
                              <option value="SUV">SUV</option>
                              <option value="HATCHBACK">Hatchback</option>
                              <option value="TEMPO_TRAVELLER">Tempo Traveller</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Seats
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={manualMaxCapacity}
                          onChange={(e) => setManualMaxCapacity(Math.max(1, Number(e.target.value) || 4))}
                          style={{
                            width: '100%',
                            padding: '8px 8px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Dynamic Employee Stops */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Employee Stops ({manualStops.length})
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          leftIcon={<Plus size={13} />}
                          onClick={() =>
                            setManualStops((prev) => [
                              ...prev,
                              { id: `stop-${Date.now()}-${prev.length}`, name: '', phoneNumber: '', email: '', address: '' },
                            ])
                          }
                        >
                          Add Stop
                        </Button>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                        Every employee added here is automatically registered in the company directory with a commuter login account.
                      </p>

                      {manualStops.map((stop, idx) => (
                        <div
                          key={stop.id}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-surface-muted)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-blue-500, #5728B2)' }}>
                              Stop #{idx + 1}
                            </span>
                            {manualStops.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setManualStops((prev) => prev.filter((item) => item.id !== stop.id))}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-danger, #DC2626)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input
                              type="text"
                              required
                              placeholder="Employee Name *"
                              value={stop.name}
                              onChange={(e) =>
                                setManualStops((prev) =>
                                  prev.map((item) => (item.id === stop.id ? { ...item, name: e.target.value } : item)),
                                )
                              }
                              style={{
                                width: '100%',
                                padding: '7px 9px',
                                backgroundColor: 'var(--bg-input)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                              }}
                            />
                            <input
                              type="tel"
                              required
                              placeholder="Phone (+91...) *"
                              value={stop.phoneNumber}
                              onChange={(e) =>
                                setManualStops((prev) =>
                                  prev.map((item) => (item.id === stop.id ? { ...item, phoneNumber: e.target.value } : item)),
                                )
                              }
                              style={{
                                width: '100%',
                                padding: '7px 9px',
                                backgroundColor: 'var(--bg-input)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                              }}
                            />
                          </div>
                          <input
                            type="email"
                            placeholder="Email (optional)"
                            value={stop.email}
                            onChange={(e) =>
                              setManualStops((prev) =>
                                prev.map((item) => (item.id === stop.id ? { ...item, email: e.target.value } : item)),
                              )
                            }
                            style={{
                              width: '100%',
                              padding: '7px 9px',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                          <input
                            type="text"
                            required
                            placeholder="Pickup / Drop Address *"
                            value={stop.address}
                            onChange={(e) =>
                              setManualStops((prev) =>
                                prev.map((item) => (item.id === stop.id ? { ...item, address: e.target.value } : item)),
                              )
                            }
                            style={{
                              width: '100%',
                              padding: '7px 9px',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {manualCreatedRoute && (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-success-bg)',
                          border: '1px solid var(--color-success-border)',
                          fontSize: '12px',
                          color: 'var(--color-success)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <strong>Manual route created!</strong> RT-{manualCreatedRoute.id.slice(0, 8).toUpperCase()} ({manualCreatedRoute.assignedPassengerCount} passengers auto-registered).
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Link href={`/routes/${manualCreatedRoute.id}`} style={{ textDecoration: 'none' }}>
                            <Button type="button" size="sm" variant="primary" rightIcon={<ExternalLink size={12} />}>
                              Inspect Route
                            </Button>
                          </Link>
                          <Link
                            href={selectedUploadTenantId ? `/routes?tenantId=${encodeURIComponent(selectedUploadTenantId)}` : '/routes'}
                            style={{ textDecoration: 'none' }}
                          >
                            <Button type="button" size="sm" variant="outline">
                              Open Routes Page
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      style={{ width: '100%' }}
                      isLoading={manualSaving}
                      disabled={!selectedUploadTenantId || !selectedOfficeId}
                      leftIcon={<Plus size={16} />}
                    >
                      {manualSaving ? 'Creating Route...' : 'Create Manual Route'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* CALCULATED ROUTES ACCORDION LIST */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Planned Cab Itineraries ({planResult.cabCount} Routes)
                  </h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click a cab card to isolate on map</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPlanResult(null);
                  }}
                >
                  Edit Params
                </Button>
              </div>

              {/* Scrollable list of routes */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rosterDirectionResults.length > 0 && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface-muted)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <strong>Direction plan outcomes</strong>
                      {rosterDirectionResults.map((outcome) => (
                        <div key={outcome.direction} style={{ marginTop: '6px' }}>
                          <strong>{outcome.direction}:</strong>{' '}
                          {outcome.success && outcome.plan
                            ? `${outcome.plan.employeeCount} employees, ${outcome.plan.cabCount} routes (${Object.entries(outcome.plan.vehicleCategoryCounts ?? {}).map(([category, count]) => `${category} ${count}`).join(' / ') || 'category breakdown unavailable'})`
                            : `Failed — ${outcome.error || 'No plan returned.'}`}
                        </div>
                      ))}
                    </div>
                  )}
                  {planResult.excludedByDistance && planResult.excludedByDistance.length > 0 && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-danger-bg)',
                        border: '1px solid var(--color-danger-border)',
                        color: 'var(--color-danger)',
                        fontSize: '12px',
                      }}
                    >
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} />
                        {planResult.excludedByDistance.length} Employee(s) Excluded by Catchment / Max Trip
                      </strong>
                      <div style={{ marginTop: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                        {planResult.excludedByDistance.map((exc, idx) => (
                          <div key={`${exc.direction ?? ''}-${exc.name}-${idx}`} style={{ fontSize: '11px', marginTop: '2px', color: 'var(--text-secondary)' }}>
                            • {exc.direction ? `[${exc.direction}] ` : ''}<strong>{exc.name}</strong> ({exc.officeDistanceKm.toFixed(2)} km) — {
                              exc.reason === 'OUTSIDE_CATCHMENT'
                                ? 'outside catchment'
                                : exc.reason === 'EXCEEDS_MAX_TRIP'
                                  ? 'exceeds max trip'
                                  : 'outside catchment and exceeds max trip'
                            } - {exc.matchedAddress || exc.address}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {planResult.routes.map((route) => {
                    const isSelected = selectedCab === route.cab;
                    const isExpanded = expandedCabs.has(route.cab);
                    const color = ROUTE_COLORS[(route.cab - 1) % ROUTE_COLORS.length];
                    const outOfRadiusStops = route.stops.filter((s) => s.outOfRadius);

                    return (
                      <div
                        key={route.cab}
                        style={{
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${color}` : '1px solid var(--border-subtle)',
                          backgroundColor: isSelected ? 'var(--brand-primary-subtle)' : 'var(--bg-surface)',
                          overflow: 'hidden',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Cab Card Header */}
                        <div
                          onClick={() => handleSelectCab(route.cab)}
                          style={{
                            padding: '12px 14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={selectedCabsForCommit.has(route.cab)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setSelectedCabsForCommit((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(route.cab);
                                  else next.delete(route.cab);
                                  return next;
                                });
                              }}
                              aria-label={`Select Route ${route.cab}`}
                              style={{ width: 15, height: 15, cursor: 'pointer' }}
                            />
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: color,
                                flexShrink: 0,
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  Route {route.cab} · {route.stops.length} Pickups
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(17, 103, 238, 0.15)',
                                    color: '#1167EE',
                                    border: '1px solid #1167EE',
                                  }}
                                >
                                  {(route.cabType || 'Unspecified').toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {route.departure} → {route.arrival} · {route.distanceKm} km · {route.driveMinutes} min
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Office: {route.office?.name || planResult.office.name} · Required arrival: {route.requiredArrival || '—'}
                              </div>
                              {(route.driverPayout !== undefined || route.projectedMargin !== undefined) && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Payout: <strong style={{ color: 'var(--text-primary)' }}>₹{route.driverPayout ?? 0}</strong> · Margin:{' '}
                                  <strong style={{ color: 'var(--color-success, #16A34A)' }}>₹{route.projectedMargin ?? 0}</strong>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {outOfRadiusStops.length > 0 && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--color-danger-bg)',
                                  color: 'var(--color-danger)',
                                  border: '1px solid var(--color-danger-border)',
                                }}
                              >
                                {outOfRadiusStops.length} Far
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAccordion(route.cab);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Door-to-Door Itinerary */}
                        {isExpanded && (
                          <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                            <div style={{ margin: '8px 0 6px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '6px' }}>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                Sequence: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{route.sequence}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                <span>Cab: <strong style={{ textTransform: 'uppercase' }}>{route.cabType || 'Unspecified'}</strong></span>
                                <span>Revenue: <strong style={{ color: '#1167EE' }}>₹{route.corporateRevenue ?? 0}</strong></span>
                                <span>Payout: <strong>₹{route.driverPayout ?? 0}</strong></span>
                                <span>Margin: <strong style={{ color: 'var(--color-success, #16A34A)' }}>₹{route.projectedMargin ?? 0}</strong></span>
                              </div>
                            </div>

                            <ol style={{ margin: '8px 0', paddingLeft: '18px', color: 'var(--text-primary)' }}>
                              {route.stops.map((stop, sIdx) => (
                                <li key={sIdx} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                                  <div style={{ fontWeight: 600, color: stop.outOfRadius ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                                    {String.fromCharCode(65 + sIdx)}. {stop.name}
                                    {stop.outOfRadius && ' (OUTSIDE 50KM CATCHMENT)'}
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{stop.matchedAddress}</div>
                                  <div style={{ color: 'var(--brand-blue-500, #5728B2)', fontSize: '11px', marginTop: '2px' }}>
                                    Pickup: <strong>{stop.eta}</strong> (Dwell until {stop.dwellUntil}) → To next:{' '}
                                    {stop.travelToNextMinutes}m ({stop.distanceToNextKm} km)
                                  </div>
                                </li>
                              ))}
                            </ol>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-success)', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
                              <span>Status: {route.status}</span>
                              <span>Buffer: {route.bufferStatus}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Commit and Export */}
              {isMultiOfficePlan && (
                <div style={{ padding: '0 18px 10px', fontSize: '12px', color: 'var(--color-warning, #B45309)' }}>
                  This plan has multiple office destinations and cannot be committed as a single-office dispatch. Export it or plan each destination separately.
                </div>
              )}
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px' }}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    cursor:
                      !committing && !uploadCompanyLoading && !isMultiOfficePlan && (!selectedUploadTenant || !selectedOfficeId)
                        ? 'pointer'
                        : undefined,
                  }}
                  onClick={() => {
                    if (
                      !committing &&
                      !uploadCompanyLoading &&
                      !isMultiOfficePlan &&
                      (!selectedUploadTenant || !selectedOfficeId)
                    ) {
                      notifyMissingOffices(selectedUploadTenant, 'post');
                    }
                  }}
                >
                  <Button
                    variant="primary"
                    style={{
                      width: '100%',
                      pointerEvents:
                        !committing &&
                        !uploadCompanyLoading &&
                        !isMultiOfficePlan &&
                        (!selectedUploadTenant || !selectedOfficeId)
                          ? 'none'
                          : undefined,
                    }}
                    disabled={committing || !canCommitUploadPlan || uploadCompanyLoading || isMultiOfficePlan}
                    onClick={handleCommitToDatabase}
                    leftIcon={committing ? <RefreshCw className="spin" size={14} /> : <CheckCircle size={14} />}
                  >
                    {committing
                      ? 'Adding Routes...'
                      : canCommitUploadPlan
                        ? `Add ${selectedCabsForCommit.size === planResult.routes.length ? 'All' : selectedCabsForCommit.size} Route${selectedCabsForCommit.size === 1 ? '' : 's'} to Routes Page`
                        : 'Select Company & Office to Add Routes'}
                  </Button>
                </div>
                <Button variant="secondary" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={14} />}>
                  Export Excel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: DUAL-MODE VISUAL COCKPIT (GOOGLE MAPS VECTOR + SVG TOPOLOGY) */}
        <div
          style={{
            height: '100%',
            minHeight: '520px',
            backgroundColor: 'var(--bg-surface-muted)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
            position: 'relative',
            transition: 'background-color 0.2s, border-color 0.2s',
          }}
        >
          {/* View Switcher Controls (Top Right) */}
          {planResult && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '14px',
                zIndex: 20,
                display: 'flex',
                gap: '4px',
                backgroundColor: 'var(--bg-surface)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMapLoadError(false);
                  setViewMode('MAP');
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: viewMode === 'MAP' ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
                  color: viewMode === 'MAP' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                <MapIcon size={13} />
                <span>Vector Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TOPOLOGY')}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: viewMode === 'TOPOLOGY' ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
                  color: viewMode === 'TOPOLOGY' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                <Radar size={13} />
                <span>Radar Topology</span>
              </button>
            </div>
          )}

          {planResult && viewMode === 'MAP' && !useTopologyFallback && (
            <div
              style={{
                position: 'absolute',
                left: '14px',
                bottom: '14px',
                zIndex: 10,
                padding: '7px 10px',
                borderRadius: '7px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
                <div>Select a cab to highlight its route and show location names</div>
              </div>
            )}

          {/* Canvas Render: Either Google Maps or SVG Topology */}
          {planResult && (viewMode === 'TOPOLOGY' || useTopologyFallback) ? (
            <SpatialTopologyCanvas
              plan={planResult}
              selectedCab={selectedCab}
              onSelectCab={handleSelectCab}
              routeColors={ROUTE_COLORS}
            />
          ) : (
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          )}

          {/* Empty State Banner if no plan yet */}
          {!planResult && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                textAlign: 'left',
                backgroundColor: 'var(--bg-surface)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                maxWidth: '320px',
              }}
            >
              <Compass size={18} style={{ color: 'var(--brand-blue-500, #5728B2)', marginBottom: '4px' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {mapLoadError || !googleMapsApiKey ? 'Google Maps unavailable' : 'Route map preview'}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                {mapLoadError || !googleMapsApiKey
                  ? 'Check that a valid Google Maps browser key is configured and allowed for this local origin.'
                  : 'Upload a roster or optimize a shift to view routes, pickup pins, and the office catchment.'}
              </p>
              {(mapLoadError || !googleMapsApiKey) && googleMapsApiKey && (
                <button
                  type="button"
                  onClick={retryGoogleMaps}
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'var(--brand-blue-500, #5728B2)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Retry Google Maps
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prominent Popup when Company Offices are Missing */}
      <OfficeHubRequiredModal
        isOpen={missingOfficeModal.open}
        onClose={() => setMissingOfficeModal((prev) => ({ ...prev, open: false }))}
        context={missingOfficeModal.context}
        companyName={missingOfficeModal.companyName}
        hasCompanies={missingOfficeModal.hasCompanies}
        refreshing={refreshingOffices}
        refreshNotice={refreshOfficesNotice}
        onRefreshOffices={handleRefreshOffices}
      />

      {/* Prominent Popup when Planned Destination Differs from Saved Office Coordinates */}
      <OfficeLocationMismatchModal
        isOpen={officeMismatchModal.open}
        onClose={() => setOfficeMismatchModal((prev) => ({ ...prev, open: false }))}
        distanceKm={officeMismatchModal.distanceKm}
        savedOfficeName={officeMismatchModal.savedOfficeName}
        savedOfficeAddress={officeMismatchModal.savedOfficeAddress}
        plannedOfficeName={officeMismatchModal.plannedOfficeName}
        refreshing={refreshingOffices}
        refreshNotice={refreshOfficesNotice}
        onRefreshOffices={handleRefreshOffices}
        onEditParams={() => {
          setOfficeMismatchModal((prev) => ({ ...prev, open: false }));
          setPlanResult(null);
          setCommittedSuccess(null);
          setErrorMsg(null);
        }}
      />
    </div>
  );
}
