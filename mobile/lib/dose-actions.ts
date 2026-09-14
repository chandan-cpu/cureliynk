import AsyncStorage from "@react-native-async-storage/async-storage";

import { mostRecentOccurrence, type DoseOccurrence } from "@/lib/dose-schedule";
import {
  DOSE_ACTION_SNOOZE,
  DOSE_ACTION_TAKEN,
  MISSED_FOLLOWUP_MINUTES,
  SNOOZE_MINUTES,
  cancelMissedFollowUp,
  scheduleMissedFollowUp,
  scheduleNextIntervalDose,
  scheduleSnoozedDose,
  type DoseResponse,
} from "@/lib/notification-scheduler";
import {
  recordDoseLog,
  type DoseLogInput,
  type DoseStatus,
  type Medication,
  type Schedule,
} from "@/lib/medications";

/**
 * The dose state machine, and the only place dose responses are written.
 *
 *   pending ──"Mark as taken"──> taken       (terminal)
 *      │
 *      ├────"Snooze 10 min"────> snoozed ──> pending again when it re-fires
 *      │
 *      └──unanswered ~30 min───> missed ────> optional caregiver escalation
 *
 * Imports `notification-scheduler` but is never imported by it, so the two
 * stay acyclic: the scheduler knows how to fire notifications, this module
 * knows what the answers mean.
 */

const OUTBOX_KEY = "cureliynk.doseOutbox";

/** Cap on the offline queue, oldest dropped first. */
const OUTBOX_LIMIT = 200;

// ── Offline outbox ──────────────────────────────────────────────────────────

/**
 * Dose responses that could not reach the server yet.
 *
 * A reminder is answered from the notification shade, often on a phone with no
 * signal — dropping that response would silently corrupt the adherence record.
 * The POST is idempotent on (scheduleId, scheduledAt), so replaying the queue
 * can never double-count.
 */
async function readOutbox(): Promise<DoseLogInput[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DoseLogInput[]) : [];
  } catch {
    // A corrupt queue must not brick every future dose response; the record
    // is recoverable from the server, an unreadable local file is not.
    return [];
  }
}

async function writeOutbox(entries: DoseLogInput[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(entries.slice(-OUTBOX_LIMIT)));
  } catch {
    // Out of storage. Nothing useful to do — the dose is already reflected in
    // the UI, and the next successful call re-establishes the server record.
  }
}

async function enqueue(entry: DoseLogInput): Promise<void> {
  const outbox = await readOutbox();

  // Same dose answered twice offline: the later answer wins, matching what the
  // server's upsert would have done had the call gone through.
  const deduped = outbox.filter(
    (queued) => !(queued.scheduleId === entry.scheduleId && queued.scheduledAt === entry.scheduledAt),
  );

  await writeOutbox([...deduped, entry]);
}

/**
 * Replays queued responses. Call on app foreground and after a successful sync.
 * Returns how many were accepted.
 */
export async function flushDoseOutbox(): Promise<number> {
  const outbox = await readOutbox();
  if (outbox.length === 0) return 0;

  const stillQueued: DoseLogInput[] = [];
  let flushed = 0;

  for (const entry of outbox) {
    try {
      await recordDoseLog(entry);
      flushed += 1;
    } catch {
      // Still offline — keep this and everything after it for the next attempt.
      stillQueued.push(entry);
    }
  }

  await writeOutbox(stillQueued);
  return flushed;
}

export async function getPendingOutboxCount(): Promise<number> {
  return (await readOutbox()).length;
}

// ── Recording a response ────────────────────────────────────────────────────

/** Posts a dose response, falling back to the outbox when the network fails. */
async function persist(entry: DoseLogInput): Promise<{ synced: boolean }> {
  try {
    await recordDoseLog(entry);
    return { synced: true };
  } catch {
    await enqueue(entry);
    return { synced: false };
  }
}

export type DoseActionResult = {
  status: DoseStatus;
  /** False when the response was queued for a later retry. */
  synced: boolean;
  /** For a snooze, when the dose will re-fire. */
  nextFireAt?: Date;
};

/**
 * pending -> taken.
 *
 * `quantityUsed` draws the medication's stock down server-side; it defaults to
 * one unit, which is right for tablets and capsules. The follow-up nudge is
 * cancelled first so an answered dose can never be chased.
 */
export async function markDoseTaken(
  occurrence: DoseOccurrence,
  options: { quantityUsed?: number } = {},
): Promise<DoseActionResult> {
  await cancelMissedFollowUp(occurrence.scheduleId, occurrence.scheduledAt);

  const { synced } = await persist({
    scheduleId: occurrence.scheduleId,
    scheduledAt: occurrence.scheduledAt,
    status: "taken",
    respondedAt: new Date().toISOString(),
    quantityUsed: options.quantityUsed ?? 1,
  });

  return { status: "taken", synced };
}

/**
 * pending -> snoozed.
 *
 * The re-fired notification carries the ORIGINAL slot, so the dose returns to
 * pending rather than opening a second one.
 */
export async function snoozeDose(
  occurrence: DoseOccurrence,
  medication: Medication | undefined,
  minutes: number = SNOOZE_MINUTES,
): Promise<DoseActionResult> {
  await cancelMissedFollowUp(occurrence.scheduleId, occurrence.scheduledAt);

  const nextFireAt = await scheduleSnoozedDose(occurrence, medication, minutes);

  const { synced } = await persist({
    scheduleId: occurrence.scheduleId,
    scheduledAt: occurrence.scheduledAt,
    status: "snoozed",
    respondedAt: new Date().toISOString(),
    snoozedUntil: nextFireAt.toISOString(),
  });

  return { status: "snoozed", synced, nextFireAt };
}

/**
 * pending -> missed.
 *
 * `escalate` asks the backend to alert the caregiver. Delivery is not wired up
 * server-side (no mail transport exists) — the escalation is recorded and
 * readable in history. See server/src/services/caregiver.service.js.
 */
export async function markDoseMissed(
  occurrence: DoseOccurrence,
  options: { escalate?: boolean } = {},
): Promise<DoseActionResult> {
  await cancelMissedFollowUp(occurrence.scheduleId, occurrence.scheduledAt);

  const { synced } = await persist({
    scheduleId: occurrence.scheduleId,
    scheduledAt: occurrence.scheduledAt,
    status: "missed",
    respondedAt: new Date().toISOString(),
    caregiverAlerted: options.escalate ?? false,
  });

  return { status: "missed", synced };
}

/**
 * Marks doses the user never answered as missed, and escalates them.
 *
 * The device cannot run code when a notification fires while the app is closed,
 * so "still unanswered 30 minutes later" is settled the next time the app is
 * open rather than by a timer. A dose is only judged once its follow-up nudge
 * has come and gone, which is why the grace period is the follow-up window.
 *
 * `escalate` should be true only when the user has a caregiver on file.
 * Returns the occurrences that were newly marked missed.
 */
export async function reconcileMissedDoses(
  occurrences: DoseOccurrence[],
  statusOf: (occurrence: DoseOccurrence) => DoseStatus,
  options: { escalate?: boolean; now?: Date } = {},
): Promise<DoseOccurrence[]> {
  const now = options.now ?? new Date();
  const graceMs = MISSED_FOLLOWUP_MINUTES * 60 * 1000;

  const abandoned = occurrences.filter((occurrence) => {
    if (statusOf(occurrence) !== "pending") return false;
    return new Date(occurrence.scheduledAt).getTime() + graceMs < now.getTime();
  });

  for (const occurrence of abandoned) {
    await markDoseMissed(occurrence, { escalate: options.escalate });
  }

  return abandoned;
}

// ── Notification response handling ──────────────────────────────────────────

/**
 * Recovers the dose slot a response belongs to.
 *
 * Repeating DAILY/WEEKLY triggers carry the payload they were created with, so
 * on later firings the embedded `scheduledAt` points at a slot in the past.
 * A `followup` or one-shot `date` trigger is always accurate, so it is trusted
 * as-is; anything else is recomputed against the schedule.
 */
export function resolveOccurrence(
  response: DoseResponse,
  schedules: Schedule[],
  now: Date = new Date(),
): DoseOccurrence | null {
  const { data } = response;
  const schedule = schedules.find((candidate) => candidate._id === data.scheduleId);
  if (!schedule) return null;

  const base = {
    scheduleId: data.scheduleId,
    medicationId: schedule.medicationId,
  };

  const payloadAt = new Date(data.scheduledAt);
  const isFresh = Math.abs(payloadAt.getTime() - now.getTime()) < 5 * 60 * 1000;

  if (data.kind === "followup" || schedule.frequency === "every_n_hours" || isFresh) {
    return { ...base, scheduledAt: data.scheduledAt };
  }

  const resolved = mostRecentOccurrence(schedule, now);
  return { ...base, scheduledAt: (resolved ?? payloadAt).toISOString() };
}

/**
 * Applies one notification response end to end.
 *
 * Returns the resulting state, or null when the response referred to a
 * schedule this device no longer knows about (deleted on another device).
 */
export async function handleDoseResponse(
  response: DoseResponse,
  context: { schedules: Schedule[]; medications: Medication[] },
): Promise<DoseActionResult | null> {
  const occurrence = resolveOccurrence(response, context.schedules);
  if (!occurrence) return null;

  const schedule = context.schedules.find((item) => item._id === occurrence.scheduleId);
  const medication = context.medications.find((item) => item._id === occurrence.medicationId);

  // An `every_n_hours` chain advances on every firing, however the user
  // answers — including a bare tap — so the next dose is queued before the
  // response itself is recorded.
  if (schedule?.frequency === "every_n_hours") {
    await scheduleNextIntervalDose(schedule, medication);
  }

  if (response.actionIdentifier === DOSE_ACTION_TAKEN) {
    return markDoseTaken(occurrence);
  }

  if (response.actionIdentifier === DOSE_ACTION_SNOOZE) {
    return snoozeDose(occurrence, medication);
  }

  // A plain tap opens the app on Today's doses without deciding anything, so
  // the dose stays pending and the follow-up nudge is left in place.
  await scheduleMissedFollowUp(occurrence, medication, MISSED_FOLLOWUP_MINUTES);
  return { status: "pending", synced: true };
}
