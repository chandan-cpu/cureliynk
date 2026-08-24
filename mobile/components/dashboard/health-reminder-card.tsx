import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";

/** No reminders backend exists yet — shows an honest empty state, not mock data. */
export function HealthReminderCard() {
  const { t } = useTranslation();

  return (
    <DashboardCard className="mx-5 mt-4 flex-row items-center gap-3">
      <View className="w-11 h-11 rounded-full items-center justify-center bg-amber-100">
        <Ionicons name="notifications" size={20} color="#D97706" />
      </View>
      <View className="flex-1">
        <Text className="text-slate-900 text-sm font-bold">{t("dashboard.healthReminder.title")}</Text>
        <Text className="text-slate-500 text-xs mt-1">{t("dashboard.healthReminder.emptyMessage")}</Text>
      </View>
    </DashboardCard>
  );
}
