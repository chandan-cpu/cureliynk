import {
  doseKey,
  formatDoseTime,
  isScheduleActiveAt,
  mostRecentOccurrence,
  nextOccurrenceAfter,
  occurrencesBetween,
  occurrencesForDay,
} from "@/lib/dose-schedule";
import type { Schedule } from "@/lib/medications";

/**
 * These run in the machine's local zone, so every expectation is written in
 * local wall-clock terms — which is also exactly how the app resolves a
 * schedule's "08:00".
 */
function localDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    _id: "sched1",
    userId: "user1",
    medicationId: "med1",
    frequency: "daily",
    timeOfDay: ["08:00", "20:00"],
    intervalHours: null,
    daysOfWeek: [],
    startDate: localDate(2026, 1, 1).toISOString(),
    endDate: null,
    isActive: true,
    createdAt: localDate(2026, 1, 1).toISOString(),
    updatedAt: localDate(2026, 1, 1).toISOString(),
    ...overrides,
  };
}

describe("nextOccurrenceAfter — daily", () => {
  it("returns the next time of day later the same day", () => {
    const next = nextOccurrenceAfter(makeSchedule(), localDate(2026, 3, 10, 9, 0));
    expect(next).toEqual(localDate(2026, 3, 10, 20, 0));
  });

  it("rolls over to tomorrow once the last time has passed", () => {
    const next = nextOccurrenceAfter(makeSchedule(), localDate(2026, 3, 10, 21, 0));
    expect(next).toEqual(localDate(2026, 3, 11, 8, 0));
  });

  it("treats a time exactly now as already past, not as due again", () => {
    const next = nextOccurrenceAfter(makeSchedule(), localDate(2026, 3, 10, 8, 0));
    expect(next).toEqual(localDate(2026, 3, 10, 20, 0));
  });

  it("returns null once the course has ended", () => {
    const schedule = makeSchedule({ endDate: localDate(2026, 3, 9).toISOString() });
    expect(nextOccurrenceAfter(schedule, localDate(2026, 3, 10, 9, 0))).toBeNull();
  });

  it("returns null for an inactive schedule", () => {
    expect(
      nextOccurrenceAfter(makeSchedule({ isActive: false }), localDate(2026, 3, 10, 9, 0)),
    ).toBeNull();
  });

  it("jumps to the start date when the course has not begun", () => {
    const schedule = makeSchedule({ startDate: localDate(2026, 6, 1).toISOString() });
    const next = nextOccurrenceAfter(schedule, localDate(2026, 3, 10, 9, 0));
    expect(next).toEqual(localDate(2026, 6, 1, 8, 0));
  });
});

describe("nextOccurrenceAfter — weekly", () => {
  const weekly = makeSchedule({
    frequency: "weekly",
    timeOfDay: ["09:00"],
    // Monday and Thursday.
    daysOfWeek: [1, 4],
  });

  it("finds the next allowed weekday", () => {
    // 2026-03-10 is a Tuesday, so the next dose is Thursday the 12th.
    const next = nextOccurrenceAfter(weekly, localDate(2026, 3, 10, 12, 0));
    expect(next).toEqual(localDate(2026, 3, 12, 9, 0));
  });

  it("wraps into the following week from the last allowed day", () => {
    // Thursday after 09:00 -> the following Monday.
    const next = nextOccurrenceAfter(weekly, localDate(2026, 3, 12, 10, 0));
    expect(next).toEqual(localDate(2026, 3, 16, 9, 0));
  });

  it("uses the same day when its time has not yet passed", () => {
    const next = nextOccurrenceAfter(weekly, localDate(2026, 3, 12, 7, 0));
    expect(next).toEqual(localDate(2026, 3, 12, 9, 0));
  });
});

describe("nextOccurrenceAfter — every_n_hours", () => {
  const interval = makeSchedule({
    frequency: "every_n_hours",
    timeOfDay: [],
    intervalHours: 6,
    startDate: localDate(2026, 3, 10, 6, 0).toISOString(),
  });

  it("stays phase-locked to the start date rather than to 'now'", () => {
    // 07:13 is mid-window; the next slot is the anchor + 6h, not now + 6h.
    const next = nextOccurrenceAfter(interval, localDate(2026, 3, 10, 7, 13));
    expect(next).toEqual(localDate(2026, 3, 10, 12, 0));
  });

  it("advances a whole number of steps across many hours", () => {
    const next = nextOccurrenceAfter(interval, localDate(2026, 3, 11, 5, 0));
    expect(next).toEqual(localDate(2026, 3, 11, 6, 0));
  });

  it("returns the anchor itself before the course starts", () => {
    const next = nextOccurrenceAfter(interval, localDate(2026, 3, 9, 0, 0));
    expect(next).toEqual(localDate(2026, 3, 10, 6, 0));
  });

  it("returns null when intervalHours is missing", () => {
    const broken = makeSchedule({ frequency: "every_n_hours", timeOfDay: [], intervalHours: null });
    expect(nextOccurrenceAfter(broken, localDate(2026, 3, 10, 7, 0))).toBeNull();
  });
});

describe("occurrencesForDay", () => {
  it("lists every dose of the day in chronological order", () => {
    const doses = occurrencesForDay([makeSchedule()], localDate(2026, 3, 10, 15, 0));

    expect(doses.map((dose) => new Date(dose.scheduledAt))).toEqual([
      localDate(2026, 3, 10, 8, 0),
      localDate(2026, 3, 10, 20, 0),
    ]);
  });

  it("merges and sorts across several schedules", () => {
    const morning = makeSchedule({ _id: "a", timeOfDay: ["07:00"] });
    const evening = makeSchedule({ _id: "b", medicationId: "med2", timeOfDay: ["19:00"] });

    const doses = occurrencesForDay([evening, morning], localDate(2026, 3, 10, 12, 0));

    expect(doses.map((dose) => dose.scheduleId)).toEqual(["a", "b"]);
  });

  it("excludes a schedule whose course ended before the day", () => {
    const ended = makeSchedule({ endDate: localDate(2026, 3, 1).toISOString() });
    expect(occurrencesForDay([ended], localDate(2026, 3, 10, 12, 0))).toEqual([]);
  });

  it("produces a full day of interval doses without running away", () => {
    const interval = makeSchedule({
      frequency: "every_n_hours",
      timeOfDay: [],
      intervalHours: 6,
      startDate: localDate(2026, 3, 10, 0, 0).toISOString(),
    });

    const doses = occurrencesForDay([interval], localDate(2026, 3, 10, 12, 0));
    expect(doses).toHaveLength(4);
  });
});

describe("occurrencesBetween", () => {
  it("is inclusive of both ends", () => {
    const doses = occurrencesBetween(
      makeSchedule(),
      localDate(2026, 3, 10, 8, 0),
      localDate(2026, 3, 10, 20, 0),
    );

    expect(doses).toHaveLength(2);
  });

  it("returns nothing when the range precedes the start date", () => {
    const schedule = makeSchedule({ startDate: localDate(2026, 5, 1).toISOString() });
    expect(
      occurrencesBetween(schedule, localDate(2026, 3, 1), localDate(2026, 3, 31)),
    ).toEqual([]);
  });
});

describe("mostRecentOccurrence", () => {
  it("recovers the slot a repeating notification just fired for", () => {
    const resolved = mostRecentOccurrence(makeSchedule(), localDate(2026, 3, 10, 20, 0, ));
    expect(resolved).toEqual(localDate(2026, 3, 10, 20, 0));
  });

  it("resolves a dose delivered slightly early to itself, not the previous slot", () => {
    // Fired 30s before 20:00 — inside the tolerance window.
    const at = new Date(localDate(2026, 3, 10, 20, 0).getTime() - 30_000);
    expect(mostRecentOccurrence(makeSchedule(), at)).toEqual(localDate(2026, 3, 10, 20, 0));
  });

  it("falls back to the previous slot well before the next one", () => {
    expect(mostRecentOccurrence(makeSchedule(), localDate(2026, 3, 10, 12, 0))).toEqual(
      localDate(2026, 3, 10, 8, 0),
    );
  });
});

describe("isScheduleActiveAt", () => {
  it("includes doses earlier on the start day", () => {
    const schedule = makeSchedule({ startDate: localDate(2026, 3, 10, 18, 0).toISOString() });
    expect(isScheduleActiveAt(schedule, localDate(2026, 3, 10, 8, 0))).toBe(true);
  });

  it("includes the whole of the end day", () => {
    const schedule = makeSchedule({ endDate: localDate(2026, 3, 10).toISOString() });
    expect(isScheduleActiveAt(schedule, localDate(2026, 3, 10, 23, 30))).toBe(true);
    expect(isScheduleActiveAt(schedule, localDate(2026, 3, 11, 0, 30))).toBe(false);
  });
});

describe("doseKey", () => {
  it("matches the backend's (scheduleId, scheduledAt) identity", () => {
    const iso = localDate(2026, 3, 10, 8, 0).toISOString();
    expect(doseKey("s1", iso)).toBe(doseKey("s1", new Date(iso)));
  });

  it("separates two schedules sharing a time", () => {
    const iso = localDate(2026, 3, 10, 8, 0).toISOString();
    expect(doseKey("s1", iso)).not.toBe(doseKey("s2", iso));
  });
});

describe("formatDoseTime", () => {
  it("pads to a 24-hour wall clock", () => {
    expect(formatDoseTime(localDate(2026, 3, 10, 8, 5))).toBe("08:05");
    expect(formatDoseTime(localDate(2026, 3, 10, 20, 0))).toBe("20:00");
  });
});
