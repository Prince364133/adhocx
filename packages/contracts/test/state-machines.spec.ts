import {
  RequirementStatus,
  OfferStatus,
  TripStatus,
  DriverAvailability,
  VerificationStatus,
  canTransitionRequirement,
  validateRequirementTransition,
  canTransitionOffer,
  validateOfferTransition,
  canTransitionTrip,
  validateTripTransition,
  canTransitionAvailability,
  canTransitionVerification,
  validateVerificationTransition,
  InvalidStateTransitionError,
} from '../src';

describe('State Machines Validator Tests (docs/12_STATE_MACHINES.md)', () => {
  describe('Requirement State Machine', () => {
    it('should allow valid transitions: DRAFT -> POSTED -> DISPATCHING -> FULFILLED -> IN_PROGRESS -> COMPLETED', () => {
      expect(canTransitionRequirement(RequirementStatus.DRAFT, RequirementStatus.POSTED)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.POSTED, RequirementStatus.DISPATCHING)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.DISPATCHING, RequirementStatus.FULFILLED)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.FULFILLED, RequirementStatus.IN_PROGRESS)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.IN_PROGRESS, RequirementStatus.COMPLETED)).toBe(true);
    });

    it('should allow partial fulfillment and no driver available transitions', () => {
      expect(canTransitionRequirement(RequirementStatus.DISPATCHING, RequirementStatus.PARTIALLY_FULFILLED)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.PARTIALLY_FULFILLED, RequirementStatus.DISPATCHING)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.DISPATCHING, RequirementStatus.NO_DRIVER_AVAILABLE)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.NO_DRIVER_AVAILABLE, RequirementStatus.DISPATCHING)).toBe(true);
    });

    it('should allow cancellation from permitted states', () => {
      expect(canTransitionRequirement(RequirementStatus.DRAFT, RequirementStatus.CANCELLED)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.POSTED, RequirementStatus.CANCELLED)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.DISPATCHING, RequirementStatus.CANCELLED)).toBe(true);
      expect(canTransitionRequirement(RequirementStatus.PARTIALLY_FULFILLED, RequirementStatus.CANCELLED)).toBe(true);
    });

    it('should reject invalid transitions and throw InvalidStateTransitionError', () => {
      expect(canTransitionRequirement(RequirementStatus.COMPLETED, RequirementStatus.DISPATCHING)).toBe(false);
      expect(canTransitionRequirement(RequirementStatus.CANCELLED, RequirementStatus.POSTED)).toBe(false);
      expect(() => validateRequirementTransition(RequirementStatus.COMPLETED, RequirementStatus.DISPATCHING))
        .toThrow(InvalidStateTransitionError);
    });
  });

  describe('Offer State Machine', () => {
    it('should allow valid lifecycle: CREATED -> SENT -> ACCEPTED', () => {
      expect(canTransitionOffer(OfferStatus.CREATED, OfferStatus.SENT)).toBe(true);
      expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.ACCEPTED)).toBe(true);
    });

    it('should allow decline, expiry, and cancellation from SENT', () => {
      expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.DECLINED)).toBe(true);
      expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.EXPIRED)).toBe(true);
      expect(canTransitionOffer(OfferStatus.SENT, OfferStatus.CANCELLED)).toBe(true);
    });

    it('should treat ACCEPTED, DECLINED, EXPIRED, CANCELLED as terminal', () => {
      expect(canTransitionOffer(OfferStatus.ACCEPTED, OfferStatus.DECLINED)).toBe(false);
      expect(canTransitionOffer(OfferStatus.DECLINED, OfferStatus.ACCEPTED)).toBe(false);
      expect(canTransitionOffer(OfferStatus.EXPIRED, OfferStatus.ACCEPTED)).toBe(false);
      expect(() => validateOfferTransition(OfferStatus.ACCEPTED, OfferStatus.CANCELLED))
        .toThrow(InvalidStateTransitionError);
    });
  });

  describe('Trip State Machine', () => {
    it('should allow normal trip progression: ASSIGNED -> ARRIVED -> IN_PROGRESS -> COMPLETED', () => {
      expect(canTransitionTrip(TripStatus.ASSIGNED, TripStatus.ARRIVED)).toBe(true);
      expect(canTransitionTrip(TripStatus.ARRIVED, TripStatus.IN_PROGRESS)).toBe(true);
      expect(canTransitionTrip(TripStatus.IN_PROGRESS, TripStatus.COMPLETED)).toBe(true);
    });

    it('should allow no-show and cancellation when applicable', () => {
      expect(canTransitionTrip(TripStatus.ASSIGNED, TripStatus.CANCELLED)).toBe(true);
      expect(canTransitionTrip(TripStatus.ARRIVED, TripStatus.NO_SHOW)).toBe(true);
    });

    it('should reject invalid jumps such as ASSIGNED directly to COMPLETED', () => {
      expect(canTransitionTrip(TripStatus.ASSIGNED, TripStatus.COMPLETED)).toBe(false);
      expect(() => validateTripTransition(TripStatus.ASSIGNED, TripStatus.COMPLETED))
        .toThrow(InvalidStateTransitionError);
    });
  });

  describe('Driver Availability State Machine', () => {
    it('should allow OFFLINE <-> AVAILABLE and AVAILABLE <-> BUSY transitions', () => {
      expect(canTransitionAvailability(DriverAvailability.OFFLINE, DriverAvailability.AVAILABLE)).toBe(true);
      expect(canTransitionAvailability(DriverAvailability.AVAILABLE, DriverAvailability.BUSY)).toBe(true);
      expect(canTransitionAvailability(DriverAvailability.BUSY, DriverAvailability.AVAILABLE)).toBe(true);
      expect(canTransitionAvailability(DriverAvailability.AVAILABLE, DriverAvailability.OFFLINE)).toBe(true);
    });
  });

  describe('Verification State Machine', () => {
    it('should allow verification transitions: PENDING -> UNDER_REVIEW -> VERIFIED -> SUSPENDED', () => {
      expect(canTransitionVerification(VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW)).toBe(true);
      expect(canTransitionVerification(VerificationStatus.UNDER_REVIEW, VerificationStatus.VERIFIED)).toBe(true);
      expect(canTransitionVerification(VerificationStatus.VERIFIED, VerificationStatus.SUSPENDED)).toBe(true);
      expect(canTransitionVerification(VerificationStatus.UNDER_REVIEW, VerificationStatus.REJECTED)).toBe(true);
      expect(canTransitionVerification(VerificationStatus.REJECTED, VerificationStatus.UNDER_REVIEW)).toBe(true);
      expect(canTransitionVerification(VerificationStatus.SUSPENDED, VerificationStatus.VERIFIED)).toBe(true);
    });

    it('should reject illegal jumps like PENDING directly to VERIFIED or SUSPENDED to PENDING', () => {
      expect(canTransitionVerification(VerificationStatus.PENDING, VerificationStatus.VERIFIED)).toBe(false);
      expect(canTransitionVerification(VerificationStatus.SUSPENDED, VerificationStatus.PENDING)).toBe(false);
      expect(() => validateVerificationTransition(VerificationStatus.PENDING, VerificationStatus.VERIFIED))
        .toThrow(InvalidStateTransitionError);
    });
  });
});
