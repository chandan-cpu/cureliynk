import { HomeScreen } from "@/components/dashboard/home-screen";

import { renderWithProviders } from "@/test/dashboard-test-utils";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { name: "Jane Doe" } }),
}));

jest.mock("@/hooks/use-current-place", () => ({
  useCurrentPlace: () => ({ place: { status: "ready", label: "Guwahati, Assam" } }),
}));

// The reminder cards read live dose data. Mocking the hook keeps the API
// client — and so AsyncStorage — out of this test's module graph, the same
// reason `dashboard-test-utils` avoids the `@/i18n` singleton.
const mockUpcomingDose = jest.fn(() => ({ next: null, pendingToday: 0 }));

jest.mock("@/hooks/use-upcoming-dose", () => ({
  useUpcomingDose: () => mockUpcomingDose(),
}));

describe("HomeScreen", () => {
  it("renders every dashboard section without crashing", async () => {
    const { getByText } = await renderWithProviders(<HomeScreen />);

    expect(getByText("Important Health Disclaimer")).toBeTruthy();
    expect(getByText("Pregnancy Care")).toBeTruthy();
    expect(getByText("Baby Care Doctors")).toBeTruthy();
    expect(getByText("Emergency Help")).toBeTruthy();
    expect(getByText("Doctors & Hospitals Near You")).toBeTruthy();
    expect(getByText("Today's Health Reminder")).toBeTruthy();
    expect(getByText("Upcoming Medicine")).toBeTruthy();
  });

  it("shows the empty reminder copy when no doses are due", async () => {
    const { getByText } = await renderWithProviders(<HomeScreen />);

    expect(getByText("No reminders set yet.")).toBeTruthy();
    expect(getByText("No upcoming medicines yet.")).toBeTruthy();
  });

  it("shows the next dose and the outstanding count once doses are due", async () => {
    mockUpcomingDose.mockReturnValue({
      next: {
        scheduleId: "s1",
        // Local 08:30, so the rendered label is independent of the test zone.
        scheduledAt: new Date(2026, 2, 10, 8, 30).toISOString(),
        medication: { name: "Metformin" },
      },
      pendingToday: 2,
    } as never);

    const { getByText } = await renderWithProviders(<HomeScreen />);

    expect(getByText("08:30 · Metformin")).toBeTruthy();
    expect(getByText("2 doses due today")).toBeTruthy();
  });
});
