import type { ReactElement } from "react";
import { render } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";

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

export function renderWithProviders(ui: ReactElement) {
  return render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);
}

export { testI18n };
