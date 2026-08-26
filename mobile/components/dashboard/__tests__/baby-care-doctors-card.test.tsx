import { fireEvent } from "@testing-library/react-native";

import { BabyCareDoctorsCard } from "@/components/dashboard/baby-care-doctors-card";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("BabyCareDoctorsCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("navigates to Pediatrics doctors when pressed", async () => {
    const { getByText } = await renderWithProviders(<BabyCareDoctorsCard />);

    fireEvent.press(getByText("Baby Care Doctors"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/doctors-results",
      params: { department: "Pediatrics", title: "Baby Care Doctors" },
    });
  });
});
