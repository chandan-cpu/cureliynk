import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { LanguagePill } from "@/components/chat/language-pill";
import { useThemeColors } from "@/lib/theme";

/**
 * Title plus language chip. The back arrow only appears once there is a
 * conversation to leave — on the empty state the design gives the title the
 * full width.
 */
export function ChatHeader({ showBack }: { showBack: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      {showBack ? (
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("chat.back")}
          className="h-[30px] w-[30px] items-center justify-center -ml-1.5"
        >
          <Ionicons name="chevron-back" size={26} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
      <Text className="flex-1 text-content dark:text-content-dark text-[15.5px] font-semibold">
        {t("chat.title")}
      </Text>
      <LanguagePill />
    </View>
  );
}
