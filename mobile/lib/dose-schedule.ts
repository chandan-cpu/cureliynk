/**
 * Pure date math for turning a Schedule into concrete dose times.
 *
 * Deliberately free of `expo-notifications` so it can be unit-tested in Jest
 * and reused by the Today/History screens, which need the same occurrences the
 * scheduler does but must not touch the native module.
 *
 * ── On timezones ────────────────────────────────────────────────────────────
 * A schedule stores wall-clock strings ("08:00"), never instants. Every
 * function here resolves them against the *device's current local time* using
 * plain `Date` accessors, which is what makes a timezone change self-healing:
 * after the device moves, recomputing from the same "08:00" yields 08:00 in
 * the new zone. The `timezone` on the user record exists so the server can
 * render history in the user's day boundaries and so the app can notice the
 * zone changed and reschedule — it is not an input to this math.
 */

import type { Schedule } from "@/lib/medications";

/** One concrete dose slot. `scheduledAt` is an ISO instant. */
export type DoseOccurrence = {
  scheduleId: string;
  medicationId: string;
  scheduledAt: string;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Stable identity for a dose, matching the backend's unique
 * (scheduleId, scheduledAt) index. Used to reconcile locally computed
 * occurrences against dose logs pulled from the server.
 */
export function doseKey(scheduleId: string, scheduledAt: string | Date): string {
  const iso = typeof scheduledAt === "string" ? scheduledAt : scheduledAt.toISOString();
  return `${scheduleId}@${iso}`;
}

function parseTimeOfDay(time: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** A new Date on the same local calendar day as `day`, at the given wall clock. */
function atLocalTime(day: Date, hour: number, minute: number): Date {
  const result = new Date(day);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function startOfLocalDay(day: Date): Date {
  const result = new Date(day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Whether the schedule is live on the given instant (start/end/isActive). */
export function isScheduleActiveAt(schedule: Schedule, at: Date): boolean {
  if (!schedule.isActive) return false;

  // Compared at day granularity: a course that starts "today" should include
  // today's earlier doses, not only those after the moment it was created.
  const start = startOfLocalDay(new Date(schedule.startDate));
  if (at.getTime() < start.getTime()) return false;

  if (schedule.endDate) {
    const end = startOfLocalDay(new Date(schedule.endDate));
    end.setHours(23, 59, 59, 999);
    if (at.getTime() > end.getTime()) return false;
  }

  return true;
}

/**
 * The first dose strictly after `from`, or null when the course has ended.
 *
 * This is the function the scheduler leans on for `every_n_hours`: rather than
 * pre-scheduling a long chain of notifications, it asks for one occurrence at
 * a time and schedules the next only once the previous has fired.
 */
export function nextOccurrenceAfter(schedule: Schedule, from: Date): Date | null {
  if (!schedule.isActive) return null;

  const start = new Date(schedule.startDate);
  const searchFrom = from.getTime() < start.getTime() ? new Date(start.getTime() - 1) : from;

  const candidate =
    schedule.frequency === "every_n_hours"
      ? nextIntervalOccurrence(schedule, searchFrom)
      : nextClockOccurrence(schedule, searchFrom);

  if (!candidate) return null;
  return isScheduleActiveAt(schedule, candidate) ? candidate : null;
}

function nextIntervalOccurrence(schedule: Schedule, from: Date): Date | null {
  const intervalHours = schedule.intervalHours;
  if (!intervalHours || intervalHours <= 0) return null;

  // The start date is the anchor, so "every 6 hours" stays phase-locked to
  // when the course began instead of drifting each time the app restarts.
  const anchor = new Date(schedule.startDate).getTime();
  const stepMs = intervalHours * MS_PER_HOUR;

  if (from.getTime() < anchor) return new Date(anchor);

  const steps = Math.floor((from.getTime() - anchor) / stepMs) + 1;
  return new Date(anchor + steps * stepMs);
}

/** Handles `daily` and `weekly`, which both key off explicit wall-clock times. */
function nextClockOccurrence(schedule: Schedule, from: Date): Date | null {
  const times = schedule.timeOfDay
    .map(parseTimeOfDay)
    .filter((t): t is { hour: number; minute: number } => t !== null);

  if (times.length === 0) return null;

  const allowedDays =
    schedule.frequency === "weekly" && schedule.daysOfWeek.length > 0 ? schedule.daysOfWeek : null;

  // Scans forward a day at a time. Bounded at 8 days: a weekly schedule always
  // matches within 7, and one more covers a DST shift landing on the boundary.
  for (let dayOffset = 0; dayOffset <= 8; dayOffset += 1) {
    const day = new Date(from.getTime() + dayOffset * MS_PER_DAY);
    if (allowedDays && !allowedDays.includes(day.getDay())) continue;

    const todaysTimes = times
      .map(({ hour, minute }) => atLocalTime(day, hour, minute))
      .filter((candidate) => candidate.getTime() > from.getTime())
      .sort((a, b) => a.getTime() - b.getTime());

    if (todaysTimes.length > 0) return todaysTimes[0];
  }

  return null;
}

/**
 * Every dose for one schedule between two instants.
 *
 * Capped at 200 so a 1-hour interval over a long range cannot lock the UI
 * thread — far above the ~24 a real day produces.
 */
export function occurrencesBetween(schedule: Schedule, from: Date, to: Date): DoseOccurrence[] {
  const occurrences: DoseOccurrence[] = [];
  let cursor = new Date(from.getTime() - 1);

  for (let guard = 0; guard < 200; guard += 1) {
    const next = nextOccurrenceAfter(schedule, cursor);
    if (!next || next.getTime() > to.getTime()) break;

    occurrences.push({
      scheduleId: schedule._id,
      medicationId: schedule.medicationId,
      scheduledAt: next.toISOString(),
    });
    cursor = next;
  }

  return occurrences;
}

/** Every dose across every schedule for the local calendar day containing `day`. */
export function occurrencesForDay(schedules: Schedule[], day: Date = new Date()): DoseOccurrence[] {
  const dayStart = startOfLocalDay(day);
  const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY - 1);

  return schedules
    .flatMap((schedule) => occurrencesBetween(schedule, dayStart, dayEnd))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/**
 * The latest dose at or before `at`, or null if the schedule has none today.
 *
 * A repeating DAILY/WEEKLY trigger carries the payload it was created with,
 * so on its second and later firings the embedded `scheduledAt` is stale. The
 * response handler calls this to recover the slot that actually just fired.
 *
 * `toleranceMs` covers the gap between the OS firing a notification and the
 * handler running, so a dose delivered a few seconds early still resolves to
 * itself rather than to the previous slot.
 */
export function mostRecentOccurrence(
  schedule: Schedule,
  at: Date,
  toleranceMs: number = 2 * 60 * 1000,
): Date | null {
  const cutoff = new Date(at.getTime() + toleranceMs);
  const dayStart = startOfLocalDay(new Date(at.getTime() - MS_PER_DAY));

  const candidates = occurrencesBetween(schedule, dayStart, cutoff);
  if (candidates.length === 0) return null;

  return new Date(candidates[candidates.length - 1].scheduledAt);
}

/** "08:00" — the local wall-clock label for a dose, for list rows and headers. */
export function formatDoseTime(scheduledAt: string | Date): string {
  const date = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** The device's current IANA zone, used to detect that the user has travelled. */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    // Intl is present on every RN runtime the app targets, but a stripped
    // Hermes build would throw here rather than return a zone.
    return "UTC";
  }
}
