import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth-context";

export function MoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(t("dashboard.more.logoutConfirmTitle"), t("dashboard.more.logoutConfirmMessage"), [
      { text: t("dashboard.more.cancel"), style: "cancel" },
      {
        text: t("dashboard.more.logout"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <StatusBar style="dark" />
      <View className="px-5 pt-4">
        <Text className="text-slate-900 text-2xl font-bold">{t("dashboard.more.title")}</Text>

        <View className="rounded-2xl bg-white border border-slate-100 p-5 mt-5">
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 rounded-full items-center justify-center bg-brand/10">
              <Ionicons name="person" size={28} color="#15803D" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 text-base font-bold">{user?.name}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">{user?.email}</Text>
              {user?.phone ? <Text className="text-slate-500 text-xs mt-0.5">{user.phone}</Text> : null}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          className="flex-row items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 py-4 mt-6"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text className="text-red-600 text-sm font-semibold">{t("dashboard.more.logout")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
