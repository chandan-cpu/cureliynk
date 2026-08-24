import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { DashboardCard } from "@/components/dashboard/dashboard-card";

export function NearbyCareSection() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <DashboardCard className="mx-5 mt-4">
      <Text className="text-slate-900 text-sm font-bold">{t("dashboard.nearbyCare.title")}</Text>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/doctors-results",
            params: { department: "General Medicine", title: t("dashboard.nearbyCare.findDoctors") },
          })
        }
        activeOpacity={0.7}
        className="flex-row items-center gap-3 mt-3 pb-3 border-b border-slate-100"
      >
        <View className="w-10 h-10 rounded-full items-center justify-center bg-blue-100">
          <Ionicons name="medkit" size={18} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 text-sm font-semibold">{t("dashboard.nearbyCare.findDoctors")}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{t("dashboard.nearbyCare.findDoctorsSubtitle")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/doctors-results",
            params: { department: "Emergency Medicine", title: t("dashboard.nearbyCare.findHospitals") },
          })
        }
        activeOpacity={0.7}
        className="flex-row items-center gap-3 mt-3"
      >
        <View className="w-10 h-10 rounded-full items-center justify-center bg-green-100">
          <Ionicons name="business" size={18} color="#16A34A" />
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 text-sm font-semibold">{t("dashboard.nearbyCare.findHospitals")}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{t("dashboard.nearbyCare.findHospitalsSubtitle")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </DashboardCard>
  );
}
