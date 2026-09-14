import type { ReactElement } from "react";
import { render } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

import en from "@/i18n/locales/en.json";

/**
 * A standalone i18next instance seeded with the real English strings, kept
 * separate from the app's `@/i18n` singleton so tests don't pull in
 * expo-localization/async-storage. Assertions can match real copy instead of
 * raw translation keys.
 */
const testI18n = createInstance();
testI18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/**
 * Stand-in for the metrics the native module measures on a device — an iPhone
 * 14-ish frame with a notch and a home indicator. Passing them as
 * `initialMetrics` makes the provider resolve synchronously; left to measure
 * itself under Jest it never reports, and `useSafeAreaInsets()` throws.
 */
const TEST_SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderWithProviders(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={TEST_SAFE_AREA_METRICS}>
      <I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>
    </SafeAreaProvider>,
  );
}

export { testI18n };
