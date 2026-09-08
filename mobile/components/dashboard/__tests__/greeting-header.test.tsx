import { fireEvent } from "@testing-library/react-native";

import { GreetingHeader } from "@/components/dashboard/greeting-header";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = jest.fn();
jest.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsePlace = jest.fn();
jest.mock("@/hooks/use-current-place", () => ({
  useCurrentPlace: () => mockUsePlace(),
}));

function setHour(hour: number) {
  const now = new Date();
  now.setHours(hour, 0, 0, 0);
  jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(now);
}

describe("GreetingHeader", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUsePlace.mockReturnValue({ place: { status: "ready", label: "Guwahati, Assam" } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows a morning greeting with the user's first name before noon", async () => {
    mockUseAuth.mockReturnValue({ user: { name: "Jane Doe" } });
    setHour(9);

    const { getByText } = await renderWithProviders(<GreetingHeader />);

    expect(getByText("Good Morning, Jane!")).toBeTruthy();
  });

  it("shows an afternoon greeting between noon and 5pm", async () => {
    mockUseAuth.mockReturnValue({ user: { name: "Jane Doe" } });
    setHour(14);

    const { getByText } = await renderWithProviders(<GreetingHeader />);

    expect(getByText("Good Afternoon, Jane!")).toBeTruthy();
  });

  it("shows an evening greeting after 5pm", async () => {
    mockUseAuth.mockReturnValue({ user: { name: "Jane Doe" } });
    setHour(20);

    const { getByText } = await renderWithProviders(<GreetingHeader />);

    expect(getByText("Good Evening, Jane!")).toBeTruthy();
  });

  it("opens the profile screen from the avatar button", async () => {
    mockUseAuth.mockReturnValue({ user: { name: "Jane Doe" } });
    setHour(9);

    const { getByLabelText } = await renderWithProviders(<GreetingHeader />);
    fireEvent.press(getByLabelText("Profile"));

    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("falls back to an empty name when no user is signed in", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    setHour(9);

    const { getByText } = await renderWithProviders(<GreetingHeader />);

    expect(getByText("Good Morning, !")).toBeTruthy();
  });

  describe("location line", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { name: "Jane Doe" } });
      setHour(14);
    });

    it("shows the resolved place under the greeting", async () => {
      const { getByText, queryByText } = await renderWithProviders(<GreetingHeader />);

      expect(getByText("Guwahati, Assam")).toBeTruthy();
      expect(queryByText("How are you feeling today?")).toBeNull();
    });

    it("shows a locating message while the lookup is in flight", async () => {
      mockUsePlace.mockReturnValue({ place: { status: "loading" } });

      const { getByText } = await renderWithProviders(<GreetingHeader />);

      expect(getByText("Locating…")).toBeTruthy();
    });

    it("falls back to the generic subtitle when no location is available", async () => {
      mockUsePlace.mockReturnValue({ place: { status: "unavailable" } });

      const { getByText, queryByText } = await renderWithProviders(<GreetingHeader />);

      expect(getByText("How are you feeling today?")).toBeTruthy();
      expect(queryByText("Locating…")).toBeNull();
    });
  });
});
