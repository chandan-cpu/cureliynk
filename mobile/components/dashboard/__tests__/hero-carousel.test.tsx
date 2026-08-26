import { act, fireEvent } from "@testing-library/react-native";

import { HeroCarousel } from "@/components/dashboard/hero-carousel";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("HeroCarousel", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the text-based slides", async () => {
    const { getByText } = await renderWithProviders(<HeroCarousel />);

    expect(getByText("Your AI Health Assistant")).toBeTruthy();
    expect(getByText("Complete Pregnancy Care")).toBeTruthy();
  });

  it("navigates to Ask AI when that slide is pressed", async () => {
    const { getByText } = await renderWithProviders(<HeroCarousel />);

    fireEvent.press(getByText("Your AI Health Assistant"));

    expect(mockPush).toHaveBeenCalledWith("/ask-ai");
  });

  it("navigates to Gynecology doctors when the pregnancy slide is pressed", async () => {
    const { getByText } = await renderWithProviders(<HeroCarousel />);

    fireEvent.press(getByText("Complete Pregnancy Care"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/doctors-results",
      params: { department: "Gynecology", title: "Pregnancy Care" },
    });
  });

  it("keeps auto-advancing without crashing and clears its timer on unmount", async () => {
    jest.useFakeTimers();
    const { unmount } = await renderWithProviders(<HeroCarousel />);

    await act(async () => {
      jest.advanceTimersByTime(4500 * 3);
    });

    expect(() => unmount()).not.toThrow();
  });
});
