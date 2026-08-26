import { fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";

import { EmergencyHelpRow } from "@/components/dashboard/emergency-help-row";

import { renderWithProviders } from "@/test/dashboard-test-utils";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("EmergencyHelpRow", () => {
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPush.mockClear();
    openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  afterEach(() => {
    openURLSpy.mockRestore();
  });

  it("dials the emergency number when Call Now is pressed", async () => {
    const { getByText } = await renderWithProviders(<EmergencyHelpRow />);

    fireEvent.press(getByText("Call Now"));

    expect(openURLSpy).toHaveBeenCalledWith("tel:108");
  });

  it("navigates to the first aid guide when pressed", async () => {
    const { getByText } = await renderWithProviders(<EmergencyHelpRow />);

    fireEvent.press(getByText("First Aid Guide"));

    expect(mockPush).toHaveBeenCalledWith("/first-aid-guide");
  });
});
