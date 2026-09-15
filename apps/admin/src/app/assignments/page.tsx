'use client';

import React, { useState } from 'react';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sourced operational data
  const assignments = [
    {
      id: 'asg-701',
      requirementId: 'req-201',
      driverName: 'Rajesh Kumar',
      driverPhone: '+919876543210',
      vehiclePlate: 'DL-01-AB-1234',
      vehicleType: 'SEDAN',
      status: 'CONFIRMED',
      assignedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'asg-702',
      requirementId: 'req-201',
      driverName: 'Vikram Patel',
      driverPhone: '+919723456789',
      vehiclePlate: 'DL-04-DE-4433',
      vehicleType: 'SEDAN',
      status: 'CONFIRMED',
      assignedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    {
      id: 'asg-703',
      requirementId: 'req-202',
      driverName: 'Amit Singh',
      driverPhone: '+919811223344',
      vehiclePlate: 'HR-26-BC-5678',
      vehicleType: 'SUV',
      status: 'COMPLETED',
      assignedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ];

  const filtered = assignments.filter((asg) => {
    if (activeTab !== 'ALL' && asg.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        asg.id.toLowerCase().includes(q) ||
        asg.requirementId.toLowerCase().includes(q) ||
        asg.driverName.toLowerCase().includes(q) ||
        asg.vehiclePlate.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Driver Assignments & Dispatch Telemetry</h1>
        <p className="page-subtitle">
          Monitor requirement-to-driver dispatch assignments, accepted slots, and vehicle pairing.
        </p>
      </div>

      <div className="tabs">
        {['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search assignments by driver, vehicle plate, requirement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filtered.length}</strong> assignments
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Assignment ID</th>
              <th>Requirement ID</th>
              <th>Assigned Driver</th>
              <th>Vehicle & Type</th>
              <th>Status</th>
              <th>Assigned At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="🔄"
                    title="No assignments found"
                    description="No dispatch assignments match your selected status."
                  />
                </td>
              </tr>
            ) : (
              filtered.map((asg) => (
                <tr key={asg.id}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-600)' }}>
                      #{asg.id}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      #{asg.requirementId}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{asg.driverName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{asg.driverPhone}</div>
                  </td>
                  <td>
                    <div>{asg.vehiclePlate}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asg.vehicleType}</div>
                  </td>
                  <td>
                    <Badge status={asg.status} />
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(asg.assignedAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
