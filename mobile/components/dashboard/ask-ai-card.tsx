import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

export function AskAiCard() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={() => router.push("/ask-ai")}
      activeOpacity={0.85}
      className="mx-5 mt-4 rounded-2xl p-5"
      style={{ backgroundColor: "#0F172A" }}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles" size={18} color="#4ADE80" />
        <Text className="text-white text-lg font-bold">{t("dashboard.askAi.cardTitle")}</Text>
      </View>
      <Text className="text-slate-300 text-xs mt-2">{t("dashboard.askAi.cardSubtitle")}</Text>
      <View className="flex-row items-center gap-1.5 mt-4 self-start bg-brand-dark rounded-full px-4 py-2.5">
        <Text className="text-white text-sm font-semibold">{t("dashboard.askAi.cta")}</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}
