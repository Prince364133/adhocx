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
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  actualTravelTimeMins: number | null;
  scheduledTime: string | null;
  arrivalTime: string | null;
  departureTime: string | null;
  orderStatus: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "CANCELLED";
  orderAmount: number;
  driverEarnings: number;
  date: string;
  day: string;
  year: number;
  monthIndex: number;
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

const formatCurrency = (amt: number) =>
  "₹" + Math.round(amt).toLocaleString("en-IN");

function _haversineDistanceKm(
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


function formatTimeOrNull(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeStopStatus(
  status?: string | null,
): RouteStop["orderStatus"] {
  const upper = String(status || "").toUpperCase();
  if (upper === "COMPLETED" || upper === "FULFILLED") return "COMPLETED";
  if (
    upper === "IN_PROGRESS" ||
    upper === "STARTED" ||
    upper === "ARRIVED" ||
    upper === "EN_ROUTE"
  ) {
    return "IN_PROGRESS";
  }
  if (upper === "CANCELLED" || upper === "NO_SHOW") return "CANCELLED";
  return "PENDING";
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
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
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

  // Extract real route stops strictly from API trip records and corporate routes
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
      const corpName = tenant.companyName || tenant.name || "Corporate Fleet";
      const rawDate = route.shiftDate || route.createdAt;
      const parsedDate = rawDate ? new Date(rawDate) : null;
      const validDate =
        parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

      const dateStr = validDate
        ? validDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
      const dayStr = validDate
        ? validDate
            .toLocaleDateString("en-IN", { weekday: "long" })
            .toUpperCase()
        : "";

      const year = validDate ? validDate.getFullYear() : currentYear;
      const monthIndex = validDate ? validDate.getMonth() : -1;

      const routeStops: any[] = Array.isArray(route.stops) ? route.stops : [];
      routeStops.forEach((s: any) => {
        const pLat = toFiniteNumber(s.latitude);
        const pLng = toFiniteNumber(s.longitude);
        const isDelivery = s.stopType === "DROP" || s.stopType === "DELIVERY";
        const distKm = route.estDistanceMeters
          ? Math.round((Number(route.estDistanceMeters) / 1000) * 10) / 10
          : null;

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
          actualTravelTimeMins: actualMins,
          scheduledTime: formatTimeOrNull(s.plannedEta),
          arrivalTime: formatTimeOrNull(s.actualArrivalTime),
          departureTime: formatTimeOrNull(s.actualDepartureTime),
          orderStatus: normalizeStopStatus(s.status || route.status),
          orderAmount: 0,
          driverEarnings: 0,
          date: dateStr,
          day: dayStr,
          year,
          monthIndex,
          passengerCount: 1,
        });
      });
    });

    // 2. Process real commercial trips
    const commercialStops = actualTrips.map((trip: any, idx: number) => {
      const req = trip.requirement || {};
      const vendor = trip.vendor || req.vendor || {};
      const corpName =
        vendor.organizationName ||
        vendor.companyName ||
        vendor.contactPerson ||
        "—";

      const rawDate =
        trip.completedAt ||
        trip.startedAt ||
        trip.reportingTime ||
        trip.createdAt;
      const parsedDate = rawDate ? new Date(rawDate) : null;
      const validDate =
        parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

      const dateStr = validDate
        ? validDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
      const dayStr = validDate
        ? validDate
            .toLocaleDateString("en-IN", { weekday: "long" })
            .toUpperCase()
        : "";

      const lat =
        toFiniteNumber(req.pickupLat) ?? toFiniteNumber(trip.pickupLat);
      const lng =
        toFiniteNumber(req.pickupLng) ?? toFiniteNumber(trip.pickupLng);

      const directDistanceKm =
        toFiniteNumber(trip.actualDistanceKm) ??
        toFiniteNumber(trip.distanceKm) ??
        toFiniteNumber(req.estimatedDistanceKm);
      const distanceMeters =
        toFiniteNumber(trip.distanceMeters) ??
        toFiniteNumber(req.distanceMeters) ??
        toFiniteNumber(req.pricing?.distanceM);
      const distanceKm =
        directDistanceKm !== null
          ? Math.round(directDistanceKm * 10) / 10
          : distanceMeters !== null
            ? Math.round((distanceMeters / 1000) * 10) / 10
            : null;

      let actualTravelTimeMins: number | null = null;
      if (trip.startedAt && trip.completedAt) {
        const startMs = new Date(trip.startedAt).getTime();
        const endMs = new Date(trip.completedAt).getTime();
        if (
          Number.isFinite(startMs) &&
          Number.isFinite(endMs) &&
          endMs >= startMs
        ) {
          actualTravelTimeMins = Math.round((endMs - startMs) / 60000);
        }
      }

      const earnings = Number(trip.totalDriverEarnings ?? trip.driverRate ?? 0);
      const orderAmt = Number(req.totalAmount ?? 0);

      return {
        id: String(trip.id || `trip_${idx}`),
        stopNumber: idx + 1,
        type: "PICKUP" as const,
        corporateName: corpName,
        pickupLocation: trip.pickupAddress || req.pickupAddress || "—",
        deliveryLocation: trip.dropAddress || req.dropAddress || "—",
        latitude: lat,
        longitude: lng,
        distanceKm,
        actualTravelTimeMins,
        scheduledTime: formatTimeOrNull(trip.reportingTime || req.reportingTime),
        arrivalTime: formatTimeOrNull(trip.startedAt),
        departureTime: formatTimeOrNull(trip.completedAt),
        orderStatus: normalizeStopStatus(trip.status),
        orderAmount: Number.isFinite(orderAmt) ? orderAmt : 0,
        driverEarnings: Number.isFinite(earnings) ? earnings : 0,
        date: dateStr,
        day: dayStr,
        year: validDate ? validDate.getFullYear() : 0,
        monthIndex: validDate ? validDate.getMonth() : -1,
        passengerCount: req.quantity ?? undefined,
      };
    });

    return [...stops, ...commercialStops];
  }, [currentDriver]);

  // Unique corporate names for filter dropdown
  const uniqueCorporates = useMemo(() => {
    const set = new Set<string>();
    rawStops.forEach((s) => {
      if (s.corporateName && s.corporateName !== "—") {
        set.add(s.corporateName);
      }
    });
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

  // Summary Metrics (strictly from real stops)
  const summaryMetrics = useMemo(() => {
    const totalOrders = filteredStops.length;
    const completedTrips = filteredStops.filter(
      (s) => s.orderStatus === "COMPLETED",
    ).length;
    const totalDistance = filteredStops.reduce(
      (sum, s) => sum + (s.distanceKm ?? 0),
      0,
    );
    const totalEarnings = filteredStops.reduce(
      (sum, s) => sum + s.driverEarnings,
      0,
    );
    const totalActualMins = filteredStops.reduce(
      (sum, s) => sum + (s.actualTravelTimeMins ?? 0),
      0,
    );
    const activeHours = (totalActualMins / 60).toFixed(1);

    return {
      totalOrders,
      completedTrips,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalEarnings,
      activeHours,
    };
  }, [filteredStops]);

  // Real monthly analytics aggregated from fetched trips for yearFilter
  const monthlyPerformance = useMemo(() => {
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
      const monthStops = rawStops.filter(
        (s) => s.year === yearFilter && s.monthIndex === idx,
      );
      const earnings = monthStops.reduce((sum, s) => sum + s.driverEarnings, 0);
      const distance =
        Math.round(
          monthStops.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0) * 10,
        ) / 10;
      const completed = monthStops.filter(
        (s) => s.orderStatus === "COMPLETED",
      ).length;
      return {
        month: `${monthName} ${yearFilter}`,
        monthShort: monthName,
        orders: monthStops.length,
        completed,
        earnings,
        distance,
      };
    });
  }, [rawStops, yearFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear - 1]);
    rawStops.forEach((s) => {
      if (s.year > 0) years.add(s.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [rawStops, currentYear]);

  const yearlyPerformance = useMemo(() => {
    return availableYears.map((yr) => {
      const yrStops = rawStops.filter((s) => s.year === yr);
      const earnings = yrStops.reduce((sum, s) => sum + s.driverEarnings, 0);
      const distance =
        Math.round(
          yrStops.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0) * 10,
        ) / 10;
      const completed = yrStops.filter(
        (s) => s.orderStatus === "COMPLETED",
      ).length;
      return {
        year: yr,
        orders: yrStops.length,
        completed,
        earnings,
        distance,
      };
    });
  }, [rawStops, availableYears]);

  // Stops that have valid GPS coordinates
  const mappableStops = useMemo(
    () =>
      filteredStops.filter(
        (s): s is RouteStop & { latitude: number; longitude: number } =>
          s.latitude !== null && s.longitude !== null,
      ),
    [filteredStops],
  );

  const liveGpsPoint = useMemo(() => {
    const lat = toFiniteNumber(currentDriver?.currentLat);
    const lng = toFiniteNumber(currentDriver?.currentLng);
    if (lat === null || lng === null) return null;
    return { lat, lng };
  }, [currentDriver]);

  // Project latitude/longitude dynamically from real coordinates
  const mapWidth = 620;
  const mapHeight = 420;
  const mapPadding = 45;

  const mapBounds = useMemo(() => {
    const pts: Array<{ lat: number; lng: number }> = mappableStops.map((s) => ({
      lat: s.latitude,
      lng: s.longitude,
    }));
    if (liveGpsPoint) pts.push(liveGpsPoint);
    if (pts.length === 0) return null;

    let minLat = Math.min(...pts.map((p) => p.lat));
    let maxLat = Math.max(...pts.map((p) => p.lat));
    let minLng = Math.min(...pts.map((p) => p.lng));
    let maxLng = Math.max(...pts.map((p) => p.lng));

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const latPad = latSpan > 0 ? latSpan * 0.15 : 0.01;
    const lngPad = lngSpan > 0 ? lngSpan * 0.15 : 0.01;

    minLat -= latPad;
    maxLat += latPad;
    minLng -= lngPad;
    maxLng += lngPad;

    return { minLat, maxLat, minLng, maxLng };
  }, [mappableStops, liveGpsPoint]);

  const projectCoords = (lat: number, lng: number) => {
    if (!mapBounds) {
      return { x: mapWidth / 2, y: mapHeight / 2 };
    }
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
      ((clampedLng - mapBounds.minLng) /
        (mapBounds.maxLng - mapBounds.minLng || 1)) *
        (mapWidth - mapPadding * 2);

    const y =
      mapHeight -
      mapPadding -
      ((clampedLat - mapBounds.minLat) /
        (mapBounds.maxLat - mapBounds.minLat || 1)) *
        (mapHeight - mapPadding * 2);

    return { x, y };
  };

  // Driver Live Marker Coordinates (real GPS only)
  const driverLiveCoords = useMemo(() => {
    if (!liveGpsPoint || !mapBounds) return null;
    return projectCoords(liveGpsPoint.lat, liveGpsPoint.lng);
  }, [liveGpsPoint, mapBounds]);

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

      {/* Driver Identity Card & Live Telemetry Banner */}
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
                <span
                  className={`inline-flex items-center rounded-full font-bold gap-tight text-label ${
                    liveGpsPoint
                      ? "bg-success-subtle text-success"
                      : "bg-surface-elevated text-muted"
                  }`}
                  style={{
                    padding: "0.15rem 0.55rem",
                    border: `1px solid ${
                      liveGpsPoint
                        ? "var(--color-success-border)"
                        : "var(--border-light)"
                    }`,
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: "7px",
                      height: "7px",
                      background: liveGpsPoint
                        ? "var(--color-success)"
                        : "var(--text-muted)",
                    }}
                  />
                  {liveGpsPoint ? "Live GPS Active" : "No Live GPS"}
                </span>
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
                    {currentDriver.averageRating != null
                      ? currentDriver.averageRating.toFixed(1)
                      : "—"}
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
            subtext: "Assigned corporate stops",
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
        {/* LEFT: Large Interactive Route Map (Matching Image 2) */}
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

            {/* Map Controls (+ / - zoom, reset view) */}
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
              {mappableStops.length > 1 && (
                <>
                  {/* Glowing Underlay */}
                  <path
                    d={mappableStops
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
                    d={mappableStops
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

              {/* Driver Live Marker with Pulsating Halo */}
              {driverLiveCoords && (
                <g
                  transform={`translate(${driverLiveCoords.x}, ${driverLiveCoords.y})`}
                >
                  {/* Pulsating live radar ring */}
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
              {mappableStops.map((stop) => {
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

                    {/* Marker Label (Stop Number or Flag) */}
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

            {mappableStops.length === 0 && !driverLiveCoords && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none"
                style={{ color: "#94A3B8" }}
              >
                <Route size={28} style={{ opacity: 0.5, marginBottom: "0.5rem" }} />
                <div className="font-bold text-base" style={{ color: "#E2E8F0" }}>
                  No route GPS telemetry recorded
                </div>
                <div className="text-sm mt-1">
                  {rawStops.length === 0
                    ? "This driver has no completed or assigned trips with GPS coordinates yet."
                    : "None of the matching trips include latitude/longitude coordinates."}
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
                    <span style={{ color: "#94A3B8" }}>Scheduled: </span>
                    <strong style={{ color: "#34D399" }}>
                      {activeFocusedStop.scheduledTime || "—"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#94A3B8" }}>Distance: </span>
                    <strong>
                      {activeFocusedStop.distanceKm != null
                        ? `${activeFocusedStop.distanceKm} km`
                        : "—"}
                    </strong>
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

        {/* RIGHT: Route Information Table & Detailed Stops (Matching Image 2) */}
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

          {/* Scrollable Stops List (Matching visual style of Image 2) */}
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
                      {/* Stop Title & Time (Image 2 style: "1. Corporate A - Pickup · 10:30 AM") */}
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
                        {isDelivery ? "Delivery" : "Trip"} •{" "}
                        {stop.scheduledTime || "—"}
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

                      {/* Detailed Metric Badges */}
                      <div
                        className="grid gap-2 pt-2 border-t border-subtle text-sm"
                        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                      >
                        <div>
                          <div className="text-muted">Distance</div>
                          <div className="font-bold text-primary">
                            {stop.distanceKm != null
                              ? `${stop.distanceKm} km`
                              : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted">Actual Time</div>
                          <div className="font-bold text-primary">
                            {stop.actualTravelTimeMins != null
                              ? `${stop.actualTravelTimeMins}m`
                              : "—"}
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
              <div className="py-12 px-6 text-center text-muted text-md">
                {rawStops.length === 0
                  ? "No trips have been recorded for this driver yet."
                  : "No stops match the selected filter criteria."}
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
        <div
          className="driver-earnings-analysis-grid grid gap-6"
        >
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
                    Period / Date
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
                {historyTab === "DAILY" &&
                  (filteredStops.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center text-muted"
                        style={{ padding: "2rem 0.75rem" }}
                      >
                        {rawStops.length === 0
                          ? "No trip records available for this driver."
                          : "No trips match the active filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredStops.map((stop, idx) => (
                      <tr
                        key={stop.id}
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
                          {stop.day && (
                            <span className="text-muted text-caption">
                              ({stop.day})
                            </span>
                          )}
                        </td>
                        <td
                          className="text-center text-secondary"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {stop.distanceKm != null ? `${stop.distanceKm} km` : "—"}
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
                  ))}
                {historyTab === "MONTHLY" &&
                  monthlyPerformance.map((m, idx) => (
                    <tr
                      key={m.month}
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
                        {m.month}
                      </td>
                      <td
                        className="text-center text-secondary"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {m.distance} km
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {m.orders}
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {m.completed}
                      </td>
                      <td
                        className="text-right font-bold text-success"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {formatCurrency(m.earnings)}
                      </td>
                    </tr>
                  ))}
                {historyTab === "YEARLY" &&
                  yearlyPerformance.map((y, idx) => (
                    <tr
                      key={y.year}
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
                        {y.year}
                      </td>
                      <td
                        className="text-center text-secondary"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {y.distance} km
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {y.orders}
                      </td>
                      <td
                        className="text-center"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {y.completed}
                      </td>
                      <td
                        className="text-right font-bold text-success"
                        style={{ padding: "0.65rem 0.75rem" }}
                      >
                        {formatCurrency(y.earnings)}
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
                {availableYears.map((yr) => (
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
            {(() => {
              const maxEarnings = Math.max(
                ...monthlyPerformance.map((m) => m.earnings),
                0,
              );
              const maxDistance = Math.max(
                ...monthlyPerformance.map((m) => m.distance),
                0,
              );
              const earningsScaleMax = maxEarnings > 0 ? maxEarnings : 1000;
              const distanceScaleMax = maxDistance > 0 ? maxDistance : 100;
              const hasAnyYearData = maxEarnings > 0 || maxDistance > 0;

              return (
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
                        <stop offset="0%" stopColor="var(--text-brand)" stopOpacity="0.85" />
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
                      const labelVal = Math.round(pct * earningsScaleMax);
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
                            {labelVal >= 1000
                              ? `₹${Math.round(labelVal / 1000)}k`
                              : `₹${labelVal}`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars for Earnings */}
                    {monthlyPerformance.map((m, idx) => {
                      const colW = (400 - 35) / 12;
                      const x = 45 + idx * colW;
                      const barH =
                        m.earnings > 0
                          ? Math.max(3, (m.earnings / earningsScaleMax) * 120)
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
                          {barH > 0 && (
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
                    {hasAnyYearData && (
                      <path
                        d={monthlyPerformance
                          .map((m, idx) => {
                            const colW = (400 - 35) / 12;
                            const x = 45 + idx * colW + 6;
                            const y =
                              150 - (m.distance / distanceScaleMax) * 120;
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

                  {!hasAnyYearData && (
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
                        Distance:{" "}
                        {monthlyPerformance[hoveredGraphPoint].distance} km
                      </div>
                      <div>
                        Orders:{" "}
                        {monthlyPerformance[hoveredGraphPoint].orders}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 text-secondary text-label">
              <div className="flex items-center gap-tight">
                <span
                  className="bg-brand"
                  style={{ width: "10px", height: "10px", borderRadius: "2px" }}
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
