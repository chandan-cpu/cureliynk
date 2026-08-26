import { HomeScreen } from "@/components/dashboard/home-screen";

import { renderWithProviders } from "@/test/dashboard-test-utils";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { name: "Jane Doe" } }),
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
});
