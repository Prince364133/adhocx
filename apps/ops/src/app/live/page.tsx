'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  BusFront,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  Radio,
  RefreshCw,
  Route,
  Users,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import type { LiveOperationsResponse } from '../../lib/api/opsTypes';
import styles from './live-operations.module.css';

const ROUTES_PER_PAGE = 25;

function formatDay(value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(date);
}

function formatTimestamp(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));
}

function readable(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middle = (previous.x + point.x) / 2;
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function TrendChart({ data }: { data: LiveOperationsResponse['trend'] }) {
  const width = 900;
  const height = 250;
  const inset = { top: 18, right: 20, bottom: 38, left: 42 };
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const maxValue = Math.max(1, ...data.map((day) => day.total));
  const scaleMax = Math.ceil(maxValue / 4) * 4 || 4;
  const x = (index: number) => inset.left + (index * plotWidth) / Math.max(data.length - 1, 1);
  const y = (value: number) => inset.top + plotHeight - (value / scaleMax) * plotHeight;
  const totalPoints = data.map((day, index) => ({ x: x(index), y: y(day.total) }));
  const completedPoints = data.map((day, index) => ({ x: x(index), y: y(day.completed) }));
  const activePoints = data.map((day, index) => ({ x: x(index), y: y(day.inProgress) }));
  const areaPath = totalPoints.length
    ? `${smoothPath(totalPoints)} L ${x(data.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`
    : '';
  const labelIndexes = data.map((_, index) => index).filter((index) => index % 2 === 0 || index === data.length - 1);

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartLegend}>
        <span><i className={styles.legendTotal} /> All routes</span>
        <span><i className={styles.legendActive} /> Assigned / in progress</span>
        <span><i className={styles.legendCompleted} /> Completed</span>
      </div>
      <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily route totals for the last 14 days">
        {[0, 1, 2, 3, 4].map((step) => {
          const value = (scaleMax * step) / 4;
          const yPos = y(value);
          return (
            <g key={step}>
              <line x1={inset.left} x2={width - inset.right} y1={yPos} y2={yPos} className={styles.gridLine} />
              <text x={inset.left - 10} y={yPos + 4} textAnchor="end" className={styles.axisLabel}>
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} className={styles.chartArea} />
        <path d={smoothPath(totalPoints)} className={styles.totalLine} />
        <path d={smoothPath(activePoints)} className={styles.activeLine} />
        <path d={smoothPath(completedPoints)} className={styles.completedLine} />
        {labelIndexes.map((index) => (
          <text key={data[index].date} x={x(index)} y={height - 10} textAnchor="middle" className={styles.axisLabel}>
            {formatDay(data[index].date)}
          </text>
        ))}
        {data.map((day, index) => (
          <g key={day.date}>
            <circle cx={x(index)} cy={y(day.total)} r="3" className={styles.totalDot}>
              <title>{`${day.date}: ${day.total} routes`}</title>
            </circle>
            <circle cx={x(index)} cy={y(day.completed)} r="2.5" className={styles.completedDot}>
              <title>{`${day.date}: ${day.completed} completed`}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Building2;
  tone: 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'slate';
}) {
  return (
    <article className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles[tone]}`}><Icon size={18} /></div>
      <div className={styles.statContent}>
        <span className={styles.statLabel}>{label}</span>
        <strong className={styles.statValue}>{value.toLocaleString()}</strong>
        <span className={styles.statDetail}>{detail}</span>
      </div>
    </article>
  );
}

export default function LiveOperationsPage() {
  const [data, setData] = useState<LiveOperationsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routePage, setRoutePage] = useState(1);
  const inFlight = useRef(false);
  const pendingRefresh = useRef(false);
  const hasData = useRef(false);
  const latestLoad = useRef<((background: boolean) => Promise<void>) | null>(null);

  const loadData = useCallback(async (background = false) => {
    if (inFlight.current) {
      pendingRefresh.current = true;
      return;
    }
    inFlight.current = true;
    if (background || hasData.current) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await opsApi.getLiveOperations({ routePage, routePageSize: ROUTES_PER_PAGE });
      setData(result);
      setError('');
      hasData.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Live Operations data.');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
      if (pendingRefresh.current) {
        pendingRefresh.current = false;
        window.setTimeout(() => {
          if (latestLoad.current) void latestLoad.current(true);
        }, 0);
      }
    }
  }, [routePage]);
  latestLoad.current = loadData;

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => void loadData(true), 15_000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  const summary = data?.summary;
  const routePages = data?.routes.totalPages ?? 0;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}><span className={styles.liveDot} /> Cross-company command center</div>
          <h1>Live Operations</h1>
          <p>Company-wide ride activity, route health and operational changes in one view.</p>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.freshness}>
            <Radio size={15} />
            <span>{data ? `Updated ${formatTimestamp(data.asOf, data.timezone)}` : 'Waiting for live data'}</span>
          </div>
          <button type="button" className={styles.refreshButton} onClick={() => void loadData(true)} disabled={refreshing}>
            {refreshing ? <LoaderCircle size={16} className={styles.spin} /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={17} />
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()}>Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className={styles.loading}><LoaderCircle size={24} className={styles.spin} /> Loading live operations data…</div>
      ) : data ? (
        <>
          <section className={styles.statsGrid} aria-label="Live operations summary">
            <StatCard label="Companies" value={summary!.companies} detail={`${summary!.activeCompanies} active`} icon={Building2} tone="violet" />
            <StatCard label="Active routes" value={summary!.activeRoutes} detail="Assigned or in progress today" icon={BusFront} tone="blue" />
            <StatCard label="Planned routes" value={summary!.plannedRoutes} detail="Planned or dispatching today" icon={Route} tone="slate" />
            <StatCard label="Completed today" value={summary!.completedToday} detail="Routes marked completed" icon={CheckCircle} tone="green" />
            <StatCard label="At risk" value={summary!.atRiskRoutes} detail="Pickup window needs attention" icon={AlertTriangle} tone="amber" />
            <StatCard label="GPS needs attention" value={summary!.staleGpsRoutes} detail="Stale or offline active routes" icon={Radio} tone="red" />
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionEyebrow}><Activity size={14} /> Fleet pulse</div>
                <h2>Route activity</h2>
                <p>{formatDay(data.period.from)} – {formatDay(data.period.to, { year: 'numeric', month: 'short', day: 'numeric' })} · {summary!.routes14Days.toLocaleString()} total routes</p>
              </div>
              <span className={styles.dataBadge}>14-day database aggregate</span>
            </div>
            <TrendChart data={data.trend} />
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionEyebrow}><Building2 size={14} /> Company overview</div>
                <h2>Operations by company</h2>
                <p>Route volume and active workforce across every company.</p>
              </div>
              <span className={styles.countBadge}>{data.companies.length} companies</span>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Company</th><th>Status</th><th>Routes · 14 days</th><th>Today</th><th>In progress · 14 days</th><th>Completed · 14 days</th><th>Employees</th><th>Offices</th>
                  </tr>
                </thead>
                <tbody>
                  {data.companies.map((company) => (
                    <tr key={company.id}>
                      <td><div className={styles.companyName}>{company.name}</div><span className={styles.companyCode}>{company.code}</span></td>
                      <td><span className={`${styles.statusBadge} ${company.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive}`}>{readable(company.status)}</span></td>
                      <td className={styles.strongCell}>{company.routes14Days.toLocaleString()}</td>
                      <td>{company.routesToday.toLocaleString()}</td>
                      <td>{company.inProgress14Days.toLocaleString()}</td>
                      <td>{company.completed14Days.toLocaleString()}</td>
                      <td><span className={styles.inlineMetric}><Users size={14} />{company.activeEmployees.toLocaleString()}</span></td>
                      <td>{company.offices.toLocaleString()}</td>
                    </tr>
                  ))}
                  {data.companies.length === 0 && <tr><td colSpan={8} className={styles.emptyCell}>No companies are currently available.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionEyebrow}><Route size={14} /> Recent route activity</div>
                <h2>Routes &amp; trips</h2>
                <p>All route statuses, newest shift dates first. Select a route or driver to open its existing detail page.</p>
              </div>
              <span className={styles.countBadge}>{data.routes.total.toLocaleString()} routes · 14 days</span>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Route</th><th>Company / office</th><th>Shift</th><th>Driver / vehicle</th><th>Passengers</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.routes.items.map((route) => (
                    <tr key={route.id}>
                      <td>
                        <Link className={styles.routeLink} href={`/routes/${encodeURIComponent(route.id)}`}>
                          <span>{route.direction === 'LOGIN' ? 'Login' : 'Logout'} route</span><ArrowUpRight size={14} />
                        </Link>
                        <span className={styles.mutedCell}>{route.id.slice(0, 8)}</span>
                      </td>
                      <td><span className={styles.companyName}>{route.tenant?.name ?? 'Company unavailable'}</span><span className={styles.mutedCell}>{route.office?.name ?? 'Office unavailable'}</span></td>
                      <td><span>{formatDay(route.shiftDate)}</span><span className={styles.mutedCell}>{route.shiftTime}</span></td>
                      <td>
                        {route.driverId ? (
                          <Link className={styles.driverLink} href={`/drivers/${encodeURIComponent(route.driverId)}`}>{route.driver?.fullName ?? 'Driver profile'} <ArrowUpRight size={12} /></Link>
                        ) : <span className={styles.mutedCell}>Unassigned</span>}
                        <span className={styles.mutedCell}>{route.vehicle?.registrationNumber ?? 'No vehicle assigned'}</span>
                      </td>
                      <td><span className={styles.inlineMetric}><Users size={14} />{route.assignedPassengerCount}/{route.maxCapacity}</span><span className={styles.mutedCell}>{route._count?.stops ?? 0} stops</span></td>
                      <td><span className={styles.statusBadge} data-status={route.status}>{readable(route.status)}</span></td>
                    </tr>
                  ))}
                  {data.routes.items.length === 0 && <tr><td colSpan={6} className={styles.emptyCell}>No routes were found for this 14-day period.</td></tr>}
                </tbody>
              </table>
            </div>
            {routePages > 1 && (
              <div className={styles.pagination}>
                <span>Page {data.routes.page} of {routePages} · {data.routes.total.toLocaleString()} routes</span>
                <div>
                  <button type="button" aria-label="Previous routes page" disabled={routePage <= 1} onClick={() => setRoutePage((page) => Math.max(1, page - 1))}><ChevronLeft size={17} /> Previous</button>
                  <button type="button" aria-label="Next routes page" disabled={routePage >= routePages} onClick={() => setRoutePage((page) => Math.min(routePages, page + 1))}>Next <ChevronRight size={17} /></button>
                </div>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionEyebrow}><Clock3 size={14} /> Audit trail</div>
                <h2>Recent system activity</h2>
                <p>Corporate operations recorded in the system audit log.</p>
              </div>
              <span className={styles.countBadge}>{data.activities.length} recent events</span>
            </div>
            <div className={styles.activityList}>
              {data.activities.map((activity) => (
                <article key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}><Activity size={15} /></div>
                  <div className={styles.activityBody}>
                    <strong>{readable(activity.action)}</strong>
                    <span>{readable(activity.entityName)}{activity.actorRole ? ` · ${readable(activity.actorRole)}` : ''}</span>
                  </div>
                  <time dateTime={activity.createdAt}>{formatTimestamp(activity.createdAt, data.timezone)}</time>
                  {activity.entityName.includes('ROUTE') && activity.entityId && (
                    <Link className={styles.activityLink} href={`/routes/${encodeURIComponent(activity.entityId)}`} aria-label="Open route detail"><ArrowUpRight size={15} /></Link>
                  )}
                </article>
              ))}
              {data.activities.length === 0 && <div className={styles.emptyActivity}>No corporate system activity has been recorded in the selected period.</div>}
            </div>
          </section>

          <footer className={styles.pageFooter}>
            <span><MapPin size={14} /> Shift dates and activity shown in {data.timezone}.</span>
            <span>Auto-refreshes every 15 seconds{refreshing ? ' · refreshing' : ''}</span>
          </footer>
        </>
      ) : null}
    </main>
  );
}
