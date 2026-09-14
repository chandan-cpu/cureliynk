import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/medications/screen-header";
import { fetchRefills, type Medication } from "@/lib/medications";
import { useThemeColors } from "@/lib/theme";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; medications: Medication[] };

/**
 * Medications the daily server job has flagged as low.
 *
 * The flag is computed server-side (see server/src/jobs/refill-check.job.js)
 * rather than by comparing the two numbers here, so every device agrees and a
 * phone that has not opened in a week still sees the same list.
 */
export function RefillAlertsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [state, setState] = useState<State>({ status: "loading" });
  const [isRefreshing, setIsRefreshing] = useState(false);

  /** Returns the next state rather than setting it, so the caller owns cancellation. */
  const loadState = useCallback(async (): Promise<State> => {
    try {
      return { status: "ready", medications: await fetchRefills() };
    } catch {
      return { status: "error" };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadState().then((next) => {
      // Dropped when the user navigated away mid-request.
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [loadState]);

  const refresh = async () => {
    setIsRefreshing(true);
    setState(await loadState());
    setIsRefreshing(false);
  };

  if (state.status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
        <ScreenHeader title={t("medications.refills.title")} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <ScreenHeader title={t("medications.refills.title")} />

      <FlatList
        data={state.status === "ready" ? state.medications : []}
        keyExtractor={(medication) => medication._id}
        contentContainerClassName="px-5 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.brand} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/medication-form", params: { id: item._id } })}
            className="rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-4 mb-3 flex-row items-center gap-3"
          >
            <View className="w-11 h-11 rounded-full items-center justify-center bg-amber-100 dark:bg-amber-400/20">
              <Ionicons name="cube" size={20} color={colors.accentAmber} />
            </View>

            <View className="flex-1">
              <Text className="text-content dark:text-content-dark text-sm font-bold" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-xs mt-0.5">
                {t("medications.refills.remaining", { count: item.quantityRemaining })} ·{" "}
                {t("medications.refills.threshold", { count: item.lowStockThreshold })}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          state.status === "error" ? (
            <View className="items-center justify-center gap-3 pt-24 px-4">
              <Ionicons name="cloud-offline-outline" size={40} color={colors.icon} />
              <Text className="text-muted dark:text-muted-dark text-sm text-center">
                {t("medications.errors.load")}
              </Text>
            </View>
          ) : (
            <View className="items-center justify-center gap-3 pt-24 px-4">
              <View className="w-20 h-20 rounded-full items-center justify-center bg-brand/10">
                <Ionicons name="checkmark-circle" size={36} color={colors.brand} />
              </View>
              <Text className="text-content dark:text-content-dark text-base font-bold text-center">
                {t("medications.refills.empty")}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-sm text-center">
                {t("medications.refills.emptyHint")}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
