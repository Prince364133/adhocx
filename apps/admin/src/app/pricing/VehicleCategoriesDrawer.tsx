'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Truck,
  Bus,
  Bike,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Settings,
  RefreshCw,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { FeedbackBanner } from '../../components/common/FeedbackBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { adminApi } from '../../lib/api/client';
import { VehicleCategory } from '../../lib/api/types';

export interface VehicleCategoriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated?: () => void;
}

const COMMON_CAPACITY_PRESETS = [
  '3 Passengers',
  '4 + 1 Passengers',
  '6 Passengers',
  '7 + 1 Passengers',
  '12+ Passengers',
];

export function VehicleCategoriesDrawer({
  isOpen,
  onClose,
  onCategoriesUpdated,
}: VehicleCategoriesDrawerProps) {
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Category form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    vehicleType: '',
    categoryLabel: '',
    seatingCapacity: '4 + 1 Passengers',
    description: '',
    iconKey: 'car',
  });

  // Edit Category state
  const [editingVehicleType, setEditingVehicleType] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    categoryLabel: '',
    seatingCapacity: '',
    description: '',
    iconKey: 'car',
  });

  // Action busy state
  const [busyCategory, setBusyCategory] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getPricingTiers();
      setCategories(data);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to load vehicle categories from database.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAlert(null);
      setIsAddOpen(false);
      setEditingVehicleType(null);
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newCategory.vehicleType.trim().toUpperCase().replace(/\s+/g, '_');
    const label = newCategory.categoryLabel.trim();
    const capacity = newCategory.seatingCapacity.trim();

    if (!slug) {
      setAlert({ type: 'error', message: 'Vehicle identifier code is required (e.g. HATCHBACK).' });
      return;
    }
    if (!label) {
      setAlert({ type: 'error', message: 'Category display label is required (e.g. Hatchback).' });
      return;
    }
    if (!capacity) {
      setAlert({ type: 'error', message: 'Seating capacity is required (e.g. 4 + 1 Passengers).' });
      return;
    }

    if (categories.some((c) => c.vehicleType?.toUpperCase() === slug)) {
      setAlert({ type: 'error', message: `Vehicle category code "${slug}" already exists.` });
      return;
    }

    setCreating(true);
    setAlert(null);
    try {
      const created = await adminApi.createPricingTier({
        vehicleType: slug,
        categoryLabel: label,
        seatingCapacity: capacity,
        description: newCategory.description.trim() || `${label} fleet category`,
        iconKey: newCategory.iconKey || 'car',
      });

      setAlert({
        type: 'success',
        message: `Vehicle category "${created.categoryLabel || created.vehicleType}" registered in PostgreSQL successfully!`,
      });
      setIsAddOpen(false);
      setNewCategory({
        vehicleType: '',
        categoryLabel: '',
        seatingCapacity: '4 + 1 Passengers',
        description: '',
        iconKey: 'car',
      });
      await fetchCategories();
      onCategoriesUpdated?.();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to create vehicle category in database.',
      });
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (cat: VehicleCategory) => {
    setEditingVehicleType(cat.vehicleType);
    setEditForm({
      categoryLabel: cat.categoryLabel || '',
      seatingCapacity: cat.seatingCapacity || '',
      description: cat.description || '',
      iconKey: cat.iconKey || 'car',
    });
    setAlert(null);
  };

  const cancelEditing = () => {
    setEditingVehicleType(null);
    setAlert(null);
  };

  const handleSaveEdit = async (vehicleType: string) => {
    if (!editForm.categoryLabel.trim()) {
      setAlert({ type: 'error', message: 'Display label cannot be empty.' });
      return;
    }
    if (!editForm.seatingCapacity.trim()) {
      setAlert({ type: 'error', message: 'Seating capacity cannot be empty.' });
      return;
    }

    setSavingEdit(true);
    setAlert(null);
    try {
      await adminApi.updatePricingTier(vehicleType, {
        categoryLabel: editForm.categoryLabel.trim(),
        seatingCapacity: editForm.seatingCapacity.trim(),
        description: editForm.description.trim(),
        iconKey: editForm.iconKey,
      });

      setAlert({
        type: 'success',
        message: `Vehicle category "${vehicleType}" updated successfully in database.`,
      });
      setEditingVehicleType(null);
      await fetchCategories();
      onCategoriesUpdated?.();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to update vehicle category.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (cat: VehicleCategory) => {
    const isCurrentlyActive = cat.isActive !== false;
    setBusyCategory(cat.vehicleType);
    setAlert(null);
    try {
      if (isCurrentlyActive) {
        await adminApi.deletePricingTier(cat.vehicleType);
        setAlert({
          type: 'success',
          message: `Vehicle category "${cat.categoryLabel || cat.vehicleType}" deactivated.`,
        });
      } else {
        await adminApi.updatePricingTier(cat.vehicleType, { isActive: true });
        setAlert({
          type: 'success',
          message: `Vehicle category "${cat.categoryLabel || cat.vehicleType}" reactivated.`,
        });
      }
      await fetchCategories();
      onCategoriesUpdated?.();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to change category status.',
      });
    } finally {
      setBusyCategory(null);
    }
  };

  const getVehicleIcon = (key?: string | null, size = 20) => {
    switch (key?.toLowerCase()) {
      case 'truck':
      case 'suv':
        return <Truck size={size} />;
      case 'bus':
      case 'van':
      case 'traveller':
        return <Bus size={size} />;
      case 'bike':
      case 'scooter':
        return <Bike size={size} />;
      case 'car':
      case 'sedan':
      case 'hatchback':
      default:
        return <Car size={size} />;
    }
  };

  const activeCount = categories.filter((c) => c.isActive !== false).length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Vehicle Categories & Fleet Capacities"
      subtitle="View, manage, and add fleet categories and passenger capacities directly in PostgreSQL."
      width="620px"
      icon={<Settings size={20} color="var(--brand-primary)" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2rem' }}>
        {alert && (
          <FeedbackBanner
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        )}

        {/* Top Summary Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Database Categories
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {loading ? 'Loading...' : `${activeCount} Active ${activeCount === 1 ? 'Tier' : 'Tiers'}`}
              {categories.length > activeCount && (
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  ({categories.length - activeCount} inactive)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchCategories}
              loading={loading}
              leftIcon={<RefreshCw size={14} />}
              title="Refresh from PostgreSQL"
            >
              Refresh
            </Button>
            <Button
              variant={isAddOpen ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setIsAddOpen(!isAddOpen)}
              leftIcon={isAddOpen ? <X size={14} /> : <Plus size={14} />}
            >
              {isAddOpen ? 'Cancel' : 'Add Category'}
            </Button>
          </div>
        </div>

        {/* Add New Category Panel */}
        {isAddOpen && (
          <form
            onSubmit={handleCreateCategory}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--brand-primary)',
              background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(91, 66, 243, 0.05) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={17} color="var(--brand-primary)" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  New Vehicle Category
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                PERSISTED TO POSTGRESQL
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Category Code (ID) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. HATCHBACK, EV"
                  value={newCategory.vehicleType}
                  onChange={(e) => setNewCategory({ ...newCategory, vehicleType: e.target.value.toUpperCase() })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Uppercase unique key</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Display Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hatchback, Mini"
                  value={newCategory.categoryLabel}
                  onChange={(e) => setNewCategory({ ...newCategory, categoryLabel: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shown in UI and apps</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Seating Capacity *
              </label>
              <input
                type="text"
                placeholder="e.g. 4 + 1 Passengers or 4 Passengers"
                value={newCategory.seatingCapacity}
                onChange={(e) => setNewCategory({ ...newCategory, seatingCapacity: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              />
              {/* Capacity Quick Presets */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {COMMON_CAPACITY_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setNewCategory({ ...newCategory, seatingCapacity: preset })}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      background: newCategory.seatingCapacity === preset ? 'var(--brand-primary)' : 'var(--bg-surface-elevated)',
                      color: newCategory.seatingCapacity === preset ? '#fff' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Vehicle Icon
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {(['car', 'truck', 'bus', 'bike'] as const).map((key) => {
                    const isSelected = newCategory.iconKey === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setNewCategory({ ...newCategory, iconKey: key })}
                        style={{
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(91, 66, 243, 0.12)' : 'var(--bg-surface)',
                          color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                        }}
                      >
                        {getVehicleIcon(key, 18)}
                        <span>{key === 'truck' ? 'SUV' : key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Budget 4-seat transit"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={creating}
                leftIcon={<Plus size={14} />}
              >
                Save Category to Database
              </Button>
            </div>
          </form>
        )}

        {/* Existing Categories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Configured Categories & Capacities
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {categories.length} registered in PostgreSQL
            </span>
          </div>

          {loading && categories.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div
              style={{
                padding: '2.5rem',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-secondary)',
              }}
            >
              <Car size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                No vehicle categories found
              </div>
              <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                Click "+ Add Category" above to register your first vehicle category.
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const isEditing = editingVehicleType === cat.vehicleType;
              const isActive = cat.isActive !== false;
              const isBusy = busyCategory === cat.vehicleType;

              return (
                <div
                  key={cat.vehicleType}
                  style={{
                    padding: '1.125rem',
                    background: 'var(--bg-surface)',
                    border: `1px solid ${isActive ? 'var(--border)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    opacity: isActive ? 1 : 0.65,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isEditing ? (
                    // Inline Edit Form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                          Editing Category: {cat.vehicleType}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CODE CANNOT BE CHANGED</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Display Label
                          </label>
                          <input
                            type="text"
                            value={editForm.categoryLabel}
                            onChange={(e) => setEditForm({ ...editForm, categoryLabel: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Seating Capacity
                          </label>
                          <input
                            type="text"
                            value={editForm.seatingCapacity}
                            onChange={(e) => setEditForm({ ...editForm, seatingCapacity: e.target.value })}
                            placeholder="e.g. 4 Passengers"
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Description
                          </label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={cancelEditing}
                            disabled={savingEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={savingEdit}
                            onClick={() => handleSaveEdit(cat.vehicleType)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Normal Display View
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      {/* Left: Icon & Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: isActive ? 'rgba(91, 66, 243, 0.1)' : 'var(--bg-surface-elevated)',
                            color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getVehicleIcon(cat.iconKey, 22)}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {cat.categoryLabel || cat.vehicleType}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {cat.vehicleType}
                            </span>
                            <StatusBadge
                              status={isActive ? 'APPROVED' : 'REJECTED'}
                              label={isActive ? 'ACTIVE' : 'INACTIVE'}
                            />
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {cat.description || `${cat.categoryLabel} vehicle service`}
                          </div>
                        </div>
                      </div>

                      {/* Right: Prominent Capacity Badge & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Seating Capacity Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: 'var(--color-success)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}
                          title="Fleet Seating Capacity"
                        >
                          <Users size={16} />
                          <span>{cat.seatingCapacity || '4 Passengers'}</span>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            onClick={() => startEditing(cat)}
                            title="Edit Category"
                            style={{
                              padding: '0.4rem 0.55rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-surface-elevated)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleActive(cat)}
                            disabled={isBusy}
                            title={isActive ? 'Deactivate Category' : 'Reactivate Category'}
                            style={{
                              padding: '0.4rem 0.55rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-surface-elevated)',
                              color: isActive ? 'var(--color-danger)' : 'var(--color-success)',
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {isActive ? <Trash2 size={13} /> : <RotateCcw size={13} />}
                            <span>{isActive ? 'Deactivate' : 'Reactivate'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Drawer>
  );
}
