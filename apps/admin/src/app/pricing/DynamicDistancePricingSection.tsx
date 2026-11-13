'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Sun,
  Building2,
  Car,
  CheckCircle2,
  Sliders,
  Sparkles,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  DistancePricingPlan,
  CreatePricingSlabInput,
  PricingAuditItem,
  DistanceSimulationResult,
  PeakHourWindow,
} from '../../lib/api/types';
import { Card, Button, StatusBadge, Drawer } from '../../components/common';

const inr = (rupees: number | undefined) => `₹${Number(rupees ?? 0).toLocaleString('en-IN')}`;

export function DynamicDistancePricingSection() {
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Audience & Time Condition View Switcher
  const [selectedAudience, setSelectedAudience] = useState<'VENDOR' | 'DRIVER' | 'ESCORT'>('VENDOR');
  const [selectedRegime, setSelectedRegime] = useState<'NON_PEAK' | 'PEAK'>('NON_PEAK');

  // Security Escort Pricing Table State
  const [escortFee, setEscortFee] = useState<number>(300);
  const [editingEscortFee, setEditingEscortFee] = useState<string>('300');
  const [savingEscortFee, setSavingEscortFee] = useState<boolean>(false);
  const [escortUpdatedAt, setEscortUpdatedAt] = useState<string | null>(null);

  // Peak Hours Configuration State
  const [peakWindows, setPeakWindows] = useState<PeakHourWindow[]>([]);
  const [editingWindows, setEditingWindows] = useState<PeakHourWindow[]>([]);

  // Draft & Edit Slabs State
  const [editingSlabs, setEditingSlabs] = useState<CreatePricingSlabInput[]>([]);
  const [isEditSlabsOpen, setIsEditSlabsOpen] = useState(false);
  const [savingSlabs, setSavingSlabs] = useState(false);
  const [slabEditReason, setSlabEditReason] = useState('');

  // Step Generator State
  const [genMinKm, setGenMinKm] = useState<number>(0);
  const [genMaxKm, setGenMaxKm] = useState<number>(100);
  const [genStepKm, setGenStepKm] = useState<number>(10);
  const [genBaseVendor, setGenBaseVendor] = useState<number>(350);
  const [genStepVendor, setGenStepVendor] = useState<number>(120);
  const [genBaseDriver, setGenBaseDriver] = useState<number>(250);
  const [genStepDriver, setGenStepDriver] = useState<number>(90);
  const [genPeakUpliftPct, setGenPeakUpliftPct] = useState<number>(20);

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
      if (policy && policy.escortFee !== undefined) {
        setEscortFee(policy.escortFee);
        setEditingEscortFee(String(policy.escortFee));
        setEscortUpdatedAt(policy.updatedAt ?? null);
      } else if (data.length > 0 && (data[0] as any).escortFeeRupees !== undefined) {
        setEscortFee((data[0] as any).escortFeeRupees);
        setEditingEscortFee(String((data[0] as any).escortFeeRupees));
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

  const handleSaveEscortFee = async () => {
    const trimmed = editingEscortFee.trim();
    const val = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(val) || val < 0 || val > 100000) {
      setAlert({ type: 'error', message: 'Escort fee must be a number between ₹0 and ₹1,00,000.' });
      return;
    }
    const rounded = Math.round(val * 100) / 100;
    if (rounded === escortFee) {
      setAlert({ type: 'success', message: `Security escort fee is already ₹${rounded} per trip.` });
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(`Change the security escort fee from ₹${escortFee} to ₹${rounded} per trip? New vendor quotes will use it immediately.`)) {
      return;
    }
    setSavingEscortFee(true);
    try {
      const updated = await adminApi.updatePolicyConfig({ escortFee: rounded });
      setEscortFee(updated.escortFee);
      setEditingEscortFee(String(updated.escortFee));
      setEscortUpdatedAt(updated.updatedAt ?? null);
      setAlert({
        type: 'success',
        message: `Security escort fee saved: ₹${updated.escortFee} per trip. New vendor quotes use it from now on.`,
      });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update security escort fee' });
    } finally {
      setSavingEscortFee(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

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
  }, [activePlan]);

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
        } as any);
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
  }, [simDistanceKm, simTimeOfDay, activePlan]);

  // Open slab editor drawer
  function handleOpenSlabEditor() {
    if (!activePlan) return;
    setSlabEditReason('');
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
    setEditingWindows(peakWindows);
    setIsEditSlabsOpen(true);
  }

  // Auto-generate step slabs
  function handleGenerateSteps() {
    if (genMaxKm <= genMinKm || genStepKm <= 0) {
      setAlert({ type: 'error', message: 'Maximum distance must be greater than minimum distance, and step must be positive.' });
      return;
    }
    const newSlabs: CreatePricingSlabInput[] = [];
    let currentMin = genMinKm * 1000;
    const maxMeters = genMaxKm * 1000;
    const stepMeters = genStepKm * 1000;

    let index = 0;
    while (currentMin < maxMeters) {
      const nextMax = Math.min(currentMin + stepMeters, maxMeters);
      const vStandard = Math.round((genBaseVendor + index * genStepVendor) * 100);
      const dStandard = Math.round((genBaseDriver + index * genStepDriver) * 100);
      const vPeak = Math.round(vStandard * (1 + genPeakUpliftPct / 100));
      const dPeak = Math.round(dStandard * (1 + genPeakUpliftPct / 100));

      newSlabs.push({
        minDistanceMExclusive: currentMin,
        maxDistanceMInclusive: nextMax,
        vendorPricePaise: vStandard,
        driverPayoutPaise: dStandard,
        vendorPeakPricePaise: vPeak,
        driverPeakPayoutPaise: dPeak,
        active: true,
      });

      currentMin = nextMax;
      index++;
    }

    setEditingSlabs(newSlabs);
    setAlert({ type: 'success', message: `Generated ${newSlabs.length} contiguous slabs from ${genMinKm} km to ${genMaxKm} km in ${genStepKm} km steps.` });
  }

  // One-click peak surcharge multiplier for current slabs
  function handleApplyPeakUpliftToExisting() {
    if (editingSlabs.length === 0) return;
    const factor = 1 + genPeakUpliftPct / 100;
    setEditingSlabs(
      editingSlabs.map((s) => ({
        ...s,
        vendorPeakPricePaise: Math.round(s.vendorPricePaise * factor),
        driverPeakPayoutPaise: Math.round(s.driverPayoutPaise * factor),
      })),
    );
    setAlert({
      type: 'success',
      message: `Applied +${genPeakUpliftPct}% uplift to peak rates for all ${editingSlabs.length} slabs.`,
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
          vendorPricePaise: 30000,
          driverPayoutPaise: 24000,
          vendorPeakPricePaise: 36000,
          driverPeakPayoutPaise: 28800,
          active: true,
        },
      ]);
      return;
    }
    const last = editingSlabs[editingSlabs.length - 1];
    const newMin = last.maxDistanceMInclusive;
    const newMax = newMin + stepM;
    const vPaise = last.vendorPricePaise + Math.round((stepKm * 12) * 100);
    const dPaise = last.driverPayoutPaise + Math.round((stepKm * 9) * 100);

    setEditingSlabs([
      ...editingSlabs,
      {
        minDistanceMExclusive: newMin,
        maxDistanceMInclusive: newMax,
        vendorPricePaise: vPaise,
        driverPayoutPaise: dPaise,
        vendorPeakPricePaise: Math.round(vPaise * 1.2),
        driverPeakPayoutPaise: Math.round(dPaise * 1.2),
        active: true,
      },
    ]);
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
      const meta = {
        peakWindows: editingWindows,
        config: {
          vendorStepKm: genStepKm,
          driverStepKm: 5,
          maxDistanceKm: genMaxKm,
        },
      };

      if (activePlan.status === 'DRAFT') {
        await adminApi.updateDistancePricingSlabs(activePlan.id, editingSlabs, slabEditReason.trim() || undefined, meta);
        setAlert({ type: 'success', message: `Draft ${activePlan.version} rate cards saved. Publish it to activate.` });
        setIsEditSlabsOpen(false);
        loadPlans(activePlan.id);
      } else {
        const draft = await adminApi.createDistancePricingPlan({
          vehicleCategory: activePlan.vehicleCategory,
          name: slabEditReason.trim() ? `Draft: ${slabEditReason.trim()}`.slice(0, 120) : undefined,
          slabs: editingSlabs,
          peakWindows: editingWindows,
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
          <Button variant="secondary" size="sm" leftIcon={<Edit2 size={13} />} onClick={handleOpenSlabEditor}>
            Configure Slots &amp; Rates
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
        {/* Top Filter Tabs: Audience & Time Window */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          {/* Audience Switcher */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-surface-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setSelectedAudience('VENDOR')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: selectedAudience === 'VENDOR' ? 'var(--brand-primary)' : 'transparent',
                color: selectedAudience === 'VENDOR' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Building2 size={14} /> Vendor Rate Cards
            </button>
            <button
              type="button"
              onClick={() => setSelectedAudience('DRIVER')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: selectedAudience === 'DRIVER' ? 'var(--brand-primary)' : 'transparent',
                color: selectedAudience === 'DRIVER' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <Car size={14} /> Driver Rate Cards
            </button>
            <button
              type="button"
              onClick={() => setSelectedAudience('ESCORT')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: selectedAudience === 'ESCORT' ? 'var(--brand-primary)' : 'transparent',
                color: selectedAudience === 'ESCORT' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <ShieldCheck size={14} /> Security Escort Rates
            </button>
          </div>

          {/* Time Regime Switcher */}
          {selectedAudience !== 'ESCORT' && (
            <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-surface-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setSelectedRegime('NON_PEAK')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: selectedRegime === 'NON_PEAK' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                  color: selectedRegime === 'NON_PEAK' ? 'var(--color-success)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <Sun size={14} /> Non-Peak Hours
              </button>
              <button
                type="button"
                onClick={() => setSelectedRegime('PEAK')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: selectedRegime === 'PEAK' ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                  color: selectedRegime === 'PEAK' ? '#818CF8' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <Zap size={14} /> Peak Hours
              </button>
            </div>
          )}

          {selectedAudience !== 'ESCORT' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" leftIcon={<Edit2 size={13} />} onClick={handleOpenSlabEditor}>
                {isEditable ? 'Edit Draft Slabs' : 'Customize as Draft'}
              </Button>
            </div>
          )}
        </div>

        {/* Content: Condition-Based Slabs Grid */}
        {selectedAudience !== 'ESCORT' && (!activePlan || activePlan.slabs.length === 0) ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No distance rate cards configured. Click Customize as Draft to initialize bands.
          </div>
        ) : selectedAudience === 'ESCORT' ? (
          /* Dedicated Security Escort Pricing Table & Rate Management */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Quick Edit Card */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <div style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <ShieldCheck size={20} color="var(--brand-primary)" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Security Escort Guard Pricing Table
                  </h4>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--color-success)',
                    }}
                  >
                    LIVE IN VENDOR APP
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Flat per-trip add-on charged to the vendor when they switch on &ldquo;Security Escort&rdquo; while booking.
                  It is added on top of the distance-slab fare (standard or peak) and is not part of the driver payout.
                  Changes apply to every new quote immediately; quotes and bookings already created keep the fee they were priced with.
                </p>
              </div>

              {/* Inline Edit Form */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface-elevated)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={editingEscortFee}
                    onChange={(e) => setEditingEscortFee(e.target.value)}
                    style={{
                      width: '90px',
                      padding: '0.4rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ trip</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={savingEscortFee}
                  onClick={handleSaveEscortFee}
                >
                  Save Escort Rate
                </Button>
              </div>
            </div>

            {/* Escort Rates Table — mirrors exactly what the quote engine charges (one flat fee, both time regimes) */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Charge</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Time Regime</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Billing Model</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Vendor Pays (added to fare)</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Driver Payout Impact</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'NON_PEAK', label: 'Standard (Non-Peak) Hours', color: 'var(--color-success)' },
                    { key: 'PEAK', label: 'Peak Hours', color: '#F59E0B' },
                  ].map((regime) => (
                    <tr key={regime.key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 0.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Shield size={16} color="var(--brand-primary)" />
                          <div>
                            <div>Security Escort Add-on</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              Vendor turns on &ldquo;Security Escort&rdquo; for a cab while booking
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.6rem' }}>
                        <span style={{ fontWeight: 600, color: regime.color }}>{regime.label}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {regime.key === 'PEAK' ? 'Same flat fee — escort is not peak-adjusted' : 'Outside the configured peak windows'}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.6rem' }}>Flat, per trip</td>
                      <td style={{ padding: '0.85rem 0.6rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        + {inr(escortFee)}
                      </td>
                      <td style={{ padding: '0.85rem 0.6rem', color: 'var(--text-secondary)' }}>None (driver payout unchanged)</td>
                      <td style={{ padding: '0.85rem 0.6rem' }}>
                        <StatusBadge status="ACTIVE" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Where the rate shows up */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-success)', marginBottom: '0.35rem' }}>
                  <Zap size={14} /> Vendor App
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Shown as &ldquo;+{inr(escortFee)}&rdquo; on the Security Escort toggle, in the quote breakdown
                  (base fare + escort) and on the vendor rate card. Every new quote uses the saved value.
                </div>
              </div>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: '#818CF8', marginBottom: '0.35rem' }}>
                  <Car size={14} /> Driver App
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Trip offers for escorted bookings carry an &ldquo;Escort Included&rdquo; badge. The fee itself is
                  not shown to or paid to the driver.
                </div>
              </div>
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--brand-primary)', marginBottom: '0.35rem' }}>
                  <ShieldCheck size={14} /> Change History
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Each save is recorded in the pricing audit trail with the previous and new value.
                  {escortUpdatedAt ? ` Last changed ${new Date(escortUpdatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.` : ''}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Cards Grid: Condition-Based Cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {activePlan.slabs.map((s, idx) => {
              const isPeak = selectedRegime === 'PEAK';
              const isDriver = selectedAudience === 'DRIVER';

              const vendorPrice = isPeak ? (s.vendorPeakPricePaise ?? s.vendorPricePaise) / 100 : s.vendorPriceRupees;
              const driverPayout = isPeak ? (s.driverPeakPayoutPaise ?? s.driverPayoutPaise) / 100 : s.driverPayoutRupees;
              return (
                <div
                  key={s.id || idx}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      <Route size={15} color="var(--brand-primary)" />
                      <span>{s.displayRange}</span>
                    </div>
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: isPeak ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isPeak ? '#818CF8' : 'var(--color-success)',
                      }}
                    >
                      {isPeak ? '⚡ PEAK' : '🌤️ NON-PEAK'}
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {isDriver ? 'Driver Payout' : 'Vendor Charge'}
                    </div>
                    <div
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        color: isDriver ? 'var(--color-success)' : 'var(--text-primary)',
                        marginTop: '0.2rem',
                      }}
                    >
                      {inr(isDriver ? driverPayout : vendorPrice)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {isDriver ? `Charged to Vendor: ${inr(vendorPrice)}` : `Paid to Driver: ${inr(driverPayout)}`}
                    </div>
                  </div>

                </div>
              );
            })}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor Charge</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {inr(simResult.vendorPriceRupees)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Driver Payout</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                    {inr(simResult.driverPayoutRupees)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              <Sliders size={15} color="var(--brand-primary)" /> Distance Step Generator
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Min (km)</label>
                <input
                  type="number"
                  min="0"
                  value={genMinKm}
                  onChange={(e) => setGenMinKm(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Max (km)</label>
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
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Step (km)</label>
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
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vendor Base (₹)</label>
                <input
                  type="number"
                  min="50"
                  value={genBaseVendor}
                  onChange={(e) => setGenBaseVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vendor +₹/step</label>
                <input
                  type="number"
                  min="10"
                  value={genStepVendor}
                  onChange={(e) => setGenStepVendor(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Driver Base (₹)</label>
                <input
                  type="number"
                  min="50"
                  value={genBaseDriver}
                  onChange={(e) => setGenBaseDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Driver +₹/step</label>
                <input
                  type="number"
                  min="10"
                  value={genStepDriver}
                  onChange={(e) => setGenStepDriver(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Uplift (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={genPeakUpliftPct}
                  onChange={(e) => setGenPeakUpliftPct(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.2rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={handleApplyPeakUpliftToExisting}>
                Apply +{genPeakUpliftPct}% to Current Slabs
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
              style={{ width: '100%', marginTop: '0.35rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
            >
              <option value="ALL">ALL (Default Plan)</option>
              <option value="SEDAN">SEDAN</option>
              <option value="SUV">SUV</option>
              <option value="HATCHBACK">HATCHBACK</option>
              <option value="TEMPO_TRAVELLER">TEMPO_TRAVELLER</option>
              <option value="BUS">BUS</option>
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
