import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";

import type { Doctor } from "@/lib/doctors";

export function DoctorListItem({ doctor }: { doctor: Doctor }) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(doctor.mapsUrl)}
      activeOpacity={0.7}
      className="rounded-2xl bg-white border border-slate-100 p-4 mb-3"
    >
      <Text className="text-slate-900 text-sm font-bold">{doctor.name}</Text>
      <Text className="text-slate-500 text-xs mt-1">{doctor.address}</Text>

      <View className="flex-row items-center gap-3 mt-2">
        {doctor.rating !== null ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text className="text-slate-700 text-xs font-semibold">
              {doctor.rating} {t("dashboard.doctorsResults.reviewsCount", { count: doctor.reviewsCount })}
            </Text>
          </View>
        ) : null}
        {doctor.distanceKm !== null ? (
          <Text className="text-slate-400 text-xs">
            {t("dashboard.doctorsResults.distanceAway", { distance: doctor.distanceKm.toFixed(1) })}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
