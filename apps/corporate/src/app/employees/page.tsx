'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, Users } from 'lucide-react';
import { employeeApi } from '../../lib/api/corporate';
import type { Employee } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

const PAGE_SIZE = 20;

export default function EmployeeDirectoryPage() {
  const { tenantId } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;

    if (!tenantId) {
      setEmployees([]);
      setTotalEmployees(0);
      setTotalPages(0);
      setError('No corporate tenant is associated with this session.');
      setIsLoading(false);
      return () => {
        isCurrentRequest = false;
      };
    }

    setIsLoading(true);
    setError(null);

    employeeApi
      .list(tenantId, {
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
      })
      .then((response) => {
        if (!isCurrentRequest) return;
        setEmployees(response.items);
        setTotalEmployees(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      })
      .catch((err: unknown) => {
        if (!isCurrentRequest) return;
        setEmployees([]);
        setTotalEmployees(0);
        setTotalPages(0);
        setError(err instanceof Error ? err.message : 'Unable to load employee records.');
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [tenantId, currentPage, searchQuery, refreshKey]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const firstEmployee = totalEmployees === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastEmployee = Math.min(currentPage * PAGE_SIZE, totalEmployees);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0F172A)', letterSpacing: '-0.02em' }}>
            Employee Directory
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
            View employee contact details and home locations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
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
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Sync</span>
          </button>

        </div>
      </div>

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
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by employee ID, name or phone..."
            aria-label="Search employees"
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
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {isLoading ? 'Loading employees...' : `${totalEmployees.toLocaleString()} employees`}
        </span>
      </div>

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
          <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={20} className="spin" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading employee records...</span>
          </div>
        ) : error ? (
          <div role="alert" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Unable to load employees
            </h2>
            <p style={{ fontSize: '13px', marginBottom: 16 }}>{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              style={{
                backgroundColor: '#5728B2',
                color: '#FFFFFF',
                border: 0,
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <Users size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              No employees found
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {searchQuery.trim()
                ? 'No employees matched your search.'
                : 'There are no employees registered for this corporate tenant yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Phone Number</th>
                    <th>Home Location</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => {
                    const homeLocation =
                      employee.locations?.find((location) => location.isDefault) ?? employee.locations?.[0];

                    return (
                      <tr key={employee.id}>
                        <td style={{ fontWeight: 700 }}>{employee.employeeCode || 'Not provided'}</td>
                        <td>{employee.fullName || 'Not provided'}</td>
                        <td>{employee.phoneNumber?.trim() || 'Not provided'}</td>
                        <td>{homeLocation?.addressText?.trim() || 'Not provided'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing {firstEmployee}-{lastEmployee} of {totalEmployees.toLocaleString()} employees
              </span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage <= 1}
                    style={{ padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: currentPage <= 1 ? 'default' : 'pointer' }}
                  >
                    Previous
                  </button>
                  <span aria-live="polite" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage >= totalPages}
                    style={{ padding: '6px 10px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: currentPage >= totalPages ? 'default' : 'pointer' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
