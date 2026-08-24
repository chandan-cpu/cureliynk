import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

const PHOTO_ASPECT_RATIO = 4 / 3;

export function PregnancyCareCard() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/doctors-results",
          params: { department: "Gynecology", title: t("dashboard.pregnancyCare.title") },
        })
      }
      activeOpacity={0.85}
      className="flex-1 rounded-2xl overflow-hidden"
      style={{ backgroundColor: "#FCE7F3" }}
    >
      <Image
        source={require("@/assets/pregenecycare.jpg")}
        style={{ width: "100%", aspectRatio: PHOTO_ASPECT_RATIO }}
        contentFit="cover"
        transition={150}
      />
      <View className="bg-white p-3.5">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="heart" size={16} color="#DB2777" />
          <Text className="text-slate-900 text-sm font-bold">{t("dashboard.pregnancyCare.title")}</Text>
        </View>
        <Text className="text-slate-500 text-xs mt-1">{t("dashboard.pregnancyCare.subtitle")}</Text>
        <View className="flex-row items-center gap-1 mt-3 self-start bg-pink-50 rounded-full px-3 py-1.5">
          <Text className="text-pink-700 text-xs font-semibold">{t("common.explore")}</Text>
          <Ionicons name="arrow-forward" size={12} color="#BE185D" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
