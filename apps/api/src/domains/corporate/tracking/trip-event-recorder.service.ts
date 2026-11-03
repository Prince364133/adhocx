import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AssignmentEventInput, CorporateTripEventType, TripEventInput } from './tracking.types';

export interface ReplanEventInput {
  tenantId: string;
  requestId: string;
  action: 'CANCEL' | 'RESCHEDULE';
  /** The request's stop before re-planning (removed / cancelled in place). */
  stopId?: string | null;
  removal?: { routeId: string; mode: string; routeCancelled: boolean; remainingPassengers: number } | null;
  insertion?: { routeId: string; stopId: string; stopSequence: number; createdNewRoute?: boolean } | null;
  actorId?: string | null;
  actorRole?: string | null;
}

/**
 * Append-only writer of the trip timeline (corporate_trip_events) and the driver assignment
 * history (corporate_route_assignment_events).
 *
 * Called by execution / dispatch / replanning right after a state transition has committed.
 * Recording is best effort and NEVER throws: a failed event insert is logged and must not undo
 * or fail the business transition that already happened.
 */
@Injectable()
export class TripEventRecorder {
  private readonly logger = new Logger(TripEventRecorder.name);

  constructor(private readonly db: DatabaseService) {}

  async record(e: TripEventInput): Promise<boolean> {
    try {
      const tenantId = e.tenantId || (await this.resolveTenantId(e.routeId));
      if (!tenantId) {
        this.logger.warn(`Trip event ${e.type} for unknown route ${e.routeId} not recorded`);
        return false;
      }
      await this.db.corporateTripEvent.create({
        data: {
          tenantId,
          routeId: e.routeId,
          stopId: e.stopId ?? null,
          type: e.type,
          actorId: e.actorId ?? null,
          actorRole: e.actorRole ?? null,
          payload: (e.payload ?? {}) as any,
          ...(e.at ? { at: e.at } : {}),
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Trip event ${e.type} for route ${e.routeId} not recorded: ${err?.message}`);
      return false;
    }
  }

  /** Assignment history; also used by ops reassign (WS-D) with reason OPS_REASSIGN etc. */
  async recordAssignment(e: AssignmentEventInput): Promise<boolean> {
    try {
      const tenantId = e.tenantId || (await this.resolveTenantId(e.routeId));
      if (!tenantId) return false;
      await this.db.corporateRouteAssignmentEvent.create({
        data: {
          tenantId,
          routeId: e.routeId,
          fromDriverId: e.fromDriverId ?? null,
          toDriverId: e.toDriverId ?? null,
          reason: e.reason,
          actorId: e.actorId ?? null,
          ...(e.at ? { at: e.at } : {}),
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Assignment event for route ${e.routeId} not recorded: ${err?.message}`);
      return false;
    }
  }

  /** Ops reassign / replace: assignment history + DRIVER_REASSIGNED on the timeline. */
  async recordReassignment(e: AssignmentEventInput & { actorRole?: string | null }): Promise<void> {
    const at = e.at ?? new Date();
    await this.recordAssignment({ ...e, at });
    await this.record({
      tenantId: e.tenantId,
      routeId: e.routeId,
      type: 'DRIVER_REASSIGNED',
      actorId: e.actorId,
      actorRole: e.actorRole ?? 'OPS',
      payload: { fromDriverId: e.fromDriverId ?? null, toDriverId: e.toDriverId ?? null, reason: e.reason },
      at,
    });
  }

  // ---- Dispatch helpers (keep call sites to one line) ----

  async recordOfferSent(e: { tenantId?: string | null; routeId: string; driverId: string; actorId?: string | null; payload?: Record<string, unknown> }): Promise<void> {
    await this.record({
      tenantId: e.tenantId,
      routeId: e.routeId,
      type: 'OFFER_SENT',
      actorId: e.actorId ?? null,
      actorRole: e.actorId ? 'ADMIN' : 'SYSTEM',
      payload: { driverId: e.driverId, ...(e.payload ?? {}) },
    });
  }

  async recordOfferAccepted(e: { tenantId?: string | null; routeId: string; driverId: string; actorId?: string | null; fromDriverId?: string | null; payload?: Record<string, unknown> }): Promise<void> {
    const at = new Date();
    await this.record({
      tenantId: e.tenantId,
      routeId: e.routeId,
      type: 'OFFER_ACCEPTED',
      actorId: e.actorId ?? e.driverId,
      actorRole: 'DRIVER',
      payload: { driverId: e.driverId, ...(e.payload ?? {}) },
      at,
    });
    await this.recordAssignment({
      tenantId: e.tenantId,
      routeId: e.routeId,
      fromDriverId: e.fromDriverId ?? null,
      toDriverId: e.driverId,
      reason: 'OFFER_ACCEPTED',
      actorId: e.actorId ?? e.driverId,
      at,
    });
  }

  /** Driver reject, or the 60 s timeout reaper (reason OFFER_TIMEOUT_EXPIRED). */
  async recordOfferDeclined(routeId: string, driverId: string, reason?: string): Promise<void> {
    const expired = /EXPIRED|TIMEOUT/i.test(reason ?? '');
    const type: CorporateTripEventType = expired ? 'OFFER_EXPIRED' : 'OFFER_REJECTED';
    await this.record({
      routeId,
      type,
      actorId: expired ? null : driverId,
      actorRole: expired ? 'SYSTEM' : 'DRIVER',
      payload: { driverId, reason: reason ?? null },
    });
  }

  // ---- Replanning helper ----

  async recordReplan(e: ReplanEventInput): Promise<void> {
    const actorRole = e.actorRole ?? (e.actorId ? 'CORPORATE_ADMIN' : 'EMPLOYEE');
    if (e.removal?.routeId) {
      await this.record({
        tenantId: e.tenantId,
        routeId: e.removal.routeId,
        stopId: e.stopId ?? null, // no FK: a re-sequenced route deletes the stop row, the id stays as history
        type: 'STOP_REMOVED',
        actorId: e.actorId,
        actorRole,
        payload: {
          requestId: e.requestId,
          action: e.action,
          removedStopId: e.stopId ?? null,
          mode: e.removal.mode,
          routeCancelled: e.removal.routeCancelled,
          remainingPassengers: e.removal.remainingPassengers,
        },
      });
    }
    if (e.insertion?.routeId) {
      await this.record({
        tenantId: e.tenantId,
        routeId: e.insertion.routeId,
        stopId: e.insertion.stopId || null,
        type: 'STOP_ADDED',
        actorId: e.actorId,
        actorRole,
        payload: {
          requestId: e.requestId,
          action: e.action,
          stopSequence: e.insertion.stopSequence,
          createdNewRoute: e.insertion.createdNewRoute ?? false,
        },
      });
    }
  }

  private async resolveTenantId(routeId: string): Promise<string | null> {
    const route = await this.db.corporateRoute.findUnique({ where: { id: routeId }, select: { tenantId: true } });
    return route?.tenantId ?? null;
  }
}
