'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import type {
  CorporateEmployeeItem,
  CorporateTenantOption,
} from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';

const COMPANY_STORAGE_KEY = 'adhocx_ops_selected_tenant';

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '38px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '0 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: '5px',
  textTransform: 'uppercase',
};

function EmployeesDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId')?.trim() || '';

  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(urlTenantId);
  const [selectedTenant, setSelectedTenant] = useState<CorporateTenantOption | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  const [employees, setEmployees] = useState<CorporateEmployeeItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);

  // Create Employee Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    officeId: '',
    employeeCode: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: 'UNSPECIFIED' as 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED',
    department: '',
    homeAddress: '',
    landmark: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit Employee Modal
  const [editingEmployee, setEditingEmployee] = useState<CorporateEmployeeItem | null>(null);
  const [editForm, setEditForm] = useState({
    officeId: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: 'UNSPECIFIED' as 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED',
    department: '',
    homeAddress: '',
    landmark: '',
    isActive: true,
  });

  // Delete Employee Modal
  const [deletingEmployee, setDeletingEmployee] = useState<CorporateEmployeeItem | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Load tenants on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTenantsLoading(true);
      try {
        const res = await opsApi.getTenants({ page: 1, limit: 100 });
        const items = res?.items ?? [];
        if (cancelled) return;
        setTenants(items);

        let remembered = '';
        try {
          remembered = localStorage.getItem(COMPANY_STORAGE_KEY)?.trim() || '';
        } catch {}

        const initial =
          (urlTenantId && items.find((t) => t.id === urlTenantId)?.id) ||
          (remembered && items.find((t) => t.id === remembered)?.id) ||
          items[0]?.id ||
          '';

        setSelectedTenantId(initial);
        if (initial) {
          try {
            localStorage.setItem(COMPANY_STORAGE_KEY, initial);
          } catch {}
        }
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err?.message || 'Could not load corporate clients.');
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlTenantId]);

  // Load selected tenant details (for offices list)
  useEffect(() => {
    if (!selectedTenantId) {
      setSelectedTenant(null);
      return;
    }
    let cancelled = false;
    void opsApi
      .getTenant(selectedTenantId)
      .then((detail) => {
        if (cancelled) return;
        setSelectedTenant(detail);
        setCreateForm((prev) => ({
          ...prev,
          officeId: detail.offices?.some((o) => o.id === prev.officeId)
            ? prev.officeId
            : detail.offices?.[0]?.id || '',
        }));
      })
      .catch(() => {
        if (!cancelled) setSelectedTenant(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  const loadEmployees = useCallback(async () => {
    if (!selectedTenantId) {
      setEmployees([]);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await opsApi.getTenantEmployees(selectedTenantId, {
        search: search.trim() || undefined,
        officeId: officeFilter || undefined,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
        page,
        limit: 25,
      });
      setEmployees(res.items ?? []);
      setPagination(res.pagination ?? { total: 0, page: 1, limit: 25, totalPages: 1 });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not load employees.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, search, officeFilter, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEmployees();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadEmployees]);

  function handleChangeTenant(nextId: string) {
    setSelectedTenantId(nextId);
    setOfficeFilter('');
    setPage(1);
    setNotice(null);
    try {
      if (nextId) {
        localStorage.setItem(COMPANY_STORAGE_KEY, nextId);
        window.dispatchEvent(new Event('adhocx:ops-tenant-changed'));
        router.replace(`/employees?tenantId=${encodeURIComponent(nextId)}`);
      }
    } catch {}
  }

  function openCreateModal() {
    setErrorMsg(null);
    setCreateForm({
      officeId: selectedTenant?.offices?.[0]?.id || '',
      employeeCode: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      gender: 'UNSPECIFIED',
      department: '',
      homeAddress: '',
      landmark: '',
    });
    setCreateOpen(true);
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenantId) return;
    if (!createForm.officeId) {
      setErrorMsg('Please select an office hub for this employee.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      await opsApi.createTenantEmployee(selectedTenantId, {
        officeId: createForm.officeId,
        employeeCode: createForm.employeeCode.trim(),
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phoneNumber: createForm.phoneNumber.trim(),
        gender: createForm.gender,
        department: createForm.department.trim() || undefined,
        homeAddress: createForm.homeAddress.trim(),
        landmark: createForm.landmark.trim() || undefined,
      });
      setCreateOpen(false);
      setNotice(`Employee "${createForm.fullName.trim()}" added and commuter account provisioned.`);
      await loadEmployees();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add employee.');
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(emp: CorporateEmployeeItem) {
    setErrorMsg(null);
    setEditingEmployee(emp);
    const defaultLoc = emp.locations?.[0];
    setEditForm({
      officeId: emp.officeId || selectedTenant?.offices?.[0]?.id || '',
      fullName: emp.fullName || '',
      email: emp.email || '',
      phoneNumber: emp.phoneNumber || '',
      gender: (['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'].includes(emp.gender)
        ? emp.gender
        : 'UNSPECIFIED') as 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED',
      department: emp.department || '',
      homeAddress: defaultLoc?.addressText || '',
      landmark: defaultLoc?.landmark || '',
      isActive: emp.isActive,
    });
  }

  async function handleUpdateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenantId || !editingEmployee) return;
    setSubmitting(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const originalAddress = editingEmployee.locations?.[0]?.addressText || '';
      await opsApi.updateTenantEmployee(selectedTenantId, editingEmployee.id, {
        officeId: editForm.officeId || undefined,
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        gender: editForm.gender,
        department: editForm.department.trim(),
        homeAddress:
          editForm.homeAddress.trim() && editForm.homeAddress.trim() !== originalAddress
            ? editForm.homeAddress.trim()
            : undefined,
        landmark: editForm.landmark.trim() || undefined,
        isActive: editForm.isActive,
      });
      setEditingEmployee(null);
      setNotice(`Updated employee "${editForm.fullName.trim()}".`);
      await loadEmployees();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update employee.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!selectedTenantId || !deletingEmployee) return;
    setDeletingLoading(true);
    setErrorMsg(null);
    setNotice(null);
    try {
      const res = await opsApi.deleteTenantEmployee(selectedTenantId, deletingEmployee.id);
      setNotice(
        res?.deactivated
          ? `Employee "${deletingEmployee.fullName}" deactivated (historical trips preserved).`
          : `Employee "${deletingEmployee.fullName}" deleted.`,
      );
      setDeletingEmployee(null);
      await loadEmployees();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete employee.');
    } finally {
      setDeletingLoading(false);
    }
  }

  const offices = selectedTenant?.offices ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px 24px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.12))',
              color: 'var(--brand-primary, #5728B2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
              Corporate Employees Directory
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Manage commuters across onboarded companies, including auto-registered riders from manual and planned routes.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={14} className={loading ? 'spin' : undefined} />}
            onClick={() => void loadEmployees()}
            disabled={loading || !selectedTenantId}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={15} />}
            onClick={openCreateModal}
            disabled={!selectedTenantId || offices.length === 0}
          >
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          padding: '16px 18px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <label style={labelStyle}>Corporate Client</label>
          <select
            value={selectedTenantId}
            disabled={tenantsLoading}
            onChange={(e) => handleChangeTenant(e.target.value)}
            style={inputStyle}
          >
            {tenants.length === 0 && <option value="">No companies onboarded</option>}
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Search Employee</label>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, code, phone, email..."
              style={{ ...inputStyle, paddingLeft: '32px' }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Office Hub</label>
          <select
            value={officeFilter}
            onChange={(e) => {
              setOfficeFilter(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          >
            <option value="">All offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
              setPage(1);
            }}
            style={inputStyle}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: '13px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Employees Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-surface-muted)',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {selectedTenant ? `${selectedTenant.name} · ` : ''}
            {pagination.total} Employee{pagination.total === 1 ? '' : 's'}
          </span>
          {selectedTenant && offices.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-warning, #B45309)' }}>
              Configure an office hub before adding new employees.
            </span>
          )}
        </div>

        {!selectedTenantId && !tenantsLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={32} style={{ marginBottom: 8 }} />
            <div>No corporate clients found. Onboard a company first to manage employees.</div>
          </div>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No employees found
            </div>
            <p style={{ fontSize: '12px', margin: '6px 0 14px' }}>
              Add an employee directly or create a manual/optimized route to auto-register commuters.
            </p>
            {offices.length > 0 && (
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreateModal}>
                Add Employee
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Employee</th>
                  <th style={{ padding: '12px 16px' }}>Contact</th>
                  <th style={{ padding: '12px 16px' }}>Office / Dept</th>
                  <th style={{ padding: '12px 16px' }}>Default Pickup Address</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const defaultAddress = emp.locations?.[0]?.addressText;
                  return (
                    <tr key={emp.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.fullName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span className="code-tag">{emp.employeeCode}</span>
                          {emp.userId && (
                            <span
                              title="Linked commuter login account active"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--color-success, #16A34A)', fontWeight: 600 }}
                            >
                              <UserCheck size={12} /> App Login
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={12} /> {emp.phoneNumber || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', color: 'var(--text-muted)' }}>
                          <Mail size={12} /> {emp.email || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {emp.office?.name || '—'}
                        </div>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                          {emp.department || 'General'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: 280 }}>
                        {defaultAddress ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                            <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>{defaultAddress}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No address on file</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={emp.isActive ? 'ACTIVE' : 'CANCELLED'} label={emp.isActive ? 'Active' : 'Inactive'} size="sm" />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Pencil size={12} />}
                            onClick={() => openEditModal(emp)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete / Deactivate employee"
                            onClick={() => setDeletingEmployee(emp)}
                            style={{ color: 'var(--color-danger, #DC2626)' }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Corporate Employee"
        subtitle={selectedTenant ? `${selectedTenant.name} · Provisions commuter login account automatically` : undefined}
        width="540px"
      >
        <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Office Hub *</label>
              <select
                required
                value={createForm.officeId}
                onChange={(e) => setCreateForm((f) => ({ ...f, officeId: e.target.value }))}
                style={inputStyle}
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employee Code *</label>
              <input
                type="text"
                required
                placeholder="EMP-1001"
                value={createForm.employeeCode}
                onChange={(e) => setCreateForm((f) => ({ ...f, employeeCode: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="Priya Sharma"
                value={createForm.fullName}
                onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+919876543210"
                value={createForm.phoneNumber}
                onChange={(e) => setCreateForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                required
                placeholder="priya@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={createForm.gender}
                onChange={(e) => setCreateForm((f) => ({ ...f, gender: e.target.value as any }))}
                style={inputStyle}
              >
                <option value="UNSPECIFIED">Unspecified</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Department</label>
            <input
              type="text"
              placeholder="e.g. Engineering, Operations"
              value={createForm.department}
              onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Home / Pickup Address *</label>
            <input
              type="text"
              required
              placeholder="Full residential pickup address"
              value={createForm.homeAddress}
              onChange={(e) => setCreateForm((f) => ({ ...f, homeAddress: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Landmark (Optional)</label>
            <input
              type="text"
              placeholder="Near metro station / gate"
              value={createForm.landmark}
              onChange={(e) => setCreateForm((f) => ({ ...f, landmark: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Plus size={14} />} isLoading={submitting}>
              Add Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        title="Edit Corporate Employee"
        subtitle={editingEmployee ? `${editingEmployee.employeeCode} · Syncs linked commuter login account` : undefined}
        width="540px"
      >
        <form onSubmit={handleUpdateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                required
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={editForm.gender}
                onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value as any }))}
                style={inputStyle}
              >
                <option value="UNSPECIFIED">Unspecified</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Office Hub</label>
              <select
                value={editForm.officeId}
                onChange={(e) => setEditForm((f) => ({ ...f, officeId: e.target.value }))}
                style={inputStyle}
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} ({o.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Home / Pickup Address</label>
            <input
              type="text"
              value={editForm.homeAddress}
              onChange={(e) => setEditForm((f) => ({ ...f, homeAddress: e.target.value }))}
              placeholder="Leave unchanged or enter updated address"
              style={inputStyle}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={editForm.isActive}
              onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active commuter account
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingEmployee(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingEmployee)}
        onClose={() => setDeletingEmployee(null)}
        title="Delete / Deactivate Employee"
        subtitle={deletingEmployee ? `${deletingEmployee.fullName} (${deletingEmployee.employeeCode})` : undefined}
        width="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Remove this employee from the company? If the employee has completed historical trips or support tickets, they will be soft-deactivated to preserve audit records; otherwise they will be permanently removed.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="ghost" onClick={() => setDeletingEmployee(null)} disabled={deletingLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              isLoading={deletingLoading}
              onClick={() => void handleConfirmDelete()}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function OpsEmployeesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading employee directory...</div>}>
      <EmployeesDirectoryContent />
    </Suspense>
  );
}
