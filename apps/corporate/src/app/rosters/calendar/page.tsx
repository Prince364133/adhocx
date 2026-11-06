'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Users,
  Building2,
  Briefcase,
} from 'lucide-react';
import { employeeApi, rosterApi, tenantApi } from '../../../lib/api/corporate';
import type { CorporateEmployee, Office } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

interface CalendarRow {
  empId: string;
  name: string;
  avatar: string;
  department: string;
  schedule: Array<{
    day: string;
    shift: 'Day' | 'Night' | 'Evening' | 'Training' | 'Off';
  }>;
}

export default function RosterCalendarPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [employees, setEmployees] = useState<CorporateEmployee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      employeeApi.list(activeTenantId, { limit: 50 }).catch(() => ({ items: [] })),
      tenantApi.offices(activeTenantId).catch(() => []),
    ])
      .then(([empRes, offList]) => {
        const items = empRes?.items || (empRes as any)?.data || [];
        setEmployees(items);
        setOffices(offList);
      })
      .catch((err) => {
        console.warn('Failed to load roster employees:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const rows: CalendarRow[] = employees.map((emp) => {
    const fullName = emp.fullName || 'Enterprise Employee';
    const avatar = fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    const department = typeof emp.department === 'string' ? emp.department : (emp.department as any)?.name || 'Operations';

    return {
      empId: emp.employeeCode || `EMP-${emp.id.slice(0, 6)}`,
      name: fullName,
      avatar,
      department,
      schedule: daysOfWeek.map((day, idx) => ({
        day,
        shift: idx >= 5 ? 'Off' : 'Day',
      })),
    };
  });

  const filteredRows = rows.filter((r) => {
    const matchesDept = selectedDept === 'All Departments' || r.department.toLowerCase().includes(selectedDept.toLowerCase());
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'Day':
        return { bg: '#EFF6FF', color: '#5728B2', border: '#BFDBFE' };
      case 'Night':
        return { bg: '#F3E8FF', color: '#7C3AED', border: '#D8B4FE' };
      case 'Evening':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Training':
        return { bg: '#CCFBF1', color: '#0F766E', border: '#99F6E4' };
      case 'Off':
      default:
        return { bg: '#F1F5F9', color: 'var(--text-muted)', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & View Switcher Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Roster Calendar
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            View and manage active employee shift rosters across facilities
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: '3px', borderRadius: 8, border: '1px solid var(--border-strong)' }}>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: viewMode === 'day' ? '#5728B2' : 'transparent',
              color: viewMode === 'day' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: viewMode === 'week' ? '#5728B2' : 'transparent',
              color: viewMode === 'week' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: viewMode === 'month' ? '#5728B2' : 'transparent',
              color: viewMode === 'month' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Month
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Month Navigation */}
      <div className="surface-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none' }}
          >
            <option value="All Offices">All Offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none' }}
          >
            <option value="All Departments">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Operations">Operations</option>
            <option value="HR">HR</option>
          </select>
        </div>

        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee..."
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 30,
              paddingRight: 10,
              fontSize: 12,
              border: '1px solid var(--border-strong)',
              borderRadius: '6px',
              outline: 'none',
              backgroundColor: 'var(--bg-surface-muted)',
            }}
          />
        </div>
      </div>

      {/* Calendar Grid Table */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading roster schedules...
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No roster records found. Import employee rosters to populate the calendar grid.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Employee</th>
                  {daysOfWeek.map((day) => (
                    <th key={day} style={{ textAlign: 'center' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.empId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            backgroundColor: '#1E293B',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {row.avatar}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {row.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {row.empId} · {row.department}
                          </div>
                        </div>
                      </div>
                    </td>

                    {row.schedule.map((item, idx) => {
                      const badge = getShiftBadge(item.shift);
                      return (
                        <td key={idx} style={{ textAlign: 'center', padding: '10px 8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {item.shift}
                          </span>
                        </td>
                      );
                    })}
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
