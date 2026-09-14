import { apiRequest } from "@/lib/api";

/**
 * Client for `/api/v1/medications`. Mirrors `lib/doctors.ts`: plain functions
 * over `apiRequest`, with the screens holding the state.
 *
 * Every call is `authenticated: true` — the backend scopes each query to the
 * bearer token's user, so nothing here passes a user id.
 */

export const MEDICATION_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "drops",
  "inhaler",
  "cream",
  "other",
] as const;

export type MedicationForm = (typeof MEDICATION_FORMS)[number];

export type Medication = {
  _id: string;
  userId: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  quantityRemaining: number;
  lowStockThreshold: number;
  needsRefill: boolean;
  refillFlaggedAt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleFrequency = "daily" | "every_n_hours" | "weekly";

export type Schedule = {
  _id: string;
  userId: string;
  medicationId: string;
  frequency: ScheduleFrequency;
  /** "HH:mm" wall-clock times — see lib/dose-schedule.ts on why not instants. */
  timeOfDay: string[];
  intervalHours: number | null;
  /** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DoseStatus = "pending" | "taken" | "missed" | "snoozed";

export type DoseLog = {
  _id: string;
  userId: string;
  scheduleId: string;
  medicationId: string;
  scheduledAt: string;
  respondedAt: string | null;
  status: DoseStatus;
  snoozedUntil: string | null;
  caregiverAlertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdherenceSummary = {
  from: string;
  to: string;
  total: number;
  taken: number;
  missed: number;
  /** null when nothing in range has been answered yet. */
  adherenceRate: number | null;
};

export type SyncResult = {
  syncedAt: string;
  timezone: string;
  medications: Medication[];
  schedules: Schedule[];
  isFullSync: boolean;
};

const BASE = "/api/v1/medications";

// ── Medications ─────────────────────────────────────────────────────────────

export type MedicationInput = {
  name: string;
  dosage: string;
  form?: MedicationForm;
  quantityRemaining?: number;
  lowStockThreshold?: number;
};

export function fetchMedications(): Promise<Medication[]> {
  return apiRequest<Medication[]>(BASE, { authenticated: true });
}

export function createMedication(input: MedicationInput): Promise<Medication> {
  return apiRequest<Medication>(BASE, { method: "POST", body: input, authenticated: true });
}

export function updateMedication(
  id: string,
  input: Partial<MedicationInput> & { isArchived?: boolean },
): Promise<Medication> {
  return apiRequest<Medication>(`${BASE}/${id}`, {
    method: "PATCH",
    body: input,
    authenticated: true,
  });
}

export function deleteMedication(id: string): Promise<{ _id: string }> {
  return apiRequest<{ _id: string }>(`${BASE}/${id}`, { method: "DELETE", authenticated: true });
}

// ── Schedules ───────────────────────────────────────────────────────────────

export type ScheduleInput = {
  medicationId: string;
  frequency: ScheduleFrequency;
  timeOfDay?: string[];
  intervalHours?: number;
  daysOfWeek?: number[];
  startDate: string;
  endDate?: string | null;
  isActive?: boolean;
};

export function fetchSchedules(): Promise<Schedule[]> {
  return apiRequest<Schedule[]>(`${BASE}/schedules`, { authenticated: true });
}

export function createSchedule(input: ScheduleInput): Promise<Schedule> {
  return apiRequest<Schedule>(`${BASE}/schedules`, {
    method: "POST",
    body: input,
    authenticated: true,
  });
}

export function updateSchedule(id: string, input: Omit<ScheduleInput, "medicationId">): Promise<Schedule> {
  return apiRequest<Schedule>(`${BASE}/schedules/${id}`, {
    method: "PATCH",
    body: input,
    authenticated: true,
  });
}

export function deleteSchedule(id: string): Promise<{ _id: string }> {
  return apiRequest<{ _id: string }>(`${BASE}/schedules/${id}`, {
    method: "DELETE",
    authenticated: true,
  });
}

// ── Dose logs ───────────────────────────────────────────────────────────────

export type DoseLogInput = {
  scheduleId: string;
  scheduledAt: string;
  status: DoseStatus;
  respondedAt?: string | null;
  snoozedUntil?: string | null;
  caregiverAlerted?: boolean;
  quantityUsed?: number;
};

/**
 * Records a dose response. Idempotent on (scheduleId, scheduledAt), so a
 * queued offline response replayed twice cannot double-count.
 */
export function recordDoseLog(
  input: DoseLogInput,
): Promise<{ doseLog: DoseLog; caregiver: { delivered: boolean; reason?: string } | null }> {
  return apiRequest(`${BASE}/dose-logs`, { method: "POST", body: input, authenticated: true });
}

export function fetchDoseLogs(range?: { from?: Date; to?: Date }): Promise<{
  doseLogs: DoseLog[];
  summary: AdherenceSummary;
}> {
  const params = new URLSearchParams();
  if (range?.from) params.set("from", range.from.toISOString());
  if (range?.to) params.set("to", range.to.toISOString());
  const query = params.toString();

  return apiRequest(`${BASE}/dose-logs${query ? `?${query}` : ""}`, { authenticated: true });
}

// ── Sync, refills, profile ──────────────────────────────────────────────────

/**
 * Pulls what changed on other devices. `since` omitted means a full pull.
 */
export function syncMedications(input: { since?: string; timezone?: string }): Promise<SyncResult> {
  return apiRequest<SyncResult>(`${BASE}/sync`, {
    method: "POST",
    body: input,
    authenticated: true,
  });
}

export function fetchRefills(): Promise<Medication[]> {
  return apiRequest<Medication[]>(`${BASE}/refills`, { authenticated: true });
}

export function updateReminderProfile(input: {
  timezone?: string;
  caregiverEmail?: string | null;
}): Promise<{ timezone: string; caregiverEmail: string | null }> {
  return apiRequest(`${BASE}/profile`, { method: "PATCH", body: input, authenticated: true });
}
