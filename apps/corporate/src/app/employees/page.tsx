'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  UserX,
  UploadCloud,
  Plus,
  Eye,
  Edit2,
  Search,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { employeeApi, tenantApi } from '../../lib/api/corporate';
import type { Office } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

interface EmployeeItem {
  id: string;
  code: string;
  name: string;
  avatarInitials: string;
  department: string;
  office: string;
  eligibility: 'Eligible' | 'Not Eligible';
  status: 'Active' | 'On Leave' | 'Inactive';
}

export default function EmployeeDirectoryPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedEligibility, setSelectedEligibility] = useState('All Eligibility');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadLiveEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, offList] = await Promise.all([
        employeeApi.list(activeTenantId, {
          page: currentPage,
          limit: 100,
          search: searchQuery.trim() || undefined,
        }),
        tenantApi.offices(activeTenantId).catch(() => []),
      ]);

      setOffices(offList);

      const items = res?.items || (res as any)?.data || [];
      if (Array.isArray(items)) {
        const liveItems: EmployeeItem[] = items.map((emp: any) => {
          const initials = emp.fullName
            ? emp.fullName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'EM';

          return {
            id: emp.id,
            code: emp.employeeCode || `EMP-${emp.id.slice(0, 6)}`,
            name: emp.fullName || 'Unnamed Employee',
            avatarInitials: initials,
            department: (emp.department as any)?.name || emp.department || 'Operations',
            office: (emp.office as any)?.name || 'Main Office',
            eligibility: emp.isActive !== false ? 'Eligible' : 'Not Eligible',
            status: emp.isActive !== false ? 'Active' : 'Inactive',
          };
        });

        setEmployees(liveItems);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.warn('Live employee directory fetch error:', err);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, currentPage, searchQuery]);

  useEffect(() => {
    loadLiveEmployees();
  }, [loadLiveEmployees]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesOffice = selectedOffice === 'All Offices' || emp.office.toLowerCase().includes(selectedOffice.toLowerCase());
    const matchesDept = selectedDept === 'All Departments' || emp.department.toLowerCase().includes(selectedDept.toLowerCase());
    const matchesElig = selectedEligibility === 'All Eligibility' || emp.eligibility === selectedEligibility;
    const matchesStatus = selectedStatus === 'All Status' || emp.status === selectedStatus;
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesOffice && matchesDept && matchesElig && matchesStatus && matchesSearch;
  });

  const totalEmployees = employees.length;
  const eligibleCount = employees.filter((e) => e.eligibility === 'Eligible').length;
  const notEligibleCount = employees.filter((e) => e.eligibility === 'Not Eligible').length;
  const onLeaveCount = employees.filter((e) => e.status === 'On Leave').length;
  const inactiveCount = employees.filter((e) => e.status === 'Inactive').length;

  const handleReset = () => {
    setSelectedOffice('All Offices');
    setSelectedDept('All Departments');
    setSelectedEligibility('All Eligibility');
    setSelectedStatus('All Status');
    setSearchQuery('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Buttons Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0F172A)', letterSpacing: '-0.02em' }}>
            Employee Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
            View, search and manage corporate commuter profiles and transport eligibility
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadLiveEmployees()}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-secondary, #475569)',
              border: '1px solid var(--border-subtle, #CBD5E1)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Sync</span>
          </button>

          <Link
            href="/employees/import"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#5728B2',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <UploadCloud size={15} />
            <span>Import Employees</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="surface-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, #E2E8F0)',
        }}
      >
        {/* Office select */}
        <select
          value={selectedOffice}
          onChange={(e) => setSelectedOffice(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none' }}
        >
          <option value="All Offices">All Offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.name}>{o.name}</option>
          ))}
        </select>

        {/* Department select */}
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none' }}
        >
          <option value="All Departments">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Product">Product</option>
          <option value="Design">Design</option>
          <option value="Operations">Operations</option>
          <option value="HR">HR</option>
        </select>

        {/* Eligibility select */}
        <select
          value={selectedEligibility}
          onChange={(e) => setSelectedEligibility(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none' }}
        >
          <option value="All Eligibility">All Eligibility</option>
          <option value="Eligible">Eligible</option>
          <option value="Not Eligible">Not Eligible</option>
        </select>

        {/* Status select */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', outline: 'none' }}
        >
          <option value="All Status">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </select>

        <button
          onClick={handleReset}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 6,
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-surface-muted)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>

        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code or department..."
            style={{
              width: '100%',
              height: 36,
              paddingLeft: 32,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid var(--border-strong)',
              fontSize: 12,
              outline: 'none',
              backgroundColor: 'var(--bg-surface-muted)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Metric Strip */}
      <div
        className="surface-card"
        style={{
          padding: '14px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, #E2E8F0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalEmployees}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{eligibleCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Transport Eligible</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{notEligibleCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Not Eligible</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{onLeaveCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>On Leave</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserX size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{inactiveCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Inactive</div>
          </div>
        </div>
      </div>

      {/* Employee Data Table */}
      <div
        className="surface-card"
        style={{
          padding: '20px',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, #E2E8F0)',
        }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={20} className="spin" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading employee records from live database...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <Users size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No employees found</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 }}>
              {searchQuery ? 'No employees matched your search query.' : 'There are no employees registered for this corporate tenant yet.'}
            </p>
            <Link
              href="/employees/import"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#5728B2',
                color: '#FFFFFF',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <UploadCloud size={15} />
              <span>Import Employees Now</span>
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ width: 36, padding: '10px 12px' }}>
                    <input type="checkbox" />
                  </th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Employee ID</th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Employee Name</th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Department</th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Office</th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Eligibility</th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px' }}>
                      <input type="checkbox" />
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>{emp.code}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
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
                          {emp.avatarInitials}
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.department}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.office}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: emp.eligibility === 'Eligible' ? '#DCFCE7' : '#FEF3C7',
                          color: emp.eligibility === 'Eligible' ? '#16A34A' : '#D97706',
                          border: `1px solid ${emp.eligibility === 'Eligible' ? '#86EFAC' : '#FCD34D'}`,
                        }}
                      >
                        {emp.eligibility}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            emp.status === 'Active'
                              ? '#DCFCE7'
                              : emp.status === 'On Leave'
                              ? '#F3E8FF'
                              : '#F1F5F9',
                          color:
                            emp.status === 'Active'
                              ? '#16A34A'
                              : emp.status === 'On Leave'
                              ? '#7C3AED'
                              : '#64748B',
                        }}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <Link
                          href={`/employees/profile?id=${emp.id}`}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            border: '1px solid var(--border-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                          }}
                        >
                          <Eye size={13} />
                        </Link>
                      </div>
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
