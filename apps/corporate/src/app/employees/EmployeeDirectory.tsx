'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Check, ChevronLeft, ChevronRight, Download, FilterX, Mail, Pencil, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';
import styles from './EmployeeDirectory.module.css';
import { employeeApi } from '../../lib/api/corporate';
import type { Employee, Office } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

type DrawerMode = 'view' | 'add' | 'edit' | null;
type EmploymentStatus = 'Active' | 'Inactive';

interface EmployeeRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Employee['gender'];
  department: string;
  costCenter: string;
  officeId: string;
  office: string;
  homeAddress: string;
  status: EmploymentStatus;
}

interface EmployeeFormValues {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Employee['gender'];
  department: string;
  costCenter: string;
  officeId: string;
  homeAddress: string;
  status: EmploymentStatus;
}

const INITIAL_FORM: EmployeeFormValues = {
  employeeId: '',
  fullName: '',
  email: '',
  phone: '',
  gender: 'OTHER',
  department: '',
  costCenter: '',
  officeId: '',
  homeAddress: '',
  status: 'Active',
};

function mapEmployee(employee: Employee): EmployeeRecord {
  return {
    id: employee.id,
    employeeId: employee.employeeCode,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phoneNumber,
    gender: employee.gender,
    department: employee.department ?? '',
    costCenter: employee.costCenter ?? '',
    officeId: employee.officeId,
    office: employee.office?.name ?? '',
    homeAddress: employee.locations?.find((location) => location.isDefault)?.addressText ?? employee.locations?.[0]?.addressText ?? '',
    status: employee.isActive ? 'Active' : 'Inactive',
  };
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function EmployeeAvatar({ name }: { name: string }) {
  return <span className={styles.avatar} aria-hidden="true">{initials(name)}</span>;
}

function EmployeeEditor({
  employee,
  offices,
  onClose,
  onSave,
}: {
  employee: EmployeeRecord | null;
  offices: Office[];
  onClose: () => void;
  onSave: (values: EmployeeFormValues) => Promise<boolean>;
}) {
  const [values, setValues] = useState<EmployeeFormValues>(() => employee ? {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    gender: employee.gender,
    department: employee.department,
    costCenter: employee.costCenter,
    officeId: employee.officeId,
    homeAddress: employee.homeAddress,
    status: employee.status,
  } : { ...INITIAL_FORM, officeId: offices[0]?.id ?? '' });
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof EmployeeFormValues,>(field: K, value: EmployeeFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setSaving(true);
    try {
      if (await onSave(values)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="employee-form-title">
        <header className={styles.drawerHeader}>
          <div>
            <h2 id="employee-form-title">{employee ? 'Edit employee' : 'Add employee'}</h2>
            <p>{employee ? 'Changes are saved to the tenant employee record.' : 'Create an employee record for this tenant.'}</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <form className={styles.editorForm} onSubmit={submit}>
          <div className={styles.drawerBody}>
            <fieldset className={styles.fieldset}>
              <legend>Employee information</legend>
              <label className={styles.field}>
                <span>Full name <b>*</b></span>
                <input required value={values.fullName} onChange={(event) => update('fullName', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Employee ID <b>*</b></span>
                <input required readOnly={Boolean(employee)} value={values.employeeId} onChange={(event) => update('employeeId', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Email <b>*</b></span>
                <input required type="email" value={values.email} onChange={(event) => update('email', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Phone number <b>*</b></span>
                <input required type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Gender <b>*</b></span>
                <select required value={values.gender} onChange={(event) => update('gender', event.target.value as Employee['gender'])}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </fieldset>
            <fieldset className={styles.fieldset}>
              <legend>Work information</legend>
              <label className={styles.field}>
                <span>Department</span>
                <input value={values.department} onChange={(event) => update('department', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Cost center</span>
                <input value={values.costCenter} onChange={(event) => update('costCenter', event.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Office <b>*</b></span>
                <select required value={values.officeId} onChange={(event) => update('officeId', event.target.value)}>
                  <option value="">Select an existing office</option>
                  {offices.map((office) => <option key={office.id} value={office.id}>{office.name} ({office.code})</option>)}
                </select>
              </label>
              {employee && (
                <label className={styles.field}>
                  <span>Employment status</span>
                  <select value={values.status} onChange={(event) => update('status', event.target.value as EmploymentStatus)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              )}
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span>Home address {!employee && <b>*</b>}</span>
                <textarea
                  required={!employee}
                  placeholder="Enter full pickup / drop residential address"
                  value={values.homeAddress}
                  onChange={(event) => update('homeAddress', event.target.value)}
                />
              </label>
            </fieldset>
          </div>
          <footer className={styles.drawerFooter}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={saving || offices.length === 0}>
              <Check size={15} /> {saving ? 'Saving…' : 'Save employee'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function EmployeeDetails({ employee, onClose, onEdit }: { employee: EmployeeRecord; onClose: () => void; onEdit: () => void }) {
  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="employee-detail-title">
        <header className={styles.drawerHeader}>
          <div><h2 id="employee-detail-title">Employee profile</h2><p>Tenant employee record</p></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className={styles.drawerBody}>
          <div className={styles.profile}>
            <EmployeeAvatar name={employee.fullName} />
            <h3>{employee.fullName}</h3>
            <span className={`${styles.status} ${employee.status === 'Active' ? styles.statusActive : styles.statusInactive}`}><i />{employee.status}</span>
            <span className={styles.profileId}>{employee.employeeId}</span>
          </div>
          <section className={styles.detailSection}>
            <h3>Contact</h3>
            <div className={styles.detailItem}><span>Email</span><a href={`mailto:${employee.email}`}><Mail size={15} />{employee.email || 'Not provided'}</a></div>
            <div className={styles.detailItem}><span>Phone</span><a href={`tel:${employee.phone.replace(/[^\d+]/g, '')}`}><Phone size={15} />{employee.phone || 'Not provided'}</a></div>
          </section>
          <section className={styles.detailSection}>
            <h3>Work information</h3>
            <div className={styles.detailItem}><span>Department</span><strong>{employee.department || 'Not provided'}</strong></div>
            <div className={styles.detailItem}><span>Cost center</span><strong>{employee.costCenter || 'Not provided'}</strong></div>
            <div className={styles.detailItem}><span>Office</span><strong><Building2 size={15} />{employee.office || 'Not assigned'}</strong></div>
            <div className={styles.detailItem}><span>Home address</span><strong>{employee.homeAddress || 'Not provided'}</strong></div>
          </section>
        </div>
        <footer className={styles.drawerFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          <button type="button" className={styles.primaryButton} onClick={onEdit}><Pencil size={14} /> Edit employee</button>
        </footer>
      </section>
    </div>
  );
}

export default function EmployeeDirectory() {
  const { tenantId, status: sessionStatus, offices, can } = useSession();
  const searchParams = useSearchParams();
  const initialSearchParam = searchParams.get('search') ?? '';
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(initialSearchParam);
  const [officeId, setOfficeId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const requestSequence = useRef(0);
  const canWrite = can('employees:write');

  useEffect(() => {
    const paramSearch = searchParams.get('search');
    if (paramSearch !== null) {
      setSearch(paramSearch);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const loadEmployees = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (sessionStatus === 'loading') return;
    if (!tenantId) {
      setEmployees([]);
      setTotal(0);
      setLoadError('Sign in with a corporate account to view employees.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await employeeApi.list(tenantId, {
        search: search.trim() || undefined,
        officeId: officeId || undefined,
        isActive: employmentStatus || undefined,
        page: currentPage,
        limit: pageSize,
      });
      if (requestId !== requestSequence.current) return;
      setEmployees(result.items.map(mapEmployee));
      setTotal(result.pagination.total);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setLoadError(requestError instanceof Error ? requestError.message : 'Unable to load employee records.');
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [currentPage, employmentStatus, officeId, pageSize, search, sessionStatus, tenantId]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees, refreshKey]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const saveEmployee = async (values: EmployeeFormValues): Promise<boolean> => {
    if (!tenantId) {
      notify('A corporate tenant could not be identified.');
      return false;
    }
    try {
      if (selectedEmployee) {
        await employeeApi.update(tenantId, selectedEmployee.id, {
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phoneNumber: values.phone.trim(),
          gender: values.gender,
          department: values.department.trim(),
          costCenter: values.costCenter.trim(),
          officeId: values.officeId,
          homeAddress: values.homeAddress.trim() || undefined,
          isActive: values.status === 'Active',
        });
      } else {
        await employeeApi.create(tenantId, {
          employeeCode: values.employeeId.trim(),
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phoneNumber: values.phone.trim(),
          gender: values.gender,
          department: values.department.trim() || undefined,
          costCenter: values.costCenter.trim() || undefined,
          officeId: values.officeId,
          homeAddress: values.homeAddress.trim(),
        });
      }
      await loadEmployees();
      notify(selectedEmployee ? 'Employee updated.' : 'Employee created.');
      setDrawerMode(null);
      setSelectedEmployee(null);
      return true;
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : 'Unable to save employee.');
      return false;
    }
  };

  const changeEmploymentStatus = async () => {
    if (!tenantId || !statusTarget) return;
    try {
      await employeeApi.update(tenantId, statusTarget.id, { isActive: statusTarget.status !== 'Active' });
      await loadEmployees();
      notify(`${statusTarget.fullName} is now ${statusTarget.status === 'Active' ? 'inactive' : 'active'}.`);
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : 'Unable to update employee status.');
    } finally {
      setStatusTarget(null);
    }
  };

  const deleteEmployee = async () => {
    if (!tenantId || !deleteTarget) return;
    setDeleting(true);
    try {
      const result = await employeeApi.delete(tenantId, deleteTarget.id);
      if (selectedEmployee?.id === deleteTarget.id) {
        setDrawerMode(null);
        setSelectedEmployee(null);
      }
      await loadEmployees();
      notify(
        result?.message ||
          (result?.deactivated
            ? `${deleteTarget.fullName} has historical records and was deactivated.`
            : `${deleteTarget.fullName} was deleted.`),
      );
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : 'Unable to delete employee.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const exportCsv = () => {
    const headings = ['Employee ID', 'Full Name', 'Email', 'Phone Number', 'Department', 'Cost Center', 'Office', 'Status'];
    const rows = employees.map((employee) => [
      employee.employeeId,
      employee.fullName,
      employee.email,
      employee.phone,
      employee.department,
      employee.costCenter,
      employee.office,
      employee.status,
    ]);
    const content = [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee-directory.csv';
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${employees.length} employees from this page.`);
  };

  const activeCount = useMemo(() => employees.filter((employee) => employee.status === 'Active').length, [employees]);
  const inactiveCount = employees.length - activeCount;
  const first = total ? (currentPage - 1) * pageSize + 1 : 0;
  const last = Math.min(currentPage * pageSize, total);
  const filtersActive = Boolean(search || officeId || employmentStatus);

  const clearFilters = () => {
    setSearch('');
    setOfficeId('');
    setEmploymentStatus('');
    setCurrentPage(1);
  };

  const openEditor = (employee: EmployeeRecord | null) => {
    setSelectedEmployee(employee);
    setDrawerMode(employee ? 'edit' : 'add');
  };

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>PEOPLE MANAGEMENT <span> / </span> DIRECTORY</div>
          <h1>Employee Directory</h1>
          <p>Tenant employees loaded from the Corporate API.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={exportCsv} disabled={loading || employees.length === 0}>
            <Download size={15} /> Export current page
          </button>
          {canWrite && (
            <button type="button" className={styles.primaryButton} onClick={() => openEditor(null)} disabled={offices.length === 0}>
              <Plus size={16} /> Add employee
            </button>
          )}
        </div>
      </div>

      {canWrite && offices.length === 0 && !loading && (
        <p role="status" className={styles.dataNotice}>Register an office before adding employees. Existing records remain available below.</p>
      )}

      <section className={styles.metrics} aria-label="Employee summary">
        <article className={styles.metric}><span className={styles.metricIcon}><Users size={17} /></span><div><span className={styles.metricLabel}>Matching employees</span><strong>{total}</strong></div></article>
        <article className={styles.metric}><span className={`${styles.metricIcon} ${styles.metricGreen}`}><Check size={17} /></span><div><span className={styles.metricLabel}>Active on page</span><strong>{activeCount}</strong></div></article>
        <article className={styles.metric}><span className={`${styles.metricIcon} ${styles.metricGray}`}><Users size={17} /></span><div><span className={styles.metricLabel}>Inactive on page</span><strong>{inactiveCount}</strong></div></article>
      </section>

      <section className={styles.directory} aria-label="Employee records">
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={16} />
            <input aria-label="Search employees" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search name, ID, email or phone…" />
          </label>
          <label className={styles.filterSelect}>
            <span className={styles.srOnly}>Office</span>
            <select value={officeId} onChange={(event) => { setOfficeId(event.target.value); setCurrentPage(1); }}>
              <option value="">All offices</option>
              {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
            </select>
          </label>
          <label className={styles.filterSelect}>
            <span className={styles.srOnly}>Employment status</span>
            <select value={employmentStatus} onChange={(event) => { setEmploymentStatus(event.target.value); setCurrentPage(1); }}>
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          {filtersActive && <button type="button" className={styles.clearFilters} onClick={clearFilters}><FilterX size={14} /> Clear filters</button>}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Employee ID</th><th>Employee</th><th>Department</th><th>Office</th><th>Contact</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {loading && <tr><td className={styles.emptyState} colSpan={7}>Loading employee records…</td></tr>}
              {!loading && loadError && (
                <tr><td className={styles.emptyState} colSpan={7}>
                  <strong>Unable to load employees</strong><span>{loadError}</span>
                  <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Try again</button>
                </td></tr>
              )}
              {!loading && !loadError && employees.length === 0 && (
                <tr><td className={styles.emptyState} colSpan={7}>
                  <Users size={22} /><strong>No employees found</strong>
                  <span>{filtersActive ? 'Try adjusting the filters.' : 'This tenant has no employee records yet.'}</span>
                  {filtersActive && <button type="button" onClick={clearFilters}>Clear filters</button>}
                </td></tr>
              )}
              {!loading && !loadError && employees.map((employee) => (
                <tr key={employee.id}>
                  <td className={styles.employeeCode}>{employee.employeeId}</td>
                  <td><div className={styles.employeeCell}><EmployeeAvatar name={employee.fullName} /><div className={styles.employeeIdentity}><strong>{employee.fullName}</strong><span>{employee.email}</span></div></div></td>
                  <td>{employee.department || 'Not provided'}</td>
                  <td><span className={styles.officeCell}><Building2 size={14} />{employee.office || 'Not assigned'}</span></td>
                  <td><a className={styles.phoneLink} href={`tel:${employee.phone.replace(/[^\d+]/g, '')}`}>{employee.phone}</a></td>
                  <td><span className={`${styles.status} ${employee.status === 'Active' ? styles.statusActive : styles.statusInactive}`}><i />{employee.status}</span></td>
                  <td><div className={styles.rowActions}>
                    <button type="button" className={styles.actionButton} aria-label={`View ${employee.fullName}`} title="View details" onClick={() => { setSelectedEmployee(employee); setDrawerMode('view'); }}><Search size={15} /></button>
                    {canWrite && <button type="button" className={styles.actionButton} aria-label={`Edit ${employee.fullName}`} title="Edit employee" onClick={() => openEditor(employee)}><Pencil size={14} /></button>}
                    {canWrite && <button type="button" className={styles.actionButton} style={{ width: 'auto', padding: '0 8px', fontSize: 11 }} onClick={() => setStatusTarget(employee)}>{employee.status === 'Active' ? 'Deactivate' : 'Activate'}</button>}
                    {canWrite && <button type="button" className={styles.actionButton} aria-label={`Delete ${employee.fullName}`} title="Delete employee" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteTarget(employee)}><Trash2 size={14} /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.pagination}>
          <span className={styles.showing}>Showing <strong>{first}–{last}</strong> of <strong>{total}</strong> employees</span>
          <div className={styles.paginationControls}>
            <label>Rows per page
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button type="button" className={styles.pageButton} aria-label="Previous page" disabled={currentPage <= 1 || loading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
            <span className={styles.pageNumber}>Page <strong>{currentPage}</strong> of {totalPages}</span>
            <button type="button" className={styles.pageButton} aria-label="Next page" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>

      <p className={styles.dataNotice}><span /> This page reads and writes employee records through the authenticated tenant API.</p>
      {toast && <div className={styles.toast} role="status">{toast}</div>}

      {(drawerMode === 'add' || drawerMode === 'edit') && (
        <EmployeeEditor
          employee={drawerMode === 'edit' ? selectedEmployee : null}
          offices={offices}
          onClose={() => { setDrawerMode(null); setSelectedEmployee(null); }}
          onSave={saveEmployee}
        />
      )}
      {drawerMode === 'view' && selectedEmployee && (
        <EmployeeDetails
          employee={selectedEmployee}
          onClose={() => { setDrawerMode(null); setSelectedEmployee(null); }}
          onEdit={() => openEditor(selectedEmployee)}
        />
      )}
      {statusTarget && (
        <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && setStatusTarget(null)}>
          <section className={styles.confirmDialog} role="alertdialog" aria-modal="true">
            <h2>{statusTarget.status === 'Active' ? 'Deactivate employee?' : 'Activate employee?'}</h2>
            <p>Update <strong>{statusTarget.fullName}</strong> in the tenant employee record?</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setStatusTarget(null)}>Cancel</button>
              <button type="button" className={styles.primaryButton} onClick={() => void changeEmploymentStatus()}>Confirm</button>
            </div>
          </section>
        </div>
      )}
      {deleteTarget && (
        <div className={styles.overlay} onMouseDown={(event) => !deleting && event.target === event.currentTarget && setDeleteTarget(null)}>
          <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-employee-title">
            <span className={styles.deleteIcon} aria-hidden="true"><Trash2 size={18} /></span>
            <h2 id="delete-employee-title">Delete employee?</h2>
            <p>
              Delete <strong>{deleteTarget.fullName}</strong> ({deleteTarget.employeeId})? If this employee has historical trips or support tickets, the account will be safely deactivated instead of permanently deleted.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondaryButton} disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className={styles.dangerButton} disabled={deleting} onClick={() => void deleteEmployee()}>
                {deleting ? 'Deleting…' : 'Delete employee'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
