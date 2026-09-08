import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

const EMERGENCY_NUMBER = "108";

export function EmergencyHelpRow() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View className="mx-5 mt-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 p-4">
      <View className="flex-row items-center gap-2">
        <Ionicons name="alert-circle" size={20} color={colors.danger} />
        <View className="flex-1">
          <Text className="text-red-700 dark:text-red-300 text-sm font-bold">
            {t("dashboard.emergency.title")}
          </Text>
          <Text className="text-red-500 dark:text-red-400 text-xs mt-0.5">
            {t("dashboard.emergency.subtitle")}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3 mt-3">
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-red-600 rounded-full py-2.5"
        >
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold">{t("dashboard.emergency.callNow")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/first-aid-guide")}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-card dark:bg-card-dark border border-red-200 dark:border-red-500/40 rounded-full py-2.5"
        >
          <Ionicons name="medkit" size={16} color={colors.danger} />
          <Text className="text-red-700 dark:text-red-300 text-xs font-semibold">
            {t("dashboard.emergency.firstAidGuide")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
