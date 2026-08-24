import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Linking, Text, TouchableOpacity, View } from "react-native";

const EMERGENCY_NUMBER = "108";

export function EmergencyHelpRow() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View className="mx-5 mt-4 rounded-2xl bg-red-50 border border-red-100 p-4">
      <View className="flex-row items-center gap-2">
        <Ionicons name="alert-circle" size={20} color="#DC2626" />
        <View className="flex-1">
          <Text className="text-red-700 text-sm font-bold">{t("dashboard.emergency.title")}</Text>
          <Text className="text-red-500 text-xs mt-0.5">{t("dashboard.emergency.subtitle")}</Text>
        </View>
      </View>

      <View className="flex-row gap-3 mt-3">
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-red-600 rounded-full py-2.5"
        >
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-semibold">{t("dashboard.emergency.callNow")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/first-aid-guide")}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center gap-1.5 bg-white border border-red-200 rounded-full py-2.5"
        >
          <Ionicons name="medkit" size={16} color="#DC2626" />
          <Text className="text-red-700 text-xs font-semibold">{t("dashboard.emergency.firstAidGuide")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
