import { CorporateGender } from '../../enums';

export interface CorporateRosterRowDto {
  rowNumber: number;
  employeeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: CorporateGender;
  department?: string;
  costCenter?: string;
  officeCode: string;
  rosterDate: string; // YYYY-MM-DD
  loginTime?: string; // HH:mm
  logoutTime?: string; // HH:mm
  homeAddress: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  specialNotes?: string;
}

export interface RosterValidationErrorDto {
  rowNumber: number;
  field: string;
  invalidValue: any;
  message: string;
}

export interface RosterValidationResultDto {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  loginRequestsCount: number;
  logoutRequestsCount: number;
  errors: RosterValidationErrorDto[];
}

export interface RosterIngestionOutputDto {
  rosterId: string;
  tenantId: string;
  officeId: string;
  rosterDate: string;
  totalEmployeesProcessed: number;
  loginRequestsCreated: number;
  logoutRequestsCreated: number;
  duplicateRequestsSkipped: number;
}
