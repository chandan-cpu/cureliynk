import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DoseRow } from "@/components/medications/dose-row";
import { HeaderIconButton, ScreenHeader } from "@/components/medications/screen-header";
import { useMedications, useTodayDoses } from "@/hooks/use-medications";
import { useThemeColors } from "@/lib/theme";

/**
 * The reminder feature's entry point: every dose due today, with the two
 * responses the notification itself offers, so the app and the notification
 * shade stay in agreement.
 */
export function TodayDosesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  const {
    state,
    medications,
    schedules,
    remindersSupported,
    permissionGranted,
    requestPermission,
    refresh: refreshLibrary,
  } = useMedications();

  const { doses, isRefreshing, markTaken, snooze, refresh } = useTodayDoses(medications, schedules);

  const refreshAll = async () => {
    await Promise.all([refreshLibrary(), refresh()]);
  };

  const pendingCount = doses.filter((dose) => dose.status === "pending").length;

  const renderBody = () => {
    if (state.status === "loading") {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      );
    }

    if (state.status === "error") {
      return (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="cloud-offline-outline" size={40} color={colors.icon} />
          <Text className="text-content dark:text-content-dark text-base font-bold text-center">
            {t("medications.errors.load")}
          </Text>
          <TouchableOpacity
            onPress={refreshAll}
            className="bg-brand-dark dark:bg-brand rounded-full px-5 py-2.5 mt-2"
          >
            <Text className="text-white dark:text-[#052E16] text-sm font-semibold">
              {t("medications.errors.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={doses}
        keyExtractor={(dose) => `${dose.scheduleId}@${dose.scheduledAt}`}
        contentContainerClassName="px-5 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshAll}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={<NotificationNotice />}
        ListFooterComponent={<MedicineList />}
        renderItem={({ item }) => (
          <DoseRow
            dose={item}
            onMarkTaken={() => markTaken(item)}
            onSnooze={() => snooze(item)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center gap-3 pt-24 px-4">
            <View className="w-20 h-20 rounded-full items-center justify-center bg-brand/10">
              <Ionicons name="alarm" size={36} color={colors.brand} />
            </View>
            <Text className="text-content dark:text-content-dark text-base font-bold text-center">
              {t("medications.today.empty")}
            </Text>
            <Text className="text-muted dark:text-muted-dark text-sm text-center">
              {t("medications.today.emptyHint")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/medication-form")}
              className="bg-brand-dark dark:bg-brand rounded-full px-5 py-2.5 mt-2"
            >
              <Text className="text-white dark:text-[#052E16] text-sm font-semibold">
                {t("medications.today.addMedicine")}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  /**
   * The way into the edit form. A medication whose course has ended has no
   * dose today, so it would otherwise be unreachable from this screen.
   */
  function MedicineList() {
    if (medications.length === 0) return null;

    return (
      <View className="mt-4">
        <Text className="text-muted dark:text-muted-dark text-xs font-semibold mb-2">
          {t("medications.today.manage")}
        </Text>

        {medications.map((medication) => (
          <TouchableOpacity
            key={medication._id}
            onPress={() =>
              router.push({ pathname: "/medication-form", params: { id: medication._id } })
            }
            className="flex-row items-center gap-3 rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-3 mb-2"
          >
            <View className="w-9 h-9 rounded-full items-center justify-center bg-brand/10">
              <Ionicons name="medical" size={16} color={colors.brand} />
            </View>
            <View className="flex-1">
              <Text
                className="text-content dark:text-content-dark text-sm font-semibold"
                numberOfLines={1}
              >
                {medication.name}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-xs">{medication.dosage}</Text>
            </View>
            {medication.needsRefill ? (
              <Ionicons name="cube" size={16} color={colors.accentAmber} />
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.icon} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  /**
   * Surfaces the two reasons a reminder might never arrive: Expo Go cannot
   * schedule at all, and permission may have been declined. Silence here would
   * leave someone trusting reminders that cannot fire.
   */
  function NotificationNotice() {
    if (!remindersSupported) {
      return (
        <View className="rounded-2xl border border-line dark:border-line-dark bg-amber-50 dark:bg-amber-400/10 p-4 mb-3 flex-row gap-3">
          <Ionicons name="construct-outline" size={20} color={colors.accentAmber} />
          <View className="flex-1">
            <Text className="text-content dark:text-content-dark text-sm font-bold">
              {t("medications.permission.expoGoTitle")}
            </Text>
            <Text className="text-muted dark:text-muted-dark text-xs mt-1">
              {t("medications.permission.expoGoBody")}
            </Text>
          </View>
        </View>
      );
    }

    if (permissionGranted) return null;

    return (
      <View className="rounded-2xl border border-line dark:border-line-dark bg-card dark:bg-card-dark p-4 mb-3">
        <Text className="text-content dark:text-content-dark text-sm font-bold">
          {t("medications.permission.title")}
        </Text>
        <Text className="text-muted dark:text-muted-dark text-xs mt-1">
          {t("medications.permission.body")}
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-brand-dark dark:bg-brand rounded-full px-4 py-2 mt-3 self-start"
        >
          <Text className="text-white dark:text-[#052E16] text-xs font-semibold">
            {t("medications.permission.enable")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <ScreenHeader
        title={t("medications.today.title")}
        subtitle={
          pendingCount === 0 && doses.length > 0
            ? t("medications.today.allDone")
            : `${doses.length - pendingCount}/${doses.length}`
        }
        action={
          <HeaderIconButton
            icon="add"
            onPress={() => router.push("/medication-form")}
            accessibilityLabel={t("medications.today.addMedicine")}
          />
        }
      />

      <View className="flex-row gap-2 px-5 pb-3">
        <TouchableOpacity
          onPress={() => router.push("/medication-history")}
          className="flex-row items-center gap-1.5 rounded-full border border-line dark:border-line-dark px-3 py-1.5"
        >
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text className="text-muted dark:text-muted-dark text-xs font-semibold">
            {t("medications.today.viewHistory")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/medication-refills")}
          className="flex-row items-center gap-1.5 rounded-full border border-line dark:border-line-dark px-3 py-1.5"
        >
          <Ionicons name="cube-outline" size={14} color={colors.muted} />
          <Text className="text-muted dark:text-muted-dark text-xs font-semibold">
            {t("medications.today.viewRefills")}
          </Text>
        </TouchableOpacity>
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}
