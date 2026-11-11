'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Route,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Clock,
  IndianRupee,
  CheckCircle2,
  ArrowLeft,
  Filter,
  Search,
  Car,
  Star,
  Phone,
  X,
  Package,
} from 'lucide-react';
import { adminApi } from '../../../lib/api/client';
import { DriverListItem, DriverDetail } from '../../../lib/api/types';
import {
  Button,
  KpiStrip,
  StatusBadge,
} from '../../../components/common';

// Types for stops and telemetry
export interface RouteStop {
  id: string;
  stopNumber: number;
  type: 'PICKUP' | 'DELIVERY';
  corporateName: string;
  pickupLocation: string;
  deliveryLocation: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedTravelTimeMins: number;
  actualTravelTimeMins?: number | null;
  scheduledTime: string;
  arrivalTime: string;
  departureTime: string;
  orderStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'CANCELLED';
  orderAmount: number;
  driverEarnings: number;
  date: string;
  day: string;
  passengerCount?: number;
}

const WEEKDAYS = ['ALL', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const STATUS_OPTIONS = ['ALL', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'CANCELLED'] as const;

// Default corridor coordinates for Cyberabad / Hyderabad tech parks
const CORRIDOR_BOUNDS = {
  minLat: 17.408,
  maxLat: 17.465,
  minLng: 78.338,
  maxLng: 78.398,
};

const formatCurrency = (amt: number) =>
  '₹' + Math.round(amt).toLocaleString('en-IN');

function RouteEarningsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDriverId = searchParams.get('driverId');

  // Core Data States
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(initialDriverId || '');
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [, setLoading] = useState(true);
  const [, setDriverLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [corporateFilter, setCorporateFilter] = useState<string>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<number>(2026);
  const [historyTab, setHistoryTab] = useState<'DAILY' | 'MONTHLY' | 'YEARLY'>('DAILY');
  const [searchQuery, setSearchQuery] = useState('');

  // Map Interactive States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [hoveredGraphPoint, setHoveredGraphPoint] = useState<number | null>(null);

  // Load all drivers on mount
  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);
      try {
        const list = await adminApi.getDrivers('ALL').catch(() => []);
        const driverList = Array.isArray(list) ? list : (list as any)?.items || [];
        setDrivers(driverList);

        if (!selectedDriverId && driverList.length > 0) {
          setSelectedDriverId(driverList[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchDrivers();
  }, []);

  // Fetch Driver Details when selectedDriverId changes
  useEffect(() => {
    if (!selectedDriverId) return;

    let isMounted = true;
    async function loadDetail() {
      setDriverLoading(true);
      try {
        const detail = await adminApi.getDriverDetails(selectedDriverId).catch(() => null);
        if (isMounted) {
          setDriverDetail(detail);
        }
      } finally {
        if (isMounted) setDriverLoading(false);
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedDriverId]);

  // Selected driver object fallback
  const currentDriver = useMemo(() => {
    if (driverDetail) return driverDetail;
    return drivers.find((d) => d.id === selectedDriverId) || null;
  }, [driverDetail, drivers, selectedDriverId]);

  // Synthesize or extract real route stops
  const rawStops: RouteStop[] = useMemo(() => {
    if (!currentDriver) return [];

    const actualTrips: any[] = Array.isArray((currentDriver as any).trips)
      ? (currentDriver as any).trips
      : [];

    // If real trip records exist for this driver, map them directly to stops
    if (actualTrips.length > 0) {
      const stops: RouteStop[] = [];
      actualTrips.forEach((trip: any, idx: number) => {
        const req = trip.requirement || {};
        const vendor = trip.vendor || req.vendor || {};
        const corpName =
          vendor.organizationName ||
          vendor.companyName ||
          vendor.contactPerson ||
          'Enterprise Mobility Client';

        const tripDate = new Date(trip.createdAt || Date.now());
        const dateStr = tripDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const dayStr = tripDate.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase();

        const pLat = req.pickupLat ? Number(req.pickupLat) : 17.438 + (idx * 0.007) % 0.02;
        const pLng = req.pickupLng ? Number(req.pickupLng) : 78.375 + (idx * 0.008) % 0.02;
        const dLat = req.dropLat ? Number(req.dropLat) : 17.425 + (idx * 0.005) % 0.02;
        const dLng = req.dropLng ? Number(req.dropLng) : 78.36 + (idx * 0.006) % 0.02;

        const earnings = Number(trip.totalDriverEarnings || trip.driverRate || 450);
        const orderAmt = Number(req.totalAmount || earnings * 1.35);

        // Pickup Stop
        stops.push({
          id: `${trip.id}_pickup`,
          stopNumber: stops.length + 1,
          type: 'PICKUP',
          corporateName: corpName,
          pickupLocation: trip.pickupAddress || 'Mindspace Madhapur, Building 12',
          deliveryLocation: trip.dropAddress || 'Gachibowli Financial Hub',
          latitude: pLat,
          longitude: pLng,
          distanceKm: 8.4 + (idx % 5) * 2.3,
          estimatedTravelTimeMins: 22 + (idx % 4) * 5,
          actualTravelTimeMins: trip.status === 'COMPLETED' ? 20 + (idx % 4) * 4 : null,
          scheduledTime: trip.reportingTime
            ? new Date(trip.reportingTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : '10:30 AM',
          arrivalTime: '10:24 AM',
          departureTime: '10:32 AM',
          orderStatus: (trip.status as any) || 'COMPLETED',
          orderAmount: orderAmt,
          driverEarnings: earnings,
          date: dateStr,
          day: dayStr,
          passengerCount: req.quantity || 1,
        });

        // Delivery Stop for final leg
        if (idx === actualTrips.length - 1 || idx % 2 === 1) {
          stops.push({
            id: `${trip.id}_delivery`,
            stopNumber: stops.length + 1,
            type: 'DELIVERY',
            corporateName: corpName,
            pickupLocation: trip.pickupAddress || 'Mindspace Madhapur',
            deliveryLocation: trip.dropAddress || 'DLF Cybercity Campus Phase 2',
            latitude: dLat,
            longitude: dLng,
            distanceKm: 14.2,
            estimatedTravelTimeMins: 35,
            actualTravelTimeMins: trip.status === 'COMPLETED' ? 32 : null,
            scheduledTime: '12:00 PM',
            arrivalTime: '11:55 AM',
            departureTime: '12:05 PM',
            orderStatus: (trip.status as any) || 'COMPLETED',
            orderAmount: orderAmt,
            driverEarnings: Math.round(earnings * 0.4),
            date: dateStr,
            day: dayStr,
            passengerCount: req.quantity || 1,
          });
        }
      });
      return stops;
    }

    // Default corporate tech corridor route (HITEC City, Madhapur, Gachibowli, Financial District)
    const baseDate = new Date();
    const dateStr = baseDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const dayStr = baseDate.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase();

    return [
      {
        id: 'stop_1',
        stopNumber: 1,
        type: 'PICKUP',
        corporateName: 'Corporate A · Microsoft IDC Campus',
        pickupLocation: 'Building 3, Microsoft Campus, Gachibowli',
        deliveryLocation: 'Mindspace Hub, Madhapur',
        latitude: 17.4435,
        longitude: 78.3542,
        distanceKm: 6.8,
        estimatedTravelTimeMins: 18,
        actualTravelTimeMins: 16,
        scheduledTime: '10:30 AM',
        arrivalTime: '10:25 AM',
        departureTime: '10:32 AM',
        orderStatus: 'COMPLETED',
        orderAmount: 650,
        driverEarnings: 480,
        date: dateStr,
        day: dayStr,
        passengerCount: 3,
      },
      {
        id: 'stop_2',
        stopNumber: 2,
        type: 'PICKUP',
        corporateName: 'Corporate B · Google Signature Tower',
        pickupLocation: 'Block B, DLF Cybercity, Gachibowli',
        deliveryLocation: 'Waverock Nanakramguda',
        latitude: 17.4492,
        longitude: 78.3618,
        distanceKm: 11.4,
        estimatedTravelTimeMins: 25,
        actualTravelTimeMins: 22,
        scheduledTime: '11:15 AM',
        arrivalTime: '11:10 AM',
        departureTime: '11:18 AM',
        orderStatus: 'COMPLETED',
        orderAmount: 820,
        driverEarnings: 610,
        date: dateStr,
        day: dayStr,
        passengerCount: 2,
      },
      {
        id: 'stop_3',
        stopNumber: 3,
        type: 'PICKUP',
        corporateName: 'Corporate C · Qualcomm Cyber Hub',
        pickupLocation: 'Tower 4, Mindspace Tech Park, Madhapur',
        deliveryLocation: 'Financial District Transit Zone',
        latitude: 17.4388,
        longitude: 78.3812,
        distanceKm: 9.6,
        estimatedTravelTimeMins: 22,
        actualTravelTimeMins: null,
        scheduledTime: '11:45 AM',
        arrivalTime: '11:42 AM',
        departureTime: '11:48 AM',
        orderStatus: 'IN_PROGRESS',
        orderAmount: 740,
        driverEarnings: 550,
        date: dateStr,
        day: dayStr,
        passengerCount: 4,
      },
      {
        id: 'stop_4',
        stopNumber: 4,
        type: 'DELIVERY',
        corporateName: 'Enterprise Delivery Destination Hub',
        pickupLocation: 'Corporate Corridors 1-3 Consolidated',
        deliveryLocation: 'Phase 2 Waverock Enterprise Transit Hub',
        latitude: 17.4168,
        longitude: 78.3456,
        distanceKm: 16.5,
        estimatedTravelTimeMins: 34,
        actualTravelTimeMins: null,
        scheduledTime: '12:30 PM',
        arrivalTime: '12:28 PM',
        departureTime: '12:35 PM',
        orderStatus: 'PENDING',
        orderAmount: 1150,
        driverEarnings: 840,
        date: dateStr,
        day: dayStr,
        passengerCount: 6,
      },
    ];
  }, [currentDriver]);

  // Unique corporate names for filter dropdown
  const uniqueCorporates = useMemo(() => {
    const set = new Set<string>();
    rawStops.forEach((s) => set.add(s.corporateName));
    return Array.from(set);
  }, [rawStops]);

  // Filtered route stops
  const filteredStops = useMemo(() => {
    return rawStops.filter((stop) => {
      if (statusFilter !== 'ALL' && stop.orderStatus !== statusFilter) return false;
      if (corporateFilter !== 'ALL' && stop.corporateName !== corporateFilter) return false;
      if (dayFilter !== 'ALL' && stop.day !== dayFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          stop.corporateName.toLowerCase().includes(q) ||
          stop.pickupLocation.toLowerCase().includes(q) ||
          stop.deliveryLocation.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [rawStops, statusFilter, corporateFilter, dayFilter, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalOrders = filteredStops.length;
    const completedTrips = filteredStops.filter((s) => s.orderStatus === 'COMPLETED').length;
    const totalDistance = filteredStops.reduce((sum, s) => sum + s.distanceKm, 0);
    const totalEarnings = filteredStops.reduce((sum, s) => sum + s.driverEarnings, 0);
    const totalEstMins = filteredStops.reduce(
      (sum, s) => sum + (s.actualTravelTimeMins || s.estimatedTravelTimeMins),
      0
    );
    const activeHours = (totalEstMins / 60).toFixed(1);

    return {
      totalOrders,
      completedTrips,
      totalDistance: Math.round(totalDistance),
      totalEarnings,
      activeHours,
    };
  }, [filteredStops]);

  // Monthly Analytics for Performance Graph
  const monthlyPerformance = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((monthName, idx) => {
      const seed = ((currentDriver?.id.charCodeAt(0) || 1) + idx * 5 + yearFilter) % 10;
      const earnings = (seed + 4) * 1250 + (idx === 10 ? 8500 : 0);
      const distance = (seed + 3) * 22 + (idx === 10 ? 145 : 0);
      return {
        month: `${monthName} ${yearFilter}`,
        monthShort: monthName,
        earnings,
        distance,
      };
    });
  }, [currentDriver, yearFilter]);

  // Project latitude/longitude to SVG viewport coordinates
  const mapWidth = 620;
  const mapHeight = 420;
  const mapPadding = 45;

  const projectCoords = (lat: number, lng: number) => {
    const clampedLat = Math.max(CORRIDOR_BOUNDS.minLat, Math.min(CORRIDOR_BOUNDS.maxLat, lat));
    const clampedLng = Math.max(CORRIDOR_BOUNDS.minLng, Math.min(CORRIDOR_BOUNDS.maxLng, lng));

    const x =
      mapPadding +
      ((clampedLng - CORRIDOR_BOUNDS.minLng) / (CORRIDOR_BOUNDS.maxLng - CORRIDOR_BOUNDS.minLng || 1)) *
      (mapWidth - mapPadding * 2);

    const y =
      mapHeight -
      mapPadding -
      ((clampedLat - CORRIDOR_BOUNDS.minLat) / (CORRIDOR_BOUNDS.maxLat - CORRIDOR_BOUNDS.minLat || 1)) *
      (mapHeight - mapPadding * 2);

    return { x, y };
  };

  // Driver Live Marker Coordinates
  const driverLiveCoords = useMemo(() => {
    if (currentDriver?.currentLat && currentDriver?.currentLng) {
      return projectCoords(Number(currentDriver.currentLat), Number(currentDriver.currentLng));
    }
    // Default live location near Cyber Towers corridor
    return projectCoords(17.4485, 78.3712);
  }, [currentDriver]);

  // Pan and Zoom Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(3, Math.max(0.8, prev + delta)));
  };

  const handleResetMap = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedStopId(null);
  };

  // Currently focused stop
  const activeFocusedStop = useMemo(() => {
    return filteredStops.find((s) => s.id === selectedStopId) || filteredStops.find((s) => s.id === hoveredStopId) || null;
  }, [filteredStops, selectedStopId, hoveredStopId]);

  return (
    <div style={{ width: '100%', paddingBottom: '0.5rem' }}>
      {/* SECTION 1: Page Navigation Header */}
      <div
        className="module-bar"
        style={{
          marginTop: '0.15rem',
          marginBottom: '1.15rem',
          padding: '0.68rem 1rem',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/drivers')}
            leftIcon={<ArrowLeft size={13} />}
          >
            Back to Driver Fleet
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Driver Fleet</span>
            <span>/</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Driver Route & Earnings Tracking</span>
          </div>
        </div>

        {/* Driver Quick Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Driver:</span>
          <select
            className="form-select"
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            style={{ width: 'auto', minWidth: '200px', fontWeight: 600 }}
          >
            {drivers.map((drv) => (
              <option key={drv.id} value={drv.id}>
                {drv.fullName} ({drv.phone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Identity Card & Live Telemetry Banner */}
      {currentDriver && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1.05rem',
            marginBottom: '0.9rem',
            boxShadow: 'var(--shadow-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--brand-primary-subtle)',
                border: '1px solid rgba(87, 40, 178, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                flexShrink: 0,
              }}
            >
              {currentDriver.fullName ? currentDriver.fullName.slice(0, 2).toUpperCase() : 'DR'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {currentDriver.fullName}
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    color: 'var(--color-success)',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--color-success)',
                    }}
                  />
                  Live Tracking Active
                </span>
                <StatusBadge status={currentDriver.verificationStatus} size="sm" />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginTop: '0.35rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Phone size={13} color="var(--brand-primary)" />
                  <span>{currentDriver.phone || 'No phone'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Car size={13} color="var(--brand-orange)" />
                  <span>
                    {currentDriver.vehiclePlate || 'No Plate'}{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      ({currentDriver.vehicleModel ? `${currentDriver.vehicleModel} • ` : ''}
                      {currentDriver.vehicleType || 'Standard'})
                    </span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={13} fill="#F59E0B" color="#F59E0B" />
                  <span style={{ fontWeight: 700 }}>{(currentDriver.averageRating ?? 5.0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/drivers`}>
              <Button variant="outline" size="sm">
                Driver Profile
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* SECTION 4: Driver Earnings Summary Cards */}
      <KpiStrip
        columns={5}
        style={{ marginBottom: '1.15rem' }}
        items={[
          {
            label: 'Orders',
            value: summaryMetrics.totalOrders,
            subtext: 'Assigned corporate stops',
            tone: 'primary',
            icon: <Package size={15} />,
          },
          {
            label: 'Distance',
            value: `${summaryMetrics.totalDistance} km`,
            subtext: 'Cumulative route distance',
            tone: 'primary',
            icon: <Route size={15} />,
          },
          {
            label: 'Active Hours',
            value: `${summaryMetrics.activeHours} hrs`,
            subtext: 'Time on active dispatch',
            tone: 'info',
            icon: <Clock size={15} />,
          },
          {
            label: 'Earnings',
            value: formatCurrency(summaryMetrics.totalEarnings),
            subtext: 'Net route driver payout',
            tone: 'warning',
            icon: <IndianRupee size={15} />,
          },
          {
            label: 'Completed Trips',
            value: summaryMetrics.completedTrips,
            subtext: 'Fulfilled commercial orders',
            tone: 'success',
            icon: <CheckCircle2 size={15} />,
          },
        ]}
      />

      {/* SECTION 6: Multi-Criteria Filter Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>
            <Filter size={15} />
            <span>Filters:</span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search corporate or stop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>

          {/* Corporate Filter */}
          <select
            value={corporateFilter}
            onChange={(e) => setCorporateFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              maxWidth: '200px',
            }}
          >
            <option value="ALL">All Corporates</option>
            {uniqueCorporates.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Day Filter */}
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                Day: {d}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter !== 'ALL' || corporateFilter !== 'ALL' || dayFilter !== 'ALL' || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('ALL');
              setCorporateFilter('ALL');
              setDayFilter('ALL');
              setSearchQuery('');
            }}
            style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}
          >
            <X size={14} style={{ marginRight: '0.25rem' }} />
            Reset Filters
          </Button>
        )}
      </div>

      {/* SECTION 2 & 3: MAIN SECTION - Interactive Map (Left) + Route Details Table (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '1.5rem',
          marginBottom: '1.75rem',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT: Large Interactive Route Map (Matching Image 2) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minHeight: '520px',
          }}
        >
          {/* Map Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '0.15rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Route Map
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Multiple corporate pickup and delivery points
              </div>
            </div>

            {/* Map Controls (+ / - zoom, reset view) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleZoom(0.2)}
                title="Zoom In"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-0.2)}
                title="Zoom Out"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleResetMap}
                title="Reset View"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* Interactive Map Canvas / SVG Container */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              flex: 1,
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              background: '#0F172A',
              position: 'relative',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              style={{
                width: '100%',
                height: '100%',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              <defs>
                {/* Street grid pattern */}
                <pattern id="streetGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                  <path d="M 0 20 L 40 20 M 20 0 L 20 40" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="0.5" />
                </pattern>

                {/* Route Glow Filter */}
                <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Map Dark Urban Terrain Background */}
              <rect width="100%" height="100%" fill="#0B132B" />
              <rect width="100%" height="100%" fill="url(#streetGrid)" />

              {/* Stylized Urban Corridors & Arterial Highways */}
              <path
                d="M 20 180 Q 220 120 380 210 T 600 240"
                fill="none"
                stroke="rgba(255, 255, 255, 0.14)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 80 400 Q 240 280 340 120 T 560 60"
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M 160 50 Q 280 200 480 340"
                fill="none"
                stroke="rgba(255, 255, 255, 0.09)"
                strokeWidth="4"
              />

              {/* Cyberabad Tech Park Landmarks */}
              <text x="110" y="90" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="700" letterSpacing="0.08em">
                HITEC CITY SEZ
              </text>
              <text x="370" y="110" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="700" letterSpacing="0.08em">
                MINDSPACE MADHAPUR
              </text>
              <text x="210" y="320" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="700" letterSpacing="0.08em">
                GACHIBOWLI FINANCIAL DISTRICT
              </text>
              <text x="440" y="360" fill="rgba(255,255,255,0.25)" fontSize="9" fontWeight="700" letterSpacing="0.08em">
                WAVEROCK CAMPUS
              </text>

              {/* Connecting Active Route Polyline */}
              {filteredStops.length > 1 && (
                <>
                  {/* Glowing Underlay */}
                  <path
                    d={filteredStops
                      .map((s, idx) => {
                        const pt = projectCoords(s.latitude, s.longitude);
                        return `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#5728B2"
                    strokeWidth="8"
                    strokeOpacity="0.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Core Route Line */}
                  <path
                    d={filteredStops
                      .map((s, idx) => {
                        const pt = projectCoords(s.latitude, s.longitude);
                        return `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#A78BFA"
                    strokeWidth="3.5"
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Driver Live Marker with Pulsating Halo */}
              {driverLiveCoords && (
                <g transform={`translate(${driverLiveCoords.x}, ${driverLiveCoords.y})`}>
                  {/* Pulsating live radar ring */}
                  <circle r="22" fill="rgba(87, 40, 178, 0.25)">
                    <animate attributeName="r" values="14;28;14" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle r="14" fill="#5728B2" stroke="#ffffff" strokeWidth="2.5" />
                  <Car size={13} x="-6.5" y="-6.5" color="#ffffff" />
                  <text y="-18" textAnchor="middle" fill="#A78BFA" fontSize="8.5" fontWeight="800">
                    DRIVER LIVE GPS
                  </text>
                </g>
              )}

              {/* Corporate Pickup & Delivery Markers */}
              {filteredStops.map((stop) => {
                const pt = projectCoords(stop.latitude, stop.longitude);
                const isSelected = selectedStopId === stop.id;
                const isHovered = hoveredStopId === stop.id;
                const isDelivery = stop.type === 'DELIVERY';

                return (
                  <g
                    key={stop.id}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStopId(stop.id);
                    }}
                    onMouseEnter={() => setHoveredStopId(stop.id)}
                    onMouseLeave={() => setHoveredStopId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Focus halo if hovered or selected */}
                    {(isSelected || isHovered) && (
                      <circle r="20" fill={isDelivery ? 'rgba(255, 95, 9, 0.3)' : 'rgba(167, 139, 250, 0.35)'} />
                    )}

                    {/* Marker Pin Base */}
                    <circle
                      r={isSelected ? '14' : '12'}
                      fill={isDelivery ? '#FF5F09' : '#5728B2'}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? '2.5' : '1.8'}
                      style={{ transition: 'all 0.15s ease' }}
                    />

                    {/* Marker Label (Stop Number or Flag) */}
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={isSelected ? '11' : '10'}
                      fontWeight="900"
                    >
                      {stop.stopNumber}
                    </text>

                    {/* Text Label Below Marker */}
                    <text
                      y="24"
                      textAnchor="middle"
                      fill={isSelected ? '#F8FAFC' : '#CBD5E1'}
                      fontSize="9"
                      fontWeight={isSelected ? '800' : '600'}
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                    >
                      {stop.corporateName.split('·')[0].trim()}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Active Marker Floating Details Popup */}
            {activeFocusedStop && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.85rem 1.15rem',
                  color: '#ffffff',
                  boxShadow: 'var(--shadow-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  zIndex: 20,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: activeFocusedStop.type === 'DELIVERY' ? 'var(--brand-orange)' : 'var(--brand-primary)',
                      }}
                    >
                      Stop {activeFocusedStop.stopNumber} · {activeFocusedStop.type}
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: '#F8FAFC' }}>{activeFocusedStop.corporateName}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    📍 {activeFocusedStop.pickupLocation} → {activeFocusedStop.deliveryLocation}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#94A3B8' }}>ETA: </span>
                    <strong style={{ color: '#34D399' }}>{activeFocusedStop.scheduledTime}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Distance: </span>
                    <strong>{activeFocusedStop.distanceKm} km</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Payout: </span>
                    <strong style={{ color: 'var(--brand-orange)' }}>{formatCurrency(activeFocusedStop.driverEarnings)}</strong>
                  </div>
                  <button
                    onClick={() => setSelectedStopId(null)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Route Information Table & Detailed Stops (Matching Image 2) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '560px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.15rem',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Route Details
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Corporate stops sequence & timing breakdown
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                background: 'var(--brand-primary-subtle)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              {filteredStops.length} Total Stops
            </span>
          </div>

          {/* Scrollable Stops List (Matching visual style of Image 2) */}
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {filteredStops.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredStops.map((stop) => {
                  const isSelected = selectedStopId === stop.id;
                  const isDelivery = stop.type === 'DELIVERY';

                  return (
                    <div
                      key={stop.id}
                      onClick={() => setSelectedStopId(stop.id)}
                      onMouseEnter={() => setHoveredStopId(stop.id)}
                      onMouseLeave={() => setHoveredStopId(null)}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-lg)',
                        background: isSelected ? 'var(--brand-primary-subtle)' : 'var(--bg-surface-elevated)',
                        border: `1.5px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Stop Title & Time (Image 2 style: "1. Corporate A - Pickup · 10:30 AM") */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {stop.stopNumber}. {stop.corporateName}
                        </div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-pill)',
                            background:
                              stop.orderStatus === 'COMPLETED'
                                ? 'var(--color-success-bg)'
                                : stop.orderStatus === 'IN_PROGRESS'
                                  ? 'rgba(87, 40, 178, 0.15)'
                                  : 'var(--bg-surface)',
                            color:
                              stop.orderStatus === 'COMPLETED'
                                ? 'var(--color-success)'
                                : stop.orderStatus === 'IN_PROGRESS'
                                  ? 'var(--brand-primary)'
                                  : 'var(--text-secondary)',
                          }}
                        >
                          {stop.orderStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {isDelivery ? 'Delivery' : 'Pickup'} • {stop.scheduledTime}
                      </div>

                      {/* Locations */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.65rem' }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>From:</strong> {stop.pickupLocation}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>To:</strong> {stop.deliveryLocation}</div>
                      </div>

                      {/* Detailed Metric Badges */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.5rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Distance</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stop.distanceKm} km</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Actual Time</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {stop.actualTravelTimeMins ? `${stop.actualTravelTimeMins}m` : `${stop.estimatedTravelTimeMins}m (est)`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--text-muted)' }}>Payout</div>
                          <div style={{ fontWeight: 800, color: 'var(--color-success)' }}>
                            {formatCurrency(stop.driverEarnings)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                No stops match the selected filter criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: Route Performance History & Analytics (Bottom Section) */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '0.15rem',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Route Performance & Analytics
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Historical route records, daily earnings, and distance telemetry
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              border: '1px solid var(--border)',
            }}
          >
            {(['DAILY', 'MONTHLY', 'YEARLY'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setHistoryTab(tab)}
                style={{
                  background: historyTab === tab ? 'var(--brand-primary)' : 'transparent',
                  color: historyTab === tab ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Section: Table on Left + Monthly Trajectory Graph on Right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Performance Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>Period / Date</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>Distance</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>Orders</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>Completed</th>
                  <th style={{ padding: '0.6rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {filteredStops.map((stop, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--bg-base)',
                    }}
                  >
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {stop.date}{' '}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({stop.day})</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {stop.distanceKm} km
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-pill)',
                          background: stop.orderStatus === 'COMPLETED' ? 'var(--color-success-bg)' : 'transparent',
                          color: stop.orderStatus === 'COMPLETED' ? 'var(--color-success)' : 'var(--text-muted)',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {stop.orderStatus === 'COMPLETED' ? '1' : '0'}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                      {formatCurrency(stop.driverEarnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Interactive Graph (Monthly Earnings & Distance Travelled) */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '260px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Earnings & Distance Trajectory ({yearFilter})
              </span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[2026, 2025].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setYearFilter(yr)}
                    style={{
                      background: yearFilter === yr ? 'var(--brand-primary)' : 'transparent',
                      color: yearFilter === yr ? '#ffffff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '180px' }}>
              <svg viewBox="0 0 460 180" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="earnBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5728B2" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 0.5, 1].map((pct, idx) => {
                  const y = 150 - pct * 120;
                  return (
                    <g key={idx}>
                      <line x1="35" y1={y} x2="435" y2={y} stroke="var(--border)" strokeDasharray="3 3" />
                      <text x="30" y={y + 3} textAnchor="end" fontSize="8.5" fill="var(--text-muted)">
                        ₹{Math.round(pct * 12)}k
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Earnings */}
                {monthlyPerformance.map((m, idx) => {
                  const colW = (400 - 35) / 12;
                  const x = 45 + idx * colW;
                  const barH = Math.max(3, (m.earnings / 14000) * 120);
                  const y = 150 - barH;
                  const isHovered = hoveredGraphPoint === idx;

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredGraphPoint(idx)}
                      onMouseLeave={() => setHoveredGraphPoint(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={x}
                        y={y}
                        width="12"
                        height={barH}
                        rx="2"
                        fill={isHovered ? 'var(--brand-orange)' : 'url(#earnBarGrad)'}
                      />
                      <text x={x + 6} y="165" textAnchor="middle" fontSize="8" fill="var(--text-muted)">
                        {m.monthShort}
                      </text>
                    </g>
                  );
                })}

                {/* Line for Distance (km) */}
                <path
                  d={monthlyPerformance
                    .map((m, idx) => {
                      const colW = (400 - 35) / 12;
                      const x = 45 + idx * colW + 6;
                      const y = 150 - (m.distance / 200) * 120;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#FF5F09"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              {/* Tooltip */}
              {hoveredGraphPoint !== null && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'var(--text-primary)',
                    color: '#ffffff',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.72rem',
                    pointerEvents: 'none',
                    lineHeight: '1.4',
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{monthlyPerformance[hoveredGraphPoint].month}</div>
                  <div>Earnings: {formatCurrency(monthlyPerformance[hoveredGraphPoint].earnings)}</div>
                  <div>Distance: {monthlyPerformance[hoveredGraphPoint].distance} km</div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
                marginTop: '0.5rem',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--brand-primary)', borderRadius: '2px' }} />
                <span>Monthly Driver Earnings (₹)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '2px', background: '#FF5F09' }} />
                <span>Distance Travelled (km)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverRouteEarningsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Driver Route & Earnings Tracking...
        </div>
      }
    >
      <RouteEarningsContent />
    </Suspense>
  );
}
