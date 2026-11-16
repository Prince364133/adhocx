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

  // Bottom Sheet 1: Configure Pricing
  const [isConfigureSheetOpen, setIsConfigureSheetOpen] = useState(false);
  const [genVehicleType, setGenVehicleType] = useState<string>('SEDAN');
  const [genBaseKm, setGenBaseKm] = useState<number>(10);
  const [genStepKm, setGenStepKm] = useState<number>(10);
  const [genMaxKm, setGenMaxKm] = useState<number>(200);

  // Vendor Base and Step Pricing
  const [genBaseVendor, setGenBaseVendor] = useState<number | ''>('');
  const [genStepVendor, setGenStepVendor] = useState<number | ''>('');

  // Driver Base and Step Pricing
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

  function initFromPlan(plan: DistancePricingPlan, fallbackVehicle?: string) {
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
    } else {
      setEditingSlabs([]);
    }

    const currentCat = (plan.vehicleCategory && plan.vehicleCategory !== 'ALL')
      ? plan.vehicleCategory
      : fallbackVehicle || selectedVehicleChip || 'SEDAN';

    setSelectedVehicleChip(currentCat);
    setGenVehicleType(currentCat);

    // Hydrate multiple peak windows from plan
    const cfg = (plan as any).rateConfigJson || plan.config;
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
      setPeakSlots([]);
    }

    // Hydrate parameters if stored in rateConfigJson
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
      if (typeof cfg.vendorPeakExtraBaseRupees === 'number') setCurrentVendorPeakBase(cfg.vendorPeakExtraBaseRupees);
      if (typeof cfg.vendorPeakExtraStepRupees === 'number') setCurrentVendorPeakStep(cfg.vendorPeakExtraStepRupees);
      if (typeof cfg.driverPeakExtraBaseRupees === 'number') setCurrentDriverPeakBase(cfg.driverPeakExtraBaseRupees);
      if (typeof cfg.driverPeakExtraStepRupees === 'number') setCurrentDriverPeakStep(cfg.driverPeakExtraStepRupees);

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
    } else {
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
      const baseM = genBaseKm * 1000;
      const stepM = genStepKm * 1000;
      const steps = maxM > baseM ? Math.ceil((maxM - baseM) / stepM) : 0;
      const baseEscort = Number(genEscortBaseVendor) || 0;
      const stepEscort = Number(genEscortStepVendor) || 0;
      const vendorEscort = baseEscort + steps * stepEscort;
      return { vendorEscort };
    },
    [genBaseKm, genStepKm, genEscortBaseVendor, genEscortStepVendor]
  );

  // Generator: Generate full table from formula for the selected vehicle type and PERSIST DIRECTLY TO DATABASE
  const handleGenerateFullTable = async () => {
    if (genMaxKm <= 0 || genStepKm <= 0 || genBaseKm <= 0) {
      setAlert({ type: 'error', message: 'Base, step, and maximum distance must be positive values.' });
      return;
    }
    if (genMaxKm < genBaseKm) {
      setAlert({ type: 'error', message: 'Maximum distance cannot be less than initial base distance.' });
      return;
    }

    const baseMeters = Math.round(genBaseKm * 1000);
    const maxMeters = Math.round(genMaxKm * 1000);
    const stepMeters = Math.round(genStepKm * 1000);

    const numBaseVendor = Number(genBaseVendor) || 0;
    const numStepVendor = Number(genStepVendor) || 0;
    const numBaseDriver = Number(genBaseDriver) || 0;
    const numStepDriver = Number(genStepDriver) || 0;
    const numEscortBase = Number(genEscortBaseVendor) || 0;
    const numEscortStep = Number(genEscortStepVendor) || 0;

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
        vendorPricePaise: Math.round(numBaseVendor * 100),
        driverPayoutPaise: Math.round(numBaseDriver * 100),
        vendorPeakPricePaise: Math.round((numBaseVendor + currentVendorPeakBase) * 100),
        driverPeakPayoutPaise: Math.round((numBaseDriver + currentDriverPeakBase) * 100),
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
        const vStd = Math.round((numBaseVendor + stepIdx * numStepVendor) * 100);
        const dStd = Math.round((numBaseDriver + stepIdx * numStepDriver) * 100);
        const vPeak = Math.round((numBaseVendor + currentVendorPeakBase + stepIdx * (numStepVendor + currentVendorPeakStep)) * 100);
        const dPeak = Math.round((numBaseDriver + currentDriverPeakBase + stepIdx * (numStepDriver + currentDriverPeakStep)) * 100);

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

    setSaving(true);
    setEditingSlabs(newSlabs);
    setSelectedVehicleChip(genVehicleType);
    setIsConfigureSheetOpen(false);

    try {
      const configPayload = {
        baseKm: genBaseKm,
        stepKm: genStepKm,
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
        overriddenSlabs: Array.from(overriddenSlabKeys),
        peakSlots,
      };

      const peakWindowsPayload: PeakHourWindow[] = peakSlots.map((slot) => ({
        label: slot.label,
        start: slot.start,
        end: slot.end,
      }));

      const targetCategory = genVehicleType;
      const existingMatchingPlan = plans.find(
        (p) => p.vehicleCategory === targetCategory && p.status === 'ACTIVE'
      ) || plans.find((p) => p.vehicleCategory === targetCategory);

      let savedPlanId: string;
      if (existingMatchingPlan) {
        await adminApi.updateDistancePricingSlabs(existingMatchingPlan.id, newSlabs, undefined, {
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
          slabs: newSlabs,
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        await adminApi.publishDistancePricingPlan(newPlan.id, `Initial activation for ${targetCategory}`);
        savedPlanId = newPlan.id;
      }

      await loadPlans(savedPlanId);

      setAlert({
        type: 'success',
        message: `Saved & activated ${newSlabs.length} distance slabs for ${targetCategory} directly in database! Vendor quotes and driver payouts are now live with these rates.`,
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
    const baseM = genBaseKm * 1000;
    const stepM = genStepKm * 1000;

    const numBaseVendor = Number(genBaseVendor) || 0;
    const numStepVendor = Number(genStepVendor) || 0;
    const numBaseDriver = Number(genBaseDriver) || 0;
    const numStepDriver = Number(genStepDriver) || 0;

    let vStd = numBaseVendor;
    let dStd = numBaseDriver;
    let vPeak = numBaseVendor + currentVendorPeakBase;
    let dPeak = numBaseDriver + currentDriverPeakBase;

    if (target.minDistanceMExclusive > 0) {
      const stepIndex = Math.max(1, Math.round((target.maxDistanceMInclusive - baseM) / stepM));
      vStd = numBaseVendor + stepIndex * numStepVendor;
      dStd = numBaseDriver + stepIndex * numStepDriver;
      vPeak = numBaseVendor + currentVendorPeakBase + stepIndex * (numStepVendor + currentVendorPeakStep);
      dPeak = numBaseDriver + currentDriverPeakBase + stepIndex * (numStepDriver + currentDriverPeakStep);
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

  // Apply Peak Surcharges from configured slots across slabs and persist to database
  const handleApplyPeakSurcharges = async () => {
    // Find highest extra from configured peak slots matching vehicle chip
    let maxVBaseExtra = currentVendorPeakBase;
    let maxVStepExtra = currentVendorPeakStep;
    let maxDBaseExtra = currentDriverPeakBase;
    let maxDStepExtra = currentDriverPeakStep;

    peakSlots.forEach((slot) => {
      const match = slot.vehicleSurges.find((s) => s.vehicleType === selectedVehicleChip);
      if (match) {
        if (match.vendorBaseExtra > 0) maxVBaseExtra = match.vendorBaseExtra;
        if (match.vendorStepExtra > 0) maxVStepExtra = match.vendorStepExtra;
        if (match.driverBaseExtra > 0) maxDBaseExtra = match.driverBaseExtra;
        if (match.driverStepExtra > 0) maxDStepExtra = match.driverStepExtra;
      }
    });

    setCurrentVendorPeakBase(maxVBaseExtra);
    setCurrentVendorPeakStep(maxVStepExtra);
    setCurrentDriverPeakBase(maxDBaseExtra);
    setCurrentDriverPeakStep(maxDStepExtra);

    const baseM = genBaseKm * 1000;
    const stepM = genStepKm * 1000;

    const updated = editingSlabs.map((s) => {
      let vExtra = maxVBaseExtra;
      let dExtra = maxDBaseExtra;
      if (s.minDistanceMExclusive > 0) {
        const stepIndex = Math.max(1, Math.round((s.maxDistanceMInclusive - baseM) / stepM));
        vExtra = maxVBaseExtra + stepIndex * maxVStepExtra;
        dExtra = maxDBaseExtra + stepIndex * maxDStepExtra;
      }

      return {
        ...s,
        vendorPeakPricePaise: s.vendorPricePaise + Math.round(vExtra * 100),
        driverPeakPayoutPaise: s.driverPayoutPaise + Math.round(dExtra * 100),
      };
    });

    setSaving(true);
    setEditingSlabs(updated);
    setIsPeakSheetOpen(false);

    try {
      const configPayload = {
        baseKm: genBaseKm,
        stepKm: genStepKm,
        maxKm: genMaxKm,
        baseVendorRupees: Number(genBaseVendor) || 0,
        stepVendorRupees: Number(genStepVendor) || 0,
        vendorPeakExtraBaseRupees: maxVBaseExtra,
        vendorPeakExtraStepRupees: maxVStepExtra,
        baseDriverRupees: Number(genBaseDriver) || 0,
        stepDriverRupees: Number(genStepDriver) || 0,
        driverPeakExtraBaseRupees: maxDBaseExtra,
        driverPeakExtraStepRupees: maxDStepExtra,
        escortBaseVendorRupees: Number(genEscortBaseVendor) || 0,
        escortStepVendorRupees: Number(genEscortStepVendor) || 0,
        slabEscorts,
        overriddenSlabs: Array.from(overriddenSlabKeys),
        peakSlots,
      };

      const peakWindowsPayload: PeakHourWindow[] = peakSlots.map((slot) => ({
        label: slot.label,
        start: slot.start,
        end: slot.end,
      }));

      const targetCategory = selectedVehicleChip || genVehicleType || 'SEDAN';
      const existingPlan = plans.find(
        (p) => p.vehicleCategory === targetCategory && p.status === 'ACTIVE'
      ) || plans.find((p) => p.vehicleCategory === targetCategory);

      if (existingPlan) {
        await adminApi.updateDistancePricingSlabs(existingPlan.id, updated, undefined, {
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        await loadPlans(existingPlan.id);
      } else if (updated.length > 0) {
        const newPlan = await adminApi.createDistancePricingPlan({
          name: `${targetCategory} Distance Pricing Matrix`,
          vehicleCategory: targetCategory,
          slabs: updated,
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        await adminApi.publishDistancePricingPlan(newPlan.id, `Initial activation with peak surcharges for ${targetCategory}`);
        await loadPlans(newPlan.id);
      }

      setAlert({
        type: 'success',
        message: `Applied and saved ${peakSlots.length} peak windows for ${selectedVehicleChip} directly in database! Peak rates are live for vendors and drivers.`,
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

      // If unified or vendor, ensure vendor >= driver
      if (s.vendorPricePaise < s.driverPayoutPaise) {
        return {
          valid: false,
          isUnconfigured: false,
          error: `Negative Margin Detected on ${minKm}–${maxKm} km! Vendor fare (₹${s.vendorPricePaise / 100}) cannot be less than Driver payout (₹${s.driverPayoutPaise / 100}).`,
        };
      }
    }

    return { valid: true, isUnconfigured: false, error: null };
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
      const numBaseVendor = Number(genBaseVendor) || 0;
      const numStepVendor = Number(genStepVendor) || 0;
      const numBaseDriver = Number(genBaseDriver) || 0;
      const numStepDriver = Number(genStepDriver) || 0;
      const numEscortBase = Number(genEscortBaseVendor) || 0;
      const numEscortStep = Number(genEscortStepVendor) || 0;

      const configPayload = {
        baseKm: genBaseKm,
        stepKm: genStepKm,
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
        overriddenSlabs: overriddenArray,
        peakSlots,
      };

      const peakWindowsPayload: PeakHourWindow[] = peakSlots.map((slot) => ({
        label: slot.label,
        start: slot.start,
        end: slot.end,
      }));

      const targetCategory = selectedVehicleChip || genVehicleType || 'SEDAN';
      const existingMatchingPlan = plans.find(
        (p) => p.vehicleCategory === targetCategory && p.status === 'ACTIVE'
      ) || plans.find((p) => p.vehicleCategory === targetCategory);

      if (existingMatchingPlan) {
        await adminApi.updateDistancePricingSlabs(existingMatchingPlan.id, editingSlabs, undefined, {
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        setAlert({
          type: 'success',
          message: `Saved matrix for ${targetCategory} with ${editingSlabs.length} distance bands and ${peakSlots.length} peak windows. Ready for live apps.`,
        });
        await loadPlans(existingMatchingPlan.id);
      } else {
        const newPlan = await adminApi.createDistancePricingPlan({
          name: `${targetCategory} Distance Pricing Matrix`,
          vehicleCategory: targetCategory,
          slabs: editingSlabs,
          config: configPayload as any,
          peakWindows: peakWindowsPayload,
        });
        await adminApi.publishDistancePricingPlan(newPlan.id, `Initial activation for ${targetCategory}`);
        setAlert({
          type: 'success',
          message: `Created and published new ${targetCategory} matrix with ${editingSlabs.length} distance bands and ${peakSlots.length} peak windows.`,
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
            onClick={() => setIsConfigureSheetOpen(true)}
            style={{
              background: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
              borderColor: role === 'driver' ? 'var(--color-success)' : 'var(--brand-primary)',
            }}
          >
            Configure Pricing
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
                  {v}
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>For initial 0 – {genBaseKm} km</span>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>For each additional +{genStepKm} km</span>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Client fare for 0 – {genBaseKm} km</span>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Client fare per +{genStepKm} km step</span>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Base escort fee for 0 – {genBaseKm} km</span>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Escort increment per +{genStepKm} km step</span>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Configured Peak Timing Windows ({peakSlots.length})
            </h4>
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

          {/* List of Peak Slots */}
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

                      {peakSlots.length > 1 && (
                        <button
                          onClick={() => setPeakSlots(peakSlots.filter((_, i) => i !== sIdx))}
                          style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '0.4rem' }}
                          title="Remove this peak window"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
    </div>
  );
}
