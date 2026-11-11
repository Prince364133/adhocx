'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateTenantOption, RoutePlanningResult } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
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
  Search,
} from 'lucide-react';

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

function tomorrowMorningIst(): string {
  const d = new Date(Date.now() + 24 * 3600_000 + 330 * 60_000);
  return `${d.toISOString().slice(0, 10)}T08:00`;
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
  const [activeTab, setActiveTab] = useState<'FILE_UPLOAD' | 'DB_SHIFT'>('FILE_UPLOAD');

  // File Upload Form State
  const [officeAddress, setOfficeAddress] = useState('');
  const [deadline, setDeadline] = useState(tomorrowMorningIst);
  const [officeRadiusKm, setOfficeRadiusKm] = useState(50);
  const [maxTripKm, setMaxTripKm] = useState(50);
  const [excludedEmployees, setExcludedEmployees] = useState('');
  const [autoExcludedEmployees, setAutoExcludedEmployees] = useState<string[]>([]);
  const [stopDwellMinutes, setStopDwellMinutes] = useState(10);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const cabCapacity = 6;
  const [routingPreference, setRoutingPreference] = useState<RoutingPreference>('TRAFFIC_AWARE');
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [avoidHighways] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // DB Shift State
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedUploadTenantId, setSelectedUploadTenantId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [uploadCompanyLoading, setUploadCompanyLoading] = useState(false);
  const [shiftDate, setShiftDate] = useState<string>(new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10));
  const [shiftTime, setShiftTime] = useState<string>('08:00');
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [dbVehicleCategory, setDbVehicleCategory] = useState<'SEDAN' | 'SUV'>('SEDAN');

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
  const [committedSuccess, setCommittedSuccess] = useState<{
    routesCreated: number;
    stopsCreated: number;
    routeIds?: string[];
  } | null>(null);
  const [committing, setCommitting] = useState(false);
  const [dbOptimizing, setDbOptimizing] = useState(false);
  const [dbOptimizeResult, setDbOptimizeResult] = useState<any>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await opsApi.getTenants({ search: companySearch.trim() || undefined, limit: 100 });
        const items = res?.items ?? [];
        if (cancelled) return;
        setTenants(items);
        if (items.length > 0 && !selectedUploadTenantId) {
          const requestedTenantId =
            typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenantId') : null;
          let tenant = (requestedTenantId && items.find((item) => item.id === requestedTenantId)) || items[0];
          setUploadCompanyLoading(true);
          setSelectedTenantId(tenant.id);
          setSelectedUploadTenantId(tenant.id);
          if (!tenant.offices?.length) {
            tenant = await opsApi.getTenant(tenant.id);
            if (cancelled) return;
            setTenants((current) => current.map((item) => item.id === tenant.id ? tenant : item));
          }
          const office = tenant.offices?.[0];
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companySearch]);

  const selectedUploadTenant = tenants.find((tenant) => tenant.id === selectedUploadTenantId);
  const canCommitUploadPlan = Boolean(selectedUploadTenant && selectedOfficeId && selectedCabsForCommit.size > 0);

  async function handleUploadCompanyChange(tenantId: string) {
    setSelectedUploadTenantId(tenantId);
    setSelectedTenantId(tenantId);
    setSelectedOfficeId('');
    setErrorMsg(null);

    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) {
      setSelectedTenantId('');
      setOfficeAddress('');
      return;
    }

    setUploadCompanyLoading(true);
    try {
      const details = tenant.offices?.length ? tenant : await opsApi.getTenant(tenantId);
      setTenants((current) => current.map((item) => item.id === tenantId ? details : item));
      const office = details.offices?.[0];
      setSelectedOfficeId(office?.id ?? '');
      if (office?.addressText || office?.name) setOfficeAddress(office.addressText || office.name);
      const policyDwell = details.policies?.[0]?.stopDwellMinutes;
      if (typeof policyDwell === 'number') {
        setStopDwellMinutes(Math.min(Math.max(policyDwell, 1), 10));
      }
      if (!office) setErrorMsg(`${details.name} has no office hub configured. Add an office before committing routes.`);
    } catch (error) {
      setErrorMsg(`Could not load offices for ${tenant.name}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadCompanyLoading(false);
    }
  }

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
    if (autoExcludedEmployees.length > 0) {
      const previousAutoExcluded = new Set(autoExcludedEmployees.map((name) => name.trim().toLowerCase()));
      setExcludedEmployees((current) =>
        current
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name && !previousAutoExcluded.has(name.toLowerCase()))
          .join(', '),
      );
    }
    setAutoExcludedEmployees([]);
    setSelectedFile(file);
    setPlanResult(null);
    setErrorMsg(null);
  }

  async function handleCalculateRoutes(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a roster spreadsheet with employee, pickup, phone, office, and login time columns.');
      return;
    }
    if (!selectedUploadTenantId || !selectedUploadTenant) {
      setErrorMsg('Please select an onboarded company before importing the roster.');
      return;
    }

    setCalculating(true);
    setProgressPct(0);
    setProgressMsg('Uploading roster to route optimizer...');
    setErrorMsg(null);
    setPlanResult(null);
    setCommittedSuccess(null);

    try {
      const selectedOffice =
        selectedUploadTenant.offices?.find((item) => item.id === selectedOfficeId) ??
        selectedUploadTenant.offices?.[0];
      const normalizedOfficeText = officeAddress.trim();
      const clampedDwell = Math.min(Math.max(Number(stopDwellMinutes) || 10, 1), 10);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tenantId', selectedUploadTenant.id);
      if (selectedOfficeId) {
        formData.append('officeId', selectedOfficeId);
      }
      if (normalizedOfficeText) {
        formData.append('office', normalizedOfficeText);
      }
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
      if (deadline) {
        formData.append('loginTime', new Date(`${deadline}:00+05:30`).toISOString());
      }
      formData.append('direction', direction);
      formData.append('officeRadiusKm', String(officeRadiusKm));
      formData.append('maxTripKm', String(maxTripKm));
      if (excludedEmployees.trim()) {
        formData.append('excludedEmployees', excludedEmployees.trim());
      }
      formData.append('pickupWaitMinutes', String(clampedDwell));
      formData.append('bufferMinutes', String(bufferMinutes));
      formData.append('cabCapacity', String(cabCapacity));
      formData.append('routingPreference', routingPreference);
      formData.append('avoidTolls', String(avoidTolls));
      formData.append('avoidHighways', String(avoidHighways));

      const result = await opsApi.planRoutesStream(formData, (update: any) => {
        setProgressPct(update.percent || update.pct || 0);
        setProgressMsg(update.message || 'Processing...');
        const duplicateNames = update.data?.duplicateEmployeeNames;
        if (Array.isArray(duplicateNames) && duplicateNames.length > 0) {
          setAutoExcludedEmployees((current) => Array.from(new Set([...current, ...duplicateNames])));
          setExcludedEmployees((current) => {
            const existing = current
              .split(',')
              .map((name) => name.trim())
              .filter(Boolean);
            const existingNames = new Set(existing.map((name) => name.toLowerCase()));
            return [...existing, ...duplicateNames.filter((name: string) => !existingNames.has(name.toLowerCase()))].join(', ');
          });
        }
      });

      if (!result.routes || result.routes.length === 0) {
        throw new Error('Heuristic solver returned 0 routes. Ensure address rows have valid coordinates.');
      }

      const sortedRoutes = [...result.routes].sort((a, b) => {
        const tA = new Date(a.departureDateTime || 0).getTime();
        const tB = new Date(b.departureDateTime || 0).getTime();
        if (tA !== tB) return tA - tB;
        return a.cab - b.cab;
      });
      const sortedPlan: RoutePlanningResult = { ...result, routes: sortedRoutes };

      setPlanResult(sortedPlan);
      setSelectedCabsForCommit(new Set(sortedRoutes.map((route) => route.cab)));
      setExpandedCabs(new Set(sortedRoutes[0] ? [sortedRoutes[0].cab] : []));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to solve CVRPTW routes.');
    } finally {
      setCalculating(false);
    }
  }

  async function handleOptimizeDbShift(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenantId || !selectedOfficeId) {
      setErrorMsg('Please select a tenant and office hub');
      return;
    }

    setDbOptimizing(true);
    setErrorMsg(null);
    setDbOptimizeResult(null);

    try {
      const res = await opsApi.optimizeShiftRoutes({
        tenantId: selectedTenantId,
        officeId: selectedOfficeId,
        shiftDate,
        shiftTime,
        direction,
        vehicleCategory: dbVehicleCategory,
      });
      setDbOptimizeResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to auto-optimize database shift.');
    } finally {
      setDbOptimizing(false);
    }
  }

  async function handleCommitToDatabase() {
    if (!planResult || isMultiOfficePlan) return;
    if (!selectedUploadTenant || !selectedOfficeId) {
      setErrorMsg('Select a real company with an office hub before committing routes.');
      return;
    }

    const routesToCommit = planResult.routes.filter((r) => selectedCabsForCommit.has(r.cab));
    if (routesToCommit.length === 0) {
      setErrorMsg('Select at least one optimized route to add to the Routes page.');
      return;
    }

    const planSubset: any = {
      ...planResult,
      routes: routesToCommit,
      cabCount: routesToCommit.length,
    };

    setCommitting(true);
    setErrorMsg(null);

    try {
      const firstRouteArrival = routesToCommit[0]?.requiredArrivalDateTime;
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
      const res = await opsApi.commitRoutePlan({
        tenantId: selectedUploadTenant.id,
        officeId: selectedOfficeId,
        plan: planSubset,
        shiftDate: arrivalParts
          ? `${arrivalParts.year}-${arrivalParts.month}-${arrivalParts.day}`
          : shiftDate,
        shiftTime: arrivalParts ? `${arrivalParts.hour}:${arrivalParts.minute}` : shiftTime,
        direction,
        stopDwellMinutes: Math.min(Math.max(Number(stopDwellMinutes) || 10, 1), 10),
        ...({ includeMetadata: true } as any),
      });
      setCommittedSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit routes to live operational database.');
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
                {planResult.excludedByDistanceCount} Beyond {planResult.maxTripKm || 50}km
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
              <strong>Added to Routes:</strong> Created {committedSuccess.routesCreated} active dispatch routes ({committedSuccess.stopsCreated} stops) for {selectedUploadTenant?.name}. Cron auto-dispatch will search 10km within the 30m window prior to approach.
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
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: activeTab === 'FILE_UPLOAD' ? 'var(--brand-primary-subtle)' : 'transparent',
                    color: activeTab === 'FILE_UPLOAD' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: activeTab === 'FILE_UPLOAD' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Roster File Ingest</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('DB_SHIFT')}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: activeTab === 'DB_SHIFT' ? 'var(--brand-primary-subtle)' : 'transparent',
                    color: activeTab === 'DB_SHIFT' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                    border: 'none',
                    borderBottom: activeTab === 'DB_SHIFT' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Database size={15} />
                  <span>Live Shift Optimize</span>
                </button>
              </div>

              {activeTab === 'FILE_UPLOAD' ? (
                /* FILE UPLOADER & HEURISTIC SOLVER */
                <form onSubmit={handleCalculateRoutes} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
                    {/* Company Search & Selection */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Client Company *
                        </label>
                        <Link href="/companies" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-primary, #4F46E5)', textDecoration: 'none' }}>
                          + Onboard Company
                        </Link>
                      </div>
                      <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <Search
                          size={14}
                          style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            pointerEvents: 'none',
                          }}
                        />
                        <input
                          type="text"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          placeholder="Search onboarded companies by name or code..."
                          style={{
                            width: '100%',
                            padding: '7px 12px 7px 32px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <select
                        required
                        value={selectedUploadTenantId}
                        disabled={uploadCompanyLoading}
                        onChange={(e) => void handleUploadCompanyChange(e.target.value)}
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
                        {tenants.length === 0 && <option value="">No matching onboarded companies</option>}
                        {tenants.map((company) => (
                          <option key={company.id} value={company.id}>{company.name} ({company.code})</option>
                        ))}
                      </select>
                      <span style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
                        Uses real Google Maps geocoding, CVRPTW solver &amp; traffic-aware route generation.
                      </span>
                    </div>

                    {selectedUploadTenant && (
                      <div>
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
                          onChange={(e) => setDirection(e.target.value as 'LOGIN' | 'LOGOUT')}
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
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Fallback Shift Time (IST)
                        </label>
                        <input
                          type="datetime-local"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
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
                    </div>

                    {/* Excluded Employees */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Exclude Employees (optional comma-separated names)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe, Sarah Smith"
                        value={excludedEmployees}
                        onChange={(e) => setExcludedEmployees(e.target.value)}
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
                      {autoExcludedEmployees.length > 0 && (
                        <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-warning, #B45309)' }}>
                          Duplicate names were excluded automatically: {autoExcludedEmployees.join(', ')}
                        </p>
                      )}
                    </div>

                    {/* 3-Column Grid for Radius, Max Trip, and Capacity */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Catchment (km)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={officeRadiusKm}
                          onChange={(e) => setOfficeRadiusKm(Number(e.target.value))}
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
                          Max Trip (km)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={maxTripKm}
                          onChange={(e) => setMaxTripKm(Number(e.target.value))}
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
                        <div
                          style={{
                            width: '100%',
                            minHeight: '36px',
                            padding: '8px 10px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                          }}
                        >
                          Sedan: 1–3 riders · SUV: 4–6 riders
                        </div>
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
                          max={180}
                          value={bufferMinutes}
                          onChange={(e) => setBufferMinutes(Number(e.target.value))}
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
                        CSV, Excel workbooks/templates, and ODS supported. Provide each employee&apos;s login time; pickup ETAs are calculated automatically. Without a date, the next future occurrence of that time in IST is used.
                      </p>
                    </div>

                    {/* Routing preference */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Routing Quality
                      </label>
                      <select
                        value={routingPreference}
                        onChange={(e) => setRoutingPreference(e.target.value as RoutingPreference)}
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
                        <option value="TRAFFIC_UNAWARE">Shortest-distance preference</option>
                        <option value="TRAFFIC_AWARE">Traffic-aware</option>
                        <option value="TRAFFIC_AWARE_OPTIMAL">Traffic-aware optimal</option>
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                      <input
                        type="checkbox"
                        checked={avoidTolls}
                        onChange={(e) => setAvoidTolls(e.target.checked)}
                      />
                      Avoid toll roads (Google best-effort)
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
                      disabled={calculating || !selectedFile}
                      leftIcon={calculating ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
                    >
                      {calculating ? 'Solving CVRPTW Routes...' : 'Calculate Routes'}
                    </Button>
                  </div>
                </form>
              ) : (
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
                        onChange={(e) => {
                          setSelectedTenantId(e.target.value);
                          const t = tenants.find((item) => item.id === e.target.value);
                          if (t && t.offices && t.offices.length > 0) {
                            setSelectedOfficeId(t.offices[0].id);
                          }
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

                    {/* Shift Date & Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Shift Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={shiftTime}
                          onChange={(e) => setShiftTime(e.target.value)}
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

                    {/* Direction & Vehicle Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Trip Direction
                        </label>
                        <select
                          value={direction}
                          onChange={(e: any) => setDirection(e.target.value)}
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
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Vehicle Category
                        </label>
                        <select
                          value={dbVehicleCategory}
                          onChange={(e) => setDbVehicleCategory(e.target.value as 'SEDAN' | 'SUV')}
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
                          <option value="SEDAN">Sedan (up to 3 riders)</option>
                          <option value="SUV">SUV (up to 6 riders)</option>
                        </select>
                      </div>
                    </div>

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
                        <strong>Optimization Success:</strong>
                        <div style={{ marginTop: '4px', color: 'var(--text-primary)' }}>
                          • Created {dbOptimizeResult.routesCreated ?? (Array.isArray(dbOptimizeResult) ? dbOptimizeResult.length : 0)} active routes<br />
                          • Assigned {dbOptimizeResult.passengersAssigned ?? 0} employee bookings<br />
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
                      disabled={dbOptimizing}
                      leftIcon={dbOptimizing ? <RefreshCw className="spin" size={16} /> : <Cpu size={16} />}
                    >
                      {dbOptimizing ? 'Optimizing Fleet...' : 'Auto-Optimize Shift Routes'}
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
                        {planResult.excludedByDistance.length} Employee(s) Beyond {planResult.maxTripKm || 50} km Maximum Trip Limit
                      </strong>
                      <div style={{ marginTop: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                        {planResult.excludedByDistance.map((exc, idx) => (
                          <div key={idx} style={{ fontSize: '11px', marginTop: '2px', color: 'var(--text-secondary)' }}>
                            • <strong>{exc.name}</strong> ({exc.officeDistanceKm} km) - {exc.matchedAddress || exc.address}
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
                                    backgroundColor: route.cabType === 'suv' ? 'rgba(238, 152, 17, 0.15)' : 'rgba(17, 103, 238, 0.15)',
                                    color: route.cabType === 'suv' ? '#EE9811' : '#1167EE',
                                    border: `1px solid ${route.cabType === 'suv' ? '#EE9811' : '#1167EE'}`,
                                  }}
                                >
                                  {(route.cabType || 'sedan').toUpperCase()}
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
                                <span>Cab: <strong style={{ textTransform: 'uppercase' }}>{route.cabType || 'Sedan'}</strong></span>
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
                <Button
                  variant="primary"
                  style={{ width: '100%' }}
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
    </div>
  );
}
