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

export interface CreateCorporateOfficeDto {
  code: string;
  name: string;
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

