'use client';

import React, { useState } from 'react';
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

interface RosterCalendarRow {
  empId: string;
  name: string;
  avatar: string;
  department: string;
  schedule: Array<{
    day: string;
    shift: 'Day' | 'Night' | 'Evening' | 'Training' | 'Off';
  }>;
}

const MOCK_ROSTER_MATRIX: RosterCalendarRow[] = [
  {
    empId: 'EMP02467',
    name: 'Priya Sharma',
    avatar: 'PS',
    department: 'Product',
    schedule: [
      { day: 'Mon 07', shift: 'Day' },
      { day: 'Tue 08', shift: 'Day' },
      { day: 'Wed 09', shift: 'Day' },
      { day: 'Thu 10', shift: 'Day' },
      { day: 'Fri 11', shift: 'Day' },
      { day: 'Sat 12', shift: 'Off' },
      { day: 'Sun 13', shift: 'Off' },
    ],
  },
  {
    empId: 'EMP02911',
    name: 'Rohit Singh',
    avatar: 'RS',
    department: 'Operations',
    schedule: [
      { day: 'Mon 07', shift: 'Night' },
      { day: 'Tue 08', shift: 'Night' },
      { day: 'Wed 09', shift: 'Night' },
      { day: 'Thu 10', shift: 'Night' },
      { day: 'Fri 11', shift: 'Night' },
      { day: 'Sat 12', shift: 'Off' },
      { day: 'Sun 13', shift: 'Off' },
    ],
  },
  {
    empId: 'EMP03124',
    name: 'Neha Verma',
    avatar: 'NV',
    department: 'Design',
    schedule: [
      { day: 'Mon 07', shift: 'Evening' },
      { day: 'Tue 08', shift: 'Evening' },
      { day: 'Wed 09', shift: 'Evening' },
      { day: 'Thu 10', shift: 'Evening' },
      { day: 'Fri 11', shift: 'Evening' },
      { day: 'Sat 12', shift: 'Off' },
      { day: 'Sun 13', shift: 'Off' },
    ],
  },
  {
    empId: 'EMP01893',
    name: 'Amit Kumar',
    avatar: 'AK',
    department: 'Engineering',
    schedule: [
      { day: 'Mon 07', shift: 'Day' },
      { day: 'Tue 08', shift: 'Day' },
      { day: 'Wed 09', shift: 'Day' },
      { day: 'Thu 10', shift: 'Day' },
      { day: 'Fri 11', shift: 'Training' },
      { day: 'Sat 12', shift: 'Off' },
      { day: 'Sun 13', shift: 'Off' },
    ],
  },
  {
    empId: 'EMP03376',
    name: 'Anjali Rao',
    avatar: 'AR',
    department: 'HR',
    schedule: [
      { day: 'Mon 07', shift: 'Day' },
      { day: 'Tue 08', shift: 'Day' },
      { day: 'Wed 09', shift: 'Day' },
      { day: 'Thu 10', shift: 'Day' },
      { day: 'Fri 11', shift: 'Day' },
      { day: 'Sat 12', shift: 'Off' },
      { day: 'Sun 13', shift: 'Off' },
    ],
  },
];

export default function RosterCalendarPage() {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [searchQuery, setSearchQuery] = useState('');

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'Day':
        return { bg: '#EFF6FF', color: '#1167EE', border: '#BFDBFE' };
      case 'Night':
        return { bg: '#F3E8FF', color: '#7C3AED', border: '#D8B4FE' };
      case 'Evening':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Training':
        return { bg: '#CCFBF1', color: '#0F766E', border: '#99F6E4' };
      case 'Off':
      default:
        return { bg: '#F1F5F9', color: '#94A3B8', border: '#E2E8F0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & View Switcher Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Roster Calendar
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Create and manage employee rosters by shift, office and department
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', backgroundColor: '#FFFFFF', padding: '3px', borderRadius: 8, border: '1px solid #CBD5E1' }}>
          <button
            onClick={() => setViewMode('day')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: viewMode === 'day' ? '#1167EE' : 'transparent',
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
              backgroundColor: viewMode === 'week' ? '#1167EE' : 'transparent',
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
              backgroundColor: viewMode === 'month' ? '#1167EE' : 'transparent',
              color: viewMode === 'month' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
            }}
          >
            Month
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Month Navigation */}
      <div className="surface-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, padding: '4px 10px' }}>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
              <ChevronLeft size={14} color="#64748B" />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Dec 2026</span>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
              <ChevronRight size={14} color="#64748B" />
            </button>
          </div>

          <select
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
          >
            <option value="All Offices">All Offices</option>
            <option value="HiTEC City">HiTEC City</option>
            <option value="Kondapur">Kondapur</option>
            <option value="Gachibowli">Gachibowli</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12, fontWeight: 600, color: '#475569', outline: 'none' }}
          >
            <option value="All Departments">All Departments</option>
            <option value="Product">Product</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        {/* Search box */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, shift, roster..."
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 30,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              fontSize: 12,
              outline: 'none',
              backgroundColor: '#F8FAFC',
            }}
          />
        </div>
      </div>

      {/* Roster Calendar Matrix */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Employees (2,846)</th>
                <th style={{ textAlign: 'center' }}>Mon 07</th>
                <th style={{ textAlign: 'center' }}>Tue 08</th>
                <th style={{ textAlign: 'center' }}>Wed 09</th>
                <th style={{ textAlign: 'center' }}>Thu 10</th>
                <th style={{ textAlign: 'center' }}>Fri 11</th>
                <th style={{ textAlign: 'center' }}>Sat 12</th>
                <th style={{ textAlign: 'center' }}>Sun 13</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ROSTER_MATRIX.map((row) => (
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
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{row.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {row.empId} · {row.department}
                        </div>
                      </div>
                    </div>
                  </td>

                  {row.schedule.map((slot) => {
                    const badge = getShiftBadge(slot.shift);
                    return (
                      <td key={slot.day} style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: 54,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {slot.shift}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

