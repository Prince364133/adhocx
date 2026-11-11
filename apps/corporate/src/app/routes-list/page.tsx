'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BusFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import styles from './RoutesList.module.css';
import { MOCK_ROUTES, type Route, type RouteStatus, type RouteStop } from './mock-data';

type RouteFormValues = Omit<Route, 'id' | 'createdAt'>;
type DrawerMode = 'view' | 'create' | 'edit' | null;
type FieldErrors = Partial<Record<'name' | 'code' | 'source' | 'destination' | 'stops' | 'assignedEmployees' | 'assignedVehicle', string>>;

const EMPTY_FORM: RouteFormValues = {
  code: '',
  name: '',
  source: '',
  destination: '',
  stops: [],
  assignedEmployees: 0,
  assignedVehicle: '',
  status: 'Planning',
};

function statusClass(status: RouteStatus): string {
  if (status === 'Active') return styles.active;
  if (status === 'Planning') return styles.planning;
  return styles.inactive;
}

function formatCreatedDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function createStop(name = ''): RouteStop {
  return { id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name };
}

function RouteForm({
  route,
  routes,
  onClose,
  onSave,
}: {
  route: Route | null;
  routes: Route[];
  onClose: () => void;
  onSave: (values: RouteFormValues) => void;
}) {
  const [values, setValues] = useState<RouteFormValues>(() => route ? {
    code: route.code,
    name: route.name,
    source: route.source,
    destination: route.destination,
    stops: route.stops.map((stop) => ({ ...stop })),
    assignedEmployees: route.assignedEmployees,
    assignedVehicle: route.assignedVehicle,
    status: route.status,
  } : { ...EMPTY_FORM, stops: [] });
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = <K extends keyof RouteFormValues>(field: K, value: RouteFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const moveStop = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= values.stops.length) return;
    const stops = [...values.stops];
    [stops[index], stops[target]] = [stops[target], stops[index]];
    update('stops', stops);
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const normalizedCode = values.code.trim().toUpperCase();
    if (!values.name.trim()) next.name = 'Enter a route name.';
    if (!normalizedCode) next.code = 'Enter a route code.';
    else if (routes.some((item) => item.id !== route?.id && item.code.trim().toUpperCase() === normalizedCode)) {
      next.code = 'This route code is already in use.';
    }
    if (values.name.trim() && values.source.trim() && values.destination.trim()
      && routes.some((item) => item.id !== route?.id
        && item.name.trim().toLowerCase() === values.name.trim().toLowerCase()
        && item.source.trim().toLowerCase() === values.source.trim().toLowerCase()
        && item.destination.trim().toLowerCase() === values.destination.trim().toLowerCase())) {
      next.name = 'This route already exists.';
    }
    if (!values.source.trim()) next.source = 'Enter a source location.';
    if (!values.destination.trim()) next.destination = 'Enter a destination.';
    if (values.source.trim() && values.destination.trim()
      && values.source.trim().toLowerCase() === values.destination.trim().toLowerCase()) {
      next.destination = 'Destination must differ from the source.';
    }
    const stopNames = values.stops.map((stop) => stop.name.trim());
    if (stopNames.some((name) => !name)) next.stops = 'Complete or remove each stop.';
    else if (new Set(stopNames.map((name) => name.toLowerCase())).size !== stopNames.length) {
      next.stops = 'Each stop must be unique.';
    }
    if (!Number.isInteger(values.assignedEmployees) || values.assignedEmployees < 0) {
      next.assignedEmployees = 'Enter a whole number of 0 or more.';
    }
    if (!values.assignedVehicle.trim()) next.assignedVehicle = 'Enter an assigned vehicle.';
    setErrors(next);
    return next;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) return;
    onSave({
      ...values,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      source: values.source.trim(),
      destination: values.destination.trim(),
      stops: values.stops.map((stop) => ({ ...stop, name: stop.name.trim() })),
      assignedVehicle: values.assignedVehicle.trim(),
    });
  };

  const fieldError = (key: keyof FieldErrors) => errors[key] && <span className={styles.fieldError} role="alert">{errors[key]}</span>;

  return (
    <Drawer title={route ? 'Edit route' : 'Create route'} subtitle={route ? 'Update route information and assignments.' : 'Add a route to your company directory.'} onClose={onClose}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.drawerBody}>
          <fieldset className={styles.fieldset}>
            <legend>Route information</legend>
            <label className={styles.field}>
              <span>Route name <b>*</b></span>
              <input autoFocus value={values.name} onChange={(event) => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'route-name-error' : undefined} placeholder="e.g. Kondapur to HITEC City" />
              {errors.name && <span id="route-name-error" className={styles.fieldError} role="alert">{errors.name}</span>}
            </label>
            <label className={styles.field}>
              <span>Route code <b>*</b></span>
              <input value={values.code} onChange={(event) => update('code', event.target.value)} aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? 'route-code-error' : undefined} placeholder="e.g. HYD-013" />
              {errors.code && <span id="route-code-error" className={styles.fieldError} role="alert">{errors.code}</span>}
            </label>
            <label className={styles.field}>
              <span>Source <b>*</b></span>
              <input value={values.source} onChange={(event) => update('source', event.target.value)} aria-invalid={Boolean(errors.source)} placeholder="Starting location" />
              {fieldError('source')}
            </label>
            <label className={styles.field}>
              <span>Destination <b>*</b></span>
              <input value={values.destination} onChange={(event) => update('destination', event.target.value)} aria-invalid={Boolean(errors.destination)} placeholder="Final location" />
              {fieldError('destination')}
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Stops <span className={styles.optional}>Optional · {values.stops.length}</span></legend>
            <div className={styles.stopsList}>
              {values.stops.map((stop, index) => (
                <div className={styles.stopRow} key={stop.id}>
                  <span className={styles.stopNumber}>{index + 1}</span>
                  <input aria-label={`Stop ${index + 1}`} value={stop.name} onChange={(event) => update('stops', values.stops.map((item) => item.id === stop.id ? { ...item, name: event.target.value } : item))} placeholder="Enter stop location" />
                  <button type="button" title="Move stop up" aria-label={`Move stop ${index + 1} up`} disabled={index === 0} onClick={() => moveStop(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" title="Move stop down" aria-label={`Move stop ${index + 1} down`} disabled={index === values.stops.length - 1} onClick={() => moveStop(index, 1)}><ArrowDown size={14} /></button>
                  <button type="button" className={styles.removeStop} title="Remove stop" aria-label={`Remove stop ${index + 1}`} onClick={() => update('stops', values.stops.filter((item) => item.id !== stop.id))}><X size={14} /></button>
                </div>
              ))}
              <button type="button" className={styles.addStop} onClick={() => update('stops', [...values.stops, createStop()])}><Plus size={14} /> Add stop</button>
              {errors.stops && <span className={styles.fieldError} role="alert">{errors.stops}</span>}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Assignments</legend>
            <label className={styles.field}>
              <span>Assigned vehicle <b>*</b></span>
              <input value={values.assignedVehicle} onChange={(event) => update('assignedVehicle', event.target.value)} aria-invalid={Boolean(errors.assignedVehicle)} placeholder="e.g. TS 09 UB 7845" />
              {fieldError('assignedVehicle')}
            </label>
            <label className={styles.field}>
              <span>Assigned employees <b>*</b></span>
              <input type="number" min="0" step="1" value={values.assignedEmployees} onChange={(event) => update('assignedEmployees', event.target.value === '' ? -1 : Number(event.target.value))} aria-invalid={Boolean(errors.assignedEmployees)} />
              {fieldError('assignedEmployees')}
            </label>
            <label className={styles.field}>
              <span>Route status <b>*</b></span>
              <select value={values.status} onChange={(event) => update('status', event.target.value as RouteStatus)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Planning">Planning</option>
              </select>
            </label>
          </fieldset>
        </div>
        <footer className={styles.drawerFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primaryButton}><Check size={15} /> {route ? 'Save changes' : 'Create route'}</button>
        </footer>
      </form>
    </Drawer>
  );
}

function Drawer({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.drawer} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.drawerHeader}>
          <div><h2>{title}</h2><p>{subtitle}</p></div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close drawer"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function RouteDetails({ route, onClose }: { route: Route; onClose: () => void }) {
  return (
    <Drawer title="Route details" subtitle={`${route.code} · ${route.name}`} onClose={onClose}>
      <div className={styles.drawerBody}>
        <div className={styles.routeProfile}>
          <span className={styles.routeIcon}><Navigation size={20} /></span>
          <h3>{route.name}</h3>
          <span className={`${styles.statusBadge} ${statusClass(route.status)}`}><i />{route.status}</span>
        </div>
        <section className={styles.detailSection}>
          <h3>Route overview</h3>
          <div className={styles.detailRow}><span>Route code</span><strong>{route.code}</strong></div>
          <div className={styles.detailRow}><span>Source</span><strong><MapPin size={14} />{route.source}</strong></div>
          <div className={styles.detailRow}><span>Destination</span><strong><MapPin size={14} />{route.destination}</strong></div>
          <div className={styles.detailRow}><span>Total stops</span><strong>{route.stops.length}</strong></div>
        </section>
        <section className={styles.detailSection}>
          <h3>Stop sequence <span className={styles.stopCount}>{route.stops.length}</span></h3>
          <ol className={styles.timeline}>
            <li><span className={styles.timelineOrigin} /><div><strong>{route.source}</strong><small>Starting location</small></div></li>
            {route.stops.map((stop, index) => <li key={stop.id}><span className={styles.timelineStop}>{index + 1}</span><div><strong>{stop.name}</strong><small>Stop {index + 1}</small></div></li>)}
            <li><span className={`${styles.timelineOrigin} ${styles.timelineDestination}`} /><div><strong>{route.destination}</strong><small>Destination</small></div></li>
          </ol>
        </section>
        <section className={styles.detailSection}>
          <h3>Assignments</h3>
          <div className={styles.detailRow}><span>Assigned employees</span><strong><Users size={14} />{route.assignedEmployees}</strong></div>
          <div className={styles.detailRow}><span>Assigned vehicle</span><strong><BusFront size={14} />{route.assignedVehicle}</strong></div>
        </section>
        <section className={styles.detailSection}>
          <h3>Record information</h3>
          <div className={styles.detailRow}><span>Created</span><strong>{formatCreatedDate(route.createdAt)}</strong></div>
        </section>
      </div>
      <footer className={styles.drawerFooter}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
      </footer>
    </Drawer>
  );
}

function Pagination({
  count,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const first = count ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, count);
  return (
    <footer className={styles.pagination}>
      <span>Showing <strong>{first}–{last}</strong> of <strong>{count}</strong> routes</span>
      <div className={styles.paginationControls}>
        <label>Rows per page
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
        </label>
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
        <span>Page <strong>{page}</strong> of {pages}</span>
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPageChange(Math.min(pages, page + 1))}><ChevronRight size={16} /></button>
      </div>
    </footer>
  );
}

export default function RoutesListPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    const timer = window.setTimeout(() => {
      try {
        const seeded = MOCK_ROUTES.map((route) => ({ ...route, stops: route.stops.map((stop) => ({ ...stop })) }));
        if (active) setRoutes(seeded);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Routes could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [retry]);

  const filteredRoutes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return routes.filter((route) => {
      const matchesQuery = !normalizedQuery || [
        route.name,
        route.code,
        route.source,
        route.destination,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesQuery && (!statusFilter || route.status === statusFilter);
    });
  }, [routes, query, statusFilter]);

  const visibleRoutes = filteredRoutes.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = routes.filter((route) => route.status === 'Active').length;
  const inactiveCount = routes.filter((route) => route.status === 'Inactive').length;
  const planningCount = routes.filter((route) => route.status === 'Planning').length;
  const filtersActive = Boolean(query || statusFilter);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('');
    setPage(1);
  };

  const openForm = (route: Route | null) => {
    setSelectedRoute(route);
    setDrawerMode(route ? 'edit' : 'create');
  };

  const saveRoute = (values: RouteFormValues) => {
    if (selectedRoute) {
      setRoutes((current) => current.map((route) => route.id === selectedRoute.id
        ? { ...route, ...values }
        : route));
      notify(`${values.name} was updated.`);
    } else {
      const newRoute: Route = {
        ...values,
        id: `route-local-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setRoutes((current) => [...current, newRoute]);
      notify(`${values.name} was added to Routes List.`);
      setQuery('');
      setStatusFilter('');
      setPage(Math.ceil((routes.length + 1) / pageSize));
    }
    setDrawerMode(null);
    setSelectedRoute(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.name;
    const remaining = filteredRoutes.length - (filteredRoutes.some((route) => route.id === deleteTarget.id) ? 1 : 0);
    setRoutes((current) => current.filter((route) => route.id !== deleteTarget.id));
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(remaining / pageSize))));
    setDeleteTarget(null);
    notify(`${deletedName} was deleted.`);
  };

  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <div>
          <div className={styles.eyebrow}>TRANSPORTATION <span>/</span> ROUTES</div>
          <h1>Routes</h1>
          <p>Manage your company&apos;s transportation routes, stops and assignments.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => openForm(null)}><Plus size={16} /> Create Route</button>
      </header>

      <section className={styles.metrics} aria-label="Route summary">
        <article className={styles.metric}><span className={styles.metricIcon}><Navigation size={17} /></span><div><span>Total Routes</span><strong>{routes.length}</strong></div></article>
        <article className={styles.metric}><span className={`${styles.metricIcon} ${styles.metricGreen}`}><Check size={17} /></span><div><span>Active Routes</span><strong>{activeCount}</strong></div></article>
        <article className={styles.metric}><span className={`${styles.metricIcon} ${styles.metricGray}`}><CircleAlert size={17} /></span><div><span>Inactive Routes</span><strong>{inactiveCount}</strong></div></article>
        <article className={styles.metric}><span className={`${styles.metricIcon} ${styles.metricAmber}`}><MoreHorizontal size={17} /></span><div><span>Planning Routes</span><strong>{planningCount}</strong></div></article>
      </section>

      <section className={styles.listing} aria-label="Routes">
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search size={16} />
            <input type="search" aria-label="Search routes" placeholder="Search by route name, route code, source or destination..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
          <label className={styles.filterSelect}>
            <span className={styles.srOnly}>Route status</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Planning">Planning</option>
            </select>
            <ChevronDown size={14} />
          </label>
          {filtersActive && <>
            <div className={styles.activeFilters} aria-label="Active filters">
              {query && <button type="button" onClick={() => { setQuery(''); setPage(1); }}>Search: {query}<X size={12} /></button>}
              {statusFilter && <button type="button" onClick={() => { setStatusFilter(''); setPage(1); }}>{statusFilter}<X size={12} /></button>}
            </div>
            <button type="button" className={styles.clearFilters} onClick={clearFilters}>Clear filters</button>
          </>}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Route Code</th><th>Route Name</th><th>Source</th><th>Destination</th><th>Total Stops</th><th>Assigned Employees</th><th>Assigned Vehicle</th><th>Status</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead>
            <tbody>
              {loading && Array.from({ length: 5 }, (_, index) => <tr key={`loading-${index}`} aria-hidden="true"><td colSpan={9}><div className={styles.skeletonRow}><i /><i /><i /><i /></div></td></tr>)}
              {!loading && loadError && <tr><td className={styles.emptyState} colSpan={9}><CircleAlert size={22} /><strong>Unable to load routes</strong><span>{loadError}</span><button type="button" onClick={() => { setLoading(true); setRetry((current) => current + 1); }}>Retry</button></td></tr>}
              {!loading && !loadError && routes.length === 0 && <tr><td className={styles.emptyState} colSpan={9}><Navigation size={22} /><strong>No routes yet</strong><span>Create your first route to get started.</span><button type="button" onClick={() => openForm(null)}>Create Route</button></td></tr>}
              {!loading && !loadError && routes.length > 0 && visibleRoutes.map((route) => (
                <tr key={route.id}>
                  <td className={styles.routeCode}>{route.code}</td>
                  <td className={styles.routeName} title={route.name}>{route.name}</td>
                  <td className={styles.location} title={route.source}><MapPin size={13} />{route.source}</td>
                  <td className={styles.location} title={route.destination}><MapPin size={13} />{route.destination}</td>
                  <td>{route.stops.length}</td>
                  <td><span className={styles.inlineIcon}><Users size={14} />{route.assignedEmployees}</span></td>
                  <td className={styles.vehicle} title={route.assignedVehicle}><BusFront size={14} />{route.assignedVehicle}</td>
                  <td><span className={`${styles.statusBadge} ${statusClass(route.status)}`}><i />{route.status}</span></td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.actionButton} title="View route" aria-label={`View ${route.name}`} onClick={() => { setSelectedRoute(route); setDrawerMode('view'); }}><Eye size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !loadError && routes.length > 0 && visibleRoutes.length === 0 && <tr><td className={styles.emptyState} colSpan={9}><Search size={22} /><strong>No routes match your search</strong><span>Try another search or clear the selected filters.</span>{filtersActive && <button type="button" onClick={clearFilters}>Clear filters</button>}</td></tr>}
            </tbody>
          </table>
        </div>
        {!loading && !loadError && routes.length > 0 && <Pagination
          count={filteredRoutes.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />}
      </section>

      <p className={styles.dataNotice}><span /> Sample route data is stored locally in this session. No records are sent to a server.</p>
      {toast && <div className={styles.toast} role="status">{toast}</div>}

      {drawerMode === 'create' && <RouteForm route={null} routes={routes} onClose={() => setDrawerMode(null)} onSave={saveRoute} />}
      {drawerMode === 'edit' && selectedRoute && <RouteForm route={selectedRoute} routes={routes} onClose={() => { setDrawerMode(null); setSelectedRoute(null); }} onSave={saveRoute} />}
      {drawerMode === 'view' && selectedRoute && <RouteDetails route={selectedRoute} onClose={() => { setDrawerMode(null); setSelectedRoute(null); }} />}

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete route?"
        subtitle="This action only removes the route from the local preview."
      >
        {deleteTarget && <div className={styles.deleteDialog}>
          <p>Delete <strong>{deleteTarget.name}</strong> (<strong>{deleteTarget.code}</strong>)? This cannot be undone.</p>
          <div>
            <button type="button" className={styles.secondaryButton} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button type="button" className={styles.dangerButton} onClick={confirmDelete}><Trash2 size={14} /> Delete route</button>
          </div>
        </div>}
      </Modal>
    </main>
  );
}
