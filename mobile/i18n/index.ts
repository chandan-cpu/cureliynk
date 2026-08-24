import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import as from "@/i18n/locales/as.json";
import bn from "@/i18n/locales/bn.json";
import en from "@/i18n/locales/en.json";
import hi from "@/i18n/locales/hi.json";

export const SUPPORTED_LANGUAGES = ["en", "hi", "bn", "as"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = "cureliynk.language";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  as: { translation: as },
};

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function detectInitialLanguage(): SupportedLanguage {
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return isSupportedLanguage(deviceLanguage) ? deviceLanguage : "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

/** Restores the language the user previously picked, if any (call once at startup). */
export async function restorePersistedLanguage(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupportedLanguage(stored) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

/** Switches the app's language and remembers the choice for next launch. */
export async function setAppLanguage(language: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export default i18n;
