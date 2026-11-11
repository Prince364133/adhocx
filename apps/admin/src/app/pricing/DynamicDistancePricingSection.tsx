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
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  DistancePricingPlan,
  CreatePricingSlabInput,
  PricingAuditItem,
  DistanceSimulationResult,
} from '../../lib/api/types';
import { Card, Button, StatusBadge, Drawer } from '../../components/common';

const inr = (rupees: number | undefined) => `₹${Number(rupees ?? 0).toLocaleString('en-IN')}`;

export function DynamicDistancePricingSection() {
  const [plans, setPlans] = useState<DistancePricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Draft & Edit Slabs State
  const [editingSlabs, setEditingSlabs] = useState<CreatePricingSlabInput[]>([]);
  const [isEditSlabsOpen, setIsEditSlabsOpen] = useState(false);
  const [savingSlabs, setSavingSlabs] = useState(false);
  const [slabEditReason, setSlabEditReason] = useState('');

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
  const [simResult, setSimResult] = useState<DistanceSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const loadPlans = useCallback(async (preferredPlanId?: string) => {
    setLoading(true);
    try {
      const data = await adminApi.getDistancePricingPlans();
      setPlans(data);
      if (data.length > 0) {
        if (preferredPlanId && data.some((p) => p.id === preferredPlanId)) {
          setSelectedPlanId(preferredPlanId);
        } else {
          // Default to active plan, or first plan
          const active = data.find((p) => p.status === 'ACTIVE') || data[0];
          setSelectedPlanId(active.id);
        }
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load distance pricing plans' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  // Plan that currently prices each category. Categories without their own plan use the ALL plan.
  const livePlans = useMemo(() => plans.filter((p) => p.status === 'ACTIVE'), [plans]);
  const isEditable = activePlan?.status === 'DRAFT';

  // Run simulation whenever simDistanceKm or activePlan changes
  useEffect(() => {
    if (!activePlan || !simDistanceKm || simDistanceKm <= 0) return;
    let cancelled = false;

    async function runSim() {
      setSimulating(true);
      try {
        const res = await adminApi.simulateDistancePricing({
          distanceKm: Number(simDistanceKm),
          vehicleCategory: activePlan?.vehicleCategory || 'ALL',
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
  }, [simDistanceKm, activePlan]);

  // Handle open slab editor
  // Live (ACTIVE / SCHEDULED / RETIRED) plans are never edited in place: saving creates a new
  // DRAFT with these slabs, which must then be published. Only DRAFT plans are edited directly.
  function handleOpenSlabEditor() {
    if (!activePlan) return;
    setSlabEditReason('');
    setEditingSlabs(
      activePlan.slabs.map((s) => ({
        minDistanceMExclusive: s.minDistanceMExclusive,
        maxDistanceMInclusive: s.maxDistanceMInclusive,
        vendorPricePaise: s.vendorPricePaise,
        driverPayoutPaise: s.driverPayoutPaise,
        active: s.active,
      })),
    );
    setIsEditSlabsOpen(true);
  }

  // Quick 5 km extension
  function handleAdd5KmExtension() {
    if (editingSlabs.length === 0) {
      // Prices are entered by the admin; nothing is pre-filled.
      setEditingSlabs([
        { minDistanceMExclusive: 0, maxDistanceMInclusive: 5000, vendorPricePaise: 0, driverPayoutPaise: 0, active: true },
      ]);
      return;
    }
    const last = editingSlabs[editingSlabs.length - 1];
    const newMin = last.maxDistanceMInclusive;
    const newMax = newMin + 5000;
    // Start from the previous band's prices; the admin adjusts them before saving.
    const newVendorPaise = last.vendorPricePaise;
    const newDriverPaise = last.driverPayoutPaise;

    setEditingSlabs([
      ...editingSlabs,
      {
        minDistanceMExclusive: newMin,
        maxDistanceMInclusive: newMax,
        vendorPricePaise: newVendorPaise,
        driverPayoutPaise: newDriverPaise,
        active: true,
      },
    ]);
  }

  // Remove a slab
  function handleRemoveSlab(index: number) {
    const updated = editingSlabs.filter((_, idx) => idx !== index);
    setEditingSlabs(updated);
  }

  // Update a slab field
  function handleUpdateSlabField(index: number, field: keyof CreatePricingSlabInput, value: any) {
    const updated = [...editingSlabs];
    updated[index] = { ...updated[index], [field]: value };
    setEditingSlabs(updated);
  }

  // Validate editing slabs locally
  const slabValidation = useMemo(() => {
    if (editingSlabs.length === 0) return { valid: false, error: 'At least one slab is required.' };
    if (editingSlabs[0].minDistanceMExclusive !== 0) {
      return { valid: false, error: `First slab must start at 0 km (0m). Currently starts at ${editingSlabs[0].minDistanceMExclusive}m.` };
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
          error: `Slab #${i + 1} vendor charge (₹${s.vendorPricePaise / 100}) cannot be less than driver payout (₹${s.driverPayoutPaise / 100}).`,
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

  // Save Slabs
  async function handleSaveSlabs() {
    if (!activePlan || !slabValidation.valid) return;
    setSavingSlabs(true);
    try {
      if (activePlan.status === 'DRAFT') {
        await adminApi.updateDistancePricingSlabs(activePlan.id, editingSlabs, slabEditReason.trim() || undefined);
        setAlert({ type: 'success', message: `Draft ${activePlan.version} saved. Publish it to start using these prices.` });
        setIsEditSlabsOpen(false);
        loadPlans(activePlan.id);
      } else {
        const draft = await adminApi.createDistancePricingPlan({
          vehicleCategory: activePlan.vehicleCategory,
          name: slabEditReason.trim() ? `Draft: ${slabEditReason.trim()}`.slice(0, 120) : undefined,
          slabs: editingSlabs,
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
        version: newPlanVersion.trim() || undefined, // blank: the server assigns the next version
        name: newPlanName.trim() || undefined,
        vehicleCategory: newPlanCategory,
        cloneFromPlanId: cloneFromActive && activePlan ? activePlan.id : undefined,
      });
      setAlert({ type: 'success', message: `Draft plan version ${created.version} created successfully! You can now adjust rates and publish.` });
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
        // datetime-local has no timezone: interpret it in the admin's browser timezone.
        publishEffectiveFrom ? new Date(publishEffectiveFrom).toISOString() : undefined,
      );
      setAlert({
        type: 'success',
        message: `Plan ${published.version} ${published.status === 'SCHEDULED' ? 'scheduled for activation' : 'published as ACTIVE authoritative rate engine'}!`,
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

  // Retire (deactivate) an ACTIVE plan, or cancel a SCHEDULED one back to DRAFT
  async function handleRetirePlan() {
    if (!activePlan || !retireReason.trim()) return;
    setRetiring(true);
    try {
      const res = await adminApi.retireDistancePricingPlan(activePlan.id, retireReason.trim());
      setAlert({
        type: 'success',
        message:
          activePlan.status === 'SCHEDULED'
            ? `Scheduled activation of ${activePlan.version} cancelled; it is a draft again.`
            : `Plan ${activePlan.version} deactivated. ${activePlan.vehicleCategory === 'ALL' ? 'Categories without their own plan can no longer be quoted until another ALL plan is published.' : `${activePlan.vehicleCategory} now falls back to the ALL plan, if one is active.`}`,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            padding: '0.68rem 0.95rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.775rem',
            fontWeight: 500,
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
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
          gap: '0.85rem',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '0.95rem 1.05rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rate Plan</div>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              style={{
                marginTop: '0.2rem',
                padding: '0.38rem 0.78rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                minWidth: '215px',
              }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `Plan ${p.version}`} [{p.status}] ({p.vehicleCategory})
                </option>
              ))}
            </select>
          </div>

          {activePlan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '1rem' }}>
              <StatusBadge status={activePlan.status} size="sm" showPulse={activePlan.status === 'ACTIVE'} />
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.16rem 0.45rem',
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

        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" leftIcon={<History size={13} />} onClick={handleOpenAudit}>
            Audit Trail
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Plus size={13} />} onClick={() => setIsCreatePlanOpen(true)}>
            New Draft Version
          </Button>
          {activePlan && (activePlan.status === 'ACTIVE' || activePlan.status === 'SCHEDULED') && (
            <Button variant="secondary" size="sm" leftIcon={<AlertTriangle size={13} />} onClick={() => setIsRetireOpen(true)}>
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
        <strong style={{ color: 'var(--text-primary)' }}>Live pricing:</strong>
        {livePlans.length === 0 ? (
          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
            No plan is active, so no trip can be quoted or booked. Publish a plan to start.
          </span>
        ) : (
          livePlans.map((p) => (
            <span
              key={p.id}
              style={{ padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            >
              {p.vehicleCategory === 'ALL' ? 'All other categories (ALL)' : p.vehicleCategory}: v{p.version}
            </span>
          ))
        )}
        {livePlans.length > 0 && !livePlans.some((p) => p.vehicleCategory === 'ALL') && (
          <span style={{ color: 'var(--color-warning)' }}>
            No ALL plan is active: categories without their own plan cannot be quoted.
          </span>
        )}
      </div>

      {/* Main Grid: Rate Slabs Table & Interactive Route Simulator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Distance Slabs Table */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingTop: '0.15rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Distance Slabs ({activePlan?.slabs.length || 0} Bands)
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Fixed total trip price per distance band based on exact Google Maps route meters (PRD Section 2)
              </p>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Edit2 size={14} />} onClick={handleOpenSlabEditor}>
              {isEditable ? 'Edit Draft Slabs' : 'Edit as New Draft'}
            </Button>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading rate slabs...</div>
          ) : !activePlan || activePlan.slabs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No distance slabs configured. Click Configure Slabs to add initial bands.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Route Distance</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Vendor Charge</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Driver Payout</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Gross Spread</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Margin</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlan.slabs.map((slab, idx) => (
                    <tr
                      key={slab.id || idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      }}
                    >
                      <td style={{ padding: '0.875rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Route size={14} style={{ color: 'var(--brand-primary)' }} />
                          <span>{slab.displayRange}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '1.25rem' }}>
                          {slab.minDistanceMExclusive.toLocaleString()}m – {slab.maxDistanceMInclusive.toLocaleString()}m
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {inr(slab.vendorPriceRupees)}
                      </td>
                      <td style={{ padding: '0.875rem 0.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
                        {inr(slab.driverPayoutRupees)}
                      </td>
                      <td style={{ padding: '0.875rem 0.5rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {inr(slab.grossSpreadRupees)}
                      </td>
                      <td style={{ padding: '0.875rem 0.5rem', fontWeight: 600 }}>
                        <span
                          style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.75rem',
                            background:
                              slab.grossMarginPercent >= 20
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(91, 66, 243, 0.12)',
                            color: slab.grossMarginPercent >= 20 ? 'var(--color-success)' : 'var(--brand-primary)',
                            fontWeight: 700,
                          }}
                        >
                          {slab.grossMarginPercent}%
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-xs)',
                            background: slab.active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.1)',
                            color: slab.active ? 'var(--color-success)' : 'var(--text-muted)',
                          }}
                        >
                          {slab.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Live Route Distance Simulator (PRD Section 5 & 11) */}
        <Card>
          <div style={{ marginBottom: '1.25rem', paddingTop: '0.15rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Interactive Distance Engine Simulator
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Test authoritative rate resolution for arbitrary distances & verify exact boundary rules
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Route Distance (km)</span>
                <span style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1.125rem' }}>
                  {simDistanceKm} km ({Math.round(simDistanceKm * 1000).toLocaleString()} meters)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="0.1"
                value={simDistanceKm}
                onChange={(e) => setSimDistanceKm(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {[10.0, 10.001, 15.0, 22.4, 30.0, 38.5, 45.0].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setSimDistanceKm(sample)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-xs)',
                      background: simDistanceKm === sample ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                      color: simDistanceKm === sample ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {sample} km
                  </button>
                ))}
              </div>
            </div>

            {/* Boundary Case Guide */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(91, 66, 243, 0.08)',
                border: '1px solid rgba(91, 66, 243, 0.2)',
                fontSize: '0.78125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '0.25rem' }}>
                💡 Exact Boundary Verification Rule (PRD Section 9)
              </div>
              Exact <strong>10.000 km (10,000m)</strong> resolves to the <strong>0–10 km</strong> slab. An additional single meter (<strong>10.001 km / 10,001m</strong>) transitions directly into the <strong>&gt;10–15 km</strong> band.
            </div>

            {/* Resolved Pricing Outcome */}
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
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Matching Band:</span>
                  <span style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '1rem' }}>
                    {simResult.slabRange}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vendor Charge</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {inr(simResult.vendorPriceRupees)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {simResult.vendorPricePaise.toLocaleString()} paise
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Driver Payout</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                      {inr(simResult.driverPayoutRupees)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {simResult.driverPayoutPaise.toLocaleString()} paise
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gross Spread</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.2rem' }}>
                      {inr(simResult.grossSpreadRupees)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--brand-primary)', fontWeight: 700, marginTop: '0.1rem' }}>
                      {simResult.grossMarginPercent}% margin
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  🔒 Security Enforced: Driver API never sees Vendor Charge (₹{simResult.vendorPriceRupees}); Vendor API never sees Driver Payout (₹{simResult.driverPayoutRupees}) or AdhocX Spread.
                </div>
              </div>
            ) : simulating ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calculating rate resolution...</div>
            ) : (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                }}
              >
                <strong>⚠️ Distance Exceeds Last Configured Slab:</strong> The selected distance ({simDistanceKm} km) is greater than the highest configured slab. Per PRD Section 2, the engine does not guess prices. Use <strong>Configure Slabs</strong> to add the missing band in 5 km increments.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Drawer: Slabs Configuration & Real-Time Validation */}
      <Drawer
        isOpen={isEditSlabsOpen}
        onClose={() => setIsEditSlabsOpen(false)}
        title={isEditable ? `Edit Draft ${activePlan?.version || ''}` : `New Draft from Plan ${activePlan?.version || ''}`}
        subtitle={
          isEditable
            ? 'Changes stay in this draft until it is published.'
            : `Plan ${activePlan?.version || ''} (${activePlan?.status || ''}) is not changed. Saving creates a new draft for ${activePlan?.vehicleCategory || ''} that you then publish.`
        }
        width="760px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={handleAdd5KmExtension}>
              +5 km Extension
            </Button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsEditSlabsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!slabValidation.valid || savingSlabs}
                loading={savingSlabs}
                onClick={handleSaveSlabs}
              >
                {isEditable ? 'Save Draft' : 'Save as New Draft'}
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Reason for change (recorded in the audit trail)
            </label>
            <input
              type="text"
              placeholder="e.g. Fuel price revision, driver payout increase"
              value={slabEditReason}
              onChange={(e) => setSlabEditReason(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Validation Notice */}
          {!slabValidation.valid && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-danger)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              ⚠️ {slabValidation.error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {editingSlabs.map((slab, idx) => {
              const spread = (slab.vendorPricePaise || 0) - (slab.driverPayoutPaise || 0);
              const margin = slab.vendorPricePaise > 0 ? ((spread / slab.vendorPricePaise) * 100).toFixed(1) : '0';

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: 'var(--brand-primary)', fontSize: '0.875rem' }}>
                      Slab #{idx + 1}: {slab.minDistanceMExclusive / 1000} km → {slab.maxDistanceMInclusive / 1000} km
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlab(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                      }}
                      title="Delete Slab"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Min Distance (m)</label>
                      <input
                        type="number"
                        value={slab.minDistanceMExclusive}
                        onChange={(e) => handleUpdateSlabField(idx, 'minDistanceMExclusive', parseInt(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          marginTop: '0.2rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max Distance (m)</label>
                      <input
                        type="number"
                        value={slab.maxDistanceMInclusive}
                        onChange={(e) => handleUpdateSlabField(idx, 'maxDistanceMInclusive', parseInt(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          marginTop: '0.2rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Vendor Charge (Paise)</label>
                      <input
                        type="number"
                        value={slab.vendorPricePaise}
                        onChange={(e) => handleUpdateSlabField(idx, 'vendorPricePaise', parseInt(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          marginTop: '0.2rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        = ₹{slab.vendorPricePaise / 100}
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Driver Payout (Paise)</label>
                      <input
                        type="number"
                        value={slab.driverPayoutPaise}
                        onChange={(e) => handleUpdateSlabField(idx, 'driverPayoutPaise', parseInt(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          marginTop: '0.2rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-success)' }}>
                        = ₹{slab.driverPayoutPaise / 100}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
                    <span>Gross Spread: <strong style={{ color: 'var(--brand-primary)' }}>₹{spread / 100}</strong></span>
                    <span>Gross Margin: <strong style={{ color: 'var(--color-success)' }}>{margin}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Drawer>

      {/* Drawer: Create New Plan Version */}
      <Drawer
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
        title="Create New Distance Plan Version"
        subtitle="Author a new pricing schedule version without affecting confirmed live bookings"
        width="540px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsCreatePlanOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={creatingPlan} onClick={handleCreatePlanVersion}>
              Create Draft Plan
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreatePlanVersion} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Version (optional, next number is used if blank)
            </label>
            <input
              type="text"
              placeholder="e.g. 1.1, 2.0, 2026.Q4"
              value={newPlanVersion}
              onChange={(e) => setNewPlanVersion(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Plan Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Q4 Peak Distance Rate Plan"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Vehicle Category
            </label>
            <select
              value={newPlanCategory}
              onChange={(e) => setNewPlanCategory(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">ALL (default for categories without their own plan)</option>
              <option value="SEDAN">SEDAN (Prime Sedan)</option>
              <option value="SUV">SUV (6-7 Seater)</option>
              <option value="TEMPO_TRAVELLER">TEMPO_TRAVELLER (Mini Coach)</option>
              <option value="BUS">BUS (Commercial Coach)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="cloneActiveCheckbox"
              checked={cloneFromActive}
              onChange={(e) => setCloneFromActive(e.target.checked)}
              style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px' }}
            />
            <label htmlFor="cloneActiveCheckbox" style={{ fontSize: '0.875rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Copy slabs from the selected plan ({activePlan ? `${activePlan.vehicleCategory} v${activePlan.version}` : 'none'}). Unchecked: copy from this category's live plan.
            </label>
          </div>
        </form>
      </Drawer>

      {/* Drawer: Publish Plan Confirmation */}
      <Drawer
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title={`Publish Rate Plan ${activePlan?.version || ''}`}
        subtitle="Activate this plan version to authoritatively price all future quotes across AdhocX"
        width="540px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!publishReason.trim() || publishing}
              loading={publishing}
              onClick={handlePublishPlan}
            >
              Confirm & Publish
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '0.875rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(91, 66, 243, 0.08)',
              border: '1px solid rgba(91, 66, 243, 0.25)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--text-secondary)',
            }}
          >
            <strong>What happens:</strong> this plan replaces the current {activePlan?.vehicleCategory} plan for new quotes (immediately, or at the scheduled time). Confirmed bookings and unexpired quotes keep the price they were given.
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Publish / Activation Reason * (Mandatory for Audit Trail)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Q4 price adjustment for fuel index and driver payout increase"
              value={publishReason}
              onChange={(e) => setPublishReason(e.target.value)}
              required
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Scheduled Activation Time (Optional: leave blank for immediate activation)
            </label>
            <input
              type="datetime-local"
              value={publishEffectiveFrom}
              onChange={(e) => setPublishEffectiveFrom(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>
      </Drawer>

      {/* Drawer: Retire / Cancel Schedule */}
      <Drawer
        isOpen={isRetireOpen}
        onClose={() => setIsRetireOpen(false)}
        title={activePlan?.status === 'SCHEDULED' ? `Cancel scheduled plan ${activePlan?.version || ''}` : `Deactivate plan ${activePlan?.version || ''}`}
        subtitle={
          activePlan?.status === 'SCHEDULED'
            ? 'The plan goes back to DRAFT and will not activate.'
            : activePlan?.vehicleCategory === 'ALL'
              ? 'Categories without their own plan will have no price and cannot be booked until another ALL plan is published.'
              : `${activePlan?.vehicleCategory || ''} will use the ALL plan if one is active; otherwise it cannot be booked.`
        }
        width="540px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsRetireOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" disabled={!retireReason.trim() || retiring} loading={retiring} onClick={handleRetirePlan}>
              Confirm
            </Button>
          </div>
        }
      >
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason * (recorded in the audit trail)</label>
          <textarea
            rows={3}
            value={retireReason}
            onChange={(e) => setRetireReason(e.target.value)}
            style={{
              width: '100%',
              marginTop: '0.35rem',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>
      </Drawer>

      {/* Drawer: Pricing Audit Trail */}
      <Drawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Pricing Engine Audit Trail"
        subtitle="Complete immutable change history: actors, timestamps, old/new values, and justification"
        width="680px"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAuditOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {loadingAudit ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit trail...</div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit events recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{log.action}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Actor: <strong>{log.actorName || log.actorId || 'System'}</strong>
                </div>
                {log.reason && (
                  <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: '0.4rem' }}>
                    &ldquo;{log.reason}&rdquo;
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Entity: {log.entityType} ({log.entityId.slice(0, 8)}...)
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
