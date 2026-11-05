'use client';

import React, { useState } from 'react';
import {
  CalendarClock,
  Clock,
  Users,
  Repeat,
  Plus,
  Settings,
  Edit2,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';

interface ShiftTemplateItem {
  id: string;
  name: string;
  iconColor: string;
  type: 'Fixed' | 'Rotating';
  loginTime: string;
  logoutTime: string;
  duration: string;
  assignedEmployees: number;
  status: 'Active' | 'Inactive';
}

const MOCK_SHIFTS: ShiftTemplateItem[] = [
  { id: 'S1', name: 'General (Day)', iconColor: '#3B82F6', type: 'Fixed', loginTime: '09:00 AM', logoutTime: '06:00 PM', duration: '9 hr', assignedEmployees: 1246, status: 'Active' },
  { id: 'S2', name: 'Shift A', iconColor: '#F59E0B', type: 'Fixed', loginTime: '02:00 PM', logoutTime: '11:00 PM', duration: '9 hr', assignedEmployees: 684, status: 'Active' },
  { id: 'S3', name: 'Night', iconColor: '#8B5CF6', type: 'Fixed', loginTime: '10:00 PM', logoutTime: '07:00 AM', duration: '9 hr', assignedEmployees: 398, status: 'Active' },
  { id: 'S4', name: 'Rotating A', iconColor: '#10B981', type: 'Rotating', loginTime: 'Week-based', logoutTime: 'Week-based', duration: '9 hr', assignedEmployees: 346, status: 'Active' },
  { id: 'S5', name: 'Early Morning (General)', iconColor: '#06B6D4', type: 'Fixed', loginTime: '07:00 AM', logoutTime: '04:00 PM', duration: '9 hr', assignedEmployees: 172, status: 'Active' },
];

export default function ShiftManagementPage() {
  const [shifts, setShifts] = useState(MOCK_SHIFTS);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Buttons Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Shift Management
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Create and manage shift templates, timings and policies
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert('Shift Policy Configuration')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Settings size={15} />
            <span>Shift Policies</span>
          </button>

          <button
            onClick={() => alert('Create New Shift Dialog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
            }}
          >
            <Plus size={16} />
            <span>Create Shift</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div
        className="surface-card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarClock size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>12</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Shift Templates</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>8</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Active Shifts</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>2,846</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Assigned Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Repeat size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>3</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Shift Patterns (Fixed/Rotating)</div>
          </div>
        </div>
      </div>

      {/* Shifts Data Table */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Shift Name</th>
                <th>Type</th>
                <th>Login Time</th>
                <th>Logout Time</th>
                <th>Duration</th>
                <th>Employees</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.iconColor }} />
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>{s.type}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{s.loginTime}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{s.logoutTime}</td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>{s.duration}</td>
                  <td style={{ fontWeight: 700, color: '#5728B2' }}>{s.assignedEmployees.toLocaleString()}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                        border: '1px solid #86EFAC',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => alert(`Edit ${s.name}`)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={13} color="#475569" />
                      </button>
                      <button
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <MoreVertical size={13} color="#64748B" />
                      </button>
                    </div>
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

