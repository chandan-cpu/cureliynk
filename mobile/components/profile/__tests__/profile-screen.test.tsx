import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, waitFor } from "@testing-library/react-native";

import { ProfileScreen } from "@/components/profile/profile-screen";
import { ThemeProvider } from "@/lib/theme-context";

import { renderWithProviders } from "@/test/dashboard-test-utils";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports.
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let mockScheme: "light" | "dark" = "light";
const mockSet = jest.fn((next: string) => {
  if (next !== "system") mockScheme = next as "light" | "dark";
});

jest.mock("nativewind", () => ({
  colorScheme: { set: (next: string) => mockSet(next) },
  useColorScheme: () => ({ colorScheme: mockScheme }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { name: "Jane Doe", email: "jane@example.com", phone: "9876543210" },
    signOut: jest.fn(),
  }),
}));

jest.mock("@/hooks/use-current-place", () => ({
  useCurrentPlace: () => ({ place: { status: "ready", label: "Guwahati, Assam" }, retry: jest.fn() }),
}));

// Stubbed so the screen does not pull the i18n singleton (and with it
// expo-localization) into a test that only cares about rendering.
jest.mock("@/i18n", () => ({
  SUPPORTED_LANGUAGES: ["en", "hi", "bn", "as"],
  setAppLanguage: jest.fn(),
}));

function renderProfile() {
  return renderWithProviders(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );
}

/**
 * The three choices live in a sheet behind the Appearance row. Pressing the
 * row by text is unambiguous only while the sheet is shut — once open, the
 * sheet's own heading carries the same word.
 */
async function openAppearanceSheet(screen: Awaited<ReturnType<typeof renderProfile>>) {
  await act(async () => {
    fireEvent.press(screen.getByText("Appearance"));
  });
}

describe("ProfileScreen", () => {
  beforeEach(async () => {
    mockScheme = "light";
    mockSet.mockClear();
    await AsyncStorage.clear();
  });

  it("shows the signed-in user's details", async () => {
    const { getByText } = await renderProfile();

    expect(getByText("Jane Doe")).toBeTruthy();
    expect(getByText("jane@example.com · 9876543210")).toBeTruthy();
  });

  it("groups the record, activity and settings rows", async () => {
    const { getByText } = await renderProfile();

    expect(getByText("Health record")).toBeTruthy();
    expect(getByText("Conditions & medical history")).toBeTruthy();
    expect(getByText("Your activity")).toBeTruthy();
    expect(getByText("Past conversations")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
    expect(getByText("Emergency contacts")).toBeTruthy();
  });

  it("shows the resolved place on the location row", async () => {
    const { getByText } = await renderProfile();

    expect(getByText("Guwahati, Assam")).toBeTruthy();
  });

  it("puts the current appearance on the row that opens the picker", async () => {
    const { getByLabelText } = await renderProfile();

    expect(getByLabelText("Appearance, System Default")).toBeTruthy();
  });

  // These query by radio role rather than by text: once the sheet is open the
  // row's trailing value shows the same word as the option it points at.
  it("offers all three appearance choices", async () => {
    const screen = await renderProfile();
    await openAppearanceSheet(screen);

    expect(screen.getByRole("radio", { name: "Light" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "System Default" })).toBeTruthy();
  });

  it("applies and persists dark mode when the user picks it", async () => {
    const screen = await renderProfile();
    await openAppearanceSheet(screen);

    await act(async () => {
      fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
    });

    expect(mockSet).toHaveBeenCalledWith("dark");
    await waitFor(async () => expect(await AsyncStorage.getItem("cureliynk.theme")).toBe("dark"));
  });

  it("marks the saved preference as selected on load", async () => {
    await AsyncStorage.setItem("cureliynk.theme", "dark");

    const screen = await renderProfile();
    await openAppearanceSheet(screen);

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Dark" }).props.accessibilityState).toMatchObject({
        selected: true,
      });
    });
  });
});
