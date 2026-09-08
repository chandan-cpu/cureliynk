import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IdentityCard } from "@/components/profile/identity-card";
import { SettingsGroup } from "@/components/profile/settings-group";
import { SettingsRow } from "@/components/profile/settings-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { useCurrentPlace } from "@/hooks/use-current-place";
import { setAppLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { healthRecordSummary } from "@/lib/health-record";
import { LANGUAGE_NAMES, resolveLanguage } from "@/lib/languages";
import { THEME_PREFERENCES, useThemeColors, type ThemePreference } from "@/lib/theme";
import { useThemePreference } from "@/lib/theme-context";

/** Which picker, if any, is currently open. */
type OpenSheet = "none" | "language" | "appearance";

/**
 * Everything the app keeps outside the chat: the health record, past activity,
 * and settings — grouped into three cards over a single scroll.
 */
export function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const colors = useThemeColors();
  const { place } = useCurrentPlace();
  const { preference, setPreference } = useThemePreference();
  const [sheet, setSheet] = useState<OpenSheet>("none");

  const language = resolveLanguage(i18n.language);

  // Rows the design specifies but which have no destination built yet. Saying
  // so beats a chevron that silently does nothing.
  const notImplemented = () =>
    Alert.alert(t("profile.title"), t("dashboard.comingSoon.genericMessage"));

  const handleSignOut = () => {
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
      <View className="flex-row items-center gap-3 px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("chat.back")}
          className="-ml-1.5 h-[30px] w-[30px] items-center justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.muted} />
        </TouchableOpacity>
        <Text className="flex-1 text-[15.5px] font-semibold text-content dark:text-content-dark">
          {t("profile.title")}
        </Text>
        <TouchableOpacity onPress={notImplemented} hitSlop={8} accessibilityRole="button">
          <Text className="text-[12.5px] font-medium text-brand-dark dark:text-brand">
            {t("profile.edit")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-6 pt-1.5"
        showsVerticalScrollIndicator={false}
      >
        {/* The design's meta line is "34 · Male · Blood group B+"; until the
            record carries those, the contact details the account does have go
            in the same dot-separated slot. */}
        <IdentityCard
          name={user?.name ?? ""}
          meta={[user?.email, user?.phone].filter(Boolean).join(" · ")}
        />

        <SettingsGroup title={t("profile.sections.healthRecord")}>
          <SettingsRow
            label={t("profile.rows.conditions")}
            value={String(healthRecordSummary.conditions)}
            onPress={notImplemented}
            divided={false}
          />
          <SettingsRow
            label={t("profile.rows.allergies")}
            value={healthRecordSummary.allergies}
            onPress={notImplemented}
            divided
          />
          <SettingsRow
            label={t("profile.rows.medications")}
            value={String(healthRecordSummary.medications)}
            onPress={notImplemented}
            divided
          />
          <SettingsRow label={t("profile.rows.reports")} onPress={notImplemented} divided />
        </SettingsGroup>

        <SettingsGroup title={t("profile.sections.activity")}>
          <SettingsRow
            label={t("profile.rows.conversations")}
            value={String(healthRecordSummary.conversations)}
            onPress={notImplemented}
            divided={false}
          />
          <SettingsRow
            label={t("profile.rows.savedDoctors")}
            value={String(healthRecordSummary.savedDoctors)}
            onPress={notImplemented}
            divided
          />
          <SettingsRow
            label={t("profile.rows.appointmentReminders")}
            onPress={() => router.push("/medicine-reminder")}
            divided
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.sections.settings")}>
          <SettingsRow
            label={t("profile.rows.language")}
            value={LANGUAGE_NAMES[language]}
            onPress={() => setSheet("language")}
            divided={false}
          />
          <SettingsRow
            label={t("profile.rows.location")}
            // Reuses the dashboard's reverse-geocode rather than a stored city,
            // so this row always agrees with what Nearby Care is searching.
            value={place.status === "ready" ? place.label : t("profile.locationUnknown")}
            onPress={notImplemented}
            divided
          />
          <SettingsRow
            label={t("profile.rows.emergencyContacts")}
            value={String(healthRecordSummary.emergencyContacts)}
            onPress={notImplemented}
            divided
          />
          <SettingsRow label={t("profile.rows.notifications")} onPress={notImplemented} divided />
          <SettingsRow
            label={t("profile.appearance.title")}
            value={t(`profile.appearance.${preference}.title`)}
            onPress={() => setSheet("appearance")}
            divided
          />
          <SettingsRow label={t("profile.rows.privacy")} onPress={notImplemented} divided />
          <SettingsRow label={t("profile.rows.help")} onPress={notImplemented} divided />
        </SettingsGroup>

        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.7}
          accessibilityRole="button"
          className="h-[46px] items-center justify-center rounded-[23px] border border-line dark:border-line-dark"
        >
          <Text className="text-sm font-medium text-muted dark:text-muted-dark">
            {t("profile.signOut")}
          </Text>
        </TouchableOpacity>

        <Text className="pb-3.5 text-center text-[11px] text-muted dark:text-muted-dark opacity-80">
          {t("profile.version", { version: Constants.expoConfig?.version ?? "1.0.0" })}
        </Text>
      </ScrollView>

      <OptionSheet
        visible={sheet === "language"}
        title={t("profile.rows.language")}
        options={SUPPORTED_LANGUAGES.map((id) => ({ id, label: LANGUAGE_NAMES[id] }))}
        selectedId={language}
        onSelect={async (id) => {
          setSheet("none");
          await setAppLanguage(id as SupportedLanguage);
        }}
        onClose={() => setSheet("none")}
      />

      <OptionSheet
        visible={sheet === "appearance"}
        title={t("profile.appearance.title")}
        options={THEME_PREFERENCES.map((id) => ({
          id,
          label: t(`profile.appearance.${id}.title`),
          description: t(`profile.appearance.${id}.subtitle`),
        }))}
        selectedId={preference}
        onSelect={async (id) => {
          setSheet("none");
          await setPreference(id as ThemePreference);
        }}
        onClose={() => setSheet("none")}
      />
    </SafeAreaView>
  );
}
