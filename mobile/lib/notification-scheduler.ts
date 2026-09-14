import Constants from "expo-constants";
import { Platform } from "react-native";

import { nextOccurrenceAfter, occurrencesBetween, type DoseOccurrence } from "@/lib/dose-schedule";
import type { Medication, Schedule } from "@/lib/medications";

/**
 * All `expo-notifications` interaction for medication reminders.
 *
 * ── Why the device schedules, not the server ────────────────────────────────
 * A dose reminder must fire at an exact minute whether or not the phone has
 * signal, and whether or not the app is running. A server push can satisfy
 * neither reliably, so every reminder here is a *local* notification scheduled
 * on-device from the synced schedules. The backend is the durable history and
 * the multi-device sync; it never fires a dose reminder.
 *
 * ── Expo Go ─────────────────────────────────────────────────────────────────
 * `expo-notifications` throws at import time inside Expo Go (push-token
 * auto-registration was removed in SDK 53), so it is `require`d lazily and
 * only outside Expo Go — the same guard `lib/permissions.ts` uses. Every
 * export below degrades to a no-op in Expo Go rather than crashing the screen;
 * use a development build to exercise reminders for real. See the README.
 *
 * This module owns scheduling only. What a dose response *means* — the
 * pending -> taken | missed | snoozed state machine — lives in
 * `lib/dose-actions.ts`, which consumes `addDoseResponseListener` here.
 */

const isExpoGo = Constants.appOwnership === "expo";

type NotificationsModule = typeof import("expo-notifications");

function getNotificationsModule(): NotificationsModule | null {
  if (isExpoGo) return null;
  return require("expo-notifications") as NotificationsModule;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Category wiring the "Mark as taken" / "Snooze" buttons onto a reminder. */
export const DOSE_CATEGORY_ID = "cureliynk.dose";

export const DOSE_ACTION_TAKEN = "DOSE_TAKEN";
export const DOSE_ACTION_SNOOZE = "DOSE_SNOOZE";

/** Android channel — required for anything to make a sound on Android 8+. */
const DOSE_CHANNEL_ID = "medication-reminders";

export const SNOOZE_MINUTES = 10;

/** How long an unanswered dose waits before the follow-up nudge. */
export const MISSED_FOLLOWUP_MINUTES = 30;

// Identifier prefixes let a rescheduling pass cancel only this feature's
// notifications, leaving any other notification the app schedules alone.
const DOSE_PREFIX = "dose:";
const FOLLOWUP_PREFIX = "followup:";

/** Payload carried on every reminder, read back when the user responds. */
export type DoseNotificationData = {
  kind: "dose" | "followup";
  scheduleId: string;
  medicationId: string;
  /** ISO instant of the slot this reminder is for. */
  scheduledAt: string;
};

function isDoseData(data: unknown): data is DoseNotificationData {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Partial<DoseNotificationData>;
  return (
    (candidate.kind === "dose" || candidate.kind === "followup") &&
    typeof candidate.scheduleId === "string" &&
    typeof candidate.scheduledAt === "string"
  );
}

// ── Setup ───────────────────────────────────────────────────────────────────

/**
 * Registers the foreground handler, the Android channel and the dose category.
 * Safe to call repeatedly — every underlying call is idempotent.
 */
export async function configureNotifications(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    // SDK 53+ splits the old `shouldShowAlert` into banner and list.
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(DOSE_CHANNEL_ID, {
      name: "Medication reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#22C55E",
      sound: "default",
    });
  }

  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY_ID, [
    {
      identifier: DOSE_ACTION_TAKEN,
      buttonTitle: "Mark as taken",
      // Both actions resolve from the shade without pulling the user into the
      // app. The cost is that on a killed Android app the JS listener may not
      // run until next launch — `drainLastResponse()` below is the backstop.
      options: { opensAppToForeground: false },
    },
    {
      identifier: DOSE_ACTION_SNOOZE,
      buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * Asks for notification permission, returning whether reminders can fire.
 * Called on first use of the reminder screens rather than at app launch, so
 * the prompt arrives with context.
 */
export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  // iOS only ever shows the system prompt once; a second request resolves
  // immediately with the previous answer, so this is safe to call again.
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// ── Scheduling ──────────────────────────────────────────────────────────────

function contentFor(
  medication: Medication | undefined,
  data: DoseNotificationData,
  isFollowUp: boolean,
) {
  const name = medication?.name ?? "your medication";
  const dosage = medication?.dosage ? ` (${medication.dosage})` : "";

  return {
    title: isFollowUp ? "Did you take your dose?" : "Time for your medicine",
    body: isFollowUp ? `You haven't marked ${name}${dosage} yet.` : `Take ${name}${dosage} now.`,
    categoryIdentifier: DOSE_CATEGORY_ID,
    data,
    sound: "default" as const,
  };
}

/**
 * Rebuilds every dose reminder from the given schedules.
 *
 * Cancel-then-reschedule rather than diffing: the set is small (a handful of
 * schedules), and rebuilding wholesale is the only approach that stays correct
 * when a schedule is edited on another device, when the timezone changes, or
 * when the OS drops pending notifications after a reboot.
 *
 * Returns how many reminders are now pending, for the caller to surface.
 */
export async function scheduleAllReminders(
  medications: Medication[],
  schedules: Schedule[],
): Promise<number> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return 0;

  if (!(await ensureNotificationPermissions())) return 0;

  await cancelAllDoseReminders();

  const byId = new Map(medications.map((medication) => [medication._id, medication]));
  const now = new Date();
  let scheduled = 0;

  const live = schedules.filter((schedule) => {
    if (!schedule.isActive) return false;
    return !byId.get(schedule.medicationId)?.isArchived;
  });

  for (const schedule of live) {
    scheduled += await scheduleOne(Notifications, schedule, byId.get(schedule.medicationId), now);
  }

  scheduled += await scheduleUpcomingFollowUps(live, byId, now);

  return scheduled;
}

/** How far ahead one-shot follow-up nudges are pre-scheduled. */
const FOLLOWUP_HORIZON_HOURS = 48;

/**
 * Pre-schedules the "you haven't answered" nudge for every dose in the next
 * couple of days.
 *
 * These have to be queued in advance, not when a dose fires: nothing of ours
 * runs at fire time if the app is killed, so a reminder the user simply ignores
 * — the case the nudge exists for — would otherwise never produce one. They are
 * one-shot DATE triggers rather than repeating ones so that answering a dose can
 * cancel its own nudge without silencing every future dose.
 *
 * The horizon is refreshed on each pass, and the passes happen whenever the
 * reminder screens load.
 */
async function scheduleUpcomingFollowUps(
  schedules: Schedule[],
  medications: Map<string, Medication>,
  now: Date,
): Promise<number> {
  const horizonEnd = new Date(now.getTime() + FOLLOWUP_HORIZON_HOURS * 60 * 60 * 1000);
  let scheduled = 0;

  for (const schedule of schedules) {
    for (const occurrence of occurrencesBetween(schedule, now, horizonEnd)) {
      const fireAt = new Date(
        new Date(occurrence.scheduledAt).getTime() + MISSED_FOLLOWUP_MINUTES * 60 * 1000,
      );

      // A dose whose nudge would already be due needs no reminder about it;
      // the reconciliation sweep on load handles those.
      if (fireAt.getTime() <= now.getTime()) continue;

      await scheduleMissedFollowUpAt(occurrence, medications.get(occurrence.medicationId), fireAt);
      scheduled += 1;
    }
  }

  return scheduled;
}

/**
 * The next instant matching a wall clock, optionally restricted to one weekday.
 *
 * Each repeating trigger needs the slot *it specifically* represents, which is
 * not the same as the schedule's overall next dose — a schedule with 08:00 and
 * 20:00 has two triggers, and they must carry different payloads.
 */
function nextAtClock(hour: number, minute: number, weekday: number | null, now: Date): Date {
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    candidate.setHours(hour, minute, 0, 0);

    if (candidate.getTime() <= now.getTime()) continue;
    if (weekday !== null && candidate.getDay() !== weekday) continue;

    return candidate;
  }

  // Unreachable for any valid clock time, but a total function keeps the
  // callers free of null handling they would never exercise.
  const fallback = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
}

async function scheduleOne(
  Notifications: NotificationsModule,
  schedule: Schedule,
  medication: Medication | undefined,
  now: Date,
): Promise<number> {
  const { SchedulableTriggerInputTypes } = Notifications;
  const channelId = Platform.OS === "android" ? DOSE_CHANNEL_ID : undefined;
  let count = 0;

  // ── daily: one repeating DAILY trigger per time of day ────────────────────
  if (schedule.frequency === "daily") {
    for (const [index, time] of schedule.timeOfDay.entries()) {
      const [hour, minute] = time.split(":").map(Number);

      await Notifications.scheduleNotificationAsync({
        identifier: `${DOSE_PREFIX}${schedule._id}:${index}`,
        content: contentFor(
          medication,
          {
            kind: "dose",
            scheduleId: schedule._id,
            medicationId: schedule.medicationId,
            // The slot the *first* firing represents. A repeating trigger
            // reuses one payload, so `dose-actions` recomputes the true slot
            // from the delivery time on every later firing.
            scheduledAt: nextAtClock(hour, minute, null, now).toISOString(),
          },
          false,
        ),
        trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId },
      });
      count += 1;
    }
    return count;
  }

  // ── weekly: one repeating WEEKLY trigger per (day, time) pair ─────────────
  if (schedule.frequency === "weekly") {
    for (const [dayIndex, day] of schedule.daysOfWeek.entries()) {
      for (const [timeIndex, time] of schedule.timeOfDay.entries()) {
        const [hour, minute] = time.split(":").map(Number);

        await Notifications.scheduleNotificationAsync({
          identifier: `${DOSE_PREFIX}${schedule._id}:${dayIndex}-${timeIndex}`,
          content: contentFor(
            medication,
            {
              kind: "dose",
              scheduleId: schedule._id,
              medicationId: schedule.medicationId,
              scheduledAt: nextAtClock(hour, minute, day, now).toISOString(),
            },
            false,
          ),
          // expo-notifications weekday is 1-7 with 1 = Sunday; the schedule
          // stores 0-6 with 0 = Sunday, matching JS `getDay()`.
          trigger: {
            type: SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour,
            minute,
            channelId,
          },
        });
        count += 1;
      }
    }
    return count;
  }

  // ── every_n_hours: only ever the next single occurrence ───────────────────
  // A repeating trigger cannot express "every 6 hours from a fixed anchor",
  // and pre-scheduling a long chain would blow past the iOS 64-pending-
  // notification limit. Each firing schedules its own successor, via
  // `scheduleNextIntervalDose` below.
  return (await scheduleNextIntervalDose(schedule, medication, now)) ? 1 : 0;
}

/**
 * Schedules the single next `every_n_hours` dose after `after`.
 *
 * Called both by the initial pass and by the response handler each time one of
 * these fires, which is what keeps the chain going without pre-scheduling.
 */
export async function scheduleNextIntervalDose(
  schedule: Schedule,
  medication: Medication | undefined,
  after: Date = new Date(),
): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  const next = nextOccurrenceAfter(schedule, after);
  if (!next) return null;

  const identifier = `${DOSE_PREFIX}${schedule._id}:interval`;

  // Replaces any previous link in the chain — scheduling with an identifier
  // that is already pending overwrites it rather than adding a second.
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: contentFor(
      medication,
      {
        kind: "dose",
        scheduleId: schedule._id,
        medicationId: schedule.medicationId,
        scheduledAt: next.toISOString(),
      },
      false,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next,
      channelId: Platform.OS === "android" ? DOSE_CHANNEL_ID : undefined,
    },
  });

  return identifier;
}

/**
 * Queues the ~30-minute "you haven't answered" nudge for one dose.
 *
 * Scheduled when a dose fires and cancelled the moment the user responds, so
 * it only ever reaches someone who genuinely ignored the first reminder.
 */
export async function scheduleMissedFollowUp(
  occurrence: DoseOccurrence,
  medication: Medication | undefined,
  minutesFromNow: number = MISSED_FOLLOWUP_MINUTES,
): Promise<void> {
  await scheduleMissedFollowUpAt(
    occurrence,
    medication,
    new Date(Date.now() + minutesFromNow * 60 * 1000),
  );
}

/** The absolute-time form, used when pre-scheduling a horizon of nudges. */
async function scheduleMissedFollowUpAt(
  occurrence: DoseOccurrence,
  medication: Medication | undefined,
  fireAt: Date,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    // Keyed by the dose it chases, so answering that dose cancels exactly this
    // nudge and rescheduling a horizon overwrites rather than duplicates.
    identifier: followUpIdentifier(occurrence.scheduleId, occurrence.scheduledAt),
    content: contentFor(
      medication,
      {
        kind: "followup",
        scheduleId: occurrence.scheduleId,
        medicationId: occurrence.medicationId,
        scheduledAt: occurrence.scheduledAt,
      },
      true,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: Platform.OS === "android" ? DOSE_CHANNEL_ID : undefined,
    },
  });
}

/** Re-fires one dose after the snooze window. */
export async function scheduleSnoozedDose(
  occurrence: DoseOccurrence,
  medication: Medication | undefined,
  minutes: number = SNOOZE_MINUTES,
): Promise<Date> {
  const Notifications = getNotificationsModule();
  const fireAt = new Date(Date.now() + minutes * 60 * 1000);
  if (!Notifications) return fireAt;

  await Notifications.scheduleNotificationAsync({
    identifier: `${DOSE_PREFIX}snooze:${occurrence.scheduleId}:${occurrence.scheduledAt}`,
    content: contentFor(
      medication,
      {
        kind: "dose",
        scheduleId: occurrence.scheduleId,
        medicationId: occurrence.medicationId,
        // Keeps the ORIGINAL slot, so a snoozed dose logs against the dose it
        // was meant to be rather than opening a new one.
        scheduledAt: occurrence.scheduledAt,
      },
      false,
    ),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, Math.round(minutes * 60)),
      repeats: false,
      channelId: Platform.OS === "android" ? DOSE_CHANNEL_ID : undefined,
    },
  });

  return fireAt;
}

function followUpIdentifier(scheduleId: string, scheduledAt: string): string {
  return `${FOLLOWUP_PREFIX}${scheduleId}:${scheduledAt}`;
}

/** Called as soon as a dose is answered, so the nudge never arrives late. */
export async function cancelMissedFollowUp(
  scheduleId: string,
  scheduledAt: string,
): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      followUpIdentifier(scheduleId, scheduledAt),
    );
  } catch {
    // Cancelling an identifier that already fired (or never existed) is not an
    // error worth surfacing — the desired end state is "not pending".
  }
}

/** Cancels this feature's notifications, leaving any others untouched. */
export async function cancelAllDoseReminders(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  const pending = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    pending
      .filter(
        (request) =>
          request.identifier.startsWith(DOSE_PREFIX) ||
          request.identifier.startsWith(FOLLOWUP_PREFIX),
      )
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined),
      ),
  );
}

/** Cancels every reminder belonging to one schedule (on delete or deactivate). */
export async function cancelRemindersForSchedule(scheduleId: string): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  const pending = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    pending
      .filter((request) => request.identifier.includes(scheduleId))
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined),
      ),
  );
}

// ── Responses ───────────────────────────────────────────────────────────────

export type DoseResponse = {
  data: DoseNotificationData;
  /** `DOSE_ACTION_TAKEN`, `DOSE_ACTION_SNOOZE`, or the default tap. */
  actionIdentifier: string;
  /** True when the user tapped the notification body rather than a button. */
  isDefaultAction: boolean;
};

function toDoseResponse(response: unknown): DoseResponse | null {
  const typed = response as {
    actionIdentifier?: string;
    notification?: { request?: { content?: { data?: unknown } } };
  };

  const data = typed?.notification?.request?.content?.data;
  if (!isDoseData(data)) return null;

  const actionIdentifier = typed.actionIdentifier ?? "";

  return {
    data,
    actionIdentifier,
    // expo-notifications exports this as DEFAULT_ACTION_IDENTIFIER; compared
    // by value so this stays a pure function usable under test.
    isDefaultAction: actionIdentifier === "expo.modules.notifications.actions.DEFAULT",
  };
}

/**
 * Subscribes to dose responses. Returns an unsubscribe function, so a caller
 * can hand it straight back from a `useEffect`.
 */
export function addDoseResponseListener(
  handler: (response: DoseResponse) => void,
): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => undefined;

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const parsed = toDoseResponse(response);
    // Ignores notifications from elsewhere in the app that carry no dose data.
    if (parsed) handler(parsed);
  });

  return () => subscription.remove();
}

/**
 * Replays the response that launched the app, if it was a dose response.
 *
 * Needed because the actions use `opensAppToForeground: false`: when the app
 * is not running, the in-process listener never sees them. The OS keeps only
 * the most recent response, so a burst answered while the app was killed is
 * reconciled from the server's dose logs on the next sync rather than here.
 */
export async function drainLastResponse(): Promise<DoseResponse | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  const last = await Notifications.getLastNotificationResponseAsync();
  return last ? toDoseResponse(last) : null;
}

/** Whether reminders can actually fire in this runtime (false inside Expo Go). */
export function areRemindersSupported(): boolean {
  return !isExpoGo;
}
