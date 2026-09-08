import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useCurrentPlace } from "@/hooks/use-current-place";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";

function getGreetingKey(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function GreetingHeader() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const { place } = useCurrentPlace();
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <View className="flex-row items-start justify-between px-5 pt-4">
      <View className="flex-1 pr-4">
        <Text className="text-content dark:text-content-dark text-2xl font-bold">
          {t(`dashboard.greeting.${getGreetingKey()}`, { name: firstName })}
        </Text>

        {place.status === "unavailable" ? (
          // No usable location (permission denied, or the lookup failed) — fall
          // back to the generic subtitle rather than showing an error up here.
          <Text className="text-muted dark:text-muted-dark text-sm mt-1">
            {t("dashboard.greeting.subtitle")}
          </Text>
        ) : (
          <View className="flex-row items-center gap-1 mt-1">
            <Ionicons name="location-sharp" size={13} color={colors.brand} />
            <Text className="flex-1 text-muted dark:text-muted-dark text-sm" numberOfLines={1}>
              {place.status === "ready" ? place.label : t("dashboard.greeting.locating")}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel={t("profile.title")}
        className="w-11 h-11 rounded-full bg-card dark:bg-card-dark items-center justify-center shadow-sm"
      >
        <Ionicons name="person-circle-outline" size={28} color={colors.brand} />
      </TouchableOpacity>
    </View>
  );
}
