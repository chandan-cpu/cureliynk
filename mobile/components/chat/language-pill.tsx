import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity } from "react-native";

import { OptionSheet } from "@/components/ui/option-sheet";
import { setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { LANGUAGE_NAMES, resolveLanguage } from "@/lib/languages";

/**
 * The chat header's language chip.
 *
 * Switches language in place rather than pushing `/language` — that route is
 * the onboarding step and continues on to `/care-type`, which would strand
 * someone who only wanted to re-read an answer in Hindi.
 */
export function LanguagePill() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = resolveLanguage(i18n.language);
  // English is the resting state; any other language is worth calling out, so
  // the chip takes the brand fill the design gives it on the Hindi and
  // Assamese boards.
  const isTranslated = current !== "en";

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={LANGUAGE_NAMES[current]}
        className={`rounded-[15px] border px-[11px] py-1.5 ${
          isTranslated
            ? "border-brand-dark/40 bg-brand-dark/10 dark:border-brand/40 dark:bg-brand/15"
            : "border-line dark:border-line-dark"
        }`}
      >
        <Text
          className={`text-xs font-medium ${
            isTranslated ? "text-brand-dark dark:text-brand" : "text-muted dark:text-muted-dark"
          }`}
        >
          {LANGUAGE_NAMES[current]}
        </Text>
      </TouchableOpacity>

      <OptionSheet
        visible={open}
        title={t("profile.rows.language")}
        options={SUPPORTED_LANGUAGES.map((language) => ({
          id: language,
          label: LANGUAGE_NAMES[language],
        }))}
        selectedId={current}
        onSelect={async (id) => {
          setOpen(false);
          await setAppLanguage(id as SupportedLanguage);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
