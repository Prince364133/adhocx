import { CorporateTenantStatus, CorporateGender, CorporateRole } from '../../enums';

export interface CreateCorporateTenantDto {
  code: string;
  name: string;
  legalEntityName: string;
  gstin?: string;
  cin?: string;
  industry?: string;
  website?: string;
  registeredAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  billingAddress?: string;
  billingSameAsRegistered?: boolean;
}

export interface OnboardCorporateOfficeInputDto {
  code: string;
  name: string;
  addressText: string;
  latitude?: number;
  longitude?: number;
}

export interface OnboardCorporateAdminInputDto {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  corporateRole?: CorporateRole;
}

export interface OnboardCorporatePolicyInputDto {
  cancelCutoffHours?: number;
  maxRideMinutes?: number;
  defaultVehicleCategory?: 'SEDAN' | 'SUV';
  defaultCapacity?: number;
  escalationLeadMinutes?: number;
  officeArrivalBufferMinutes?: number;
  stopDwellMinutes?: number;
  approachLeadMinutes?: number;
  dispatchWindowMinutes?: number;
  dispatchRetryIntervalMinutes?: number;
  searchRadiusKm?: number;
  nightShiftStart?: string;
  nightShiftEnd?: string;
}

export interface OnboardCorporateShiftInputDto {
  name: string;
  loginTime: string;
  logoutTime: string;
  weekdays?: number[];
  isOvernight?: boolean;
}

export interface OnboardCorporateCompanyDto {
  code: string;
  name: string;
  legalEntityName: string;
  gstin?: string;
  status?: CorporateTenantStatus;
  office: OnboardCorporateOfficeInputDto;
  adminUser: OnboardCorporateAdminInputDto;
  policy?: OnboardCorporatePolicyInputDto;
  shiftTemplate?: OnboardCorporateShiftInputDto;
}

export interface UpdateCorporateTenantDto extends Partial<Omit<CreateCorporateTenantDto, 'code'>> {
  status?: CorporateTenantStatus;
  logoUrl?: string | null;
}

export interface CreateCorporateOfficeDto {
  code: string;
  name: string;
  addressText: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface UpdateCorporateOfficeDto extends Partial<CreateCorporateOfficeDto> {}

export interface CreateCorporateTransportZoneDto {
  officeId: string;
  code: string;
  name: string;
  description?: string;
  serviceArea: string;
  pickupLocations?: string[];
  dropLocations?: string[];
  isActive?: boolean;
}

export interface UpdateCorporateTransportZoneDto extends Partial<CreateCorporateTransportZoneDto> {
  officeId?: string;
}

export interface CreateCorporateEmployeeDto {
  officeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: CorporateGender;
  department?: string;
  costCenter?: string;
  homeAddress: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateCorporateEmployeeDto {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  gender?: CorporateGender;
  officeId?: string;
  department?: string;
  costCenter?: string;
  isActive?: boolean;
}

export interface CreateEmployeeLocationDto {
  addressText: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}
