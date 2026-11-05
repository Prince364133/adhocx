'use client';

import React, { useState } from 'react';
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
import { mockOffices } from '../../lib/mock/corporateMockData';
import MetricCard from '../../components/common/MetricCard';

export default function OfficesDirectoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredOffices = mockOffices.filter((off) => {
    const matchesSearch =
      off.name.toLowerCase().includes(search.toLowerCase()) ||
      off.code.toLowerCase().includes(search.toLowerCase()) ||
      off.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || off.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'var(--corporate-blue)',
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
          value="3 Sites"
          delta="100% Operational"
          deltaType="positive"
          icon={<Building2 size={20} />}
          category="primary"
        />
        <MetricCard
          label="Total Headcount Covered"
          value="2,846"
          delta="+2.4% this month"
          deltaType="positive"
          icon={<Users size={20} />}
          category="primary"
        />
        <MetricCard
          label="Active Daily Fleet Cabs"
          value="126 Cabs"
          delta="Peak 08:00 - 10:00 AM"
          deltaType="neutral"
          icon={<Car size={20} />}
          category="success"
        />
        <MetricCard
          label="Secured Entry Gates"
          value="9 Gates"
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
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Campus Sites Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {filteredOffices.map((office) => (
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
                        color: 'var(--corporate-blue)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {office.code}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {office.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 4px 0' }}>
                    {office.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    <MapPin size={13} />
                    <span>{office.address}, {office.city} - {office.pincode}</span>
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
                    {office.headcount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily Cabs</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--corporate-blue)' }}>
                    {office.activeCabsDaily}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Security Gates</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>
                    {office.securityGatesCount} Gates
                  </div>
                </div>
              </div>

              {/* Facility Lead Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                <Phone size={13} style={{ color: 'var(--corporate-blue)' }} />
                <span>
                  <strong>Lead:</strong> {office.leadContact} ({office.leadPhone})
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <Link
                href="/offices/details"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--corporate-blue)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View Gates & Access <ChevronRight size={14} />
              </Link>
              <Link
                href="/offices/geofences"
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
                Geofence ({office.geofenceRadiusMeters}m) <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

