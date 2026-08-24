import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";

export function DisclaimerBanner() {
  const { t } = useTranslation();

  return (
    <DashboardCard className="mx-5 mt-4 flex-row gap-3">
      <View className="w-11 h-11 rounded-full items-center justify-center bg-brand/10">
        <Ionicons name="shield-checkmark" size={22} color="#15803D" />
      </View>
      <View className="flex-1">
        <Text className="text-slate-900 text-sm font-semibold">{t("dashboard.disclaimer.title")}</Text>
        <Text className="text-slate-500 text-xs mt-1 leading-4">{t("dashboard.disclaimer.text")}</Text>
      </View>
    </DashboardCard>
  );
}
