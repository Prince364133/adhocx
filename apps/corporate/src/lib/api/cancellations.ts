import { ApiError, apiRequest } from "./client";

export type CancellationStatus =
  "CANCELLED_SUCCESSFULLY" | "PENDING" | "REJECTED" | "FAILED" | "UNSUCCESSFUL";

export type CancellationMode = "AUTOMATIC" | "MANUAL";

export interface CancellationRecord {
  id: string;
  bookingId: string;
  employeeId: string;
  employeeName: string;
  pickupLocation: string;
  dropLocation: string;
  officeName: string;
  travelDate: string;
  pickupTime: string;
  scheduledPickupAt: string;
  cancelledAt: string;
  cancellationReason: string;
  cancellationMode: CancellationMode;
  status: CancellationStatus;
}

export interface CancellationRecordsResponse {
  items: CancellationRecord[];
}

export interface CancellationDataResult {
  records: CancellationRecord[];
  source: "api" | "sample";
}

const CANCELLATION_CUTOFF_MS = 12 * 60 * 60 * 1000;

export function getIndiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getWeekStartDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return shiftDateKey(dateKey, -((weekday + 6) % 7));
}

export function isSuccessfulCancellation(record: CancellationRecord): boolean {
  if (record.status !== "CANCELLED_SUCCESSFULLY") return false;

  const cancelledAt = Date.parse(record.cancelledAt);
  const scheduledPickupAt = Date.parse(record.scheduledPickupAt);
  const timeUntilPickupMs = scheduledPickupAt - cancelledAt;

  if (
    !Number.isFinite(cancelledAt) ||
    !Number.isFinite(scheduledPickupAt) ||
    timeUntilPickupMs <= 0
  ) {
    return false;
  }

  return (
    record.cancellationMode !== "AUTOMATIC" ||
    timeUntilPickupMs >= CANCELLATION_CUTOFF_MS
  );
}

function isCancellationRecord(value: unknown): value is CancellationRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const validStatuses: CancellationStatus[] = [
    "CANCELLED_SUCCESSFULLY",
    "PENDING",
    "REJECTED",
    "FAILED",
    "UNSUCCESSFUL",
  ];

  return (
    typeof record.id === "string" &&
    typeof record.bookingId === "string" &&
    typeof record.employeeId === "string" &&
    typeof record.employeeName === "string" &&
    typeof record.pickupLocation === "string" &&
    typeof record.dropLocation === "string" &&
    typeof record.officeName === "string" &&
    typeof record.travelDate === "string" &&
    typeof record.pickupTime === "string" &&
    typeof record.scheduledPickupAt === "string" &&
    typeof record.cancelledAt === "string" &&
    typeof record.cancellationReason === "string" &&
    (record.cancellationMode === "AUTOMATIC" ||
      record.cancellationMode === "MANUAL") &&
    typeof record.status === "string" &&
    validStatuses.includes(record.status as CancellationStatus)
  );
}

function createSampleRecords(): CancellationRecord[] {
  const today = getIndiaDateKey(new Date());
  const samples = [
    [
      "EMP-1042",
      "Ananya Rao",
      "BK-10421",
      "Madhapur, Hyderabad",
      "HiTEC City Campus",
      "12:15",
      0,
      "Family emergency",
    ],
    [
      "EMP-1088",
      "Rahul Mehta",
      "BK-10418",
      "Kondapur, Hyderabad",
      "HiTEC City Campus",
      "15:40",
      0,
      "Plans changed",
    ],
    [
      "EMP-1126",
      "Priya Nair",
      "BK-10403",
      "Gachibowli, Hyderabad",
      "Financial District Office",
      "11:20",
      1,
      "Working from home",
    ],
    [
      "EMP-1190",
      "Vikram Shah",
      "BK-10387",
      "Kukatpally, Hyderabad",
      "HiTEC City Campus",
      "16:05",
      2,
      "Personal appointment",
    ],
    [
      "EMP-1214",
      "Meera Iyer",
      "BK-10361",
      "Manikonda, Hyderabad",
      "Financial District Office",
      "13:10",
      4,
      "Schedule changed",
    ],
    [
      "EMP-1275",
      "Arjun Das",
      "BK-10312",
      "Miyapur, Hyderabad",
      "HiTEC City Campus",
      "10:50",
      8,
      "Leave approved",
    ],
    [
      "EMP-1311",
      "Neha Kapoor",
      "BK-10274",
      "Jubilee Hills, Hyderabad",
      "Banjara Hills Office",
      "14:25",
      14,
      "Personal reasons",
    ],
    [
      "EMP-1360",
      "Karan Reddy",
      "BK-10219",
      "Nallagandla, Hyderabad",
      "Financial District Office",
      "12:45",
      24,
      "Travel plans changed",
    ],
    [
      "EMP-1418",
      "Sana Ali",
      "BK-10163",
      "Secunderabad, Hyderabad",
      "Banjara Hills Office",
      "09:30",
      35,
      "Appointment rescheduled",
    ],
  ] as const;

  return samples.map((sample, index) => {
    const [
      employeeId,
      employeeName,
      bookingId,
      pickupLocation,
      dropLocation,
      cancelledTime,
      daysAgo,
      reason,
    ] = sample;
    const cancellationDate = shiftDateKey(today, -daysAgo);
    const travelDate = shiftDateKey(cancellationDate, 1);
    const pickupTime = "09:00";

    return {
      id: `sample-cancellation-${index + 1}`,
      bookingId,
      employeeId,
      employeeName,
      pickupLocation,
      dropLocation,
      officeName: dropLocation,
      travelDate,
      pickupTime,
      scheduledPickupAt: `${travelDate}T${pickupTime}:00+05:30`,
      cancelledAt: `${cancellationDate}T${cancelledTime}:00+05:30`,
      cancellationReason: reason,
      cancellationMode: "AUTOMATIC",
      status: "CANCELLED_SUCCESSFULLY",
    };
  });
}

function getSuccessfulRecords(
  records: CancellationRecord[],
): CancellationRecord[] {
  return records
    .filter(isSuccessfulCancellation)
    .sort((a, b) => Date.parse(b.cancelledAt) - Date.parse(a.cancelledAt));
}

export const cancellationsApi = {
  async list(tenantId: string): Promise<CancellationDataResult> {
    try {
      const response = await apiRequest<unknown>(
        `/corporate/tenants/${tenantId}/cancellations`,
      );
      if (
        !response ||
        typeof response !== "object" ||
        !("items" in response) ||
        !Array.isArray(response.items)
      ) {
        throw new Error(
          "The cancellation records API returned an invalid response.",
        );
      }

      const records: CancellationRecord[] = [];
      for (const item of response.items) {
        if (
          item &&
          typeof item === "object" &&
          "status" in item &&
          item.status !== "CANCELLED_SUCCESSFULLY"
        ) {
          continue;
        }
        if (!isCancellationRecord(item)) {
          throw new Error(
            "The cancellation records API returned an invalid successful cancellation.",
          );
        }
        records.push(item);
      }

      return { records: getSuccessfulRecords(records), source: "api" };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 0 || error.status === 404 || error.status >= 500)
      ) {
        return {
          records: getSuccessfulRecords(createSampleRecords()),
          source: "sample",
        };
      }
      throw error;
    }
  },
};
