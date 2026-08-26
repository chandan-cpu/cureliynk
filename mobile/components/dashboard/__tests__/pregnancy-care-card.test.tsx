import { fireEvent } from "@testing-library/react-native";

import { PregnancyCareCard } from "@/components/dashboard/pregnancy-care-card";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("PregnancyCareCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("navigates to Gynecology doctors when pressed", async () => {
    const { getByText } = await renderWithProviders(<PregnancyCareCard />);

    fireEvent.press(getByText("Pregnancy Care"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/doctors-results",
      params: { department: "Gynecology", title: "Pregnancy Care" },
    });
  });
});
