import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { useUpcomingDose } from "@/hooks/use-upcoming-dose";
import { useThemeColors } from "@/lib/theme";

/** How many doses are still due today, or an honest empty state when none are. */
export function HealthReminderCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const { pendingToday } = useUpcomingDose();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/medicine-reminder")}>
      <DashboardCard className="mx-5 mt-4 flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full items-center justify-center bg-amber-100 dark:bg-amber-400/20">
          <Ionicons name="notifications" size={20} color={colors.accentAmber} />
        </View>

        <View className="flex-1">
          <Text className="text-content dark:text-content-dark text-sm font-bold">
            {t("dashboard.healthReminder.title")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-xs mt-1">
            {pendingToday > 0
              ? t("medications.today.dueCount", { count: pendingToday })
              : t("dashboard.healthReminder.emptyMessage")}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.icon} />
      </DashboardCard>
    </TouchableOpacity>
  );
}
