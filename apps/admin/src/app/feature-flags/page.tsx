'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  Wallet,
  Shield,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  User,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { FeatureFlagItem } from '../../lib/api/types';
import { Button } from '../../components/common/Button';
import { Drawer } from '../../components/common/Drawer';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Flag Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('PAYMENTS');
  const [newIsEnabled, setNewIsEnabled] = useState(true);
  const [creating, setCreating] = useState(false);

  // Load feature flags
  const loadFlags = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getFeatureFlags();
      setFlags(data || []);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to load feature flags' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  // Filtered flags
  const categories = useMemo(() => {
    const set = new Set<string>();
    flags.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [flags]);

  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [flags, selectedCategory, searchQuery]);

  // Stats
  const activeCount = flags.filter((f) => f.isEnabled).length;
  const totalCount = flags.length;

  // Toggle Handler
  const handleToggle = async (flag: FeatureFlagItem) => {
    const targetState = !flag.isEnabled;
    setTogglingKey(flag.key);

    // Optimistic UI update
    setFlags((prev) =>
      prev.map((f) => (f.key === flag.key ? { ...f, isEnabled: targetState, updatedAt: new Date().toISOString() } : f)),
    );

    try {
      const updated = await adminApi.toggleFeatureFlag(flag.key, targetState);
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? updated : f)));
      setAlert({
        type: 'success',
        message: `Feature flag "${flag.name}" is now ${targetState ? 'ENABLED' : 'DISABLED'}. Changes take effect across Mobile & Web in real time.`,
      });
    } catch (err: any) {
      // Revert optimistic update on failure
      setFlags((prev) =>
        prev.map((f) => (f.key === flag.key ? { ...f, isEnabled: flag.isEnabled } : f)),
      );
      setAlert({ type: 'error', message: err.message || `Failed to update ${flag.key}` });
    } finally {
      setTogglingKey(null);
    }
  };

  // Create Flag Handler
  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim()) {
      setAlert({ type: 'error', message: 'Key and Name are required.' });
      return;
    }

    setCreating(true);
    try {
      const created = await adminApi.createFeatureFlag({
        key: newKey.trim().toLowerCase(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        isEnabled: newIsEnabled,
      });

      setFlags((prev) => [created, ...prev.filter((f) => f.key !== created.key)]);
      setIsCreateOpen(false);
      setNewKey('');
      setNewName('');
      setNewDescription('');
      setNewIsEnabled(true);
      setAlert({
        type: 'success',
        message: `Feature flag "${created.name}" created successfully and initialized to ${created.isEnabled ? 'ENABLED' : 'DISABLED'}.`,
      });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to create feature flag' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: alert.type === 'success' ? '#10B981' : '#EF4444',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Feature Flags & Platform Controls
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Control live client features, vendor wallet accessibility, web/mobile gating, and operational rollouts in real time.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={loadFlags} isLoading={loading}>
            <RefreshCw size={14} style={{ marginRight: '0.35rem' }} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={15} style={{ marginRight: '0.35rem' }} /> Add Feature Flag
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Configured Flags</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active (Enabled)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>{activeCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Disabled (Gated)</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#EF4444' }}>{totalCount - activeCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sync Engine</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Live API & Mobile Sync</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search feature flags by name, key, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--brand-primary)' : 'var(--border)',
                background: selectedCategory === cat ? 'var(--brand-primary)' : 'transparent',
                color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Flags Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredFlags.map((flag) => {
          const isToggling = togglingKey === flag.key;
          const isVendorWallet = flag.key === 'vendor_wallet';

          return (
            <div
              key={flag.id || flag.key}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${flag.isEnabled ? 'rgba(99, 102, 241, 0.3)' : 'var(--border)'}`,
                boxShadow: flag.isEnabled ? '0 4px 20px rgba(99, 102, 241, 0.06)' : 'none',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Flag Info */}
              <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {isVendorWallet ? (
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={16} />
                    </div>
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tag size={16} />
                    </div>
                  )}

                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {flag.name}
                  </span>

                  <code
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {flag.key}
                  </code>

                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: flag.category === 'PAYMENTS' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: flag.category === 'PAYMENTS' ? '#6366F1' : '#10B981',
                      border: `1px solid ${flag.category === 'PAYMENTS' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                      textTransform: 'uppercase',
                    }}
                  >
                    {flag.category}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {flag.description || 'No description provided.'}
                </div>

                {/* Audit & Timing Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {flag.updatedBy && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={12} /> Updated by: <strong>{flag.updatedBy}</strong>
                    </span>
                  )}
                  {flag.updatedAt && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> {new Date(flag.updatedAt).toLocaleString()}
                    </span>
                  )}
                  {isVendorWallet && (
                    <span style={{ color: '#818CF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ⚡ Controls: Mobile App & Web Vendor Portal
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: flag.isEnabled ? '#10B981' : '#EF4444',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {flag.isEnabled ? 'Active (Live)' : 'Disabled'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {flag.isEnabled ? 'Visible in Vendor app' : 'Hidden from Vendor app'}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggle(flag)}
                  style={{
                    position: 'relative',
                    width: '56px',
                    height: '30px',
                    borderRadius: '15px',
                    background: flag.isEnabled ? '#10B981' : 'var(--border)',
                    border: 'none',
                    cursor: isToggling ? 'wait' : 'pointer',
                    transition: 'background 0.25s ease',
                    padding: '2px',
                    outline: 'none',
                    boxShadow: flag.isEnabled ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#fff',
                      transform: flag.isEnabled ? 'translateX(26px)' : 'translateX(0px)',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isToggling ? (
                      <RefreshCw size={12} color="#6366F1" className="animate-spin" />
                    ) : flag.isEnabled ? (
                      <CheckCircle2 size={13} color="#10B981" />
                    ) : (
                      <XCircle size={13} color="#9CA3AF" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          );
        })}

        {filteredFlags.length === 0 && !loading && (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <Sliders size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>No Feature Flags Found</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try adjusting your search criteria or create a new feature flag.</div>
          </div>
        )}
      </div>

      {/* Drawer: Create Feature Flag */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Feature Flag"
        subtitle="Create an authoritative dynamic toggle persisted in PostgreSQL."
        width="min(94vw, 500px)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={creating} onClick={handleCreateFlag}>
              Create Flag
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateFlag} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Unique Flag Key <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. corporate_auto_dispatch"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              required
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Lowercase alphanumeric, hyphens, and underscores only.
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Display Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Corporate Auto Dispatch System"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="PAYMENTS">PAYMENTS</option>
              <option value="FLEET">FLEET</option>
              <option value="TRIPS">TRIPS</option>
              <option value="DISPATCH">DISPATCH</option>
              <option value="CORPORATE">CORPORATE</option>
              <option value="GENERAL">GENERAL</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              rows={3}
              placeholder="Explain what this feature flag controls and its operational impact..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Initial State</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {newIsEnabled ? 'Enabled immediately across all apps upon creation' : 'Disabled initially upon creation'}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newIsEnabled}
                onChange={(e) => setNewIsEnabled(e.target.checked)}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: newIsEnabled ? '#10B981' : 'var(--text-secondary)' }}>
                {newIsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
