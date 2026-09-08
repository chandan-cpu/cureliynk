import { useColorScheme } from "nativewind";

import { themeColors, type ThemeColors } from "@/constants/colors";

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

/** What the user picked in the profile screen. "system" follows the OS setting. */
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** The scheme actually being rendered, after "system" has been resolved. */
export type ThemeScheme = "light" | "dark";

export const THEME_STORAGE_KEY = "cureliynk.theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference);
}

/**
 * The scheme NativeWind is currently rendering. Falls back to light when
 * NativeWind has no opinion yet (first frame, and under Jest where no
 * compiled stylesheet exists).
 */
export function useThemeScheme(): ThemeScheme {
  const { colorScheme } = useColorScheme();
  return colorScheme ?? "light";
}

/**
 * Raw hex values for the active theme, for the places NativeWind classes
 * cannot reach: Ionicons `color`, SVG fills, LinearGradient stops,
 * ActivityIndicator, and TextInput `placeholderTextColor`.
 *
 * Lives here rather than in `theme-context` so that the ~20 components which
 * only need colors do not pull AsyncStorage into their module graph — the same
 * reason `test/dashboard-test-utils.tsx` keeps its distance from `@/i18n`.
 */
export function useThemeColors(): ThemeColors {
  return themeColors[useThemeScheme()];
}
