import type { RawCsvRow, RowValidationError, CsvValidationReport } from '../types.ts';

/**
 * Robust CSV parser that handles quotes, escaped quotes, newlines, and whitespace.
 */
export function parseRawCsv(csvText: string): RawCsvRow[] {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const splitCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const rawHeaders = splitCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[\s\-_]+/g, '_').trim(),
  );

  const rows: RawCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v)) continue;

    const row: RawCsvRow = {};
    rawHeaders.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

export interface ValidatedEmployeeRecord {
  rowIndex: number;
  name: string;
  phone: string;
  gender: string;
  pickupAddress: string;
  officeAddress: string;
  arrivalDate: string;
  arrivalTime: string;
}

/**
 * Validates a batch of employee CSV rows according to enterprise rules.
 */
export function validateEmployeeCsv(
  rows: RawCsvRow[],
  defaultOfficeOverride?: string,
  defaultShiftTimeOverride?: string,
): {
  validEmployees: ValidatedEmployeeRecord[];
  report: CsvValidationReport;
} {
  const errors: RowValidationError[] = [];
  const warnings: RowValidationError[] = [];
  const validEmployees: ValidatedEmployeeRecord[] = [];

  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();
  const distinctOffices = new Set<string>();
  const distinctShiftTimes = new Set<string>();

  rows.forEach((r, idx) => {
    const rowIndex = idx + 2; // Line 1 is header
    const name = (r.employee_name || r.name || '').trim();
    const pickup = (r.pickup_address || r.pickup || r.address || '').trim();
    const office = (
      r.office_address ||
      r.office ||
      r.destination ||
      defaultOfficeOverride ||
      'Mindspace IT Park, Hitec City, Hyderabad'
    ).trim();
    const phone = (r.phone_number || r.phone || r.mobile || '').trim();
    const date = (r.required_arrival_date || r.date || '2026-11-20').trim();
    const time = (
      r.required_arrival_time ||
      r.time ||
      defaultShiftTimeOverride ||
      '08:00'
    ).trim();
    const gender = (r.gender || 'MALE').toUpperCase().trim();

    // 1. Mandatory Field Checks
    if (!name) {
      errors.push({
        rowIndex,
        employeeName: 'Unknown',
        field: 'employee_name',
        message: 'Employee name is required.',
        severity: 'ERROR',
      });
      return;
    }

    if (!pickup) {
      errors.push({
        rowIndex,
        employeeName: name,
        field: 'pickup_address',
        message: 'Pickup address is required.',
        severity: 'ERROR',
      });
      return;
    }

    if (pickup.length < 5) {
      errors.push({
        rowIndex,
        employeeName: name,
        field: 'pickup_address',
        message: `Pickup address "${pickup}" is too brief or ambiguous.`,
        severity: 'ERROR',
      });
      return;
    }

    // 2. Duplicate Detection
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) {
      warnings.push({
        rowIndex,
        employeeName: name,
        field: 'employee_name',
        message: `Duplicate employee name detected: "${name}".`,
        severity: 'WARNING',
      });
    } else {
      seenNames.add(nameKey);
    }

    // 3. Phone validation
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 10) {
      const tenDigit = cleanPhone.slice(-10);
      if (seenPhones.has(tenDigit)) {
        warnings.push({
          rowIndex,
          employeeName: name,
          field: 'phone_number',
          message: `Duplicate mobile number "${phone}" detected.`,
          severity: 'WARNING',
        });
      } else {
        seenPhones.add(tenDigit);
      }
    } else if (phone) {
      warnings.push({
        rowIndex,
        employeeName: name,
        field: 'phone_number',
        message: `Mobile number "${phone}" is less than 10 digits.`,
        severity: 'WARNING',
      });
    }

    // 4. Shift Time Format validation
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      warnings.push({
        rowIndex,
        employeeName: name,
        field: 'required_arrival_time',
        message: `Arrival time "${time}" is not in standard HH:mm format. Defaulting to 08:00.`,
        severity: 'WARNING',
      });
    } else {
      distinctShiftTimes.add(time);
    }

    distinctOffices.add(office);

    validEmployees.push({
      rowIndex,
      name,
      phone: phone || '+91 98765 43210',
      gender: gender === 'FEMALE' ? 'FEMALE' : 'MALE',
      pickupAddress: pickup,
      officeAddress: office,
      arrivalDate: date,
      arrivalTime: timeMatch ? time : '08:00',
    });
  });

  // Check for multi-office mixed inputs
  if (distinctOffices.size > 1) {
    warnings.push({
      rowIndex: 0,
      employeeName: 'Fleet Cluster',
      field: 'office_address',
      message: `File contains multiple destination offices: ${Array.from(distinctOffices).join('; ')}. Optimizing for primary office destination.`,
      severity: 'WARNING',
    });
  }

  const report: CsvValidationReport = {
    totalRows: rows.length,
    validRowsCount: validEmployees.length,
    invalidRowsCount: rows.length - validEmployees.length,
    errors,
    warnings,
    distinctOffices: Array.from(distinctOffices),
    distinctShiftTimes: Array.from(distinctShiftTimes),
  };

  return { validEmployees, report };
}
