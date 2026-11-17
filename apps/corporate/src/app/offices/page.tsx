'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Car,
  ShieldCheck,
  MapPin,
  Plus,
  ExternalLink,
  ChevronRight,
  Search,
} from 'lucide-react';
import { tenantApi } from '../../lib/api/corporate';
import type { Office } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
import MetricCard from '../../components/common/MetricCard';

export default function OfficesDirectoryPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId;

  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [officeForm, setOfficeForm] = useState({
    code: '',
    name: '',
    city: '',
    addressText: '',
    latitude: '',
    longitude: '',
  });

  const loadOffices = useCallback(async () => {
    if (!activeTenantId) {
      setOffices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setOffices(await tenantApi.offices(activeTenantId));
    } catch (err) {
      console.error('Failed to load offices:', err);
      setError('Unable to load tenant offices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    void loadOffices();
  }, [loadOffices]);

  const createOffice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTenantId) return;
    const latitude = Number(officeForm.latitude);
    const longitude = Number(officeForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFormError('Enter valid latitude and longitude coordinates.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await tenantApi.createOffice(activeTenantId, { ...officeForm, latitude, longitude });
      setShowCreateForm(false);
      setOfficeForm({ code: '', name: '', city: '', addressText: '', latitude: '', longitude: '' });
      await loadOffices();
    } catch (err) {
      console.error('Failed to create office:', err);
      setFormError('Unable to create the office. Check the details and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOffices = offices.filter((off) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (off.name || '').toLowerCase().includes(s) ||
      (off.code || '').toLowerCase().includes(s) ||
      (off.address || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'All' || (off.isActive === true ? 'Active' : off.isActive === false ? 'Inactive' : 'Unknown') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasHeadcountForAllOffices = offices.length > 0 && offices.every((office) => office.employeeCount !== undefined);
  const totalHeadcount = offices.reduce((sum, office) => sum + (office.employeeCount ?? 0), 0);
  const geofencedOfficeCount = offices.filter((office) => office.geofenceRadiusMeters !== undefined).length;
  const activeOfficesCount = offices.filter((office) => office.isActive === true).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Offices & Sites Directory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Manage registered company facilities, campus geofences, and operational shift terminals
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowCreateForm((shown) => !shown)}
            disabled={!activeTenantId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add Campus Site
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Registered Campuses"
          value={loading ? '...' : `${offices.length} Sites`}
          delta={`${activeOfficesCount} Operational`}
          deltaType="positive"
          icon={<Building2 size={20} />}
          category="primary"
        />
        <MetricCard
          label="Headcount Linked"
          value={hasHeadcountForAllOffices ? totalHeadcount.toLocaleString() : '—'}
          delta="API-reported headcount"
          deltaType="neutral"
          icon={<Users size={20} />}
          category="primary"
        />
        <MetricCard
          label="Offices with geofence radius"
          value={loading ? '...' : geofencedOfficeCount.toLocaleString()}
          delta="Stored office settings"
          deltaType="neutral"
          icon={<Car size={20} />}
          category="success"
        />
        <MetricCard
          label="Access Perimeter"
          value="—"
          delta="Access hardware status is not in the API"
          deltaType="neutral"
          icon={<ShieldCheck size={20} />}
          category="info"
        />
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', minWidth: 280, flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by campus name, code or address..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: 'var(--bg-surface-muted)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={createOffice} className="surface-card" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {([
            ['code', 'Office code'],
            ['name', 'Office name'],
            ['city', 'City'],
            ['addressText', 'Address'],
            ['latitude', 'Latitude'],
            ['longitude', 'Longitude'],
          ] as const).map(([field, label]) => (
            <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              {label}
              <input
                required={field !== 'city'}
                type={field === 'latitude' || field === 'longitude' ? 'number' : 'text'}
                step={field === 'latitude' || field === 'longitude' ? 'any' : undefined}
                value={officeForm[field]}
                onChange={(event) => setOfficeForm((form) => ({ ...form, [field]: event.target.value }))}
                style={{ height: 36, padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: 6 }}
              />
            </label>
          ))}
          {formError && <div role="alert" style={{ gridColumn: '1 / -1', color: '#B91C1C' }}>{formError}</div>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => setShowCreateForm(false)} disabled={isSaving}>Cancel</button>
            <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create office'}</button>
          </div>
        </form>
      )}
      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      {/* Campus Sites Grid Cards */}
      {loading ? (
        <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading registered office campuses...
        </div>
      ) : filteredOffices.length === 0 ? (
        <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          No office locations found. Add your company campus sites to start configuring rosters and geofences.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {filteredOffices.map((office) => {
            const statusText = office.isActive === undefined ? 'Unknown' : office.isActive ? 'Active' : 'Inactive';
            const geofenceRadius = office.geofenceRadiusMeters;
            return (
              <div
                key={office.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#EFF6FF',
                            color: '#5728B2',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {office.code || '—'}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: office.isActive === true ? '#DCFCE7' : '#F1F5F9',
                            color: office.isActive === true ? '#15803D' : '#64748B',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {statusText}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 4px 0' }}>
                        {office.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <MapPin size={13} />
                        <span>{office.addressText || office.address || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Campus Stats Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                      padding: '12px 0',
                      borderTop: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                      margin: '12px 0',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Headcount</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {office.employeeCount ? office.employeeCount.toLocaleString() : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Geofence</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#5728B2' }}>
                        {geofenceRadius === undefined ? '—' : `${geofenceRadius}m`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Coordinates</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginTop: 3 }}>
                        {office.latitude !== undefined && office.longitude !== undefined
                          ? `${Number(office.latitude).toFixed(4)}, ${Number(office.longitude).toFixed(4)}`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <Link
                    href={`/offices/details?id=${office.id}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#5728B2',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    View Gates & Access <ChevronRight size={14} />
                  </Link>
                  <Link
                    href={`/offices/geofences?id=${office.id}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Geofence Details <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
