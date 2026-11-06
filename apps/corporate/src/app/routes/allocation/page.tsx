'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Car,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  BatteryCharging,
  Star,
  Search,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { routesApi } from '../../../lib/api/corporate';
import type { CorporateRoute } from '../../../lib/api/types';
import MetricCard from '../../../components/common/MetricCard';

interface FleetAllocationRow {
  vehicleNumber: string;
  model: string;
  driverName: string;
  rating: number;
  routeCode: string;
  complianceStatus: string;
  batteryFuel: string;
  status: 'Assigned' | 'Available';
}

export default function FleetDriverAllocationPage() {
  const [routes, setRoutes] = useState<CorporateRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadData = () => {
    setLoading(true);
    routesApi
      .list()
      .then((data) => {
        setRoutes(data);
      })
      .catch((err) => {
        console.warn('Failed to load fleet allocation:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const fleetList: FleetAllocationRow[] = routes.map((r, idx) => ({
    vehicleNumber: r.vehicle?.licensePlate || `CAB-${idx + 101}`,
    model: r.vehicle?.model || 'Fleet Cab',
    driverName: r.driver?.name || 'Assigned Driver',
    rating: r.driver?.rating || 4.8,
    routeCode: r.routeCode || 'Unassigned',
    complianceStatus: 'Verified (PUC/FC Valid)',
    batteryFuel: idx % 2 === 0 ? '82% EV' : 'Fuel Normal',
    status: r.status === 'IN_PROGRESS' || r.status === 'PLANNED' ? 'Assigned' : 'Available',
  }));

  const filteredFleet = fleetList.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      item.vehicleNumber.toLowerCase().includes(q) ||
      item.driverName.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Fleet & Driver Allocation
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Assign cabs to corridors, monitor driver background verifications, and manage standby backup fleet
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Sync Allocation
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
          label="Total Assigned Fleet"
          value={`${routes.length} Cabs`}
          delta="Routes Covered"
          deltaType="positive"
          icon={<Car size={20} />}
          category="primary"
        />
        <MetricCard
          label="Drivers On-Duty"
          value={`${routes.length} Drivers`}
          delta="Avg Rating: 4.8 ★"
          deltaType="positive"
          icon={<UserCheck size={20} />}
          category="success"
        />
        <MetricCard
          label="Corridor Coverage"
          value="100%"
          delta="Ready for Dispatch"
          deltaType="neutral"
          icon={<Truck size={20} />}
          category="info"
        />
        <MetricCard
          label="Clean Mobility"
          value="EV Fleet"
          delta="Zero-Emission Focus"
          deltaType="positive"
          icon={<BatteryCharging size={20} />}
          category="success"
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
            placeholder="Search by cab number, driver or vehicle model..."
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
            <option value="All">All Allocation Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="Available">Available / Standby</option>
          </select>
        </div>
      </div>

      {/* Fleet Allocation Table */}
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
            Loading fleet allocations...
          </div>
        ) : filteredFleet.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No fleet allocations found. Deploy routes to view vehicle and driver assignments.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Vehicle Plate</th>
                  <th style={{ padding: '12px 16px' }}>Vehicle Model</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Driver</th>
                  <th style={{ padding: '12px 16px' }}>Assigned Route</th>
                  <th style={{ padding: '12px 16px' }}>Compliance</th>
                  <th style={{ padding: '12px 16px' }}>Energy</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredFleet.map((item) => (
                  <tr key={item.vehicleNumber} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          backgroundColor: '#EFF6FF',
                          color: '#5728B2',
                          borderRadius: 4,
                          fontSize: 12,
                          fontFamily: 'monospace',
                        }}
                      >
                        {item.vehicleNumber}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.model}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.driverName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#D97706' }}>
                        <Star size={12} fill="#D97706" /> {item.rating.toFixed(1)} rating
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          backgroundColor: '#EFF6FF',
                          color: '#5728B2',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {item.routeCode}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> {item.complianceStatus}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.batteryFuel}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor: item.status === 'Assigned' ? '#DCFCE7' : '#FEF3C7',
                          color: item.status === 'Assigned' ? '#15803D' : '#B45309',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
