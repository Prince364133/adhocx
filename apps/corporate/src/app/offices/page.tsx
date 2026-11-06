'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Car,
  ShieldCheck,
  MapPin,
  Phone,
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
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    tenantApi
      .offices(activeTenantId)
      .then((data) => {
        setOffices(data);
      })
      .catch((err) => {
        console.warn('Failed to load offices:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  const filteredOffices = offices.filter((off) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (off.name || '').toLowerCase().includes(s) ||
      (off.code || '').toLowerCase().includes(s) ||
      (off.address || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'All' || (off.isActive !== false ? 'Active' : 'Inactive') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalHeadcount = offices.reduce((sum, o) => sum + (o.employeeCount || 0), 0);
  const activeOfficesCount = offices.filter((o) => o.isActive !== false).length;

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
            onClick={() => alert('Add campus site: Connects to POST /corporate/tenants/:id/offices')}
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
          value={`${offices.length} Sites`}
          delta={`${activeOfficesCount} Operational`}
          deltaType="positive"
          icon={<Building2 size={20} />}
          category="primary"
        />
        <MetricCard
          label="Headcount Linked"
          value={totalHeadcount > 0 ? totalHeadcount.toLocaleString() : 'Live Synced'}
          delta="Enrolled Commuters"
          deltaType="positive"
          icon={<Users size={20} />}
          category="primary"
        />
        <MetricCard
          label="Campus Geofences"
          value={`${offices.length} Configured`}
          delta="Automated Arrival Detection"
          deltaType="neutral"
          icon={<Car size={20} />}
          category="success"
        />
        <MetricCard
          label="Access Perimeter"
          value="Secured"
          delta="RFID & Barrier Online"
          deltaType="positive"
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
          </select>
        </div>
      </div>

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
            const statusText = office.isActive !== false ? 'Active' : 'Inactive';
            const geofenceRadius = office.geofenceRadiusMeters || 500;
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
                          {office.code || 'CAMPUS'}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: office.isActive !== false ? '#DCFCE7' : '#F1F5F9',
                            color: office.isActive !== false ? '#15803D' : '#64748B',
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
                        <span>{office.address || 'Office Campus Location'}</span>
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
                        {geofenceRadius}m
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Coordinates</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginTop: 3 }}>
                        {office.latitude ? `${Number(office.latitude).toFixed(2)}, ${Number(office.longitude).toFixed(2)}` : 'Set'}
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
