import {
  RequirementStatus,
  OfferStatus,
  AssignmentStatus,
  TripStatus,
  DriverAvailability,
  VerificationStatus,
} from '../enums';

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly entityName: string,
    public readonly fromState: string,
    public readonly toState: string,
  ) {
    super(`Invalid state transition for ${entityName}: cannot transition from ${fromState} to ${toState}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export const LEGAL_REQUIREMENT_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  [RequirementStatus.DRAFT]: [RequirementStatus.POSTED, RequirementStatus.CANCELLED],
  [RequirementStatus.POSTED]: [RequirementStatus.DISPATCHING, RequirementStatus.CANCELLED],
  [RequirementStatus.DISPATCHING]: [
    RequirementStatus.PARTIALLY_FULFILLED,
    RequirementStatus.FULFILLED,
    RequirementStatus.NO_DRIVER_AVAILABLE,
    RequirementStatus.CANCELLED,
  ],
  [RequirementStatus.PARTIALLY_FULFILLED]: [
    RequirementStatus.DISPATCHING,
    RequirementStatus.FULFILLED,
    RequirementStatus.NO_DRIVER_AVAILABLE,
    RequirementStatus.CANCELLED,
  ],
  [RequirementStatus.NO_DRIVER_AVAILABLE]: [RequirementStatus.DISPATCHING, RequirementStatus.CANCELLED],
  [RequirementStatus.FULFILLED]: [RequirementStatus.IN_PROGRESS, RequirementStatus.CANCELLED],
  [RequirementStatus.IN_PROGRESS]: [RequirementStatus.COMPLETED, RequirementStatus.CANCELLED],
  [RequirementStatus.COMPLETED]: [],
  [RequirementStatus.CANCELLED]: [],
};

export const LEGAL_OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.CREATED]: [OfferStatus.SENT, OfferStatus.CANCELLED],
  [OfferStatus.SENT]: [OfferStatus.ACCEPTED, OfferStatus.DECLINED, OfferStatus.EXPIRED, OfferStatus.CANCELLED],
  [OfferStatus.ACCEPTED]: [],
  [OfferStatus.DECLINED]: [],
  [OfferStatus.EXPIRED]: [],
  [OfferStatus.CANCELLED]: [],
};

export const LEGAL_ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.PENDING]: [AssignmentStatus.CONFIRMED, AssignmentStatus.CANCELLED],
  [AssignmentStatus.CONFIRMED]: [AssignmentStatus.COMPLETED, AssignmentStatus.CANCELLED],
  [AssignmentStatus.CANCELLED]: [],
  [AssignmentStatus.COMPLETED]: [],
};

export const LEGAL_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.ASSIGNED]: [TripStatus.ARRIVED, TripStatus.CANCELLED, TripStatus.NO_SHOW],
  [TripStatus.ARRIVED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED, TripStatus.NO_SHOW],
  [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
  [TripStatus.NO_SHOW]: [],
};

export const LEGAL_AVAILABILITY_TRANSITIONS: Record<DriverAvailability, DriverAvailability[]> = {
  [DriverAvailability.OFFLINE]: [DriverAvailability.AVAILABLE, DriverAvailability.UNAVAILABLE],
  [DriverAvailability.AVAILABLE]: [DriverAvailability.OFFLINE, DriverAvailability.BUSY, DriverAvailability.UNAVAILABLE],
  [DriverAvailability.BUSY]: [DriverAvailability.AVAILABLE, DriverAvailability.OFFLINE, DriverAvailability.UNAVAILABLE],
  [DriverAvailability.UNAVAILABLE]: [DriverAvailability.AVAILABLE, DriverAvailability.OFFLINE],
};

export const LEGAL_VERIFICATION_TRANSITIONS: Record<VerificationStatus, VerificationStatus[]> = {
  [VerificationStatus.PENDING]: [VerificationStatus.UNDER_REVIEW],
  [VerificationStatus.UNDER_REVIEW]: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED],
  [VerificationStatus.VERIFIED]: [VerificationStatus.SUSPENDED],
  [VerificationStatus.REJECTED]: [VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW],
  [VerificationStatus.SUSPENDED]: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED],
};

export function canTransitionRequirement(from: RequirementStatus, to: RequirementStatus): boolean {
  return LEGAL_REQUIREMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateRequirementTransition(from: RequirementStatus, to: RequirementStatus): void {
  if (!canTransitionRequirement(from, to)) {
    throw new InvalidStateTransitionError('Requirement', from, to);
  }
}

export function canTransitionOffer(from: OfferStatus, to: OfferStatus): boolean {
  return LEGAL_OFFER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateOfferTransition(from: OfferStatus, to: OfferStatus): void {
  if (!canTransitionOffer(from, to)) {
    throw new InvalidStateTransitionError('Offer', from, to);
  }
}

export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return LEGAL_ASSIGNMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateAssignmentTransition(from: AssignmentStatus, to: AssignmentStatus): void {
  if (!canTransitionAssignment(from, to)) {
    throw new InvalidStateTransitionError('Assignment', from, to);
  }
}

export function canTransitionTrip(from: TripStatus, to: TripStatus): boolean {
  return LEGAL_TRIP_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateTripTransition(from: TripStatus, to: TripStatus): void {
  if (!canTransitionTrip(from, to)) {
    throw new InvalidStateTransitionError('Trip', from, to);
  }
}

export function canTransitionAvailability(from: DriverAvailability, to: DriverAvailability): boolean {
  return LEGAL_AVAILABILITY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateAvailabilityTransition(from: DriverAvailability, to: DriverAvailability): void {
  if (!canTransitionAvailability(from, to)) {
    throw new InvalidStateTransitionError('DriverAvailability', from, to);
  }
}

export function canTransitionVerification(from: VerificationStatus, to: VerificationStatus): boolean {
  return LEGAL_VERIFICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateVerificationTransition(from: VerificationStatus, to: VerificationStatus): void {
  if (!canTransitionVerification(from, to)) {
    throw new InvalidStateTransitionError('Verification', from, to);
  }
}
