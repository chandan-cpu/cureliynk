import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";

/** No medicines/prescriptions backend exists yet — shows an honest empty state, not mock data. */
export function UpcomingMedicineCard() {
  const { t } = useTranslation();

  return (
    <DashboardCard className="mx-5 mt-4 mb-6 flex-row items-center gap-3">
      <View className="w-11 h-11 rounded-full items-center justify-center bg-slate-100">
        <Ionicons name="medical" size={20} color="#64748B" />
      </View>
      <View className="flex-1">
        <Text className="text-slate-900 text-sm font-bold">{t("dashboard.upcomingMedicine.title")}</Text>
        <Text className="text-slate-500 text-xs mt-1">{t("dashboard.upcomingMedicine.emptyMessage")}</Text>
      </View>
    </DashboardCard>
  );
}
