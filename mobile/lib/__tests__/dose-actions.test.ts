import { reconcileMissedDoses, resolveOccurrence } from "@/lib/dose-actions";
import type { DoseOccurrence } from "@/lib/dose-schedule";
import type { DoseStatus, Schedule } from "@/lib/medications";
import type { DoseResponse } from "@/lib/notification-scheduler";

// The scheduler pulls in `expo-constants`/`expo-notifications`; the state
// machine under test only needs its cancel/schedule calls to be inert.
jest.mock("@/lib/notification-scheduler", () => ({
  DOSE_ACTION_TAKEN: "DOSE_TAKEN",
  DOSE_ACTION_SNOOZE: "DOSE_SNOOZE",
  MISSED_FOLLOWUP_MINUTES: 30,
  SNOOZE_MINUTES: 10,
  cancelMissedFollowUp: jest.fn(async () => undefined),
  scheduleMissedFollowUp: jest.fn(async () => undefined),
  scheduleNextIntervalDose: jest.fn(async () => null),
  scheduleSnoozedDose: jest.fn(async () => new Date()),
}));

const mockRecordDoseLog = jest.fn(async (_input: unknown) => ({ doseLog: {}, caregiver: null }));

jest.mock("@/lib/medications", () => ({
  recordDoseLog: (input: unknown) => mockRecordDoseLog(input),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

function occurrence(minutesAgo: number, id = "sched1"): DoseOccurrence {
  return {
    scheduleId: id,
    medicationId: "med1",
    scheduledAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    _id: "sched1",
    userId: "u1",
    medicationId: "med1",
    frequency: "daily",
    timeOfDay: ["08:00", "20:00"],
    intervalHours: null,
    daysOfWeek: [],
    startDate: new Date(2026, 0, 1).toISOString(),
    endDate: null,
    isActive: true,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

beforeEach(() => {
  mockRecordDoseLog.mockClear();
});

describe("reconcileMissedDoses", () => {
  const allPending = () => "pending" as DoseStatus;

  it("marks a dose abandoned past the follow-up window as missed", async () => {
    const missed = await reconcileMissedDoses([occurrence(45)], allPending);

    expect(missed).toHaveLength(1);
    expect(mockRecordDoseLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "missed" }),
    );
  });

  it("leaves a dose still inside the follow-up window alone", async () => {
    const missed = await reconcileMissedDoses([occurrence(10)], allPending);

    expect(missed).toEqual([]);
    expect(mockRecordDoseLog).not.toHaveBeenCalled();
  });

  it("never re-judges a dose the user already answered", async () => {
    const taken = await reconcileMissedDoses([occurrence(120)], () => "taken");
    const snoozed = await reconcileMissedDoses([occurrence(120)], () => "snoozed");

    expect(taken).toEqual([]);
    expect(snoozed).toEqual([]);
    expect(mockRecordDoseLog).not.toHaveBeenCalled();
  });

  it("escalates to the caregiver only when asked", async () => {
    await reconcileMissedDoses([occurrence(45)], allPending, { escalate: true });
    expect(mockRecordDoseLog).toHaveBeenCalledWith(
      expect.objectContaining({ caregiverAlerted: true }),
    );

    mockRecordDoseLog.mockClear();

    await reconcileMissedDoses([occurrence(45)], allPending, { escalate: false });
    expect(mockRecordDoseLog).toHaveBeenCalledWith(
      expect.objectContaining({ caregiverAlerted: false }),
    );
  });
});

describe("resolveOccurrence", () => {
  const response = (data: Partial<DoseResponse["data"]>): DoseResponse => ({
    actionIdentifier: "DOSE_TAKEN",
    isDefaultAction: false,
    data: {
      kind: "dose",
      scheduleId: "sched1",
      medicationId: "med1",
      scheduledAt: new Date().toISOString(),
      ...data,
    },
  });

  it("recomputes the slot for a repeating trigger carrying a stale payload", () => {
    const now = new Date(2026, 2, 10, 20, 0);
    // The payload names yesterday's 08:00 — what the trigger was created with.
    const stale = new Date(2026, 2, 9, 8, 0).toISOString();

    const resolved = resolveOccurrence(response({ scheduledAt: stale }), [makeSchedule()], now);

    expect(new Date(resolved!.scheduledAt)).toEqual(new Date(2026, 2, 10, 20, 0));
  });

  it("trusts a payload that matches the current moment", () => {
    const now = new Date(2026, 2, 10, 20, 0);
    const fresh = now.toISOString();

    const resolved = resolveOccurrence(response({ scheduledAt: fresh }), [makeSchedule()], now);

    expect(resolved!.scheduledAt).toBe(fresh);
  });

  it("trusts a follow-up payload verbatim, however old", () => {
    const now = new Date(2026, 2, 10, 20, 30);
    const original = new Date(2026, 2, 10, 20, 0).toISOString();

    const resolved = resolveOccurrence(
      response({ kind: "followup", scheduledAt: original }),
      [makeSchedule()],
      now,
    );

    expect(resolved!.scheduledAt).toBe(original);
  });

  it("trusts an every_n_hours payload, since its trigger is one-shot", () => {
    const now = new Date(2026, 2, 10, 20, 0);
    const exact = new Date(2026, 2, 10, 18, 0).toISOString();

    const resolved = resolveOccurrence(
      response({ scheduledAt: exact }),
      [makeSchedule({ frequency: "every_n_hours", timeOfDay: [], intervalHours: 6 })],
      now,
    );

    expect(resolved!.scheduledAt).toBe(exact);
  });

  it("returns null for a schedule this device no longer knows", () => {
    expect(resolveOccurrence(response({ scheduleId: "gone" }), [makeSchedule()])).toBeNull();
  });
});
