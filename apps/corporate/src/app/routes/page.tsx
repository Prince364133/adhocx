'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Navigation,
  MapPin,
  Clock,
  Users,
  Car,
  Plus,
  Search,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { routesApi } from '../../lib/api/corporate';
import type { CorporateRoute } from '../../lib/api/types';
import MetricCard from '../../components/common/MetricCard';

export default function RoutePlanningMasterPage() {
  const [routes, setRoutes] = useState<CorporateRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    setLoading(true);
    routesApi
      .list()
      .then((data) => {
        setRoutes(data);
      })
      .catch((err) => {
        console.warn('Failed to load routes:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filteredRoutes = routes.filter((r) => {
    const q = searchTerm.toLowerCase();
    const code = (r.routeCode || '').toLowerCase();
    const matchesSearch = code.includes(q);
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeRoutesCount = routes.filter((r) => r.status === 'IN_PROGRESS').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Title and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Route Planning Master
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Design commuter corridors, configure automated multi-stop sequences, and optimize cab capacities
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => alert('Triggering autonomous AI route clustering solver...')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#5728B2',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} /> AI Route Clustering
          </button>
          <button
            type="button"
            onClick={() => alert('Create Route: Connects to POST /corporate/routing/generate')}
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
            <Plus size={16} /> Create Route
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
          label="Total Corridors"
          value={`${routes.length} Routes`}
          delta="Configured Corridors"
          deltaType="positive"
          icon={<Navigation size={20} />}
          category="primary"
        />
        <MetricCard
          label="Active In-Transit"
          value={`${activeRoutesCount} Live`}
          delta="Dispatched Fleet"
          deltaType="positive"
          icon={<Users size={20} />}
          category="success"
        />
        <MetricCard
          label="Average Stops / Route"
          value="4.5 Stops"
          delta="Multi-stop Pooling"
          deltaType="neutral"
          icon={<Clock size={20} />}
          category="info"
        />
        <MetricCard
          label="Fleet Cabs Deployed"
          value={`${routes.length} Cabs`}
          delta="Demand Fully Served"
          deltaType="positive"
          icon={<Car size={20} />}
          category="primary"
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by route code or corridor..."
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
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PLANNED">Planned</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Routes Master Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading routes master list...
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No routes found. Generate or assign routes from published rosters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Route Code</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Distance</th>
                  <th style={{ padding: '12px 16px' }}>Stops</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Cab & Driver</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((r) => {
                  const distKm = r.totalDistanceMeters ? (r.totalDistanceMeters / 1000).toFixed(1) : '15.2';
                  const isInProgress = r.status === 'IN_PROGRESS';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {r.routeCode}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor: isInProgress ? '#DCFCE7' : '#EFF6FF',
                            color: isInProgress ? '#15803D' : '#5728B2',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {distKm} km
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.stops?.length || 4} Stops
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.vehicle?.licensePlate || 'Fleet Cab'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Driver: {r.driver?.name || 'Assigned Driver'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <Link
                          href={`/routes/details?id=${r.id}`}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: '1px solid var(--border-strong)',
                            backgroundColor: 'var(--bg-surface)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#5728B2',
                            textDecoration: 'none',
                          }}
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
