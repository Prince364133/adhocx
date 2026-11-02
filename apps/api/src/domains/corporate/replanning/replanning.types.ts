import { CutoffEvaluation, CutoffOverride } from './cutoff-policy';

export type ReplanAction = 'CANCEL' | 'RESCHEDULE';

export interface ReplanContext {
  /** Clock injection for deterministic tests; defaults to `new Date()`. */
  now?: Date;
  /** Admin override of the 9h cutoff (also applied to the new shift's pickup on reschedule). */
  override?: CutoffOverride | null;
  /** Result of the cutoff evaluation already performed by the caller (for audit trail). */
  cutoff?: CutoffEvaluation;
}

export interface RouteRemovalOutcome {
  routeId: string;
  routeStatusBefore: string;
  routeStatusAfter: string;
  /** PLANNED routes are re-sequenced and re-timed; dispatched routes only get the stop cancelled in place. */
  mode: 'RESEQUENCED' | 'CANCELLED_IN_PLACE';
  routeCancelled: boolean;
  remainingPassengers: number;
  driverNotified: boolean;
}

export interface RouteInsertionOutcome {
  routeId: string;
  stopId: string;
  stopSequence: number;
  plannedEta: Date;
  createdNewRoute: boolean;
  addedDetourMeters: number;
}

export interface RouteMergeOutcome {
  fromRouteId: string;
  intoRouteId: string;
  movedPassengers: number;
}

export interface ReplanResult {
  requestId: string;
  action: ReplanAction;
  /** True when the request was already in the requested end-state (double submit). */
  idempotent: boolean;
  request: Record<string, any>;
  cutoff?: CutoffEvaluation;
  removal?: RouteRemovalOutcome;
  insertion?: RouteInsertionOutcome;
  merges: RouteMergeOutcome[];
}
