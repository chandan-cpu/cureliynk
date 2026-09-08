import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nativewindColorScheme } from "nativewind";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  isThemePreference,
  THEME_STORAGE_KEY,
  useThemeScheme,
  type ThemePreference,
  type ThemeScheme,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ThemeScheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Restores the saved theme preference at startup and lets the profile screen
 * change it. Only needed by components that read or write the *preference*;
 * `useThemeColors()` from `@/lib/theme` works without it.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useThemeScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isThemePreference(stored)) {
          setPreferenceState(stored);
          nativewindColorScheme.set(stored);
        }
      } catch {
        // A failed read just means the user gets the OS default this launch —
        // not worth blocking startup over.
      }
    })();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    // Applied before the await so the UI repaints immediately; persistence
    // failing should not stop the theme from changing for this session.
    setPreferenceState(next);
    nativewindColorScheme.set(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignored: the choice still applies until the app is relaunched.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemePreference must be used within a ThemeProvider");
  return context;
}
