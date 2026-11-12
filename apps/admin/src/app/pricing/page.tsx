'use client';

import React, { useState, useEffect } from 'react';
import { Car, Truck, Bus, Sliders, Plus, Bike, Wallet, Percent } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { VehicleCategory, SystemPolicyConfig } from '../../lib/api/types';
import { PageHeader, KpiStrip, SegmentedTabs, FeedbackBanner, Card, DataTable, Button, Drawer, StatusBadge } from '../../components/common';
import { DynamicDistancePricingSection } from './DynamicDistancePricingSection';

type Section = 'DISTANCE_ENGINE' | 'CATEGORIES' | 'POLICIES';

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: '0.35rem',
  padding: '0.625rem 0.875rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
};

const labelStyle: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' };

const emptyCategory = { vehicleType: '', categoryLabel: '', seatingCapacity: '', description: '', iconKey: 'car' };

function CategoryIcon({ c }: { c: VehicleCategory }) {
  const key = c.iconKey || '';
  if (c.vehicleType === 'BIKE' || key === 'bike') return <Bike size={17} color="#F59E0B" />;
  if (c.vehicleType === 'BUS' || key === 'bus') return <Bus size={17} color="#10B981" />;
  if (c.vehicleType === 'TEMPO_TRAVELLER' || key === 'truck') return <Truck size={17} color="#8B5CF6" />;
  return <Car size={17} color="var(--brand-primary)" />;
}

export default function PricingPage() {
  const [activeSection, setActiveSection] = useState<Section>('DISTANCE_ENGINE');
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [policyConfig, setPolicyConfig] = useState<SystemPolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Category add / edit
  const [editing, setEditing] = useState<VehicleCategory | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [savingCategory, setSavingCategory] = useState(false);

  async function loadAllData() {
    setLoading(true);
    try {
      const [cats, policy] = await Promise.all([
        adminApi.getPricingTiers().catch(() => [] as VehicleCategory[]),
        adminApi.getPolicyConfig().catch(() => null),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      if (policy) setPolicyConfig(policy);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.vehicleType.trim() || !newCategory.categoryLabel.trim() || !newCategory.seatingCapacity.trim()) {
      setAlert({ type: 'error', message: 'Code, name and seating capacity are required.' });
      return;
    }
    setSavingCategory(true);
    try {
      const created = await adminApi.createPricingTier({
        vehicleType: newCategory.vehicleType.trim(),
        categoryLabel: newCategory.categoryLabel.trim(),
        seatingCapacity: newCategory.seatingCapacity.trim(),
        description: newCategory.description.trim() || undefined,
        iconKey: newCategory.iconKey,
      });
      setAlert({
        type: 'success',
        message: `Category ${created.vehicleType} added. It has no price until a distance plan covers it (its own plan, or the ALL plan).`,
      });
      setIsAddOpen(false);
      setNewCategory(emptyCategory);
      loadAllData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to add vehicle category' });
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingCategory(true);
    try {
      await adminApi.updatePricingTier(editing.vehicleType, {
        categoryLabel: editing.categoryLabel,
        seatingCapacity: editing.seatingCapacity,
        description: editing.description,
        iconKey: editing.iconKey || undefined,
        isActive: editing.isActive,
      });
      setAlert({ type: 'success', message: `Category ${editing.vehicleType} updated.` });
      setEditing(null);
      loadAllData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update vehicle category' });
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!policyConfig) return;
    setSavingPolicy(true);
    try {
      const updated = await adminApi.updatePolicyConfig({
        commissionPercent: Number(policyConfig.commissionPercent),
        driverMonthlyFee: Number(policyConfig.driverMonthlyFee ?? 0),
        driverTrialDays: Number(policyConfig.driverTrialDays ?? 0),
        minWithdrawalAmount: Number(policyConfig.minWithdrawalAmount),
        escortFee: Number(policyConfig.escortFee ?? 0),
        convenienceFeePercent: Number(policyConfig.convenienceFeePercent ?? 0),
        gstPercent: Number(policyConfig.gstPercent ?? 0),
      });
      setPolicyConfig(updated);
      setAlert({ type: 'success', message: 'Platform policy saved.' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update platform policy' });
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <div className="admin-page">
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      <PageHeader
        title="Pricing"
        subtitle="Distance-slab prices for vendors and drivers, vehicle categories, and platform policy. All values are stored in the database."
      />

      <SegmentedTabs
        tabs={[
          { id: 'DISTANCE_ENGINE', label: 'Distance Pricing' },
          { id: 'CATEGORIES', label: 'Vehicle Categories' },
          { id: 'POLICIES', label: 'Platform Policy' },
        ]}
        activeTab={activeSection}
        onChange={setActiveSection}
      />

      {activeSection === 'DISTANCE_ENGINE' && <DynamicDistancePricingSection />}

      {activeSection === 'CATEGORIES' && (
        <Card>
          <div style={{ marginBottom: '1.25rem', paddingTop: '0.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vehicle Categories</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Names and seating shown in the apps. Prices are set per category in Distance Pricing; a category without its own plan uses the ALL plan.
              </p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setIsAddOpen(true)}>
              Add Category
            </Button>
          </div>

          <DataTable
            columns={[
              {
                header: 'CATEGORY',
                accessor: (c: VehicleCategory) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(91, 66, 243, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CategoryIcon c={c} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{c.categoryLabel}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.vehicleType}</div>
                    </div>
                  </div>
                ),
              },
              { header: 'SEATING', accessor: (c: VehicleCategory) => c.seatingCapacity },
              { header: 'DESCRIPTION', accessor: (c: VehicleCategory) => c.description || '' },
              {
                header: 'STATUS',
                accessor: (c: VehicleCategory) => <StatusBadge status={c.isActive === false ? 'INACTIVE' : 'ACTIVE'} size="sm" />,
              },
              {
                header: 'ACTIONS',
                align: 'right',
                accessor: (c: VehicleCategory) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing({ ...c });
                    }}
                  >
                    Edit
                  </Button>
                ),
              },
            ]}
            data={categories}
            keyExtractor={(c) => c.vehicleType}
            loading={loading}
            emptyTitle="No vehicle categories"
            emptySubtitle="Add a category to make it bookable."
          />
        </Card>
      )}

      {activeSection === 'POLICIES' && (
        <>
          <KpiStrip
            columns={2}
            items={[
              {
                id: 'min-withdrawal',
                label: 'Minimum Withdrawal',
                value: policyConfig ? `₹ ${policyConfig.minWithdrawalAmount}` : '—',
                subtext: 'Enforced on driver payouts',
                icon: <Wallet size={16} color="var(--color-success)" />,
                tone: 'success',
              },
              {
                id: 'legacy-commission',
                label: 'Legacy Trip Commission',
                value: policyConfig ? `${policyConfig.commissionPercent}%` : '—',
                subtext: 'Only trips booked before distance pricing',
                icon: <Percent size={16} color="#8b5cf6" />,
                tone: 'violet',
              },
            ]}
          />

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingTop: '0.15rem' }}>
              <Sliders size={18} color="var(--brand-primary)" />
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)' }}>Platform Policy</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  Distance-priced trips pay the driver the slab payout in full; the platform keeps the slab spread. Commission below applies only to older trips without a pricing snapshot.
                </p>
              </div>
            </div>

            {!policyConfig ? (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>{loading ? 'Loading…' : 'Policy could not be loaded.'}</div>
            ) : (
              <form onSubmit={handleSavePolicy} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Minimum withdrawal (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={policyConfig.minWithdrawalAmount}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, minWithdrawalAmount: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Driver monthly fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={policyConfig.driverMonthlyFee ?? 0}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, driverMonthlyFee: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Driver trial days</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={policyConfig.driverTrialDays ?? 0}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, driverTrialDays: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Legacy trip commission (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={policyConfig.commissionPercent}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, commissionPercent: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Convenience fee (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={policyConfig.convenienceFeePercent ?? 0}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, convenienceFeePercent: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>GST (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={policyConfig.gstPercent ?? 0}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, gstPercent: Number(e.target.value) })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Security escort fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={policyConfig.escortFee ?? 300}
                    onChange={(e) => setPolicyConfig({ ...policyConfig, escortFee: Number(e.target.value) })}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Added to vendor quote when Security Escort is toggled; settled via ESCORT_PAYABLE.
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {policyConfig.updatedAt ? `Last saved: ${new Date(policyConfig.updatedAt).toLocaleString()}` : ''}
                  </span>
                  <Button variant="primary" size="sm" type="submit" isLoading={savingPolicy}>
                    Save Policy
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </>
      )}

      {/* Add category */}
      <Drawer
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Vehicle Category"
        subtitle="Catalogue only. Set its price in Distance Pricing (or let the ALL plan cover it)."
        icon={<Car size={18} />}
        width="min(94vw, 520px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={savingCategory} onClick={handleCreateCategory}>
              Add Category
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Code * (e.g. EV_SEDAN)</label>
            <input value={newCategory.vehicleType} onChange={(e) => setNewCategory({ ...newCategory, vehicleType: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Display name *</label>
            <input value={newCategory.categoryLabel} onChange={(e) => setNewCategory({ ...newCategory, categoryLabel: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Seating capacity * (e.g. 4 + 1 Passengers)</label>
            <input value={newCategory.seatingCapacity} onChange={(e) => setNewCategory({ ...newCategory, seatingCapacity: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Icon</label>
            <select value={newCategory.iconKey} onChange={(e) => setNewCategory({ ...newCategory, iconKey: e.target.value })} style={inputStyle}>
              <option value="car">Car</option>
              <option value="truck">Van / Traveller</option>
              <option value="bus">Bus</option>
              <option value="bike">Bike</option>
            </select>
          </div>
        </form>
      </Drawer>

      {/* Edit category */}
      <Drawer
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.vehicleType || ''}`}
        subtitle="Deactivated categories cannot be booked. Deactivation is refused while trips in the category are running."
        icon={<Sliders size={18} />}
        width="min(94vw, 520px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={savingCategory} onClick={handleSaveCategory}>
              Save
            </Button>
          </div>
        }
      >
        {editing && (
          <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Display name</label>
              <input value={editing.categoryLabel} onChange={(e) => setEditing({ ...editing, categoryLabel: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Seating capacity</label>
              <input value={editing.seatingCapacity} onChange={(e) => setEditing({ ...editing, seatingCapacity: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} style={inputStyle} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={editing.isActive !== false} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              Active (bookable)
            </label>
          </form>
        )}
      </Drawer>
    </div>
  );
}
