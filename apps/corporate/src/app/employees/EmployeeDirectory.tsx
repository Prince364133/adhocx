'use client';

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FilterX,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import styles from './EmployeeDirectory.module.css';
import {
  DEPARTMENTS,
  MOCK_EMPLOYEES,
  OFFICES,
  type EmployeeRecord,
  type EmploymentStatus,
} from './mock-data';

type DrawerMode = 'view' | 'add' | 'edit' | 'import' | null;
type EmployeeFormValues = Omit<EmployeeRecord, 'id'>;

const INITIAL_FORM: EmployeeFormValues = {
  employeeId: '',
  fullName: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  office: '',
  status: 'Active',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function EmployeeAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span className={`${styles.avatar} ${large ? styles.avatarLarge : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function EmployeeEditor({
  employee,
  onClose,
  onSave,
}: {
  employee: EmployeeRecord | null;
  onClose: () => void;
  onSave: (values: EmployeeFormValues) => void;
}) {
  const [values, setValues] = useState<EmployeeFormValues>(
    employee
      ? {
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          department: employee.department,
          designation: employee.designation,
          office: employee.office,
          status: employee.status,
        }
      : INITIAL_FORM,
  );

  const update = (field: keyof EmployeeFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    onSave(values);
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="employee-form-title">
        <header className={styles.drawerHeader}>
          <div>
            <h2 id="employee-form-title">{employee ? 'Edit employee' : 'Add employee'}</h2>
            <p>{employee ? 'Update this employee’s directory information.' : 'Add a new person to your organization.'}</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close drawer"><X size={18} /></button>
        </header>
        <form className={styles.editorForm} onSubmit={submit}>
          <div className={styles.drawerBody}>
            <fieldset className={styles.fieldset}>
              <legend>Personal information</legend>
              <label className={styles.field}>
                <span>Full name <b>*</b></span>
                <input autoFocus required value={values.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder="e.g. Ananya Rao" />
              </label>
              <label className={styles.field}>
                <span>Employee ID <b>*</b></span>
                <input required value={values.employeeId} onChange={(event) => update('employeeId', event.target.value)} placeholder="e.g. ADX-1024" />
              </label>
              <label className={styles.field}>
                <span>Email address <b>*</b></span>
                <input required type="email" value={values.email} onChange={(event) => update('email', event.target.value)} placeholder="name@company.com" />
              </label>
              <label className={styles.field}>
                <span>Phone number <b>*</b></span>
                <input required type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" />
              </label>
            </fieldset>
            <fieldset className={styles.fieldset}>
              <legend>Work information</legend>
              <label className={styles.field}>
                <span>Department <b>*</b></span>
                <select required value={values.department} onChange={(event) => update('department', event.target.value)}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Designation <b>*</b></span>
                <input required value={values.designation} onChange={(event) => update('designation', event.target.value)} placeholder="e.g. Product Manager" />
              </label>
              <label className={styles.field}>
                <span>Office <b>*</b></span>
                <select required value={values.office} onChange={(event) => update('office', event.target.value)}>
                  <option value="">Select office</option>
                  {OFFICES.map((office) => <option key={office}>{office}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Employment status <b>*</b></span>
                <select required value={values.status} onChange={(event) => update('status', event.target.value as EmploymentStatus)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </fieldset>
          </div>
          <footer className={styles.drawerFooter}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.primaryButton}><Check size={15} /> Save employee</button>
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
          <div>
            <h2 id="employee-detail-title">Employee profile</h2>
            <p>Directory record and work information</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close drawer"><X size={18} /></button>
        </header>
        <div className={styles.drawerBody}>
          <div className={styles.profile}>
            <EmployeeAvatar name={employee.fullName} large />
            <h3>{employee.fullName}</h3>
            <p>{employee.designation}</p>
            <span className={`${styles.status} ${employee.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
              <i />{employee.status}
            </span>
            <span className={styles.profileId}>{employee.employeeId}</span>
          </div>
          <section className={styles.detailSection}>
            <h3>Personal information</h3>
            <div className={styles.detailItem}><span>Email address</span><a href={`mailto:${employee.email}`}><Mail size={15} />{employee.email}</a></div>
            <div className={styles.detailItem}><span>Phone number</span><a href={`tel:${employee.phone.replace(/[^\d+]/g, '')}`}><Phone size={15} />{employee.phone}</a></div>
          </section>
          <section className={styles.detailSection}>
            <h3>Work information</h3>
            <div className={styles.detailItem}><span>Department</span><strong>{employee.department}</strong></div>
            <div className={styles.detailItem}><span>Designation</span><strong>{employee.designation}</strong></div>
            <div className={styles.detailItem}><span>Office location</span><strong><Building2 size={15} />{employee.office}</strong></div>
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

function ImportDrawer({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const acceptFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!/\.(csv|xlsx)$/i.test(selected.name)) {
      setError('Choose a CSV or XLSX file to continue.');
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Choose a file smaller than 10 MB.');
      setFile(null);
      return;
    }
    setError('');
    setMessage('');
    setFile(selected);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    acceptFile(event.dataTransfer.files[0]);
  };

  const downloadTemplate = () => {
    const content = 'Employee ID,Full Name,Email,Phone Number,Department,Designation,Office,Employment Status\n';
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee-directory-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="import-title">
        <header className={styles.drawerHeader}>
          <div><h2 id="import-title">Import employees</h2><p>Add employee records from a spreadsheet.</p></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close drawer"><X size={18} /></button>
        </header>
        <div className={styles.drawerBody}>
          <div
            className={styles.dropzone}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <span className={styles.dropIcon}><Upload size={20} /></span>
            <strong>Drop your file here, or <button type="button" onClick={() => inputRef.current?.click()}>browse</button></strong>
            <span>CSV or XLSX, up to 10 MB</span>
            <input ref={inputRef} className={styles.fileInput} type="file" accept=".csv,.xlsx" onChange={(event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0])} />
          </div>
          {file && <div className={styles.fileRow}><FileSpreadsheet size={17} /><span>{file.name}<small>{file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}</small></span><button type="button" onClick={() => setFile(null)} aria-label="Remove selected file"><X size={15} /></button></div>}
          {error && <p className={styles.formError} role="alert">{error}</p>}
          {message && <p className={styles.importMessage} role="status">{message}</p>}
          <button type="button" className={styles.templateLink} onClick={downloadTemplate}><Download size={15} /> Download sample template</button>
          <p className={styles.importNote}>Import is a frontend preview. Your selected file stays on this device and is not uploaded.</p>
        </div>
        <footer className={styles.drawerFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!file} onClick={() => setMessage('File selected and ready. Import processing is not connected in this preview.')}>Continue</button>
        </footer>
      </section>
    </div>
  );
}

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => MOCK_EMPLOYEES.map((employee) => ({ ...employee })));
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [office, setOffice] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setEmployees(MOCK_EMPLOYEES.map((employee) => ({ ...employee })));
        setLoadError(null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load employee records.');
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [retryCount]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesQuery = !query || [
        employee.employeeId,
        employee.fullName,
        employee.email,
        employee.phone,
        employee.department,
        employee.designation,
        employee.office,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesQuery
        && (!department || employee.department === department)
        && (!office || employee.office === office)
        && (!status || employee.status === status);
    });
  }, [employees, search, department, office, status]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const pageEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const first = filteredEmployees.length ? (currentPage - 1) * pageSize + 1 : 0;
  const last = Math.min(currentPage * pageSize, filteredEmployees.length);
  const activeCount = employees.filter((employee) => employee.status === 'Active').length;
  const inactiveCount = employees.length - activeCount;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setOffice('');
    setStatus('');
    setCurrentPage(1);
  };

  const saveEmployee = (values: EmployeeFormValues) => {
    const duplicate = employees.find((employee) =>
      employee.id !== selectedEmployee?.id
      && (employee.employeeId.toLowerCase() === values.employeeId.trim().toLowerCase()
        || employee.email.toLowerCase() === values.email.trim().toLowerCase()),
    );
    if (duplicate) {
      notify(duplicate.employeeId.toLowerCase() === values.employeeId.trim().toLowerCase()
        ? 'That employee ID is already in use.'
        : 'That email address is already in use.');
      return;
    }

    if (selectedEmployee) {
      setEmployees((current) => current.map((employee) => employee.id === selectedEmployee.id
        ? { ...values, id: employee.id, employeeId: values.employeeId.trim(), fullName: values.fullName.trim(), email: values.email.trim(), phone: values.phone.trim() }
        : employee));
      notify('Employee details updated.');
    } else {
      setEmployees((current) => [...current, {
        ...values,
        id: `local-${Date.now()}`,
        employeeId: values.employeeId.trim(),
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      }]);
      notify('Employee added to the directory.');
    }
    setDrawerMode(null);
    setSelectedEmployee(null);
  };

  const exportCsv = () => {
    const headings = ['Employee ID', 'Full Name', 'Email', 'Phone Number', 'Department', 'Designation', 'Office', 'Employment Status'];
    const rows = filteredEmployees.map((employee) => [
      employee.employeeId,
      employee.fullName,
      employee.email,
      employee.phone,
      employee.department,
      employee.designation,
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
    notify(`Exported ${filteredEmployees.length} employees.`);
  };

  const openEditor = (employee: EmployeeRecord | null) => {
    setSelectedEmployee(employee);
    setDrawerMode(employee ? 'edit' : 'add');
    setOpenMenuId(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setEmployees((current) => current.filter((employee) => employee.id !== deleteTarget.id));
    setDeleteTarget(null);
    setOpenMenuId(null);
    setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil((filteredEmployees.length - 1) / pageSize))));
    notify(`${deleteTarget.fullName} was removed from the directory.`);
  };

  const filtersActive = Boolean(search || department || office || status);

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>PEOPLE MANAGEMENT <span> / </span> DIRECTORY</div>
          <h1>Employee Directory</h1>
          <p>Manage your company employees and their information.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={exportCsv}><Download size={15} /> Export</button>
          <button type="button" className={styles.secondaryButton} onClick={() => setDrawerMode('import')}><Upload size={15} /> Import employees</button>
          <button type="button" className={styles.primaryButton} onClick={() => openEditor(null)}><Plus size={16} /> Add employee</button>
        </div>
      </div>

      <section className={styles.metrics} aria-label="Employee summary">
        <article className={styles.metric}>
          <span className={styles.metricIcon}><Users size={17} /></span>
          <div><span className={styles.metricLabel}>Total employees</span><strong>{employees.length}</strong></div>
        </article>
        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricGreen}`}><Check size={17} /></span>
          <div><span className={styles.metricLabel}>Active employees</span><strong>{activeCount}</strong></div>
          <span className={styles.metricAside}>{employees.length ? Math.round((activeCount / employees.length) * 100) : 0}%</span>
        </article>
        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricGray}`}><UserRound size={17} /></span>
          <div><span className={styles.metricLabel}>Inactive employees</span><strong>{inactiveCount}</strong></div>
        </article>
        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricLavender}`}><Building2 size={17} /></span>
          <div><span className={styles.metricLabel}>Departments</span><strong>{new Set(employees.map((employee) => employee.department)).size}</strong></div>
        </article>
      </section>

      <section className={styles.directory} aria-label="Employee records">
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={16} />
            <input aria-label="Search employees" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search by name, ID, email or phone..." />
          </label>
          <label className={styles.filterSelect}>
            <span className={styles.srOnly}>Department</span>
            <select value={department} onChange={(event) => { setDepartment(event.target.value); setCurrentPage(1); }}>
              <option value="">All departments</option>
              {DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}
            </select><ChevronDown size={14} />
          </label>
          <label className={styles.filterSelect}>
            <span className={styles.srOnly}>Office</span>
            <select value={office} onChange={(event) => { setOffice(event.target.value); setCurrentPage(1); }}>
              <option value="">All offices</option>
              {OFFICES.map((item) => <option key={item}>{item}</option>)}
            </select><ChevronDown size={14} />
          </label>
          <label className={styles.filterSelect}>
            <span className={styles.srOnly}>Employment status</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setCurrentPage(1); }}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select><ChevronDown size={14} />
          </label>
          {filtersActive && <>
            <div className={styles.activeFilters} aria-label="Active filters">
              {search && <button type="button" onClick={() => { setSearch(''); setCurrentPage(1); }}>Search: {search}<X size={12} /></button>}
              {department && <button type="button" onClick={() => { setDepartment(''); setCurrentPage(1); }}>{department}<X size={12} /></button>}
              {office && <button type="button" onClick={() => { setOffice(''); setCurrentPage(1); }}>{office}<X size={12} /></button>}
              {status && <button type="button" onClick={() => { setStatus(''); setCurrentPage(1); }}>{status}<X size={12} /></button>}
            </div>
            <button type="button" className={styles.clearFilters} onClick={clearFilters}><FilterX size={14} /> Clear all filters</button>
          </>}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Employee ID</th><th>Employee</th><th>Department</th><th>Designation</th><th>Office</th><th>Contact</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }, (_, index) => (
                <tr key={`skeleton-${index}`} aria-hidden="true">
                  <td colSpan={8}><div className={styles.skeletonRow}><i /><i /><i /><i /></div></td>
                </tr>
              ))}
              {!loading && loadError && <tr><td className={styles.emptyState} colSpan={8}>
                <strong>Unable to load employees</strong><span>{loadError}</span>
                <button type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }}>Try again</button>
              </td></tr>}
              {!loading && !loadError && employees.length === 0 && <tr><td className={styles.emptyState} colSpan={8}>
                <Users size={22} /><strong>No employees yet</strong><span>Add an employee to get started.</span>
                <button type="button" onClick={() => openEditor(null)}>Add employee</button>
              </td></tr>}
              {!loading && !loadError && employees.length > 0 && pageEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className={styles.employeeCode}>{employee.employeeId}</td>
                  <td>
                    <div className={styles.employeeCell}><EmployeeAvatar name={employee.fullName} /><div className={styles.employeeIdentity}><strong>{employee.fullName}</strong><span>{employee.email}</span></div></div>
                  </td>
                  <td>{employee.department}</td>
                  <td className={styles.designation}>{employee.designation}</td>
                  <td><span className={styles.officeCell}><Building2 size={14} />{employee.office}</span></td>
                  <td><a className={styles.phoneLink} href={`tel:${employee.phone.replace(/[^\d+]/g, '')}`}>{employee.phone}</a></td>
                  <td><span className={`${styles.status} ${employee.status === 'Active' ? styles.statusActive : styles.statusInactive}`}><i />{employee.status}</span></td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.actionButton} aria-label={`View ${employee.fullName}`} title="View employee" onClick={() => { setSelectedEmployee(employee); setDrawerMode('view'); }}><Search size={15} /></button>
                      <button type="button" className={styles.actionButton} aria-label={`Edit ${employee.fullName}`} title="Edit employee" onClick={() => openEditor(employee)}><Pencil size={14} /></button>
                      <div className={styles.moreWrap}>
                        <button type="button" className={styles.actionButton} aria-label={`More actions for ${employee.fullName}`} aria-expanded={openMenuId === employee.id} onClick={() => setOpenMenuId(openMenuId === employee.id ? null : employee.id)}><MoreHorizontal size={17} /></button>
                        {openMenuId === employee.id && <div className={styles.actionMenu}>
                          <button type="button" onClick={() => { setSelectedEmployee(employee); setDrawerMode('view'); setOpenMenuId(null); }}><UserRound size={14} />View details</button>
                          <button type="button" className={styles.deleteAction} onClick={() => { setDeleteTarget(employee); setOpenMenuId(null); }}><Trash2 size={14} />Delete employee</button>
                        </div>}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !loadError && employees.length > 0 && pageEmployees.length === 0 && <tr><td className={styles.emptyState} colSpan={8}><Search size={22} /><strong>No search results</strong><span>Try adjusting your search or filters.</span>{filtersActive && <button type="button" onClick={clearFilters}>Clear all filters</button>}</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className={styles.pagination}>
          <span className={styles.showing}>Showing <strong>{first}–{last}</strong> of <strong>{filteredEmployees.length}</strong> employees</span>
          <div className={styles.paginationControls}>
            <label>Rows per page
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button type="button" className={styles.pageButton} aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
            <span className={styles.pageNumber}>Page <strong>{currentPage}</strong> of {totalPages}</span>
            <button type="button" className={styles.pageButton} aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>

      <p className={styles.dataNotice}><span /> Preview data is stored locally in this session. No employee records are sent to a server.</p>
      {toast && <div className={styles.toast} role="status">{toast}</div>}

      {drawerMode === 'add' && <EmployeeEditor employee={null} onClose={() => setDrawerMode(null)} onSave={saveEmployee} />}
      {drawerMode === 'edit' && selectedEmployee && <EmployeeEditor employee={selectedEmployee} onClose={() => { setDrawerMode(null); setSelectedEmployee(null); }} onSave={saveEmployee} />}
      {drawerMode === 'view' && selectedEmployee && <EmployeeDetails employee={selectedEmployee} onClose={() => { setDrawerMode(null); setSelectedEmployee(null); }} onEdit={() => openEditor(selectedEmployee)} />}
      {drawerMode === 'import' && <ImportDrawer onClose={() => setDrawerMode(null)} />}

      {deleteTarget && <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
        <section className={styles.confirmDialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
          <span className={styles.deleteIcon}><Trash2 size={19} /></span>
          <h2 id="delete-title">Delete employee?</h2>
          <p id="delete-description">This will remove <strong>{deleteTarget.fullName}</strong> from this local directory preview. This action cannot be undone.</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button type="button" className={styles.dangerButton} onClick={confirmDelete}>Delete employee</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
