'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateTenantOption, RoutePlanningResult, CalculatedRoute, PlannedRouteStop } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import {
  Cpu,
  CheckCircle,
  AlertTriangle,
  Play,
  Layers,
  Clock,
  Car,
  Users,
  UploadCloud,
  FileSpreadsheet,
  Download,
  MapPin,
  Compass,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

const ROUTE_COLORS = [
  '#1167EE', // Electric Indigo
  '#047857', // Emerald Green
  '#EE9811', // Amber Gold
  '#A21CAF', // Purple
  '#EF4444', // Red
  '#0E7490', // Cyan
  '#4D7C0F', // Lime
  '#7C2D12', // Rust
];

function tomorrowMorningIst(): string {
  const d = new Date(Date.now() + 24 * 3600_000 + 330 * 60_000);
  return `${d.toISOString().slice(0, 10)}T08:00`;
}

export default function RouteOptimizerPage() {
  const [activeTab, setActiveTab] = useState<'FILE_UPLOAD' | 'DB_SHIFT'>('FILE_UPLOAD');

  // File Upload Form State
  const [officeAddress, setOfficeAddress] = useState('Mindspace IT Park, Hitec City, Hyderabad');
  const [deadline, setDeadline] = useState(tomorrowMorningIst());
  const [officeRadiusKm, setOfficeRadiusKm] = useState(50);
  const [stopDwellMinutes, setStopDwellMinutes] = useState(5);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [cabCapacity, setCabCapacity] = useState(4);
  const [routingPreference, setRoutingPreference] = useState<'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL'>('TRAFFIC_AWARE');
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // DB Shift State
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>(new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10));
  const [shiftTime, setShiftTime] = useState<string>('08:00');
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');

  // Solver & UI State
  const [calculating, setCalculating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<RoutePlanningResult | null>(null);
  const [selectedCab, setSelectedCab] = useState<number | null>(null);
  const [expandedCabs, setExpandedCabs] = useState<Set<number>>(new Set());
  const [committedSuccess, setCommittedSuccess] = useState<{ routesCreated: number; stopsCreated: number } | null>(null);
  const [committing, setCommitting] = useState(false);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const officeCircleRef = useRef<any>(null);
  const officeMarkerRef = useRef<any>(null);

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
    if (!planResult || !mapContainerRef.current) return;

    if (!(window as any).google || !(window as any).google.maps) {
      loadGoogleMapsScript(() => initMap(planResult));
    } else {
      initMap(planResult);
    }
  }, [planResult]);

  function loadGoogleMapsScript(callback: () => void) {
    if (document.getElementById('google-maps-script')) {
      callback();
      return;
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initOpsMap&loading=async&v=weekly`;
    (window as any).initOpsMap = callback;
    document.head.appendChild(script);
  }

  function initMap(plan: RoutePlanningResult) {
    if (!mapContainerRef.current || !(window as any).google) return;
    const google = (window as any).google;

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: plan.office.lat, lng: plan.office.lng },
        zoom: 12,
        mapId: 'adhocx_ops_map',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
        ],
      });
    }

    renderMapObjects(plan);
  }

  function clearMapObjects() {
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

    // 1. Office HQ Marker & 50km Catchment Circle
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
      strokeColor: '#0EA5E9',
      strokeWeight: 2,
      strokeOpacity: 0.6,
      fillColor: '#0EA5E9',
      fillOpacity: 0.04,
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
          strokeWeight: 4,
          strokeOpacity: 0.85,
          geodesic: true,
        });
        polylinesRef.current.push(polyline);
        polylineCoords.forEach((p) => bounds.extend(p));
      }

      // Draw Pickup Stop Pins
      route.stops.forEach((stop, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const marker = new google.maps.Marker({
          map: googleMapRef.current,
          position: { lat: stop.lat, lng: stop.lng },
          label: { text: letter, color: '#FFFFFF', fontWeight: 'bold', fontSize: '11px' },
          title: `Route ${route.cab} - Stop ${letter}: ${stop.name} (${stop.eta})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: stop.outOfRadius ? '#EF4444' : color,
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="color: #0F172A; padding: 4px; font-family: sans-serif; font-size: 13px;">
              <strong style="color: #1167EE; font-size: 14px;">Stop ${letter}: ${stop.name}</strong><br/>
              <span style="color: #64748B;">${stop.matchedAddress}</span><br/>
              ${stop.outOfRadius ? '<span style="color: #EF4444; font-weight: bold;">⚠️ Outside Catchment Radius</span><br/>' : ''}
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

    googleMapRef.current.fitBounds(bounds, 40);
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
    setProgressPct(10);
    setProgressMsg('Uploading and parsing employee roster...');
    setErrorMsg(null);
    setPlanResult(null);
    setCommittedSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('office', officeAddress);
    formData.append('loginTime', deadline);
    formData.append('officeRadiusKm', String(officeRadiusKm));
    formData.append('bufferMinutes', String(bufferMinutes));
    formData.append('pickupWaitMinutes', String(stopDwellMinutes));
    formData.append('cabCapacity', String(cabCapacity));
    formData.append('routingPreference', routingPreference);
    formData.append('avoidTolls', String(avoidTolls));
    formData.append('avoidHighways', String(avoidHighways));

    try {
      setProgressPct(40);
      setProgressMsg('Geocoding addresses & calculating proximity clusters...');

      const result = await opsApi.planRoutesFromFile(formData);
      setProgressPct(100);
      setProgressMsg('Route planning completed!');
      setPlanResult(result);
      if (result.routes.length > 0) {
        setExpandedCabs(new Set([result.routes[0].cab]));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Route planning failed. Please check your file headers.');
    } finally {
      setCalculating(false);
    }
  }

  async function handleCommitToDatabase() {
    if (!planResult) return;
    setCommitting(true);
    setErrorMsg(null);

    try {
      const tenantId = selectedTenantId || (tenants[0]?.id ?? '00000000-0000-4000-8000-000000000001');
      const officeId = selectedOfficeId || (tenants[0]?.offices?.[0]?.id ?? '00000000-0000-4000-8000-000000000002');
      const shiftDateFormatted = deadline.slice(0, 10);
      const shiftTimeFormatted = deadline.slice(11, 16);

      const commitRes = await opsApi.commitRoutePlan({
        tenantId,
        officeId,
        shiftDate: shiftDateFormatted,
        shiftTime: shiftTimeFormatted,
        direction: 'LOGIN',
        vehicleCategory: cabCapacity <= 4 ? 'SEDAN' : 'SUV',
        plan: planResult,
      });

      setCommittedSuccess(commitRes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit routes to fleet operations database');
    } finally {
      setCommitting(false);
    }
  }

  async function handleExportExcel() {
    if (!planResult) return;
    try {
      const blob = await opsApi.exportPlanExcel(planResult);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AdhocX_Route_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Export to Excel failed');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="h1-text" style={{ color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={24} style={{ color: 'var(--brand-blue-400, #5290F9)' }} />
            CVRPTW Route Optimization Engine & Fleet Planner
          </h1>
          <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '13px', marginTop: '2px' }}>
            Traffic-aware clustering heuristic with Google Routes v2, 5-min dwell buffers, and radius catchment alerts
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a
            href={opsApi.getSampleTemplateUrl('xlsx')}
            download="sample-employee-pickups.xlsx"
            style={{ textDecoration: 'none' }}
          >
            <Button variant="ghost" size="sm" leftIcon={<Download size={14} />}>
              Download Sample Roster (.xlsx)
            </Button>
          </a>
          <a
            href={opsApi.getSampleTemplateUrl('csv')}
            download="sample-employee-pickups.csv"
            style={{ textDecoration: 'none' }}
          >
            <Button variant="ghost" size="sm" leftIcon={<Download size={14} />}>
              Sample (.csv)
            </Button>
          </a>
        </div>
      </div>

      {/* KPI HUD Strip (Appears when plan is calculated) */}
      {planResult && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: '#0F172A',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border, #334155)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cabs Planned</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#38BDF8', marginTop: '2px' }}>{planResult.cabCount} Vehicles</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Employees</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>{planResult.employeeCount} Riders</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline Compliance</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ADE80', marginTop: '2px' }}>
              {planResult.routes.filter((r) => r.status === 'Meets deadline').length} / {planResult.cabCount} (100%)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buffer Target</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#A78BFA', marginTop: '2px' }}>
              {planResult.bufferedDeadline}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catchment Boundary</div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: planResult.outOfRadiusCount > 0 ? '#F87171' : '#4ADE80',
                marginTop: '2px',
              }}
            >
              {planResult.outOfRadiusCount} Alerts ({planResult.officeRadiusKm} km)
            </div>
          </div>
        </div>
      )}

      {/* Error or Success Banner */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {committedSuccess && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            border: '1px solid rgba(22, 163, 74, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4ADE80', fontSize: '14px', fontWeight: 600 }}>
            <CheckCircle size={18} />
            <span>
              Successfully committed {committedSuccess.routesCreated} routes ({committedSuccess.stopsCreated} stops) into fleet database!
            </span>
          </div>
          <Link href="/board" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="sm" leftIcon={<ExternalLink size={14} />}>
              Open Live Dispatch Board
            </Button>
          </Link>
        </div>
      )}

      {/* Main Split Layout: 380px Configuration & Itinerary Drawer + Flex Map Canvas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)',
          gap: '16px',
          alignItems: 'start',
          flex: 1,
        }}
      >
        {/* LEFT PANEL */}
        <div
          style={{
            backgroundColor: 'var(--surface, #0B132B)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border, #1E293B)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 240px)',
            overflow: 'hidden',
          }}
        >
          {!planResult ? (
            /* PARAMETER CONFIGURATION & FILE UPLOADER FORM */
            <form onSubmit={handleCalculateRoutes} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border, #1E293B)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                  Roster Planning Configuration
                </h2>
              </div>

              <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {/* Office Destination */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
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
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '13px',
                    }}
                  />
                </div>

                {/* Arrival Deadline */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
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
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '13px',
                    }}
                  />
                </div>

                {/* 2-Column Grid for Radius and Capacity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                      Catchment Radius (km)
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
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#F8FAFC',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                      Cab Capacity
                    </label>
                    <select
                      value={cabCapacity}
                      onChange={(e) => setCabCapacity(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#F8FAFC',
                        fontSize: '13px',
                      }}
                    >
                      <option value={4}>4 Pax (Sedan)</option>
                      <option value={6}>6 Pax (SUV)</option>
                      <option value={12}>12 Pax (Tempo)</option>
                    </select>
                  </div>
                </div>

                {/* Dwell and Buffer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
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
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#F8FAFC',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
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
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#F8FAFC',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                {/* File Drag and Drop */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                    Upload Employee Pickup Roster (.xlsx / .csv) *
                  </label>
                  <label
                    style={{
                      border: '2px dashed #334155',
                      borderRadius: '8px',
                      padding: '18px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: selectedFile ? 'rgba(17, 103, 238, 0.08)' : '#0F172A',
                      borderColor: selectedFile ? '#1167EE' : '#334155',
                    }}
                  >
                    <UploadCloud size={24} style={{ color: selectedFile ? '#1167EE' : '#64748B', marginBottom: '6px' }} />
                    <span style={{ fontSize: '12px', color: selectedFile ? '#F8FAFC' : '#94A3B8', fontWeight: 500, textAlign: 'center' }}>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
                    Routing Quality
                  </label>
                  <select
                    value={routingPreference}
                    onChange={(e: any) => setRoutingPreference(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '13px',
                    }}
                  >
                    <option value="TRAFFIC_AWARE">Traffic-Aware (Waypoint order optimized)</option>
                    <option value="TRAFFIC_AWARE_OPTIMAL">Traffic-Aware Optimal (Preserve order)</option>
                  </select>
                </div>
              </div>

              {/* Progress indicator during calculation */}
              {calculating && (
                <div style={{ padding: '12px 20px', backgroundColor: '#0F172A', borderTop: '1px solid #1E293B' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>
                    <span>{progressMsg}</span>
                    <span style={{ fontWeight: 600, color: '#38BDF8' }}>{progressPct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#1167EE', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border, #1E293B)' }}>
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
            /* CALCULATED ROUTES ACCORDION LIST */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border, #1E293B)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                    Planned Cab Itineraries ({planResult.cabCount} Routes)
                  </h2>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Click a cab card to isolate on map</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPlanResult(null)}>
                  Edit Params
                </Button>
              </div>

              {/* Scrollable list of routes */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {planResult.routes.map((route, rIdx) => {
                    const isSelected = selectedCab === route.cab;
                    const isExpanded = expandedCabs.has(route.cab);
                    const color = ROUTE_COLORS[(route.cab - 1) % ROUTE_COLORS.length];
                    const outOfRadiusStops = route.stops.filter((s) => s.outOfRadius);

                    return (
                      <div
                        key={route.cab}
                        style={{
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${color}` : '1px solid #1E293B',
                          backgroundColor: isSelected ? 'rgba(17, 103, 238, 0.08)' : '#0F172A',
                          overflow: 'hidden',
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
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
                                Route {route.cab} · {route.stops.length} Pickups
                              </div>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                {route.departure} → {route.arrival} · {route.distanceKm} km · {route.driveMinutes} min
                              </div>
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
                                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                  color: '#F87171',
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
                                color: '#94A3B8',
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
                          <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1E293B', fontSize: '12px' }}>
                            <div style={{ margin: '8px 0 6px', color: '#94A3B8', fontSize: '11px' }}>
                              Sequence: <span style={{ color: '#F8FAFC' }}>{route.sequence}</span>
                            </div>

                            <ol style={{ margin: '8px 0', paddingLeft: '18px', color: '#E2E8F0' }}>
                              {route.stops.map((stop, sIdx) => (
                                <li key={sIdx} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                                  <div style={{ fontWeight: 600, color: stop.outOfRadius ? '#F87171' : '#F8FAFC' }}>
                                    {String.fromCharCode(65 + sIdx)}. {stop.name}
                                    {stop.outOfRadius && ' (OUTSIDE 50KM CATCHMENT)'}
                                  </div>
                                  <div style={{ color: '#94A3B8', fontSize: '11px' }}>{stop.matchedAddress}</div>
                                  <div style={{ color: '#38BDF8', fontSize: '11px', marginTop: '2px' }}>
                                    Pickup: <strong>{stop.eta}</strong> (Dwell until {stop.dwellUntil}) → To next:{' '}
                                    {stop.travelToNextMinutes}m ({stop.distanceToNextKm} km)
                                  </div>
                                </li>
                              ))}
                            </ol>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4ADE80', paddingTop: '6px', borderTop: '1px dashed #334155' }}>
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
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border, #1E293B)', display: 'flex', gap: '10px' }}>
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

        {/* RIGHT PANEL: INTERACTIVE GOOGLE MAPS VECTOR CANVAS */}
        <div
          style={{
            height: 'calc(100vh - 240px)',
            minHeight: '520px',
            backgroundColor: '#0F172A',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border, #1E293B)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Map Container */}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Empty State Banner if no plan yet */}
          {!planResult && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                padding: '24px 32px',
                borderRadius: '12px',
                border: '1px solid #334155',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
              }}
            >
              <Compass size={36} style={{ color: '#5290F9', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#F8FAFC' }}>
                Interactive Vector Route Map
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px', maxWidth: '300px' }}>
                Upload an employee roster on the left panel and click Calculate to view color-coded cab polylines, stop pins, and office catchment radius.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
