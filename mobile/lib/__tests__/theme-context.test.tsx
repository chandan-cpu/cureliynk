import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { themeColors } from "@/constants/colors";
import { useThemeColors } from "@/lib/theme";
import { ThemeProvider, useThemePreference } from "@/lib/theme-context";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports.
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The scheme NativeWind reports back. `colorScheme.set` normally drives this
// via Appearance; here the test flips it by hand so both themes are reachable.
let mockScheme: "light" | "dark" = "light";
const mockSet = jest.fn((next: string) => {
  if (next !== "system") mockScheme = next as "light" | "dark";
});

jest.mock("nativewind", () => ({
  colorScheme: { set: (next: string) => mockSet(next) },
  useColorScheme: () => ({ colorScheme: mockScheme }),
}));

function ColorProbe() {
  return <Text>{useThemeColors().surface}</Text>;
}

function PreferenceProbe() {
  const { preference, setPreference } = useThemePreference();
  return <Text onPress={() => setPreference("dark")}>{preference}</Text>;
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <PreferenceProbe />
    </ThemeProvider>,
  );
}

describe("theme-context", () => {
  beforeEach(async () => {
    mockScheme = "light";
    mockSet.mockClear();
    await AsyncStorage.clear();
  });

  describe("useThemeColors", () => {
    it("returns the light palette when NativeWind reports light", async () => {
      const { getByText } = await render(<ColorProbe />);

      expect(getByText(themeColors.light.surface)).toBeTruthy();
    });

    it("returns the dark palette when NativeWind reports dark", async () => {
      mockScheme = "dark";

      const { getByText } = await render(<ColorProbe />);

      expect(getByText(themeColors.dark.surface)).toBeTruthy();
    });

    // Every screen calls this hook, so it has to survive being rendered
    // outside ThemeProvider rather than throwing the way useThemePreference does.
    it("works without a ThemeProvider", async () => {
      await expect(render(<ColorProbe />)).resolves.toBeTruthy();
    });
  });

  describe("ThemeProvider", () => {
    it("defaults to following the system when nothing is stored", async () => {
      const { getByText } = await renderProvider();

      await waitFor(() => expect(getByText("system")).toBeTruthy());
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("restores and applies a previously saved preference", async () => {
      await AsyncStorage.setItem("cureliynk.theme", "dark");

      const { getByText } = await renderProvider();

      await waitFor(() => expect(getByText("dark")).toBeTruthy());
      expect(mockSet).toHaveBeenCalledWith("dark");
    });

    it("ignores a stored value that is not a real preference", async () => {
      await AsyncStorage.setItem("cureliynk.theme", "sepia");

      const { getByText } = await renderProvider();

      await waitFor(() => expect(getByText("system")).toBeTruthy());
      expect(mockSet).not.toHaveBeenCalled();
    });

    it("applies and persists a new preference", async () => {
      const { getByText } = await renderProvider();
      await waitFor(() => expect(getByText("system")).toBeTruthy());

      await act(async () => {
        getByText("system").props.onPress();
      });

      expect(mockSet).toHaveBeenCalledWith("dark");
      expect(getByText("dark")).toBeTruthy();
      expect(await AsyncStorage.getItem("cureliynk.theme")).toBe("dark");
    });
  });

  it("useThemePreference throws outside a ThemeProvider", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    // Wrapped so a synchronous throw and a rejected render are both caught.
    await expect((async () => render(<PreferenceProbe />))()).rejects.toThrow(
      "useThemePreference must be used within a ThemeProvider",
    );

    consoleError.mockRestore();
  });
});
