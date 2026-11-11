'use client';

import { useMemo, useState } from 'react';
import type { RouteWorkspaceRoute } from '../../lib/mockRouteWorkspace';
import { calculateRouteWorkspaceAnalytics } from '../../lib/routeWorkspaceAnalytics';
import type {
  RouteActivityPoint,
  RouteWorkspaceAnalytics,
} from '../../lib/routeWorkspaceAnalytics';

const STATUS_COLORS = {
  notStarted: 'var(--rd-amber)',
  inProgress: 'var(--rd-blue)',
  completed: 'var(--rd-green)',
  cancelled: 'var(--rd-faint)',
  other: 'var(--rd-purple)',
};

const panelStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
};

function formatMinutes(value: number | null) {
  return value === null ? 'Awaiting data' : `${Math.round(value)} min`;
}

function StatusDonut({ analytics }: { analytics: RouteWorkspaceAnalytics }) {
  const segments = [
    { label: 'Not started', value: analytics.notStarted, color: STATUS_COLORS.notStarted },
    { label: 'In progress', value: analytics.inProgress, color: STATUS_COLORS.inProgress },
    { label: 'Completed', value: analytics.completed, color: STATUS_COLORS.completed },
    { label: 'Cancelled', value: analytics.cancelled, color: STATUS_COLORS.cancelled },
  ];
  const knownRoutes = segments.reduce((sum, segment) => sum + segment.value, 0);
  const other = Math.max(0, analytics.totalRoutes - knownRoutes);
  if (other > 0) segments.push({ label: 'Other', value: other, color: STATUS_COLORS.other });

  const radius = 39;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', alignItems: 'center', gap: 18 }}>
      <svg viewBox="0 0 100 100" role="img" aria-label="Route status distribution" style={{ width: 120, maxWidth: '100%', height: 'auto', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-surface-muted)" strokeWidth="12" />
        {analytics.totalRoutes > 0 && segments.filter((segment) => segment.value > 0).map((segment) => {
          const length = (segment.value / analytics.totalRoutes) * circumference;
          const circle = (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="12"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            >
              <title>{segment.label}: {segment.value}</title>
            </circle>
          );
          offset += length;
          return circle;
        })}
        <text x="50" y="47" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700" style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}>{analytics.totalRoutes}</text>
        <text x="50" y="62" textAnchor="middle" fill="var(--text-muted)" fontSize="8" style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}>ROUTES</text>
      </svg>
      <div style={{ display: 'grid', gap: 10 }}>
        {segments.map((segment) => (
          <div key={segment.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: segment.color }} />{segment.label}</span>
            <strong style={{ color: 'var(--text-primary)', fontWeight: 650 }}>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityChart({ activity }: { activity: RouteActivityPoint[] }) {
  const [period, setPeriod] = useState<'TODAY' | '7D' | '30D'>('7D');
  const visibleActivity = useMemo(() => {
    const now = Date.now();
    const cutoff = period === 'TODAY'
      ? new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()
      : now - (period === '7D' ? 7 : 30) * 24 * 60 * 60 * 1000;
    return activity.filter((point) => point.at >= cutoff);
  }, [activity, period]);

  if (visibleActivity.length === 0) {
    return (
      <div>
        <div className="routePeriodToggle" role="group" aria-label="Activity chart time range">
          {(['TODAY', '7D', '30D'] as const).map((item) => (
            <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>
              {item === 'TODAY' ? 'Today' : item === '7D' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
        <div style={{ padding: '22px 14px', borderRadius: 8, background: 'var(--bg-surface-muted)', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>
          {activity.length === 0
            ? 'Route start and completion timestamps are not available for these routes. Activity will appear when operational events are recorded.'
            : 'No lifecycle events in this period.'}
        </div>
      </div>
    );
  }

  const width = 560;
  const height = 150;
  const padding = { top: 14, right: 20, bottom: 30, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const minTime = visibleActivity[0].at;
  const maxTime = visibleActivity[visibleActivity.length - 1].at;
  const timeRange = Math.max(1, maxTime - minTime);
  const maxActive = Math.max(1, ...visibleActivity.map((point) => point.activeRoutes));
  const points = visibleActivity.map((point) => ({
    ...point,
    x: padding.left + ((point.at - minTime) / timeRange) * plotWidth,
    y: padding.top + plotHeight - (point.activeRoutes / maxActive) * plotHeight,
  }));
  const smoothPath = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point, index) => {
        const previous = points[index];
        const middleX = (previous.x + point.x) / 2;
        return `C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
      }).join(' ')}`
    : '';
  const areaPath = points.length > 1
    ? `${smoothPath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`
    : '';
  const timeLabel = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
    <div className="routePeriodToggle" role="group" aria-label="Activity chart time range">
      {(['TODAY', '7D', '30D'] as const).map((item) => (
        <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>
          {item === 'TODAY' ? 'Today' : item === '7D' ? '7 days' : '30 days'}
        </button>
      ))}
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Active route count from recorded route start and completion events" style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="route-activity-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--rd-purple)" stopOpacity=".22" />
          <stop offset="100%" stopColor="var(--rd-purple)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((tick) => {
        const value = Math.round(maxActive * (1 - tick / 2));
        const y = padding.top + (plotHeight * tick) / 2;
        return (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 5" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">{value}</text>
          </g>
        );
      })}
      {points.length > 1 && <path d={areaPath} fill="url(#route-activity-fill)" />}
      {points.length > 1 && <path d={smoothPath} fill="none" stroke="var(--rd-purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((point, index) => (
        <g key={`${point.at}-${index}`}>
          <circle cx={point.x} cy={point.y} r="4" fill="var(--rd-purple)">
            <title>{timeLabel(point.at)} · {point.activeRoutes} active routes</title>
          </circle>
        </g>
      ))}
      <text x={padding.left} y={height - 7} fill="var(--text-muted)" fontSize="10">{timeLabel(minTime)}</text>
      <text x={width - padding.right} y={height - 7} textAnchor="end" fill="var(--text-muted)" fontSize="10">{timeLabel(maxTime)}</text>
    </svg>
    </div>
  );
}

function DurationComparison({ routes, analytics }: { routes: RouteWorkspaceRoute[]; analytics: RouteWorkspaceAnalytics }) {
  const rows = routes.map((route, index) => ({
    route,
    planned: route.plannedDurationMinutes ?? route.durationMinutes,
    actual: analytics.routes[index]?.actualDurationMinutes ?? null,
  })).filter(({ planned }) => Number.isFinite(planned) && planned > 0);
  if (rows.length === 0) {
    return <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>Planned duration is not available.</p>;
  }

  const maxDuration = Math.max(1, ...rows.flatMap(({ planned, actual }) => [planned, actual ?? 0]));
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {rows.map(({ route, planned, actual }) => (
        <div key={route.id} style={{ display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr) 62px', alignItems: 'center', gap: 8 }}>
          <strong style={{ overflow: 'hidden', color: 'var(--text-secondary)', fontSize: 11, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.routeCode}</strong>
          <div style={{ display: 'grid', gap: 5 }}>
            <div title={`Planned: ${Math.round(planned)} minutes`} style={{ height: 7, width: `${Math.max(3, (planned / maxDuration) * 100)}%`, borderRadius: 6, background: 'var(--rd-purple)' }} />
            {actual !== null && <div title={`Actual: ${Math.round(actual)} minutes`} style={{ height: 7, width: `${Math.max(3, (actual / maxDuration) * 100)}%`, borderRadius: 6, background: 'var(--rd-teal)' }} />}
          </div>
          <span style={{ textAlign: 'right', color: actual === null ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: 11, whiteSpace: 'nowrap' }}>
            {actual === null ? 'Awaiting' : `${Math.round(actual)} min`}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 7, borderRadius: 2, background: 'var(--rd-purple)' }} />Planned</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 7, borderRadius: 2, background: 'var(--rd-teal)' }} />Actual</span>
        {!rows.some(({ actual }) => actual !== null) && <span>Actual duration appears after start and completion times are recorded.</span>}
      </div>
    </div>
  );
}

export default function RouteAnalyticsPanel({
  routes,
  source,
  gpsReportingRoutes = 0,
  gpsTotalRoutes = 0,
  lastGpsFixAt = null,
}: {
  routes: RouteWorkspaceRoute[];
  source: 'API' | 'DEMO';
  gpsReportingRoutes?: number;
  gpsTotalRoutes?: number;
  lastGpsFixAt?: number | null;
}) {
  const analytics = calculateRouteWorkspaceAnalytics(routes);
  const hasCsvRoutes = routes.some((route) => route.source === 'CSV');
  const dataSourceLabel = source === 'API'
    ? hasCsvRoutes ? 'PRODUCTION + CSV PLAN' : 'PRODUCTION SNAPSHOT'
    : hasCsvRoutes ? 'CSV PLAN · NOT LIVE' : 'DEMO · NOT LIVE';

  return (
    <section className="routeChartPanel" style={{ ...panelStyle, padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17 }}>Route analytics</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Calculated from this company&apos;s route records</p>
        </div>
        <span style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--bg-surface-muted)', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 650, whiteSpace: 'nowrap' }}>
          {dataSourceLabel}
        </span>
      </div>

      <div className="routeAnalyticsSections" style={{ display: 'grid', gap: 18, marginTop: 16 }}>
        <div className="routeAnalyticsSection">
          <h3 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: 13, fontWeight: 650 }}>Route status</h3>
          {routes.length > 0 ? <StatusDonut analytics={analytics} /> : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No route status data yet.</p>}
        </div>

        <div className="routeAnalyticsSection" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, fontWeight: 650 }}>Employee pickup completion</h3>
            <strong style={{ color: analytics.pickupCompletionPct === null ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: 13 }}>
              {analytics.pickupCompletionPct === null ? 'Awaiting data' : `${analytics.pickupCompletionPct.toFixed(2)}%`}
            </strong>
          </div>
          <div
            role="img"
            aria-label={`${analytics.pickedUpEmployees} picked up, ${analytics.awaitingPickupEmployees} awaiting, ${analytics.missedPickups} missed, ${analytics.pickupAssignedEmployees - analytics.pickupStatusCoverage} not reported`}
            style={{ display: 'flex', height: 10, overflow: 'hidden', borderRadius: 999, background: analytics.pickupAssignedEmployees === 0 ? 'repeating-linear-gradient(135deg, var(--bg-surface-muted), var(--bg-surface-muted) 5px, var(--border-subtle) 5px, var(--border-subtle) 7px)' : 'var(--bg-surface-muted)' }}
          >
            {analytics.pickupAssignedEmployees > 0 && [
              { label: 'Picked up', value: analytics.pickedUpEmployees, color: 'var(--rd-teal)' },
              { label: 'Awaiting', value: analytics.awaitingPickupEmployees, color: 'var(--rd-blue)' },
              { label: 'Missed', value: analytics.missedPickups, color: 'var(--rd-red)' },
              { label: 'Not reported', value: analytics.pickupAssignedEmployees - analytics.pickupStatusCoverage, color: 'var(--rd-faint)' },
            ].map((segment) => segment.value > 0 && (
              <span
                key={segment.label}
                title={`${segment.label}: ${segment.value}`}
                style={{ width: `${(segment.value / analytics.pickupAssignedEmployees) * 100}%`, background: segment.color, transition: 'width 180ms ease' }}
              />
            ))}
          </div>
          <p style={{ margin: '7px 0 0', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5 }}>
            {analytics.pickupAssignedEmployees === 0
              ? 'No login pickup stops in this view.'
              : `${analytics.pickedUpEmployees} picked up · ${analytics.awaitingPickupEmployees} awaiting · ${analytics.missedPickups} missed · ${analytics.pickupAssignedEmployees - analytics.pickupStatusCoverage} status not reported`}
          </p>
          <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5 }}>
            Calculated from assigned and recorded pickups only.
          </p>
        </div>

        <div className="routeAnalyticsSection" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, fontWeight: 650 }}>Planned vs actual duration</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>minutes</span>
          </div>
          <DurationComparison routes={routes} analytics={analytics} />
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 13, color: 'var(--text-secondary)', fontSize: 11 }}>
            <span>Avg. planned <strong style={{ color: 'var(--text-primary)' }}>{formatMinutes(analytics.averagePlannedDurationMinutes)}</strong></span>
            <span>Avg. actual <strong style={{ color: 'var(--text-primary)' }}>{formatMinutes(analytics.averageActualDurationMinutes)}</strong></span>
            <span>Avg. delay <strong style={{ color: 'var(--text-primary)' }}>{formatMinutes(analytics.averageDelayMinutes)}</strong></span>
          </div>
        </div>

        <div className="routeAnalyticsSection" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 13, fontWeight: 650 }}>Active routes over time</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>recorded events</span>
          </div>
          <ActivityChart activity={analytics.activity} />
          {source === 'API' && (
            <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5 }}>
              GPS reporting: {gpsReportingRoutes}/{gpsTotalRoutes} routes with a fix in the last 45 seconds
              {lastGpsFixAt ? ` · Last fix ${new Date(lastGpsFixAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ' · Awaiting GPS data'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
