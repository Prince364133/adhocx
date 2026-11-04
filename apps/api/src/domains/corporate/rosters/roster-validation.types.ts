export interface RosterRowData {
  rowNumber: number;
  employeeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
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

export interface RosterRowValidationError {
  rowNumber: number;
  field: string;
  invalidValue: any;
  message: string;
}

export interface RosterDryRunValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  loginRequestsCount: number;
  logoutRequestsCount: number;
  errors: RosterRowValidationError[];
}

export interface RosterIngestionOutput {
  rosterId: string;
  tenantId: string;
  officeId: string;
  rosterDate: string;
  totalEmployeesProcessed: number;
  loginRequestsCreated: number;
  logoutRequestsCreated: number;
  duplicateRequestsSkipped: number;
}

/** WS-F: result of a draft (mode=draft) upload. */
export interface RosterDraftOutput {
  rosterId: string;
  tenantId: string;
  officeId: string;
  rosterDate: string;
  version: number;
  status: 'DRAFT';
  totalEmployeesProcessed: number;
  entriesCreated: number;
}
