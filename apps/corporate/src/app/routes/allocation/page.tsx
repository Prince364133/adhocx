'use client';

import React, { useState } from 'react';
import {
  Truck,
  Car,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  BatteryCharging,
  Star,
  Search,
  Filter,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { mockFleetAllocation } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';

export default function FleetDriverAllocationPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredFleet = mockFleetAllocation.filter((item) => {
    const matchesSearch =
      item.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase());
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
            <Plus size={16} /> Request Backup Cab
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
          value="126 Cabs"
          delta="100% Routes Covered"
          deltaType="positive"
          icon={<Car size={20} />}
          category="primary"
        />
        <MetricCard
          label="Verified Drivers On-Duty"
          value="126 Drivers"
          delta="Avg Rating: 4.82 ★"
          deltaType="positive"
          icon={<UserCheck size={20} />}
          category="success"
        />
        <MetricCard
          label="Standby Reserve Cabs"
          value="6 Cabs"
          delta="Ready for Immediate Dispatch"
          deltaType="neutral"
          icon={<Truck size={20} />}
          category="info"
        />
        <MetricCard
          label="EV Fleet Share"
          value="35% Electric"
          delta="44 Zero-Emission Cabs"
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
            placeholder="Search by cab number, driver or vehicle model..."
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
            <option value="All">All Allocation Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="Available">Available / Standby</option>
          </select>
        </div>
      </div>

      {/* Fleet Allocation Table */}
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
                <th style={{ padding: '12px 16px' }}>Vehicle Plate</th>
                <th style={{ padding: '12px 16px' }}>Vehicle Model</th>
                <th style={{ padding: '12px 16px' }}>Assigned Driver</th>
                <th style={{ padding: '12px 16px' }}>Assigned Route</th>
                <th style={{ padding: '12px 16px' }}>Compliance & PUC</th>
                <th style={{ padding: '12px 16px' }}>Fuel / Battery</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
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
                        color: 'var(--corporate-blue)',
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
                      <Star size={12} fill="#D97706" /> {item.rating} rating
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: item.routeCode === 'Unassigned' ? '#F1F5F9' : '#EFF6FF',
                        color: item.routeCode === 'Unassigned' ? 'var(--text-muted)' : 'var(--corporate-blue)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {item.routeCode}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {item.complianceStatus.includes('Verified') ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> {item.complianceStatus}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
                        <AlertTriangle size={13} /> {item.complianceStatus}
                      </span>
                    )}
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
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--border-color)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--corporate-blue)',
                        cursor: 'pointer',
                      }}
                    >
                      Re-assign
                    </button>
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

