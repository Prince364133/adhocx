export interface AdminMetrics {
  totalDrivers: number;
  verifiedDrivers: number;
  pendingDriversKyc: number;
  totalVendors: number;
  verifiedVendors: number;
  activeRequirements: number;
  activeTrips: number;
  completedTrips: number;
  pendingSettlements: number;
}

export interface DriverListItem {
  id: string;
  fullName: string;
  phone: string;
  vehiclePlate: string;
  vehicleType: string;
  verificationStatus: string;
  availabilityStatus: string;
  walletBalance: number;
  createdAt: string;
}

export interface DriverKycDocument {
  id: string;
  documentType: string;
  fileUrl: string;
  verified: boolean;
  notes?: string;
  createdAt: string;
}

export interface DriverDetail extends DriverListItem {
  documents: DriverKycDocument[];
  tripsCount: number;
}

export interface VendorListItem {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  verificationStatus: string;
  requirementsCount: number;
  createdAt: string;
}

export interface RequirementListItem {
  id: string;
  vendorName: string;
  vehicleType: string;
  quantity: number;
  assignedQuantity: number;
  pickupAddress: string;
  dropAddress: string;
  reportingTime: string;
  status: string;
  vendorRate: number;
  createdAt: string;
}

export interface TripListItem {
  id: string;
  requirementId: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  pickupAddress: string;
  dropAddress: string;
  status: string;
  driverRate: number;
  tollCharges?: number;
  parkingCharges?: number;
  totalDriverEarnings?: number;
  reportingTime: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TripEvent {
  id: string;
  tripId: string;
  eventType: string;
  latitude: number;
  longitude: number;
  metadata?: any;
  createdAt: string;
}

export interface SettlementListItem {
  id: string;
  driverId: string;
  driverName?: string;
  amount: number;
  status: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  transactionRef?: string;
  processedAt?: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string;
  actorPhone?: string;
  actorRole?: string;
  action: string;
  entityName: string;
  entityId?: string;
  payload?: any;
  ipAddress?: string;
  createdAt: string;
}
