import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { DASHBOARD_FEATURE_OPTIONS } from "@/constants/dashboardFeatures";

export function FeatureTileRow() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="flex-row gap-3 mx-5 mt-4">
      {DASHBOARD_FEATURE_OPTIONS.map((feature) => (
        <TouchableOpacity
          key={feature.id}
          onPress={() => router.push(feature.route)}
          activeOpacity={0.8}
          className="flex-1 items-center rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-3 gap-2"
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: feature.badgeColor }}
          >
            <Ionicons name={feature.icon} size={18} color="#FFFFFF" />
          </View>
          <Text
            className="text-content dark:text-content-dark text-[11px] font-semibold text-center"
            numberOfLines={2}
          >
            {t(`dashboard.features.${feature.id}.title`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
