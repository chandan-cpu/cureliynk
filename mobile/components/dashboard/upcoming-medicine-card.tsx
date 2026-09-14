import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { useUpcomingDose } from "@/hooks/use-upcoming-dose";
import { formatDoseTime } from "@/lib/dose-schedule";
import { useThemeColors } from "@/lib/theme";

/** The next dose still due today, or an honest empty state when there is none. */
export function UpcomingMedicineCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const { next } = useUpcomingDose();

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/medicine-reminder")}>
      <DashboardCard className="mx-5 mt-4 mb-6 flex-row items-center gap-3">
        <View
          className={`w-11 h-11 rounded-full items-center justify-center ${
            next ? "bg-brand/10" : "bg-slate-100 dark:bg-slate-500/20"
          }`}
        >
          <Ionicons name="medical" size={20} color={next ? colors.brand : colors.muted} />
        </View>

        <View className="flex-1">
          <Text className="text-content dark:text-content-dark text-sm font-bold">
            {t("dashboard.upcomingMedicine.title")}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-xs mt-1" numberOfLines={1}>
            {next
              ? `${formatDoseTime(next.scheduledAt)} · ${next.medication?.name ?? ""}`
              : t("dashboard.upcomingMedicine.emptyMessage")}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.icon} />
      </DashboardCard>
    </TouchableOpacity>
  );
}
