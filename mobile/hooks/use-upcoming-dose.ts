import { useCallback, useEffect, useState } from "react";

import { doseKey, occurrencesForDay } from "@/lib/dose-schedule";
import {
  fetchDoseLogs,
  syncMedications,
  type DoseStatus,
  type Medication,
} from "@/lib/medications";

export type UpcomingDose = {
  scheduleId: string;
  scheduledAt: string;
  medication: Medication | undefined;
};

type Snapshot = {
  next: UpcomingDose | null;
  pendingToday: number;
};

const EMPTY: Snapshot = { next: null, pendingToday: 0 };

/**
 * The next dose still due today, for the home screen's summary cards.
 *
 * Read-only on purpose: it never schedules or cancels notifications. That is
 * `useMedications`' job on the reminder screens, and doing it here would mean
 * every visit to the dashboard rebuilt the OS notification queue.
 *
 * Every failure resolves to the empty snapshot — these cards are peripheral,
 * and a dashboard that errors because a secondary card could not load is worse
 * than one showing its empty state.
 */
export function useUpcomingDose(): Snapshot {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);

  /** Returns the snapshot rather than setting it, so the effect owns cancellation. */
  const loadSnapshot = useCallback(async (): Promise<Snapshot> => {
    try {
      const { medications, schedules } = await syncMedications({});
      if (schedules.length === 0) return EMPTY;

      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      let answered = new Set<string>();
      try {
        const history = await fetchDoseLogs({ from: dayStart, to: dayEnd });
        const settled: DoseStatus[] = ["taken", "missed"];
        answered = new Set(
          history.doseLogs
            .filter((log) => settled.includes(log.status))
            .map((log) => doseKey(log.scheduleId, log.scheduledAt)),
        );
      } catch {
        // Offline: treat every slot as unanswered rather than hiding the card.
      }

      const remaining = occurrencesForDay(schedules, now).filter(
        (occurrence) =>
          !answered.has(doseKey(occurrence.scheduleId, occurrence.scheduledAt)) &&
          new Date(occurrence.scheduledAt).getTime() >= now.getTime(),
      );

      const upcoming = remaining[0];

      return {
        pendingToday: remaining.length,
        next: upcoming
          ? {
              scheduleId: upcoming.scheduleId,
              scheduledAt: upcoming.scheduledAt,
              medication: medications.find((item) => item._id === upcoming.medicationId),
            }
          : null,
      };
    } catch {
      return EMPTY;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadSnapshot().then((next) => {
      // Dropped when the dashboard unmounted mid-request.
      if (!cancelled) setSnapshot(next);
    });

    return () => {
      cancelled = true;
    };
  }, [loadSnapshot]);

  return snapshot;
}
