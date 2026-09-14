import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  flushDoseOutbox,
  handleDoseResponse,
  markDoseTaken,
  reconcileMissedDoses,
  snoozeDose,
} from "@/lib/dose-actions";
import {
  doseKey,
  getDeviceTimezone,
  occurrencesForDay,
  type DoseOccurrence,
} from "@/lib/dose-schedule";
import {
  fetchDoseLogs,
  syncMedications,
  updateReminderProfile,
  type DoseLog,
  type DoseStatus,
  type Medication,
  type Schedule,
} from "@/lib/medications";
import {
  addDoseResponseListener,
  areRemindersSupported,
  configureNotifications,
  drainLastResponse,
  ensureNotificationPermissions,
  scheduleAllReminders,
} from "@/lib/notification-scheduler";

/**
 * Data + notification wiring for the reminder screens.
 *
 * Follows the app's existing pattern — a hook per screen over the plain
 * functions in `lib/`, with no global cache — rather than introducing a second
 * data layer alongside it.
 */

type LibraryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

export type UseMedicationsResult = {
  state: LibraryState;
  medications: Medication[];
  schedules: Schedule[];
  /** How many local reminders are currently pending with the OS. */
  scheduledCount: number;
  /** False inside Expo Go, where reminders cannot fire at all. */
  remindersSupported: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

/**
 * Pulls medications and schedules, then rebuilds the device's local reminders
 * to match.
 *
 * Rescheduling is driven off the sync response rather than off local edits, so
 * a schedule changed on another phone takes effect here on the next pull.
 */
export function useMedications(): UseMedicationsResult {
  const [state, setState] = useState<LibraryState>({ status: "loading" });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Tracked so a timezone change is reported once, not on every refresh.
  const lastTimezone = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const timezone = getDeviceTimezone();

      // Always a full pull: the dataset is a handful of documents, and the
      // incremental path would need a local mirror to merge deltas into.
      // `since` exists on the endpoint for when that mirror is worth building.
      const result = await syncMedications({ timezone });

      setMedications(result.medications);
      setSchedules(result.schedules);
      setState({ status: "ready" });

      if (lastTimezone.current !== null && lastTimezone.current !== timezone) {
        // The device crossed zones. Wall-clock times resolve against local
        // time, so the reschedule below already produces the right instants —
        // this only keeps the server's copy honest for history rendering.
        await updateReminderProfile({ timezone }).catch(() => undefined);
      }
      lastTimezone.current = timezone;

      // Queued offline responses go out before anything else reads history.
      await flushDoseOutbox().catch(() => undefined);

      if (areRemindersSupported()) {
        const granted = await ensureNotificationPermissions();
        setPermissionGranted(granted);
        if (granted) {
          setScheduledCount(await scheduleAllReminders(result.medications, result.schedules));
        }
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not load your medicines.",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await configureNotifications();
      if (!cancelled) await refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const granted = await ensureNotificationPermissions();
    setPermissionGranted(granted);
    if (granted) setScheduledCount(await scheduleAllReminders(medications, schedules));
    return granted;
  }, [medications, schedules]);

  return {
    state,
    medications,
    schedules,
    scheduledCount,
    remindersSupported: areRemindersSupported(),
    permissionGranted,
    requestPermission,
    refresh,
  };
}

/** One row on Today's doses: a computed slot plus whatever is known about it. */
export type TodayDose = DoseOccurrence & {
  medication: Medication | undefined;
  status: DoseStatus;
  /** True once the slot's time has passed and it is still unanswered. */
  isOverdue: boolean;
};

export type UseTodayDosesResult = {
  doses: TodayDose[];
  isRefreshing: boolean;
  markTaken: (dose: TodayDose) => Promise<void>;
  snooze: (dose: TodayDose) => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Today's doses, merging locally computed slots with server dose logs.
 *
 * The slots are computed on-device because a dose that has not been answered
 * has no server row to fetch — the log is created by the response, not by the
 * schedule.
 */
export function useTodayDoses(
  medications: Medication[],
  schedules: Schedule[],
): UseTodayDosesResult {
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  /** Dose keys already settled as missed this session — see the sweep below. */
  const reconciled = useRef(new Set<string>());

  const occurrences = useMemo(() => occurrencesForDay(schedules, now), [schedules, now]);

  /**
   * Returns the day's logs rather than setting them, so each caller decides
   * whether the result is still wanted.
   *
   * Reads `now` off a fresh Date instead of the state value: the ticker below
   * moves `now` every minute, and depending on it would refetch the whole day
   * that often.
   */
  const loadLogs = useCallback(async (): Promise<DoseLog[] | null> => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    try {
      const result = await fetchDoseLogs({ from: dayStart, to: dayEnd });
      return result.doseLogs;
    } catch {
      // Offline: the computed slots still render, every dose simply shows as
      // pending. Responses queue locally and reconcile on the next refresh.
      return null;
    }
  }, []);

  /** Loads and applies, for the callers that are not racing an unmount. */
  const reloadLogs = useCallback(async () => {
    const next = await loadLogs();
    if (next) setLogs(next);
  }, [loadLogs]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setNow(new Date());
    await reloadLogs();
    setIsRefreshing(false);
  }, [reloadLogs]);

  useEffect(() => {
    let cancelled = false;

    loadLogs().then((next) => {
      if (!cancelled && next) setLogs(next);
    });

    return () => {
      cancelled = true;
    };
  }, [loadLogs]);

  // Keeps "overdue" honest without the user pulling to refresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Settles doses the user never answered.
   *
   * Nothing of ours runs when a notification fires with the app closed, so a
   * dose that was ignored stays "pending" locally until a pass like this one
   * judges it. Runs whenever the day's slots or logs change, which covers both
   * app launch and returning to the foreground.
   */
  useEffect(() => {
    if (occurrences.length === 0) return;

    let cancelled = false;
    const byKey = new Map(logs.map((log) => [doseKey(log.scheduleId, log.scheduledAt), log]));

    // The minute ticker re-runs this effect; without a guard an offline device
    // would re-post the same abandoned dose every minute. The outbox dedupes
    // the writes either way, this just avoids the pointless work.
    const unreconciled = occurrences.filter(
      (occurrence) => !reconciled.current.has(doseKey(occurrence.scheduleId, occurrence.scheduledAt)),
    );
    if (unreconciled.length === 0) return;

    reconcileMissedDoses(
      unreconciled,
      (occurrence) =>
        byKey.get(doseKey(occurrence.scheduleId, occurrence.scheduledAt))?.status ?? "pending",
      // Escalation is the server's call — it holds the caregiver address and
      // decides whether anything can actually be delivered.
      { escalate: true },
    )
      .then((missed) => {
        for (const dose of missed) {
          reconciled.current.add(doseKey(dose.scheduleId, dose.scheduledAt));
        }
        if (missed.length > 0 && !cancelled) reloadLogs();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [occurrences, logs, reloadLogs]);

  // Re-reads the day's logs when the app returns to the foreground: doses
  // answered from the notification shade were recorded while this screen slept.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        flushDoseOutbox()
          .then(() => reloadLogs())
          .catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [reloadLogs]);

  // Applies responses that arrived while the app was open, and the one that
  // launched it from a killed state.
  useEffect(() => {
    if (schedules.length === 0) return;

    let cancelled = false;
    const context = { schedules, medications };

    const unsubscribe = addDoseResponseListener((response) => {
      handleDoseResponse(response, context)
        .then(() => {
          if (!cancelled) reloadLogs();
        })
        .catch(() => undefined);
    });

    drainLastResponse()
      .then((response) => (response ? handleDoseResponse(response, context) : null))
      .then(() => {
        if (!cancelled) reloadLogs();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [schedules, medications, reloadLogs]);

  const doses = useMemo<TodayDose[]>(() => {
    const byKey = new Map(logs.map((log) => [doseKey(log.scheduleId, log.scheduledAt), log]));

    return occurrences.map((occurrence) => {
      const log = byKey.get(doseKey(occurrence.scheduleId, occurrence.scheduledAt));
      const status: DoseStatus = log?.status ?? "pending";

      return {
        ...occurrence,
        medication: medications.find((item) => item._id === occurrence.medicationId),
        status,
        isOverdue:
          status === "pending" && new Date(occurrence.scheduledAt).getTime() < now.getTime(),
      };
    });
  }, [occurrences, logs, medications, now]);

  /** Writes the new status straight into local state so the row reacts at once. */
  const applyLocalStatus = useCallback((dose: TodayDose, status: DoseStatus) => {
    setLogs((current) => {
      const key = doseKey(dose.scheduleId, dose.scheduledAt);
      const others = current.filter((log) => doseKey(log.scheduleId, log.scheduledAt) !== key);

      return [
        ...others,
        {
          _id: `local:${key}`,
          userId: "",
          scheduleId: dose.scheduleId,
          medicationId: dose.medicationId,
          scheduledAt: dose.scheduledAt,
          respondedAt: new Date().toISOString(),
          status,
          snoozedUntil: null,
          caregiverAlertedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const markTaken = useCallback(
    async (dose: TodayDose) => {
      applyLocalStatus(dose, "taken");
      await markDoseTaken(dose);
      await reloadLogs();
    },
    [applyLocalStatus, reloadLogs],
  );

  const snooze = useCallback(
    async (dose: TodayDose) => {
      applyLocalStatus(dose, "snoozed");
      await snoozeDose(dose, dose.medication);
      await reloadLogs();
    },
    [applyLocalStatus, reloadLogs],
  );

  return { doses, isRefreshing, markTaken, snooze, refresh };
}
