'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Navigation,
  MapPin,
  Clock,
  Users,
  Car,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { mockRoutes } from '../../lib/mock/corporateMockData';
import MetricCard from '../../components/common/MetricCard';

export default function RoutePlanningMasterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredRoutes = mockRoutes.filter((r) => {
    const matchesSearch =
      r.routeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.origin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: 'var(--corporate-blue)',
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
          label="Active Corridors"
          value="84 Routes"
          delta="Across 3 Tech Parks"
          deltaType="positive"
          icon={<Navigation size={20} />}
          category="primary"
        />
        <MetricCard
          label="Avg Seat Utilization"
          value="92.0%"
          delta="+3.8 pp vs last week"
          deltaType="positive"
          icon={<Users size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg Route Distance"
          value="12.4 km"
          delta="32 min est. commute"
          deltaType="neutral"
          icon={<Clock size={20} />}
          category="info"
        />
        <MetricCard
          label="Assigned Fleet Cabs"
          value="126 Cabs"
          delta="0 Unserved Trips"
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
          backgroundColor: '#FFFFFF',
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
            placeholder="Search by route code, corridor name or origin..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: '#F8FAFC',
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
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
            }}
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* Routes Master Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Route Code</th>
                <th style={{ padding: '12px 16px' }}>Corridor & Destination</th>
                <th style={{ padding: '12px 16px' }}>Shift</th>
                <th style={{ padding: '12px 16px' }}>Distance / Time</th>
                <th style={{ padding: '12px 16px' }}>Stops</th>
                <th style={{ padding: '12px 16px' }}>Assigned Cab & Driver</th>
                <th style={{ padding: '12px 16px' }}>Capacity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => (
                <tr key={route.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#EFF6FF',
                        color: 'var(--corporate-blue)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                    >
                      {route.routeCode}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{route.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Dest: {route.destinationOffice}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {route.shiftName}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>{route.totalDistanceKm} km</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>~{route.estDurationMin} min</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {route.stopsCount} Stops
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{route.assignedVehicle}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Driver: {route.assignedDriver}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{route.capacityUtilizationPct}%</span>
                    </div>
                    <div style={{ height: 4, width: 60, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${route.capacityUtilizationPct}%`,
                          backgroundColor: route.capacityUtilizationPct >= 90 ? '#16A34A' : 'var(--corporate-blue)',
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor:
                          route.status === 'In Progress'
                            ? '#EFF6FF'
                            : route.status === 'Scheduled'
                            ? '#F1F5F9'
                            : '#FEF3C7',
                        color:
                          route.status === 'In Progress'
                            ? 'var(--corporate-blue)'
                            : route.status === 'Scheduled'
                            ? 'var(--text-secondary)'
                            : '#B45309',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {route.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href="/routes/details"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--corporate-blue)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      View Stops <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

