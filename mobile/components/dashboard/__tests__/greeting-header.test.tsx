import { GreetingHeader } from "@/components/dashboard/greeting-header";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockUseAuth = jest.fn();
jest.mock("@/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

function setHour(hour: number) {
  const now = new Date();
  now.setHours(hour, 0, 0, 0);
  jest.useFakeTimers({ doNotFake: ["nextTick"] }).setSystemTime(now);
}

describe("GreetingHeader", () => {
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

  it("falls back to an empty name when no user is signed in", async () => {
    mockUseAuth.mockReturnValue({ user: null });
    setHour(9);

    const { getByText } = await renderWithProviders(<GreetingHeader />);

    expect(getByText("Good Morning, !")).toBeTruthy();
  });
});
