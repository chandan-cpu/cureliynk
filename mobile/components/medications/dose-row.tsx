import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { formatDoseTime } from "@/lib/dose-schedule";
import type { DoseStatus } from "@/lib/medications";
import { useThemeColors } from "@/lib/theme";
import type { TodayDose } from "@/hooks/use-medications";

type DoseRowProps = {
  dose: TodayDose;
  onMarkTaken: () => void;
  onSnooze: () => void;
};

type StatusStyle = {
  icon: ComponentProps<typeof Ionicons>["name"];
  /** Key into the theme's resolved colors. */
  tint: "accentGreen" | "accentAmber" | "danger" | "icon";
  showActions: boolean;
};

/** Per-status chrome: the pill colour, its glyph, and whether actions show. */
function statusStyle(status: DoseStatus, isOverdue: boolean): StatusStyle {
  if (status === "taken") {
    return { icon: "checkmark-circle", tint: "accentGreen", showActions: false };
  }
  if (status === "missed") {
    return { icon: "close-circle", tint: "danger", showActions: false };
  }
  if (status === "snoozed") {
    return { icon: "time", tint: "accentAmber", showActions: true };
  }
  return {
    icon: isOverdue ? "alert-circle" : "ellipse-outline",
    tint: isOverdue ? "accentAmber" : "icon",
    showActions: true,
  };
}

export function DoseRow({ dose, onMarkTaken, onSnooze }: DoseRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const { icon, tint, showActions } = statusStyle(dose.status, dose.isOverdue);

  const statusLabel = dose.isOverdue && dose.status === "pending"
    ? t("medications.today.overdue")
    : t(`medications.today.${dose.status}`);

  return (
    <View className="rounded-2xl bg-card dark:bg-card-dark border border-line dark:border-line-dark p-4 mb-3">
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full items-center justify-center bg-brand/10">
          <Ionicons name={icon} size={22} color={colors[tint]} />
        </View>

        <View className="flex-1">
          <Text
            className="text-content dark:text-content-dark text-sm font-bold"
            numberOfLines={1}
          >
            {/* A drug name is never translated. */}
            {dose.medication?.name ?? "—"}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-xs mt-0.5">
            {formatDoseTime(dose.scheduledAt)}
            {dose.medication?.dosage ? ` · ${dose.medication.dosage}` : ""}
          </Text>
        </View>

        <Text className="text-xs font-semibold" style={{ color: colors[tint] }}>
          {statusLabel}
        </Text>
      </View>

      {showActions ? (
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={onMarkTaken}
            accessibilityRole="button"
            className="flex-1 bg-brand-dark dark:bg-brand rounded-full py-2.5 items-center"
          >
            <Text className="text-white dark:text-[#052E16] text-xs font-semibold">
              {t("medications.today.markTaken")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSnooze}
            accessibilityRole="button"
            className="flex-1 rounded-full py-2.5 items-center border border-line dark:border-line-dark"
          >
            <Text className="text-content dark:text-content-dark text-xs font-semibold">
              {t("medications.today.snooze")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
