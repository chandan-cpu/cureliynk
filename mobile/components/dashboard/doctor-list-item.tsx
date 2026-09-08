import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";

import type { Doctor } from "@/lib/doctors";
import { useThemeColors } from "@/lib/theme";

export function DoctorListItem({ doctor }: { doctor: Doctor }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(doctor.mapsUrl)}
      activeOpacity={0.7}
      className="rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-4 mb-3"
    >
      <Text className="text-content dark:text-content-dark text-sm font-bold">{doctor.name}</Text>
      <Text className="text-muted dark:text-muted-dark text-xs mt-1">{doctor.address}</Text>

      <View className="flex-row items-center gap-3 mt-2">
        {doctor.rating !== null ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={14} color={colors.accentStar} />
            <Text className="text-content dark:text-content-dark text-xs font-semibold">
              {doctor.rating} {t("dashboard.doctorsResults.reviewsCount", { count: doctor.reviewsCount })}
            </Text>
          </View>
        ) : null}
        {doctor.distanceKm !== null ? (
          <Text className="text-muted dark:text-muted-dark text-xs">
            {t("dashboard.doctorsResults.distanceAway", { distance: doctor.distanceKm.toFixed(1) })}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
