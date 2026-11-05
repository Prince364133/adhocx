'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Search,
  ArrowRight,
  PhoneCall,
  Volume2,
} from 'lucide-react';
import { mockSafetyIncidents, mockSafetyReportsStats } from '../../lib/mock/corporateMockData';
import MetricCard from '../../components/common/MetricCard';

export default function SafetyOverviewPage() {
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIncidents = mockSafetyIncidents.filter((inc) => {
    const matchesSearch =
      inc.incidentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || inc.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Safety & Incident Management Overview
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            24x7 Emergency Response Center, panic alerts, telemetry exceptions and resolution audit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              padding: '6px 12px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Radio size={12} /> 1 Active SOS Alert Under Investigation
          </span>
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
          label="Total Incidents (Month)"
          value={mockSafetyReportsStats.totalIncidentsMonth.toString()}
          delta="11 Resolved (78.5%)"
          deltaType="positive"
          icon={<ShieldAlert size={20} />}
          category="primary"
        />
        <MetricCard
          label="Avg First Response SLA"
          value="1.8 min"
          delta="Goal: < 3.0 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="success"
        />
        <MetricCard
          label="Active SOS Panic Triggers"
          value="1 Active"
          delta="Response team on line"
          deltaType="negative"
          icon={<PhoneCall size={20} />}
          category="danger"
        />
        <MetricCard
          label="Telemetry Deviations"
          value="6 Flagged"
          delta="Speed & Corridor Buffers"
          deltaType="warning"
          icon={<AlertTriangle size={20} />}
          category="warning"
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
            placeholder="Search by incident no, employee, cab or title..."
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
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
            }}
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
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
                <th style={{ padding: '12px 16px' }}>Incident No</th>
                <th style={{ padding: '12px 16px' }}>Severity</th>
                <th style={{ padding: '12px 16px' }}>Issue & Category</th>
                <th style={{ padding: '12px 16px' }}>Employee & Driver</th>
                <th style={{ padding: '12px 16px' }}>Cab Plate</th>
                <th style={{ padding: '12px 16px' }}>Reported At</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => {
                const isCritical = inc.severity === 'Critical';
                return (
                  <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          backgroundColor: '#F1F5F9',
                          borderRadius: 4,
                          fontSize: 12,
                          fontFamily: 'monospace',
                        }}
                      >
                        {inc.incidentNumber}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor:
                            inc.severity === 'Critical'
                              ? '#FEE2E2'
                              : inc.severity === 'High'
                              ? '#FFEDD5'
                              : inc.severity === 'Moderate'
                              ? '#FEF3C7'
                              : '#F1F5F9',
                          color:
                            inc.severity === 'Critical'
                              ? '#DC2626'
                              : inc.severity === 'High'
                              ? '#C2410C'
                              : inc.severity === 'Moderate'
                              ? '#B45309'
                              : 'var(--text-secondary)',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {inc.title}
                        {inc.audioRecordingAvailable && (
                          <span title="Audio Recording Available" style={{ color: '#DC2626' }}>
                            <Volume2 size={13} />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Type: {inc.incidentType} • {inc.office}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inc.employeeName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Driver: {inc.driverName}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {inc.vehicleNumber}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {inc.reportedAt}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor:
                            inc.status === 'Resolved'
                              ? '#DCFCE7'
                              : inc.status === 'Investigating'
                              ? '#FEF3C7'
                              : '#FEE2E2',
                          color:
                            inc.status === 'Resolved'
                              ? '#15803D'
                              : inc.status === 'Investigating'
                              ? '#B45309'
                              : '#DC2626',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href="/safety/incidents/details"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isCritical ? '#DC2626' : 'var(--corporate-blue)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        Dossier <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

