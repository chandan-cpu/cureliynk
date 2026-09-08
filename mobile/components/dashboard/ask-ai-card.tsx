import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

export function AskAiCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() => router.push("/ask-ai")}
      activeOpacity={0.85}
      // Stays a dark promo card in both themes. Against the dark theme's navy
      // surface the near-black loses its edge, so it switches to the elevated
      // card color plus a brand hairline to keep standing off the background.
      className="mx-5 mt-4 rounded-2xl p-5 bg-[#0F172A] dark:bg-card-dark border border-transparent dark:border-brand/25"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles" size={18} color="#4ADE80" />
        <Text className="text-white text-lg font-bold">{t("dashboard.askAi.cardTitle")}</Text>
      </View>
      <Text className="text-slate-300 text-xs mt-2">{t("dashboard.askAi.cardSubtitle")}</Text>
      <View className="flex-row items-center gap-1.5 mt-4 self-start bg-brand-dark dark:bg-brand rounded-full px-4 py-2.5">
        <Text className="text-white dark:text-[#052E16] text-sm font-semibold">
          {t("dashboard.askAi.cta")}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={colors.onBrand} />
      </View>
    </TouchableOpacity>
  );
}
