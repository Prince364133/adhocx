import {
  CorporateTicketCategory,
  CorporateTicketPriority,
  CorporateTicketStatus,
} from '@adhocx/contracts';

/**
 * SOS incident lifecycle (doc 19 §0 safety/: new -> ack -> investigating -> escalated / resolved -> closed).
 *
 * Terminal ("closed") states are RESOLVED and FALSE_ALARM. POST /alerts/:id/close and the legacy
 * POST /alerts/:id/resolve both move an open alert into one of them.
 */
export type SosLifecycleAction = 'ACKNOWLEDGE' | 'INVESTIGATE' | 'ESCALATE' | 'CLOSE';

export const SOS_TERMINAL_STATUSES: readonly string[] = ['RESOLVED', 'FALSE_ALARM'];
export const SOS_OPEN_STATUSES: readonly string[] = [
  'NEW',
  'ACTIVE',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'ESCALATED',
  'RESPONDED',
];

/** Statuses each lifecycle action may start from. Anything else is an illegal transition (409). */
export const SOS_ALLOWED_FROM: Readonly<Record<SosLifecycleAction, readonly string[]>> = {
  // ESCALATED is acknowledgeable only while nobody has acknowledged it yet (auto-escalated alerts).
  ACKNOWLEDGE: ['NEW', 'ACTIVE', 'ESCALATED'],
  INVESTIGATE: ['ACKNOWLEDGED', 'ESCALATED', 'RESPONDED'],
  ESCALATE: ['NEW', 'ACTIVE', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESPONDED'],
  CLOSE: SOS_OPEN_STATUSES,
};

/** Outcome an alert is closed with. */
export type SosCloseOutcome = 'RESOLVED' | 'FALSE_ALARM';
export const SOS_CLOSE_OUTCOMES: readonly SosCloseOutcome[] = ['RESOLVED', 'FALSE_ALARM'];

/** Body of POST /corporate/safety/alerts/:id/{acknowledge|investigate|escalate|close}. */
export interface SosLifecycleNotesDto {
  /** Free-text incident notes; required for escalate and close, optional otherwise. */
  notes?: string;
  /** Display name of the commander (acknowledge only). */
  adminName?: string;
  /** close only: RESOLVED (default) or FALSE_ALARM. */
  outcome?: SosCloseOutcome;
}

export interface SosEscalationTickResult {
  /** Another instance held the lock, a tick was already running, or shutdown is in progress. */
  skipped: boolean;
  escalatedIds: string[];
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

/** OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED. Each status may only move to the next one. */
export const TICKET_NEXT_STATUS: Readonly<Record<CorporateTicketStatus, CorporateTicketStatus | null>> = {
  [CorporateTicketStatus.OPEN]: CorporateTicketStatus.IN_PROGRESS,
  [CorporateTicketStatus.IN_PROGRESS]: CorporateTicketStatus.RESOLVED,
  [CorporateTicketStatus.RESOLVED]: CorporateTicketStatus.CLOSED,
  [CorporateTicketStatus.CLOSED]: null,
};

/** Body of POST /corporate/support/tickets (corporate portal, on behalf of an employee). */
export interface CreateCorporateSupportTicketDto {
  /** Employee the ticket is raised for; must belong to the caller's tenant. */
  employeeId: string;
  /** Forced to the caller's tenant by CorporateAccessGuard for corporate roles. */
  tenantId?: string;
  category: CorporateTicketCategory;
  priority?: CorporateTicketPriority;
  subject: string;
  description: string;
  routeId?: string;
  stopId?: string;
}

/** Body of PATCH /corporate/support/tickets/:id/status (platform ADMIN). */
export interface UpdateSupportTicketStatusDto {
  status: CorporateTicketStatus;
  notes?: string;
}

export interface SupportTicketListQuery {
  tenantId?: string;
  employeeId?: string;
  status?: CorporateTicketStatus;
  priority?: CorporateTicketPriority;
  limit?: number;
  offset?: number;
}
