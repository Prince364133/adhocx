'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RawCsvRow,
  OptimizationResult,
  VehicleCategorySelection,
  FLEET_VEHICLE_CATEGORIES,
  OptimizationProfile,
  CsvValidationReport,
  OptimizedCabCluster,
} from './types';
import {
  parseCsvText,
  validateEmployeeCsv,
  estimateRoadDistanceKm,
  calculateDistanceCharge,
  haversineDistanceKm,
  isCoLocatedPickup,
} from './lib/geoUtils';
import { SAMPLE_EMPLOYEE_CSV_TEXT } from './sampleData';
import { TestRouteMap } from './components/TestRouteMap';
import { OptimizationAuditModal } from './components/OptimizationAuditModal';
import { EmployeeClusterCard } from './components/EmployeeClusterCard';
import { Button } from '../../components/common/Button';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Play,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Navigation,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Route as RouteIcon,
  Layers,
  Map as MapIcon,
  FileText,
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

export default function TestOptimizationPage() {
  // Tabs & Mode
  const [activeTab, setActiveTab] = useState<'ROSTER_INGEST' | 'SAMPLE_DATA'>('ROSTER_INGEST');
  const [viewMode, setViewMode] = useState<'SPLIT' | 'MAP' | 'LIST'>('SPLIT');

  // Input Parameters matching Planner page
  const [companyName, setCompanyName] = useState('Google Hyderabad / Invesco India');
  const [officeHubName, setOfficeHubName] = useState('Mindspace IT Park (Building 12D, Hitec City)');
  const [officeAddress, setOfficeAddress] = useState('Mindspace IT Park, Hitec City, Hyderabad');
  const [shiftDate, setShiftDate] = useState(() =>
    new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10),
  );
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT' | 'BOTH'>('LOGIN');
  const [loginShiftTime, setLoginShiftTime] = useState('08:00');
  const [logoutShiftTime, setLogoutShiftTime] = useState('17:00');

  // 3-Column Grid Parameters
  const [officeRadiusKm, setOfficeRadiusKm] = useState(50);
  const [maxTripKm, setMaxTripKm] = useState(50);
  const [uploadVehicleCategory, setUploadVehicleCategory] = useState<VehicleCategorySelection>('ALL');

  // Routing Strategy & Constraints
  const [routingPreference, setRoutingPreference] = useState<RoutingPreference>('TRAFFIC_AWARE');
  const [avoidTolls, setAvoidTolls] = useState(true);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [stopDwellMinutes, setStopDwellMinutes] = useState(5);
  const [bufferMinutes, setBufferMinutes] = useState(10);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<RawCsvRow[]>([]);

  // Execution & Output State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedCabIndex, setSelectedCabIndex] = useState<number>(0);
  const [expandedCabs, setExpandedCabs] = useState<Set<number>>(new Set([1]));
  const [optimizationProfile, setOptimizationProfile] = useState<OptimizationProfile>('BALANCED');
  const [validationReport, setValidationReport] = useState<CsvValidationReport | null>(null);
  const [auditModalCluster, setAuditModalCluster] = useState<OptimizedCabCluster | null>(null);
  const [routeSearch, setRouteSearch] = useState<string>('');

  // Filtered clusters by search query
  const filteredClusters = useMemo(() => {
    if (!result) return [];
    if (!routeSearch.trim()) return result.clusters;
    const q = routeSearch.toLowerCase().trim();
    return result.clusters.filter((c) => {
      const matchCab = `cab ${c.cabIndex}`.includes(q) || `route ${c.cabIndex}`.includes(q) || `#${c.cabIndex}`.includes(q);
      const matchCat = c.vehicleCategory.toLowerCase().includes(q);
      const matchPassenger = c.passengers.some(
        (p) => p.name.toLowerCase().includes(q) || p.pickupAddress.toLowerCase().includes(q)
      );
      return matchCab || matchCat || matchPassenger;
    });
  }, [result, routeSearch]);

  // Parse CSV whenever csvContent changes
  useEffect(() => {
    if (!csvContent) {
      setParsedRows([]);
      setValidationReport(null);
      return;
    }
    const rows = parseCsvText(csvContent);
    setParsedRows(rows);
    const { report } = validateEmployeeCsv(rows);
    setValidationReport(report);
  }, [csvContent]);

  // Load sample dataset
  const handleLoadSample = () => {
    setCsvContent(SAMPLE_EMPLOYEE_CSV_TEXT);
    setSelectedFile(new File([SAMPLE_EMPLOYEE_CSV_TEXT], 'sample-employee-pickups.csv', { type: 'text/csv' }));
    setErrorMsg(null);
  };

  // Download sample CSV
  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_EMPLOYEE_CSV_TEXT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-employee-pickups.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file select
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setErrorMsg(null);
    };
    reader.readAsText(file);
  };

  // Execute optimization
  const handleRunOptimization = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let rowsToOptimize = parsedRows;
    if (rowsToOptimize.length === 0) {
      if (activeTab === 'SAMPLE_DATA' || !csvContent) {
        handleLoadSample();
        rowsToOptimize = parseCsvText(SAMPLE_EMPLOYEE_CSV_TEXT);
      } else {
        setErrorMsg('Please upload an employee spreadsheet or click "Load Sample Data" first.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/test-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rowsToOptimize,
          vehicleCategory: uploadVehicleCategory,
          profile: optimizationProfile,
          officeAddressOverride: officeAddress,
          shiftDate,
          loginShiftTime,
          logoutShiftTime,
          direction,
          routingPreference,
          avoidTolls,
          avoidHighways,
          stopDwellMinutes,
          bufferMinutes,
          officeRadiusKm,
          maxTripKm,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Optimization request failed');
      }

      setResult(data);
      setSelectedCabIndex(0);
      setExpandedCabs(
        new Set(
          data.clusters && data.clusters.length <= 4
            ? data.clusters.map((c: any) => c.cabIndex)
            : [data.clusters?.[0]?.cabIndex ?? 1]
        )
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while computing test routes');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle accordion expand
  const toggleAccordion = (cabIdx: number) => {
    setExpandedCabs((prev) => {
      const next = new Set(prev);
      if (next.has(cabIdx)) next.delete(cabIdx);
      else next.add(cabIdx);
      return next;
    });
  };

  // Switch route option within a cluster
  const handleSelectRouteOption = (clusterIdx: number, routeIdx: number) => {
    if (!result) return;
    const updatedClusters = [...result.clusters];
    const targetCluster = updatedClusters[clusterIdx];
    targetCluster.selectedRouteIndex = routeIdx;

    const chosenOption = targetCluster.routeOptions[routeIdx];
    if (chosenOption) {
      targetCluster.distanceKm = chosenOption.distanceKm;
      targetCluster.driveMinutes = chosenOption.durationMinutes;
      targetCluster.driverPayout = calculateDistanceCharge(chosenOption.distanceKm, targetCluster.vehicleCategory);
      targetCluster.corporateRevenue = Math.round(chosenOption.distanceKm * 40 + 250);
      targetCluster.projectedMargin = Number((targetCluster.corporateRevenue - targetCluster.driverPayout).toFixed(2));
      if (chosenOption.orderedPassengers && chosenOption.orderedPassengers.length > 0) {
        targetCluster.passengers = chosenOption.orderedPassengers;
      }
    }

    setResult({
      ...result,
      clusters: updatedClusters,
    });
  };

  const activeCluster = result?.clusters[selectedCabIndex] || result?.clusters[0];
  const activeRoute =
    activeCluster?.routeOptions[activeCluster.selectedRouteIndex] ||
    activeCluster?.routeOptions[0];
  const activeRouteColor = ROUTE_COLORS[selectedCabIndex % ROUTE_COLORS.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(87, 40, 178, 0.1)',
                color: 'var(--brand-blue-500, #5728B2)',
              }}
            >
              OPERATIONS TEST LAB
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                color: '#16A34A',
                border: '1px solid rgba(22, 163, 74, 0.2)',
              }}
            >
              Isolated Simulation • Zero DB Writes
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Route Optimization Testing Engine &amp; Fleet Planner
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', maxWidth: 850 }}>
            Simulate capacity-constrained employee transport, evaluate multi-stop arterial corridors, and verify turn-by-turn road navigation in Google Maps.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Play size={14} />}
            onClick={() => {
              handleLoadSample();
              setActiveTab('SAMPLE_DATA');
            }}
          >
            Load Sample Roster (12 Employees)
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleDownloadSample}
          >
            Download CSV Template
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--color-danger-bg, #FEF2F2)',
            border: '1px solid var(--color-danger-border, #FCA5A5)',
            color: 'var(--color-danger, #DC2626)',
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

      {/* KPI HUD Strip (Matches Planner page KPI format) */}
      {result && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Cabs Planned
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-blue-500, #5728B2)', marginTop: '2px' }}>
              {result.totalCabs} Vehicles
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Total Employees
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {result.totalEmployees} Employees
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Fleet Total Distance
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {result.summary.totalOptimizedKm.toFixed(1)} km
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Fleet Allocation
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {result.vehicleCategoryCounts.SEDAN || 0} Sedan · {result.vehicleCategoryCounts.SUV || 0} SUV
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Driver Payout
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              ₹{result.summary.totalDriverPayout.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Projected Margin
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success, #16A34A)', marginTop: '2px' }}>
              ₹{result.summary.totalProjectedMargin.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Catchment Alerts
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: result.outOfRadiusCount > 0 ? 'var(--color-danger, #DC2626)' : 'var(--color-success, #16A34A)',
                marginTop: '4px',
              }}
            >
              {result.outOfRadiusCount > 0 ? `${result.outOfRadiusCount} Outside >${result.officeRadiusKm}km` : 'All Within Radius'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Google Maps Verification
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1167EE', marginTop: '4px' }}>
              {result.totalCabs} Live Test URLs
            </div>
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
        {/* LEFT PANEL: PARAMETER WORKBENCH & INGEST */}
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
          }}
        >
          {/* Segmented Mode Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-muted)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('ROSTER_INGEST')}
              style={{
                flex: 1,
                padding: '12px 10px',
                fontSize: '12px',
                fontWeight: 600,
                background: activeTab === 'ROSTER_INGEST' ? 'var(--brand-primary-subtle)' : 'transparent',
                color: activeTab === 'ROSTER_INGEST' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: activeTab === 'ROSTER_INGEST' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
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
              onClick={() => {
                setActiveTab('SAMPLE_DATA');
                if (!csvContent) handleLoadSample();
              }}
              style={{
                flex: 1,
                padding: '12px 10px',
                fontSize: '12px',
                fontWeight: 600,
                background: activeTab === 'SAMPLE_DATA' ? 'var(--brand-primary-subtle)' : 'transparent',
                color: activeTab === 'SAMPLE_DATA' ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: activeTab === 'SAMPLE_DATA' ? '2px solid var(--brand-blue-500, #5728B2)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileSpreadsheet size={14} />
              <span>Sample Dataset</span>
            </button>
          </div>

          {/* Form Content */}
          <form
            onSubmit={handleRunOptimization}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
              {/* Corporate Client */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Corporate Client (Company) *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
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

              {/* Company Office Hub */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Company Office Hub *
                </label>
                <input
                  type="text"
                  required
                  value={officeHubName}
                  onChange={(e) => setOfficeHubName(e.target.value)}
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

              {/* Office Destination Address */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Office Location Address *
                </label>
                <input
                  type="text"
                  required
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="Mindspace IT Park, Hitec City, Hyderabad"
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

              {/* Shift Date & Direction */}
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
                    <option value="LOGIN">LOGIN (Pickup to Office)</option>
                    <option value="LOGOUT">LOGOUT (Office to Drop)</option>
                    <option value="BOTH">BOTH (Login + Logout)</option>
                  </select>
                </div>
              </div>

              {/* Shift Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Login Time (IST) *
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
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Logout Time (IST)
                  </label>
                  <input
                    type="time"
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
              </div>

              {/* 3-Column Grid for Radius, Max Trip, and THE 2 CARS VEHICLE CATEGORY SELECTION */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Radius (max 50km)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={officeRadiusKm}
                    onChange={(e) => setOfficeRadiusKm(Math.min(50, Math.max(1, Number(e.target.value) || 50)))}
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
                    Max Trip (km)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxTripKm}
                    onChange={(e) => setMaxTripKm(Math.min(50, Math.max(1, Number(e.target.value) || 50)))}
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
                    Cab Assignment
                  </label>
                  <select
                    value={uploadVehicleCategory}
                    onChange={(e) => setUploadVehicleCategory(e.target.value as VehicleCategorySelection)}
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
                  >
                    <option value="ALL">Auto-assign (Sedan &amp; SUV)</option>
                    <option value="SEDAN">Sedan (4 seats)</option>
                    <option value="SUV">SUV (6 seats)</option>
                  </select>
                </div>
              </div>

              {/* Routing Strategy */}
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Routing strategy (choose one)
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {([
                    ['TRAFFIC_UNAWARE', 'Traffic-unaware'],
                    ['TRAFFIC_AWARE', 'Traffic-aware'],
                    ['TRAFFIC_AWARE_OPTIMAL', 'Optimal live'],
                  ] as const).map(([val, label]) => (
                    <label
                      key={`strat-${val}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: `1px solid ${routingPreference === val ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`,
                        borderRadius: '6px',
                        padding: '8px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        backgroundColor: routingPreference === val ? 'var(--brand-primary-subtle)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="test-routing-strategy"
                        value={val}
                        checked={routingPreference === val}
                        onChange={() => setRoutingPreference(val)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Multi-Objective Optimization Profile */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Optimization Profile
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {([
                    ['BALANCED', 'Balanced'],
                    ['DISTANCE_PRIORITY', 'Distance Priority'],
                    ['TIME_PRIORITY', 'Time Priority'],
                  ] as const).map(([val, label]) => (
                    <label
                      key={`profile-${val}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: optimizationProfile === val ? 'var(--brand-primary-subtle)' : 'transparent',
                        color: optimizationProfile === val ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-secondary)',
                      }}
                    >
                      <input
                        type="radio"
                        name="test-profile"
                        value={val}
                        checked={optimizationProfile === val}
                        onChange={() => setOptimizationProfile(val)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Avoid Tolls & Highways */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} />
                  Avoid toll roads (Prioritize toll-free routes)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={avoidHighways} onChange={(e) => setAvoidHighways(e.target.checked)} />
                  Avoid highways
                </label>
              </div>

              {/* Dwell and Buffer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Wait / Stop (dwell min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={stopDwellMinutes}
                    onChange={(e) => setStopDwellMinutes(Math.min(15, Math.max(1, Number(e.target.value) || 5)))}
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

              {/* File Drag and Drop Area */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Upload Employee Route Spreadsheet *
                </label>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileChange(e.dataTransfer.files[0] || null);
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
                    {selectedFile ? `${selectedFile.name} (${parsedRows.length} employees loaded)` : 'Click or Drag & Drop Employee CSV'}
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </label>
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Supports CSV with employee name, pickup address, arrival time, and gender columns.
                </p>
              </div>

              {/* Validation Feedback Banner */}
              {validationReport && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: validationReport.invalidRowsCount > 0 ? 'rgba(220, 38, 38, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                    border: `1px solid ${validationReport.invalidRowsCount > 0 ? 'rgba(220, 38, 38, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`,
                    fontSize: '11px',
                  }}
                >
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: validationReport.invalidRowsCount > 0 ? '#DC2626' : '#059669' }}>
                    {validationReport.invalidRowsCount > 0 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                    <span>
                      {validationReport.validRowsCount} valid employees ready
                      {validationReport.invalidRowsCount > 0 && ` · ${validationReport.invalidRowsCount} invalid rows detected`}
                    </span>
                  </div>
                  {validationReport.warnings.length > 0 && (
                    <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                      ⚠️ {validationReport.warnings.length} warning(s): {validationReport.warnings[0].message}
                    </div>
                  )}
                  {validationReport.errors.length > 0 && (
                    <div style={{ marginTop: '4px', color: '#DC2626' }}>
                      ❌ Error in row {validationReport.errors[0].rowIndex}: {validationReport.errors[0].message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Form Action */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                leftIcon={<Play size={14} />}
                style={{ width: '100%' }}
              >
                {isLoading ? 'Calculating Optimal Corridors...' : 'Run Fleet Route Optimization'}
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT PANEL: PLANNED CAB ITINERARIES & VISUAL WORKSPACE */}
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
          }}
        >
          {!result ? (
            /* EMPTY WORKBENCH STATE */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '40px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--brand-primary-subtle)',
                  color: 'var(--brand-blue-500, #5728B2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <RouteIcon size={32} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Route Optimization Testing Engine Ready
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: 1.6, margin: '0 0 20px' }}>
                Upload an employee CSV on the left panel or click below to run simulation on the Hyderabad 12-employee tech corridor. The engine clusters commuters into capacity-constrained vehicles (Sedans &amp; SUVs), validates safety and detour rules, and evaluates multi-stop arterial corridors.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Play size={15} />}
                  onClick={() => {
                    handleLoadSample();
                    handleRunOptimization();
                  }}
                >
                  Load Sample Roster &amp; Optimize
                </Button>
              </div>
            </div>
          ) : (
            /* RESULTS VIEW: SPLIT WORKSPACE */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Header Bar */}
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Planned Cab Routes ({result.totalCabs} Vehicles · {result.totalEmployees} Commuters)
                  </h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Review multi-stop pickup sequences, evaluate corridor alternatives, and inspect turn-by-turn road navigation.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* View mode switcher */}
                  <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                    {(['SPLIT', 'MAP', 'LIST'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: viewMode === mode ? 'var(--brand-primary-subtle)' : 'var(--bg-surface)',
                          color: viewMode === mode ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {mode === 'SPLIT' ? 'Split View' : mode === 'MAP' ? 'Map Only' : 'List Only'}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResult(null);
                    }}
                  >
                    Reset Params
                  </Button>
                </div>
              </div>

              {/* Main Workspace Area */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    viewMode === 'SPLIT'
                      ? 'minmax(360px, 490px) minmax(0, 1fr)'
                      : '1fr',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Scrollable Routes List */}
                {viewMode !== 'MAP' && (
                  <div
                    style={{
                      overflowY: 'auto',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderRight: '1px solid var(--border-subtle)',
                      minHeight: 0,
                    }}
                  >
                    {result.clusters.length > 2 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexShrink: 0,
                          marginBottom: '2px',
                        }}
                      >
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="text"
                            value={routeSearch}
                            onChange={(e) => setRouteSearch(e.target.value)}
                            placeholder="Filter routes or commuters..."
                            style={{
                              width: '100%',
                              padding: '7px 10px 7px 30px',
                              fontSize: '12px',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              outline: 'none',
                            }}
                          />
                          <Search
                            size={14}
                            style={{
                              position: 'absolute',
                              left: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--text-muted)',
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (expandedCabs.size >= result.clusters.length) {
                              setExpandedCabs(new Set());
                            } else {
                              setExpandedCabs(new Set(result.clusters.map((c) => c.cabIndex)));
                            }
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {expandedCabs.size >= result.clusters.length ? 'Collapse All' : 'Expand All'}
                        </button>
                      </div>
                    )}

                    {filteredClusters.map((cluster, cIdx) => {
                      const isSelected = selectedCabIndex === cIdx;
                      const isExpanded = expandedCabs.has(cluster.cabIndex);
                      const color = ROUTE_COLORS[cIdx % ROUTE_COLORS.length];

                      return (
                        <EmployeeClusterCard
                          key={cluster.clusterId}
                          cluster={cluster}
                          isFocused={isSelected}
                          onFocus={() => {
                            setSelectedCabIndex(cIdx);
                            setExpandedCabs((prev) => new Set(prev).add(cluster.cabIndex));
                          }}
                          onSelectRoute={(rIdx) => handleSelectRouteOption(cIdx, rIdx)}
                          onOpenAudit={() => setAuditModalCluster(cluster)}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleAccordion(cluster.cabIndex)}
                          color={color}
                        />
                      );
                    })}

                    {filteredClusters.length === 0 && (
                      <div
                        style={{
                          padding: '24px 12px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                        }}
                      >
                        No routes match &quot;{routeSearch}&quot;
                      </div>
                    )}
                  </div>
                )}

                {/* Live Google Map Workspace */}
                {viewMode !== 'LIST' && (
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                    {viewMode === 'MAP' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                          Select Cab Route:
                        </span>
                        {result.clusters.map((c, cIdx) => (
                          <button
                            key={c.clusterId}
                            type="button"
                            onClick={() => setSelectedCabIndex(cIdx)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: selectedCabIndex === cIdx ? `2px solid ${ROUTE_COLORS[cIdx % ROUTE_COLORS.length]}` : '1px solid var(--border-subtle)',
                              backgroundColor: selectedCabIndex === cIdx ? 'var(--brand-primary-subtle)' : 'var(--bg-surface)',
                              color: selectedCabIndex === cIdx ? ROUTE_COLORS[cIdx % ROUTE_COLORS.length] : 'var(--text-primary)',
                              fontWeight: 700,
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ROUTE_COLORS[cIdx % ROUTE_COLORS.length] }} />
                            Route {c.cabIndex} · {c.vehicleCategory} ({c.passengers.length} Pickups)
                          </button>
                        ))}
                      </div>
                    )}
                    {activeCluster && activeRoute ? (
                      <TestRouteMap
                        passengers={activeCluster.passengers}
                        officeLat={activeCluster.officeLat}
                        officeLng={activeCluster.officeLng}
                        officeAddress={activeCluster.officeAddress}
                        activeRoute={activeRoute}
                        routeOptions={activeCluster.routeOptions}
                        onSelectRouteOption={(rIdx) => handleSelectRouteOption(selectedCabIndex, rIdx)}
                        cabTitle={`Route ${activeCluster.cabIndex} · ${activeCluster.vehicleCategory} (${activeCluster.capacity} seats)`}
                        routeColor={activeRouteColor}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Select a route from the list to display interactive Google Map
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Algorithmic Optimization Audit Modal */}
      {auditModalCluster && result && (
        <OptimizationAuditModal
          cluster={auditModalCluster}
          result={result}
          onClose={() => setAuditModalCluster(null)}
        />
      )}
    </div>
  );
}
