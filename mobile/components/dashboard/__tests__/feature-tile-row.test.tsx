import { fireEvent } from "@testing-library/react-native";

import { FeatureTileRow } from "@/components/dashboard/feature-tile-row";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("FeatureTileRow", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders a tile for every dashboard feature", async () => {
    const { getByText } = await renderWithProviders(<FeatureTileRow />);

    expect(getByText("Medicine Reminder")).toBeTruthy();
    expect(getByText("Labs Near Me")).toBeTruthy();
    expect(getByText("Health Insurance")).toBeTruthy();
  });

  it("navigates to the matching route when a tile is pressed", async () => {
    const { getByText } = await renderWithProviders(<FeatureTileRow />);

    fireEvent.press(getByText("Labs Near Me"));

    expect(mockPush).toHaveBeenCalledWith("/labs-near-me");
  });
});
