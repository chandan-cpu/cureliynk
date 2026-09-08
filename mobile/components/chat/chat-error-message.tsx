import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useIndicScript } from "@/components/chat/chat-text";
import { useThemeColors } from "@/lib/theme";

/**
 * A turn that failed, shown in the thread where the answer would have been.
 *
 * Deliberately quiet — an amber note rather than the red emergency banner,
 * which in this app means "this may be a medical emergency" and must not be
 * diluted by network problems.
 */
export function ChatErrorMessage({
  messageKey,
  onRetry,
}: {
  messageKey: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const indic = useIndicScript();

  return (
    <View className="gap-2.5 rounded-[14px] border border-line dark:border-line-dark bg-card dark:bg-card-dark px-3.5 py-3">
      <View className="flex-row items-start gap-2.5">
        <Ionicons name="alert-circle-outline" size={18} color={colors.muted} />
        <Text
          className={`flex-1 text-content dark:text-content-dark ${
            indic ? "text-[13.5px] leading-6" : "text-sm leading-5"
          }`}
        >
          {t(messageKey)}
        </Text>
      </View>

      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.7}
          accessibilityRole="button"
          className="self-start"
        >
          <Text className="text-[13px] font-medium text-brand-dark dark:text-brand">
            {t("chat.retry")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
