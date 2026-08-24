import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/lib/auth-context";

function getGreetingKey(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function GreetingHeader() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <View className="flex-row items-start justify-between px-5 pt-4">
      <View className="flex-1 pr-4">
        <Text className="text-slate-900 text-2xl font-bold">
          {t(`dashboard.greeting.${getGreetingKey()}`, { name: firstName })}
        </Text>
        <Text className="text-slate-500 text-sm mt-1">{t("dashboard.greeting.subtitle")}</Text>
      </View>

      <TouchableOpacity className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-sm">
        <Ionicons name="person-circle-outline" size={28} color="#15803D" />
      </TouchableOpacity>
    </View>
  );
}
