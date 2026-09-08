import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

/**
 * Endonyms — a language list that names languages in English is no use to
 * someone who cannot read English. Shared by the chat header's pill and the
 * profile screen's Language row so the two never drift.
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  bn: "বাংলা",
  as: "অসমীয়া",
};

/** Narrows i18next's free-form `language` to one the app actually ships. */
export function resolveLanguage(language: string): SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(language)
    ? (language as SupportedLanguage)
    : "en";
}
