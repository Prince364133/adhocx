'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Route,
  Plus,
  Edit2,
  Trash2,
  History,
  AlertTriangle,
  Send,
  Clock,
  Zap,
  Building2,
  Car,
  CheckCircle2,
  Sliders,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  DistancePricingPlan,
  CreatePricingSlabInput,
  PricingAuditItem,
  DistanceSimulationResult,
  PeakHourWindow,
  VehicleCategory,
} from '../../lib/api/types';
import { Card, Button, StatusBadge, Drawer } from '../../components/common';

const inr = (rupees: number | undefined) => `₹${Number(rupees ?? 0).toLocaleString('en-IN')}`;

export function DynamicDistancePricingSection() {
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Security Escort Distance Configuration State (Base Tier + Step Increment)
  const [genEscortBaseVendor, setGenEscortBaseVendor] = useState<number>(300);
  const [genEscortStepVendor, setGenEscortStepVendor] = useState<number>(50);
  const genEscortBaseDriver = 0;
  const genEscortStepDriver = 0;
  const [simIncludeEscort, setSimIncludeEscort] = useState<boolean>(false);

  // Peak Hours Configuration State
  const [peakWindows, setPeakWindows] = useState<PeakHourWindow[]>([]);
  const [editingWindows, setEditingWindows] = useState<PeakHourWindow[]>([]);

  // Draft & Edit Slabs State
  const [editingSlabs, setEditingSlabs] = useState<CreatePricingSlabInput[]>([]);
  const [isEditSlabsOpen, setIsEditSlabsOpen] = useState(false);
  const [savingSlabs, setSavingSlabs] = useState(false);
  const [slabEditReason, setSlabEditReason] = useState('');

  // Step Generator State (Base Tier + Step Increment + Flat Peak Extra)
  const [genBaseKm, setGenBaseKm] = useState<number>(10);
  const [genStepKm, setGenStepKm] = useState<number>(5);
  const [genMaxKm, setGenMaxKm] = useState<number>(50);
  const [genBaseVendor, setGenBaseVendor] = useState<number>(400);
  const [genStepVendor, setGenStepVendor] = useState<number>(100);
  const [genBaseDriver, setGenBaseDriver] = useState<number>(300);
  const [genStepDriver, setGenStepDriver] = useState<number>(70);
  const [genVendorPeakExtraBase, setGenVendorPeakExtraBase] = useState<number>(80);
  const [genVendorPeakExtraStep, setGenVendorPeakExtraStep] = useState<number>(60);
  const [genDriverPeakExtraBase, setGenDriverPeakExtraBase] = useState<number>(50);
  const [genDriverPeakExtraStep, setGenDriverPeakExtraStep] = useState<number>(40);

  // Dedicated Drawers for Independent Vendor, Driver, and Peak Hours Configuration
  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [isEditPeakHoursOpen, setIsEditPeakHoursOpen] = useState(false);
  const [autoActivateLive, setAutoActivateLive] = useState(true);
  const [selectedPeakVehicleCategory, setSelectedPeakVehicleCategory] = useState<string>('ALL');
  const [vehiclePeakSurges, setVehiclePeakSurges] = useState<Record<string, {
    vendorPeakExtraBase: number;
    vendorPeakExtraStep: number;
    driverPeakExtraBase: number;
    driverPeakExtraStep: number;
  }>>({});

  // Retire (deactivate) State
  const [isRetireOpen, setIsRetireOpen] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [retireReason, setRetireReason] = useState('');

  // Create New Plan Version State
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [newPlanVersion, setNewPlanVersion] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCategory, setNewPlanCategory] = useState('ALL');
  const [cloneFromActive, setCloneFromActive] = useState(true);

  // Publish Modal State
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishReason, setPublishReason] = useState('');
  const [publishEffectiveFrom, setPublishEffectiveFrom] = useState('');

  // Audit Logs State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<PricingAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Interactive Simulator State
  const [simDistanceKm, setSimDistanceKm] = useState<number>(22.4);
  const [simTimeOfDay, setSimTimeOfDay] = useState<string>('09:30');
  const [simResult, setSimResult] = useState<DistanceSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const loadPlans = useCallback(async (preferredPlanId?: string) => {
    setLoading(true);
    try {
      const [data, policy] = await Promise.all([
        adminApi.getDistancePricingPlans(),
        adminApi.getPolicyConfig().catch(() => null),
      ]);
      setPlans(data);
      if (policy && policy.escortFee !== undefined && Number.isFinite(policy.escortFee)) {
        setGenEscortBaseVendor(Number(policy.escortFee));
      }
      if (data.length > 0) {
        if (preferredPlanId && data.some((p) => p.id === preferredPlanId)) {
          setSelectedPlanId(preferredPlanId);
        } else {
          const active = data.find((p) => p.status === 'ACTIVE') || data[0];
          setSelectedPlanId(active.id);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load rate plans' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVehicleCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const categories = await adminApi.getPricingTiers();
      setVehicleCategories(categories.filter((category) => category.isActive !== false));
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load vehicle categories' });
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
    loadVehicleCategories();
  }, [loadPlans, loadVehicleCategories]);

  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  // Sync peak windows from plan
  useEffect(() => {
    if (activePlan?.peakWindows && activePlan.peakWindows.length > 0) {
      setPeakWindows(activePlan.peakWindows);
      setEditingWindows(activePlan.peakWindows);
    } else {
      setPeakWindows([]);
      setEditingWindows([]);
    }

    if (activePlan?.config) {
      const cfg = activePlan.config as any;
      if (typeof cfg.baseKm === 'number') setGenBaseKm(cfg.baseKm);
      if (typeof cfg.stepKm === 'number') setGenStepKm(cfg.stepKm);
      if (typeof cfg.maxDistanceKm === 'number') setGenMaxKm(cfg.maxDistanceKm);
      if (typeof cfg.baseVendorRupees === 'number') setGenBaseVendor(cfg.baseVendorRupees);
      if (typeof cfg.baseDriverRupees === 'number') setGenBaseDriver(cfg.baseDriverRupees);
      if (typeof cfg.stepVendorRupees === 'number') setGenStepVendor(cfg.stepVendorRupees);
      if (typeof cfg.stepDriverRupees === 'number') setGenStepDriver(cfg.stepDriverRupees);
      if (typeof cfg.vendorPeakExtraBaseRupees === 'number') setGenVendorPeakExtraBase(cfg.vendorPeakExtraBaseRupees);
      if (typeof cfg.vendorPeakExtraStepRupees === 'number') setGenVendorPeakExtraStep(cfg.vendorPeakExtraStepRupees);
      if (typeof cfg.driverPeakExtraBaseRupees === 'number') setGenDriverPeakExtraBase(cfg.driverPeakExtraBaseRupees);
      if (typeof cfg.driverPeakExtraStepRupees === 'number') setGenDriverPeakExtraStep(cfg.driverPeakExtraStepRupees);
      if (typeof cfg.escortBaseVendorRupees === 'number') setGenEscortBaseVendor(cfg.escortBaseVendorRupees);
      if (typeof cfg.escortStepVendorRupees === 'number') setGenEscortStepVendor(cfg.escortStepVendorRupees);
      if (cfg.vehicleSurges && typeof cfg.vehicleSurges === 'object') {
        setVehiclePeakSurges(cfg.vehicleSurges);
      }
    }
  }, [activePlan]);

  // Derived high-level rules & platform margins for master overview cards
  const derivedRules = useMemo(() => {
    const s0 = activePlan?.slabs?.[0];
    const s1 = activePlan?.slabs?.[1];
    const baseKm = s0 ? Math.round(s0.maxDistanceMInclusive / 1000) : genBaseKm;
    const stepKm = s1 ? Math.round((s1.maxDistanceMInclusive - s1.minDistanceMExclusive) / 1000) : genStepKm;
    const vendorBaseStd = s0 ? s0.vendorPriceRupees : genBaseVendor;
    const vendorBasePeak = s0 ? Math.round((s0.vendorPeakPricePaise ?? s0.vendorPricePaise) / 100) : (genBaseVendor + genVendorPeakExtraBase);
    const driverBaseStd = s0 ? s0.driverPayoutRupees : genBaseDriver;
    const driverBasePeak = s0 ? Math.round((s0.driverPeakPayoutPaise ?? s0.driverPayoutPaise) / 100) : (genBaseDriver + genDriverPeakExtraBase);

    const vendorStepStd = s1 ? s1.vendorPriceRupees - s0!.vendorPriceRupees : genStepVendor;
    const s1VendorPeak = s1 ? (s1.vendorPeakPricePaise ?? s1.vendorPricePaise) / 100 : vendorBasePeak + genVendorPeakExtraStep;
    const vendorStepPeak = Math.max(0, s1VendorPeak - vendorBasePeak);

    const driverStepStd = s1 ? s1.driverPayoutRupees - s0!.driverPayoutRupees : genStepDriver;
    const s1DriverPeak = s1 ? (s1.driverPeakPayoutPaise ?? s1.driverPayoutPaise) / 100 : driverBasePeak + genDriverPeakExtraStep;
    const driverStepPeak = Math.max(0, s1DriverPeak - driverBasePeak);

    // Margins (Ride)
    const rideBaseMarginStd = vendorBaseStd - driverBaseStd;
    const rideBaseMarginStdPct = vendorBaseStd > 0 ? ((rideBaseMarginStd / vendorBaseStd) * 100).toFixed(1) : '0';
    const rideStepMarginStd = vendorStepStd - driverStepStd;
    const rideStepMarginStdPct = vendorStepStd > 0 ? ((rideStepMarginStd / vendorStepStd) * 100).toFixed(1) : '0';

    const rideBaseMarginPeak = vendorBasePeak - driverBasePeak;
    const rideBaseMarginPeakPct = vendorBasePeak > 0 ? ((rideBaseMarginPeak / vendorBasePeak) * 100).toFixed(1) : '0';
    const rideStepMarginPeak = vendorStepPeak - driverStepPeak;
    const rideStepMarginPeakPct = vendorStepPeak > 0 ? ((rideStepMarginPeak / vendorStepPeak) * 100).toFixed(1) : '0';

    // Margins (Escort)
    const escortBaseVendor = genEscortBaseVendor;
    const escortStepVendor = genEscortStepVendor;
    const escortBaseDriver = genEscortBaseDriver;
    const escortStepDriver = genEscortStepDriver;

    const escortBaseMargin = escortBaseVendor - escortBaseDriver;
    const escortBaseMarginPct = escortBaseVendor > 0 ? ((escortBaseMargin / escortBaseVendor) * 100).toFixed(1) : '0';
    const escortStepMargin = escortStepVendor - escortStepDriver;
    const escortStepMarginPct = escortStepVendor > 0 ? ((escortStepMargin / escortStepVendor) * 100).toFixed(1) : '0';

    // Combined Totals (Ride + Escort)
    const totalBaseVendorStd = vendorBaseStd + escortBaseVendor;
    const totalBaseDriverStd = driverBaseStd + escortBaseDriver;
    const totalBaseMarginStd = totalBaseVendorStd - totalBaseDriverStd;
    const totalBaseMarginStdPct = totalBaseVendorStd > 0 ? ((totalBaseMarginStd / totalBaseVendorStd) * 100).toFixed(1) : '0';

    const totalStepVendorStd = vendorStepStd + escortStepVendor;
    const totalStepDriverStd = driverStepStd + escortStepDriver;
    const totalStepMarginStd = totalStepVendorStd - totalStepDriverStd;
    const totalStepMarginStdPct = totalStepVendorStd > 0 ? ((totalStepMarginStd / totalStepVendorStd) * 100).toFixed(1) : '0';

    return {
      baseKm,
      stepKm,
      vendorBaseStd,
      vendorBasePeak,
      vendorStepStd,
      vendorStepPeak,
      driverBaseStd,
      driverBasePeak,
      driverStepStd,
      driverStepPeak,
      escortBaseVendor,
      escortStepVendor,
      escortBaseDriver,
      escortStepDriver,
      rideBaseMarginStd,
      rideBaseMarginStdPct,
      rideStepMarginStd,
      rideStepMarginStdPct,
      rideBaseMarginPeak,
      rideBaseMarginPeakPct,
      rideStepMarginPeak,
      rideStepMarginPeakPct,
      escortBaseMargin,
      escortBaseMarginPct,
      escortStepMargin,
      escortStepMarginPct,
      totalBaseMarginStd,
      totalBaseMarginStdPct,
      totalStepMarginStd,
      totalStepMarginStdPct,
    };
  }, [
    activePlan,
    genBaseKm,
    genStepKm,
    genBaseVendor,
    genVendorPeakExtraBase,
    genStepVendor,
    genVendorPeakExtraStep,
    genBaseDriver,
    genDriverPeakExtraBase,
    genStepDriver,
    genDriverPeakExtraStep,
    genEscortBaseVendor,
    genEscortStepVendor,
    genEscortBaseDriver,
    genEscortStepDriver,
  ]);

  const livePlans = useMemo(() => plans.filter((p) => p.status === 'ACTIVE'), [plans]);
  const isEditable = activePlan?.status === 'DRAFT';

  // Anti-Collapse Validation for Peak Windows
  const peakWindowValidation = useMemo(() => {
    if (editingWindows.length === 0) {
      return { valid: true, error: null };
    }
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    for (let i = 0; i < editingWindows.length; i++) {
      const w = editingWindows[i];
      if (!w.start || !w.end) {
        return { valid: false, error: `Window #${i + 1} has incomplete time inputs.` };
      }
      const s = toMin(w.start);
      const e = toMin(w.end);
      if (s === e) {
        return { valid: false, error: `Window #${i + 1} (${w.label || ''}): Start and end times cannot be the same.` };
      }
      // Check collision with other daytime windows
      for (let j = i + 1; j < editingWindows.length; j++) {
        const other = editingWindows[j];
        const os = toMin(other.start);
        const oe = toMin(other.end);
        if (s < e && os < oe) {
          if (Math.max(s, os) < Math.min(e, oe)) {
            return {
              valid: false,
              error: `Collision detected: '${w.label || `#${i + 1}`}' (${w.start}–${w.end}) overlaps with '${other.label || `#${j + 1}`}' (${other.start}–${other.end}).`,
            };
          }
        }
      }
    }
    return { valid: true, error: null };
  }, [editingWindows]);

  // Run simulation whenever simDistanceKm, simTimeOfDay, or activePlan changes
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
  }, [simDistanceKm, simTimeOfDay, simIncludeEscort, activePlan]);

  // Auto-generate step slabs
  function handleGenerateSteps() {
    if (genMaxKm <= 0 || genStepKm <= 0 || genBaseKm <= 0) {
      setAlert({ type: 'error', message: 'Base distance, step distance, and max distance must be positive.' });
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
    if (genStepVendor < genStepDriver) {
      setAlert({ type: 'error', message: 'Vendor Step increment cannot be less than Driver Step increment.' });
      return;
    }

    const newSlabs: CreatePricingSlabInput[] = [];
    const baseMeters = Math.round(genBaseKm * 1000);
    const maxMeters = Math.round(genMaxKm * 1000);
    const stepMeters = Math.round(genStepKm * 1000);

    // Initial Base Tier (0 to baseKm)
    const vBaseStd = Math.round(genBaseVendor * 100);
    const dBaseStd = Math.round(genBaseDriver * 100);
    const vBasePeak = Math.round((genBaseVendor + genVendorPeakExtraBase) * 100);
    const dBasePeak = Math.round((genBaseDriver + genDriverPeakExtraBase) * 100);

    newSlabs.push({
      minDistanceMExclusive: 0,
      maxDistanceMInclusive: Math.min(baseMeters, maxMeters),
      vendorPricePaise: vBaseStd,
      driverPayoutPaise: dBaseStd,
      vendorPeakPricePaise: vBasePeak,
      driverPeakPayoutPaise: dBasePeak,
      active: true,
    });

    // Incremental Step Tiers (> baseKm)
    let currentMin = baseMeters;
    let stepIndex = 1;
    while (currentMin < maxMeters) {
      const nextMax = Math.min(currentMin + stepMeters, maxMeters);
      const vStd = Math.round((genBaseVendor + stepIndex * genStepVendor) * 100);
      const dStd = Math.round((genBaseDriver + stepIndex * genStepDriver) * 100);
      const vPeak = Math.round((genBaseVendor + genVendorPeakExtraBase + stepIndex * (genStepVendor + genVendorPeakExtraStep)) * 100);
      const dPeak = Math.round((genBaseDriver + genDriverPeakExtraBase + stepIndex * (genStepDriver + genDriverPeakExtraStep)) * 100);

      newSlabs.push({
        minDistanceMExclusive: currentMin,
        maxDistanceMInclusive: nextMax,
        vendorPricePaise: vStd,
        driverPayoutPaise: dStd,
        vendorPeakPricePaise: vPeak,
        driverPeakPayoutPaise: dPeak,
        active: true,
      });

      currentMin = nextMax;
      stepIndex++;
    }

    setEditingSlabs(newSlabs);
    setAlert({
      type: 'success',
      message: `Generated ${newSlabs.length} slabs: Base 0-${genBaseKm} km (₹${genBaseVendor}/₹${genBaseDriver}, peak +₹${genVendorPeakExtraBase}/+₹${genDriverPeakExtraBase}), then +${genStepKm} km steps (+₹${genStepVendor}/+₹${genStepDriver}, peak extra +₹${genVendorPeakExtraStep}/+₹${genDriverPeakExtraStep}) up to ${genMaxKm} km.`,
    });
  }

  // One-click peak surcharge addition for current slabs
  function handleApplyPeakUpliftToExisting() {
    if (editingSlabs.length === 0) return;
    setEditingSlabs(
      editingSlabs.map((s, idx) => {
        const isBase = idx === 0;
        const vPeak = isBase ? s.vendorPricePaise + Math.round(genVendorPeakExtraBase * 100) : s.vendorPricePaise + Math.round(genVendorPeakExtraBase * 100 + genVendorPeakExtraStep * 100 * idx);
        const dPeak = isBase ? s.driverPayoutPaise + Math.round(genDriverPeakExtraBase * 100) : s.driverPayoutPaise + Math.round(genDriverPeakExtraBase * 100 + genDriverPeakExtraStep * 100 * idx);
        return {
          ...s,
          vendorPeakPricePaise: vPeak,
          driverPeakPayoutPaise: dPeak,
        };
      }),
    );
    setAlert({
      type: 'success',
      message: `Applied peak extra charges (+₹${genVendorPeakExtraStep} vendor / +₹${genDriverPeakExtraStep} driver per step) to all ${editingSlabs.length} slabs.`,
    });
  }

  // Quick 5 km / 10 km extension
  function handleAddExtension(stepKm = 5) {
    const stepM = stepKm * 1000;
    if (editingSlabs.length === 0) {
      setEditingSlabs([
        {
          minDistanceMExclusive: 0,
          maxDistanceMInclusive: stepM,
          vendorPricePaise: genBaseVendor * 100,
          driverPayoutPaise: genBaseDriver * 100,
          vendorPeakPricePaise: (genBaseVendor + genVendorPeakExtraBase) * 100,
          driverPeakPayoutPaise: (genBaseDriver + genDriverPeakExtraBase) * 100,
          active: true,
        },
      ]);
      return;
    }
    const last = editingSlabs[editingSlabs.length - 1];
    const newMin = last.maxDistanceMInclusive;
    const newMax = newMin + stepM;
    const stepFactor = stepKm / (genStepKm > 0 ? genStepKm : 5);
    const vPaise = last.vendorPricePaise + Math.round(genStepVendor * stepFactor * 100);
    const dPaise = last.driverPayoutPaise + Math.round(genStepDriver * stepFactor * 100);
    const vPeakPaise = (last.vendorPeakPricePaise ?? last.vendorPricePaise) + Math.round((genStepVendor + genVendorPeakExtraStep) * stepFactor * 100);
    const dPeakPaise = (last.driverPeakPayoutPaise ?? last.driverPayoutPaise) + Math.round((genStepDriver + genDriverPeakExtraStep) * stepFactor * 100);

    setEditingSlabs([
      ...editingSlabs,
      {
        minDistanceMExclusive: newMin,
        maxDistanceMInclusive: newMax,
        vendorPricePaise: vPaise,
        driverPayoutPaise: dPaise,
        vendorPeakPricePaise: vPeakPaise,
        driverPeakPayoutPaise: dPeakPaise,
        active: true,
      },
    ]);
  }

  // Open Slabs Editor
  function _handleOpenSlabEditor() {
    if (activePlan?.slabs && activePlan.slabs.length > 0) {
      setEditingSlabs(
        activePlan.slabs.map((s) => ({
          minDistanceMExclusive: s.minDistanceMExclusive,
          maxDistanceMInclusive: s.maxDistanceMInclusive,
          vendorPricePaise: s.vendorPricePaise,
          driverPayoutPaise: s.driverPayoutPaise,
          vendorPeakPricePaise: s.vendorPeakPricePaise ?? s.vendorPricePaise,
          driverPeakPayoutPaise: s.driverPeakPayoutPaise ?? s.driverPayoutPaise,
          active: s.active,
        })),
      );
    } else {
      handleGenerateSteps();
    }
    setIsEditSlabsOpen(true);
  }

  // Remove a slab
  function handleRemoveSlab(index: number) {
    setEditingSlabs(editingSlabs.filter((_, idx) => idx !== index));
  }

  // Update a slab field
  function handleUpdateSlabField(index: number, field: keyof CreatePricingSlabInput, value: any) {
    const updated = [...editingSlabs];
    updated[index] = { ...updated[index], [field]: value };
    setEditingSlabs(updated);
  }

  // Slab validation
  const slabValidation = useMemo(() => {
    if (editingSlabs.length === 0) return { valid: false, error: 'At least one slab is required.' };
    if (editingSlabs[0].minDistanceMExclusive !== 0) {
      return { valid: false, error: `First slab must start at 0 km. Currently starts at ${editingSlabs[0].minDistanceMExclusive}m.` };
    }
    for (let i = 0; i < editingSlabs.length; i++) {
      const s = editingSlabs[i];
      if (s.maxDistanceMInclusive <= s.minDistanceMExclusive) {
        return { valid: false, error: `Slab #${i + 1} has invalid distance: max must be greater than min.` };
      }
      if (s.vendorPricePaise <= 0 || s.driverPayoutPaise <= 0) {
        return { valid: false, error: `Slab #${i + 1} charges must be strictly positive amounts.` };
      }
      if (s.vendorPricePaise < s.driverPayoutPaise) {
        return {
          valid: false,
          error: `Slab #${i + 1} (Non-Peak) vendor charge (₹${s.vendorPricePaise / 100}) cannot be less than driver payout (₹${s.driverPayoutPaise / 100}).`,
        };
      }
      if (s.vendorPeakPricePaise && s.driverPeakPayoutPaise && s.vendorPeakPricePaise < s.driverPeakPayoutPaise) {
        return {
          valid: false,
          error: `Slab #${i + 1} (Peak) vendor charge (₹${s.vendorPeakPricePaise / 100}) cannot be less than driver payout (₹${s.driverPeakPayoutPaise / 100}).`,
        };
      }
      if (i > 0) {
        const prev = editingSlabs[i - 1];
        if (s.minDistanceMExclusive < prev.maxDistanceMInclusive) {
          return { valid: false, error: `Overlap detected between Slab #${i} and Slab #${i + 1}.` };
        }
        if (s.minDistanceMExclusive > prev.maxDistanceMInclusive) {
          return { valid: false, error: `Gap detected between Slab #${i} and Slab #${i + 1}. Ranges must be contiguous.` };
        }
      }
    }
    return { valid: true, error: null };
  }, [editingSlabs]);

  // Save Slabs & Peak Windows
  async function handleSaveSlabs() {
    if (!activePlan || !slabValidation.valid || !peakWindowValidation.valid) return;
    setSavingSlabs(true);
    try {
      const cleanWindows = (editingWindows || []).map((w) => ({
        start: w.start,
        end: w.end,
        label: w.label ? String(w.label).trim() : undefined,
      }));
      const cleanSlabs = editingSlabs.map((s) => ({
        minDistanceMExclusive: Math.round(Number(s.minDistanceMExclusive)),
        maxDistanceMInclusive: Math.round(Number(s.maxDistanceMInclusive)),
        vendorPricePaise: Math.round(Number(s.vendorPricePaise)),
        driverPayoutPaise: Math.round(Number(s.driverPayoutPaise)),
        vendorPeakPricePaise: s.vendorPeakPricePaise != null ? Math.round(Number(s.vendorPeakPricePaise)) : undefined,
        driverPeakPayoutPaise: s.driverPeakPayoutPaise != null ? Math.round(Number(s.driverPeakPayoutPaise)) : undefined,
        active: s.active !== false,
      }));
      const meta = {
        peakWindows: cleanWindows,
        config: {
          baseKm: genBaseKm,
          baseVendorRupees: genBaseVendor,
          baseDriverRupees: genBaseDriver,
          stepKm: genStepKm,
          stepVendorRupees: genStepVendor,
          stepDriverRupees: genStepDriver,
          maxDistanceKm: genMaxKm,
          vendorPeakExtraBaseRupees: genVendorPeakExtraBase,
          vendorPeakExtraStepRupees: genVendorPeakExtraStep,
          driverPeakExtraBaseRupees: genDriverPeakExtraBase,
          driverPeakExtraStepRupees: genDriverPeakExtraStep,
          escortBaseVendorRupees: genEscortBaseVendor,
          escortStepVendorRupees: genEscortStepVendor,
        },
      };

      if (activePlan.status === 'DRAFT') {
        await adminApi.updateDistancePricingSlabs(activePlan.id, cleanSlabs, slabEditReason.trim() || undefined, meta);
        setAlert({ type: 'success', message: `Draft ${activePlan.version} rate cards saved. Publish it to activate.` });
        setIsEditSlabsOpen(false);
        loadPlans(activePlan.id);
      } else {
        const draft = await adminApi.createDistancePricingPlan({
          vehicleCategory: activePlan.vehicleCategory,
          name: slabEditReason.trim() ? `Draft: ${slabEditReason.trim()}`.slice(0, 120) : undefined,
          slabs: cleanSlabs,
          peakWindows: cleanWindows,
          config: meta.config,
        });
        setAlert({
          type: 'success',
          message: `Saved as draft ${draft.version}. Plan ${activePlan.version} is unchanged until you publish the draft.`,
        });
        setIsEditSlabsOpen(false);
        loadPlans(draft.id);
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update distance slabs' });
    } finally {
      setSavingSlabs(false);
    }
  }

  // Save Rules Independently for Vendor, Driver, and Peak Hours
  async function savePricingRules(options?: {
    baseKm?: number;
    stepKm?: number;
    maxKm?: number;
    baseVendor?: number;
    stepVendor?: number;
    baseDriver?: number;
    stepDriver?: number;
    vendorPeakExtraBase?: number;
    vendorPeakExtraStep?: number;
    driverPeakExtraBase?: number;
    driverPeakExtraStep?: number;
    escortBaseVendor?: number;
    escortStepVendor?: number;
    escortBaseDriver?: number;
    escortStepDriver?: number;
    windows?: PeakHourWindow[];
    vehicleSurges?: Record<string, any>;
    reason?: string;
  }) {
    if (!activePlan) return;
    setSavingSlabs(true);
    try {
      const bKm = Math.max(1, Number(options?.baseKm ?? genBaseKm) || 1);
      const sKm = Math.max(1, Number(options?.stepKm ?? genStepKm) || 1);
      const mKm = Math.max(bKm + sKm, Number(options?.maxKm ?? genMaxKm) || 50);
      const bVendor = Number(options?.baseVendor ?? genBaseVendor) || 0;
      const sVendor = Number(options?.stepVendor ?? genStepVendor) || 0;
      const bDriver = Number(options?.baseDriver ?? genBaseDriver) || 0;
      const sDriver = Number(options?.stepDriver ?? genStepDriver) || 0;
      const vpBase = Number(options?.vendorPeakExtraBase ?? genVendorPeakExtraBase) || 0;
      const vpStep = Number(options?.vendorPeakExtraStep ?? genVendorPeakExtraStep) || 0;
      const dpBase = Number(options?.driverPeakExtraBase ?? genDriverPeakExtraBase) || 0;
      const dpStep = Number(options?.driverPeakExtraStep ?? genDriverPeakExtraStep) || 0;
      const ebVendor = Number(options?.escortBaseVendor ?? genEscortBaseVendor) || 0;
      const esVendor = Number(options?.escortStepVendor ?? genEscortStepVendor) || 0;
      const rawWindows = options?.windows ?? editingWindows;
      const windows = (rawWindows || []).map((w) => ({
        start: w.start,
        end: w.end,
        label: w.label ? String(w.label).trim() : undefined,
      }));
      const surges = options?.vehicleSurges ?? vehiclePeakSurges;

      // Anti-Collapse & Margin Guard
      if (bVendor <= 0) {
        throw new Error('Vendor Base Fare must be greater than ₹0.');
      }
      if (sVendor <= 0) {
        throw new Error('Vendor Step Increment must be greater than ₹0.');
      }
      if (bDriver <= 0) {
        throw new Error('Driver Base Payout must be greater than ₹0.');
      }
      if (sDriver <= 0) {
        throw new Error('Driver Step Payout must be greater than ₹0.');
      }
      if (bVendor < bDriver) {
        throw new Error(`Vendor Base Fare (₹${bVendor}) cannot be less than Driver Base Payout (₹${bDriver}).`);
      }
      if (sVendor < sDriver) {
        throw new Error(`Vendor Step Increment (₹${sVendor}) cannot be less than Driver Step Payout (₹${sDriver}).`);
      }
      if ((bVendor + vpBase) < (bDriver + dpBase)) {
        throw new Error(`Total Vendor Peak Base (₹${bVendor + vpBase}) cannot be less than Driver Peak Base (₹${bDriver + dpBase}).`);
      }

      // Automatically construct contiguous distance slabs
      const baseM = Math.round(bKm * 1000);
      const stepM = Math.round(sKm * 1000);
      const maxM = Math.round(mKm * 1000);
      const newSlabs: CreatePricingSlabInput[] = [];

      // Base band
      newSlabs.push({
        minDistanceMExclusive: 0,
        maxDistanceMInclusive: Math.min(baseM, maxM),
        vendorPricePaise: Math.round(bVendor * 100),
        driverPayoutPaise: Math.round(bDriver * 100),
        vendorPeakPricePaise: Math.round((bVendor + vpBase) * 100),
        driverPeakPayoutPaise: Math.round((bDriver + dpBase) * 100),
        active: true,
      });

      // Step bands
      let curMin = baseM;
      let stepIdx = 1;
      while (curMin < maxM) {
        const nextMax = Math.min(curMin + stepM, maxM);
        const vStd = Math.round((bVendor + stepIdx * sVendor) * 100);
        const dStd = Math.round((bDriver + stepIdx * sDriver) * 100);
        const vPeak = Math.round((bVendor + vpBase + stepIdx * (sVendor + vpStep)) * 100);
        const dPeak = Math.round((bDriver + dpBase + stepIdx * (sDriver + dpStep)) * 100);

        newSlabs.push({
          minDistanceMExclusive: curMin,
          maxDistanceMInclusive: nextMax,
          vendorPricePaise: vStd,
          driverPayoutPaise: dStd,
          vendorPeakPricePaise: vPeak,
          driverPeakPayoutPaise: dPeak,
          active: true,
        });

        curMin = nextMax;
        stepIdx++;
      }

      const meta = {
        peakWindows: windows,
        config: {
          baseKm: bKm,
          baseVendorRupees: bVendor,
          baseDriverRupees: bDriver,
          stepKm: sKm,
          stepVendorRupees: sVendor,
          stepDriverRupees: sDriver,
          maxDistanceKm: mKm,
          vendorPeakExtraBaseRupees: vpBase,
          vendorPeakExtraStepRupees: vpStep,
          driverPeakExtraBaseRupees: dpBase,
          driverPeakExtraStepRupees: dpStep,
          escortBaseVendorRupees: ebVendor,
          escortStepVendorRupees: esVendor,
          vehicleSurges: surges,
        },
      };

      const auditReason = options?.reason || 'Pricing rules updated from admin rate card';

      if (activePlan.status === 'DRAFT') {
        await adminApi.updateDistancePricingSlabs(activePlan.id, newSlabs, auditReason, meta);
        if (autoActivateLive) {
          await adminApi.publishDistancePricingPlan(activePlan.id, auditReason, undefined);
          setAlert({ type: 'success', message: `Rate plan ${activePlan.version} updated and activated live on all apps!` });
        } else {
          setAlert({ type: 'success', message: `Draft ${activePlan.version} rate configuration saved.` });
        }
        await loadPlans(activePlan.id);
      } else {
        const draft = await adminApi.createDistancePricingPlan({
          vehicleCategory: activePlan.vehicleCategory,
          name: auditReason.slice(0, 120),
          slabs: newSlabs,
          peakWindows: windows,
          config: meta.config,
        });
        if (autoActivateLive) {
          await adminApi.publishDistancePricingPlan(draft.id, auditReason, undefined);
          setAlert({ type: 'success', message: `Updated rates successfully published and activated live on all apps!` });
          await loadPlans(draft.id);
        } else {
          setAlert({
            type: 'success',
            message: `Saved as draft ${draft.version}. Plan ${activePlan.version} remains active until published.`,
          });
          await loadPlans(draft.id);
        }
      }

      setIsEditVendorOpen(false);
      setIsEditDriverOpen(false);
      setIsEditPeakHoursOpen(false);
      setIsEditSlabsOpen(false);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update pricing rules' });
    } finally {
      setSavingSlabs(false);
    }
  }

  // Create Draft Plan Version
  async function handleCreatePlanVersion(e: React.FormEvent) {
    e.preventDefault();
    setCreatingPlan(true);
    try {
      const created = await adminApi.createDistancePricingPlan({
        version: newPlanVersion.trim() || undefined,
        name: newPlanName.trim() || undefined,
        vehicleCategory: newPlanCategory,
        cloneFromPlanId: cloneFromActive && activePlan ? activePlan.id : undefined,
        peakWindows,
      });
      setAlert({ type: 'success', message: `Draft plan version ${created.version} created successfully!` });
      setIsCreatePlanOpen(false);
      setNewPlanVersion('');
      setNewPlanName('');
      loadPlans(created.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to create plan version' });
    } finally {
      setCreatingPlan(false);
    }
  }

  // Publish Plan
  async function handlePublishPlan() {
    if (!activePlan || !publishReason.trim()) {
      setAlert({ type: 'error', message: 'An audit reason is required to publish rate plans.' });
      return;
    }
    setPublishing(true);
    try {
      const published = await adminApi.publishDistancePricingPlan(
        activePlan.id,
        publishReason.trim(),
        publishEffectiveFrom ? new Date(publishEffectiveFrom).toISOString() : undefined,
      );
      setAlert({
        type: 'success',
        message: `Plan ${published.version} ${published.status === 'SCHEDULED' ? 'scheduled for activation' : 'published as ACTIVE rate engine'}!`,
      });
      setIsPublishModalOpen(false);
      setPublishReason('');
      setPublishEffectiveFrom('');
      loadPlans(published.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to publish rate plan' });
    } finally {
      setPublishing(false);
    }
  }

  // Retire / Cancel Plan
  async function handleRetirePlan() {
    if (!activePlan || !retireReason.trim()) return;
    setRetiring(true);
    try {
      const res = await adminApi.retireDistancePricingPlan(activePlan.id, retireReason.trim());
      setAlert({
        type: 'success',
        message: activePlan.status === 'SCHEDULED' ? `Scheduled plan ${activePlan.version} cancelled.` : `Plan ${activePlan.version} deactivated.`,
      });
      setIsRetireOpen(false);
      setRetireReason('');
      loadPlans(res.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to deactivate plan' });
    } finally {
      setRetiring(false);
    }
  }

  // Load Audit Trail
  async function handleOpenAudit() {
    setIsAuditOpen(true);
    setLoadingAudit(true);
    try {
      const logs = await adminApi.getDistancePricingAudit(activePlan?.id);
      setAuditLogs(logs);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load audit history' });
    } finally {
      setLoadingAudit(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
        >
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Top Controls & Plan Version Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Rate Plan</div>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              style={{
                marginTop: '0.25rem',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                minWidth: '240px',
              }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName || p.name || `Plan ${p.version}`} [{p.status}] ({p.vehicleCategory})
                </option>
              ))}
            </select>
          </div>

          {activePlan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <StatusBadge status={activePlan.status} size="sm" showPulse={activePlan.status === 'ACTIVE'} />
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(91, 66, 243, 0.12)',
                  color: 'var(--brand-primary)',
                  fontWeight: 800,
                }}
              >
                Category: {activePlan.vehicleCategory}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Effective: {new Date(activePlan.effectiveFrom).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" leftIcon={<History size={14} />} onClick={handleOpenAudit}>
            Audit Trail
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsCreatePlanOpen(true)}>
            New Draft Version
          </Button>
          {activePlan && (activePlan.status === 'ACTIVE' || activePlan.status === 'SCHEDULED') && (
            <Button variant="secondary" size="sm" leftIcon={<AlertTriangle size={14} />} onClick={() => setIsRetireOpen(true)}>
              {activePlan.status === 'SCHEDULED' ? 'Cancel Schedule' : 'Deactivate'}
            </Button>
          )}
          {activePlan && activePlan.status === 'DRAFT' && (
            <Button variant="primary" size="sm" leftIcon={<Send size={15} />} onClick={() => setIsPublishModalOpen(true)}>
              Publish Rate Plan
            </Button>
          )}
        </div>
      </div>

      {/* Which plan prices each category right now */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}
      >
        <strong style={{ color: 'var(--text-primary)' }}>Live Authoritative Engines:</strong>
        {loading ? (
          <span>Loading plans...</span>
        ) : livePlans.length === 0 ? (
          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
            No plan is active, so no trip can be quoted. Publish a plan to start.
          </span>
        ) : (
          livePlans.map((p) => (
            <span
              key={p.id}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                fontWeight: 600,
              }}
            >
              {p.vehicleCategory === 'ALL' ? 'All other categories (ALL)' : p.vehicleCategory}: v{p.version}
            </span>
          ))
        )}
      </div>

      {/* CARD 1: Peak & Non-Peak Timing Schedule Configuration */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#6366F1" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Peak Hours Schedule &amp; Anti-Collapse Guard
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Define high-demand time slots. All remaining hours of the 24h day automatically resolve to Non-Peak rates with 0 collision.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Clock size={13} />}
            onClick={() => {
              setEditingWindows(peakWindows.length > 0 ? [...peakWindows] : [{ start: '08:00', end: '11:00', label: 'Morning Peak' }, { start: '17:00', end: '21:00', label: 'Evening Peak' }]);
              setIsEditPeakHoursOpen(true);
            }}
          >
            + Configure Peak Hours &amp; Surges
          </Button>
        </div>

        {/* Visual 24-Hour Timeline Bar */}
        <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
            <span>00:00 (Midnight)</span>
            <span>06:00 (Morning)</span>
            <span>12:00 (Noon)</span>
            <span>18:00 (Evening)</span>
            <span>24:00 (Night)</span>
          </div>
          <div style={{ height: '22px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.05)', position: 'relative', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {peakWindows.map((w, idx) => {
              const [sh, sm] = (w.start || '00:00').split(':').map(Number);
              const [eh, em] = (w.end || '00:00').split(':').map(Number);
              const sMin = (sh || 0) * 60 + (sm || 0);
              const eMin = (eh || 0) * 60 + (em || 0);
              const leftPct = (sMin / 1440) * 100;
              const widthPct = Math.max(1, ((eMin - sMin) / 1440) * 100);

              return (
                <div
                  key={idx}
                  title={`${w.label || 'Peak'}: ${w.start} – ${w.end}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    padding: '0 4px',
                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  ⚡ {w.label || 'Peak'}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366F1' }} />
              <strong style={{ color: 'var(--text-primary)' }}>Configured Peak Slots:</strong>
              {peakWindows.map((w, idx) => (
                <span key={idx} style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'rgba(99, 102, 241, 0.12)', color: '#818CF8', fontWeight: 700 }}>
                  {w.label}: {w.start}–{w.end}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <span>Non-Peak: All other hours</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-success)', fontWeight: 700, fontSize: '0.72rem' }}>
              <CheckCircle2 size={13} /> Anti-Collapse Validated (0 Collision)
            </div>
          </div>
        </div>
      </Card>

      {/* CARD 2: Condition-Based Rate Cards Dashboard */}
      <Card>
        {/* Top Header of Card 2 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--brand-primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Enterprise Rate Cards & Margins
              </h3>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)' }}>
                {activePlan?.vehicleCategory || 'ALL'} CATEGORY
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
              Side-by-side Vendor billing, Driver payouts, Security Escort add-ons, and Platform Net Profitability.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/pricing/matrix?role=vendor" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm" leftIcon={<Building2 size={13} />}>
                Vendor Matrix Workspace
              </Button>
            </Link>
            <Link href="/pricing/matrix?role=driver" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm" leftIcon={<Car size={13} />}>
                Driver Matrix Workspace
              </Button>
            </Link>
            <Link href="/pricing/matrix?role=unified" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" leftIcon={<Layers size={13} />}>
                Full Slabs Matrix (200km)
              </Button>
            </Link>
          </div>
        </div>

        {/* Content: Condition-Based Slabs Grid */}
        {(!activePlan || activePlan.slabs.length === 0) ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No distance rate cards configured. Click Customize as Draft to initialize bands.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Master Rule Overview: Dual Cards for Vendor Billing & Driver Payout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {/* Card 1: Vendor Rate Structure (Client Billing) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} color="var(--brand-primary)" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          Vendor Rate Card
                        </h4>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'rgba(99, 102, 241, 0.2)', color: '#818CF8' }}>
                          CLIENT BILLING
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        What enterprise clients are billed for trips
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Link href="/pricing/matrix?role=vendor" style={{ textDecoration: 'none' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Layers size={13} />}
                      >
                        Open Full Matrix →
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit2 size={13} />}
                      onClick={() => setIsEditVendorOpen(true)}
                    >
                      Quick Edit
                    </Button>
                  </div>
                </div>

                {/* Dual Rule Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Base Tier Box */}
                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Initial Base Fare (0 - {derivedRules.baseKm} km)
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                        {inr(derivedRules.vendorBaseStd)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>standard</span>
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#818CF8', fontWeight: 700 }}>
                      <Zap size={13} /> Peak: {inr(derivedRules.vendorBasePeak)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (+{inr(derivedRules.vendorBasePeak - derivedRules.vendorBaseStd)} extra)
                      </span>
                    </div>
                  </div>

                  {/* Step Increment Box */}
                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Distance Steps (+{derivedRules.stepKm} km)
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                        +{inr(derivedRules.vendorStepStd)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ step</span>
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#818CF8', fontWeight: 700 }}>
                      <Zap size={13} /> Peak: +{inr(derivedRules.vendorStepPeak)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (+{inr(derivedRules.vendorStepPeak - derivedRules.vendorStepStd)} extra)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Escort Add-on (Client Charge) */}
                <div style={{ background: 'var(--bg-card)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                      <ShieldCheck size={14} /> Security Escort Add-on
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)' }}>
                      CLIENT CHARGE
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Base Escort (0 - {derivedRules.baseKm} km)
                      </div>
                      <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                          {inr(derivedRules.escortBaseVendor)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>standard</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Escort Steps (+{derivedRules.stepKm} km)
                      </div>
                      <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                          +{inr(derivedRules.escortStepVendor)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ step</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', borderTop: '1px dashed var(--border)', paddingTop: '0.35rem' }}>
                    Formula: ₹{derivedRules.escortBaseVendor} base (0–{derivedRules.baseKm} km) + ₹{derivedRules.escortStepVendor} per {derivedRules.stepKm} km step thereafter.
                  </div>
                </div>

                {/* Formula Footnote */}
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <strong>Pricing Formula:</strong> Standard = ₹{derivedRules.vendorBaseStd} base + ₹{derivedRules.vendorStepStd} per {derivedRules.stepKm}km step. Peak = ₹{derivedRules.vendorBasePeak} base + ₹{derivedRules.vendorStepPeak} per {derivedRules.stepKm}km step.
                </div>
              </div>

              {/* Card 2: Driver Rate Structure (Driver Payout) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Car size={20} color="var(--color-success)" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          Driver Rate Card
                        </h4>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)' }}>
                          DRIVER PAYOUT
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Guaranteed trip earnings credited to driver partners
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Link href="/pricing/matrix?role=driver" style={{ textDecoration: 'none' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Layers size={13} />}
                        style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--color-success)' }}
                      >
                        Open Full Matrix →
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit2 size={13} />}
                      onClick={() => setIsEditDriverOpen(true)}
                    >
                      Quick Edit
                    </Button>
                  </div>
                </div>

                {/* Dual Rule Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Base Tier Box */}
                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Initial Base Payout (0 - {derivedRules.baseKm} km)
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-success)' }}>
                        {inr(derivedRules.driverBaseStd)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>standard</span>
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#818CF8', fontWeight: 700 }}>
                      <Zap size={13} /> Peak: {inr(derivedRules.driverBasePeak)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (+{inr(derivedRules.driverBasePeak - derivedRules.driverBaseStd)} extra)
                      </span>
                    </div>
                  </div>

                  {/* Step Increment Box */}
                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Distance Steps (+{derivedRules.stepKm} km)
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-success)' }}>
                        +{inr(derivedRules.driverStepStd)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ step</span>
                    </div>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#818CF8', fontWeight: 700 }}>
                      <Zap size={13} /> Peak: +{inr(derivedRules.driverStepPeak)}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        (+{inr(derivedRules.driverStepPeak - derivedRules.driverStepStd)} extra)
                      </span>
                    </div>
                  </div>
                </div>


                {/* Formula Footnote */}
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <strong>Payout Formula:</strong> Standard = ₹{derivedRules.driverBaseStd} base + ₹{derivedRules.driverStepStd} per {derivedRules.stepKm}km step. Peak = ₹{derivedRules.driverBasePeak} base + ₹{derivedRules.driverStepPeak} per {derivedRules.stepKm}km step.
                </div>
              </div>
            </div>

            {/* Box 3: Platform Net Margin & Profitability Engine */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Box 3 Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={20} color="#38BDF8" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Platform Net Margin & Profitability Engine
                      </h4>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-xs)', background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
                        NET REVENUE TAKE RATE
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Exact profit retained by AdhocX across standard travel fares, peak surges, and security escort add-ons.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <ShieldCheck size={14} color="var(--color-success)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    Anti-Collapse Guard Active (0 Negative Margins)
                  </span>
                </div>
              </div>

              {/* 4 Margin Column Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem' }}>
                {/* Metric 1: Standard Ride Margin */}
                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Standard Ride Margin</span>
                    <span style={{ color: 'var(--color-success)' }}>Non-Peak</span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Base (0–{derivedRules.baseKm} km):</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38BDF8' }}>
                          +{inr(derivedRules.rideBaseMarginStd)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-success)', marginLeft: '0.35rem' }}>
                          ({derivedRules.rideBaseMarginStdPct}%)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Steps (+{derivedRules.stepKm} km):</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38BDF8' }}>
                          +{inr(derivedRules.rideStepMarginStd)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-success)', marginLeft: '0.35rem' }}>
                          ({derivedRules.rideStepMarginStdPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric 2: Peak Ride Margin */}
                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Peak Ride Margin</span>
                    <span style={{ color: '#F59E0B' }}>⚡ Peak Hours</span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peak Base:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#F59E0B' }}>
                          +{inr(derivedRules.rideBaseMarginPeak)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B', marginLeft: '0.35rem' }}>
                          ({derivedRules.rideBaseMarginPeakPct}%)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peak Steps:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F59E0B' }}>
                          +{inr(derivedRules.rideStepMarginPeak)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B', marginLeft: '0.35rem' }}>
                          ({derivedRules.rideStepMarginPeakPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Security Escort Margin */}
                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Security Escort Margin</span>
                    <span style={{ color: 'var(--brand-primary)' }}>Add-on Guard</span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Escort Base:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--brand-primary)' }}>
                          +{inr(derivedRules.escortBaseMargin)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-primary)', marginLeft: '0.35rem' }}>
                          ({derivedRules.escortBaseMarginPct}%)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Escort Steps:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                          +{inr(derivedRules.escortStepMargin)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-primary)', marginLeft: '0.35rem' }}>
                          ({derivedRules.escortStepMarginPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric 4: Combined Total Margin (Ride + Escort) */}
                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Combined Take</span>
                    <span style={{ color: '#38BDF8', fontWeight: 800 }}>Ride + Escort</span>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Combined Base:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)' }}>
                          +{inr(derivedRules.totalBaseMarginStd)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-success)', marginLeft: '0.35rem' }}>
                          ({derivedRules.totalBaseMarginStdPct}%)
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.35rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Combined Steps:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-success)' }}>
                          +{inr(derivedRules.totalStepMarginStd)}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-success)', marginLeft: '0.35rem' }}>
                          ({derivedRules.totalStepMarginStdPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Explanatory Banner */}
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>
                  <strong>Profit Equation:</strong> Net Margin = (Vendor Billed Fare + Escort Fee) − (Driver Payout + Escort Payout). All figures update automatically upon saving either rate card.
                </span>
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  Take Rate: {derivedRules.totalBaseMarginStdPct}% Base / {derivedRules.totalStepMarginStdPct}% Steps
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CARD 3: Interactive Route & Time Simulator */}
      <Card>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Live Condition-Based Rate Simulator
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Simulate exact rate resolutions and driver payouts across any distance and time of day.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Route Distance (km)</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1.05rem' }}>
                  {simDistanceKm} km ({Math.round(simDistanceKm * 1000).toLocaleString()} m)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="0.5"
                value={simDistanceKm}
                onChange={(e) => setSimDistanceKm(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {[5, 10, 15, 22.4, 35, 50, 75, 100].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setSimDistanceKm(sample)}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-xs)',
                      background: simDistanceKm === sample ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                      color: simDistanceKm === sample ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {sample} km
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Simulated Pickup Time</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', alignItems: 'center' }}>
                <input
                  type="time"
                  value={simTimeOfDay}
                  onChange={(e) => setSimTimeOfDay(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                />
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Morning Peak', time: '09:00' },
                    { label: 'Afternoon Off-Peak', time: '14:30' },
                    { label: 'Evening Peak', time: '19:00' },
                    { label: 'Late Night', time: '23:30' },
                  ].map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setSimTimeOfDay(s.time)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border)',
                        background: simTimeOfDay === s.time ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface-elevated)',
                        color: simTimeOfDay === s.time ? '#818CF8' : 'var(--text-muted)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Escort Guard Simulation Toggle */}
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={simIncludeEscort}
                  onChange={(e) => setSimIncludeEscort(e.target.checked)}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <ShieldCheck size={15} color="var(--brand-primary)" /> Include Security Escort Guard
                </div>
              </label>
              {simIncludeEscort && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', paddingLeft: '1.5rem' }}>
                  Simulates distance-based escort fee (+₹{derivedRules.escortBaseVendor} base + ₹{derivedRules.escortStepVendor}/step) on vendor charge. Drivers do not receive an escort fee.
                </div>
              )}
            </div>
          </div>

          {/* Simulation Output Card */}
          {simResult ? (
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Matching Band: </span>
                  <strong style={{ color: 'var(--brand-primary)', fontSize: '0.95rem' }}>{simResult.slabRange}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {simResult.hasEscort && (
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: 'rgba(99, 102, 241, 0.18)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      🛡️ ESCORT INCLUDED
                    </span>
                  )}
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: simResult.isPeak ? 'rgba(99, 102, 241, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                      color: simResult.isPeak ? '#818CF8' : 'var(--color-success)',
                    }}
                  >
                    {simResult.isPeak ? `⚡ ${simResult.activeWindowLabel || 'PEAK HOUR'}` : '🌤️ NON-PEAK HOUR'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor Charge</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {inr(simResult.vendorPriceRupees)}
                  </div>
                  {simResult.hasEscort && simResult.baseRideVendorPriceRupees !== undefined && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Ride {inr(simResult.baseRideVendorPriceRupees)} + Escort {inr(simResult.escortVendorFeeRupees)}
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Driver Payout</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                    {inr(simResult.driverPayoutRupees)}
                  </div>
                  {simResult.hasEscort && simResult.baseRideDriverPayoutRupees !== undefined && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Ride {inr(simResult.baseRideDriverPayoutRupees)} + Escort {inr(simResult.escortDriverPayoutRupees)}
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Platform Net Margin</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38BDF8', marginTop: '0.2rem' }}>
                    {inr(Math.max(0, simResult.vendorPriceRupees - simResult.driverPayoutRupees))}
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      ({simResult.vendorPriceRupees > 0 ? (((simResult.vendorPriceRupees - simResult.driverPayoutRupees) / simResult.vendorPriceRupees) * 100).toFixed(1) : '0'}%)
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Vendor and driver prices are managed separately through their rate cards.
              </div>
            </div>
          ) : simulating ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calculating rate resolution...</div>
          ) : (
            <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--color-danger)', fontSize: '0.82rem' }}>
              <strong>Distance Exceeds Configured Slabs:</strong> The selected distance ({simDistanceKm} km) exceeds the plan&apos;s maximum configured band. Use <strong>Customize as Draft</strong> to add higher distance tiers.
            </div>
          )}
        </div>
      </Card>

      {/* DRAWER: Condition-Based Slabs & Peak Window Editor */}
      <Drawer
        isOpen={isEditSlabsOpen}
        onClose={() => setIsEditSlabsOpen(false)}
        title={isEditable ? `Edit Draft Plan ${activePlan?.version || ''}` : `New Draft from Plan ${activePlan?.version || ''}`}
        subtitle="Configure Vendor & Driver Rate Cards across Peak and Non-Peak hours with distance step generators."
        width="min(94vw, 860px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => handleAddExtension(5)}>
                +5 km Band
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleAddExtension(10)}>
                +10 km Band
              </Button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsEditSlabsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!slabValidation.valid || !peakWindowValidation.valid || savingSlabs}
                isLoading={savingSlabs}
                onClick={handleSaveSlabs}
              >
                Save Rate Cards
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Validation Feedback */}
          {(!slabValidation.valid || !peakWindowValidation.valid) && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', fontSize: '0.78rem' }}>
              {slabValidation.error || peakWindowValidation.error}
            </div>
          )}

          {/* Section A: Peak Hours Time Slots Configurator */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <Clock size={15} color="#6366F1" /> Peak Hours Schedule (Anti-Collapse Guard)
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingWindows([...editingWindows, { start: '12:00', end: '15:00', label: `Peak #${editingWindows.length + 1}` }])}
              >
                + Add Peak Slot
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {editingWindows.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={w.label || ''}
                    placeholder="Slot Label (e.g. Morning Rush)"
                    onChange={(e) => {
                      const updated = [...editingWindows];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setEditingWindows(updated);
                    }}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                  <input
                    type="time"
                    value={w.start}
                    onChange={(e) => {
                      const updated = [...editingWindows];
                      updated[idx] = { ...updated[idx], start: e.target.value };
                      setEditingWindows(updated);
                    }}
                    style={{ width: '110px', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="time"
                    value={w.end}
                    onChange={(e) => {
                      const updated = [...editingWindows];
                      updated[idx] = { ...updated[idx], end: e.target.value };
                      setEditingWindows(updated);
                    }}
                    style={{ width: '110px', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                  {editingWindows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditingWindows(editingWindows.filter((_, i) => i !== idx))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Automated Step Increment & Slab Generator */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <Sliders size={15} color="var(--brand-primary)" /> Distance Step Generator
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Configure Initial Base Tier, +KM Steps & Decoupled Peak Surcharges
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Base Dist (km)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={genBaseKm}
                  onChange={(e) => setGenBaseKm(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Step Dist (km)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={genStepKm}
                  onChange={(e) => setGenStepKm(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Max Dist (km)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={genMaxKm}
                  onChange={(e) => setGenMaxKm(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vendor Base (₹)</label>
                <input
                  type="number"
                  min="10"
                  value={genBaseVendor}
                  onChange={(e) => setGenBaseVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vendor +₹/step</label>
                <input
                  type="number"
                  min="1"
                  value={genStepVendor}
                  onChange={(e) => setGenStepVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#818CF8', fontWeight: 600 }}>Vendor Peak Extra Base (+₹)</label>
                <input
                  type="number"
                  min="0"
                  value={genVendorPeakExtraBase}
                  onChange={(e) => setGenVendorPeakExtraBase(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#818CF8', fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#818CF8', fontWeight: 600 }}>Vendor Peak Extra Step (+₹)</label>
                <input
                  type="number"
                  min="0"
                  value={genVendorPeakExtraStep}
                  onChange={(e) => setGenVendorPeakExtraStep(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#818CF8', fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Driver Base (₹)</label>
                <input
                  type="number"
                  min="10"
                  value={genBaseDriver}
                  onChange={(e) => setGenBaseDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Driver +₹/step</label>
                <input
                  type="number"
                  min="1"
                  value={genStepDriver}
                  onChange={(e) => setGenStepDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Driver Peak Extra Base (+₹)</label>
                <input
                  type="number"
                  min="0"
                  value={genDriverPeakExtraBase}
                  onChange={(e) => setGenDriverPeakExtraBase(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Driver Peak Extra Step (+₹)</label>
                <input
                  type="number"
                  min="0"
                  value={genDriverPeakExtraStep}
                  onChange={(e) => setGenDriverPeakExtraStep(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.78rem', fontWeight: 700 }}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="outline" size="sm" onClick={handleApplyPeakUpliftToExisting}>
                Apply Peak Extras (+₹{genVendorPeakExtraStep} / +₹{genDriverPeakExtraStep}) to Current Slabs
              </Button>
              <Button variant="primary" size="sm" onClick={handleGenerateSteps}>
                Generate Contiguous Slabs
              </Button>
            </div>
          </div>

          {/* Section C: Slabs Rate Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Range (m)</th>
                  <th style={{ padding: '0.5rem' }}>Vendor Std (₹)</th>
                  <th style={{ padding: '0.5rem' }}>Driver Std (₹)</th>
                  <th style={{ padding: '0.5rem' }}>Vendor Peak (₹)</th>
                  <th style={{ padding: '0.5rem' }}>Driver Peak (₹)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editingSlabs.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {s.minDistanceMExclusive / 1000} – {s.maxDistanceMInclusive / 1000} km
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={s.vendorPricePaise / 100}
                        onChange={(e) => handleUpdateSlabField(idx, 'vendorPricePaise', Math.round(Number(e.target.value) * 100))}
                        style={{ width: '85px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={s.driverPayoutPaise / 100}
                        onChange={(e) => handleUpdateSlabField(idx, 'driverPayoutPaise', Math.round(Number(e.target.value) * 100))}
                        style={{ width: '85px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.78rem', fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={(s.vendorPeakPricePaise ?? s.vendorPricePaise) / 100}
                        onChange={(e) => handleUpdateSlabField(idx, 'vendorPeakPricePaise', Math.round(Number(e.target.value) * 100))}
                        style={{ width: '85px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#818CF8', fontSize: '0.78rem', fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={(s.driverPeakPayoutPaise ?? s.driverPayoutPaise) / 100}
                        onChange={(e) => handleUpdateSlabField(idx, 'driverPeakPayoutPaise', Math.round(Number(e.target.value) * 100))}
                        style={{ width: '85px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.78rem', fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      {editingSlabs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlab(idx)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Audit Reason</label>
            <input
              type="text"
              value={slabEditReason}
              placeholder="e.g. Q4 Peak surcharge and 10km step calibration"
              onChange={(e) => setSlabEditReason(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </Drawer>

      {/* DRAWER 1: Configure Vendor Rates */}
      <Drawer
        isOpen={isEditVendorOpen}
        onClose={() => setIsEditVendorOpen(false)}
        title="Configure Vendor Rates (Client Billing)"
        subtitle={`Set what enterprise clients are billed for ${activePlan?.vehicleCategory || 'ALL'} trips.`}
        width="min(94vw, 560px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoActivateLive}
                onChange={(e) => setAutoActivateLive(e.target.checked)}
              />
              <span>Make Live immediately in App</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsEditVendorOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={savingSlabs}
                onClick={() => savePricingRules({ reason: 'Vendor Rate Card configuration saved' })}
              >
                Save Vendor Rates
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section 1: Base Distance Tier */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              <Route size={15} color="var(--brand-primary)" /> Initial Base Fare (Starting km)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Base Distance (km)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genBaseKm}
                    onChange={(e) => setGenBaseKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Standard Base Fare (₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>₹</span>
                  <input
                    type="number"
                    min="10"
                    value={genBaseVendor}
                    onChange={(e) => setGenBaseVendor(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Any trip up to {genBaseKm} km will be billed this base fare.
            </div>
          </div>

          {/* Section 2: Incremental Steps */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              <Sliders size={15} color="var(--brand-primary)" /> Distance Steps Increment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Step Distance (km)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genStepKm}
                    onChange={(e) => setGenStepKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Price per Step (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>+₹</span>
                  <input
                    type="number"
                    min="1"
                    value={genStepVendor}
                    onChange={(e) => setGenStepVendor(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ step</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              For every additional {genStepKm} km beyond the base distance, +₹{genStepVendor} will be added.
            </div>
          </div>

          {/* Section 3: Peak Hours Extra Surcharge */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#818CF8' }}>
                <Zap size={15} color="#818CF8" /> Peak Hours Surcharges (Added to Client Fare)
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingWindows(peakWindows.length > 0 ? [...peakWindows] : [{ start: '08:00', end: '11:00', label: 'Morning Peak' }, { start: '17:00', end: '21:00', label: 'Evening Peak' }]);
                  setIsEditPeakHoursOpen(true);
                }}
                style={{ background: 'transparent', border: 'none', color: '#818CF8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                + Manage Peak Slots &amp; Vehicles
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Extra on Base (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818CF8' }}>+₹</span>
                  <input
                    type="number"
                    min="0"
                    value={genVendorPeakExtraBase}
                    onChange={(e) => setGenVendorPeakExtraBase(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#818CF8', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Extra per Step (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818CF8' }}>+₹</span>
                  <input
                    type="number"
                    min="0"
                    value={genVendorPeakExtraStep}
                    onChange={(e) => setGenVendorPeakExtraStep(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: '#818CF8', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ step</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Security Escort Add-on (Client Charge) */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--brand-primary)' }}>
                <ShieldCheck size={15} color="var(--brand-primary)" /> Security Escort Add-on (Client Charge)
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)' }}>
                DISTANCE BASED
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Escort Base Fee (₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    value={genEscortBaseVendor}
                    onChange={(e) => setGenEscortBaseVendor(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Applied for trips 0 to {genBaseKm} km.
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Escort Price per Step (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>+₹</span>
                  <input
                    type="number"
                    min="0"
                    value={genEscortStepVendor}
                    onChange={(e) => setGenEscortStepVendor(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ step</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  For each {genStepKm} km beyond base.
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', background: 'rgba(99, 102, 241, 0.05)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-xs)' }}>
              Total Escort Quote = ₹{genEscortBaseVendor} + steps × ₹{genEscortStepVendor}. Billed to enterprise client when security escort is toggled.
            </div>
          </div>

          {/* Section 5: Live Formula Breakdown */}
          <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ fontSize: '0.72rem', color: '#818CF8', textTransform: 'uppercase', fontWeight: 800 }}>Live Pricing Formula Preview</div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <div>🌤️ <strong>Standard Ride:</strong> ₹{genBaseVendor} for first {genBaseKm} km + ₹{genStepVendor} for every {genStepKm} km thereafter.</div>
              <div style={{ marginTop: '0.25rem' }}>⚡ <strong>Peak Ride:</strong> ₹{genBaseVendor + genVendorPeakExtraBase} for first {genBaseKm} km + ₹{genStepVendor + genVendorPeakExtraStep} for every {genStepKm} km thereafter.</div>
              <div style={{ marginTop: '0.25rem' }}>🛡️ <strong>Security Escort:</strong> ₹{genEscortBaseVendor} for first {genBaseKm} km + ₹{genEscortStepVendor} for every {genStepKm} km thereafter.</div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* DRAWER 2: Configure Driver Payouts */}
      <Drawer
        isOpen={isEditDriverOpen}
        onClose={() => setIsEditDriverOpen(false)}
        title="Configure Driver Payouts (Driver Earnings)"
        subtitle={`Set guaranteed earnings credited to driver partners for ${activePlan?.vehicleCategory || 'ALL'} trips.`}
        width="min(94vw, 560px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoActivateLive}
                onChange={(e) => setAutoActivateLive(e.target.checked)}
              />
              <span>Make Live immediately in App</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsEditDriverOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={savingSlabs}
                onClick={() => savePricingRules({ reason: 'Driver Payout configuration saved' })}
              >
                Save Driver Payouts
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section 1: Base Distance Payout */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              <Route size={15} color="var(--color-success)" /> Initial Base Payout (Starting km)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Base Distance (km)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genBaseKm}
                    onChange={(e) => setGenBaseKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Standard Base Payout (₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>₹</span>
                  <input
                    type="number"
                    min="10"
                    value={genBaseDriver}
                    onChange={(e) => setGenBaseDriver(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Driver will receive this guaranteed payout for trips up to {genBaseKm} km.
            </div>
          </div>

          {/* Section 2: Incremental Steps */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              <Sliders size={15} color="var(--color-success)" /> Distance Steps Increment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Step Distance (km)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genStepKm}
                    onChange={(e) => setGenStepKm(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payout per Step (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>+₹</span>
                  <input
                    type="number"
                    min="1"
                    value={genStepDriver}
                    onChange={(e) => setGenStepDriver(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ step</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              For every additional {genStepKm} km beyond the base distance, +₹{genStepDriver} is added to driver payout.
            </div>
          </div>

          {/* Section 3: Peak Hours Extra Payout */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-success)' }}>
                <Zap size={15} color="var(--color-success)" /> Peak Hours Extra Payout (Driver Incentive)
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingWindows(peakWindows.length > 0 ? [...peakWindows] : [{ start: '08:00', end: '11:00', label: 'Morning Peak' }, { start: '17:00', end: '21:00', label: 'Evening Peak' }]);
                  setIsEditPeakHoursOpen(true);
                }}
                style={{ background: 'transparent', border: 'none', color: '#818CF8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
              >
                + Manage Peak Slots &amp; Vehicles
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Extra on Base (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>+₹</span>
                  <input
                    type="number"
                    min="0"
                    value={genDriverPeakExtraBase}
                    onChange={(e) => setGenDriverPeakExtraBase(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Extra per Step (+₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>+₹</span>
                  <input
                    type="number"
                    min="0"
                    value={genDriverPeakExtraStep}
                    onChange={(e) => setGenDriverPeakExtraStep(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ step</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Security Escort Guard Payout */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-success)' }}>
                <ShieldCheck size={15} color="var(--color-success)" /> Security Escort Guard Payout
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-xs)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
                DRIVER / GUARD EARNINGS
              </span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Security escort guard fee is an enterprise client-side add-on billed to the vendor. Drivers are not paid escort fees.
            </div>
          </div>

          {/* Section 5: Platform Margin Guard & Payout Preview */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', textTransform: 'uppercase', fontWeight: 800 }}>Platform Net Margin Safety Check</div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ride Base Margin:</span>
                <strong>+₹{genBaseVendor - genBaseDriver} ({genBaseVendor > 0 ? (((genBaseVendor - genBaseDriver) / genBaseVendor) * 100).toFixed(1) : 0}%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span>Ride Step Margin:</span>
                <strong>+₹{genStepVendor - genStepDriver} ({genStepVendor > 0 ? (((genStepVendor - genStepDriver) / genStepVendor) * 100).toFixed(1) : 0}%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span>Escort Base Client Fee:</span>
                <strong>+₹{genEscortBaseVendor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                <span>Escort Step Client Fee:</span>
                <strong>+₹{genEscortStepVendor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', borderTop: '1px dashed var(--border)', paddingTop: '0.35rem', color: 'var(--color-success)' }}>
                <span>Total Combined Base Take:</span>
                <strong>+₹{(genBaseVendor - genBaseDriver) + genEscortBaseVendor} ({(genBaseVendor + genEscortBaseVendor) > 0 ? ((((genBaseVendor - genBaseDriver) + genEscortBaseVendor) / (genBaseVendor + genEscortBaseVendor)) * 100).toFixed(1) : 0}%)</strong>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* DRAWER 3: Configure Peak Hours & Per-Vehicle Surges */}
      <Drawer
        isOpen={isEditPeakHoursOpen}
        onClose={() => setIsEditPeakHoursOpen(false)}
        title="Peak Hours Schedule & Per-Vehicle Surges"
        subtitle="Set up 3 to 4 peak hour windows in a day, and configure surge amounts for each vehicle category."
        width="min(94vw, 680px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoActivateLive}
                onChange={(e) => setAutoActivateLive(e.target.checked)}
              />
              <span>Make Live immediately in App</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsEditPeakHoursOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!peakWindowValidation.valid || savingSlabs}
                isLoading={savingSlabs}
                onClick={() => savePricingRules({ windows: editingWindows, reason: 'Peak hours schedule & vehicle surges updated' })}
              >
                Save Peak Configuration
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Validation Feedback */}
          {!peakWindowValidation.valid && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', fontSize: '0.78rem' }}>
              {peakWindowValidation.error}
            </div>
          )}

          {/* Section A: Daily Peak Time Slots (3-4 slots per day) */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <Clock size={15} color="#6366F1" /> Daily Peak Time Slots (IST)
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Configure multiple rush hour periods in a 24-hour day (e.g. morning, evening, night).
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingWindows([...editingWindows, { start: '12:00', end: '15:00', label: `Peak #${editingWindows.length + 1}` }])}
              >
                + Add Peak Window
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {editingWindows.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-card)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    value={w.label || ''}
                    placeholder="Slot Label (e.g. Morning Rush)"
                    onChange={(e) => {
                      const updated = [...editingWindows];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setEditingWindows(updated);
                    }}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                  <input
                    type="time"
                    value={w.start}
                    onChange={(e) => {
                      const updated = [...editingWindows];
                      updated[idx] = { ...updated[idx], start: e.target.value };
                      setEditingWindows(updated);
                    }}
                    style={{ width: '105px', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="time"
                    value={w.end}
                    onChange={(e) => {
                      const updated = [...editingWindows];
                      updated[idx] = { ...updated[idx], end: e.target.value };
                      setEditingWindows(updated);
                    }}
                    style={{ width: '105px', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                  />
                  {editingWindows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditingWindows(editingWindows.filter((_, i) => i !== idx))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Per-Vehicle Category Peak Surges */}
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <Car size={15} color="var(--brand-primary)" /> Vehicle Category Surge Pricing
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Select a vehicle category to adjust what is added during the configured peak windows.
              </div>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle Category</label>
              <select
                value={selectedPeakVehicleCategory}
                onChange={(e) => setSelectedPeakVehicleCategory(e.target.value)}
                style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700 }}
              >
                <option value="ALL">ALL Categories (Default)</option>
                {vehicleCategories.map((cat) => (
                  <option key={cat.vehicleType} value={cat.vehicleType}>
                    {cat.categoryLabel} ({cat.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              {/* Vendor Side */}
              <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand-primary)', marginBottom: '0.5rem' }}>
                  VENDOR CHARGE SURGE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Extra on Base Fare (+₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={genVendorPeakExtraBase}
                      onChange={(e) => setGenVendorPeakExtraBase(Number(e.target.value))}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Extra per Step (+₹ / step)</label>
                    <input
                      type="number"
                      min="0"
                      value={genVendorPeakExtraStep}
                      onChange={(e) => setGenVendorPeakExtraStep(Number(e.target.value))}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              {/* Driver Side */}
              <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                  DRIVER PAYOUT SURGE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Extra on Base Payout (+₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={genDriverPeakExtraBase}
                      onChange={(e) => setGenDriverPeakExtraBase(Number(e.target.value))}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Extra per Step (+₹ / step)</label>
                    <input
                      type="number"
                      min="0"
                      value={genDriverPeakExtraStep}
                      onChange={(e) => setGenDriverPeakExtraStep(Number(e.target.value))}
                      style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
              Trips during peak hours in category <strong>{selectedPeakVehicleCategory}</strong> will automatically have these additions applied to both base fare and distance steps.
            </div>
          </div>
        </div>
      </Drawer>

      {/* MODAL: Publish Plan */}
      <Drawer
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title={`Publish Plan ${activePlan?.version || ''}`}
        subtitle="Publishing makes this rate plan the authoritative engine for this vehicle category."
        width="min(94vw, 520px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={publishing} onClick={handlePublishPlan}>
              Publish Authoritative Plan
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Effective From (Optional)</label>
            <input
              type="datetime-local"
              value={publishEffectiveFrom}
              onChange={(e) => setPublishEffectiveFrom(e.target.value)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Leave blank to activate immediately upon publishing.
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Publish Reason (Mandatory Audit Log) *</label>
            <input
              type="text"
              required
              value={publishReason}
              placeholder="e.g. Approved Q4 Peak Schedule & Rates"
              onChange={(e) => setPublishReason(e.target.value)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </Drawer>

      {/* MODAL: New Plan Version */}
      <Drawer
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        title="Create New Draft Version"
        subtitle="Initialize a new draft version to calibrate rates without affecting live production traffic."
        width="min(94vw, 520px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsCreatePlanOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={creatingPlan} onClick={handleCreatePlanVersion}>
              Create Draft Version
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreatePlanVersion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category *</label>
            <select
              value={newPlanCategory}
              onChange={(e) => setNewPlanCategory(e.target.value)}
              disabled={loadingCategories}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="ALL">ALL (Default Plan)</option>
              {vehicleCategories.map((category) => (
                <option key={category.vehicleType} value={category.vehicleType}>
                  {category.categoryLabel} ({category.vehicleType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Version Name</label>
            <input
              type="text"
              value={newPlanName}
              placeholder="e.g. Bangalore Peak & Step Rates"
              onChange={(e) => setNewPlanName(e.target.value)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Version Code (Optional)</label>
            <input
              type="text"
              value={newPlanVersion}
              placeholder="Leave blank for auto-increment (e.g. v2.0)"
              onChange={(e) => setNewPlanVersion(e.target.value)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={cloneFromActive} onChange={(e) => setCloneFromActive(e.target.checked)} />
            Clone rate slabs &amp; schedule from active plan
          </label>
        </form>
      </Drawer>

      {/* MODAL: Retire / Deactivate Plan */}
      <Drawer
        isOpen={isRetireOpen}
        onClose={() => setIsRetireOpen(false)}
        title={activePlan?.status === 'SCHEDULED' ? 'Cancel Scheduled Activation' : `Deactivate Plan ${activePlan?.version || ''}`}
        subtitle={
          activePlan?.status === 'SCHEDULED'
            ? 'The plan will return to DRAFT and will not activate automatically.'
            : 'Deactivating removes this rate card from active service.'
        }
        width="min(94vw, 520px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsRetireOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" isLoading={retiring} onClick={handleRetirePlan}>
              Confirm Deactivation
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Audit Reason *</label>
            <input
              type="text"
              required
              value={retireReason}
              placeholder="e.g. Rate card superseded or seasonality change"
              onChange={(e) => setRetireReason(e.target.value)}
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </Drawer>

      {/* MODAL: Audit Trail */}
      <Drawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Pricing Engine Audit Trail"
        subtitle="Chronological log of all plan creations, rate adjustments, schedules and deactivations."
        width="min(94vw, 680px)"
      >
        {loadingAudit ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit trail...</div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit events found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{log.action}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{log.reason || 'No description provided'}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>By: {log.actorName || log.actorId || 'SYSTEM'}</div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
