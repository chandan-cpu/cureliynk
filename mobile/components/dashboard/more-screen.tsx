import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";

export function MoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const colors = useThemeColors();

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
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      <View className="px-5 pt-4">
        <Text className="text-content dark:text-content-dark text-2xl font-bold">
          {t("dashboard.more.title")}
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          activeOpacity={0.8}
          className="rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-5 mt-5"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-14 h-14 rounded-full items-center justify-center bg-brand/10">
              <Ionicons name="person" size={28} color={colors.brand} />
            </View>
            <View className="flex-1">
              <Text className="text-content dark:text-content-dark text-base font-bold">{user?.name}</Text>
              <Text className="text-muted dark:text-muted-dark text-xs mt-0.5">{user?.email}</Text>
              {user?.phone ? (
                <Text className="text-muted dark:text-muted-dark text-xs mt-0.5">{user.phone}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          activeOpacity={0.8}
          className="flex-row items-center gap-3 rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-4 mt-3"
        >
          <View className="w-10 h-10 rounded-full items-center justify-center bg-brand/10">
            <Ionicons name="contrast" size={20} color={colors.brand} />
          </View>
          <Text className="flex-1 text-content dark:text-content-dark text-sm font-semibold">
            {t("profile.appearance.title")}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.icon} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          className="flex-row items-center justify-center gap-2 rounded-full border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 py-4 mt-6"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text className="text-red-600 dark:text-red-300 text-sm font-semibold">
            {t("dashboard.more.logout")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
