import {
  CorporateGender,
  CorporateRouteStatus,
  CorporateStopStatus,
  CorporateTicketCategory,
  CorporateTicketPriority,
  CorporateTicketStatus,
  CorporateTransportDirection,
} from '@adhocx/contracts';

export interface RiderProfileResponse {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: CorporateGender;
  department: string | null;
  costCenter: string | null;
  tenant: {
    id: string;
    name: string;
    code: string;
  };
  office: {
    id: string;
    name: string;
    addressText: string;
    latitude: number;
    longitude: number;
  };
  defaultPickupLocation?: {
    addressText: string;
    landmark?: string | null;
    latitude: number;
    longitude: number;
  } | null;
}

export interface RiderScheduleItem {
  date: string; // YYYY-MM-DD
  shiftTime: string; // HH:mm
  direction: CorporateTransportDirection;
  status: string; // APPROVED | PLANNED | ASSIGNED | COMPLETED | CANCELLED
  requestId: string;
  routeId?: string | null;
  pickupTime?: string | null;
  officeArrivalTime?: string | null;
  pickupAddress: string;
  officeAddress: string;
  vehicleCategory?: string | null;
  canCancel: boolean; // true if >= 9 hours before shift
  canReschedule: boolean; // true if >= 9 hours before shift
  pickupPoint?: { latitude: number; longitude: number } | null;
  dropoffPoint?: { latitude: number; longitude: number } | null;
}

export interface RiderScheduleResponse {
  employeeId: string;
  employee?: {
    id: string;
    code: string;
    fullName: string;
    officeName: string | null;
  };
  startDate: string;
  endDate: string;
  totalRides: number;
  schedule: RiderScheduleItem[];
}

export interface RiderTripSummary {
  stopId: string;
  routeId: string;
  requestId?: string | null;
  shiftDate: string;
  shiftTime: string;
  direction: CorporateTransportDirection;
  stopSequence: number;
  stopType: string;
  status: CorporateStopStatus;
  routeStatus: CorporateRouteStatus;
  plannedEta: Date;
  actualArrivalTime?: Date | null;
  actualDepartureTime?: Date | null;
  boardingOtp: string;
  pickupAddress: string;
  destinationAddress: string;
  driver?: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    rating?: number | null;
  } | null;
  vehicle?: {
    id: string;
    plateNumber: string;
    model: string;
    color?: string | null;
    category: string;
  } | null;
  hasFeedback: boolean;
  feedbackRating?: number | null;
  femaleSafeDropRequired: boolean;
  femaleSafeDropConfirmed: boolean;
}

export interface RiderTripsOptions {
  /** Only stops in these statuses (e.g. past trips: BOARDED, NO_SHOW, CANCELLED). */
  stopStatuses?: CorporateStopStatus[];
}

/** GET /corporate/me/trips/next (also served by the deprecated /corporate/trips/me/next-trip alias). */
export type RiderNextTripResponse =
  | { hasActiveTrip: false; message: string }
  | {
      hasActiveTrip: true;
      stopId: string;
      routeId: string;
      routeNumber: string;
      direction: CorporateTransportDirection;
      routeStatus: CorporateRouteStatus;
      stopStatus: CorporateStopStatus;
      stopSequence: number;
      plannedEta: Date;
      actualArrivalTime: Date | null;
      actualDepartureTime: Date | null;
      boardingOtp: string;
      pickupLocation: { latitude: number; longitude: number; addressText: string };
      officeDestination: { id: string; name: string; addressText: string };
      driver: { id: string; name: string; phone: string | null } | null;
      vehicle: { id: string; registrationNumber: string; model: string; vehicleType: string } | null;
    };

export interface RiderTripTrackingResponse {
  routeId: string;
  stopId: string;
  direction: CorporateTransportDirection;
  routeStatus: CorporateRouteStatus;
  stopStatus: CorporateStopStatus;
  plannedEta: Date;
  estimatedArrivalMinutes?: number | null;
  distanceToPickupMeters?: number | null;
  boardingOtp: string;
  dynamicQrToken: string;
  dwellRemainingSeconds?: number | null;
  isDriverArrived: boolean;
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speedKmph?: number | null;
    updatedAt: Date;
  } | null;
  driver?: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    photoUrl?: string | null;
    rating: number;
  } | null;
  vehicle?: {
    plateNumber: string;
    model: string;
    color?: string | null;
    category: string;
  } | null;
  activeSosAlert?: {
    id: string;
    status: string;
    triggeredAt: Date;
  } | null;
  coPassengersCount: number;
}

export interface SubmitSafeReachDto {
  notes?: string;
  confirmedResidenceEntry?: boolean;
}

export interface SubmitTripFeedbackDto {
  rating: number; // 1 to 5
  tags?: string[];
  comment?: string;
}

export interface CreateSupportTicketDto {
  category: CorporateTicketCategory;
  priority?: CorporateTicketPriority;
  subject: string;
  description: string;
  routeId?: string;
  stopId?: string;
}

export interface SupportTicketResponse {
  id: string;
  ticketNumber: string;
  category: CorporateTicketCategory;
  priority: CorporateTicketPriority;
  status: CorporateTicketStatus;
  subject: string;
  description: string;
  adminNotes?: string | null;
  resolutionNotes?: string | null;
  slaMinutes: number;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiderNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
