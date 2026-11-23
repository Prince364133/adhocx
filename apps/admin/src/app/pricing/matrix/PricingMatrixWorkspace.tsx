'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Route,
  ArrowLeft,
  Car,
  Sparkles,
  Clock,
  Save,
  AlertTriangle,
  RotateCcw,
  Search,
  ChevronRight,
  ShieldCheck,
  Plus,
  Trash2,
  Settings,
} from 'lucide-react';
import { adminApi } from '@/lib/api/client';
import {
  DistancePricingPlan,
  CreatePricingSlabInput,
  VehicleCategory,
  DistanceSimulationResult,
  PeakHourWindow,
} from '@/lib/api/types';
import { Card, Button, StatusBadge, BottomSheet } from '@/components/common';
import { VehicleCategoriesDrawer } from '../VehicleCategoriesDrawer';

export type MatrixRole = 'vendor' | 'driver' | 'unified';

interface PricingMatrixWorkspaceProps {
  initialRole?: MatrixRole;
}

const inr = (rupees: number | undefined) => `₹${Number(rupees ?? 0).toLocaleString('en-IN')}`;

function computeTimeDuration(start: string, end: string): string {
  if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return '--';
  }
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // overnight window crossing midnight
  }
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (minutes === 0) return `${hours} hrs 00 mins`;
  return `${hours} hrs ${minutes < 10 ? '0' : ''}${minutes} mins`;
}

interface PeakSlotVehicleSurcharge {
  vehicleType: string;
  vendorBaseExtra: number;
  vendorStepExtra: number;
  driverBaseExtra: number;
  driverStepExtra: number;
}

interface PeakSlotWindow {
  id: string;
  label: string;
  start: string;
  end: string;
  vehicleSurges: PeakSlotVehicleSurcharge[];
}

function getCategoryPeakWindows(slots: PeakSlotWindow[], category: string): PeakHourWindow[] {
  if (!slots || slots.length === 0) return [];
  const result: PeakHourWindow[] = [];

  // First collect windows where this vehicle category is explicitly configured
  slots.forEach((slot) => {
    const match = slot.vehicleSurges.find((s) => s.vehicleType === category);
    const hasSurge = match
      ? (match.vendorBaseExtra > 0 || match.vendorStepExtra > 0 || match.driverBaseExtra > 0 || match.driverStepExtra > 0)
      : false;
    if (hasSurge || slot.vehicleSurges.length === 0) {
      if (!result.some((w) => w.start === slot.start && w.end === slot.end)) {
        result.push({ label: slot.label, start: slot.start, end: slot.end });
      }
    }
  });

  // If no category-specific match has positive surge, fallback to unique slots
  if (result.length === 0 && slots.length > 0) {
    slots.forEach((slot) => {
      if (!result.some((w) => w.start === slot.start && w.end === slot.end)) {
        result.push({ label: slot.label, start: slot.start, end: slot.end });
      }
    });
  }

  return result;
}

export default function PricingMatrixWorkspace({ initialRole = 'vendor' }: PricingMatrixWorkspaceProps) {
  const [role] = useState<MatrixRole>(initialRole);
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Selected Vehicle Chip filter (Concrete vehicles only, no 'ALL')
  const [selectedVehicleChip, setSelectedVehicleChip] = useState<string>('SEDAN');

  // Slabs & Overrides State
  const [editingSlabs, setEditingSlabs] = useState<CreatePricingSlabInput[]>([]);
  const [overriddenSlabKeys, setOverriddenSlabKeys] = useState<Set<string>>(new Set());

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Vehicle Categories & Fleet Capacities Drawer
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);

  // Bottom Sheet 1: Configure Pricing
  const [isConfigureSheetOpen, setIsConfigureSheetOpen] = useState(false);
  const [genVehicleType, setGenVehicleType] = useState<string>('SEDAN');
  const [genBaseKm, setGenBaseKm] = useState<number>(10);
  const [genStepKm, setGenStepKm] = useState<number>(10);
  const [genMaxKm, setGenMaxKm] = useState<number>(200);

  // Vendor Independent Geometry & Rates
  const [genVendorBaseKm, setGenVendorBaseKm] = useState<number>(10);
  const [genVendorStepKm, setGenVendorStepKm] = useState<number>(10);
  const [genBaseVendor, setGenBaseVendor] = useState<number | ''>('');
  const [genStepVendor, setGenStepVendor] = useState<number | ''>('');

  // Driver Independent Geometry & Rates
  const [genDriverBaseKm, setGenDriverBaseKm] = useState<number>(10);
  const [genDriverStepKm, setGenDriverStepKm] = useState<number>(10);
  const [genBaseDriver, setGenBaseDriver] = useState<number | ''>('');
  const [genStepDriver, setGenStepDriver] = useState<number | ''>('');

  // Security Escort Pricing (Vendor only)
  const [genEscortBaseVendor, setGenEscortBaseVendor] = useState<number | ''>('');
  const [genEscortStepVendor, setGenEscortStepVendor] = useState<number | ''>('');

  // Bottom Sheet 2: Multiple Peak Timings
  const [isPeakSheetOpen, setIsPeakSheetOpen] = useState(false);
  const [peakSlots, setPeakSlots] = useState<PeakSlotWindow[]>([]);

  // Current active peak surge for the active plan
  const [currentVendorPeakBase, setCurrentVendorPeakBase] = useState<number>(0);
  const [currentVendorPeakStep, setCurrentVendorPeakStep] = useState<number>(0);
  const [currentDriverPeakBase, setCurrentDriverPeakBase] = useState<number>(0);
  const [currentDriverPeakStep, setCurrentDriverPeakStep] = useState<number>(0);

  // Simulation State
  const [simDistanceKm, setSimDistanceKm] = useState<number>(25);
  const [simTimeOfDay, setSimTimeOfDay] = useState<string>('09:30');
  const [simIncludeEscort, setSimIncludeEscort] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<DistanceSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Per-slab Security Escort overrides (Vendor client add-on)
  const [slabEscorts, setSlabEscorts] = useState<Record<string, number>>({});

  // Load Plans and Categories
  const loadPlans = useCallback(async (preferredPlanId?: string) => {
    setLoading(true);
    try {
      const [plansData, catsData] = await Promise.all([
        adminApi.getDistancePricingPlans(),
        adminApi.getPricingTiers().catch(() => [] as VehicleCategory[]),
      ]);
      setPlans(plansData);
      setVehicleCategories(catsData);

      // Determine available concrete vehicle chips (no 'ALL')
      const validChips: string[] = [];
      catsData.forEach((vc) => {
        const t = vc.vehicleType?.trim().toUpperCase();
        if (t && t !== 'ALL' && !validChips.includes(t)) validChips.push(t);
      });
      plansData.forEach((p) => {
        const t = p.vehicleCategory?.trim().toUpperCase();
        if (t && t !== 'ALL' && !validChips.includes(t)) validChips.push(t);
      });
      if (validChips.length === 0) validChips.push('SEDAN', 'SUV', 'HATCHBACK');

      const initialChip =
        selectedVehicleChip && selectedVehicleChip !== 'ALL' && validChips.includes(selectedVehicleChip)
          ? selectedVehicleChip
          : validChips[0];

      setSelectedVehicleChip(initialChip);
      setGenVehicleType(initialChip);

      const planToSelect =
        (preferredPlanId && plansData.find((p) => p.id === preferredPlanId && p.vehicleCategory === initialChip)) ||
        plansData.find((p) => p.vehicleCategory === initialChip && p.status === 'ACTIVE') ||
        plansData.find((p) => p.vehicleCategory === initialChip);

      if (planToSelect) {
        setSelectedPlanId(planToSelect.id);
        initFromPlan(planToSelect, initialChip);
      } else {
        setSelectedPlanId('');
        setEditingSlabs([]);
        setSlabEscorts({});
        setOverriddenSlabKeys(new Set());
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to load pricing data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  function buildRoleSlabs(
    baseKm: number,
    stepKm: number,
    maxKm: number,
    baseRate: number,
    stepRate: number,
    peakBase: number,
    peakStep: number,
    roleType: 'vendor' | 'driver'
  ): CreatePricingSlabInput[] {
    const slabs: CreatePricingSlabInput[] = [];
    const bKm = Math.max(0.1, baseKm);
    const sKm = Math.max(0.1, stepKm);
    const mKm = Math.max(bKm, maxKm);

    // Base slab
    const basePricePaise = Math.max(100, Math.round(baseRate * 100));
    const basePeakPaise = Math.max(basePricePaise, Math.round((baseRate + peakBase) * 100));
    slabs.push({
      minDistanceMExclusive: 0,
      maxDistanceMInclusive: Math.round(bKm * 1000),
      vendorPricePaise: roleType === 'vendor' ? basePricePaise : 100,
      driverPayoutPaise: roleType === 'driver' ? basePricePaise : 100,
      vendorPeakPricePaise: roleType === 'vendor' ? basePeakPaise : 100,
      driverPeakPayoutPaise: roleType === 'driver' ? basePeakPaise : 100,
      active: true,
    });

    let currentKm = bKm;
    let stepIndex = 1;
    while (currentKm < mKm) {
      const nextKm = Number(Math.min(mKm, currentKm + sKm).toFixed(2));
      const stepPricePaise = Math.max(100, Math.round((baseRate + stepIndex * stepRate) * 100));
      const stepPeakPaise = Math.max(stepPricePaise, Math.round((baseRate + peakBase + stepIndex * (stepRate + peakStep)) * 100));

      slabs.push({
        minDistanceMExclusive: Math.round(currentKm * 1000),
        maxDistanceMInclusive: Math.round(nextKm * 1000),
        vendorPricePaise: roleType === 'vendor' ? stepPricePaise : 100,
        driverPayoutPaise: roleType === 'driver' ? stepPricePaise : 100,
        vendorPeakPricePaise: roleType === 'vendor' ? stepPeakPaise : 100,
        driverPeakPayoutPaise: roleType === 'driver' ? stepPeakPaise : 100,
        active: true,
      });

      currentKm = nextKm;
      stepIndex++;
    }

    return slabs;
  }

  function synthesizeCompositeSlabs(
    vSlabs: CreatePricingSlabInput[],
    dSlabs: CreatePricingSlabInput[],
    maxKm: number
  ): CreatePricingSlabInput[] {
    const breakpointsSet = new Set<number>();
    breakpointsSet.add(0);
    breakpointsSet.add(maxKm);

    vSlabs.forEach((s) => {
      breakpointsSet.add(s.minDistanceMExclusive / 1000);
      breakpointsSet.add(s.maxDistanceMInclusive / 1000);
    });
    dSlabs.forEach((s) => {
      breakpointsSet.add(s.minDistanceMExclusive / 1000);
      breakpointsSet.add(s.maxDistanceMInclusive / 1000);
    });

    const sortedKm = Array.from(breakpointsSet).filter((k) => k >= 0 && k <= maxKm).sort((a, b) => a - b);
    const composite: CreatePricingSlabInput[] = [];

    for (let i = 1; i < sortedKm.length; i++) {
      const minKm = sortedKm[i - 1];
      const maxKmBand = sortedKm[i];
      const minM = Math.round(minKm * 1000);
      const maxM = Math.round(maxKmBand * 1000);
      const testM = (minM + maxM) / 2;

      const vMatch = vSlabs.find((s) => testM > s.minDistanceMExclusive && testM <= s.maxDistanceMInclusive) || vSlabs[vSlabs.length - 1];
      const dMatch = dSlabs.find((s) => testM > s.minDistanceMExclusive && testM <= s.maxDistanceMInclusive) || dSlabs[dSlabs.length - 1];

      let vStd = vMatch ? Math.max(100, vMatch.vendorPricePaise) : 100;
      const dStd = dMatch ? Math.max(100, dMatch.driverPayoutPaise) : 100;
      let vPeak = vMatch ? Math.max(vStd, vMatch.vendorPeakPricePaise ?? vStd) : vStd;
      const dPeak = dMatch ? Math.max(dStd, dMatch.driverPeakPayoutPaise ?? dStd) : dStd;

      if (vStd < dStd) vStd = dStd;
      if (vPeak < dPeak) vPeak = dPeak;

      composite.push({
        minDistanceMExclusive: minM,
        maxDistanceMInclusive: maxM,
        vendorPricePaise: vStd,
        driverPayoutPaise: dStd,
        vendorPeakPricePaise: vPeak,
        driverPeakPayoutPaise: dPeak,
        active: true,
      });
    }

    return composite;
  }

  function initFromPlan(plan: DistancePricingPlan, fallbackVehicle?: string) {
    const currentCat = (plan.vehicleCategory && plan.vehicleCategory !== 'ALL')
      ? plan.vehicleCategory
      : fallbackVehicle || selectedVehicleChip || 'SEDAN';

    setSelectedVehicleChip(currentCat);
    setGenVehicleType(currentCat);

    // Hydrate parameters if stored in rateConfigJson
    const cfg = (plan as any).rateConfigJson || plan.config;
    if (cfg && typeof cfg === 'object') {
      const vB = typeof cfg.vendorBaseKm === 'number' && cfg.vendorBaseKm > 0 ? cfg.vendorBaseKm : (typeof cfg.baseKm === 'number' && cfg.baseKm > 0 ? cfg.baseKm : 10);
      const vS = typeof cfg.vendorStepKm === 'number' && cfg.vendorStepKm > 0 ? cfg.vendorStepKm : (typeof cfg.stepKm === 'number' && cfg.stepKm > 0 ? cfg.stepKm : 10);
      const dB = typeof cfg.driverBaseKm === 'number' && cfg.driverBaseKm > 0 ? cfg.driverBaseKm : (typeof cfg.baseKm === 'number' && cfg.baseKm > 0 ? cfg.baseKm : 10);
      const dS = typeof cfg.driverStepKm === 'number' && cfg.driverStepKm > 0 ? cfg.driverStepKm : (typeof cfg.stepKm === 'number' && cfg.stepKm > 0 ? cfg.stepKm : 10);

      setGenVendorBaseKm(vB);
      setGenVendorStepKm(vS);
      setGenDriverBaseKm(dB);
      setGenDriverStepKm(dS);
      setGenBaseKm(role === 'driver' ? dB : vB);
      setGenStepKm(role === 'driver' ? dS : vS);

      const mKm = typeof cfg.maxKm === 'number' && cfg.maxKm > 0 ? cfg.maxKm : 200;
      setGenMaxKm(mKm);

      const numBaseVendor = typeof cfg.baseVendorRupees === 'number' ? cfg.baseVendorRupees : '';
      const numStepVendor = typeof cfg.stepVendorRupees === 'number' ? cfg.stepVendorRupees : '';
      const numBaseDriver = typeof cfg.baseDriverRupees === 'number' ? cfg.baseDriverRupees : '';
      const numStepDriver = typeof cfg.stepDriverRupees === 'number' ? cfg.stepDriverRupees : '';

      setGenBaseVendor(numBaseVendor);
      setGenStepVendor(numStepVendor);
      setGenBaseDriver(numBaseDriver);
      setGenStepDriver(numStepDriver);

      if (typeof cfg.escortBaseVendorRupees === 'number') setGenEscortBaseVendor(cfg.escortBaseVendorRupees);
      if (typeof cfg.escortStepVendorRupees === 'number') setGenEscortStepVendor(cfg.escortStepVendorRupees);

      let vPeakB = typeof cfg.vendorPeakExtraBaseRupees === 'number' ? cfg.vendorPeakExtraBaseRupees : 0;
      let vPeakS = typeof cfg.vendorPeakExtraStepRupees === 'number' ? cfg.vendorPeakExtraStepRupees : 0;
      let dPeakB = typeof cfg.driverPeakExtraBaseRupees === 'number' ? cfg.driverPeakExtraBaseRupees : 0;
      let dPeakS = typeof cfg.driverPeakExtraStepRupees === 'number' ? cfg.driverPeakExtraStepRupees : 0;

      if (Array.isArray(cfg.peakSlots)) {
        cfg.peakSlots.forEach((slot: any) => {
          const match = slot.vehicleSurges?.find((s: any) => s.vehicleType === currentCat);
          if (match) {
            if (match.vendorBaseExtra > 0) vPeakB = Math.max(vPeakB, match.vendorBaseExtra);
            if (match.vendorStepExtra > 0) vPeakS = Math.max(vPeakS, match.vendorStepExtra);
            if (match.driverBaseExtra > 0) dPeakB = Math.max(dPeakB, match.driverBaseExtra);
            if (match.driverStepExtra > 0) dPeakS = Math.max(dPeakS, match.driverStepExtra);
          }
        });
      }

      setCurrentVendorPeakBase(vPeakB);
      setCurrentVendorPeakStep(vPeakS);
      setCurrentDriverPeakBase(dPeakB);
      setCurrentDriverPeakStep(dPeakS);

      // Hydrate per-slab custom escort fee overrides
      if (cfg.slabEscorts && typeof cfg.slabEscorts === 'object') {
        setSlabEscorts(cfg.slabEscorts);
      } else {
        setSlabEscorts({});
      }

      // Hydrate custom overrides set
      if (Array.isArray(cfg.overriddenSlabs)) {
        const keys = new Set<string>();
        cfg.overriddenSlabs.forEach((item: any) => {
          if (typeof item === 'string') keys.add(item);
          else if (typeof item?.minM === 'number' && typeof item?.maxM === 'number') {
            keys.add(`${item.minM}-${item.maxM}`);
          }
        });
        setOverriddenSlabKeys(keys);
      }

      // Determine editingSlabs strictly based on role
      if (role === 'vendor') {
        if (Array.isArray(cfg.vendorSlabs) && cfg.vendorSlabs.length > 0) {
          setEditingSlabs(cfg.vendorSlabs);
        } else if (Number(numBaseVendor) > 0) {
          setEditingSlabs(buildRoleSlabs(vB, vS, mKm, Number(numBaseVendor), Number(numStepVendor) || 0, vPeakB, vPeakS, 'vendor'));
        } else if (plan.slabs && plan.slabs.length > 0) {
          setEditingSlabs(plan.slabs.map((s) => ({ ...s, active: s.active !== false })));
        } else {
          setEditingSlabs([]);
        }
      } else if (role === 'driver') {
        if (Array.isArray(cfg.driverSlabs) && cfg.driverSlabs.length > 0) {
          setEditingSlabs(cfg.driverSlabs);
        } else if (Number(numBaseDriver) > 0) {
          setEditingSlabs(buildRoleSlabs(dB, dS, mKm, Number(numBaseDriver), Number(numStepDriver) || 0, dPeakB, dPeakS, 'driver'));
        } else if (plan.slabs && plan.slabs.length > 0) {
          setEditingSlabs(plan.slabs.map((s) => ({ ...s, active: s.active !== false })));
        } else {
          setEditingSlabs([]);
        }
      } else {
        if (plan.slabs && plan.slabs.length > 0) {
          setEditingSlabs(plan.slabs.map((s) => ({ ...s, active: s.active !== false })));
        } else {
          setEditingSlabs([]);
        }
      }
    } else {
      if (plan.slabs && plan.slabs.length > 0) {
        setEditingSlabs(plan.slabs.map((s) => ({ ...s, active: s.active !== false })));
      } else {
        setEditingSlabs([]);
      }
      setGenBaseVendor('');
      setGenStepVendor('');
      setGenBaseDriver('');
      setGenStepDriver('');
      setGenEscortBaseVendor('');
      setGenEscortStepVendor('');
      setCurrentVendorPeakBase(0);
      setCurrentVendorPeakStep(0);
      setCurrentDriverPeakBase(0);
      setCurrentDriverPeakStep(0);
      setSlabEscorts({});
      setOverriddenSlabKeys(new Set());
    }

    // Hydrate multiple peak windows from plan
    if (cfg && Array.isArray(cfg.peakSlots) && cfg.peakSlots.length > 0) {
      setPeakSlots(cfg.peakSlots);
    } else if (Array.isArray(plan.peakWindows) && plan.peakWindows.length > 0) {
      const hydratedSlots: PeakSlotWindow[] = plan.peakWindows.map((pw: any, idx: number) => ({
        id: `slot-${idx + 1}`,
        label: pw.label || `Peak Slot ${idx + 1}`,
        start: pw.start || '08:00',
        end: pw.end || '11:00',
        vehicleSurges: Array.isArray(pw.vehicleSurges) && pw.vehicleSurges.length > 0
          ? pw.vehicleSurges
          : [
              {
                vehicleType: currentCat,
                vendorBaseExtra: Number(cfg?.vendorPeakExtraBaseRupees) || 0,
                vendorStepExtra: Number(cfg?.vendorPeakExtraStepRupees) || 0,
                driverBaseExtra: Number(cfg?.driverPeakExtraBaseRupees) || 0,
                driverStepExtra: Number(cfg?.driverPeakExtraStepRupees) || 0,
              },
            ],
      }));
      setPeakSlots(hydratedSlots);
    } else {
      const planWithSlots = plans.find((p) => {
        const c = (p as any).rateConfigJson || p.config;
        return c && Array.isArray(c.peakSlots) && c.peakSlots.length > 0;
      });
      if (planWithSlots) {
        const c = (planWithSlots as any).rateConfigJson || planWithSlots.config;
        setPeakSlots(c.peakSlots);
      } else {
        setPeakSlots([]);
      }
    }
  }

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const activePlan = useMemo(
    () =>
      plans.find((p) => p.vehicleCategory === selectedVehicleChip && p.status === 'ACTIVE') ||
      plans.find((p) => p.vehicleCategory === selectedVehicleChip) ||
      (selectedPlanId ? plans.find((p) => p.id === selectedPlanId && p.vehicleCategory === selectedVehicleChip) : null) ||
      null,
    [plans, selectedPlanId, selectedVehicleChip]
  );

  // Available Vehicle Chips: Concrete vehicle types only (NO 'ALL')
  const availableVehicleChips = useMemo(() => {
    const list: string[] = [];
    vehicleCategories.forEach((vc) => {
      const type = vc.vehicleType?.trim().toUpperCase();
      if (type && type !== 'ALL' && !list.includes(type)) {
        list.push(type);
      }
    });
    plans.forEach((p) => {
      const type = p.vehicleCategory?.trim().toUpperCase();
      if (type && type !== 'ALL' && !list.includes(type)) {
        list.push(type);
      }
    });
    if (list.length === 0) {
      list.push('SEDAN', 'SUV', 'HATCHBACK');
    }
    return list;
  }, [vehicleCategories, plans]);

  // Handle vehicle chip switch
  const handleSelectVehicleChip = (chip: string) => {
    setSelectedVehicleChip(chip);
    setGenVehicleType(chip);
    const matchingPlan =
      plans.find((p) => p.vehicleCategory === chip && p.status === 'ACTIVE') ||
      plans.find((p) => p.vehicleCategory === chip);
    if (matchingPlan) {
      setSelectedPlanId(matchingPlan.id);
      initFromPlan(matchingPlan, chip);
    } else {
      setSelectedPlanId('');
      setEditingSlabs([]);
      setSlabEscorts({});
      setOverriddenSlabKeys(new Set());
      setGenBaseVendor('');
      setGenStepVendor('');
      setGenBaseDriver('');
      setGenStepDriver('');
      setGenEscortBaseVendor('');
      setGenEscortStepVendor('');
      setCurrentVendorPeakBase(0);
      setCurrentVendorPeakStep(0);
      setCurrentDriverPeakBase(0);
      setCurrentDriverPeakStep(0);
      setPeakSlots([]);
    }
  };

  // Helper for escort fee calculation per distance (Vendor only)
  const getEscortFeeForDistance = useCallback(
    (maxM: number) => {
      const vBase = genVendorBaseKm || genBaseKm || 10;
      const vStep = genVendorStepKm || genStepKm || 10;
      const baseM = vBase * 1000;
      const stepM = vStep * 1000;
      const steps = maxM > baseM ? Math.ceil((maxM - baseM) / stepM) : 0;
      const baseEscort = Number(genEscortBaseVendor) || 0;
      const stepEscort = Number(genEscortStepVendor) || 0;
      const vendorEscort = baseEscort + steps * stepEscort;
      return { vendorEscort };
    },
    [genVendorBaseKm, genVendorStepKm, genBaseKm, genStepKm, genEscortBaseVendor, genEscortStepVendor]
  );

  // Generator: Generate full table from formula for the selected vehicle type and PERSIST DIRECTLY TO DATABASE
  const handleGenerateFullTable = async () => {
    const vBase = role === 'vendor' ? genVendorBaseKm : (genVendorBaseKm || genBaseKm || 10);
    const dBase = role === 'driver' ? genDriverBaseKm : (genDriverBaseKm || genBaseKm || 10);
    const activeBase = role === 'driver' ? dBase : vBase;
    if (genMaxKm <= 0 || activeBase <= 0) {
      setAlert({ type: 'error', message: 'Base, step, and maximum distance must be positive values.' });
      return;
    }
    if (genMaxKm < activeBase) {
      setAlert({ type: 'error', message: 'Maximum distance cannot be less than initial base distance.' });
      return;
    }

    const numBaseVendor = Number(genBaseVendor) || 0;
    const numStepVendor = Number(genStepVendor) || 0;
    const numBaseDriver = Number(genBaseDriver) || 0;
    const numStepDriver = Number(genStepDriver) || 0;
    const numEscortBase = Number(genEscortBaseVendor) || 0;
    const numEscortStep = Number(genEscortStepVendor) || 0;

    // Validate inputs per active role
    if (role === 'driver') {
      if (numBaseDriver <= 0 || numStepDriver <= 0) {
        setAlert({
          type: 'error',
          message: 'Please enter valid Driver Base Payout (₹) and Payout per Step (+₹) greater than 0.',
        });
        return;
      }
    } else if (role === 'vendor') {
      if (numBaseVendor <= 0 || numStepVendor <= 0) {
        setAlert({
          type: 'error',
          message: 'Please enter valid Vendor Base Fare (₹) and Price per Step (+₹) greater than 0.',
        });
        return;
      }
    } else {
      if (numBaseVendor <= 0 || numStepVendor <= 0 || numBaseDriver <= 0 || numStepDriver <= 0) {
        setAlert({
          type: 'error',
          message: 'Please enter valid Base and Step values greater than 0 for both Vendor and Driver.',
        });
        return;
      }
    }

    const targetCategory = genVehicleType;
    const targetPlan = plans.find(
      (p) => p.vehicleCategory === targetCategory && p.status === 'ACTIVE'
    ) || plans.find((p) => p.vehicleCategory === targetCategory);

    const cfg = (targetPlan as any)?.rateConfigJson || targetPlan?.config || {};

    const maxKm = Math.max(1, genMaxKm || 200);

    // Resolve independent vendor & driver geometry
    const vBaseKm = Math.min(
      maxKm,
      Math.max(0.1, role === 'vendor' ? genVendorBaseKm : (Number(cfg.vendorBaseKm) || Number(cfg.baseKm) || genVendorBaseKm || 10))
    );
    const vStepKm = Math.min(
      maxKm,
      Math.max(0.1, role === 'vendor' ? genVendorStepKm : (Number(cfg.vendorStepKm) || Number(cfg.stepKm) || genVendorStepKm || 10))
    );
    const dBaseKm = Math.min(
      maxKm,
      Math.max(0.1, role === 'driver' ? genDriverBaseKm : (Number(cfg.driverBaseKm) || Number(cfg.baseKm) || genDriverBaseKm || 10))
    );
    const dStepKm = Math.min(
      maxKm,
      Math.max(0.1, role === 'driver' ? genDriverStepKm : (Number(cfg.driverStepKm) || Number(cfg.stepKm) || genDriverStepKm || 10))
    );

    // Resolve rates: preserve existing counterpart rate if not entered
    let effBaseVendor = numBaseVendor;
    let effStepVendor = numStepVendor;
    if (role === 'driver') {
      effBaseVendor = numBaseVendor > 0 ? numBaseVendor : (Number(cfg.baseVendorRupees) || 400);
      effStepVendor = numStepVendor > 0 ? numStepVendor : (Number(cfg.stepVendorRupees) || 100);
    }

    let effBaseDriver = numBaseDriver;
    let effStepDriver = numStepDriver;
    if (role === 'vendor') {
      effBaseDriver = numBaseDriver > 0 ? numBaseDriver : (Number(cfg.baseDriverRupees) || 300);
      effStepDriver = numStepDriver > 0 ? numStepDriver : (Number(cfg.stepDriverRupees) || 70);
    }

    // 1. Build role-specific slabs
    let newVendorSlabs: CreatePricingSlabInput[];
    let newDriverSlabs: CreatePricingSlabInput[];

    const prevVendorSlabs = Array.isArray(cfg.vendorSlabs) && cfg.vendorSlabs.length > 0 ? cfg.vendorSlabs : null;
    const prevDriverSlabs = Array.isArray(cfg.driverSlabs) && cfg.driverSlabs.length > 0 ? cfg.driverSlabs : null;

    if (role === 'vendor' || role === 'unified') {
      newVendorSlabs = buildRoleSlabs(
        vBaseKm,
        vStepKm,
        maxKm,
        effBaseVendor,
        effStepVendor,
        currentVendorPeakBase,
        currentVendorPeakStep,
        'vendor'
      );
    } else {
      newVendorSlabs = prevVendorSlabs || buildRoleSlabs(
        vBaseKm,
        vStepKm,
        maxKm,
        effBaseVendor,
        effStepVendor,
        currentVendorPeakBase,
        currentVendorPeakStep,
        'vendor'
      );
    }

    if (role === 'driver' || role === 'unified') {
      newDriverSlabs = buildRoleSlabs(
        dBaseKm,
        dStepKm,
        maxKm,
        effBaseDriver,
        effStepDriver,
        currentDriverPeakBase,
        currentDriverPeakStep,
        'driver'
      );
    } else {
      newDriverSlabs = prevDriverSlabs || buildRoleSlabs(
        dBaseKm,
        dStepKm,
        maxKm,
        effBaseDriver,
        effStepDriver,
        currentDriverPeakBase,
        currentDriverPeakStep,
        'driver'
      );
    }

    // 2. Synthesize composite slabs for PostgreSQL PricingPlan.slabs
    const compositeSlabs = synthesizeCompositeSlabs(newVendorSlabs, newDriverSlabs, maxKm);

    // 3. Set UI table according to active role:
    if (role === 'vendor') {
      setEditingSlabs(newVendorSlabs);
    } else if (role === 'driver') {
      setEditingSlabs(newDriverSlabs);
    } else {
      setEditingSlabs(compositeSlabs);
    }

    setSaving(true);
    setSelectedVehicleChip(genVehicleType);
    setIsConfigureSheetOpen(false);

    try {
      const configPayload = {
        baseKm: role === 'vendor' ? vBaseKm : dBaseKm,
        stepKm: role === 'vendor' ? vStepKm : dStepKm,
        vendorBaseKm: vBaseKm,
        vendorStepKm: vStepKm,
        driverBaseKm: dBaseKm,
        driverStepKm: dStepKm,
        maxKm,
        baseVendorRupees: effBaseVendor,
        stepVendorRupees: effStepVendor,
        vendorPeakExtraBaseRupees: currentVendorPeakBase,
        vendorPeakExtraStepRupees: currentVendorPeakStep,
        baseDriverRupees: effBaseDriver,
        stepDriverRupees: effStepDriver,
        driverPeakExtraBaseRupees: currentDriverPeakBase,
        driverPeakExtraStepRupees: currentDriverPeakStep,
        escortBaseVendorRupees: numEscortBase,
        escortStepVendorRupees: numEscortStep,
        slabEscorts,
        vendorSlabs: newVendorSlabs,
        driverSlabs: newDriverSlabs,
        overriddenSlabs: Array.from(overriddenSlabKeys),
        peakSlots,
      };

      const targetCategory = genVehicleType;
      const peakWindowsPayload: PeakHourWindow[] = getCategoryPeakWindows(peakSlots, targetCategory);
      const existingMatchingPlan = plans.find(
        (p) => p.vehicleCategory === targetCategory && p.status === 'ACTIVE'
      ) || plans.find((p) => p.vehicleCategory === targetCategory);

      let savedPlanId: string;
      if (existingMatchingPlan) {
        await adminApi.updateDistancePricingSlabs(existingMatchingPlan.id, compositeSlabs, undefined, {
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        if (existingMatchingPlan.status !== 'ACTIVE') {
          await adminApi.publishDistancePricingPlan(existingMatchingPlan.id, `Activated via pricing generator`);
        }
        savedPlanId = existingMatchingPlan.id;
      } else {
        const newPlan = await adminApi.createDistancePricingPlan({
          name: `${targetCategory} Distance Pricing Matrix`,
          vehicleCategory: targetCategory,
          slabs: compositeSlabs,
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        await adminApi.publishDistancePricingPlan(newPlan.id, `Initial activation for ${targetCategory}`);
        savedPlanId = newPlan.id;
      }

      await loadPlans(savedPlanId);

      setAlert({
        type: 'success',
        message: `Saved & activated ${role === 'vendor' ? newVendorSlabs.length : (role === 'driver' ? newDriverSlabs.length : compositeSlabs.length)} distance slabs for ${targetCategory} (${role === 'vendor' ? 'Vendor Client Billing' : 'Driver Guaranteed Payouts'})! Live rates updated in database.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: `Generated slabs locally, but database save failed: ${err?.message || 'Server error'}. Please click 'Save Matrix Changes' to retry.`,
      });
    } finally {
      setSaving(false);
    }
  };

  // Inline slab edit handler
  const handleUpdateSlab = (index: number, updates: Partial<CreatePricingSlabInput>) => {
    const updated = [...editingSlabs];
    const target = updated[index];
    const newSlab = { ...target, ...updates };
    updated[index] = newSlab;

    // Mark as overridden
    const key = `${target.minDistanceMExclusive}-${target.maxDistanceMInclusive}`;
    const newOverrides = new Set(overriddenSlabKeys);
    newOverrides.add(key);

    setEditingSlabs(updated);
    setOverriddenSlabKeys(newOverrides);
  };

  // Inline escort fee edit handler (Vendor only)
  const handleUpdateEscort = (slabKey: string, value: number) => {
    setSlabEscorts((prev) => ({
      ...prev,
      [slabKey]: value,
    }));
    const newOverrides = new Set(overriddenSlabKeys);
    newOverrides.add(slabKey);
    setOverriddenSlabKeys(newOverrides);
  };

  // Reset individual slab to mathematical formula
  const handleResetSlabToFormula = (index: number) => {
    const target = editingSlabs[index];
    const testKm = target.maxDistanceMInclusive / 1000;
    const vBaseKm = genVendorBaseKm || genBaseKm || 10;
    const vStepKm = genVendorStepKm || genStepKm || 10;
    const dBaseKm = genDriverBaseKm || genBaseKm || 10;
    const dStepKm = genDriverStepKm || genStepKm || 10;

    const numBaseVendor = Number(genBaseVendor) || 0;
    const numStepVendor = Number(genStepVendor) || 0;
    const numBaseDriver = Number(genBaseDriver) || 0;
    const numStepDriver = Number(genStepDriver) || 0;

    let vStd = target.vendorPricePaise;
    let dStd = target.driverPayoutPaise;
    let vPeak = target.vendorPeakPricePaise ?? target.vendorPricePaise;
    let dPeak = target.driverPeakPayoutPaise ?? target.driverPayoutPaise;

    if (role === 'driver' || role === 'unified') {
      if (numBaseDriver > 0) {
        if (testKm <= dBaseKm) {
          dStd = Math.round(numBaseDriver * 100);
          dPeak = Math.round((numBaseDriver + currentDriverPeakBase) * 100);
        } else {
          const dSteps = Math.ceil((testKm - dBaseKm) / dStepKm);
          dStd = Math.round((numBaseDriver + dSteps * numStepDriver) * 100);
          dPeak = Math.round((numBaseDriver + currentDriverPeakBase + dSteps * (numStepDriver + currentDriverPeakStep)) * 100);
        }
      }
    }

    if (role === 'vendor' || role === 'unified') {
      if (numBaseVendor > 0) {
        if (testKm <= vBaseKm) {
          vStd = Math.round(numBaseVendor * 100);
          vPeak = Math.round((numBaseVendor + currentVendorPeakBase) * 100);
        } else {
          const vSteps = Math.ceil((testKm - vBaseKm) / vStepKm);
          vStd = Math.round((numBaseVendor + vSteps * numStepVendor) * 100);
          vPeak = Math.round((numBaseVendor + currentVendorPeakBase + vSteps * (numStepVendor + currentVendorPeakStep)) * 100);
        }
      }
    }

    // Safety checks
    vStd = Math.max(100, vStd);
    dStd = Math.max(100, dStd);
    vPeak = Math.max(vStd, vPeak);
    dPeak = Math.max(dStd, dPeak);
    if (vStd < dStd) vStd = dStd;
    if (vPeak < dPeak) vPeak = dPeak;

    const updated = [...editingSlabs];
    updated[index] = {
      ...target,
      vendorPricePaise: vStd,
      driverPayoutPaise: dStd,
      vendorPeakPricePaise: vPeak,
      driverPeakPayoutPaise: dPeak,
    };

    const key = `${target.minDistanceMExclusive}-${target.maxDistanceMInclusive}`;
    const newOverrides = new Set(overriddenSlabKeys);
    newOverrides.delete(key);

    setSlabEscorts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    setEditingSlabs(updated);
    setOverriddenSlabKeys(newOverrides);
    setAlert({
      type: 'success',
      message: `Reset slab ${target.minDistanceMExclusive / 1000}–${target.maxDistanceMInclusive / 1000} km back to formula.`,
    });
  };

  // Delete all peak timing windows and revert matrix to standard rates
  const handleRemoveAllPeakWindows = async () => {
    if (!window.confirm('Are you sure you want to remove all peak timing windows? Standard rates will apply around the clock.')) {
      return;
    }

    setSaving(true);
    setPeakSlots([]);
    setIsPeakSheetOpen(false);

    try {
      if (role === 'vendor' || role === 'unified') {
        setCurrentVendorPeakBase(0);
        setCurrentVendorPeakStep(0);
      }
      if (role === 'driver' || role === 'unified') {
        setCurrentDriverPeakBase(0);
        setCurrentDriverPeakStep(0);
      }

      const resetSlabs: CreatePricingSlabInput[] = editingSlabs.map((s) => ({
        ...s,
        vendorPeakPricePaise: (role === 'driver') ? (s.vendorPeakPricePaise ?? s.vendorPricePaise) : s.vendorPricePaise,
        driverPeakPayoutPaise: (role === 'vendor') ? (s.driverPeakPayoutPaise ?? s.driverPayoutPaise) : s.driverPayoutPaise,
      }));
      setEditingSlabs(resetSlabs);

      // Persist empty peakWindows to all active/draft plans
      for (const plan of plans) {
        if (plan.status !== 'ACTIVE' && plan.status !== 'DRAFT') continue;
        const cfg = (plan as any).rateConfigJson || plan.config || {};
        const updatedCfg = {
          ...cfg,
          peakSlots: [],
          ...(role === 'vendor' || role === 'unified' ? { vendorPeakExtraBaseRupees: 0, vendorPeakExtraStepRupees: 0 } : {}),
          ...(role === 'driver' || role === 'unified' ? { driverPeakExtraBaseRupees: 0, driverPeakExtraStepRupees: 0 } : {}),
        };

        const targetSlabs = (plan.id === activePlan?.id) ? resetSlabs : (plan.slabs || []).map((s: any) => ({
          minDistanceMExclusive: s.minDistanceMExclusive,
          maxDistanceMInclusive: s.maxDistanceMInclusive,
          vendorPricePaise: s.vendorPricePaise,
          driverPayoutPaise: s.driverPayoutPaise,
          vendorPeakPricePaise: (role === 'driver') ? (s.vendorPeakPricePaise ?? s.vendorPricePaise) : s.vendorPricePaise,
          driverPeakPayoutPaise: (role === 'vendor') ? (s.driverPeakPayoutPaise ?? s.driverPayoutPaise) : s.driverPayoutPaise,
          active: s.active !== false,
        }));

        await adminApi.updateDistancePricingSlabs(plan.id, targetSlabs, undefined, {
          config: updatedCfg as any,
          peakWindows: [],
        });
      }

      await loadPlans(activePlan?.id);

      setAlert({
        type: 'success',
        message: 'Successfully removed all peak timing windows! All vehicle categories now operate 24/7 on standard rates.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: `Failed to remove peak windows: ${err?.message || 'Server error'}`,
      });
    } finally {
      setSaving(false);
    }
  };

  // Apply Peak Surcharges from configured slots across slabs and persist to database
  const handleApplyPeakSurcharges = async () => {
    if (peakSlots.length === 0) {
      await handleRemoveAllPeakWindows();
      return;
    }

    // Collect all vehicle types that have surcharges configured in peakSlots, plus currently selected
    const vehiclesWithSurge = new Set<string>();
    vehiclesWithSurge.add(selectedVehicleChip);
    if (genVehicleType) vehiclesWithSurge.add(genVehicleType);
    peakSlots.forEach((slot) => {
      slot.vehicleSurges.forEach((s) => {
        if (s.vehicleType) vehiclesWithSurge.add(s.vehicleType);
      });
    });

    setSaving(true);
    setIsPeakSheetOpen(false);

    try {
      // Loop through all affected vehicle categories and persist peak configuration & surcharges
      for (const cat of Array.from(vehiclesWithSurge)) {
        const existingPlan = plans.find(
          (p) => p.vehicleCategory === cat && p.status === 'ACTIVE'
        ) || plans.find((p) => p.vehicleCategory === cat);

        if (!existingPlan) continue;

        const cfg = (existingPlan as any).rateConfigJson || existingPlan.config || {};
        const catBaseKm = (typeof cfg.baseKm === 'number' && cfg.baseKm > 0) ? cfg.baseKm : genBaseKm;
        const catStepKm = (typeof cfg.stepKm === 'number' && cfg.stepKm > 0) ? cfg.stepKm : genStepKm;
        const catBaseM = catBaseKm * 1000;
        const catStepM = catStepKm * 1000;

        // When in driver role, preserve existing vendor extras; when in vendor role, preserve existing driver extras
        let maxVBaseExtra = (role === 'driver') ? (Number(cfg.vendorPeakExtraBaseRupees) || 0) : 0;
        let maxVStepExtra = (role === 'driver') ? (Number(cfg.vendorPeakExtraStepRupees) || 0) : 0;
        let maxDBaseExtra = (role === 'vendor') ? (Number(cfg.driverPeakExtraBaseRupees) || 0) : 0;
        let maxDStepExtra = (role === 'vendor') ? (Number(cfg.driverPeakExtraStepRupees) || 0) : 0;

        peakSlots.forEach((slot) => {
          const match = slot.vehicleSurges.find((s) => s.vehicleType === cat);
          if (match) {
            if (role === 'vendor' || role === 'unified') {
              if (match.vendorBaseExtra > 0) maxVBaseExtra = Math.max(maxVBaseExtra, match.vendorBaseExtra);
              if (match.vendorStepExtra > 0) maxVStepExtra = Math.max(maxVStepExtra, match.vendorStepExtra);
            }
            if (role === 'driver' || role === 'unified') {
              if (match.driverBaseExtra > 0) maxDBaseExtra = Math.max(maxDBaseExtra, match.driverBaseExtra);
              if (match.driverStepExtra > 0) maxDStepExtra = Math.max(maxDStepExtra, match.driverStepExtra);
            }
          }
        });

        if (cat === selectedVehicleChip) {
          setCurrentVendorPeakBase(maxVBaseExtra);
          setCurrentVendorPeakStep(maxVStepExtra);
          setCurrentDriverPeakBase(maxDBaseExtra);
          setCurrentDriverPeakStep(maxDStepExtra);
        }

        const sourceSlabs = (cat === selectedVehicleChip && editingSlabs.length > 0)
          ? editingSlabs
          : (existingPlan.slabs || []);

        if (sourceSlabs.length === 0) continue;

        const updatedCatSlabs: CreatePricingSlabInput[] = sourceSlabs.map((s: any) => {
          let vExtra = maxVBaseExtra;
          let dExtra = maxDBaseExtra;
          if (s.minDistanceMExclusive > 0) {
            const stepIndex = Math.max(1, Math.round((s.maxDistanceMInclusive - catBaseM) / catStepM));
            vExtra = maxVBaseExtra + stepIndex * maxVStepExtra;
            dExtra = maxDBaseExtra + stepIndex * maxDStepExtra;
          }

          const vStd = Math.max(100, s.vendorPricePaise);
          const dStd = Math.max(100, s.driverPayoutPaise);

          let vPeak = (role === 'driver' && s.vendorPeakPricePaise)
            ? s.vendorPeakPricePaise
            : vStd + Math.round(vExtra * 100);

          const dPeak = (role === 'vendor' && s.driverPeakPayoutPaise)
            ? s.driverPeakPayoutPaise
            : dStd + Math.round(dExtra * 100);

          if (vPeak < dPeak) vPeak = dPeak;

          return {
            minDistanceMExclusive: s.minDistanceMExclusive,
            maxDistanceMInclusive: s.maxDistanceMInclusive,
            vendorPricePaise: vStd,
            driverPayoutPaise: dStd,
            vendorPeakPricePaise: vPeak,
            driverPeakPayoutPaise: dPeak,
            active: s.active !== false,
          };
        });

        if (cat === selectedVehicleChip) {
          setEditingSlabs(updatedCatSlabs);
        }

        // Deduplicate peak windows for this category to prevent duplicate time-ranges
        const catPeakWindows: PeakHourWindow[] = getCategoryPeakWindows(peakSlots, cat);

        const configPayload = {
          ...cfg,
          vendorBaseKm: cfg.vendorBaseKm || genVendorBaseKm || 10,
          vendorStepKm: cfg.vendorStepKm || genVendorStepKm || 10,
          driverBaseKm: cfg.driverBaseKm || genDriverBaseKm || 10,
          driverStepKm: cfg.driverStepKm || genDriverStepKm || 10,
          vendorPeakExtraBaseRupees: maxVBaseExtra,
          vendorPeakExtraStepRupees: maxVStepExtra,
          driverPeakExtraBaseRupees: maxDBaseExtra,
          driverPeakExtraStepRupees: maxDStepExtra,
          peakSlots,
        };

        await adminApi.updateDistancePricingSlabs(existingPlan.id, updatedCatSlabs, undefined, {
          config: configPayload as any,
          peakWindows: catPeakWindows,
        });
      }

      await loadPlans(activePlan?.id);

      setAlert({
        type: 'success',
        message: `Applied and saved ${peakSlots.length} peak windows with vehicle surcharges directly in database! Peak rates are live for vendors and drivers.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: `Applied peak rates locally, but database save failed: ${err?.message || 'Server error'}. Please click 'Save Matrix Changes' to retry.`,
      });
    } finally {
      setSaving(false);
    }
  };

  // Validation
  const validation = useMemo(() => {
    if (editingSlabs.length === 0) {
      return { valid: false, isUnconfigured: true, error: 'No slabs configured. Please click "Configure Pricing" to generate slabs.' };
    }
    if (editingSlabs[0].minDistanceMExclusive !== 0) {
      return { valid: false, isUnconfigured: false, error: 'First distance band must start at 0 km.' };
    }

    for (let i = 0; i < editingSlabs.length; i++) {
      const s = editingSlabs[i];
      const minKm = s.minDistanceMExclusive / 1000;
      const maxKm = s.maxDistanceMInclusive / 1000;

      if (s.maxDistanceMInclusive <= s.minDistanceMExclusive) {
        return { valid: false, isUnconfigured: false, error: `Slab #${i + 1} (${minKm}–${maxKm} km): Max distance must exceed min distance.` };
      }

      // If unified, ensure vendor >= driver
      if (role === 'unified' && s.vendorPricePaise < s.driverPayoutPaise) {
        return {
          valid: false,
          isUnconfigured: false,
          error: `Negative Margin Detected on ${minKm}–${maxKm} km! Vendor fare (₹${s.vendorPricePaise / 100}) cannot be less than Driver payout (₹${s.driverPayoutPaise / 100}).`,
        };
      }
    }

    return { valid: true, isUnconfigured: false, error: null };
  }, [editingSlabs, role]);

  // Save Slabs Draft / Live Update to PostgreSQL
  const handleSaveMatrix = async () => {
    if (!validation.valid) {
      setAlert({ type: 'error', message: validation.error || 'Please correct errors before saving.' });
      return;
    }

    setSaving(true);
    try {
      const targetCategory = selectedVehicleChip || genVehicleType || 'SEDAN';
      const existingMatchingPlan = plans.find(
        (p) => p.vehicleCategory === targetCategory && p.status === 'ACTIVE'
      ) || plans.find((p) => p.vehicleCategory === targetCategory);
      const cfg = (existingMatchingPlan as any)?.rateConfigJson || existingMatchingPlan?.config || {};

      const maxKm = Math.max(1, genMaxKm || 200);
      const vBaseKm = genVendorBaseKm || Number(cfg.vendorBaseKm) || Number(cfg.baseKm) || 10;
      const vStepKm = genVendorStepKm || Number(cfg.vendorStepKm) || Number(cfg.stepKm) || 10;
      const dBaseKm = genDriverBaseKm || Number(cfg.driverBaseKm) || Number(cfg.baseKm) || 10;
      const dStepKm = genDriverStepKm || Number(cfg.driverStepKm) || Number(cfg.stepKm) || 10;

      const overriddenArray = Array.from(overriddenSlabKeys);
      const numBaseVendor = Number(genBaseVendor) || 0;
      const numStepVendor = Number(genStepVendor) || 0;
      const numBaseDriver = Number(genBaseDriver) || 0;
      const numStepDriver = Number(genStepDriver) || 0;
      const numEscortBase = Number(genEscortBaseVendor) || 0;
      const numEscortStep = Number(genEscortStepVendor) || 0;

      let currentVendorSlabs: CreatePricingSlabInput[] = Array.isArray(cfg.vendorSlabs) && cfg.vendorSlabs.length > 0
        ? cfg.vendorSlabs
        : buildRoleSlabs(vBaseKm, vStepKm, maxKm, numBaseVendor || 400, numStepVendor || 100, currentVendorPeakBase, currentVendorPeakStep, 'vendor');

      let currentDriverSlabs: CreatePricingSlabInput[] = Array.isArray(cfg.driverSlabs) && cfg.driverSlabs.length > 0
        ? cfg.driverSlabs
        : buildRoleSlabs(dBaseKm, dStepKm, maxKm, numBaseDriver || 300, numStepDriver || 70, currentDriverPeakBase, currentDriverPeakStep, 'driver');

      if (role === 'vendor') {
        currentVendorSlabs = editingSlabs;
      } else if (role === 'driver') {
        currentDriverSlabs = editingSlabs;
      }

      const compositeSlabs = synthesizeCompositeSlabs(currentVendorSlabs, currentDriverSlabs, maxKm);

      const configPayload = {
        baseKm: role === 'vendor' ? vBaseKm : dBaseKm,
        stepKm: role === 'vendor' ? vStepKm : dStepKm,
        vendorBaseKm: vBaseKm,
        vendorStepKm: vStepKm,
        driverBaseKm: dBaseKm,
        driverStepKm: dStepKm,
        maxKm: genMaxKm,
        baseVendorRupees: numBaseVendor,
        stepVendorRupees: numStepVendor,
        vendorPeakExtraBaseRupees: currentVendorPeakBase,
        vendorPeakExtraStepRupees: currentVendorPeakStep,
        baseDriverRupees: numBaseDriver,
        stepDriverRupees: numStepDriver,
        driverPeakExtraBaseRupees: currentDriverPeakBase,
        driverPeakExtraStepRupees: currentDriverPeakStep,
        escortBaseVendorRupees: numEscortBase,
        escortStepVendorRupees: numEscortStep,
        slabEscorts,
        vendorSlabs: currentVendorSlabs,
        driverSlabs: currentDriverSlabs,
        overriddenSlabs: overriddenArray,
        peakSlots,
      };

      const peakWindowsPayload: PeakHourWindow[] = getCategoryPeakWindows(peakSlots, targetCategory);

      if (existingMatchingPlan) {
        await adminApi.updateDistancePricingSlabs(existingMatchingPlan.id, compositeSlabs, undefined, {
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        setAlert({
          type: 'success',
          message: `Saved matrix for ${targetCategory} (${role === 'vendor' ? 'Vendor Client Billing' : 'Driver Guaranteed Payouts'}) directly in database. Ready for live apps.`,
        });
        await loadPlans(existingMatchingPlan.id);
      } else {
        const newPlan = await adminApi.createDistancePricingPlan({
          name: `${targetCategory} Distance Pricing Matrix`,
          vehicleCategory: targetCategory,
          slabs: compositeSlabs,
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        await adminApi.publishDistancePricingPlan(newPlan.id, `Initial activation for ${targetCategory}`);
        setAlert({
          type: 'success',
          message: `Created and published new ${targetCategory} matrix with independent vendor & driver pricing.`,
        });
        await loadPlans(newPlan.id);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to save matrix.' });
    } finally {
      setSaving(false);
    }
  };

  // Run simulation whenever simulator inputs change
  useEffect(() => {
    if (!activePlan || !simDistanceKm || simDistanceKm <= 0) return;
    let cancelled = false;

    async function runSim() {
      setSimulating(true);
      try {
        const istToday = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
        const hhmm = /^\d{2}:\d{2}$/.test(simTimeOfDay) ? simTimeOfDay : '12:00';

        const res = await adminApi.simulateDistancePricing({
          planId: activePlan?.id,
          distanceKm: Number(simDistanceKm),
          vehicleCategory: selectedVehicleChip,
          pickupTime: `${istToday}T${hhmm}:00+05:30`,
          hasEscort: role === 'vendor' ? simIncludeEscort : false,
        });
        if (!cancelled) setSimResult(res);
      } catch (err: any) {
        if (!cancelled) {
          const errMsg = err?.message || 'We are not currently operating in this service area.';
          setSimResult({ error: errMsg } as any);
        }
      } finally {
        if (!cancelled) setSimulating(false);
      }
    }

    const t = setTimeout(runSim, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [simDistanceKm, simTimeOfDay, simIncludeEscort, activePlan, selectedVehicleChip, role]);

  // Filtered slabs for table display based on search query
  const filteredSlabs = useMemo(() => {
    return editingSlabs
      .map((slab, index) => ({ slab, originalIndex: index }))
      .filter(({ slab }) => {
        if (!searchQuery.trim()) return true;
        const minKm = slab.minDistanceMExclusive / 1000;
        const maxKm = slab.maxDistanceMInclusive / 1000;
        const q = searchQuery.toLowerCase();
        const matchKm = `${minKm}`.includes(q) || `${maxKm}`.includes(q);
        const matchPrice =
          `${slab.vendorPricePaise / 100}`.includes(q) || `${slab.driverPayoutPaise / 100}`.includes(q);
        return matchKm || matchPrice;
      });
  }, [editingSlabs, searchQuery]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading Distance Pricing Matrix Workspace...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            <Link href="/pricing" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowLeft size={14} /> Pricing Studio Overview
            </Link>
            <ChevronRight size={13} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {role === 'vendor' ? 'Vendor Rate Matrix' : role === 'driver' ? 'Driver Guaranteed Payouts' : 'Unified Rate Matrix'}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Route size={24} color={role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)'} />
            {role === 'vendor' ? 'Vendor Rate Matrix (Client Billing)' : role === 'driver' ? 'Driver Guaranteed Payouts' : 'Unified Distance Slabs Matrix'}
            <StatusBadge status={activePlan?.status === 'ACTIVE' ? 'APPROVED' : 'PENDING'} label={activePlan?.status || 'DRAFT'} />
          </h1>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            leftIcon={<Sparkles size={15} />}
            onClick={() => {
              setGenVehicleType(selectedVehicleChip);
              const match = plans.find((p) => p.vehicleCategory === selectedVehicleChip && p.status === 'ACTIVE') || plans.find((p) => p.vehicleCategory === selectedVehicleChip);
              if (match) {
                const cfg = (match as any).rateConfigJson || match.config;
                if (cfg && typeof cfg === 'object') {
                  const vB = typeof cfg.vendorBaseKm === 'number' && cfg.vendorBaseKm > 0 ? cfg.vendorBaseKm : (typeof cfg.baseKm === 'number' && cfg.baseKm > 0 ? cfg.baseKm : 10);
                  const vS = typeof cfg.vendorStepKm === 'number' && cfg.vendorStepKm > 0 ? cfg.vendorStepKm : (typeof cfg.stepKm === 'number' && cfg.stepKm > 0 ? cfg.stepKm : 10);
                  const dB = typeof cfg.driverBaseKm === 'number' && cfg.driverBaseKm > 0 ? cfg.driverBaseKm : (typeof cfg.baseKm === 'number' && cfg.baseKm > 0 ? cfg.baseKm : 10);
                  const dS = typeof cfg.driverStepKm === 'number' && cfg.driverStepKm > 0 ? cfg.driverStepKm : (typeof cfg.stepKm === 'number' && cfg.stepKm > 0 ? cfg.stepKm : 10);

                  setGenVendorBaseKm(vB);
                  setGenVendorStepKm(vS);
                  setGenDriverBaseKm(dB);
                  setGenDriverStepKm(dS);
                  setGenBaseKm(role === 'driver' ? dB : vB);
                  setGenStepKm(role === 'driver' ? dS : vS);
                  if (typeof cfg.maxKm === 'number' && cfg.maxKm > 0) setGenMaxKm(cfg.maxKm);
                  if (typeof cfg.baseVendorRupees === 'number') setGenBaseVendor(cfg.baseVendorRupees);
                  if (typeof cfg.stepVendorRupees === 'number') setGenStepVendor(cfg.stepVendorRupees);
                  if (typeof cfg.baseDriverRupees === 'number') setGenBaseDriver(cfg.baseDriverRupees);
                  if (typeof cfg.stepDriverRupees === 'number') setGenStepDriver(cfg.stepDriverRupees);
                  if (typeof cfg.escortBaseVendorRupees === 'number') setGenEscortBaseVendor(cfg.escortBaseVendorRupees);
                  if (typeof cfg.escortStepVendorRupees === 'number') setGenEscortStepVendor(cfg.escortStepVendorRupees);
                }
              }
              setIsConfigureSheetOpen(true);
            }}
            style={{
              background: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
              borderColor: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
            }}
          >
            Configure Pricing
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Settings size={15} />}
            onClick={() => setIsCategoriesDrawerOpen(true)}
            title="Manage vehicle categories and fleet capacities"
          >
            Vehicle Categories
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Clock size={15} />}
            onClick={() => setIsPeakSheetOpen(true)}
          >
            Peak Pricing ({peakSlots.length} Windows)
          </Button>

          <Button
            variant="primary"
            leftIcon={<Save size={15} />}
            loading={saving}
            disabled={!validation.valid}
            onClick={handleSaveMatrix}
            style={{ background: '#10B981', borderColor: '#10B981' }}
          >
            Save Matrix Changes
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: alert.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : alert.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${alert.type === 'error' ? 'var(--color-error)' : alert.type === 'warning' ? 'var(--color-warning)' : 'var(--color-success)'}`,
            color: alert.type === 'error' ? 'var(--color-error)' : alert.type === 'warning' ? 'var(--color-warning)' : 'var(--color-success)',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Loss Prevention Validation Warning */}
      {!validation.valid && !validation.isUnconfigured && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>{validation.error} Saving is blocked until corrected.</span>
        </div>
      )}

      {/* Vehicle Category Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-surface)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Vehicle Categories:
          </span>
          {availableVehicleChips.map((chip) => {
            const isSelected = selectedVehicleChip === chip;
            const themeColor = role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)';
            return (
              <button
                key={chip}
                onClick={() => handleSelectVehicleChip(chip)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '999px',
                  border: isSelected ? `1.5px solid ${themeColor}` : '1px solid var(--border)',
                  background: isSelected ? themeColor : 'var(--bg-surface-elevated)',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                }}
              >
                <Car size={14} />
                <span>{chip}</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsCategoriesDrawerOpen(true)}
            title="Manage vehicle categories, fleet capacities, and add new vehicles"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              border: '1px dashed var(--border)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <Settings size={13} />
            <span>Manage</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search km or fare..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Slabs Matrix Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '680px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Distance Band</th>

                {/* Vendor Columns (Shown ONLY in Vendor or Unified view) */}
                {(role === 'vendor' || role === 'unified') && (
                  <>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Vendor Std Fare (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Peak Extra (+₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Total Peak (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#3B82F6' }}>Security Escort (₹)</th>
                  </>
                )}

                {/* Driver Columns (Shown ONLY in Driver or Unified view) */}
                {(role === 'driver' || role === 'unified') && (
                  <>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Driver Payout (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Driver Peak (+₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Total Peak (₹)</th>
                  </>
                )}

                {role === 'unified' && (
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Platform Net Margin</th>
                )}
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlabs.length === 0 ? (
                <tr>
                  <td colSpan={role === 'unified' ? 10 : 7} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No distance slabs configured for <strong>{selectedVehicleChip}</strong>. Click <strong>Configure Pricing</strong> above to generate the matrix table.
                  </td>
                </tr>
              ) : (
                filteredSlabs.map(({ slab, originalIndex }) => {
                  const minKm = slab.minDistanceMExclusive / 1000;
                  const maxKm = slab.maxDistanceMInclusive / 1000;
                  const key = `${slab.minDistanceMExclusive}-${slab.maxDistanceMInclusive}`;
                  const isOverridden = overriddenSlabKeys.has(key);

                  // Fares
                  const vStd = slab.vendorPricePaise / 100;
                  const vPeakExtra = Math.max(0, (slab.vendorPeakPricePaise ?? slab.vendorPricePaise) / 100 - vStd);
                  const vPeakTotal = vStd + vPeakExtra;

                  const dStd = slab.driverPayoutPaise / 100;
                  const dPeakExtra = Math.max(0, (slab.driverPeakPayoutPaise ?? slab.driverPayoutPaise) / 100 - dStd);
                  const dPeakTotal = dStd + dPeakExtra;

                  // Margins
                  const marginStd = vStd - dStd;
                  const marginStdPct = vStd > 0 ? ((marginStd / vStd) * 100).toFixed(1) : '0';
                  const isNegativeMargin = marginStd <= 0;

                  // Escort (Vendor only)
                  const escort = getEscortFeeForDistance(slab.maxDistanceMInclusive);

                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: (role === 'unified' && isNegativeMargin)
                          ? 'rgba(239, 68, 68, 0.08)'
                          : isOverridden
                          ? 'rgba(245, 158, 11, 0.04)'
                          : 'transparent',
                      }}
                    >
                      {/* Distance Band (Locked & Non-editable) */}
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {originalIndex === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>0 – {maxKm} km</span>
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)', color: '#fff', fontWeight: 800 }}>BASE</span>
                          </div>
                        ) : (
                          <span>&gt;{minKm} – {maxKm} km</span>
                        )}
                      </td>

                      {/* Vendor Columns */}
                      {(role === 'vendor' || role === 'unified') && (
                        <>
                          <td style={{ padding: '0.5rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>₹</span>
                              <input
                                type="number"
                                min={1}
                                value={vStd}
                                onChange={(e) =>
                                  handleUpdateSlab(originalIndex, {
                                    vendorPricePaise: Math.round(Number(e.target.value) * 100),
                                  })
                                }
                                style={{
                                  width: '88px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: isNegativeMargin ? '1.5px solid var(--color-error)' : '1px solid var(--border)',
                                  background: 'var(--bg-surface-elevated)',
                                  color: 'var(--text-primary)',
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: '0.5rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>+₹</span>
                              <input
                                type="number"
                                min={0}
                                value={vPeakExtra}
                                onChange={(e) =>
                                  handleUpdateSlab(originalIndex, {
                                    vendorPeakPricePaise: Math.round((vStd + Number(e.target.value)) * 100),
                                  })
                                }
                                style={{
                                  width: '75px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-surface-elevated)',
                                  color: 'var(--text-primary)',
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#F59E0B' }}>
                            {inr(vPeakTotal)}
                          </td>

                          <td style={{ padding: '0.5rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>₹</span>
                              <input
                                type="number"
                                min={0}
                                value={slabEscorts[key] !== undefined ? slabEscorts[key] : escort.vendorEscort}
                                onChange={(e) => handleUpdateEscort(key, Math.max(0, Number(e.target.value)))}
                                style={{
                                  width: '85px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-surface-elevated)',
                                  color: '#3B82F6',
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                          </td>
                        </>
                      )}

                      {/* Driver Columns */}
                      {(role === 'driver' || role === 'unified') && (
                        <>
                          <td style={{ padding: '0.5rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>₹</span>
                              <input
                                type="number"
                                min={1}
                                value={dStd}
                                onChange={(e) =>
                                  handleUpdateSlab(originalIndex, {
                                    driverPayoutPaise: Math.round(Number(e.target.value) * 100),
                                  })
                                }
                                style={{
                                  width: '88px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: isNegativeMargin ? '1.5px solid var(--color-error)' : '1px solid var(--border)',
                                  background: 'var(--bg-surface-elevated)',
                                  color: 'var(--color-success)',
                                  fontWeight: 700,
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: '0.5rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>+₹</span>
                              <input
                                type="number"
                                min={0}
                                value={dPeakExtra}
                                onChange={(e) =>
                                  handleUpdateSlab(originalIndex, {
                                    driverPeakPayoutPaise: Math.round((dStd + Number(e.target.value)) * 100),
                                  })
                                }
                                style={{
                                  width: '75px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-surface-elevated)',
                                  color: 'var(--text-primary)',
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                            {inr(dPeakTotal)}
                          </td>
                        </>
                      )}

                      {/* Unified Platform Margin Column */}
                      {role === 'unified' && (
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '999px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: isNegativeMargin
                                ? 'rgba(239, 68, 68, 0.15)'
                                : Number(marginStdPct) < 15
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                              color: isNegativeMargin
                                ? 'var(--color-error)'
                                : Number(marginStdPct) < 15
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                            }}
                          >
                            +{inr(marginStd)} ({marginStdPct}%)
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isOverridden ? (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700 }}>
                            Custom Override
                          </span>
                        ) : (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            Formula
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {isOverridden && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<RotateCcw size={12} />}
                            onClick={() => handleResetSlabToFormula(originalIndex)}
                            title="Reset this slab back to standard formula"
                          >
                            Reset
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Live Rate Simulator */}
      <Card style={{ padding: '1.25rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--brand-primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Quote Simulator
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Verify any distance route against your live configured matrix
            </span>
          </div>
          {simulating && <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}>Calculating...</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Distance (km)</label>
            <input
              type="number"
              min={1}
              step={0.5}
              value={simDistanceKm}
              onChange={(e) => setSimDistanceKm(Number(e.target.value))}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pickup Time (IST)</label>
            <input
              type="time"
              value={simTimeOfDay}
              onChange={(e) => setSimTimeOfDay(e.target.value)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          {role === 'vendor' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.65rem' }}>
              <input
                type="checkbox"
                id="simEscort"
                checked={simIncludeEscort}
                onChange={(e) => setSimIncludeEscort(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
              />
              <label htmlFor="simEscort" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                Include Security Escort Guard
              </label>
            </div>
          )}

          {/* Simulation Output Card */}
          {simResult && (
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {simResult.error ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#D97706', fontSize: '0.85rem', fontWeight: 600 }}>
                  <AlertTriangle size={18} />
                  <span>{simResult.error}</span>
                </div>
              ) : (
                <>
                  {(role === 'vendor' || role === 'unified') && (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vendor Charge</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>{inr(simResult.vendorPriceRupees)}</div>
                    </div>
                  )}
                  {(role === 'driver' || role === 'unified') && (
                    <div style={{ borderLeft: role === 'unified' ? '1px solid var(--border)' : 'none', paddingLeft: role === 'unified' ? '1rem' : 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Driver Payout</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)' }}>{inr(simResult.driverPayoutRupees)}</div>
                    </div>
                  )}
                  {role === 'unified' && (
                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Platform Margin</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
                        +{inr(simResult.vendorPriceRupees - simResult.driverPayoutRupees)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* BOTTOM SHEET 1: Configure Pricing (Isolated for Vendor vs Driver) */}
      <BottomSheet
        isOpen={isConfigureSheetOpen}
        onClose={() => setIsConfigureSheetOpen(false)}
        title={role === 'driver' ? 'Configure Driver Guaranteed Payouts' : 'Configure Vendor Client Rates'}
        subtitle={role === 'driver' ? 'Set the driver payout rates and step increments for your verified fleet drivers.' : 'Set client billing base rates, distance steps, and security escort add-ons.'}
        icon={<Sparkles size={20} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Vehicle Type Selector */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Vehicle Category (Select 1 Vehicle)
            </label>
            <select
              value={genVehicleType}
              onChange={(e) => {
                const newCat = e.target.value;
                setGenVehicleType(newCat);
                const match = plans.find((p) => p.vehicleCategory === newCat && p.status === 'ACTIVE') || plans.find((p) => p.vehicleCategory === newCat);
                if (match) {
                  const cfg = (match as any).rateConfigJson || match.config;
                  if (cfg && typeof cfg === 'object') {
                    if (typeof cfg.baseKm === 'number' && cfg.baseKm > 0) setGenBaseKm(cfg.baseKm);
                    if (typeof cfg.stepKm === 'number' && cfg.stepKm > 0) setGenStepKm(cfg.stepKm);
                    if (typeof cfg.vendorBaseKm === 'number' && cfg.vendorBaseKm > 0) setGenVendorBaseKm(cfg.vendorBaseKm);
                    else if (typeof cfg.baseKm === 'number' && cfg.baseKm > 0) setGenVendorBaseKm(cfg.baseKm);
                    if (typeof cfg.vendorStepKm === 'number' && cfg.vendorStepKm > 0) setGenVendorStepKm(cfg.vendorStepKm);
                    else if (typeof cfg.stepKm === 'number' && cfg.stepKm > 0) setGenVendorStepKm(cfg.stepKm);
                    if (typeof cfg.driverBaseKm === 'number' && cfg.driverBaseKm > 0) setGenDriverBaseKm(cfg.driverBaseKm);
                    else if (typeof cfg.baseKm === 'number' && cfg.baseKm > 0) setGenDriverBaseKm(cfg.baseKm);
                    if (typeof cfg.driverStepKm === 'number' && cfg.driverStepKm > 0) setGenDriverStepKm(cfg.driverStepKm);
                    else if (typeof cfg.stepKm === 'number' && cfg.stepKm > 0) setGenDriverStepKm(cfg.stepKm);
                    if (typeof cfg.maxKm === 'number' && cfg.maxKm > 0) setGenMaxKm(cfg.maxKm);
                    if (typeof cfg.baseVendorRupees === 'number') setGenBaseVendor(cfg.baseVendorRupees);
                    if (typeof cfg.stepVendorRupees === 'number') setGenStepVendor(cfg.stepVendorRupees);
                    if (typeof cfg.baseDriverRupees === 'number') setGenBaseDriver(cfg.baseDriverRupees);
                    if (typeof cfg.stepDriverRupees === 'number') setGenStepDriver(cfg.stepDriverRupees);
                    if (typeof cfg.escortBaseVendorRupees === 'number') setGenEscortBaseVendor(cfg.escortBaseVendorRupees);
                    if (typeof cfg.escortStepVendorRupees === 'number') setGenEscortStepVendor(cfg.escortStepVendorRupees);
                  }
                }
              }}
              style={{
                width: '100%',
                marginTop: '0.4rem',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {availableVehicleChips.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Distance Geometry */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                {role === 'driver' ? 'Driver Base Distance (km)' : 'Vendor Base Distance (km)'}
              </label>
              <input
                type="number"
                min={1}
                value={role === 'driver' ? genDriverBaseKm : genVendorBaseKm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (role === 'driver') {
                    setGenDriverBaseKm(val);
                    setGenBaseKm(val);
                  } else {
                    setGenVendorBaseKm(val);
                    setGenBaseKm(val);
                  }
                }}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                {role === 'driver' ? 'Driver Step Increment (km)' : 'Vendor Step Increment (km)'}
              </label>
              <input
                type="number"
                min={1}
                value={role === 'driver' ? genDriverStepKm : genVendorStepKm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (role === 'driver') {
                    setGenDriverStepKm(val);
                    setGenStepKm(val);
                  } else {
                    setGenVendorStepKm(val);
                    setGenStepKm(val);
                  }
                }}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Max Distance (km)
              </label>
              <input
                type="number"
                min={role === 'driver' ? genDriverBaseKm : genVendorBaseKm}
                step={10}
                value={genMaxKm}
                onChange={(e) => setGenMaxKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Geometry Composite Alignment Notice */}
          <div style={{
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: role === 'driver' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            border: `1px solid ${role === 'driver' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}>
            {role === 'driver' ? (
              <span>
                <strong>Independent Geometry:</strong> Vendor client billing is set at <strong>0–{genVendorBaseKm} km</strong> base (+<strong>{genVendorStepKm} km</strong> steps). Setting driver to <strong>0–{genDriverBaseKm} km</strong> (+<strong>{genDriverStepKm} km</strong>) will automatically synthesize unified composite distance slabs so both operate independently without conflicts.
              </span>
            ) : (
              <span>
                <strong>Independent Geometry:</strong> Driver guaranteed payout is set at <strong>0–{genDriverBaseKm} km</strong> base (+<strong>{genDriverStepKm} km</strong> steps). Setting vendor to <strong>0–{genVendorBaseKm} km</strong> (+<strong>{genVendorStepKm} km</strong>) will automatically synthesize unified composite distance slabs so both operate independently without conflicts.
              </span>
            )}
          </div>

          {/* 3. Base & Step Rates (ISOLATED) */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {role === 'driver' ? 'Driver Guaranteed Payout Rates' : 'Vendor Client Billing Rates'}
            </h4>

            {role === 'driver' ? (
              /* Driver Only Inputs */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-success)' }}>
                    Driver Base Payout (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={genBaseDriver}
                    onChange={(e) => setGenBaseDriver(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>For initial 0 – {genDriverBaseKm} km</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-success)' }}>
                    Driver Payout per Step (+₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={genStepDriver}
                    onChange={(e) => setGenStepDriver(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>For each additional +{genDriverStepKm} km</span>
                </div>
              </div>
            ) : (
              /* Vendor Only Inputs */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Vendor Base Fare (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={genBaseVendor}
                    onChange={(e) => setGenBaseVendor(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Client fare for 0 – {genVendorBaseKm} km</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Vendor Price per Step (+₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={genStepVendor}
                    onChange={(e) => setGenStepVendor(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Client fare per +{genVendorStepKm} km step</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Security Escort Rates (Vendor ONLY - Driver Escort completely removed) */}
          {(role === 'vendor' || role === 'unified') && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} /> Distance-Based Security Escort Add-on (Client Charge)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Client Escort Base (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={genEscortBaseVendor}
                    onChange={(e) => setGenEscortBaseVendor(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Base escort fee for 0 – {genVendorBaseKm} km</span>
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Client Escort Step (+₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={genEscortStepVendor}
                    onChange={(e) => setGenEscortStepVendor(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Escort increment per +{genVendorStepKm} km step</span>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Sparkles size={16} />}
            loading={saving}
            onClick={handleGenerateFullTable}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              background: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
              borderColor: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
            }}
          >
            Generate & Save Slabs Table up to {genMaxKm} km for {genVehicleType}
          </Button>
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 2: Multiple Peak Timing Windows & Vehicle Surcharges */}
      <BottomSheet
        isOpen={isPeakSheetOpen}
        onClose={() => setIsPeakSheetOpen(false)}
        title={role === 'driver' ? 'Configure Driver Peak Hours & Bonuses' : 'Configure Vendor Peak Hours & Surcharges'}
        subtitle="Configure multiple peak timing windows and set vehicle-specific peak bonuses added on top of base and step rates."
        icon={<Clock size={20} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Header & Add Window CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Configured Peak Timing Windows ({peakSlots.length})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {peakSlots.length > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveAllPeakWindows}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: 'var(--color-error)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease',
                  }}
                  title="Delete all peak timing windows and revert to standard rates"
                >
                  <Trash2 size={14} />
                  Clear All Peak Windows
                </button>
              )}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => {
                  const nextId = `slot-${Date.now()}`;
                  setPeakSlots([
                    ...peakSlots,
                    {
                      id: nextId,
                      label: `Peak Slot ${peakSlots.length + 1}`,
                      start: '20:00',
                      end: '23:00',
                      vehicleSurges: [
                        {
                          vehicleType: selectedVehicleChip || 'SEDAN',
                          vendorBaseExtra: 0,
                          vendorStepExtra: 0,
                          driverBaseExtra: 0,
                          driverStepExtra: 0,
                        },
                      ],
                    },
                  ]);
                }}
              >
                + Add Another Peak Window
              </Button>
            </div>
          </div>

          {/* List of Peak Slots or Empty State */}
          {peakSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px dashed var(--border)' }}>
              <Clock size={36} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                No Peak Timing Windows Configured
              </p>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                All trips for this matrix operate 24/7 on standard distance base and step rates without peak surcharges.
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => {
                  const nextId = `slot-${Date.now()}`;
                  setPeakSlots([
                    {
                      id: nextId,
                      label: `Peak Slot 1`,
                      start: '20:00',
                      end: '23:00',
                      vehicleSurges: [
                        {
                          vehicleType: selectedVehicleChip || 'SEDAN',
                          vendorBaseExtra: 0,
                          vendorStepExtra: 0,
                          driverBaseExtra: 0,
                          driverStepExtra: 0,
                        },
                      ],
                    },
                  ]);
                }}
              >
                Add First Peak Window
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {peakSlots.map((slot, sIdx) => {
                const duration = computeTimeDuration(slot.start, slot.end);
                return (
                  <div
                    key={slot.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    {/* Slot Header: Label, Start, End, Duration */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => {
                            const next = [...peakSlots];
                            next[sIdx].label = e.target.value;
                            setPeakSlots(next);
                          }}
                          style={{
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <span style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 800 }}>
                          {duration}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</span>
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => {
                              const next = [...peakSlots];
                              next[sIdx].start = e.target.value;
                              setPeakSlots(next);
                            }}
                            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 700 }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => {
                              const next = [...peakSlots];
                              next[sIdx].end = e.target.value;
                              setPeakSlots(next);
                            }}
                            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 700 }}
                          />
                        </div>

                        <button
                          onClick={() => setPeakSlots(peakSlots.filter((_, i) => i !== sIdx))}
                          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.4rem' }}
                          title="Remove this peak window"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                  {/* Vehicle Peak Surcharges for this Slot */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Vehicle Surcharges ({slot.vehicleSurges.length})
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Plus size={12} />}
                        onClick={() => {
                          const next = [...peakSlots];
                          next[sIdx].vehicleSurges.push({
                            vehicleType: availableVehicleChips.find((c) => !slot.vehicleSurges.some((s) => s.vehicleType === c)) || 'SEDAN',
                            vendorBaseExtra: 0,
                            vendorStepExtra: 0,
                            driverBaseExtra: 0,
                            driverStepExtra: 0,
                          });
                          setPeakSlots(next);
                        }}
                      >
                        + Add Vehicle Surcharge
                      </Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {slot.vehicleSurges.map((surge, vIdx) => (
                        <div
                          key={vIdx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: role === 'driver' ? '1.5fr 1fr 1fr auto' : role === 'vendor' ? '1.5fr 1fr 1fr auto' : '1fr 1fr 1fr 1fr 1fr auto',
                            gap: '0.75rem',
                            alignItems: 'center',
                            background: 'var(--bg-surface)',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vehicle</label>
                            <select
                              value={surge.vehicleType}
                              onChange={(e) => {
                                const next = [...peakSlots];
                                next[sIdx].vehicleSurges[vIdx].vehicleType = e.target.value;
                                setPeakSlots(next);
                              }}
                              style={{ width: '100%', marginTop: '0.2rem', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 700 }}
                            >
                              {availableVehicleChips.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          {/* Vendor Inputs (Only if Vendor or Unified) */}
                          {(role === 'vendor' || role === 'unified') && (
                            <>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>Vendor Base (+₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={surge.vendorBaseExtra}
                                  onChange={(e) => {
                                    const next = [...peakSlots];
                                    next[sIdx].vehicleSurges[vIdx].vendorBaseExtra = Number(e.target.value);
                                    setPeakSlots(next);
                                  }}
                                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>Vendor Step (+₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={surge.vendorStepExtra}
                                  onChange={(e) => {
                                    const next = [...peakSlots];
                                    next[sIdx].vehicleSurges[vIdx].vendorStepExtra = Number(e.target.value);
                                    setPeakSlots(next);
                                  }}
                                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                                />
                              </div>
                            </>
                          )}

                          {/* Driver Inputs (Only if Driver or Unified) */}
                          {(role === 'driver' || role === 'unified') && (
                            <>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Driver Base (+₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={surge.driverBaseExtra}
                                  onChange={(e) => {
                                    const next = [...peakSlots];
                                    next[sIdx].vehicleSurges[vIdx].driverBaseExtra = Number(e.target.value);
                                    setPeakSlots(next);
                                  }}
                                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Driver Step (+₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={surge.driverStepExtra}
                                  onChange={(e) => {
                                    const next = [...peakSlots];
                                    next[sIdx].vehicleSurges[vIdx].driverStepExtra = Number(e.target.value);
                                    setPeakSlots(next);
                                  }}
                                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                                />
                              </div>
                            </>
                          )}

                          {slot.vehicleSurges.length > 1 && (
                            <button
                              onClick={() => {
                                const next = [...peakSlots];
                                next[sIdx].vehicleSurges = next[sIdx].vehicleSurges.filter((_, i) => i !== vIdx);
                                setPeakSlots(next);
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.25rem' }}
                              title="Remove vehicle row"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Clock size={16} />}
            loading={saving}
            onClick={handleApplyPeakSurcharges}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              background: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
              borderColor: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
            }}
          >
            Apply & Save Peak Surcharges Across Matrix
          </Button>
        </div>
      </BottomSheet>

      {/* Vehicle Categories & Fleet Capacities Slide-out Drawer */}
      <VehicleCategoriesDrawer
        isOpen={isCategoriesDrawerOpen}
        onClose={() => setIsCategoriesDrawerOpen(false)}
        onCategoriesUpdated={() => loadPlans(selectedPlanId)}
      />
    </div>
  );
}
