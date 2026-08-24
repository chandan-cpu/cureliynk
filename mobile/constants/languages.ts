import type { SupportedLanguage } from "@/i18n";

export type LanguageOption = {
  id: SupportedLanguage;
  /** Name written in the language's own script (or English, for the English row). */
  nativeLabel: string;
  /** English name shown in parentheses next to non-English scripts. */
  englishLabel?: string;
  subtitle: string;
  badgeLetters: string;
  badgeColor: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: "en",
    nativeLabel: "English",
    subtitle: "I will help you understand your health",
    badgeLetters: "EN",
    badgeColor: "#2563EB",
  },
  {
    id: "hi",
    nativeLabel: "हिंदी",
    englishLabel: "Hindi",
    subtitle: "मैं आपको आपका स्वास्थ्य समझने में मदद करूंगा",
    badgeLetters: "हि",
    badgeColor: "#DC2626",
  },
  {
    id: "bn",
    nativeLabel: "বাংলা",
    englishLabel: "Bengali",
    subtitle: "আমি আপনাকে আপনার স্বাস্থ্য বুঝতে সাহায্য করব",
    badgeLetters: "বা",
    badgeColor: "#16A34A",
  },
  {
    id: "as",
    nativeLabel: "অসমীয়া",
    englishLabel: "Assamese",
    subtitle: "মই আপোনাক স্বাস্থ্য বুজাত সহায় কৰিম ❤",
    badgeLetters: "অ",
    badgeColor: "#0D9488",
  },
];

/** Matches the language selected by default in the design mockup. */
export const DEFAULT_LANGUAGE_ID: SupportedLanguage = "as";
