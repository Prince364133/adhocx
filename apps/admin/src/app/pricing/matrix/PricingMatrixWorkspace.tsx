  'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Route,
  ArrowLeft,
  Building2,
  Car,
  Layers,
  Sliders,
  Sparkles,
  Save,
  AlertTriangle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { adminApi } from '@/lib/api/client';
import {
  DistancePricingPlan,
  CreatePricingSlabInput,
  VehicleCategory,
  DistanceSimulationResult,
} from '@/lib/api/types';
import { Card, Button, StatusBadge, Drawer } from '@/components/common';

export type MatrixRole = 'vendor' | 'driver' | 'unified';

interface PricingMatrixWorkspaceProps {
  initialRole?: MatrixRole;
}

const inr = (rupees: number | undefined) => `₹${Number(rupees ?? 0).toLocaleString('en-IN')}`;

export default function PricingMatrixWorkspace({ initialRole = 'vendor' }: PricingMatrixWorkspaceProps) {
  const [role, setRole] = useState<MatrixRole>(initialRole);
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Slabs & Overrides State
  const [editingSlabs, setEditingSlabs] = useState<CreatePricingSlabInput[]>([]);
  const [overriddenSlabKeys, setOverriddenSlabKeys] = useState<Set<string>>(new Set());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<'ALL' | '0-25' | '25-50' | '50-100' | '100-200' | 'OVERRIDDEN'>('ALL');

  // Generator Drawer State
  const [isFormulaDrawerOpen, setIsFormulaDrawerOpen] = useState(false);
  const [genBaseKm, setGenBaseKm] = useState<number>(10);
  const [genStepKm, setGenStepKm] = useState<number>(10);
  const [genMaxKm, setGenMaxKm] = useState<number>(200);

  // Vendor Formula
  const [genBaseVendor, setGenBaseVendor] = useState<number>(400);
  const [genStepVendor, setGenStepVendor] = useState<number>(100);
  const [genVendorPeakExtraBase, setGenVendorPeakExtraBase] = useState<number>(80);
  const [genVendorPeakExtraStep, setGenVendorPeakExtraStep] = useState<number>(60);

  // Driver Formula
  const [genBaseDriver, setGenBaseDriver] = useState<number>(300);
  const [genStepDriver, setGenStepDriver] = useState<number>(70);
  const [genDriverPeakExtraBase, setGenDriverPeakExtraBase] = useState<number>(50);
  const [genDriverPeakExtraStep, setGenDriverPeakExtraStep] = useState<number>(40);

  // Escort Formula
  const [genEscortBaseVendor, setGenEscortBaseVendor] = useState<number>(300);
  const [genEscortStepVendor, setGenEscortStepVendor] = useState<number>(50);
  const [genEscortBaseDriver, setGenEscortBaseDriver] = useState<number>(200);
  const [genEscortStepDriver, setGenEscortStepDriver] = useState<number>(30);

  // Override Preservation
  const [preserveOverrides, setPreserveOverrides] = useState<boolean>(true);

  // Batch Adjustment Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMinKm, setBatchMinKm] = useState<number>(50);
  const [batchMaxKm, setBatchMaxKm] = useState<number>(200);
  const [batchTarget, setBatchTarget] = useState<'vendor' | 'driver' | 'both'>('vendor');
  const [batchType, setBatchType] = useState<'flat' | 'percent'>('flat');
  const [batchAmount, setBatchAmount] = useState<number>(50);

  // Live Simulator State
  const [simDistanceKm, setSimDistanceKm] = useState<number>(62.5);
  const [simTimeOfDay, setSimTimeOfDay] = useState<string>('09:30');
  const [simIncludeEscort, setSimIncludeEscort] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<DistanceSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Load Pricing Plans and Categories
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

    // Hydrate generator parameters if stored in rateConfigJson
    const cfg = (plan as any).rateConfigJson || plan.config;
    if (cfg && typeof cfg === 'object') {
      if (typeof cfg.baseKm === 'number' && cfg.baseKm > 0) setGenBaseKm(cfg.baseKm);
      if (typeof cfg.stepKm === 'number' && cfg.stepKm > 0) setGenStepKm(cfg.stepKm);
      if (typeof cfg.maxKm === 'number' && cfg.maxKm > 0) setGenMaxKm(cfg.maxKm);
      if (typeof cfg.baseVendorRupees === 'number') setGenBaseVendor(cfg.baseVendorRupees);
      if (typeof cfg.stepVendorRupees === 'number') setGenStepVendor(cfg.stepVendorRupees);
      if (typeof cfg.vendorPeakExtraBaseRupees === 'number') setGenVendorPeakExtraBase(cfg.vendorPeakExtraBaseRupees);
      if (typeof cfg.vendorPeakExtraStepRupees === 'number') setGenVendorPeakExtraStep(cfg.vendorPeakExtraStepRupees);
      if (typeof cfg.baseDriverRupees === 'number') setGenBaseDriver(cfg.baseDriverRupees);
      if (typeof cfg.stepDriverRupees === 'number') setGenStepDriver(cfg.stepDriverRupees);
      if (typeof cfg.driverPeakExtraBaseRupees === 'number') setGenDriverPeakExtraBase(cfg.driverPeakExtraBaseRupees);
      if (typeof cfg.driverPeakExtraStepRupees === 'number') setGenDriverPeakExtraStep(cfg.driverPeakExtraStepRupees);
      if (typeof cfg.escortBaseVendorRupees === 'number') setGenEscortBaseVendor(cfg.escortBaseVendorRupees);
      if (typeof cfg.escortStepVendorRupees === 'number') setGenEscortStepVendor(cfg.escortStepVendorRupees);
      if (typeof cfg.escortBaseDriverRupees === 'number') setGenEscortBaseDriver(cfg.escortBaseDriverRupees);
      if (typeof cfg.escortStepDriverRupees === 'number') setGenEscortStepDriver(cfg.escortStepDriverRupees);

      // Hydrate custom overrides set
      if (Array.isArray(cfg.overriddenSlabs)) {
        const keys = new Set<string>();
        cfg.overriddenSlabs.forEach((item: any) => {
          if (typeof item?.minM === 'number' && typeof item?.maxM === 'number') {
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

  // Generator: Generate full table from formula
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
    if (preserveOverrides && existingBase && overriddenSlabKeys.has(baseKey)) {
      newSlabs.push(existingBase);
    } else {
      newSlabs.push({
        minDistanceMExclusive: 0,
        maxDistanceMInclusive: Math.min(baseMeters, maxMeters),
        vendorPricePaise: Math.round(genBaseVendor * 100),
        driverPayoutPaise: Math.round(genBaseDriver * 100),
        vendorPeakPricePaise: Math.round((genBaseVendor + genVendorPeakExtraBase) * 100),
        driverPeakPayoutPaise: Math.round((genBaseDriver + genDriverPeakExtraBase) * 100),
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

      if (preserveOverrides && existingStep && overriddenSlabKeys.has(key)) {
        newSlabs.push(existingStep);
      } else {
        const vStd = Math.round((genBaseVendor + stepIdx * genStepVendor) * 100);
        const dStd = Math.round((genBaseDriver + stepIdx * genStepDriver) * 100);
        const vPeak = Math.round((genBaseVendor + genVendorPeakExtraBase + stepIdx * (genStepVendor + genVendorPeakExtraStep)) * 100);
        const dPeak = Math.round((genBaseDriver + genDriverPeakExtraBase + stepIdx * (genStepDriver + genDriverPeakExtraStep)) * 100);

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
    setIsFormulaDrawerOpen(false);
    setAlert({
      type: 'success',
      message: `Generated ${newSlabs.length} slabs up to ${genMaxKm} km (Base: 0-${genBaseKm}km, Steps: +${genStepKm}km). ${preserveOverrides ? 'Preserved existing custom overrides.' : ''}`,
    });
  };

  // Helper to calculate expected formula rates for a slab
  const getFormulaRatesForSlab = useCallback(
    (minM: number, maxM: number) => {
      const baseM = genBaseKm * 1000;
      const stepM = genStepKm * 1000;

      if (minM === 0) {
        return {
          vendorPricePaise: Math.round(genBaseVendor * 100),
          driverPayoutPaise: Math.round(genBaseDriver * 100),
          vendorPeakPricePaise: Math.round((genBaseVendor + genVendorPeakExtraBase) * 100),
          driverPeakPayoutPaise: Math.round((genBaseDriver + genDriverPeakExtraBase) * 100),
        };
      }

      const stepIndex = Math.max(1, Math.round((maxM - baseM) / stepM));
      return {
        vendorPricePaise: Math.round((genBaseVendor + stepIndex * genStepVendor) * 100),
        driverPayoutPaise: Math.round((genBaseDriver + stepIndex * genStepDriver) * 100),
        vendorPeakPricePaise: Math.round((genBaseVendor + genVendorPeakExtraBase + stepIndex * (genStepVendor + genVendorPeakExtraStep)) * 100),
        driverPeakPayoutPaise: Math.round((genBaseDriver + genDriverPeakExtraBase + stepIndex * (genStepDriver + genDriverPeakExtraStep)) * 100),
      };
    },
    [
      genBaseKm,
      genStepKm,
      genBaseVendor,
      genStepVendor,
      genVendorPeakExtraBase,
      genVendorPeakExtraStep,
      genBaseDriver,
      genStepDriver,
      genDriverPeakExtraBase,
      genDriverPeakExtraStep,
    ]
  );

  // Escort calculation per distance
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

  // Reset individual slab to formula
  const handleResetSlabToFormula = (index: number) => {
    const target = editingSlabs[index];
    const formulaRates = getFormulaRatesForSlab(target.minDistanceMExclusive, target.maxDistanceMInclusive);

    const updated = [...editingSlabs];
    updated[index] = {
      ...target,
      ...formulaRates,
    };

    const key = `${target.minDistanceMExclusive}-${target.maxDistanceMInclusive}`;
    const newOverrides = new Set(overriddenSlabKeys);
    newOverrides.delete(key);

    setEditingSlabs(updated);
    setOverriddenSlabKeys(newOverrides);
    setAlert({
      type: 'success',
      message: `Reset slab ${target.minDistanceMExclusive / 1000}–${target.maxDistanceMInclusive / 1000} km back to mathematical formula.`,
    });
  };

  // Batch Adjust
  const handleApplyBatchAdjustment = () => {
    if (batchMinKm >= batchMaxKm) {
      setAlert({ type: 'error', message: 'Min distance must be less than max distance.' });
      return;
    }

    const minM = batchMinKm * 1000;
    const maxM = batchMaxKm * 1000;
    let count = 0;

    const newOverrides = new Set(overriddenSlabKeys);
    const updated = editingSlabs.map((s) => {
      if (s.minDistanceMExclusive >= minM && s.maxDistanceMInclusive <= maxM) {
        count++;
        const key = `${s.minDistanceMExclusive}-${s.maxDistanceMInclusive}`;
        newOverrides.add(key);

        let vPrice = s.vendorPricePaise;
        let dPayout = s.driverPayoutPaise;
        let vPeak = s.vendorPeakPricePaise ?? s.vendorPricePaise;
        let dPeak = s.driverPeakPayoutPaise ?? s.driverPayoutPaise;

        if (batchType === 'flat') {
          const deltaPaise = Math.round(batchAmount * 100);
          if (batchTarget === 'vendor' || batchTarget === 'both') {
            vPrice = Math.max(0, vPrice + deltaPaise);
            vPeak = Math.max(0, vPeak + deltaPaise);
          }
          if (batchTarget === 'driver' || batchTarget === 'both') {
            dPayout = Math.max(0, dPayout + deltaPaise);
            dPeak = Math.max(0, dPeak + deltaPaise);
          }
        } else {
          const factor = 1 + batchAmount / 100;
          if (batchTarget === 'vendor' || batchTarget === 'both') {
            vPrice = Math.round(vPrice * factor);
            vPeak = Math.round(vPeak * factor);
          }
          if (batchTarget === 'driver' || batchTarget === 'both') {
            dPayout = Math.round(dPayout * factor);
            dPeak = Math.round(dPeak * factor);
          }
        }

        return {
          ...s,
          vendorPricePaise: vPrice,
          driverPayoutPaise: dPayout,
          vendorPeakPricePaise: vPeak,
          driverPeakPayoutPaise: dPeak,
        };
      }
      return s;
    });

    setEditingSlabs(updated);
    setOverriddenSlabKeys(newOverrides);
    setIsBatchModalOpen(false);
    setAlert({
      type: 'success',
      message: `Applied batch adjustment to ${count} slabs between ${batchMinKm} km and ${batchMaxKm} km.`,
    });
  };

  // Validation: Loss Prevention & Negative Margin Guard
  const validation = useMemo(() => {
    if (editingSlabs.length === 0) {
      return { valid: false, error: 'No slabs configured. Please generate or add slabs.' };
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

      if (i > 0) {
        const prev = editingSlabs[i - 1];
        if (s.minDistanceMExclusive !== prev.maxDistanceMInclusive) {
          return {
            valid: false,
            error: `Distance gap or overlap detected between ${prev.minDistanceMExclusive / 1000}–${prev.maxDistanceMInclusive / 1000} km and ${minKm}–${maxKm} km. Ranges must be contiguous.`,
          };
        }
      }
    }

    return { valid: true, error: null };
  }, [editingSlabs]);

  // Save Slabs Draft / Live Update
  const handleSaveMatrix = async () => {
    if (!validation.valid) {
      setAlert({ type: 'error', message: validation.error || 'Please correct errors before saving.' });
      return;
    }

    setSaving(true);
    try {
      const overriddenArray = Array.from(overriddenSlabKeys).map((key) => {
        const [minM, maxM] = key.split('-').map(Number);
        return { minM, maxM, updatedAt: new Date().toISOString() };
      });

      const configPayload = {
        baseKm: genBaseKm,
        stepKm: genStepKm,
        maxKm: genMaxKm,
        baseVendorRupees: genBaseVendor,
        stepVendorRupees: genStepVendor,
        vendorPeakExtraBaseRupees: genVendorPeakExtraBase,
        vendorPeakExtraStepRupees: genVendorPeakExtraStep,
        baseDriverRupees: genBaseDriver,
        stepDriverRupees: genStepDriver,
        driverPeakExtraBaseRupees: genDriverPeakExtraBase,
        driverPeakExtraStepRupees: genDriverPeakExtraStep,
        escortBaseVendorRupees: genEscortBaseVendor,
        escortStepVendorRupees: genEscortStepVendor,
        escortBaseDriverRupees: genEscortBaseDriver,
        escortStepDriverRupees: genEscortStepDriver,
        overriddenSlabs: overriddenArray,
      };

      if (activePlan) {
        await adminApi.updateDistancePricingSlabs(activePlan.id, editingSlabs, undefined, {
          config: configPayload as any,
        });
        setAlert({
          type: 'success',
          message: `Saved matrix with ${editingSlabs.length} distance bands and ${overriddenArray.length} custom overrides.`,
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
          vehicleCategory: activePlan?.vehicleCategory || 'ALL',
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
  }, [simDistanceKm, simTimeOfDay, simIncludeEscort, activePlan]);

  // Filtered slabs for table display
  const filteredSlabs = useMemo(() => {
    return editingSlabs
      .map((slab, index) => ({ slab, originalIndex: index }))
      .filter(({ slab }) => {
        const minKm = slab.minDistanceMExclusive / 1000;
        const maxKm = slab.maxDistanceMInclusive / 1000;
        const key = `${slab.minDistanceMExclusive}-${slab.maxDistanceMInclusive}`;
        const isOverridden = overriddenSlabKeys.has(key);

        if (distanceFilter === '0-25' && maxKm > 25) return false;
        if (distanceFilter === '25-50' && (maxKm <= 25 || maxKm > 50)) return false;
        if (distanceFilter === '50-100' && (maxKm <= 50 || maxKm > 100)) return false;
        if (distanceFilter === '100-200' && maxKm <= 100) return false;
        if (distanceFilter === 'OVERRIDDEN' && !isOverridden) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchKm = `${minKm}`.includes(q) || `${maxKm}`.includes(q);
          const matchPrice =
            `${slab.vendorPricePaise / 100}`.includes(q) || `${slab.driverPayoutPaise / 100}`.includes(q);
          if (!matchKm && !matchPrice) return false;
        }

        return true;
      });
  }, [editingSlabs, distanceFilter, searchQuery, overriddenSlabKeys]);

  if (loading) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading Distance Pricing Matrix Workspace...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Breadcrumbs & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            <Link href="/pricing" style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowLeft size={14} /> Pricing Overview
            </Link>
            <ChevronRight size={13} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {role === 'vendor' ? 'Vendor Rate Matrix (Client Billing)' : role === 'driver' ? 'Driver Payout Matrix' : 'Unified Rate Matrix'}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Route size={24} color="var(--brand-primary)" />
            {role === 'vendor' ? 'Vendor Rate Matrix' : role === 'driver' ? 'Driver Guaranteed Payouts' : 'Unified Distance Slabs Matrix'}
            <StatusBadge status={activePlan?.status === 'ACTIVE' ? 'APPROVED' : 'PENDING'} label={activePlan?.status || 'DRAFT'} />
          </h1>
        </div>

        {/* Global Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button
            variant="outline"
            leftIcon={<Sliders size={15} />}
            onClick={() => setIsFormulaDrawerOpen(true)}
          >
            Configure Formula
          </Button>
          <Button
            variant="secondary"
            leftIcon={<SlidersHorizontal size={15} />}
            onClick={() => setIsBatchModalOpen(true)}
          >
            Batch Adjust
          </Button>
          <Button
            variant="primary"
            leftIcon={<Save size={15} />}
            loading={saving}
            disabled={!validation.valid}
            onClick={handleSaveMatrix}
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

      {/* Loss-Prevention Validation Warning */}
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

      {/* Control Bar: Role Tabs & Plan Version */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        {/* Role Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-surface-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setRole('vendor')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: role === 'vendor' ? 'var(--brand-primary)' : 'transparent',
              color: role === 'vendor' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Building2 size={15} /> Vendor Billing (Client)
          </button>
          <button
            onClick={() => setRole('driver')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: role === 'driver' ? 'var(--color-success)' : 'transparent',
              color: role === 'driver' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Car size={15} /> Driver Payouts
          </button>
          <button
            onClick={() => setRole('unified')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: role === 'unified' ? 'var(--text-primary)' : 'transparent',
              color: role === 'unified' ? 'var(--bg-surface)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Layers size={15} /> Unified Side-by-Side
          </button>
        </div>

        {/* Plan & Category Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category:</span>
            <select
              value={activePlan?.vehicleCategory || 'ALL'}
              disabled
              style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Categories (Default)</option>
              {vehicleCategories.map((c) => (
                <option key={c.id} value={c.vehicleType}>{c.categoryLabel}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Version:</span>
            <select
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                const p = plans.find((x) => x.id === e.target.value);
                if (p) initFromPlan(p);
              }}
              style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>v{p.version} ({p.status})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1rem', borderLeft: '4px solid var(--brand-primary)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Base Rule</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            0 – {genBaseKm} km
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Vendor: {inr(genBaseVendor)} | Driver: {inr(genBaseDriver)}
          </div>
        </Card>

        <Card style={{ padding: '1rem', borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Step Increment</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            +{genStepKm} km
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            +{inr(genStepVendor)} / +{inr(genStepDriver)} per step
          </div>
        </Card>

        <Card style={{ padding: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Slabs</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {editingSlabs.length} Bands
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Coverage up to {genMaxKm} km
          </div>
        </Card>

        <Card style={{ padding: '1rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Custom Overrides</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.25rem' }}>
            {overriddenSlabKeys.size} Overrides
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manually tuned distance bands
          </div>
        </Card>
      </div>

      {/* Slabs Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {(['ALL', '0-25', '25-50', '50-100', '100-200', 'OVERRIDDEN'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDistanceFilter(filter)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border)',
                background: distanceFilter === filter ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: distanceFilter === filter ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {filter === 'ALL' ? 'All Bands' : filter === 'OVERRIDDEN' ? `Overrides (${overriddenSlabKeys.size})` : `${filter} km`}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
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
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Interactive Slabs Matrix Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '680px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Distance Band</th>

                {/* Vendor Columns */}
                {(role === 'vendor' || role === 'unified') && (
                  <>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Vendor Std (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Peak Extra (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Total Peak (₹)</th>
                  </>
                )}

                {/* Driver Columns */}
                {(role === 'driver' || role === 'unified') && (
                  <>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Driver Std (₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Driver Peak (+₹)</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>Total Peak (₹)</th>
                  </>
                )}

                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Security Escort</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Platform Net Margin</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlabs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No distance slabs match your filter. Click <strong>Configure Formula</strong> to generate slabs up to {genMaxKm} km.
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
                      {/* Distance Band */}
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
                                  width: '85px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: isNegativeMargin ? '1px solid var(--color-error)' : '1px solid var(--border)',
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
                                  width: '85px',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: isNegativeMargin ? '1px solid var(--color-error)' : '1px solid var(--border)',
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
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
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
                            title="Reset this distance band back to the formula"
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

      {/* Live Rate Simulator Drawer / Widget at Bottom */}
      <Card style={{ padding: '1.25rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--brand-primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Quote Simulator
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Test any arbitrary distance against your configured matrix
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

      {/* DRAWER: Matrix Formula Generator */}
      <Drawer
        isOpen={isFormulaDrawerOpen}
        onClose={() => setIsFormulaDrawerOpen(false)}
        title="Configure Distance & Step Formula"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Set standard mathematical rules for your continuous distance slabs. Generating the table will populate all bands up to the maximum target reach.
          </p>

          {/* Distance Geometry */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Base Distance (km)</label>
              <input
                type="number"
                min={1}
                value={genBaseKm}
                onChange={(e) => setGenBaseKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Step Increment (km)</label>
              <input
                type="number"
                min={1}
                value={genStepKm}
                onChange={(e) => setGenStepKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Maximum Target Reach (km)</label>
            <input
              type="number"
              min={genBaseKm}
              step={10}
              value={genMaxKm}
              onChange={(e) => setGenMaxKm(Number(e.target.value))}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>e.g. 100 km, 200 km, or 500 km</span>
          </div>

          {/* Vendor Rates */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={15} /> Vendor Client Pricing
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Base Fare (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={genBaseVendor}
                  onChange={(e) => setGenBaseVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Price per Step (+₹)</label>
                <input
                  type="number"
                  min={1}
                  value={genStepVendor}
                  onChange={(e) => setGenStepVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Peak Extra Base (+₹)</label>
                <input
                  type="number"
                  min={0}
                  value={genVendorPeakExtraBase}
                  onChange={(e) => setGenVendorPeakExtraBase(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Peak Extra Step (+₹)</label>
                <input
                  type="number"
                  min={0}
                  value={genVendorPeakExtraStep}
                  onChange={(e) => setGenVendorPeakExtraStep(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Driver Payouts */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Car size={15} /> Driver Guaranteed Payouts
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Base Payout (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={genBaseDriver}
                  onChange={(e) => setGenBaseDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Payout per Step (+₹)</label>
                <input
                  type="number"
                  min={1}
                  value={genStepDriver}
                  onChange={(e) => setGenStepDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Driver Peak Base (+₹)</label>
                <input
                  type="number"
                  min={0}
                  value={genDriverPeakExtraBase}
                  onChange={(e) => setGenDriverPeakExtraBase(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Driver Peak Step (+₹)</label>
                <input
                  type="number"
                  min={0}
                  value={genDriverPeakExtraStep}
                  onChange={(e) => setGenDriverPeakExtraStep(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Security Escort */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={15} /> Distance-Based Security Escort Add-on
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Client Base (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={genEscortBaseVendor}
                  onChange={(e) => setGenEscortBaseVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Client Step (+₹)</label>
                <input
                  type="number"
                  min={0}
                  value={genEscortStepVendor}
                  onChange={(e) => setGenEscortStepVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Override Preservation Checkbox */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="preserveOverrides"
              checked={preserveOverrides}
              onChange={(e) => setPreserveOverrides(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
            />
            <label htmlFor="preserveOverrides" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Preserve manual overrides on custom-edited slabs
            </label>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Sparkles size={16} />}
            onClick={handleGenerateFullTable}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Generate Slabs Table up to {genMaxKm} km
          </Button>
        </div>
      </Drawer>

      {/* MODAL: Batch Adjustment */}
      <Drawer
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Batch Adjust Slabs Range"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Apply a flat (+₹) or percentage (+%) adjustment across an entire corridor range (e.g. all slabs beyond 50 km).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>From Distance (km)</label>
              <input
                type="number"
                min={0}
                value={batchMinKm}
                onChange={(e) => setBatchMinKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To Distance (km)</label>
              <input
                type="number"
                min={batchMinKm}
                value={batchMaxKm}
                onChange={(e) => setBatchMaxKm(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Rate Card</label>
            <select
              value={batchTarget}
              onChange={(e) => setBatchTarget(e.target.value as any)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
            >
              <option value="vendor">Vendor Rates Only (Client Billing)</option>
              <option value="driver">Driver Payouts Only</option>
              <option value="both">Both Vendor & Driver</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Adjustment Type</label>
              <select
                value={batchType}
                onChange={(e) => setBatchType(e.target.value as any)}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
              >
                <option value="flat">Flat Amount (₹)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {batchType === 'flat' ? 'Amount (₹)' : 'Percentage (%)'}
              </label>
              <input
                type="number"
                value={batchAmount}
                onChange={(e) => setBatchAmount(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<SlidersHorizontal size={16} />}
            onClick={handleApplyBatchAdjustment}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Apply Adjustment to Slabs
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
