import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";
import { EXAMPLE_SCENARIOS } from "@/lib/chat";
import { useThemeColors } from "@/lib/theme";

/**
 * The opening screen: one prompt, three examples. Tapping an example sends its
 * text verbatim, in whichever language the app is in, so the first question is
 * always one the assistant answers well.
 */
export function ChatEmptyState({ onPickExample }: { onPickExample: (prompt: string) => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const indic = useIndicScript();

  return (
    <View className="flex-1 justify-center px-6 pb-5">
      <View className="mx-auto mb-[22px] h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-brand-dark dark:bg-brand">
        <Ionicons name="add" size={26} color={colors.onBrand} />
      </View>

      <Text
        className={`text-center text-content dark:text-content-dark font-semibold ${
          indic ? "text-[23px] leading-9" : "text-[25px] leading-8 tracking-tight"
        }`}
      >
        {t("chat.emptyHeadline")}
      </Text>
      <Text
        className={`mt-3 text-center text-muted dark:text-muted-dark ${
          indic ? "text-sm leading-7" : "text-[14.5px] leading-6"
        }`}
      >
        {t("chat.emptySubtitle")}
      </Text>

      <View className="mt-[30px] gap-[9px]">
        {EXAMPLE_SCENARIOS.map((scenario) => (
          <TouchableOpacity
            key={scenario}
            onPress={() => onPickExample(t(`chat.examples.${scenario}`))}
            activeOpacity={0.7}
            accessibilityRole="button"
            className="rounded-[14px] border border-line dark:border-line-dark bg-card dark:bg-card-dark px-4 py-3.5"
          >
            <Text
              className={`text-content dark:text-content-dark ${
                indic ? "text-[13.5px] leading-6" : "text-sm leading-5"
              }`}
            >
              {t(`chat.examples.${scenario}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
