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
    endMinutes += 24 * 60; // overnight peak window
  }
  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (minutes === 0) return `${hours} hrs 00 mins`;
  return `${hours} hrs ${minutes < 10 ? '0' : ''}${minutes} mins`;
}

interface VehiclePeakExtra {
  vehicleType: string;
  vendorBaseExtra: number;
  vendorStepExtra: number;
  driverBaseExtra: number;
  driverStepExtra: number;
}

export default function PricingMatrixWorkspace({ initialRole = 'vendor' }: PricingMatrixWorkspaceProps) {
  const [role] = useState<MatrixRole>(initialRole);
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Selected Vehicle Chip filter
  const [selectedVehicleChip, setSelectedVehicleChip] = useState<string>('ALL');

  // Slabs & Overrides State
  const [editingSlabs, setEditingSlabs] = useState<CreatePricingSlabInput[]>([]);
  const [overriddenSlabKeys, setOverriddenSlabKeys] = useState<Set<string>>(new Set());

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Bottom Sheet 1: Configure Pricing
  const [isConfigureSheetOpen, setIsConfigureSheetOpen] = useState(false);
  const [genVehicleType, setGenVehicleType] = useState<string>('ALL');
  const [genBaseKm, setGenBaseKm] = useState<number>(10);
  const [genStepKm, setGenStepKm] = useState<number>(10);
  const [genMaxKm, setGenMaxKm] = useState<number>(200);

  // Base and Step Pricing
  const [genBaseVendor, setGenBaseVendor] = useState<number>(400);
  const [genStepVendor, setGenStepVendor] = useState<number>(100);
  const [genBaseDriver, setGenBaseDriver] = useState<number>(300);
  const [genStepDriver, setGenStepDriver] = useState<number>(70);

  // Escort Pricing
  const [genEscortBaseVendor, setGenEscortBaseVendor] = useState<number>(300);
  const [genEscortStepVendor, setGenEscortStepVendor] = useState<number>(50);
  const [genEscortBaseDriver, setGenEscortBaseDriver] = useState<number>(200);
  const [genEscortStepDriver, setGenEscortStepDriver] = useState<number>(30);

  // Bottom Sheet 2: Peak Pricing
  const [isPeakSheetOpen, setIsPeakSheetOpen] = useState(false);
  const [peakStartTime, setPeakStartTime] = useState<string>('18:00');
  const [peakEndTime, setPeakEndTime] = useState<string>('21:00');
  const [peakVehicleSurges, setPeakVehicleSurges] = useState<VehiclePeakExtra[]>([
    {
      vehicleType: 'ALL',
      vendorBaseExtra: 80,
      vendorStepExtra: 60,
      driverBaseExtra: 50,
      driverStepExtra: 40,
    },
  ]);

  // Surcharge for current active vehicle
  const [currentVendorPeakBase, setCurrentVendorPeakBase] = useState<number>(80);
  const [currentVendorPeakStep, setCurrentVendorPeakStep] = useState<number>(60);
  const [currentDriverPeakBase, setCurrentDriverPeakBase] = useState<number>(50);
  const [currentDriverPeakStep, setCurrentDriverPeakStep] = useState<number>(40);

  // Simulation State
  const [simDistanceKm, setSimDistanceKm] = useState<number>(62.5);
  const [simTimeOfDay, setSimTimeOfDay] = useState<string>('18:30');
  const [simIncludeEscort, setSimIncludeEscort] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<DistanceSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

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

      const planToSelect =
        (preferredPlanId && plansData.find((p) => p.id === preferredPlanId)) ||
        plansData.find((p) => p.status === 'ACTIVE') ||
        plansData[0];

      if (planToSelect) {
        setSelectedPlanId(planToSelect.id);
        initFromPlan(planToSelect);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to load pricing data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  function initFromPlan(plan: DistancePricingPlan) {
    if (plan.slabs && plan.slabs.length > 0) {
      setEditingSlabs(
        plan.slabs.map((s) => ({
          minDistanceMExclusive: s.minDistanceMExclusive,
          maxDistanceMInclusive: s.maxDistanceMInclusive,
          vendorPricePaise: s.vendorPricePaise,
          driverPayoutPaise: s.driverPayoutPaise,
          vendorPeakPricePaise: s.vendorPeakPricePaise ?? s.vendorPricePaise,
          driverPeakPayoutPaise: s.driverPeakPayoutPaise ?? s.driverPayoutPaise,
          active: s.active,
        }))
      );
    }

    if (plan.vehicleCategory) {
      setSelectedVehicleChip(plan.vehicleCategory);
      setGenVehicleType(plan.vehicleCategory);
    }

    // Peak windows
    if (Array.isArray(plan.peakWindows) && plan.peakWindows.length > 0) {
      setPeakStartTime(plan.peakWindows[0].start || '18:00');
      setPeakEndTime(plan.peakWindows[0].end || '21:00');
    }

    // Hydrate parameters if stored in rateConfigJson
    const cfg = (plan as any).rateConfigJson || plan.config;
    if (cfg && typeof cfg === 'object') {
      if (typeof cfg.baseKm === 'number' && cfg.baseKm > 0) setGenBaseKm(cfg.baseKm);
      if (typeof cfg.stepKm === 'number' && cfg.stepKm > 0) setGenStepKm(cfg.stepKm);
      if (typeof cfg.maxKm === 'number' && cfg.maxKm > 0) setGenMaxKm(cfg.maxKm);
      if (typeof cfg.baseVendorRupees === 'number') setGenBaseVendor(cfg.baseVendorRupees);
      if (typeof cfg.stepVendorRupees === 'number') setGenStepVendor(cfg.stepVendorRupees);
      if (typeof cfg.baseDriverRupees === 'number') setGenBaseDriver(cfg.baseDriverRupees);
      if (typeof cfg.stepDriverRupees === 'number') setGenStepDriver(cfg.stepDriverRupees);
      if (typeof cfg.escortBaseVendorRupees === 'number') setGenEscortBaseVendor(cfg.escortBaseVendorRupees);
      if (typeof cfg.escortStepVendorRupees === 'number') setGenEscortStepVendor(cfg.escortStepVendorRupees);
      if (typeof cfg.escortBaseDriverRupees === 'number') setGenEscortBaseDriver(cfg.escortBaseDriverRupees);
      if (typeof cfg.escortStepDriverRupees === 'number') setGenEscortStepDriver(cfg.escortStepDriverRupees);
      if (typeof cfg.vendorPeakExtraBaseRupees === 'number') setCurrentVendorPeakBase(cfg.vendorPeakExtraBaseRupees);
      if (typeof cfg.vendorPeakExtraStepRupees === 'number') setCurrentVendorPeakStep(cfg.vendorPeakExtraStepRupees);
      if (typeof cfg.driverPeakExtraBaseRupees === 'number') setCurrentDriverPeakBase(cfg.driverPeakExtraBaseRupees);
      if (typeof cfg.driverPeakExtraStepRupees === 'number') setCurrentDriverPeakStep(cfg.driverPeakExtraStepRupees);

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
    }
  }

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  // Available Vehicle Chips: 'ALL' + all active vehicle types
  const availableVehicleChips = useMemo(() => {
    const list = ['ALL'];
    vehicleCategories.forEach((vc) => {
      if (!list.includes(vc.vehicleType)) list.push(vc.vehicleType);
    });
    // Add vehicleCategory from existing plans if not present
    plans.forEach((p) => {
      if (p.vehicleCategory && !list.includes(p.vehicleCategory)) {
        list.push(p.vehicleCategory);
      }
    });
    return list;
  }, [vehicleCategories, plans]);

  // Handle vehicle chip switch
  const handleSelectVehicleChip = (chip: string) => {
    setSelectedVehicleChip(chip);
    setGenVehicleType(chip);
    const matchingPlan = plans.find((p) => p.vehicleCategory === chip && p.status === 'ACTIVE') ||
      plans.find((p) => p.vehicleCategory === chip);
    if (matchingPlan) {
      setSelectedPlanId(matchingPlan.id);
      initFromPlan(matchingPlan);
    }
  };

  // Helper for escort fee calculation per distance
  const getEscortFeeForDistance = useCallback(
    (maxM: number) => {
      const baseM = genBaseKm * 1000;
      const stepM = genStepKm * 1000;
      const steps = maxM > baseM ? Math.ceil((maxM - baseM) / stepM) : 0;
      const vendorEscort = genEscortBaseVendor + steps * genEscortStepVendor;
      const driverEscort = genEscortBaseDriver + steps * genEscortStepDriver;
      return { vendorEscort, driverEscort };
    },
    [genBaseKm, genStepKm, genEscortBaseVendor, genEscortStepVendor, genEscortBaseDriver, genEscortStepDriver]
  );

  // Generator: Generate full table from formula for the selected vehicle type
  const handleGenerateFullTable = () => {
    if (genMaxKm <= 0 || genStepKm <= 0 || genBaseKm <= 0) {
      setAlert({ type: 'error', message: 'Base, step, and maximum distance must be positive values.' });
      return;
    }
    if (genMaxKm < genBaseKm) {
      setAlert({ type: 'error', message: 'Maximum distance cannot be less than initial base distance.' });
      return;
    }
    if (genBaseVendor < genBaseDriver) {
      setAlert({ type: 'error', message: 'Vendor Base fare cannot be less than Driver Base payout.' });
      return;
    }

    const baseMeters = Math.round(genBaseKm * 1000);
    const maxMeters = Math.round(genMaxKm * 1000);
    const stepMeters = Math.round(genStepKm * 1000);

    const existingMap = new Map<string, CreatePricingSlabInput>();
    editingSlabs.forEach((s) => {
      existingMap.set(`${s.minDistanceMExclusive}-${s.maxDistanceMInclusive}`, s);
    });

    const newSlabs: CreatePricingSlabInput[] = [];

    // Base Tier (0 to baseKm)
    const baseKey = `0-${Math.min(baseMeters, maxMeters)}`;
    const existingBase = existingMap.get(baseKey);
    if (existingBase && overriddenSlabKeys.has(baseKey)) {
      newSlabs.push(existingBase);
    } else {
      newSlabs.push({
        minDistanceMExclusive: 0,
        maxDistanceMInclusive: Math.min(baseMeters, maxMeters),
        vendorPricePaise: Math.round(genBaseVendor * 100),
        driverPayoutPaise: Math.round(genBaseDriver * 100),
        vendorPeakPricePaise: Math.round((genBaseVendor + currentVendorPeakBase) * 100),
        driverPeakPayoutPaise: Math.round((genBaseDriver + currentDriverPeakBase) * 100),
        active: true,
      });
    }

    // Incremental Steps
    let currentMin = baseMeters;
    let stepIdx = 1;
    while (currentMin < maxMeters) {
      const nextMax = Math.min(currentMin + stepMeters, maxMeters);
      const key = `${currentMin}-${nextMax}`;
      const existingStep = existingMap.get(key);

      if (existingStep && overriddenSlabKeys.has(key)) {
        newSlabs.push(existingStep);
      } else {
        const vStd = Math.round((genBaseVendor + stepIdx * genStepVendor) * 100);
        const dStd = Math.round((genBaseDriver + stepIdx * genStepDriver) * 100);
        const vPeak = Math.round((genBaseVendor + currentVendorPeakBase + stepIdx * (genStepVendor + currentVendorPeakStep)) * 100);
        const dPeak = Math.round((genBaseDriver + currentDriverPeakBase + stepIdx * (genStepDriver + currentDriverPeakStep)) * 100);

        newSlabs.push({
          minDistanceMExclusive: currentMin,
          maxDistanceMInclusive: nextMax,
          vendorPricePaise: vStd,
          driverPayoutPaise: dStd,
          vendorPeakPricePaise: vPeak,
          driverPeakPayoutPaise: dPeak,
          active: true,
        });
      }

      currentMin = nextMax;
      stepIdx++;
    }

    setEditingSlabs(newSlabs);
    setSelectedVehicleChip(genVehicleType);
    setIsConfigureSheetOpen(false);
    setAlert({
      type: 'success',
      message: `Generated ${newSlabs.length} slabs up to ${genMaxKm} km for vehicle ${genVehicleType}. Standard base & step rates configured.`,
    });
  };

  // Inline slab edit handler (Price or Escort edit)
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

  // Reset individual slab to mathematical formula
  const handleResetSlabToFormula = (index: number) => {
    const target = editingSlabs[index];
    const baseM = genBaseKm * 1000;
    const stepM = genStepKm * 1000;

    let vStd = genBaseVendor;
    let dStd = genBaseDriver;
    let vPeak = genBaseVendor + currentVendorPeakBase;
    let dPeak = genBaseDriver + currentDriverPeakBase;

    if (target.minDistanceMExclusive > 0) {
      const stepIndex = Math.max(1, Math.round((target.maxDistanceMInclusive - baseM) / stepM));
      vStd = genBaseVendor + stepIndex * genStepVendor;
      dStd = genBaseDriver + stepIndex * genStepDriver;
      vPeak = genBaseVendor + currentVendorPeakBase + stepIndex * (genStepVendor + currentVendorPeakStep);
      dPeak = genBaseDriver + currentDriverPeakBase + stepIndex * (genStepDriver + currentDriverPeakStep);
    }

    const updated = [...editingSlabs];
    updated[index] = {
      ...target,
      vendorPricePaise: Math.round(vStd * 100),
      driverPayoutPaise: Math.round(dStd * 100),
      vendorPeakPricePaise: Math.round(vPeak * 100),
      driverPeakPayoutPaise: Math.round(dPeak * 100),
    };

    const key = `${target.minDistanceMExclusive}-${target.maxDistanceMInclusive}`;
    const newOverrides = new Set(overriddenSlabKeys);
    newOverrides.delete(key);

    setEditingSlabs(updated);
    setOverriddenSlabKeys(newOverrides);
    setAlert({
      type: 'success',
      message: `Reset slab ${target.minDistanceMExclusive / 1000}–${target.maxDistanceMInclusive / 1000} km back to formula.`,
    });
  };

  // Apply Peak Surcharges to slabs
  const handleApplyPeakSurcharges = () => {
    const surge = peakVehicleSurges.find((s) => s.vehicleType === selectedVehicleChip) ||
      peakVehicleSurges.find((s) => s.vehicleType === 'ALL') || {
        vendorBaseExtra: currentVendorPeakBase,
        vendorStepExtra: currentVendorPeakStep,
        driverBaseExtra: currentDriverPeakBase,
        driverStepExtra: currentDriverPeakStep,
      };

    setCurrentVendorPeakBase(surge.vendorBaseExtra);
    setCurrentVendorPeakStep(surge.vendorStepExtra);
    setCurrentDriverPeakBase(surge.driverBaseExtra);
    setCurrentDriverPeakStep(surge.driverStepExtra);

    const baseM = genBaseKm * 1000;
    const stepM = genStepKm * 1000;

    const updated = editingSlabs.map((s) => {
      let vExtra = surge.vendorBaseExtra;
      let dExtra = surge.driverBaseExtra;
      if (s.minDistanceMExclusive > 0) {
        const stepIndex = Math.max(1, Math.round((s.maxDistanceMInclusive - baseM) / stepM));
        vExtra = surge.vendorBaseExtra + stepIndex * surge.vendorStepExtra;
        dExtra = surge.driverBaseExtra + stepIndex * surge.driverStepExtra;
      }

      return {
        ...s,
        vendorPeakPricePaise: s.vendorPricePaise + Math.round(vExtra * 100),
        driverPeakPayoutPaise: s.driverPayoutPaise + Math.round(dExtra * 100),
      };
    });

    setEditingSlabs(updated);
    setIsPeakSheetOpen(false);
    setAlert({
      type: 'success',
      message: `Applied peak surcharges for ${selectedVehicleChip} (${peakStartTime} – ${peakEndTime}). Peak rates updated across all slabs.`,
    });
  };

  // Validation: Loss Prevention Guardrail
  const validation = useMemo(() => {
    if (editingSlabs.length === 0) {
      return { valid: false, error: 'No slabs configured. Please click "Configure Pricing" to generate slabs.' };
    }
    if (editingSlabs[0].minDistanceMExclusive !== 0) {
      return { valid: false, error: 'First distance band must start at 0 km.' };
    }

    for (let i = 0; i < editingSlabs.length; i++) {
      const s = editingSlabs[i];
      const minKm = s.minDistanceMExclusive / 1000;
      const maxKm = s.maxDistanceMInclusive / 1000;

      if (s.maxDistanceMInclusive <= s.minDistanceMExclusive) {
        return { valid: false, error: `Slab #${i + 1} (${minKm}–${maxKm} km): Max distance must exceed min distance.` };
      }

      if (s.vendorPricePaise < s.driverPayoutPaise) {
        return {
          valid: false,
          error: `Negative Margin Detected on ${minKm}–${maxKm} km! Vendor fare (₹${s.vendorPricePaise / 100}) cannot be less than Driver payout (₹${s.driverPayoutPaise / 100}).`,
        };
      }

      const vPeak = s.vendorPeakPricePaise ?? s.vendorPricePaise;
      const dPeak = s.driverPeakPayoutPaise ?? s.driverPayoutPaise;
      if (vPeak < dPeak) {
        return {
          valid: false,
          error: `Negative Peak Margin Detected on ${minKm}–${maxKm} km! Vendor peak (₹${vPeak / 100}) cannot be less than Driver peak payout (₹${dPeak / 100}).`,
        };
      }
    }

    return { valid: true, error: null };
  }, [editingSlabs]);

  // Save Slabs Draft / Live Update to PostgreSQL
  const handleSaveMatrix = async () => {
    if (!validation.valid) {
      setAlert({ type: 'error', message: validation.error || 'Please correct errors before saving.' });
      return;
    }

    setSaving(true);
    try {
      const overriddenArray = Array.from(overriddenSlabKeys);

      const configPayload = {
        baseKm: genBaseKm,
        stepKm: genStepKm,
        maxKm: genMaxKm,
        baseVendorRupees: genBaseVendor,
        stepVendorRupees: genStepVendor,
        vendorPeakExtraBaseRupees: currentVendorPeakBase,
        vendorPeakExtraStepRupees: currentVendorPeakStep,
        baseDriverRupees: genBaseDriver,
        stepDriverRupees: genStepDriver,
        driverPeakExtraBaseRupees: currentDriverPeakBase,
        driverPeakExtraStepRupees: currentDriverPeakStep,
        escortBaseVendorRupees: genEscortBaseVendor,
        escortStepVendorRupees: genEscortStepVendor,
        escortBaseDriverRupees: genEscortBaseDriver,
        escortStepDriverRupees: genEscortStepDriver,
        overriddenSlabs: overriddenArray,
      };

      const peakWindowsPayload: PeakHourWindow[] = [
        {
          label: 'Peak Window',
          start: peakStartTime,
          end: peakEndTime,
        },
      ];

      if (activePlan) {
        await adminApi.updateDistancePricingSlabs(activePlan.id, editingSlabs, undefined, {
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        setAlert({
          type: 'success',
          message: `Saved matrix with ${editingSlabs.length} distance bands directly to database. Ready for driver & vendor apps.`,
        });
        await loadPlans(activePlan.id);
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
          distanceKm: Number(simDistanceKm),
          vehicleCategory: selectedVehicleChip,
          pickupTime: `${istToday}T${hhmm}:00+05:30`,
          hasEscort: simIncludeEscort,
        });
        if (!cancelled) setSimResult(res);
      } catch {
        if (!cancelled) setSimResult(null);
      } finally {
        if (!cancelled) setSimulating(false);
      }
    }

    const t = setTimeout(runSim, 200);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [simDistanceKm, simTimeOfDay, simIncludeEscort, activePlan, selectedVehicleChip]);

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

  const peakDurationString = computeTimeDuration(peakStartTime, peakEndTime);

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
              {role === 'vendor' ? 'Vendor Rate Matrix' : role === 'driver' ? 'Driver Payout Matrix' : 'Unified Rate Matrix'}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Route size={24} color="var(--brand-primary)" />
            {role === 'vendor' ? 'Vendor Rate Matrix (Client Billing)' : role === 'driver' ? 'Driver Guaranteed Payouts' : 'Unified Distance Slabs Matrix'}
            <StatusBadge status={activePlan?.status === 'ACTIVE' ? 'APPROVED' : 'PENDING'} label={activePlan?.status || 'DRAFT'} />
          </h1>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            leftIcon={<Sparkles size={15} />}
            onClick={() => setIsConfigureSheetOpen(true)}
          >
            Configure Pricing
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Clock size={15} />}
            onClick={() => setIsPeakSheetOpen(true)}
          >
            Peak Pricing
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
      {!validation.valid && (
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
            return (
              <button
                key={chip}
                onClick={() => handleSelectVehicleChip(chip)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '999px',
                  border: isSelected ? '1.5px solid var(--brand-primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(91, 66, 243, 0.25)' : 'none',
                }}
              >
                <Car size={14} />
                <span>{chip === 'ALL' ? 'All Vehicles (Default)' : chip}</span>
              </button>
            );
          })}
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

                {/* Vendor Columns */}
                {(role === 'vendor' || role === 'unified') && (
                  <>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Vendor Std Fare (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Peak Extra (+₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Total Peak (₹)</th>
                  </>
                )}

                {/* Driver Columns */}
                {(role === 'driver' || role === 'unified') && (
                  <>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Driver Payout (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Driver Peak (+₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Total Peak (₹)</th>
                  </>
                )}

                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Security Escort (₹)</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Platform Net Margin</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlabs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No distance slabs configured. Click <strong>Configure Pricing</strong> above to generate the full matrix table.
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

                  // Escort
                  const escort = getEscortFeeForDistance(slab.maxDistanceMInclusive);

                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isNegativeMargin
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
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'var(--brand-primary)', color: '#fff', fontWeight: 800 }}>BASE</span>
                          </div>
                        ) : (
                          <span>&gt;{minKm} – {maxKm} km</span>
                        )}
                      </td>

                      {/* Vendor Columns (Inline Editable) */}
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
                        </>
                      )}

                      {/* Driver Columns (Inline Editable) */}
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

                      {/* Security Escort */}
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
                        <div>{inr(escort.vendorEscort)} client</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{inr(escort.driverEscort)} driver</div>
                      </td>

                      {/* Platform Net Margin */}
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

          {/* Simulation Output Card */}
          {simResult && (
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', background: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Vendor Charge</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>{inr(simResult.vendorPriceRupees)}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Driver Payout</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)' }}>{inr(simResult.driverPayoutRupees)}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Platform Margin</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
                  +{inr(simResult.vendorPriceRupees - simResult.driverPayoutRupees)} (
                  {simResult.vendorPriceRupees > 0
                    ? (((simResult.vendorPriceRupees - simResult.driverPayoutRupees) / simResult.vendorPriceRupees) * 100).toFixed(1)
                    : '0'}
                  %)
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* BOTTOM SHEET 1: Configure Pricing */}
      <BottomSheet
        isOpen={isConfigureSheetOpen}
        onClose={() => setIsConfigureSheetOpen(false)}
        title="Configure Distance & Pricing Generator"
        subtitle="Configure the distance geometry and base/step rates. Generating will build all contiguous distance bands up to your maximum target reach."
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
              onChange={(e) => setGenVehicleType(e.target.value)}
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
                  {v === 'ALL' ? 'All Vehicles (Global Default)' : v}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Distance Geometry */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Base Distance (km)
              </label>
              <input
                type="number"
                min={1}
                value={genBaseKm}
                onChange={(e) => setGenBaseKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Step Increment (km)
              </label>
              <input
                type="number"
                min={1}
                value={genStepKm}
                onChange={(e) => setGenStepKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Max Distance (km)
              </label>
              <input
                type="number"
                min={genBaseKm}
                step={10}
                value={genMaxKm}
                onChange={(e) => setGenMaxKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* 3. Base & Step Rates */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Standard Base & Step Rates
            </h4>
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
              </div>
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
              </div>
            </div>
          </div>

          {/* 4. Security Escort Rates */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} /> Distance-Based Security Escort Add-on
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
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Driver Escort Base (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={genEscortBaseDriver}
                  onChange={(e) => setGenEscortBaseDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Driver Escort Step (+₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={genEscortStepDriver}
                  onChange={(e) => setGenEscortStepDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Sparkles size={16} />}
            onClick={handleGenerateFullTable}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Generate Slabs Table up to {genMaxKm} km for {genVehicleType}
          </Button>
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 2: Peak Pricing */}
      <BottomSheet
        isOpen={isPeakSheetOpen}
        onClose={() => setIsPeakSheetOpen(false)}
        title="Configure Peak Hours & Vehicle Surcharges"
        subtitle="Set the peak operating hours and customize peak bonuses added on top of base and step rates."
        icon={<Clock size={20} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Time Window & Duration */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Peak Start Time
                </label>
                <input
                  type="time"
                  value={peakStartTime}
                  onChange={(e) => setPeakStartTime(e.target.value)}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Peak End Time
                </label>
                <input
                  type="time"
                  value={peakEndTime}
                  onChange={(e) => setPeakEndTime(e.target.value)}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 700 }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Peak Duration
                </div>
                <div style={{ marginTop: '0.45rem', display: 'inline-block', padding: '0.35rem 0.75rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 800, fontSize: '0.85rem' }}>
                  {peakDurationString}
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Category Peak Surcharges */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vehicle Peak Surcharges (Added on Top of Base & Step Fares)
              </h4>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => {
                  setPeakVehicleSurges([
                    ...peakVehicleSurges,
                    {
                      vehicleType: availableVehicleChips.find((c) => !peakVehicleSurges.some((s) => s.vehicleType === c)) || 'SEDAN',
                      vendorBaseExtra: 80,
                      vendorStepExtra: 60,
                      driverBaseExtra: 50,
                      driverStepExtra: 40,
                    },
                  ]);
                }}
              >
                Add Vehicle Row
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {peakVehicleSurges.map((surge, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto',
                    gap: '0.75rem',
                    alignItems: 'center',
                    background: 'var(--bg-surface-elevated)',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vehicle</label>
                    <select
                      value={surge.vehicleType}
                      onChange={(e) => {
                        const next = [...peakVehicleSurges];
                        next[idx].vehicleType = e.target.value;
                        setPeakVehicleSurges(next);
                      }}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 700 }}
                    >
                      {availableVehicleChips.map((c) => (
                        <option key={c} value={c}>{c === 'ALL' ? 'All (Default)' : c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>Vendor Base (+₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={surge.vendorBaseExtra}
                      onChange={(e) => {
                        const next = [...peakVehicleSurges];
                        next[idx].vendorBaseExtra = Number(e.target.value);
                        setPeakVehicleSurges(next);
                      }}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontWeight: 600 }}>Vendor Step (+₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={surge.vendorStepExtra}
                      onChange={(e) => {
                        const next = [...peakVehicleSurges];
                        next[idx].vendorStepExtra = Number(e.target.value);
                        setPeakVehicleSurges(next);
                      }}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Driver Base (+₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={surge.driverBaseExtra}
                      onChange={(e) => {
                        const next = [...peakVehicleSurges];
                        next[idx].driverBaseExtra = Number(e.target.value);
                        setPeakVehicleSurges(next);
                      }}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Driver Step (+₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={surge.driverStepExtra}
                      onChange={(e) => {
                        const next = [...peakVehicleSurges];
                        next[idx].driverStepExtra = Number(e.target.value);
                        setPeakVehicleSurges(next);
                      }}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {peakVehicleSurges.length > 1 && (
                    <button
                      onClick={() => {
                        setPeakVehicleSurges(peakVehicleSurges.filter((_, i) => i !== idx));
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.25rem' }}
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Clock size={16} />}
            onClick={handleApplyPeakSurcharges}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Apply Peak Surcharges Across Matrix
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
