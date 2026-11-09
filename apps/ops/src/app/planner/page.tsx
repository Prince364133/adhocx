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
  const [officeAddress, setOfficeAddress] = useState('Mindspace IT Park, Hitec City, Hyderabad');
  const [deadline, setDeadline] = useState(tomorrowMorningIst());
  const [officeRadiusKm, setOfficeRadiusKm] = useState(50);
  const [maxTripKm, setMaxTripKm] = useState(50);
  const [excludedEmployees, setExcludedEmployees] = useState('');
  const [stopDwellMinutes, setStopDwellMinutes] = useState(5);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [cabCapacity, setCabCapacity] = useState(4);
  const [routingPreference, setRoutingPreference] = useState<RoutingPreference>('TRAFFIC_UNAWARE');
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [avoidHighways] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // DB Shift State
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>(new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10));
  const [shiftTime, setShiftTime] = useState<string>('08:00');
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');

  // Solver & UI State
  const [viewMode, setViewMode] = useState<'MAP' | 'TOPOLOGY'>('MAP');
  const [mapLoadError, setMapLoadError] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState<'xlsx' | 'csv' | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<RoutePlanningResult | null>(null);
  const [selectedCab, setSelectedCab] = useState<number | null>(null);
  const [expandedCabs, setExpandedCabs] = useState<Set<number>>(new Set());
  const [committedSuccess, setCommittedSuccess] = useState<{ routesCreated: number; stopsCreated: number } | null>(null);
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
  const officeCircleRef = useRef<any>(null);
  const officeMarkerRef = useRef<any>(null);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const useTopologyFallback = !googleMapsApiKey || mapLoadError;

  useEffect(() => {
    (async () => {
      try {
        const res = await opsApi.getTenants({ limit: 100 });
        const items = res?.items ?? [];
        setTenants(items);
        if (items.length > 0) {
          const tenant = items[0];
          setSelectedTenantId(tenant.id);
          if (tenant.offices && tenant.offices.length > 0) {
            setSelectedOfficeId(tenant.offices[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load tenants:', err);
      }
    })();
  }, []);

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
    if (officeCircleRef.current) officeCircleRef.current.setMap(null);
    if (officeMarkerRef.current) officeMarkerRef.current.setMap(null);
  }

  function renderMapObjects(plan: RoutePlanningResult, filterCab?: number) {
    clearMapObjects();
    const google = (window as any).google;
    if (!google || !googleMapRef.current) return;

    const bounds = new google.maps.LatLngBounds();

    // 1. Office HQ Marker & Catchment Circle
    officeMarkerRef.current = new google.maps.Marker({
      map: googleMapRef.current,
      position: { lat: plan.office.lat, lng: plan.office.lng },
      label: { text: 'HQ', color: '#FFFFFF', fontWeight: 'bold' },
      title: plan.office.name,
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 7,
        fillColor: '#16A34A',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
    });
    bounds.extend({ lat: plan.office.lat, lng: plan.office.lng });

    officeCircleRef.current = new google.maps.Circle({
      map: googleMapRef.current,
      center: { lat: plan.office.lat, lng: plan.office.lng },
      radius: plan.officeRadiusKm * 1000,
      strokeColor: '#5728B2',
      strokeWeight: 1,
      strokeOpacity: 0.35,
      fillColor: '#5728B2',
      fillOpacity: 0.025,
    });

    // 2. Render Routes
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
              <strong>Distance to HQ:</strong> ${stop.officeDistanceKm} km
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

  async function handleCalculateRoutes(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select an Excel (.xlsx) or CSV file with employee pickups');
      return;
    }

    setCalculating(true);
    setProgressPct(0);
    setProgressMsg('Uploading roster...');
    setErrorMsg(null);
    setPlanResult(null);
    setCommittedSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('office', officeAddress);
    formData.append('loginTime', deadline);
    formData.append('officeRadiusKm', String(officeRadiusKm));
    formData.append('maxTripKm', String(maxTripKm));
    if (excludedEmployees.trim()) {
      formData.append('excludedEmployees', excludedEmployees.trim());
    }
    formData.append('stopDwellMinutes', String(stopDwellMinutes));
    formData.append('bufferMinutes', String(bufferMinutes));
    formData.append('cabCapacity', String(cabCapacity));
    formData.append('routingPreference', routingPreference);
    formData.append('avoidTolls', String(avoidTolls));
    formData.append('avoidHighways', String(avoidHighways));

    try {
      const result = await opsApi.planRoutesStream(formData, (update: any) => {
        setProgressPct(update.percent || update.pct || 0);
        setProgressMsg(update.message || 'Processing...');
      });

      if (!result.routes || result.routes.length === 0) {
        throw new Error('Heuristic solver returned 0 routes. Ensure address rows have valid coordinates.');
      }

      setPlanResult(result);
      // Auto expand first cab
      setExpandedCabs(new Set([1]));
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
        vehicleCategory: cabCapacity === 4 ? 'SEDAN' : 'SUV',
      });
      setDbOptimizeResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to auto-optimize database shift.');
    } finally {
      setDbOptimizing(false);
    }
  }

  async function handleCommitToDatabase() {
    if (!planResult) return;
    setCommitting(true);
    setErrorMsg(null);

    try {
      const res = await opsApi.commitRoutePlan({
        tenantId: selectedTenantId || '',
        officeId: selectedOfficeId || '',
        plan: planResult,
        shiftDate: deadline.slice(0, 10),
        shiftTime: deadline.slice(11, 16),
        direction: 'LOGIN',
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
      ['Cab Number', 'Stop Letter', 'Employee Name', 'Matched Address', 'Pickup ETA', 'Dwell Until', 'Distance to HQ (km)', 'Out of Radius'],
    ];

    planResult.routes.forEach((r) => {
      r.stops.forEach((s, idx) => {
        rows.push([
          String(r.cab),
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

  async function handleDownloadSample(format: 'xlsx' | 'csv') {
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
      setErrorMsg(err instanceof Error ? err.message : 'Failed to download the sample roster.');
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
            Traffic-aware clustering heuristic with Google Routes v2, 5-min dwell buffers, and radius catchment alerts
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flex: '0 1 auto', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', maxWidth: '100%', minWidth: 0 }}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => handleDownloadSample('xlsx')}
            disabled={downloadingTemplate !== null}
            style={{ whiteSpace: 'normal', textAlign: 'left' }}
          >
            {downloadingTemplate === 'xlsx' ? 'Downloading roster...' : 'Download Sample Roster (.xlsx)'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => handleDownloadSample('csv')}
            disabled={downloadingTemplate !== null}
            style={{ whiteSpace: 'normal', textAlign: 'left' }}
          >
            {downloadingTemplate === 'csv' ? 'Downloading CSV...' : 'Sample (.csv)'}
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} />
            <span>
              <strong>Success:</strong> Created {committedSuccess.routesCreated} active dispatch routes ({committedSuccess.stopsCreated} passenger stops) in operational database.
            </span>
          </div>
          <Link href="/board" style={{ textDecoration: 'none' }}>
            <Button size="sm" variant="success" rightIcon={<ExternalLink size={12} />}>
              Open Route Deck
            </Button>
          </Link>
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
                    {/* Office Destination */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Office Destination / Central Hub *
                      </label>
                      <input
                        type="text"
                        required
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                        placeholder="e.g. Mindspace IT Park, Hitec City, Hyderabad"
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

                    {/* Arrival Deadline */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Required Arrival Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
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
                          Cab Capacity
                        </label>
                        <select
                          value={cabCapacity}
                          onChange={(e) => setCabCapacity(Number(e.target.value))}
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
                          <option value={1}>1 Pax</option>
                          <option value={2}>2 Pax</option>
                          <option value={3}>3 Pax</option>
                          <option value={4}>4 Pax (Sedan)</option>
                          <option value={5}>5 Pax</option>
                          <option value={6}>6 Pax (SUV)</option>
                          <option value={7}>7 Pax</option>
                          <option value={12}>12 Pax (Tempo)</option>
                        </select>
                      </div>
                    </div>

                    {/* Dwell and Buffer */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Dwell Buffer (min)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={stopDwellMinutes}
                          onChange={(e) => setStopDwellMinutes(Number(e.target.value))}
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
                        Upload Employee Pickup Roster (.xlsx / .csv) *
                      </label>
                      <label
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
                          {selectedFile ? selectedFile.name : 'Click or Drag & Drop Roster File'}
                        </span>
                        <input
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          style={{ display: 'none' }}
                        />
                      </label>
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
                          value={cabCapacity}
                          onChange={(e) => setCabCapacity(Number(e.target.value))}
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
                          <option value={4}>Sedan (4 Seater)</option>
                          <option value={6}>SUV (6 Seater)</option>
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
                <Button variant="ghost" size="sm" onClick={() => setPlanResult(null)}>
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
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '10px' }}>
                <Button
                  variant="primary"
                  style={{ width: '100%' }}
                  disabled={committing}
                  onClick={handleCommitToDatabase}
                  leftIcon={committing ? <RefreshCw className="spin" size={14} /> : <CheckCircle size={14} />}
                >
                  {committing ? 'Committing...' : 'Commit & Dispatch Routes'}
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
