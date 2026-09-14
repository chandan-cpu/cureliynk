import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";
import { useThemeColors } from "@/lib/theme";

/**
 * The only bubble on the screen. The assistant answers as plain text on the
 * background, so the bubble is what marks a line as something you said —
 * hence the squared-off bottom-right corner pointing back at the composer.
 */
export function UserMessage({ text, viaVoice }: { text: string; viaVoice?: boolean }) {
  const { t } = useTranslation();
  const indic = useIndicScript();
  const colors = useThemeColors();

  return (
    <View
      className={`self-end rounded-[18px] rounded-br-[6px] border border-line dark:border-line-dark bg-card dark:bg-card-dark px-4 py-3 ${
        indic ? "max-w-[86%]" : "max-w-[82%]"
      }`}
    >
      {viaVoice ? (
        <View
          className="flex-row items-center gap-1 mb-1.5"
          accessibilityLabel={t("chat.voice.askedByVoice")}
        >
          <Ionicons name="mic" size={11} color={colors.muted} />
          <Text className="text-muted dark:text-muted-dark text-[10px] font-semibold uppercase tracking-wide">
            {t("chat.voice.askedByVoice")}
          </Text>
        </View>
      ) : null}
      <Text
        className={`text-content dark:text-content-dark ${
          indic ? "text-sm leading-7" : "text-[14.5px] leading-6"
        }`}
      >
        {text}
      </Text>
    </View>
  );
}
