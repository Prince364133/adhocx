import { CorporateTenantStatus, CorporateGender } from '../../enums';

export interface CreateCorporateTenantDto {
  code: string;
  name: string;
  legalEntityName: string;
  gstin?: string;
}

export interface UpdateCorporateTenantDto {
  name?: string;
  legalEntityName?: string;
  gstin?: string;
  status?: CorporateTenantStatus;
}

export interface UpdateCorporateTenantProfileDto {
  name: string;
  legalEntityName: string;
  gstin?: string | null;
  industry?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  registeredAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  country?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  cin?: string | null;
  registeredBusinessAddress?: string | null;
  billingAddress?: string | null;
  billingSameAsRegistered?: boolean;
}

export interface CreateCorporateOfficeDto {
  code: string;
  name: string;
  city?: string;
  addressText: string;
  latitude: number;
  longitude: number;
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

