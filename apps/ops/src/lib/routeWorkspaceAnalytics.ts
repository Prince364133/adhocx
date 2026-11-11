import type { RouteWorkspaceRoute } from './mockRouteWorkspace';

export interface RouteActivityPoint {
  at: number;
  activeRoutes: number;
}

export interface RouteWorkspaceRouteAnalytics {
  status: string;
  assignedEmployees: number;
  pickupAssignedEmployees: number;
  pickedUpEmployees: number;
  awaitingPickupEmployees: number;
  missedPickups: number;
  pickupStatusCoverage: number;
  pickupCompletionPct: number | null;
  actualDurationMinutes: number | null;
  plannedArrivalAt: number | null;
  actualArrivalAt: number | null;
  delayMinutes: number | null;
}

export interface RouteWorkspaceAnalytics {
  totalRoutes: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  delayed: number;
  cancelled: number;
  assignedEmployees: number;
  pickupAssignedEmployees: number;
  pickedUpEmployees: number;
  awaitingPickupEmployees: number;
  missedPickups: number;
  pickupStatusCoverage: number;
  pickupCompletionPct: number | null;
  averagePlannedDurationMinutes: number | null;
  averageActualDurationMinutes: number | null;
  averageDelayMinutes: number | null;
  onTimeArrivals: number;
  measuredArrivals: number;
  activity: RouteActivityPoint[];
  routes: RouteWorkspaceRouteAnalytics[];
}

function validTimestamp(value?: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function durationMinutes(start?: string, end?: string): number | null {
  const startAt = validTimestamp(start);
  const endAt = validTimestamp(end);
  if (startAt === null || endAt === null || endAt < startAt) return null;
  return (endAt - startAt) / 60_000;
}

export function calculateRouteWorkspaceRouteAnalytics(
  route: RouteWorkspaceRoute,
  now: number = Date.now(),
): RouteWorkspaceRouteAnalytics {
  const status = route.status.trim().toUpperCase();
  const activeEmployees = status === 'CANCELLED'
    ? []
    : route.employees.filter((employee) => employee.pickupStatus !== 'CANCELLED');
  const pickupEmployees = route.direction === 'LOGIN'
    ? activeEmployees.filter((employee) => employee.stopType !== 'DROPOFF')
    : [];
  let pickedUpEmployees = 0;
  let awaitingPickupEmployees = 0;
  let missedPickups = 0;
  let pickupStatusCoverage = 0;
  for (const employee of pickupEmployees) {
    switch (employee.pickupStatus) {
      case 'BOARDED':
        pickedUpEmployees += 1;
        pickupStatusCoverage += 1;
        break;
      case 'NO_SHOW':
        missedPickups += 1;
        pickupStatusCoverage += 1;
        break;
      case 'PENDING':
      case 'ARRIVED':
        awaitingPickupEmployees += 1;
        pickupStatusCoverage += 1;
        break;
    }
  }
  const plannedArrivalAt = validTimestamp(route.plannedArrivalAt);
  const actualArrivalAt = validTimestamp(route.actualArrivalAt);
  const delayMinutes =
    plannedArrivalAt !== null && actualArrivalAt !== null
      ? Math.max(0, (actualArrivalAt - plannedArrivalAt) / 60_000)
      : status === 'IN_TRANSIT' && plannedArrivalAt !== null && now > plannedArrivalAt
        ? (now - plannedArrivalAt) / 60_000
        : null;

  return {
    status,
    assignedEmployees: activeEmployees.length,
    pickupAssignedEmployees: pickupEmployees.length,
    pickedUpEmployees,
    awaitingPickupEmployees,
    missedPickups,
    pickupStatusCoverage,
    pickupCompletionPct:
      pickupEmployees.length > 0 && pickupStatusCoverage === pickupEmployees.length
        ? (pickedUpEmployees / pickupEmployees.length) * 100
        : null,
    actualDurationMinutes: durationMinutes(route.startedAt, route.completedAt),
    plannedArrivalAt,
    actualArrivalAt,
    delayMinutes,
  };
}

export function calculateRouteWorkspaceAnalytics(
  routes: RouteWorkspaceRoute[],
  now: number = Date.now(),
): RouteWorkspaceAnalytics {
  let notStarted = 0;
  let inProgress = 0;
  let completed = 0;
  let delayed = 0;
  let cancelled = 0;
  let assignedEmployees = 0;
  let pickupAssignedEmployees = 0;
  let pickedUpEmployees = 0;
  let awaitingPickupEmployees = 0;
  let missedPickups = 0;
  let pickupStatusCoverage = 0;
  let onTimeArrivals = 0;
  let measuredArrivals = 0;
  const plannedDurations: number[] = [];
  const actualDurations: number[] = [];
  const delayMinutes: number[] = [];
  const activityEvents: Array<{ at: number; delta: number }> = [];
  const routeAnalytics = routes.map((route) => calculateRouteWorkspaceRouteAnalytics(route, now));

  for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
    const route = routes[routeIndex];
    const routeAnalyticsItem = routeAnalytics[routeIndex];
    const status = routeAnalyticsItem.status;
    if (status === 'CANCELLED') {
      cancelled += 1;
    } else if (status === 'COMPLETED') {
      completed += 1;
    } else if (status === 'IN_TRANSIT') {
      inProgress += 1;
    } else if (['PLANNED', 'DISPATCHING', 'ASSIGNED'].includes(status)) {
      notStarted += 1;
    }

    if (status !== 'CANCELLED') {
      assignedEmployees += routeAnalyticsItem.assignedEmployees;
      pickupAssignedEmployees += routeAnalyticsItem.pickupAssignedEmployees;
      pickedUpEmployees += routeAnalyticsItem.pickedUpEmployees;
      awaitingPickupEmployees += routeAnalyticsItem.awaitingPickupEmployees;
      missedPickups += routeAnalyticsItem.missedPickups;
      pickupStatusCoverage += routeAnalyticsItem.pickupStatusCoverage;

      const plannedDuration = route.plannedDurationMinutes ?? route.durationMinutes;
      if (Number.isFinite(plannedDuration) && plannedDuration > 0) {
        plannedDurations.push(plannedDuration);
      }
      if (routeAnalyticsItem.actualDurationMinutes !== null) {
        actualDurations.push(routeAnalyticsItem.actualDurationMinutes);
      }
    }

    const actualArrival = routeAnalyticsItem.actualArrivalAt;
    if (routeAnalyticsItem.plannedArrivalAt !== null && actualArrival !== null) {
      measuredArrivals += 1;
      if (routeAnalyticsItem.delayMinutes === 0) onTimeArrivals += 1;
    }
    if (routeAnalyticsItem.delayMinutes !== null) {
      if (routeAnalyticsItem.delayMinutes > 0) delayed += 1;
      delayMinutes.push(routeAnalyticsItem.delayMinutes);
    }

    const startedAt = validTimestamp(route.startedAt);
    const completedAt = validTimestamp(route.completedAt);
    if (startedAt !== null) activityEvents.push({ at: startedAt, delta: 1 });
    if (completedAt !== null && startedAt !== null && completedAt >= startedAt) {
      activityEvents.push({ at: completedAt, delta: -1 });
    }
  }

  activityEvents.sort((left, right) => left.at - right.at);
  let activeRoutes = 0;
  const activity: RouteActivityPoint[] = [];
  for (let index = 0; index < activityEvents.length;) {
    const at = activityEvents[index].at;
    let delta = 0;
    while (index < activityEvents.length && activityEvents[index].at === at) {
      delta += activityEvents[index].delta;
      index += 1;
    }
    activeRoutes = Math.max(0, activeRoutes + delta);
    activity.push({ at, activeRoutes });
  }

  return {
    totalRoutes: routes.length,
    notStarted,
    inProgress,
    completed,
    delayed,
    cancelled,
    assignedEmployees,
    pickupAssignedEmployees,
    pickedUpEmployees,
    awaitingPickupEmployees,
    missedPickups,
    pickupStatusCoverage,
    pickupCompletionPct:
      pickupAssignedEmployees > 0 && pickupStatusCoverage === pickupAssignedEmployees
        ? (pickedUpEmployees / pickupAssignedEmployees) * 100
        : null,
    averagePlannedDurationMinutes:
      plannedDurations.length > 0
        ? plannedDurations.reduce((total, value) => total + value, 0) / plannedDurations.length
        : null,
    averageActualDurationMinutes:
      actualDurations.length > 0
        ? actualDurations.reduce((total, value) => total + value, 0) / actualDurations.length
        : null,
    averageDelayMinutes:
      delayMinutes.length > 0
        ? delayMinutes.reduce((total, value) => total + value, 0) / delayMinutes.length
        : null,
    onTimeArrivals,
    measuredArrivals,
    activity,
    routes: routeAnalytics,
  };
}
