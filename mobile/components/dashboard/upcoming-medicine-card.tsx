import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { useThemeColors } from "@/lib/theme";

/** No medicines/prescriptions backend exists yet — shows an honest empty state, not mock data. */
export function UpcomingMedicineCard() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <DashboardCard className="mx-5 mt-4 mb-6 flex-row items-center gap-3">
      <View className="w-11 h-11 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-500/20">
        <Ionicons name="medical" size={20} color={colors.muted} />
      </View>
      <View className="flex-1">
        <Text className="text-content dark:text-content-dark text-sm font-bold">
          {t("dashboard.upcomingMedicine.title")}
        </Text>
        <Text className="text-muted dark:text-muted-dark text-xs mt-1">
          {t("dashboard.upcomingMedicine.emptyMessage")}
        </Text>
      </View>
    </DashboardCard>
  );
}
