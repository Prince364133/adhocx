"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { adminApi } from "../../../lib/api/client";
import { DriverListItem, DriverDetail } from "../../../lib/api/types";
import { Button, KpiStrip, StatusBadge } from "../../../components/common";

// Types for stops and telemetry
export interface RouteStop {
  id: string;
  stopNumber: number;
  type: "PICKUP" | "DELIVERY";
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
  orderStatus: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "CANCELLED";
  orderAmount: number;
  driverEarnings: number;
  date: string;
  day: string;
  passengerCount?: number;
}

const WEEKDAYS = [
  "ALL",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
const STATUS_OPTIONS = [
  "ALL",
  "COMPLETED",
  "IN_PROGRESS",
  "PENDING",
  "CANCELLED",
] as const;

// Default corridor coordinates for Cyberabad / Hyderabad tech parks
const CORRIDOR_BOUNDS = {
  minLat: 17.408,
  maxLat: 17.465,
  minLng: 78.338,
  maxLng: 78.398,
};

const formatCurrency = (amt: number) =>
  "₹" + Math.round(amt).toLocaleString("en-IN");

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function RouteEarningsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDriverId = searchParams.get("driverId");

  // Core Data States
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    initialDriverId || "",
  );
  const [driverDetail, setDriverDetail] = useState<DriverDetail | null>(null);
  const [, setLoading] = useState(true);
  const [, setDriverLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [corporateFilter, setCorporateFilter] = useState<string>("ALL");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<number>(2026);
  const [historyTab, setHistoryTab] = useState<"DAILY" | "MONTHLY" | "YEARLY">(
    "DAILY",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Map Interactive States
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [hoveredGraphPoint, setHoveredGraphPoint] = useState<number | null>(
    null,
  );

  // Load all drivers on mount
  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);
      try {
        const list = await adminApi.getDrivers("ALL").catch(() => []);
        const driverList = Array.isArray(list)
          ? list
          : (list as any)?.items || [];
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
        const detail = await adminApi
          .getDriverDetails(selectedDriverId)
          .catch(() => null);
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

  // Extract real route stops from DB records (commercial trips & corporate routes)
  // Never fabricates mock corporate stops when data does not exist
  const rawStops: RouteStop[] = useMemo(() => {
    if (!currentDriver) return [];

    const actualTrips: any[] = Array.isArray((currentDriver as any).trips)
      ? (currentDriver as any).trips
      : [];
    const corporateRoutes: any[] = Array.isArray(
      (currentDriver as any).corporateRoutes,
    )
      ? (currentDriver as any).corporateRoutes
      : [];

    const stops: RouteStop[] = [];

    // 1. Process real corporate routes if assigned
    corporateRoutes.forEach((route: any) => {
      const tenant = route.tenant || {};
      const office = route.office || {};
      const corpName = tenant.companyName || "Corporate Fleet";
      const shiftDate = new Date(
        route.shiftDate || route.createdAt || Date.now(),
      );
      const dateStr = shiftDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const dayStr = shiftDate
        .toLocaleDateString("en-IN", { weekday: "long" })
        .toUpperCase();

      const routeStops: any[] = Array.isArray(route.stops) ? route.stops : [];
      routeStops.forEach((s: any) => {
        const pLat = Number(s.latitude || 0);
        const pLng = Number(s.longitude || 0);
        const isDelivery = s.stopType === "DROP" || s.stopType === "DELIVERY";
        const distKm = Math.round((route.estDistanceMeters || 0) / 1000);
        const estMins =
          Math.round((route.estDurationSeconds || 0) / 60) || 20;

        const actualMins =
          s.actualArrivalTime && s.actualDepartureTime
            ? Math.max(
                1,
                Math.round(
                  (new Date(s.actualDepartureTime).getTime() -
                    new Date(s.actualArrivalTime).getTime()) /
                    60000,
                ),
              )
            : null;

        const schedTime = s.plannedEta
          ? new Date(s.plannedEta).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

        const arrTime = s.actualArrivalTime
          ? new Date(s.actualArrivalTime).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

        const depTime = s.actualDepartureTime
          ? new Date(s.actualDepartureTime).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

        stops.push({
          id: s.id || `corp_${s.stopSequence}`,
          stopNumber: stops.length + 1,
          type: isDelivery ? "DELIVERY" : "PICKUP",
          corporateName: corpName,
          pickupLocation:
            s.addressText ||
            (s.employeeName
              ? `Pickup: ${s.employeeName}`
              : "Corporate Pickup Point"),
          deliveryLocation:
            office.address || office.name || "Corporate Office Hub",
          latitude: pLat,
          longitude: pLng,
          distanceKm: distKm,
          estimatedTravelTimeMins: estMins,
          actualTravelTimeMins: actualMins,
          scheduledTime: schedTime,
          arrivalTime: arrTime,
          departureTime: depTime,
          orderStatus:
            (s.status as any) || (route.status as any) || "PENDING",
          orderAmount: 0,
          driverEarnings: 0,
          date: dateStr,
          day: dayStr,
          passengerCount: 1,
        });
      });
    });

    // 2. Process real commercial trips
    actualTrips.forEach((trip: any) => {
      const req = trip.requirement || {};
      const vendor = trip.vendor || req.vendor || {};
      const corpName =
        vendor.organizationName ||
        vendor.companyName ||
        vendor.contactPerson ||
        "Client Commercial Dispatch";

      const tripDate = new Date(
        trip.reportingTime || trip.createdAt || Date.now(),
      );
      const dateStr = tripDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const dayStr = tripDate
        .toLocaleDateString("en-IN", { weekday: "long" })
        .toUpperCase();

      const pLat = Number(req.pickupLat || trip.pickupLat || 0);
      const pLng = Number(req.pickupLng || trip.pickupLng || 0);
      const dLat = Number(req.dropLat || trip.dropLat || 0);
      const dLng = Number(req.dropLng || trip.dropLng || 0);

      const dbDist = Number(req.distanceKm || trip.distanceKm || 0);
      const calcDist =
        pLat && dLat ? haversineDistanceKm(pLat, pLng, dLat, dLng) : 0;
      const distanceKm = dbDist > 0 ? dbDist : calcDist;

      const earnings = Number(
        trip.totalDriverEarnings || trip.driverRate || 0,
      );
      const orderAmt = Number(req.totalAmount || earnings);

      const actualTravelMins =
        trip.completedAt && trip.startedAt
          ? Math.max(
              1,
              Math.round(
                (new Date(trip.completedAt).getTime() -
                  new Date(trip.startedAt).getTime()) /
                  60000,
              ),
            )
          : null;

      const schedTime = trip.reportingTime
        ? new Date(trip.reportingTime).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      const arrTime = trip.startedAt
        ? new Date(trip.startedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      const depTime = trip.completedAt
        ? new Date(trip.completedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      // Pickup Stop
      stops.push({
        id: `${trip.id}_pickup`,
        stopNumber: stops.length + 1,
        type: "PICKUP",
        corporateName: corpName,
        pickupLocation:
          trip.pickupAddress || req.pickupAddress || "Pickup Point",
        deliveryLocation:
          trip.dropAddress || req.dropAddress || "Destination",
        latitude: pLat,
        longitude: pLng,
        distanceKm,
        estimatedTravelTimeMins:
          distanceKm > 0 ? Math.round(distanceKm * 2.2) : 20,
        actualTravelTimeMins: actualTravelMins,
        scheduledTime: schedTime,
        arrivalTime: arrTime,
        departureTime: depTime,
        orderStatus: (trip.status as any) || "COMPLETED",
        orderAmount: orderAmt,
        driverEarnings: earnings,
        date: dateStr,
        day: dayStr,
        passengerCount: req.quantity || 1,
      });

      // Delivery Stop if destination exists
      if (trip.dropAddress || req.dropAddress || dLat !== 0) {
        stops.push({
          id: `${trip.id}_delivery`,
          stopNumber: stops.length + 1,
          type: "DELIVERY",
          corporateName: corpName,
          pickupLocation:
            trip.pickupAddress || req.pickupAddress || "Pickup Point",
          deliveryLocation:
            trip.dropAddress || req.dropAddress || "Destination",
          latitude: dLat,
          longitude: dLng,
          distanceKm: 0,
          estimatedTravelTimeMins: 0,
          actualTravelTimeMins: null,
          scheduledTime: depTime !== "—" ? depTime : schedTime,
          arrivalTime: depTime,
          departureTime: depTime,
          orderStatus: (trip.status as any) || "COMPLETED",
          orderAmount: 0,
          driverEarnings: 0,
          date: dateStr,
          day: dayStr,
          passengerCount: req.quantity || 1,
        });
      }
    });

    return stops;
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
      if (statusFilter !== "ALL" && stop.orderStatus !== statusFilter)
        return false;
      if (corporateFilter !== "ALL" && stop.corporateName !== corporateFilter)
        return false;
      if (dayFilter !== "ALL" && stop.day !== dayFilter) return false;
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

  // Summary Metrics strictly from real data
  const summaryMetrics = useMemo(() => {
    const totalOrders = filteredStops.length;
    const completedTrips = filteredStops.filter(
      (s) => s.orderStatus === "COMPLETED",
    ).length;
    const totalDistance = filteredStops.reduce(
      (sum, s) => sum + s.distanceKm,
      0,
    );
    const totalEarnings = filteredStops.reduce(
      (sum, s) => sum + s.driverEarnings,
      0,
    );
    const totalEstMins = filteredStops.reduce(
      (sum, s) => sum + (s.actualTravelTimeMins || s.estimatedTravelTimeMins),
      0,
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

  // Monthly Analytics for Performance Graph - computed purely from real trips
  const monthlyPerformance = useMemo(() => {
    const actualTrips: any[] = Array.isArray((currentDriver as any)?.trips)
      ? (currentDriver as any).trips
      : [];

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return months.map((monthName, idx) => {
      const tripsThisMonth = actualTrips.filter((t) => {
        const d = new Date(t.completedAt || t.startedAt || t.createdAt);
        return d.getFullYear() === yearFilter && d.getMonth() === idx;
      });

      const completed = tripsThisMonth.filter(
        (t) => t.status === "COMPLETED",
      ).length;

      const earnings = tripsThisMonth
        .filter((t) => t.status === "COMPLETED")
        .reduce(
          (sum, t) => sum + Number(t.totalDriverEarnings || t.driverRate || 0),
          0,
        );

      const distance = tripsThisMonth.reduce(
        (sum, t) =>
          sum + Number(t.requirement?.distanceKm || t.distanceKm || 0),
        0,
      );

      return {
        month: `${monthName} ${yearFilter}`,
        monthShort: monthName,
        totalOrders: tripsThisMonth.length,
        completedOrders: completed,
        earnings,
        distance: Math.round(distance),
      };
    });
  }, [currentDriver, yearFilter]);

  // Yearly performance aggregates
  const yearlyPerformance = useMemo(() => {
    const actualTrips: any[] = Array.isArray((currentDriver as any)?.trips)
      ? (currentDriver as any).trips
      : [];

    return [2026, 2025, 2024].map((yr) => {
      const tripsThisYear = actualTrips.filter((t) => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === yr;
      });

      const completed = tripsThisYear.filter(
        (t) => t.status === "COMPLETED",
      ).length;

      const earnings = tripsThisYear
        .filter((t) => t.status === "COMPLETED")
        .reduce(
          (sum, t) => sum + Number(t.totalDriverEarnings || t.driverRate || 0),
          0,
        );

      const distance = tripsThisYear.reduce(
        (sum, t) =>
          sum + Number(t.requirement?.distanceKm || t.distanceKm || 0),
        0,
      );

      return {
        year: yr,
        totalOrders: tripsThisYear.length,
        completedOrders: completed,
        earnings,
        distance: Math.round(distance),
      };
    });
  }, [currentDriver]);

  // Valid geographic stops with non-zero coordinates
  const validGeoStops = useMemo(() => {
    return filteredStops.filter(
      (s) =>
        s.latitude != null &&
        s.longitude != null &&
        Math.abs(s.latitude) > 0.1 &&
        Math.abs(s.longitude) > 0.1,
    );
  }, [filteredStops]);

  // Dynamic bounding box for SVG viewport
  const mapWidth = 620;
  const mapHeight = 420;
  const mapPadding = 50;

  const mapBounds = useMemo(() => {
    const lats: number[] = validGeoStops.map((s) => s.latitude);
    const lngs: number[] = validGeoStops.map((s) => s.longitude);

    if (
      currentDriver?.currentLat != null &&
      currentDriver?.currentLng != null &&
      Math.abs(Number(currentDriver.currentLat)) > 0.1 &&
      Math.abs(Number(currentDriver.currentLng)) > 0.1
    ) {
      lats.push(Number(currentDriver.currentLat));
      lngs.push(Number(currentDriver.currentLng));
    }

    if (lats.length === 0) {
      return CORRIDOR_BOUNDS;
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(0.012, (maxLat - minLat) * 1.3);
    const lngSpan = Math.max(0.012, (maxLng - minLng) * 1.3);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    return {
      minLat: centerLat - latSpan / 2,
      maxLat: centerLat + latSpan / 2,
      minLng: centerLng - lngSpan / 2,
      maxLng: centerLng + lngSpan / 2,
    };
  }, [validGeoStops, currentDriver]);

  const projectCoords = (lat: number, lng: number) => {
    const latSpan = mapBounds.maxLat - mapBounds.minLat || 0.001;
    const lngSpan = mapBounds.maxLng - mapBounds.minLng || 0.001;

    const clampedLat = Math.max(
      mapBounds.minLat,
      Math.min(mapBounds.maxLat, lat),
    );
    const clampedLng = Math.max(
      mapBounds.minLng,
      Math.min(mapBounds.maxLng, lng),
    );

    const x =
      mapPadding +
      ((clampedLng - mapBounds.minLng) / lngSpan) *
        (mapWidth - mapPadding * 2);

    const y =
      mapHeight -
      mapPadding -
      ((clampedLat - mapBounds.minLat) / latSpan) *
        (mapHeight - mapPadding * 2);

    return { x, y };
  };

  // Driver Live Marker Coordinates - only computed when actual GPS coordinates exist
  const driverLiveCoords = useMemo(() => {
    if (
      currentDriver?.currentLat != null &&
      currentDriver?.currentLng != null &&
      Math.abs(Number(currentDriver.currentLat)) > 0.1 &&
      Math.abs(Number(currentDriver.currentLng)) > 0.1
    ) {
      return projectCoords(
        Number(currentDriver.currentLat),
        Number(currentDriver.currentLng),
      );
    }
    return null;
  }, [currentDriver, mapBounds]);

  // Telemetry status
  const hasGps = Boolean(
    currentDriver?.currentLat != null &&
      currentDriver?.currentLng != null &&
      Math.abs(Number(currentDriver.currentLat)) > 0.1 &&
      Math.abs(Number(currentDriver.currentLng)) > 0.1,
  );
  const isOnline =
    currentDriver?.availabilityStatus === "ONLINE" ||
    currentDriver?.availabilityStatus === "AVAILABLE";

  // Chart max bounds calculation
  const maxEarnVal = Math.max(
    ...monthlyPerformance.map((m) => m.earnings),
    0,
  );
  const maxDistVal = Math.max(
    ...monthlyPerformance.map((m) => m.distance),
    0,
  );
  const chartMaxEarnings =
    maxEarnVal > 0 ? Math.ceil(maxEarnVal / 5000) * 5000 : 12000;
  const chartMaxDistance =
    maxDistVal > 0 ? Math.ceil(maxDistVal / 50) * 50 : 200;
  const hasTrajectoryData = monthlyPerformance.some(
    (m) => m.earnings > 0 || m.distance > 0,
  );

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
    return (
      filteredStops.find((s) => s.id === selectedStopId) ||
      filteredStops.find((s) => s.id === hoveredStopId) ||
      null
    );
  }, [filteredStops, selectedStopId, hoveredStopId]);

  return (
    <div className="w-full pb-2">
      {/* SECTION 1: Page Navigation Header */}
      <div
        className="module-bar justify-between mt-snug"
        style={{ marginBottom: "1.15rem", padding: "0.68rem 1rem" }}
      >
        <div className="flex items-center flex-wrap" style={{ gap: "0.65rem" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/drivers")}
            leftIcon={<ArrowLeft size={13} />}
          >
            Back to Driver Fleet
          </Button>

          <div className="flex items-center text-sm text-muted gap-tight">
            <span>Driver Fleet</span>
            <span>/</span>
            <span className="font-bold text-primary">
              Driver Route & Earnings Tracking
            </span>
          </div>
        </div>

        {/* Driver Quick Selector Dropdown */}
        <div className="flex items-center gap-snug">
          <span className="text-sm text-secondary font-semibold">
            Active Driver:
          </span>
          <select
            className="form-select font-semibold"
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            style={{ width: "auto", minWidth: "200px" }}
          >
            {drivers.map((drv) => (
              <option key={drv.id} value={drv.id}>
                {drv.fullName} ({drv.phone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Identity Card & Real Telemetry Banner */}
      {currentDriver && (
        <div
          className="bg-surface border rounded-lg shadow-xs flex items-center justify-between flex-wrap gap-relaxed"
          style={{ padding: "0.85rem 1.05rem", marginBottom: "0.9rem" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-full bg-brand-subtle flex items-center justify-center font-bold text-brand flex-shrink-0"
              style={{
                width: "40px",
                height: "40px",
                border: "1px solid rgba(var(--brand-primary-rgb), 0.25)",
                fontSize: "0.88rem",
              }}
            >
              {currentDriver.fullName
                ? currentDriver.fullName.slice(0, 2).toUpperCase()
                : "DR"}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="m-0 font-bold text-primary"
                  style={{ fontSize: "1.12rem" }}
                >
                  {currentDriver.fullName}
                </h2>

                {/* Real GPS Telemetry Status */}
                {isOnline && hasGps ? (
                  <span
                    className="inline-flex items-center rounded-full font-bold bg-success-subtle text-success gap-tight text-label"
                    style={{
                      padding: "0.15rem 0.55rem",
                      border: "1px solid var(--color-success-border)",
                    }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: "7px",
                        height: "7px",
                        background: "var(--color-success)",
                      }}
                    />
                    Live Tracking Active
                  </span>
                ) : hasGps ? (
                  <span
                    className="inline-flex items-center rounded-full font-bold bg-info-subtle text-info gap-tight text-label"
                    style={{
                      padding: "0.15rem 0.55rem",
                      border: "1px solid var(--color-info-border)",
                    }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: "7px",
                        height: "7px",
                        background: "var(--color-info)",
                      }}
                    />
                    GPS Location Cached
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-full font-bold gap-tight text-label text-muted"
                    style={{
                      padding: "0.15rem 0.55rem",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: "7px",
                        height: "7px",
                        background: "var(--text-muted)",
                      }}
                    />
                    GPS Offline
                  </span>
                )}

                <StatusBadge
                  status={currentDriver.verificationStatus}
                  size="sm"
                />
              </div>

              <div className="flex items-center flex-wrap gap-4 text-base text-secondary mt-tight">
                <div className="flex items-center" style={{ gap: "0.3rem" }}>
                  <Phone size={13} color="var(--text-brand)" />
                  <span>{currentDriver.phone || "No phone"}</span>
                </div>
                <div className="flex items-center" style={{ gap: "0.3rem" }}>
                  <Car size={13} color="var(--brand-orange)" />
                  <span>
                    {currentDriver.vehiclePlate || "No Plate"}{" "}
                    <span className="text-muted">
                      (
                      {currentDriver.vehicleModel
                        ? `${currentDriver.vehicleModel} • `
                        : ""}
                      {currentDriver.vehicleType || "Standard"})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={13} fill="#F59E0B" color="#F59E0B" />
                  <span className="font-bold">
                    {(currentDriver.averageRating ?? 5.0).toFixed(1)}
                  </span>
                  <span className="text-muted text-caption">
                    ({currentDriver.ratingCount ?? 0} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
        style={{ marginBottom: "1.15rem" }}
        items={[
          {
            label: "Orders",
            value: summaryMetrics.totalOrders,
            subtext: "Assigned route stops",
            tone: "primary",
            icon: <Package size={15} />,
          },
          {
            label: "Distance",
            value: `${summaryMetrics.totalDistance} km`,
            subtext: "Cumulative route distance",
            tone: "primary",
            icon: <Route size={15} />,
          },
          {
            label: "Active Hours",
            value: `${summaryMetrics.activeHours} hrs`,
            subtext: "Time on active dispatch",
            tone: "info",
            icon: <Clock size={15} />,
          },
          {
            label: "Earnings",
            value: formatCurrency(summaryMetrics.totalEarnings),
            subtext: "Net route driver payout",
            tone: "warning",
            icon: <IndianRupee size={15} />,
          },
          {
            label: "Completed Trips",
            value: summaryMetrics.completedTrips,
            subtext: "Fulfilled commercial orders",
            tone: "success",
            icon: <CheckCircle2 size={15} />,
          },
        ]}
      />

      {/* SECTION 6: Multi-Criteria Filter Bar */}
      <div className="bg-surface border rounded-xl py-4 px-5 mb-6 shadow-sm flex items-center flex-wrap gap-4 justify-between">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="flex items-center text-secondary text-base font-bold gap-tight">
            <Filter size={15} />
            <span>Filters:</span>
          </div>

          {/* Search Box */}
          <div className="relative" style={{ minWidth: "180px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search corporate or stop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md bg-base text-primary text-base"
              style={{
                padding: "0.4rem 0.75rem 0.4rem 2rem",
                border: "1px solid var(--border-light)",
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md bg-base text-primary text-base font-semibold"
            style={{
              padding: "0.4rem 0.65rem",
              border: "1px solid var(--border-light)",
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
            className="rounded-md bg-base text-primary text-base font-semibold"
            style={{
              padding: "0.4rem 0.65rem",
              border: "1px solid var(--border-light)",
              maxWidth: "200px",
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
            className="rounded-md bg-base text-primary text-base font-semibold"
            style={{
              padding: "0.4rem 0.65rem",
              border: "1px solid var(--border-light)",
            }}
          >
            {WEEKDAYS.map((d) => (
              <option key={d} value={d}>
                Day: {d}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter !== "ALL" ||
          corporateFilter !== "ALL" ||
          dayFilter !== "ALL" ||
          searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setCorporateFilter("ALL");
              setDayFilter("ALL");
              setSearchQuery("");
            }}
            style={{ color: "var(--color-danger)", fontSize: "0.78rem" }}
          >
            <X size={14} style={{ marginRight: "0.25rem" }} />
            Reset Filters
          </Button>
        )}
      </div>

      {/* SECTION 2 & 3: MAIN SECTION - Interactive Map (Left) + Route Details Table (Right) */}
      <div
        className="grid gap-6 items-stretch"
        style={{
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          marginBottom: "1.75rem",
        }}
      >
        {/* LEFT: Large Interactive Route Map */}
        <div
          className="bg-surface border rounded-xl p-5 shadow-sm flex flex-col relative"
          style={{ minHeight: "520px" }}
        >
          {/* Map Header */}
          <div
            className="flex items-center justify-between mb-3"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h3
                className="m-0 font-extrabold text-primary"
                style={{ fontSize: "1.1rem" }}
              >
                Route Map
              </h3>
              <div className="text-sm text-muted mt-snug">
                Multiple corporate pickup and delivery points
              </div>
            </div>

            {/* Map Controls */}
            <div className="flex items-center gap-tight">
              <button
                type="button"
                onClick={() => handleZoom(0.2)}
                title="Zoom In"
                className="rounded-md bg-surface-elevated border text-primary flex items-center justify-center cursor-pointer"
                style={{ width: "32px", height: "32px" }}
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-0.2)}
                title="Zoom Out"
                className="rounded-md bg-surface-elevated border text-primary flex items-center justify-center cursor-pointer"
                style={{ width: "32px", height: "32px" }}
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleResetMap}
                title="Reset View"
                className="rounded-md bg-surface-elevated border text-primary flex items-center justify-center cursor-pointer"
                style={{ width: "32px", height: "32px" }}
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
            className="flex-1 w-full rounded-lg relative overflow-hidden"
            style={{
              background: "#0F172A",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
            }}
          >
            <svg
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              className="w-full h-full"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.15s ease-out",
              }}
            >
              <defs>
                {/* Street grid pattern */}
                <pattern
                  id="streetGrid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="1"
                  />
                  <path
                    d="M 0 20 L 40 20 M 20 0 L 20 40"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.025)"
                    strokeWidth="0.5"
                  />
                </pattern>

                {/* Route Glow Filter */}
                <filter
                  id="routeGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
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

              {/* Connecting Active Route Polyline */}
              {validGeoStops.length > 1 && (
                <>
                  {/* Glowing Underlay */}
                  <path
                    d={validGeoStops
                      .map((s, idx) => {
                        const pt = projectCoords(s.latitude, s.longitude);
                        return `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="var(--text-brand)"
                    strokeWidth="8"
                    strokeOpacity="0.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Core Route Line */}
                  <path
                    d={validGeoStops
                      .map((s, idx) => {
                        const pt = projectCoords(s.latitude, s.longitude);
                        return `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="var(--brand-lavender)"
                    strokeWidth="3.5"
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Driver Live Marker with Pulsating Halo - only when real live coordinates exist */}
              {driverLiveCoords && (
                <g
                  transform={`translate(${driverLiveCoords.x}, ${driverLiveCoords.y})`}
                >
                  <circle r="22" fill="rgba(var(--brand-primary-rgb), 0.25)">
                    <animate
                      attributeName="r"
                      values="14;28;14"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.8;0.1;0.8"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    r="14"
                    fill="var(--text-brand)"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <Car size={13} x="-6.5" y="-6.5" color="#ffffff" />
                  <text
                    y="-18"
                    textAnchor="middle"
                    fill="var(--brand-lavender)"
                    fontSize="8.5"
                    fontWeight="800"
                  >
                    DRIVER LIVE GPS
                  </text>
                </g>
              )}

              {/* Corporate Pickup & Delivery Markers */}
              {validGeoStops.map((stop) => {
                const pt = projectCoords(stop.latitude, stop.longitude);
                const isSelected = selectedStopId === stop.id;
                const isHovered = hoveredStopId === stop.id;
                const isDelivery = stop.type === "DELIVERY";

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
                    className="cursor-pointer"
                  >
                    {/* Focus halo if hovered or selected */}
                    {(isSelected || isHovered) && (
                      <circle
                        r="20"
                        fill={
                          isDelivery
                            ? "rgba(255, 95, 9, 0.3)"
                            : "rgba(var(--brand-lavender-rgb), 0.35)"
                        }
                      />
                    )}

                    {/* Marker Pin Base */}
                    <circle
                      r={isSelected ? "14" : "12"}
                      fill={isDelivery ? "#FF5F09" : "var(--text-brand)"}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? "2.5" : "1.8"}
                      style={{ transition: "all 0.15s ease" }}
                    />

                    {/* Marker Label */}
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={isSelected ? "11" : "10"}
                      fontWeight="900"
                    >
                      {stop.stopNumber}
                    </text>

                    {/* Text Label Below Marker */}
                    <text
                      y="24"
                      textAnchor="middle"
                      fill={isSelected ? "#F8FAFC" : "#CBD5E1"}
                      fontSize="9"
                      fontWeight={isSelected ? "800" : "600"}
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                    >
                      {stop.corporateName.split("·")[0].trim()}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Empty state overlay when no route coordinates or live GPS exist */}
            {validGeoStops.length === 0 && !driverLiveCoords && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
                style={{
                  background: "rgba(11, 19, 43, 0.88)",
                  backdropFilter: "blur(2px)",
                  zIndex: 10,
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center mb-3"
                  style={{
                    width: "52px",
                    height: "52px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "var(--brand-lavender)",
                  }}
                >
                  <Route size={24} />
                </div>
                <div className="font-extrabold text-white text-md mb-1">
                  No Route or GPS Coordinates Available
                </div>
                <div
                  className="text-xs text-muted max-w-sm"
                  style={{ lineHeight: "1.5" }}
                >
                  This driver has no active or historical route stops and no
                  broadcasted GPS coordinates. Real-time path telemetry will
                  render once trips are dispatched.
                </div>
              </div>
            )}

            {/* Active Marker Floating Details Popup */}
            {activeFocusedStop && (
              <div
                className="absolute rounded-lg shadow-elevated flex items-center justify-between flex-wrap gap-3"
                style={{
                  bottom: "16px",
                  left: "16px",
                  right: "16px",
                  background: "rgba(15, 23, 42, 0.95)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  padding: "0.85rem 1.15rem",
                  color: "#ffffff",
                  zIndex: 20,
                }}
              >
                <div>
                  <div
                    className="flex items-center gap-2"
                    style={{ marginBottom: "0.2rem" }}
                  >
                    <span
                      className="rounded-full font-extrabold text-caption"
                      style={{
                        padding: "0.15rem 0.45rem",
                        background:
                          activeFocusedStop.type === "DELIVERY"
                            ? "var(--brand-orange)"
                            : "var(--brand-primary)",
                      }}
                    >
                      Stop {activeFocusedStop.stopNumber} ·{" "}
                      {activeFocusedStop.type}
                    </span>
                    <strong
                      className="text-body-xl"
                      style={{ color: "#F8FAFC" }}
                    >
                      {activeFocusedStop.corporateName}
                    </strong>
                  </div>
                  <div className="text-compact" style={{ color: "#94A3B8" }}>
                    📍 {activeFocusedStop.pickupLocation} →{" "}
                    {activeFocusedStop.deliveryLocation}
                  </div>
                </div>

                <div className="flex items-center gap-5 text-base">
                  <div>
                    <span style={{ color: "#94A3B8" }}>ETA: </span>
                    <strong style={{ color: "#34D399" }}>
                      {activeFocusedStop.scheduledTime}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#94A3B8" }}>Distance: </span>
                    <strong>{activeFocusedStop.distanceKm} km</strong>
                  </div>
                  <div>
                    <span style={{ color: "#94A3B8" }}>Payout: </span>
                    <strong style={{ color: "var(--brand-orange)" }}>
                      {formatCurrency(activeFocusedStop.driverEarnings)}
                    </strong>
                  </div>
                  <button
                    onClick={() => setSelectedStopId(null)}
                    className="border-0 cursor-pointer"
                    style={{
                      background: "none",
                      color: "#94A3B8",
                      padding: "2px",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Route Information Table & Detailed Stops */}
        <div
          className="bg-surface border rounded-xl p-5 shadow-sm flex flex-col"
          style={{ maxHeight: "560px" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between mb-4 pb-3 border-b"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h3
                className="m-0 font-extrabold text-primary"
                style={{ fontSize: "1.1rem" }}
              >
                Route Details
              </h3>
              <div className="text-sm text-muted mt-snug">
                Corporate stops sequence & timing breakdown
              </div>
            </div>
            <span
              className="text-sm font-bold text-brand bg-brand-subtle rounded-full"
              style={{ padding: "0.2rem 0.6rem" }}
            >
              {filteredStops.length} Total Stops
            </span>
          </div>

          {/* Scrollable Stops List */}
          <div className="overflow-y-auto flex-1 pr-1">
            {filteredStops.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredStops.map((stop) => {
                  const isSelected = selectedStopId === stop.id;
                  const isDelivery = stop.type === "DELIVERY";

                  return (
                    <div
                      key={stop.id}
                      onClick={() => setSelectedStopId(stop.id)}
                      onMouseEnter={() => setHoveredStopId(stop.id)}
                      onMouseLeave={() => setHoveredStopId(null)}
                      className="p-4 rounded-lg cursor-pointer"
                      style={{
                        background: isSelected
                          ? "var(--brand-primary-subtle)"
                          : "var(--bg-surface-elevated)",
                        border: `1.5px solid ${isSelected ? "var(--border-focus)" : "var(--border)"}`,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div className="flex items-center justify-between mb-tight">
                        <div className="font-extrabold text-primary text-value">
                          {stop.stopNumber}. {stop.corporateName}
                        </div>
                        <span
                          className="font-bold rounded-full text-label"
                          style={{
                            padding: "0.15rem 0.5rem",
                            background:
                              stop.orderStatus === "COMPLETED"
                                ? "var(--color-success-bg)"
                                : stop.orderStatus === "IN_PROGRESS"
                                  ? "rgba(var(--brand-primary-rgb), 0.15)"
                                  : "var(--bg-surface)",
                            color:
                              stop.orderStatus === "COMPLETED"
                                ? "var(--color-success)"
                                : stop.orderStatus === "IN_PROGRESS"
                                  ? "var(--text-brand)"
                                  : "var(--text-secondary)",
                          }}
                        >
                          {stop.orderStatus}
                        </span>
                      </div>

                      <div className="text-base text-secondary font-semibold mb-2">
                        {isDelivery ? "Delivery" : "Pickup"} •{" "}
                        {stop.scheduledTime}
                      </div>

                      {/* Locations */}
                      <div
                        className="text-sm text-muted"
                        style={{ lineHeight: "1.4", marginBottom: "0.65rem" }}
                      >
                        <div>
                          <strong className="text-secondary">From:</strong>{" "}
                          {stop.pickupLocation}
                        </div>
                        <div>
                          <strong className="text-secondary">To:</strong>{" "}
                          {stop.deliveryLocation}
                        </div>
                      </div>

                      {/* Metric Badges */}
                      <div
                        className="grid gap-2 pt-2 border-t border-subtle text-sm"
                        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                      >
                        <div>
                          <div className="text-muted">Distance</div>
                          <div className="font-bold text-primary">
                            {stop.distanceKm} km
                          </div>
                        </div>
                        <div>
                          <div className="text-muted">Actual Time</div>
                          <div className="font-bold text-primary">
                            {stop.actualTravelTimeMins
                              ? `${stop.actualTravelTimeMins}m`
                              : `${stop.estimatedTravelTimeMins}m (est)`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted">Payout</div>
                          <div className="font-extrabold text-success">
                            {formatCurrency(stop.driverEarnings)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6 text-muted h-full">
                <div
                  className="rounded-full flex items-center justify-center mb-3"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Package size={22} className="text-secondary" />
                </div>
                <div className="font-bold text-primary text-base mb-1">
                  No Route Stops Assigned
                </div>
                <div className="text-xs text-muted max-w-xs">
                  No corporate stops or trip records found for this driver in
                  the database.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5: Route Performance History & Analytics (Bottom Section) */}
      <div className="bg-surface border rounded-xl p-6 shadow-sm">
        <div
          className="flex items-center justify-between flex-wrap gap-4 mb-5 pb-3 border-b"
          style={{ paddingTop: "0.15rem" }}
        >
          <div>
            <h3 className="m-0 font-extrabold text-primary text-title-lg">
              Route Performance & Analytics
            </h3>
            <div className="text-sm text-muted mt-snug">
              Historical route records, daily earnings, and distance telemetry
            </div>
          </div>

          <div
            className="inline-flex bg-surface-elevated rounded-md border"
            style={{ padding: "3px" }}
          >
            {(["DAILY", "MONTHLY", "YEARLY"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setHistoryTab(tab)}
                className="border-0 rounded-sm text-sm font-bold cursor-pointer"
                style={{
                  background:
                    historyTab === tab ? "var(--brand-primary)" : "transparent",
                  color:
                    historyTab === tab ? "#ffffff" : "var(--text-secondary)",
                  padding: "0.35rem 0.85rem",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Section: Table on Left + Monthly Trajectory Graph on Right */}
        <div className="driver-earnings-analysis-grid grid gap-6">
          {/* Performance Table */}
          <div className="overflow-x-auto">
            <table
              className="w-full text-base"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr className="border-b text-left text-muted">
                  <th
                    className="font-bold"
                    style={{ padding: "0.6rem 0.75rem" }}
                  >
                    {historyTab === "DAILY"
                      ? "Period / Date"
                      : historyTab === "MONTHLY"
                        ? "Month"
                        : "Year"}
                  </th>
                  <th
                    className="font-bold text-center"
                    style={{ padding: "0.6rem 0.75rem" }}
                  >
                    Distance
                  </th>
                  <th
                    className="font-bold text-center"
                    style={{ padding: "0.6rem 0.75rem" }}
                  >
                    Orders
                  </th>
                  <th
                    className="font-bold text-center"
                    style={{ padding: "0.6rem 0.75rem" }}
                  >
                    Completed
                  </th>
                  <th
                    className="font-bold text-right"
                    style={{ padding: "0.6rem 0.75rem" }}
                  >
                    Total Earnings
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyTab === "DAILY" && (
                  <>
                    {filteredStops.length > 0 ? (
                      filteredStops.map((stop, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-subtle"
                          style={{
                            background:
                              idx % 2 === 0 ? "transparent" : "var(--bg-base)",
                          }}
                        >
                          <td
                            className="font-semibold text-primary"
                            style={{ padding: "0.65rem 0.75rem" }}
                          >
                            {stop.date}{" "}
                            <span className="text-muted text-caption">
                              ({stop.day})
                            </span>
                          </td>
                          <td
                            className="text-center text-secondary"
                            style={{ padding: "0.65rem 0.75rem" }}
                          >
                            {stop.distanceKm} km
                          </td>
                          <td
                            className="text-center"
                            style={{ padding: "0.65rem 0.75rem" }}
                          >
                            1
                          </td>
                          <td
                            className="text-center"
                            style={{ padding: "0.65rem 0.75rem" }}
                          >
                            <span
                              className="rounded-full font-bold text-sm"
                              style={{
                                padding: "0.15rem 0.45rem",
                                background:
                                  stop.orderStatus === "COMPLETED"
                                    ? "var(--color-success-bg)"
                                    : "transparent",
                                color:
                                  stop.orderStatus === "COMPLETED"
                                    ? "var(--color-success)"
                                    : "var(--text-muted)",
                              }}
                            >
                              {stop.orderStatus === "COMPLETED" ? "1" : "0"}
                            </span>
                          </td>
                          <td
                            className="text-right font-bold text-success"
                            style={{ padding: "0.65rem 0.75rem" }}
                          >
                            {formatCurrency(stop.driverEarnings)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-muted"
                        >
                          <div className="font-bold text-secondary text-sm mb-1">
                            No Trip Records Found
                          </div>
                          <div className="text-caption text-muted">
                            Zero trip records available for this driver.
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}

                {historyTab === "MONTHLY" &&
                  monthlyPerformance.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-subtle"
                      style={{
                        background:
                          idx % 2 === 0 ? "transparent" : "var(--bg-base)",
                      }}
                    >
                      <td
                        className="font-semibold text-primary"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {row.month}
                      </td>
                      <td
                        className="text-center text-secondary"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {row.distance} km
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {row.totalOrders}
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        <span
                          className="rounded-full font-bold text-sm"
                          style={{
                            padding: "0.15rem 0.45rem",
                            background:
                              row.completedOrders > 0
                                ? "var(--color-success-bg)"
                                : "transparent",
                            color:
                              row.completedOrders > 0
                                ? "var(--color-success)"
                                : "var(--text-muted)",
                          }}
                        >
                          {row.completedOrders}
                        </span>
                      </td>
                      <td
                        className="text-right font-bold text-success"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {formatCurrency(row.earnings)}
                      </td>
                    </tr>
                  ))}

                {historyTab === "YEARLY" &&
                  yearlyPerformance.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-subtle"
                      style={{
                        background:
                          idx % 2 === 0 ? "transparent" : "var(--bg-base)",
                      }}
                    >
                      <td
                        className="font-bold text-primary"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {row.year}
                      </td>
                      <td
                        className="text-center text-secondary"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {row.distance} km
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {row.totalOrders}
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        <span
                          className="rounded-full font-bold text-sm"
                          style={{
                            padding: "0.15rem 0.45rem",
                            background:
                              row.completedOrders > 0
                                ? "var(--color-success-bg)"
                                : "transparent",
                            color:
                              row.completedOrders > 0
                                ? "var(--color-success)"
                                : "var(--text-muted)",
                          }}
                        >
                          {row.completedOrders}
                        </span>
                      </td>
                      <td
                        className="text-right font-bold text-success"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {formatCurrency(row.earnings)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Interactive Graph (Monthly Earnings & Distance Travelled) */}
          <div
            className="bg-surface-elevated border rounded-lg p-5 flex flex-col relative"
            style={{ minHeight: "260px" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-md text-primary">
                Earnings & Distance Trajectory ({yearFilter})
              </span>
              <div className="flex gap-tight">
                {[2026, 2025].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setYearFilter(yr)}
                    className="border rounded-sm font-bold cursor-pointer text-label"
                    style={{
                      background:
                        yearFilter === yr
                          ? "var(--brand-primary)"
                          : "transparent",
                      color:
                        yearFilter === yr ? "#ffffff" : "var(--text-secondary)",
                      padding: "0.2rem 0.5rem",
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div
              className="flex-1 relative w-full"
              style={{ minHeight: "180px" }}
            >
              <svg
                viewBox="0 0 460 180"
                className="w-full h-full"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="earnBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--text-brand)"
                      stopOpacity="0.85"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--brand-purple-text)"
                      stopOpacity="0.25"
                    />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 0.5, 1].map((pct, idx) => {
                  const y = 150 - pct * 120;
                  const val = Math.round(chartMaxEarnings * pct);
                  return (
                    <g key={idx}>
                      <line
                        x1="35"
                        y1={y}
                        x2="435"
                        y2={y}
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x="30"
                        y={y + 3}
                        textAnchor="end"
                        fontSize="8.5"
                        fill="var(--text-muted)"
                      >
                        {val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`}
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Earnings */}
                {monthlyPerformance.map((m, idx) => {
                  const colW = (400 - 35) / 12;
                  const x = 45 + idx * colW;
                  const barH =
                    hasTrajectoryData && m.earnings > 0
                      ? Math.max(
                          3,
                          (m.earnings / chartMaxEarnings) * 120,
                        )
                      : 0;
                  const y = 150 - barH;
                  const isHovered = hoveredGraphPoint === idx;

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredGraphPoint(idx)}
                      onMouseLeave={() => setHoveredGraphPoint(null)}
                      className="cursor-pointer"
                    >
                      {barH > 0 ? (
                        <rect
                          x={x}
                          y={y}
                          width="12"
                          height={barH}
                          rx="2"
                          fill={
                            isHovered
                              ? "var(--brand-orange)"
                              : "url(#earnBarGrad)"
                          }
                        />
                      ) : (
                        <rect
                          x={x}
                          y={148}
                          width="12"
                          height="2"
                          rx="1"
                          fill="var(--border)"
                        />
                      )}
                      <text
                        x={x + 6}
                        y="165"
                        textAnchor="middle"
                        fontSize="8"
                        fill="var(--text-muted)"
                      >
                        {m.monthShort}
                      </text>
                    </g>
                  );
                })}

                {/* Line for Distance (km) */}
                {hasTrajectoryData && (
                  <path
                    d={monthlyPerformance
                      .map((m, idx) => {
                        const colW = (400 - 35) / 12;
                        const x = 45 + idx * colW + 6;
                        const y =
                          150 - (m.distance / chartMaxDistance) * 120;
                        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#FF5F09"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>

              {/* Empty state overlay when no monthly trajectory activity exists */}
              {!hasTrajectoryData && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4 rounded-lg"
                  style={{
                    background:
                      "rgba(var(--bg-surface-rgb, 255, 255, 255), 0.7)",
                    backdropFilter: "blur(1.5px)",
                  }}
                >
                  <span className="text-sm font-bold text-primary mb-1">
                    No Operational Activity in {yearFilter}
                  </span>
                  <span className="text-caption text-muted max-w-xs">
                    Monthly earnings and distance telemetry will update
                    automatically when trips are completed.
                  </span>
                </div>
              )}

              {/* Tooltip */}
              {hoveredGraphPoint !== null && (
                <div
                  className="absolute rounded-md pointer-events-none text-label"
                  style={{
                    top: "10px",
                    right: "10px",
                    background: "var(--text-primary)",
                    color: "#ffffff",
                    padding: "0.45rem 0.75rem",
                    lineHeight: "1.4",
                  }}
                >
                  <div className="font-extrabold">
                    {monthlyPerformance[hoveredGraphPoint].month}
                  </div>
                  <div>
                    Earnings:{" "}
                    {formatCurrency(
                      monthlyPerformance[hoveredGraphPoint].earnings,
                    )}
                  </div>
                  <div>
                    Distance: {monthlyPerformance[hoveredGraphPoint].distance}{" "}
                    km
                  </div>
                  <div>
                    Orders:{" "}
                    {monthlyPerformance[hoveredGraphPoint].totalOrders}
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 text-secondary text-label">
              <div className="flex items-center gap-tight">
                <span
                  className="bg-brand"
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                  }}
                />
                <span>Monthly Driver Earnings (₹)</span>
              </div>
              <div className="flex items-center gap-tight">
                <span
                  style={{
                    width: "10px",
                    height: "2px",
                    background: "#FF5F09",
                  }}
                />
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
        <div className="p-12 text-center text-muted">
          Loading Driver Route & Earnings Tracking...
        </div>
      }
    >
      <RouteEarningsContent />
    </Suspense>
  );
}
