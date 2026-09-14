import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { LanguagePill } from "@/components/chat/language-pill";
import { useThemeColors } from "@/lib/theme";

/**
 * Title plus language chip.
 *
 * The back arrow is unconditional. It used to appear only once a conversation
 * had started, which was fine while the tab bar stayed on screen behind this
 * one — but the chat now hides the bar to give the keyboard the full height,
 * so this arrow is the only way out and cannot be conditional on anything.
 */
export function ChatHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <TouchableOpacity
        // Reached by deep link there is no history to pop, and `back()` would
        // be a no-op that traps the user on a bar-less screen.
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("chat.back")}
        className="h-[30px] w-[30px] items-center justify-center -ml-1.5"
      >
        <Ionicons name="chevron-back" size={26} color={colors.muted} />
      </TouchableOpacity>
      <Text className="flex-1 text-content dark:text-content-dark text-[15.5px] font-semibold">
        {t("chat.title")}
      </Text>
      <LanguagePill />
    </View>
  );
}
