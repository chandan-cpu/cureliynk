import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "@/lib/theme";

const PHOTO_ASPECT_RATIO = 4 / 3;

export function BabyCareDoctorsCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/doctors-results",
          params: { department: "Pediatrics", title: t("dashboard.babyCareDoctors.title") },
        })
      }
      activeOpacity={0.85}
      // The tint only shows while the photo loads, so it tracks the theme.
      className="flex-1 rounded-2xl overflow-hidden bg-blue-100 dark:bg-blue-500/20"
    >
      <Image
        source={require("@/assets/babycare.jpg")}
        style={{ width: "100%", aspectRatio: PHOTO_ASPECT_RATIO }}
        contentFit="cover"
        transition={150}
      />
      <View className="bg-card dark:bg-card-dark p-3.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-content dark:text-content-dark font-bold">
            {t("dashboard.babyCareDoctors.title")}
          </Text>
        </View>
        <Text className="text-muted dark:text-muted-dark text-xs mt-1">
          {t("dashboard.babyCareDoctors.subtitle")}
        </Text>
        <View className="flex-row items-center gap-1 mt-3 self-start bg-blue-50 dark:bg-blue-500/15 rounded-full px-3 py-1.5">
          <Text className="text-blue-700 dark:text-blue-300 text-xs font-semibold">
            {t("common.explore")}
          </Text>
          <Ionicons name="arrow-forward" size={12} color={colors.accentBlue} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
